// Het regelhart van de module: alle beslissingen over de ventilator, de meting, het ijken en de storingen, zonder
// hardware (geen Arduino-functies). main.cpp geeft de tijd, de opdrachten, de metingen en het toerental door en zet
// de PWM die stap() teruggeeft. Zo is alles op de pc te testen (test/test_regel, pio test -e native).
//
// Beleid (versie 7.1, eindverslag v4):
//  - een STAND is een percentage van het gemeten maximale toerental (niet van de PWM): na een ijking kent de module
//    bij elke PWM-stap het toerental en regelt ze het toerental bij (voorwaarts uit de ijktabel plus een trage
//    bijregeling op de tacho). Zo zijn stand, debiet, geluid en warmte in docs/Berekeningen.md dezelfde grootheid.
//    Zonder ijking is de stand de PWM (en meldt de bewaking "niet geijkt");
//  - na elke start van de module (ook na een stroomonderbreking) staat de ventilator UIT tot een NIEUWE handeling op de
//    knop: de module kiest bij elke start een willekeurig startId en neemt AAN alleen aan met dat startId (een oude of
//    herhaalde AAN-opdracht doet niets; UIT geldt altijd);
//  - UIT en annuleren hebben voorrang: een UIT-opdracht breekt een ijking meteen af (de PWM is in dezelfde stap 0);
//  - zachte start: de PWM stijgt hooguit oploopPctPerS per seconde, op de verstreken tijd (niet per regelstap);
//    omlaag en UIT gaan meteen;
//  - gewone standen 20 tot 80 %; 100 % alleen als boost. Boost komt uit een tegoed van hoogstens 120 s dat tijdens een
//    boost opgaat en daarna aan 1/4 van de tijd terugkomt (120 s boost = 480 s afkoelen). Na elke start is het tegoed 0
//    (de eerste boost kan na 40 s): zo blijft het hoogstens 1/5 van de tijd op 100 %, ook over een herstart heen en ook
//    als de knop telkens opnieuw boost vraagt (de warmte in de box is daarop gerekend);
//  - een meting is alleen geldig als ze jonger is dan meetVersMs; anders zijn dp en vol onbekend (NAN), nooit oud;
//  - na sensorFouten mislukte metingen op rij geldt de drukmeter als weg (main.cpp start hem opnieuw);
//  - ijken is een onderhoudsstap: de knop vraagt het pas na een bevestiging ("Nieuw filter geplaatst?"). Alleen met
//    verse, plausibele metingen binnen het bereik en met toerental op elk punt; druk en toerental moeten met de PWM
//    stijgen. De eerste geldige ijking ooit wordt ook bewaard (eersteSchoon); een latere ijking die op een punt meer
//    dan 15 % HOGER ligt, wordt geweigerd (IJK_TE_HOOG): een vuil filter wordt zo nooit de schone referentie. Bij elke
//    weigering blijft de vorige geldige ijking bewaard en meldt ijkFout waarom. eersteSchoon wissen kan alleen met de
//    bewuste herkoppelhandeling (de schakelaar van de box 3 keer kort aan en uit): main.cpp wist hem dan uit het NVS en
//    de volgende geldige ijking zet hem opnieuw (nodig na een andere ventilator of drukmeter);
//  - een bewaarde ijking wordt bij het laden volledig nagekeken (eindig, druk in [minPa, geldigPa] en stijgend,
//    toerental in [minToeren, maxToeren] en strikt stijgend); anders blijft wat er was;
//  - "filter vervangen" komt per stand bij vervangFactor (uit het luchtmodel): vóór het debiet onder het minimum voor de
//    vangst zakt (onzekerheidsband: ventilatorcurve +-20 Pa, toerental tot 3 % te laag, 10 % marge op de reserve).
//    80 % is de laagste beschermende stand en de dagstand: lagere standen (onder beschermVanaf) halen dat minimum niet
//    zeker: bewaking "lage stand". De balk op de knop is de verbruikte drukreserve (van schoon tot de vervanggrens),
//    geen maat voor de belading;
//  - zonder filter of met een grote omloop is de druk 0,27 tot 0,54 x schoon (luchtmodel): onder lekFactor (0,70 x
//    schoon) meldt de bewaking "filter ontbreekt of sluit niet af" (alleen op beschermende standen, waar het model
//    geldt); onder storingFactor (0,25 x) is het een storing "geen luchtstroom";
//  - toerentalvolging (geijkt, na het stabiliseren): ligt het toerental langer dan volgFoutMs (10 s) meer dan volgMarge
//    (3 %, de grens van het luchtmodel) naast het doel, of zit de bijregeling op regelMax terwijl het toerental meer dan
//    3 % te laag is, dan is het een storing "toerental" en zegt de druk niets over het filter. Ze verdwijnt vanzelf als
//    het toerental even lang weer klopt. De bijregeling begint pas na het stabiliseren (geen opwinden tijdens de
//    oploop van de ventilator, dus geen doorschieten en geen vals alarm na de zachte start);
//  - stilstand van de ventilator (toerental onder minToeren) wordt op elke stand bewaakt;
//  - verbindingsverlies: de module draait verder op de laatste gewone stand (geen boost);
//  - voeding van de ventilator: een hoge-zijde-schakelaar -Q2 (IRF4905) in de 24 V, aangestuurd door -Q3 (BC547) vanaf
//    GPIO7 (hoog = 24 V aan). Een weerstand trekt de basis van -Q3 laag: bij reset, flashen of zonder 5 V/3,3 V is de
//    ventilator spanningsloos (veilige toestand = stil). main.cpp zet GPIO7 als eerste laag en daarna elke regelstap op
//    voedingAan(PWM): aan zodra stap() meer dan 0 geeft, uit zodra de PWM 0 is (UIT).
//
// Bewakingscontract: één toestand per regelstap, in deze volgorde (de eerste die past). vol is alleen bij BEW_OK een
// getal, anders NAN. De storing staat los daarvan (kolom 3); de knop toont eerst de storing, dan de bewaking.
//   wanneer                                        bewaking           storing             de knop toont
//   ventilator stil (stand 0)                      BEW_UIT            -                   "UIT" (na een herstart van
//                                                                                          de box: "afzuiging herstart")
//   aan het ijken                                  BEW_IJKEN          -                   "IJKEN"
//   geen geldige ijking                            BEW_NIET_GEIJKT    -                   "nieuw filter?"
//   meting boven geldigPa (450 Pa)                 BEW_BUITEN_BEREIK  -                   "druk buiten meetbereik"
//   geen verse meting                              BEW_GEEN_METING    -                   "meting niet actueel"
//   < 6 s na een standwissel                       BEW_STABILISEREN   -                   "even meten..."
//   toerental > 3 % naast het doel, > 10 s         BEW_TOEREN         STORING_TOEREN      rood "toerental wijkt af"
//   stand < 80 %                                   BEW_LAGE_STAND     (geen lucht)        "lage stand"
//   dp < 0,25 x schoon                             BEW_FILTER_LEK     STORING_GEEN_LUCHT  rood "geen luchtstroom"
//   dp < 0,70 x schoon                             BEW_FILTER_LEK     -                   oranje "filter ontbreekt"
//   vervanggrens boven het meetbereik              BEW_BUITEN_BEREIK  -                   "druk buiten meetbereik"
//   anders                                         BEW_OK             -                   Pa, tpm en balk; vol >= 1:
//                                                                                          oranje "filter vervangen"
//   op elke stand: toerental < 300 na 5 s          (zoals hierboven)  STORING_STIL        rood "ventilator draait niet"
#pragma once
#include <math.h>
#include <stdint.h>
#include <string.h>

