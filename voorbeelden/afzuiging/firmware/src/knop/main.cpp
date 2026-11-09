// Afzuiging Lush Beauty, knop: de VIEWE-knop 1,5" (UEDX46460015-MD50E: ESP32-S3, rond AMOLED-scherm 466 x 466,
// draaiknop en drukknop) in het blad. Hij stuurt de module in het elektronicavak draadloos aan (ESP-NOW, zie
// protocol.h) en toont wat de module terugmeldt. De knop krijgt alleen 5 V over een gewone USB-C-kabel.
//
// Bediening (de logica staat in include/bediening.h en is op de pc getest)
//   draaien                 zuigkracht in stappen van 5 % (20 tot 80 %); draaien als hij uit staat zet hem aan
//   drukken                 aan / uit (UIT heeft voorrang: ook een ijking stopt meteen)
//   1 s vasthouden          boost: 2 minuten 100 % (de module houdt de tijd en het tegoed zelf bij)
//   5 tot 10 s vasthouden   "Nieuw filter geplaatst?": kort drukken = ijken op het nieuwe filter, draaien of 10 s
//                           niets doen = annuleren
//   10 s vasthouden         opnieuw koppelen: zet daarna de schakelaar van de box 3 keer kort aan en uit (< 5 s)
// Het scherm toont wat de module bevestigt (niet wat de knop vraagt): de stand, het drukverschil over het filter en de
// verbruikte drukreserve (balk: van schoon tot de vervanggrens, geen maat voor de belading). De stand is een
// percentage van het maximale toerental. "Filter vervangen" (oranje ring) komt per stand vóór het debiet onder het
// minimum voor de vangst zakt; onder 80 % meldt het scherm "lage stand". De bewaking zegt altijd wat ze weet
// (stabiliseren, niet geijkt, geen meting, buiten bereik, filter ontbreekt). Valt het drukverschil weg, draait de
// ventilator niet of klopt het toerental niet, dan meldt het een storing (rode ring). Boost komt uit een tegoed.
// Na het aanzetten staat de module UIT; een herstart van de box toont "afzuiging herstart". Zonder verse status (2 s)
// is niets bevestigd: "UIT?" of "AAN?".
//
// Aansluiting (zie ../../schema/Aansluitschema-afzuiging.pdf): FPC van de knop op de adapterprint -X11, 4 draden naar
// het USB-C-printje -X7 in de achterwand van de knophouder: VBUS -> FPC 1 (+5 V), GND -> FPC 3, D+ -> FPC 9,
// D- -> FPC 10. De andere lijnen blijven los.

#include <Arduino_GFX_Library.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

#include "bediening.h"
#include "fonts.h"
#include "logo.h"
#include "protocol.h"
#include "regel.h" // KnopKoppeling

