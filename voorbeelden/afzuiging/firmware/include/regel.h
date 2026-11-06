// Het regelhart van de module: alle beslissingen over de ventilator, de meting, het ijken en de storingen, zonder
// hardware (geen Arduino-functies). main.cpp geeft de tijd, de opdrachten, de metingen en het toerental door en zet
// de PWM die stap() teruggeeft. Zo is alles op de pc te testen (test/test_regel, pio test -e native).
//
// Beleid:
//  - na het aanzetten (ook na een stroomonderbreking) staat de ventilator UIT tot de knop iets vraagt;
//  - UIT en annuleren hebben voorrang: een UIT-opdracht breekt een ijking meteen af (de PWM is in dezelfde stap 0);
//  - een meting is alleen geldig als ze jonger is dan MEET_VERS_MS; anders zijn dp en vol onbekend (NAN), nooit oud;
//  - na SENSOR_FOUTEN mislukte metingen op rij geldt de drukmeter als weg (main.cpp start hem opnieuw);
//  - ijken alleen met verse, plausibele metingen binnen het bereik en met toerental op elk punt; anders blijft de
//    vorige geldige ijking bewaard en meldt ijkFout waarom;
//  - de filterbewaking werkt alleen op standen waar het dubbele van de schone waarde nog binnen het meetbereik valt;
//  - stilstand van de ventilator wordt op elke toegestane stand (vanaf 20 %) bewaakt;
//  - gewone standen 20 tot 80 %; 100 % alleen als boost (warmte in de voedingsbox, zie docs/Berekeningen.md);
//  - zachte start: de PWM stijgt hooguit 50 % per seconde (aanloopstroom binnen de trage zekering); omlaag en UIT
//    gaan meteen;
//  - boost duurt 120 s en vervalt in de module zelf, ook zonder knop;
//  - verbindingsverlies: de module draait verder op de laatste gewone stand (geen boost).
#pragma once
#include <math.h>
#include <stdint.h>
#include <string.h>

#include "protocol.h"

namespace afzuiging {

struct Instellingen {
  int minPct = 20, dagMaxPct = 80, maxPct = 100; // gewone standen tot dagMaxPct, boost op maxPct
  int oploopPctPerS = 50;
  uint32_t boostMs = 120000;
  uint32_t meetVersMs = 1000;    // een meting is 1 s geldig (de module meet 4 keer per seconde)
  int sensorFouten = 4;          // 4 mislukte metingen op rij (1 s) = drukmeter weg
  float bereikPa = 500;          // SDP810-500Pa
  float geldigPa = 450;          // daarboven wordt een meting niet meer vertrouwd (marge op het bereik)
  float minPa = 0.5f;            // minder bij het ijken = slang los of verkeerd om
  int ijkPunten = 5;             // 20, 40, 60, 80, 100 %
  uint32_t ijkStapMs = 8000;     // per punt: 6 s stabiliseren, 2 s meten
  uint32_t ijkStabielMs = 6000;
  int ijkMinMetingen = 4;        // van de 8 mogelijke in 2 s
  float volFactor = 2.0f;        // het dubbele van schoon = filter vervangen
  float storingFactor = 0.25f;   // minder dan een kwart van schoon = geen luchtstroom
  uint32_t stabielMs = 6000;     // na een standwijziging eerst stabiliseren
  uint16_t minToeren = 300;      // lager terwijl hij hoort te draaien = de ventilator draait niet
  uint32_t stilNaMs = 5000;
};

class Regelaar {
 public:
  explicit Regelaar(const Instellingen &i = Instellingen()) : I(i) {
    for (int k = 0; k < 5; k++) schoon[k] = 0;
  }

  // ---- ingangen ----

  /** een geldige opdracht van de gekoppelde knop */
  void opdracht(const Opdracht &o, uint32_t nu) {
    const bool zelfdeSessie = heeftOpdracht && o.sessie == sessie;
    heeftOpdracht = true;
    if (!o.aan) {
      // UIT heeft voorrang: boost weg, een lopende ijking meteen af
      aan = false;
      boostTot = 0;
      if (ijkStap) ijkAfbreken(IJK_AFGEBROKEN);
    } else {
      aan = true;
      const int nieuw = beperk((int)o.pct, I.minPct, I.dagMaxPct);
      if (nieuw != pct) boostTot = 0; // een andere stand kiezen beëindigt de boost
      pct = nieuw;
      if (zelfdeSessie && o.boost != boostTeller) boostTot = nu + I.boostMs;
      if (zelfdeSessie && o.ijk != ijkTeller) startIjken(nu);
    }
    sessie = o.sessie;
    boostTeller = o.boost;
    ijkTeller = o.ijk;
  }