#include "protocol.h"

namespace afzuiging {

struct Instellingen {
  int minPct = 20, dagMaxPct = 80, maxPct = 100; // gewone standen tot dagMaxPct, boost op maxPct
  float oploopPctPerS = 50;
  uint32_t boostMs = 120000;     // het grootste boosttegoed (na een start 0)
  uint32_t boostHerstel = 4;     // 1 s boost kost 4 s afkoelen
  uint32_t boostMinMs = 10000;   // minder tegoed: geen nieuwe boost
  uint32_t meetVersMs = 1000;    // een meting is 1 s geldig (de module meet 4 keer per seconde)
  int sensorFouten = 4;          // 4 mislukte metingen op rij (1 s) = drukmeter weg
  float bereikPa = 500;          // SDP810-500Pa
  float geldigPa = 450;          // daarboven wordt een meting niet meer vertrouwd (marge op het bereik)
  float minPa = 0.5f;            // minder bij het ijken = slang los of verkeerd om
  int ijkPunten = 5;             // PWM 20, 40, 60, 80, 100 %
  uint32_t ijkStapMs = 8000;     // per punt: 6 s stabiliseren, 2 s meten
  uint32_t ijkStabielMs = 6000;
  int ijkMinMetingen = 4;        // van de 8 mogelijke in 2 s
  float ijkMaxStijging = 1.15f;  // een nieuwe ijking mag op geen punt meer dan 15 % boven de eerste ijking liggen
  // melding "filter vervangen" bij dit veelvoud van de schone druk, lineair tussen deze standen (% toerental)
  // (docs/Berekeningen.md, hoofdstuk 3b: het ongunstigste van zes scenario's, met 10 % marge; het rekenblad controleert
  // deze waarden)
  int vervangStand[3] = {80, 90, 100};
  float vervangFactor[3] = {1.15f, 1.32f, 1.44f};
  int beschermVanaf = 80;        // 80 % is de laagste beschermende stand en de dagstand; lager haalt het minimum niet zeker
  float storingFactor = 0.25f;   // minder dan een kwart van schoon = geen luchtstroom
  float lekFactor = 0.70f;       // minder dan 0,70 x schoon = filter ontbreekt of lucht loopt om (model: 0,27 tot 0,54)
  uint32_t stabielMs = 6000;     // na een standwijziging eerst stabiliseren
  uint16_t minToeren = 300;      // lager terwijl hij hoort te draaien = de ventilator draait niet
  uint16_t maxToeren = 20000;    // hoger in een bewaarde ijking = onzin
  uint32_t stilNaMs = 5000;
  float regelKi = 0.004f;        // bijregeling: % PWM per (omw/min x s)
  float regelMax = 15;           // hoogstens zoveel % PWM bijregelen boven of onder de ijktabel
  // toerentalvolging: het luchtmodel rekent binnen BEW_OK met hoogstens 3 % te laag toerental
  float volgMarge = 0.03f;       // toerental meer dan 3 % naast het doel ...
  uint32_t volgFoutMs = 10000;   // ... langer dan 10 s na het stabiliseren = storing toerental (even lang goed = weg)
  float volgVerzadigd = 0.03f;   // bijregeling op regelMax en meer dan 3 % te laag = ook storing toerental
};

class Regelaar {
 public:
  explicit Regelaar(const Instellingen &i = Instellingen()) : I(i) {
    for (int k = 0; k < 5; k++) { schoon[k] = 0; tpm[k] = 0; eersteSchoon[k] = 0; }
    boostTegoed = 0; // na elke start leeg: het gemiddelde blijft ook over een herstart heen hoogstens 1/5
  }