namespace {

using namespace afzuiging;

// knop (VIEWE BSP bsp_knob_15_md50et)
constexpr int LCD_CS = 12, LCD_SCK = 10, LCD_D0 = 13, LCD_D1 = 11, LCD_D2 = 14, LCD_D3 = 9, LCD_RST = 8, LCD_VOEDING = 17;
constexpr int ENC_A = 6, ENC_B = 5, KNOP = 0;
constexpr int SCHERM = 466, KOLOM_OFFSET = 6; // het paneel is 472 breed: 6 kolommen verschuiven

constexpr int ENCODER_PER_STAP = 4;          // de encoder telt 4 flanken per klik
constexpr uint32_t BEWAAR_NA_MS = 3000;      // instelling bewaren 3 s na de laatste wijziging

// huisstijl Lush Beauty (RGB565)
constexpr uint16_t rgb(uint32_t c) { return ((c >> 8) & 0xF800) | ((c >> 5) & 0x07E0) | ((c >> 3) & 0x001F); }
constexpr uint16_t BEIGE = rgb(0xDCCBB3), ROOD = rgb(0xE0533F), ORANJE = rgb(0xE89A3C), GRIJS = rgb(0x55585E);
constexpr uint16_t WIT = rgb(0xFFFFFF), LICHT = rgb(0xC8C8C8), MIDDEN = rgb(0xA0A0A0), ZWART = 0;
constexpr uint16_t SPOOR = rgb(0x2A2B2F); // het spoor van de ring en de filterbalk
// kleurverloop van de ring en de filterbalk: van donker (begin) naar licht (einde)
struct Verloop { uint16_t van, tot; };
constexpr Verloop V_BEIGE{rgb(0x9C7A50), rgb(0xF5E8D5)}, V_ORANJE{rgb(0xA8561A), rgb(0xF7B865)}, V_ROOD{rgb(0x962A1F), rgb(0xF47A66)};

Preferences prefs;
Arduino_DataBus *bus = new Arduino_ESP32QSPI(LCD_CS, LCD_SCK, LCD_D0, LCD_D1, LCD_D2, LCD_D3);
Arduino_CO5300 *paneel = new Arduino_CO5300(bus, LCD_RST, 0, false, SCHERM, SCHERM, KOLOM_OFFSET, 0, 0, 0);
Arduino_Canvas *canvas = new Arduino_Canvas(SCHERM, SCHERM, paneel); // 434 kB: in het PSRAM
const uint8_t IEDEREEN[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

// draaiknop: kwadratuur via interrupts
volatile long encTeller = 0;
volatile uint8_t encVorig = 0;
void IRAM_ATTR encIsr() {
  static const int8_t tabel[16] = {0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0};
  const uint8_t nu = (digitalRead(ENC_A) << 1) | digitalRead(ENC_B);
  encTeller += tabel[(encVorig << 2) | nu];
  encVorig = nu;
}
long encoderLees() {
  noInterrupts();
  const long v = encTeller;
  interrupts();
  return v;
}

// gemeenschappelijke hoofdsleutel van ESP-NOW (PMK, zoals in de module); de sleutel per set maakt de knop zelf
const uint8_t PMK[16] = {'L', 'u', 's', 'h', 'B', 'e', 'a', 'u', 't', 'y', '-', 'A', 'F', 'Z', 'v', '2'};

// koppeling met de module van deze set
bool gekoppeld = false;
uint8_t moduleMac[6];
uint8_t sleutel[16];
KnopKoppeling kk;

Bediening b;           // wens, schermkeuze en wat de knop met de status doet (bediening.h)
uint16_t sessie = 0;   // stijgt bij elke start (NVS): de module weigert vroegere sessies
uint32_t volgnr = 0;

// ontvangen in de callbacks, verwerkt in loop()
portMUX_TYPE slot = portMUX_INITIALIZER_UNLOCKED;
Status binnen;
volatile bool nieuweStatus = false, koppelAntwoord = false;
volatile int8_t bevestigZend = -1; // uitkomst van de laatste KOPPEL_BEVESTIG: -1 onbekend, 0 mislukt, 1 ontvangen
Koppel antwoord;
uint8_t antwoordVan[6];

void bijOntvangst(const uint8_t *mac, const uint8_t *data, int len) {
  if (len == (int)sizeof(Status)) {
    if (!gekoppeld || memcmp(mac, moduleMac, 6) != 0) return;
    Status st;
    memcpy(&st, data, sizeof st);
    if (st.magie != MAGIE || st.versie != VERSIE || st.soort != SOORT_STATUS) return;
    portENTER_CRITICAL(&slot);
    binnen = st;
    nieuweStatus = true;
    portEXIT_CRITICAL(&slot);
  } else if (len == (int)sizeof(Koppel) && !gekoppeld) {
    Koppel k;
    memcpy(&k, data, sizeof k);
    if (k.soort != SOORT_KOPPEL_OK) return;
    portENTER_CRITICAL(&slot);
    antwoord = k;
    memcpy(antwoordVan, mac, 6);
    koppelAntwoord = true;
    portEXIT_CRITICAL(&slot);
  }
}

// de radio meldt of een unicast aankwam (ACK); alleen nodig voor de bevestiging bij het koppelen
void bijZenden(const uint8_t *mac, esp_now_send_status_t s) {
  if (kk.gekozen && memcmp(mac, kk.module, 6) == 0) bevestigZend = s == ESP_NOW_SEND_SUCCESS ? 1 : 0;
}

/** de module als versleutelde peer; false = lukt niet (dan is er geen verbinding) */
bool voegModuleToe() {
  esp_now_del_peer(moduleMac);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, moduleMac, 6);
  peer.channel = KANAAL;
  peer.encrypt = true;
  memcpy(peer.lmk, sleutel, 16);
  return esp_now_add_peer(&peer) == ESP_OK;
}

void wisKoppeling() {
  if (gekoppeld) esp_now_del_peer(moduleMac);
  gekoppeld = false;
  prefs.remove("modulemac");
  prefs.remove("sleutel");
  for (auto &x : sleutel) x = (uint8_t)esp_random();
  kk.nieuw(esp_random());
}

/** koppelen: KOPPEL rondsturen, het eerste geldige antwoord kiezen en die module gericht bevestigen */
void koppelen(uint32_t nu) {
  static uint32_t vorigeVraag = 0, vorigeBevestig = 0;
  if (gekoppeld) return;
  if (koppelAntwoord) {
    portENTER_CRITICAL(&slot);
    const Koppel k = antwoord;
    uint8_t van[6];
    memcpy(van, antwoordVan, 6);
    koppelAntwoord = false;
    portEXIT_CRITICAL(&slot);
    if (kk.antwoord(van, k, nu)) {
      // de gekozen module: onversleuteld toevoegen voor de bevestiging (lukt dat niet: opnieuw beginnen)
      esp_now_peer_info_t peer = {};
      memcpy(peer.peer_addr, kk.module, 6);
      peer.channel = KANAAL;
      peer.encrypt = false;
      bevestigZend = -1;
      if (esp_now_add_peer(&peer) != ESP_OK) kk.nieuw(esp_random());
    }
  }
  if (!kk.gekozen) {
    if (nu - vorigeVraag >= 500) {
      vorigeVraag = nu;
      Koppel k;
      k.uitdaging = kk.uitdaging;
      memcpy(k.sleutel, sleutel, 16);
      esp_now_send(IEDEREEN, (const uint8_t *)&k, sizeof k); // mislukt: de volgende vraag komt over 0,5 s
    }
    return;
  }
  if (bevestigZend == 1) {
    // de module kreeg de bevestiging: nu versleuteld en bewaren
    memcpy(moduleMac, kk.module, 6);
    if (voegModuleToe()) {
      prefs.putBytes("modulemac", moduleMac, 6);
      prefs.putBytes("sleutel", sleutel, 16);
      gekoppeld = true;
    } else {
      esp_now_del_peer(kk.module);
      kk.nieuw(esp_random());
    }
    return;
  }
  if (kk.verlopen(nu)) { // geen bevestiging aangekomen: opnieuw beginnen
    esp_now_del_peer(kk.module);
    kk.nieuw(esp_random());
    return;
  }
  if (nu - vorigeBevestig >= 300) {
    vorigeBevestig = nu;
    const Koppel bev = kk.bevestiging();
    esp_now_send(kk.module, (const uint8_t *)&bev, sizeof bev); // gericht aan de gekozen module
  }
}

/** een opdracht sturen; false = niet verzonden (geen verbinding: opnieuw proberen) */
bool stuur(const Opdracht &basis) {
  Opdracht o = basis;
  o.sessie = sessie;
  o.volgnr = ++volgnr;
  return esp_now_send(moduleMac, (const uint8_t *)&o, sizeof o) == ESP_OK;
}

// ---- scherm (466 x 466; het ontwerp is getekend op 240 x 240 en wordt geschaald) ----

constexpr float K = SCHERM / 240.0f;
int S(float v) { return (int)lroundf(v * K); }

// ---- tekst in Inter, anti-aliased (fonts.h) ----

const Letter &letter(const Lettertype &f, char ch) {
  uint8_t c = (uint8_t)ch;
  if (c < f.eerste || c > f.laatste) c = f.eerste;
  return f.letters[c - f.eerste];
}

int breedte(const Lettertype &f, const char *s) {
  int w = 0;
  for (; *s; s++) w += letter(f, *s).voort;
  return w;
}

// mengen gaat via meng() hieronder; de achtergrond is overal zwart
uint16_t meng(uint16_t a, uint16_t b, float t);

// tekst vanaf x op de basislijn
void schrijf(const Lettertype &f, const char *s, int x, int basis, uint16_t kleur) {
  for (; *s; s++) {
    const Letter &l = letter(f, *s);
    const uint8_t *p = f.pix + l.begin;
    for (int j = 0; j < l.h; j++)
      for (int i = 0; i < l.b; i++) {
        const uint8_t d = p[j * l.b + i];
        if (d) canvas->drawPixel(x + l.dx + i, basis + l.dy + j, d == 255 ? kleur : meng(ZWART, kleur, d / 255.0f));
      }
    x += l.voort;
  }
}

// tekst gecentreerd op (cx, cy): cy is het midden van de hoofdletters
void tekst(const Lettertype &f, const char *s, int cx, int cy, uint16_t kleur) {
  schrijf(f, s, cx - breedte(f, s) / 2, cy + f.cap / 2, kleur);
}

// de zuigkracht: het getal vet, het procentteken kleiner en bovenaan gelijk met de cijfers
void procent(int pct, int cy) {
  char n[5];
  snprintf(n, sizeof n, "%d", pct);
  const int wn = breedte(GROOT, n), wp = breedte(PROCENT, "%"), tussen = S(1.5f);
  const int x0 = S(120) - (wn + tussen + wp) / 2, basis = cy + GROOT.cap / 2;
  schrijf(GROOT, n, x0, basis, WIT);
  schrijf(PROCENT, "%", x0 + wn + tussen, basis - (GROOT.cap - PROCENT.cap), LICHT);
}

// twee RGB565-kleuren mengen (t = 0: a, t = 1: b)
uint16_t meng(uint16_t a, uint16_t b, float t) {
  t = constrain(t, 0.0f, 1.0f);
  const int ra = a >> 11, ga = (a >> 5) & 63, ba = a & 31, rb = b >> 11, gb = (b >> 5) & 63, bb = b & 31;
  return (uint16_t)((lroundf(ra + (rb - ra) * t) << 11) | (lroundf(ga + (gb - ga) * t) << 5) | lroundf(ba + (bb - ba) * t));
}

// de ring loopt over 270°, van linksonder (135°) met de klok mee tot rechtsonder
constexpr float BEGIN = 135, BOOG = 270;

void opRing(float hoek, float r, int &x, int &y) {
  const float a = hoek * DEG_TO_RAD;
  x = S(120) + (int)lroundf(r * cosf(a));
  y = S(120) + (int)lroundf(r * sinf(a));
}

// boog van BEGIN over tot graden tussen de stralen ro en ri (ontwerpeenheden), kleurverloop c0 -> c1 en ronde kappen
void boog(float tot, float ro, float ri, uint16_t c0, uint16_t c1) {
  if (tot <= 0) return;
  const int Ro = S(ro), Ri = S(ri);
  const float stap = 2.0f;
  for (float a = 0; a < tot; a += stap) canvas->fillArc(S(120), S(120), Ro, Ri, BEGIN + a, BEGIN + fminf(a + stap + 0.5f, tot), meng(c0, c1, a / tot));
  const float rm = (Ro + Ri) / 2.0f;
  const int rk = (Ro - Ri) / 2;
  int x, y;
  opRing(BEGIN, rm, x, y);
  canvas->fillCircle(x, y, rk, c0);
  opRing(BEGIN + tot, rm, x, y);
  canvas->fillCircle(x, y, rk, c1);
}

// het spoor en daarop de zuigkracht: dikker, met kleurverloop, ronde kappen en een wit handvat op het einde
void ring(float tot, const Verloop *v) {
  boog(BOOG, 115, 105, SPOOR, SPOOR);
  if (!v || tot <= 0) return;
  boog(tot, 117, 103, v->van, meng(v->van, v->tot, tot / BOOG));
  int x, y;
  opRing(BEGIN + tot, S(110), x, y);
  canvas->fillCircle(x, y, S(3.6f), WIT);
}

// filterbalk: spoor, gevuld deel met kleurverloop en ronde einden
void balk(float vol, const Verloop &v) {
  const int r = S(4.5f), w = S(110), x0 = S(120) - w / 2, y0 = S(195), h = 2 * r + 1;
  canvas->fillRoundRect(x0, y0, w, h, r, SPOOR);
  const int lang = constrain((int)lroundf(w * constrain(vol, 0.0f, 1.0f)), h, w);
  for (int i = r; i < lang - r; i++) canvas->drawFastVLine(x0 + i, y0, h, meng(v.van, v.tot, (float)i / w));
  canvas->fillCircle(x0 + r, y0 + r, r, v.van);
  canvas->fillCircle(x0 + lang - r - 1, y0 + r, r, meng(v.van, v.tot, (float)lang / w));
}

// het LB-logo (logo.h: dekking per pixel) in de gegeven kleur op de zwarte achtergrond
void logo(int cx, int cy, uint16_t kleur) {
  const int x0 = cx - LOGO_B / 2, y0 = cy - LOGO_H / 2;
  for (int j = 0; j < LOGO_H; j++)
    for (int i = 0; i < LOGO_B; i++) {
      const uint8_t d = pgm_read_byte(&LOGO_DEKKING[j * LOGO_B + i]);
      if (d) canvas->drawPixel(x0 + i, y0 + j, meng(ZWART, kleur, d / 255.0f));
    }
}

void tekenTekst(const char *a, const char *b2, uint16_t kleur) {
  tekst(TEKST, a, S(120), S(158), kleur);
  if (b2) tekst(TEKST, b2, S(120), S(178), kleur);
}

void teken(uint32_t nu) {
  const Status &st = b.st;
  canvas->fillScreen(ZWART);
  switch (b.scherm(nu, gekoppeld)) {
    case SCH_KOPPELEN:
      ring(0, nullptr);
      logo(S(120), S(52), BEIGE);
      tekst(TITEL, "KOPPELEN", S(120), S(104), WIT);
      tekenTekst("schakelaar box 3 x", "kort aan en uit", LICHT);
      break;
    case SCH_NIEUW_FILTER: // bevestigen voor het ijken; de ring loopt de 10 s af
      ring(BOOG * b.nieuwFilterRest(nu), &V_BEIGE);
      logo(S(120), S(52), BEIGE);
      tekst(TITEL, "NIEUW FILTER?", S(120), S(104), WIT);
      tekst(TEKST, "schoon filter geplaatst?", S(120), S(136), WIT);
      tekenTekst("kort drukken: ijken", "draaien: annuleren", LICHT);
      break;
    case SCH_IJKEN:
      ring(BOOG * st.ijkVoortgang / 100.0f, &V_BEIGE);
      logo(S(120), S(52), BEIGE);
      tekst(TITEL, "IJKEN", S(120), S(104), WIT);
      tekst(TEKST, (String("schoon filter, ") + (20 * st.ijken) + " %").c_str(), S(120), S(136), WIT);
      break;
    case SCH_AAN_ONBEVESTIGD: // zonder verse status: alleen wat de knop vraagt, uitdrukkelijk niet bevestigd
      ring(0, nullptr);
      logo(S(120), S(52), BEIGE);
      tekst(TITEL, "AAN?", S(120), S(108), MIDDEN);
      tekenTekst("geen verbinding met de box", "stand niet bevestigd", ORANJE);
      break;
    case SCH_UIT_ONBEVESTIGD:
      ring(0, nullptr);
      logo(S(120), S(52), BEIGE);
      tekst(TITEL, "UIT?", S(120), S(108), MIDDEN);
      tekenTekst("niet bevestigd", "geen verbinding", ORANJE);
      break;
    case SCH_HERSTART: // de box is herstart terwijl de knop AAN wilde: zij staat UIT tot een nieuwe handeling
      ring(0, nullptr);
      logo(S(120), S(52), BEIGE);
      tekst(GROOT, "UIT", S(120), S(112), MIDDEN);
      tekenTekst("afzuiging herstart", "druk om aan te zetten", ORANJE);
      break;
    case SCH_UIT:
      ring(0, nullptr);
      logo(S(120), S(52), BEIGE);
      tekst(GROOT, "UIT", S(120), S(112), MIDDEN);
      if (st.ijkFout == IJK_TE_HOOG) tekenTekst("ijking geweigerd", "filter niet nieuw?", ORANJE);
      else if (st.ijkFout != IJK_OK && st.ijkFout != IJK_AFGEBROKEN) tekenTekst("ijken mislukt", "vorige ijking blijft", ORANJE);
      else tekenTekst("druk om te starten", nullptr, MIDDEN);
      break;
    case SCH_AAN: {
      const bool vol = st.bewaking == BEW_OK && !isnan(st.vol) && st.vol >= 1.0f;
      const bool storing = st.storing != STORING_GEEN;
      const bool aandacht = vol || st.bewaking == BEW_FILTER_LEK;
      ring(BOOG * st.pct / 100.0f, storing ? &V_ROOD : aandacht ? &V_ORANJE : &V_BEIGE);
      logo(S(120), S(52), BEIGE);
      procent(st.pct, S(110));
      char s[40];
      if (st.storing == STORING_STIL) {
        tekenTekst("ventilator draait niet", "M8-kabel nakijken", ROOD);
      } else if (st.storing == STORING_TOEREN) {
        tekenTekst("toerental wijkt af", "ventilator nakijken", ROOD);
      } else if (st.storing == STORING_GEEN_LUCHT) {
        tekenTekst("geen luchtstroom", "slang en filter nakijken", ROOD);
      } else if (!st.meter) {
        tekenTekst("drukmeter niet gevonden", "bedrading in de box nakijken", ORANJE);
      } else if (st.bewaking == BEW_GEEN_METING) {
        tekenTekst("meting niet actueel", "filterbewaking even uit", ORANJE);
      } else if (st.bewaking == BEW_BUITEN_BEREIK) {
        tekenTekst("druk buiten meetbereik", "filter nakijken", ORANJE);
      } else if (st.bewaking == BEW_FILTER_LEK) {
        tekenTekst("filter ontbreekt", "of sluit niet af", ORANJE);
      } else if (vol) {
        tekenTekst("filter vervangen", "eerst uit, filter in een zak", ORANJE);
      } else if (st.ijkFout == IJK_TE_HOOG) {
        tekenTekst("ijking geweigerd", "filter niet nieuw?", ORANJE);
      } else if (st.ijkFout != IJK_OK && st.ijkFout != IJK_AFGEBROKEN) {
        tekenTekst("ijken mislukt", "vorige ijking blijft", ORANJE);
      } else if (st.boostRest) {
        snprintf(s, sizeof s, "BOOST %u:%02u", st.boostRest / 60, st.boostRest % 60);
        tekenTekst(s, nullptr, BEIGE);
      } else if (b.boostVraag && nu - b.boostVraag < 3000 && !st.boostRest && st.boostTegoed < 8) {
        tekenTekst("boost even niet", "nog aan het afkoelen", LICHT);
      } else if (st.bewaking == BEW_NIET_GEIJKT) {
        tekenTekst("nieuw filter?", "knop 5 s vasthouden", LICHT);
      } else if (st.bewaking == BEW_LAGE_STAND) {
        tekenTekst("lage stand", "weinig vangst, minstens 80 %", LICHT);
      } else if (st.bewaking == BEW_STABILISEREN) {
        tekenTekst("even meten...", nullptr, MIDDEN);
      } else {
        snprintf(s, sizeof s, "%.0f Pa, %u tpm", st.dp, st.toeren);
        tekenTekst(s, nullptr, LICHT);
      }
      // balk: verbruikte drukreserve (alleen met een verse meting op een te bewaken stand)
      if (st.bewaking == BEW_OK && !isnan(st.vol)) balk(st.vol, vol ? V_ORANJE : V_BEIGE);
      break;
    }
  }
  canvas->flush();
}

} // namespace