  /** een meting van de drukmeter (ok = antwoord met juiste CRC) */
  void meting(bool ok, float pa, uint32_t nu) {
    if (!ok || !isfinite(pa) || fabsf(pa) > I.bereikPa * 1.05f) {
      if (++fouten >= I.sensorFouten) meter = false;
      return;
    }
    fouten = 0;
    meter = true;
    if (fabsf(pa) > I.geldigPa) { buitenBereik = true; laatsteMeting = 0; dp = NAN; return; } // niet vertrouwen
    buitenBereik = false;
    dp = (laatsteMeting && nu - laatsteMeting <= I.meetVersMs && isfinite(dp)) ? dp + 0.15f * (pa - dp) : pa;
    laatsteMeting = nu ? nu : 1;
    if (ijkStap && nu - ijkStart > I.ijkStabielMs) { ijkSom += pa; ijkN++; }
  }

  /** de drukmeter is opnieuw gestart (main.cpp): weer proberen */
  void meterHersteld() { fouten = 0; meter = true; }

  void tacho(uint16_t rpm) { toeren = rpm; }

  // ---- de regeling: één stap, geeft de PWM-stand (0..100 %) ----

  int stap(uint32_t nu) {
    if (boostTot && (int32_t)(nu - boostTot) >= 0) boostTot = 0;
    int doel;
    if (ijkStap) {
      doel = ijkVerder(nu);
    } else {
      doel = aan ? (boostTot ? I.maxPct : pct) : 0;
    }
    if (doel != vorigDoel) { snelheidSinds = nu; vorigDoel = doel; }
    const bool vers = meetVers(nu);
    if (!ijkStap && doel > 0 && vers && geijkt && nu - snelheidSinds > I.stabielMs) {
      const float ref = schoonBij(doel);
      vol = (ref * I.volFactor <= I.geldigPa) ? beperkf((dp / ref - 1.0f) / (I.volFactor - 1.0f), 0.0f, 1.2f) : NAN;
      geenLucht = dp < ref * I.storingFactor;
    } else if (!vers || doel == 0 || !geijkt) {
      vol = NAN;
      geenLucht = false;
    }
    stil = doel > 0 && nu - snelheidSinds > I.stilNaMs && toeren < I.minToeren;
    storing = doel == 0 ? STORING_GEEN : stil ? STORING_STIL : geenLucht ? STORING_GEEN_LUCHT : STORING_GEEN;
    // zachte start: omhoog hooguit oploopPctPerS, omlaag meteen
    const uint32_t dt = vorigeStap ? nu - vorigeStap : 0;
    vorigeStap = nu ? nu : 1;
    const int max = gegeven + (int)((dt * (uint32_t)I.oploopPctPerS + 999) / 1000);
    gegeven = doel > gegeven && I.oploopPctPerS > 0 ? (doel < max ? doel : max) : doel;
    return gegeven;
  }

  void vulStatus(Status &s, uint32_t nu) const {
    s.aan = gegeven > 0;
    s.pct = (uint8_t)gegeven;
    s.boostRest = boostTot ? (uint8_t)((boostTot - nu + 999) / 1000) : 0;
    s.meter = meter;
    s.meetVers = meetVers(nu);
    s.geijkt = geijkt;
    s.storing = storing;
    s.ijken = (uint8_t)ijkStap;
    s.ijkVoortgang = ijkStap ? (uint8_t)minu(100, ((ijkStap - 1) * I.ijkStapMs + (nu - ijkStart)) * 100 / (I.ijkPunten * I.ijkStapMs)) : 0;
    s.ijkFout = ijkFout;
    s.toeren = toeren;
    s.dp = s.meetVers ? dp : NAN;
    s.vol = s.meetVers ? vol : NAN;
  }

  bool meetVers(uint32_t nu) const { return meter && laatsteMeting && nu - laatsteMeting <= I.meetVersMs && isfinite(dp); }

  // ---- ijking: bewaren en laden (main.cpp schrijft naar het NVS als nieuweIjking waar is) ----
  void laadIjking(const float *w, int n) {
    if (n != I.ijkPunten) return;
    for (int k = 0; k < n; k++) if (!(w[k] >= I.minPa && w[k] <= I.geldigPa)) return; // ongeldige opslag: niet laden
    for (int k = 0; k < n; k++) schoon[k] = w[k];
    geijkt = true;
  }
  const float *ijking() const { return schoon; }
  bool nieuweIjking = false; // gezet na een geslaagde ijking; main.cpp bewaart en zet terug op false

  // toestand (voor tests en het logboek)
  bool aan = false;
  int pct = 50;
  uint32_t boostTot = 0;
  bool meter = false, buitenBereik = false, geijkt = false;
  float dp = NAN, vol = NAN;
  uint16_t toeren = 0;
  uint8_t storing = STORING_GEEN, ijkFout = IJK_OK;
  int ijkStap = 0, gegeven = 0;

 private:
  static int beperk(int v, int a, int b) { return v < a ? a : v > b ? b : v; }
  static float beperkf(float v, float a, float b) { return v < a ? a : v > b ? b : v; }
  static uint32_t minu(uint32_t a, uint32_t b) { return a < b ? a : b; }