  /** het startnummer van deze start (main.cpp: willekeurig, nooit 0); AAN geldt alleen met dit nummer */
  uint32_t startId = 1;

  // ---- ingangen ----

  /** een geldige opdracht van de gekoppelde knop */
  void opdracht(const Opdracht &o, uint32_t nu) {
    const bool zelfdeSessie = heeftOpdracht && o.sessie == sessie;
    heeftOpdracht = true;
    aanGeweigerd = false;
    if (!o.aan) {
      // UIT heeft voorrang: boost weg, een lopende ijking meteen af (UIT geldt ook met een oud startId)
      aan = false;
      boostTot = 0;
      if (ijkStap) ijkAfbreken(IJK_AFGEBROKEN);
    } else if (startId == 0 || o.startId != startId) {
      // AAN van vóór deze start (of zonder startId): niets doen, alleen de tellers volgen hieronder
      aanGeweigerd = true;
    } else {
      aan = true;
      const int nieuw = beperk((int)o.pct, I.minPct, I.dagMaxPct);
      if (nieuw != pct) boostTot = 0; // een andere stand kiezen beëindigt de boost
      pct = nieuw;
      if (zelfdeSessie && o.boost != boostTeller) startBoost(nu);
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
    if (ijkStap && nu - ijkStart > I.ijkStabielMs) { ijkSom += pa; ijkN++; ijkTpmSom += toeren; }
  }

  /** de drukmeter is opnieuw gestart (main.cpp): weer proberen */
  void meterHersteld() { fouten = 0; meter = true; }

  /** een nieuw toerental uit de tacho (main.cpp: elke seconde) */
  void tacho(uint16_t rpm, uint32_t nu) {
    toeren = rpm;
    tachoDt = vorigeTacho ? nu - vorigeTacho : 0;
    vorigeTacho = nu ? nu : 1;
    tachoNieuw = true;
  }

  // ---- de regeling: één stap, geeft de PWM-stand (0..100 %) ----

  int stap(uint32_t nu) {
    const uint32_t dt = vorigeStap ? nu - vorigeStap : 0;
    vorigeStap = nu ? nu : 1;
    // boosttegoed: op tijdens een boost, terug (1/boostHerstel) daarna
    if (boostTot) {
      boostTegoed = dt >= boostTegoed ? 0 : boostTegoed - dt;
      if ((int32_t)(nu - boostTot) >= 0 || boostTegoed == 0) boostTot = 0;
    } else {
      herstelRest += dt;
      boostTegoed += herstelRest / I.boostHerstel;
      herstelRest %= I.boostHerstel;
      if (boostTegoed > I.boostMs) boostTegoed = I.boostMs;
    }
    int doelPwm;
    if (ijkStap) {
      doelPwm = ijkVerder(nu);
      stand = ijkStap ? doelPwm : (aan ? pct : 0);
    } else {
      stand = aan ? (boostTot ? I.maxPct : pct) : 0;
      doelPwm = stand ? pwmVoor(stand, nu) : 0;
    }
    if (stand != vorigeStand) { snelheidSinds = nu; vorigeStand = stand; bijregeling = 0; toerenFout = false; volgSinds = 0; }
    volg(nu);
    // bewaking (zie de tabel bovenaan)
    const bool vers = meetVers(nu);
    vol = NAN;
    geenLucht = false;
    if (stand == 0) bewaking = BEW_UIT;
    else if (ijkStap) bewaking = BEW_IJKEN;
    else if (!geijkt) bewaking = BEW_NIET_GEIJKT;
    else if (buitenBereik) bewaking = BEW_BUITEN_BEREIK;
    else if (!vers) bewaking = BEW_GEEN_METING;
    else if (nu - snelheidSinds <= I.stabielMs) bewaking = BEW_STABILISEREN; // geen oude melding na een standwissel
    else if (toerenFout) bewaking = BEW_TOEREN; // de druk zegt niets over het filter als het toerental niet klopt
    else {
      const float ref = schoonBij(stand), f = factorBij(stand);
      geenLucht = dp < ref * I.storingFactor;
      if (stand < I.beschermVanaf || f <= 1.0f) bewaking = BEW_LAGE_STAND;
      else if (dp < ref * I.lekFactor) bewaking = BEW_FILTER_LEK;    // filter ontbreekt of sluit niet af
      else if (ref * f > I.geldigPa) bewaking = BEW_BUITEN_BEREIK; // de grens valt boven het meetbereik
      else {
        bewaking = BEW_OK;
        vol = beperkf((dp / ref - 1.0f) / (f - 1.0f), 0.0f, 1.2f);
      }
    }
    stil = stand > 0 && nu - snelheidSinds > I.stilNaMs && toeren < I.minToeren;
    storing = stand == 0 ? STORING_GEEN : stil ? STORING_STIL : toerenFout ? STORING_TOEREN : geenLucht ? STORING_GEEN_LUCHT : STORING_GEEN;
    // zachte start op de verstreken tijd; omlaag en UIT meteen
    if (doelPwm <= uitF) uitF = (float)doelPwm;
    else uitF = fminf((float)doelPwm, uitF + I.oploopPctPerS * dt / 1000.0f);
    gegeven = (int)uitF;
    return gegeven;
  }

  void vulStatus(Status &s, uint32_t nu) const {
    s.aan = gegeven > 0;
    s.pct = (uint8_t)stand;
    s.gewoon = aan ? (uint8_t)pct : 0;
    s.pwm = (uint8_t)gegeven;
    s.boostRest = boostTot ? (uint8_t)((boostTot - nu + 999) / 1000) : 0;
    s.boostTegoed = (uint8_t)(boostTegoed * 100 / I.boostMs);
    s.meter = meter;
    s.meetVers = meetVers(nu);
    s.geijkt = geijkt;
    s.storing = storing;
    s.bewaking = bewaking;
    s.ijken = (uint8_t)ijkStap;
    s.ijkVoortgang = ijkStap ? (uint8_t)minu(100, ((ijkStap - 1) * I.ijkStapMs + (nu - ijkStart)) * 100 / (I.ijkPunten * I.ijkStapMs)) : 0;
    s.ijkFout = ijkFout;
    s.toeren = toeren;
    s.dp = s.meetVers ? dp : NAN;
    s.vol = vol;
    s.startId = startId;
  }

  bool meetVers(uint32_t nu) const { return meter && laatsteMeting && nu - laatsteMeting <= I.meetVersMs && isfinite(dp); }

  // ---- ijking: bewaren en laden (main.cpp schrijft naar het NVS als nieuweIjking of nieuweEerste waar is) ----
  /** w = 5 drukwaarden, t = 5 toerentallen bij PWM 20..100 %. Alles wordt eerst nagekeken; bij een fout blijft de
   *  bestaande set staan en geeft dit false. */
  bool laadIjking(const float *w, const float *t, int n) {
    if (!w || !t || n != I.ijkPunten || !drukGeldig(w)) return false;
    for (int k = 0; k < n; k++) {
      if (!isfinite(t[k]) || t[k] < I.minToeren || t[k] > I.maxToeren) return false;
      if (k && !(t[k] > t[k - 1])) return false; // strikt stijgend
    }
    for (int k = 0; k < n; k++) { schoon[k] = w[k]; tpm[k] = t[k]; }
    geijkt = true;
    return true;
  }
  /** de eerste ijking ooit (de grens voor IJK_TE_HOOG); dezelfde controle als de druk in laadIjking */
  bool laadEerste(const float *w, int n) {
    if (!w || n != I.ijkPunten || !drukGeldig(w)) return false;
    for (int k = 0; k < n; k++) eersteSchoon[k] = w[k];
    heeftEerste = true;
    return true;
  }
  const float *ijking() const { return schoon; }
  const float *ijkToeren() const { return tpm; }
  const float *eersteIjking() const { return eersteSchoon; }
  bool nieuweIjking = false; // gezet na een geslaagde ijking; main.cpp bewaart en zet terug op false
  bool nieuweEerste = false; // gezet als deze ijking de eerste referentie werd; main.cpp bewaart en zet terug

  // toestand (voor tests en het logboek)
  bool aan = false, aanGeweigerd = false;
  int pct = 50, stand = 0;
  uint32_t boostTot = 0, boostTegoed = 0;
  bool boostGeweigerd = false;
  bool meter = false, buitenBereik = false, geijkt = false, heeftEerste = false, toerenFout = false;
  float dp = NAN, vol = NAN;
  uint16_t toeren = 0;
  uint8_t storing = STORING_GEEN, ijkFout = IJK_OK, bewaking = BEW_UIT;
  int ijkStap = 0, gegeven = 0;

 private:
  static int beperk(int v, int a, int b) { return v < a ? a : v > b ? b : v; }
  static float beperkf(float v, float a, float b) { return v < a ? a : v > b ? b : v; }
  static uint32_t minu(uint32_t a, uint32_t b) { return a < b ? a : b; }

  /** 5 drukwaarden: eindig, in [minPa, geldigPa] en stijgend (gelijk mag: de ijking maakt ze zo) */
  bool drukGeldig(const float *w) const {
    for (int k = 0; k < I.ijkPunten; k++) {
      if (!isfinite(w[k]) || w[k] < I.minPa || w[k] > I.geldigPa) return false;
      if (k && w[k] < w[k - 1]) return false;
    }
    return true;
  }

  void startBoost(uint32_t nu) {
    boostGeweigerd = boostTegoed < I.boostMinMs;
    if (!boostGeweigerd) boostTot = nu + boostTegoed;
  }

  /** toerentalvolging: na het stabiliseren, met vertraging volgFoutMs in beide richtingen (aan en weer uit) */
  void volg(uint32_t nu) {
    if (!geijkt || stand == 0 || ijkStap || nu - snelheidSinds <= I.stabielMs || toeren < I.minToeren) {
      volgSinds = 0; // stilstand meldt de stilstandbewaking
      return;
    }
    const float doel = tpm[I.ijkPunten - 1] * stand / 100.0f;
    const bool af = toeren < doel * (1 - I.volgMarge) || toeren > doel * (1 + I.volgMarge) ||
                    (bijregeling >= I.regelMax - 0.01f && toeren < doel * (1 - I.volgVerzadigd));
    if (af == toerenFout) { volgSinds = 0; return; }
    if (!volgSinds) volgSinds = nu ? nu : 1;
    if (nu - volgSinds > I.volgFoutMs) { toerenFout = af; volgSinds = 0; }
  }

  /** stand (% van het maximale toerental) -> PWM: voorwaarts uit de ijktabel, plus de bijregeling op de tacho */
  int pwmVoor(int s, uint32_t nu) {
    if (!geijkt) return s; // zonder ijking: de stand is de PWM
    const float doel = tpm[I.ijkPunten - 1] * s / 100.0f;
    float voor;
    if (doel <= tpm[0]) voor = 20.0f * doel / tpm[0];
    else {
      int i = 0;
      while (i < I.ijkPunten - 2 && doel > tpm[i + 1]) i++;
      voor = 20.0f * (i + 1) + 20.0f * (doel - tpm[i]) / (tpm[i + 1] - tpm[i]);
    }
    // bijregelen alleen met een nieuw toerental, na het stabiliseren (de ventilator is opgelopen: geen opwinden) en als
    // de PWM de voorwaartse waarde al bereikt heeft
    if (tachoNieuw) {
      tachoNieuw = false;
      if (s == vorigeStand && nu - snelheidSinds > I.stabielMs && uitF >= voor + bijregeling - 1.0f && toeren >= I.minToeren && tachoDt > 0)
        bijregeling = beperkf(bijregeling + I.regelKi * (doel - toeren) * tachoDt / 1000.0f, -I.regelMax, I.regelMax);
    }
    return beperk((int)lroundf(voor + bijregeling), 1, 100);
  }

  /** schone druk bij een stand: tussen de ijkpunten op het toerental */
  float schoonBij(int s) const {
    const float doel = tpm[I.ijkPunten - 1] * s / 100.0f;
    if (doel <= tpm[0]) return schoon[0];
    int i = 0;
    while (i < I.ijkPunten - 2 && doel > tpm[i + 1]) i++;
    const float f = beperkf((doel - tpm[i]) / (tpm[i + 1] - tpm[i]), 0.0f, 1.0f);
    return schoon[i] + (schoon[i + 1] - schoon[i]) * f;
  }

  /** vervangfactor bij een stand (lineair tussen de standen van de tabel; eronder 0 = niet beschermend) */
  float factorBij(int s) const {
    if (s < I.vervangStand[0]) return 0;
    for (int i = 0; i < 2; i++)
      if (s <= I.vervangStand[i + 1])
        return I.vervangFactor[i] + (I.vervangFactor[i + 1] - I.vervangFactor[i]) * (s - I.vervangStand[i]) / (float)(I.vervangStand[i + 1] - I.vervangStand[i]);
    return I.vervangFactor[2];
  }

  void startIjken(uint32_t nu) {
    if (!meetVers(nu)) { ijkFout = IJK_GEEN_METING; return; }
    ijkStap = 1;
    ijkStart = nu;
    ijkSom = 0;
    ijkTpmSom = 0;
    ijkN = 0;
    ijkFout = IJK_OK;
  }

  void ijkAfbreken(uint8_t fout) {
    ijkStap = 0;
    ijkFout = fout;
    vorigeStand = -1; // na het ijken eerst opnieuw stabiliseren
  }

  /** één stap van het ijken; geeft de PWM van dit punt */
  int ijkVerder(uint32_t nu) {
    const int p = 20 + 20 * (ijkStap - 1);
    if (nu - ijkStart < I.ijkStapMs) return p;
    // dit punt is klaar: genoeg verse, plausibele metingen en toeren?
    const int terug = aan ? pct : 0;
    if (ijkN < I.ijkMinMetingen) { ijkAfbreken(IJK_GEEN_METING); return terug; }
    const float gem = ijkSom / ijkN, rpm = ijkTpmSom / ijkN;
    if (gem < I.minPa) { ijkAfbreken(IJK_ONPLAUSIBEL); return terug; }
    if (gem > I.geldigPa) { ijkAfbreken(IJK_BUITEN_BEREIK); return terug; }
    if (rpm < I.minToeren) { ijkAfbreken(IJK_GEEN_TOEREN); return terug; }
    if (ijkStap > 1 && gem < punten[ijkStap - 2] * 0.9f) { ijkAfbreken(IJK_ONPLAUSIBEL); return terug; } // moet stijgen
    if (ijkStap > 1 && !(rpm > tpmPunten[ijkStap - 2])) { ijkAfbreken(IJK_GEEN_TOEREN); return terug; } // toeren ook
    punten[ijkStap - 1] = gem;
    tpmPunten[ijkStap - 1] = rpm;
    ijkSom = 0;
    ijkTpmSom = 0;
    ijkN = 0;
    ijkStart = nu;
    if (++ijkStap <= I.ijkPunten) return 20 + 20 * (ijkStap - 1);
    // alle punten gemeten: stijgend maken, met de eerste ijking vergelijken en pas dan bewaren
    float nieuw[5];
    for (int k = 0; k < I.ijkPunten; k++) nieuw[k] = k && punten[k] < nieuw[k - 1] ? nieuw[k - 1] : punten[k];
    if (heeftEerste)
      for (int k = 0; k < I.ijkPunten; k++)
        if (nieuw[k] > eersteSchoon[k] * I.ijkMaxStijging) { ijkAfbreken(IJK_TE_HOOG); return terug; } // geen schoon filter
    for (int k = 0; k < I.ijkPunten; k++) {
      schoon[k] = nieuw[k];
      tpm[k] = tpmPunten[k];
    }
    if (!heeftEerste) {
      for (int k = 0; k < I.ijkPunten; k++) eersteSchoon[k] = nieuw[k];
      heeftEerste = true;
      nieuweEerste = true;
    }
    geijkt = true;
    nieuweIjking = true;
    ijkStap = 0;
    ijkFout = IJK_OK;
    vorigeStand = -1;
    return terug;
  }

  Instellingen I;
  bool heeftOpdracht = false;
  uint16_t sessie = 0;
  uint8_t boostTeller = 0, ijkTeller = 0;
  uint32_t laatsteMeting = 0, herstelRest = 0;
  int fouten = 0;
  float schoon[5], tpm[5], eersteSchoon[5];
  float punten[5] = {0, 0, 0, 0, 0}, tpmPunten[5] = {0, 0, 0, 0, 0};
  uint32_t ijkStart = 0;
  float ijkSom = 0, ijkTpmSom = 0;
  int ijkN = 0;
  uint32_t snelheidSinds = 0, vorigeStap = 0, vorigeTacho = 0, tachoDt = 0, volgSinds = 0;
  int vorigeStand = -1;
  float uitF = 0, bijregeling = 0;
  bool tachoNieuw = false;
  bool geenLucht = false, stil = false;
};

/** koppeling in de module: alleen de knop die zich in een geopend koppelvenster aanmeldde én daarna deze module koos.
 *  Het venster gaat alleen open als de module nog niet gekoppeld is, of na een bewuste handeling (de schakelaar van de
 *  box 3 keer kort aan en uit: main.cpp zet dan herkoppelen). Een KOPPEL-vraag maakt de knop alleen kandidaat; pas een
 *  gerichte KOPPEL_BEVESTIG (zelfde knop, zelfde uitdaging, ons eigen MAC-adres) binnen BEVESTIG_MS maakt de koppeling.
 *  Een tweede verse module die dezelfde broadcast hoorde, krijgt geen bevestiging en vergeet de vraag. */
class Koppeling {
 public:
  static constexpr uint32_t VENSTER_MS = 60000, BEVESTIG_MS = 5000;
  bool gekoppeld = false;
  bool herkoppelen = false; // bewuste handeling gedaan (main.cpp)
  uint8_t eigen[6] = {0};   // het eigen MAC-adres (main.cpp)
  uint8_t mac[6] = {0};
  uint8_t sleutel[16] = {0};