void setup() {
  Serial.begin(115200);

  // scherm: eerst de paneelvoeding aan, dan de driver
  pinMode(LCD_VOEDING, OUTPUT);
  digitalWrite(LCD_VOEDING, HIGH);
  delay(20);
  if (!canvas->begin(40000000)) Serial.println("scherm start niet");
  paneel->setBrightness(160);

  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);
  pinMode(KNOP, INPUT_PULLUP);
  encVorig = (digitalRead(ENC_A) << 1) | digitalRead(ENC_B);
  attachInterrupt(ENC_A, encIsr, CHANGE);
  attachInterrupt(ENC_B, encIsr, CHANGE);

  prefs.begin("afzuiging", false);
  b.pct = constrain(prefs.getInt("pct", 80), MIN_PCT, MAX_PCT); // 80 %: de dagstand en de laagste beschermende
  // na het aanzetten: wens UIT en niets sturen; de eerste status van de module geeft de stand (bediening.h)
  gekoppeld = prefs.getBytes("modulemac", moduleMac, 6) == 6 && prefs.getBytes("sleutel", sleutel, 16) == 16;
  if (!gekoppeld) for (auto &x : sleutel) x = (uint8_t)esp_random();
  sessie = (uint16_t)(prefs.getUShort("sessie", 0) + 1);
  prefs.putUShort("sessie", sessie);

  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(KANAAL, WIFI_SECOND_CHAN_NONE);
  kk.nieuw(esp_random());
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW start niet: geen verbinding");
  } else {
    esp_now_set_pmk(PMK);
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, IEDEREEN, 6); // alleen voor de koppelvraag
    peer.channel = KANAAL;
    peer.encrypt = false;
    if (esp_now_add_peer(&peer) != ESP_OK) Serial.println("broadcast-peer niet toegevoegd: koppelen kan niet");
    // lukt het toevoegen van de module niet, dan blijft het scherm "UIT?"/"AAN?" tonen (geen verse status)
    if (gekoppeld && !voegModuleToe()) Serial.println("module niet toegevoegd: geen verbinding");
    esp_now_register_recv_cb(bijOntvangst);
    esp_now_register_send_cb(bijZenden);
  }
}