  float schoonBij(int p) const {
    const float f = beperkf((p - 20) / 20.0f, 0.0f, (float)(I.ijkPunten - 1));
    const int i = (int)f < I.ijkPunten - 2 ? (int)f : I.ijkPunten - 2;
    return schoon[i] + (schoon[i + 1] - schoon[i]) * (f - i);
  }

  void startIjken(uint32_t nu) {
    if (!meetVers(nu)) { ijkFout = IJK_GEEN_METING; return; }
    ijkStap = 1;
    ijkStart = nu;
    ijkSom = 0;
    ijkN = 0;
    ijkFout = IJK_OK;
  }

  void ijkAfbreken(uint8_t fout) {
    ijkStap = 0;
    ijkFout = fout;
    vorigDoel = -1; // na het ijken eerst opnieuw stabiliseren
  }

  /** één stap van het ijken; geeft de stand van dit punt */
  int ijkVerder(uint32_t nu) {
    const int p = 20 + 20 * (ijkStap - 1);
    if (nu - ijkStart < I.ijkStapMs) return p;
    // dit punt is klaar: genoeg verse, plausibele metingen en toeren?
    if (ijkN < I.ijkMinMetingen) { ijkAfbreken(IJK_GEEN_METING); return aan ? pct : 0; }
    const float gem = ijkSom / ijkN;
    if (gem < I.minPa) { ijkAfbreken(IJK_ONPLAUSIBEL); return aan ? pct : 0; }
    if (gem > I.geldigPa) { ijkAfbreken(IJK_BUITEN_BEREIK); return aan ? pct : 0; }
    if (toeren < I.minToeren) { ijkAfbreken(IJK_GEEN_TOEREN); return aan ? pct : 0; }
    if (ijkStap > 1 && gem < punten[ijkStap - 2] * 0.9f) { ijkAfbreken(IJK_ONPLAUSIBEL); return aan ? pct : 0; } // moet stijgen
    punten[ijkStap - 1] = gem;
    ijkSom = 0;
    ijkN = 0;
    ijkStart = nu;
    if (++ijkStap <= I.ijkPunten) return 20 + 20 * (ijkStap - 1);
    // geslaagd: stijgend maken en bewaren
    for (int k = 0; k < I.ijkPunten; k++) schoon[k] = k && punten[k] < schoon[k - 1] ? schoon[k - 1] : punten[k];
    geijkt = true;
    nieuweIjking = true;
    ijkStap = 0;
    ijkFout = IJK_OK;
    vorigDoel = -1;
    return aan ? (boostTot ? I.maxPct : pct) : 0;
  }

  Instellingen I;
  bool heeftOpdracht = false;
  uint16_t sessie = 0;
  uint8_t boostTeller = 0, ijkTeller = 0;
  uint32_t laatsteMeting = 0;
  int fouten = 0;
  float schoon[5];
  float punten[5] = {0, 0, 0, 0, 0};
  uint32_t ijkStart = 0;
  float ijkSom = 0;
  int ijkN = 0;
  uint32_t snelheidSinds = 0, vorigeStap = 0;
  int vorigDoel = -1;
  bool geenLucht = false, stil = false;
};

/** koppeling: de module aanvaardt alleen de knop die zich in het koppelvenster aanmeldde */
class Koppeling {
 public:
  static constexpr uint32_t VENSTER_MS = 60000;
  bool gekoppeld = false;
  uint8_t mac[6] = {0};
  uint8_t sleutel[16] = {0};

  void laad(const uint8_t *m, const uint8_t *k) { memcpy(mac, m, 6); memcpy(sleutel, k, 16); gekoppeld = true; }

  /** een KOPPEL-vraag: alleen in de eerste 60 s na het aanzetten; geeft true als de knop nu gekoppeld is */
  bool vraag(const uint8_t *afzender, const Koppel &k, uint32_t nuSindsStart) {
    if (nuSindsStart > VENSTER_MS) return false;
    memcpy(mac, afzender, 6);
    memcpy(sleutel, k.sleutel, 16);
    gekoppeld = true;
    volgnr = 0;
    sessie = 0;
    heeftSessie = false;
    return true;
  }

  /** een opdracht aanvaarden? alleen van de gekoppelde knop en met een stijgend volgnummer binnen een sessie */
  bool aanvaard(const uint8_t *afzender, const Opdracht &o) {
    if (!gekoppeld || memcmp(afzender, mac, 6) != 0) return false;
    if (o.magie != MAGIE || o.versie != VERSIE || o.soort != SOORT_OPDRACHT) return false;
    if (heeftSessie && o.sessie == sessie && o.volgnr <= volgnr) return false; // herhaald of oud bericht
    heeftSessie = true;
    sessie = o.sessie;
    volgnr = o.volgnr;
    return true;
  }

 private:
  uint32_t volgnr = 0;
  uint16_t sessie = 0;
  bool heeftSessie = false;
};

} // namespace afzuiging