  void laad(const uint8_t *m, const uint8_t *k) { memcpy(mac, m, 6); memcpy(sleutel, k, 16); gekoppeld = true; }

  /** een KOPPEL-vraag: geeft true als de knop nu kandidaat is (antwoord dan KOPPEL_OK met dezelfde uitdaging) */
  bool vraag(const uint8_t *afzender, const Koppel &k, uint32_t nuSindsStart) {
    tik(nuSindsStart);
    if (nuSindsStart > VENSTER_MS) return false;
    if (gekoppeld && !herkoppelen) return false;
    if (k.magie != MAGIE || k.versie != VERSIE || k.soort != SOORT_KOPPEL || k.uitdaging == 0) return false;
    if (wacht && memcmp(afzender, kMac, 6) != 0) return false; // een andere knop is al bezig
    if (!wacht || k.uitdaging != kUitdaging) wachtSinds = nuSindsStart ? nuSindsStart : 1;
    memcpy(kMac, afzender, 6);
    memcpy(kSleutel, k.sleutel, 16);
    kUitdaging = k.uitdaging;
    wacht = true;
    return true;
  }

  /** een KOPPEL_BEVESTIG: true = de knop is nu gekoppeld (main.cpp bewaart hem en voegt hem toe) */
  bool bevestig(const uint8_t *afzender, const Koppel &k, uint32_t nu) {
    tik(nu);
    if (!wacht) return false;
    if (k.magie != MAGIE || k.versie != VERSIE || k.soort != SOORT_KOPPEL_BEVESTIG) return false;
    if (memcmp(afzender, kMac, 6) != 0 || memcmp(k.mac, eigen, 6) != 0 || k.uitdaging != kUitdaging) return false;
    memcpy(mac, kMac, 6);
    memcpy(sleutel, kSleutel, 16);
    gekoppeld = true;
    herkoppelen = false; // één nieuwe knop per handeling
    heeftSessie = false;
    wacht = false;
    return true;
  }