void loop() {
  const uint32_t nu = millis();

  // status van de module
  if (nieuweStatus) {
    portENTER_CRITICAL(&slot);
    const Status st = binnen;
    nieuweStatus = false;
    portEXIT_CRITICAL(&slot);
    b.status(st, nu);
  }

  // draaiknop
  static long encoderVorig = encoderLees();
  const long stappen = (encoderLees() - encoderVorig) / ENCODER_PER_STAP;
  if (stappen != 0) {
    encoderVorig += stappen * ENCODER_PER_STAP;
    b.draai(stappen, nu);
  }

  // drukknop: kort = aan/uit, 1 s = boost, 5..10 s = "Nieuw filter geplaatst?", 10 s = opnieuw koppelen
  b.knop(digitalRead(KNOP) == LOW, nu);
  if (b.koppelVraag) {
    b.koppelVraag = false;
    wisKoppeling();
  }

  koppelen(nu);

  // opdracht naar de module: pas na de eerste handeling, dan meteen bij een wijziging en 4 keer per seconde.
  // Mislukt het zenden, dan opnieuw in de volgende lus (de knop doet niet alsof het aankwam: zonder verse status
  // toont hij "UIT?" of "AAN?").
  static uint32_t vorigeOpdracht = 0;
  if (gekoppeld && b.zenden && (b.gewijzigd || nu - vorigeOpdracht >= 250)) {
    Opdracht o;
    bool ok = true;
    if (b.basis) { // eerst de toestand van vóór de eerste handeling: zo telt een boost- of ijkvraag meteen
      b.vulBasis(o);
      ok = stuur(o);
      if (ok) b.basis = false;
    }
    if (ok) {
      b.vulOpdracht(o);
      ok = stuur(o);
    }
    vorigeOpdracht = nu;
    b.gewijzigd = !ok;
  }

  // de stand bewaren 3 s na de laatste wijziging (AAN wordt bewust niet bewaard)
  static int bewaardPct = b.pct;
  static uint32_t pctSinds = 0;
  static int vorigePct = b.pct;
  if (b.pct != vorigePct) {
    vorigePct = b.pct;
    pctSinds = nu;
  }
  if (b.pct != bewaardPct && nu - pctSinds > BEWAAR_NA_MS) {
    prefs.putInt("pct", b.pct);
    bewaardPct = b.pct;
  }

  static uint32_t vorigBeeld = 0;
  if (nu - vorigBeeld >= 50) {
    teken(nu);
    vorigBeeld = nu;
  }
}