  /** vergeet een kandidaat zonder bevestiging na BEVESTIG_MS; true = er werd er net een vergeten */
  bool tik(uint32_t nu) {
    if (wacht && nu - wachtSinds > BEVESTIG_MS) { wacht = false; return true; }
    return false;
  }
  bool wachtOpBevestiging() const { return wacht; }
  const uint8_t *kandidaat() const { return kMac; }

  /** een opdracht aanvaarden? alleen van de gekoppelde knop; sessies stijgen (de knop telt ze in zijn NVS), binnen een
   *  sessie stijgt het volgnummer: oude of herhaalde berichten en vroegere sessies worden geweigerd */
  bool aanvaard(const uint8_t *afzender, const Opdracht &o) {
    if (!gekoppeld || memcmp(afzender, mac, 6) != 0) return false;
    if (o.magie != MAGIE || o.versie != VERSIE || o.soort != SOORT_OPDRACHT) return false;
    if (heeftSessie) {
      const int16_t d = (int16_t)(o.sessie - sessie);
      if (d < 0) return false;                        // een vroegere sessie
      if (d == 0 && o.volgnr <= volgnr) return false; // herhaald of oud bericht
    }
    heeftSessie = true;
    sessie = o.sessie;
    volgnr = o.volgnr;
    return true;
  }

 private:
  uint32_t volgnr = 0;
  uint16_t sessie = 0;
  bool heeftSessie = false;
  bool wacht = false;
  uint32_t wachtSinds = 0, kUitdaging = 0;
  uint8_t kMac[6] = {0}, kSleutel[16] = {0};
};

/** knop: een KOPPEL_OK aanvaarden alleen als het de eigen uitdaging terugstuurt */
inline bool koppelOkGeldig(const Koppel &k, uint32_t eigenUitdaging) {
  return k.magie == MAGIE && k.versie == VERSIE && k.soort == SOORT_KOPPEL_OK && eigenUitdaging != 0 && k.uitdaging == eigenUitdaging;
}

/** koppelen in de knop: alleen het EERSTE geldige KOPPEL_OK telt (met het MAC-adres van de afzender erin); die ene
 *  module krijgt een gerichte KOPPEL_BEVESTIG. Lukt dat niet binnen BEVESTIG_MS, dan begint de knop opnieuw. */
class KnopKoppeling {
 public:
  static constexpr uint32_t BEVESTIG_MS = 5000;
  uint32_t uitdaging = 0;
  bool gekozen = false;
  uint8_t module[6] = {0};

  void nieuw(uint32_t u) { uitdaging = u ? u : 1; gekozen = false; }

  /** een KOPPEL_OK: true = dit is de gekozen module (stuur haar nu de bevestiging) */
  bool antwoord(const uint8_t *afzender, const Koppel &k, uint32_t nu) {
    if (gekozen || !koppelOkGeldig(k, uitdaging) || memcmp(k.mac, afzender, 6) != 0) return false;
    memcpy(module, afzender, 6);
    gekozen = true;
    gekozenOp = nu ? nu : 1;
    return true;
  }
  Koppel bevestiging() const {
    Koppel b;
    b.soort = SOORT_KOPPEL_BEVESTIG;
    b.uitdaging = uitdaging;
    memcpy(b.mac, module, 6);
    return b;
  }
  bool verlopen(uint32_t nu) const { return gekozen && nu - gekozenOp > BEVESTIG_MS; }

 private:
  uint32_t gekozenOp = 0;
};

/** module: de bewuste handeling voor opnieuw koppelen: 3 keer opstarten die elk korter dan 5 s duurden. main.cpp
 *  bewaart de teller in het NVS: bij elke start +1, na 5 s draaien terug naar 0. Dezelfde handeling wist ook de eerste
 *  ijking (eersteSchoon), zodat de volgende geldige ijking de nieuwe referentie wordt. */
inline bool herkoppelHandeling(uint8_t snelleStarts) { return snelleStarts >= 3; }

/** module: de 24 V naar de ventilator (hoge-zijde-schakelaar -Q2 via -Q3 op GPIO7) is alleen aan als de PWM groter dan
 *  0 is. Bij UIT (PWM 0) is de ventilator in dezelfde regelstap spanningsloos. */
inline bool voedingAan(int pwm) { return pwm > 0; }

} // namespace afzuiging
