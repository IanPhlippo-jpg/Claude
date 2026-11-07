// Afzuiging Lush Beauty, knop: de VIEWE-knop 1,5" (UEDX46460015-MD50E: ESP32-S3, rond AMOLED-scherm 466 x 466,
// draaiknop en drukknop) in het blad. Hij stuurt de module in het elektronicavak draadloos aan (ESP-NOW, zie
// protocol.h) en toont wat de module terugmeldt. De knop krijgt alleen 5 V over een gewone USB-C-kabel.
//
// Bediening
//   draaien                 zuigkracht in stappen van 5 % (20 tot 80 %); draaien als hij uit staat zet hem aan
//   drukken                 aan / uit (UIT heeft voorrang: ook een ijking stopt meteen)
//   1 s vasthouden          boost: 2 minuten 100 % (de module houdt de tijd zelf bij)
//   5 tot 10 s vasthouden   ijken op een schoon filter (na het vervangen), bij het loslaten
//   10 s vasthouden         opnieuw koppelen: zet daarna de schakelaar van de box 3 keer kort aan en uit (< 5 s)
// Het scherm toont wat de module bevestigt (niet wat de knop vraagt): de stand, het drukverschil over het filter en
// hoe vol het filter is. De stand is een percentage van het maximale toerental. "Filter vervangen" (oranje ring) komt
// per stand vóór het debiet onder het minimum voor de vangst zakt; onder 70 % meldt het scherm "lage stand". De
// bewaking zegt altijd wat ze weet (stabiliseren, niet geijkt, geen meting, buiten bereik). Valt het drukverschil weg of
// draait de ventilator niet, dan meldt het een storing (rode ring). Boost komt uit een tegoed (2 min, daarna afkoelen).
// Na het aanzetten staat alles UIT.
//
// Aansluiting (zie ../../schema/Aansluitschema-afzuiging.pdf): FPC van de knop op de adapterprint -A3, 4 draden naar
// het USB-C-printje -X7 in de achterwand van de knophouder: VBUS -> FPC 1 (+5 V), GND -> FPC 3, D+ -> FPC 9,
// D- -> FPC 10. De andere lijnen blijven los.

#include <Arduino_GFX_Library.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

#include "fonts.h"
#include "logo.h"
#include "protocol.h"
#include "regel.h" // koppelOkGeldig

namespace {

using namespace afzuiging;

// knop (VIEWE BSP bsp_knob_15_md50et)
constexpr int LCD_CS = 12, LCD_SCK = 10, LCD_D0 = 13, LCD_D1 = 11, LCD_D2 = 14, LCD_D3 = 9, LCD_RST = 8, LCD_VOEDING = 17;
constexpr int ENC_A = 6, ENC_B = 5, KNOP = 0;
constexpr int SCHERM = 466, KOLOM_OFFSET = 6; // het paneel is 472 breed: 6 kolommen verschuiven

constexpr int MIN_PCT = 20, MAX_PCT = 80, STAP_PCT = 5; // 100 % alleen als boost (warmte box)
constexpr int ENCODER_PER_STAP = 4;          // de encoder telt 4 flanken per klik
constexpr uint32_t BOOST_HOUD_MS = 1000, IJK_HOUD_MS = 5000, KOPPEL_HOUD_MS = 10000; // de boost zelf (120 s) telt de module
constexpr uint32_t BEWAAR_NA_MS = 3000;      // instelling bewaren 3 s na de laatste wijziging
constexpr uint32_t STILTE_MS = 3000;         // zonder status van de module: "geen verbinding"

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

// status van de module (geschreven in de ontvangst-callback): alleen van de gekoppelde module
Status ontvangen;
volatile uint32_t laatsteStatus = 0;
volatile bool koppelAntwoord = false;
uint32_t uitdaging = 0;  // van de lopende koppelvraag
uint32_t boostVraag = 0; // wanneer de laatste boost gevraagd werd
uint8_t koppelVan[6];
portMUX_TYPE slot = portMUX_INITIALIZER_UNLOCKED;

void bijOntvangst(const uint8_t *mac, const uint8_t *data, int len) {
  if (len == (int)sizeof(Status)) {
    if (!gekoppeld || memcmp(mac, moduleMac, 6) != 0) return;
    Status st;
    memcpy(&st, data, sizeof st);
    if (st.magie != MAGIE || st.versie != VERSIE || st.soort != SOORT_STATUS) return;
    portENTER_CRITICAL(&slot);
    ontvangen = st;
    laatsteStatus = millis();
    portEXIT_CRITICAL(&slot);
  } else if (len == (int)sizeof(Koppel) && !gekoppeld) {
    Koppel k;
    memcpy(&k, data, sizeof k);
    if (!koppelOkGeldig(k, uitdaging)) return; // alleen het antwoord op de eigen vraag
    portENTER_CRITICAL(&slot);
    memcpy(koppelVan, mac, 6);
    koppelAntwoord = true;
    portEXIT_CRITICAL(&slot);
  }
}

void voegModuleToe() {
  esp_now_del_peer(moduleMac);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, moduleMac, 6);
  peer.channel = KANAAL;
  peer.encrypt = true;
  memcpy(peer.lmk, sleutel, 16);
  esp_now_add_peer(&peer);
}

struct Toestand {
  bool aan = false;    // wat de gebruiker wil (de module bevestigt)
  int pct = 50;
  uint8_t ijk = 0;     // teller voor de ijkvraag
  uint8_t boost = 0;   // teller voor de boostvraag
  uint16_t sessie = 0; // stijgt bij elke start (NVS): de module weigert vroegere sessies
  uint32_t volgnr = 0;
} t;

long encoderVorig = 0;
uint32_t laatsteWijziging = 0;
bool teBewaren = false, gewijzigd = true;

void stuurOpdracht() {
  if (!gekoppeld) return;
  Opdracht o;
  o.aan = t.aan;
  o.pct = t.pct;
  o.ijk = t.ijk;
  o.boost = t.boost;
  o.sessie = t.sessie;
  o.volgnr = ++t.volgnr;
  esp_now_send(moduleMac, (const uint8_t *)&o, sizeof o);
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

void tekenTekst(const char *a, const char *b, uint16_t kleur) {
  tekst(TEKST, a, S(120), S(158), kleur);
  if (b) tekst(TEKST, b, S(120), S(178), kleur);
}

void teken(uint32_t nu) {
  Status st;
  portENTER_CRITICAL(&slot);
  st = ontvangen;
  const bool verbonden = laatsteStatus && nu - laatsteStatus < STILTE_MS;
  portEXIT_CRITICAL(&slot);

  canvas->fillScreen(ZWART);
  if (!gekoppeld) {
    ring(0, nullptr);
    logo(S(120), S(52), BEIGE);
    tekst(TITEL, "KOPPELEN", S(120), S(104), WIT);
    tekenTekst("schakelaar box 3 x", "kort aan en uit", LICHT);
    canvas->flush();
    return;
  }
  if (verbonden && st.ijken) {
    ring(BOOG * st.ijkVoortgang / 100.0f, &V_BEIGE);
    logo(S(120), S(52), BEIGE);
    tekst(TITEL, "IJKEN", S(120), S(104), WIT);
    tekst(TEKST, (String("schone mat, ") + (20 * st.ijken) + " %").c_str(), S(120), S(136), WIT);
    canvas->flush();
    return;
  }
  // zonder verbinding: alleen wat de knop vraagt, uitdrukkelijk als niet bevestigd
  if (!verbonden) {
    ring(0, nullptr);
    logo(S(120), S(52), BEIGE);
    if (t.aan) tekst(TITEL, "AAN?", S(120), S(108), MIDDEN);
    else tekst(GROOT, "UIT", S(120), S(112), MIDDEN);
    tekenTekst("geen verbinding met de box", t.aan ? "stand niet bevestigd" : nullptr, ORANJE);
    canvas->flush();
    return;
  }
  const bool aan = st.aan;
  const bool vol = aan && st.bewaking == BEW_OK && !isnan(st.vol) && st.vol >= 1.0f;
  const bool storing = aan && st.storing != STORING_GEEN;
  const Verloop *verloop = storing ? &V_ROOD : vol ? &V_ORANJE : &V_BEIGE;
  ring(aan ? BOOG * st.pct / 100.0f : 0, aan ? verloop : nullptr);
  logo(S(120), S(52), BEIGE);
  char s[40];
  if (!aan) {
    tekst(GROOT, "UIT", S(120), S(112), MIDDEN);
    if (st.ijkFout != IJK_OK && st.ijkFout != IJK_AFGEBROKEN) tekenTekst("ijken mislukt", "vorige ijking blijft", ORANJE);
    else tekenTekst("druk om te starten", nullptr, MIDDEN);
  } else {
    procent(st.pct, S(110));
    if (st.storing == STORING_STIL) {
      tekenTekst("ventilator draait niet", "M8-kabel nakijken", ROOD);
    } else if (st.storing == STORING_GEEN_LUCHT) {
      tekenTekst("geen luchtstroom", "slang en filter nakijken", ROOD);
    } else if (!st.meter) {
      tekenTekst("drukmeter niet gevonden", "bedrading in de box nakijken", ORANJE);
    } else if (st.bewaking == BEW_GEEN_METING) {
      tekenTekst("meting niet actueel", "filterbewaking even uit", ORANJE);
    } else if (st.bewaking == BEW_BUITEN_BEREIK) {
      tekenTekst("druk buiten meetbereik", "filter nakijken", ORANJE);
    } else if (vol) {
      tekenTekst("filter vervangen", "eerst uit, mat in een zak", ORANJE);
    } else if (st.ijkFout != IJK_OK && st.ijkFout != IJK_AFGEBROKEN) {
      tekenTekst("ijken mislukt", "vorige ijking blijft", ORANJE);
    } else if (st.boostRest) {
      snprintf(s, sizeof s, "BOOST %u:%02u", st.boostRest / 60, st.boostRest % 60);
      tekenTekst(s, nullptr, BEIGE);
    } else if (boostVraag && nu - boostVraag < 3000 && !st.boostRest && st.boostTegoed < 8) {
      tekenTekst("boost even niet", "nog aan het afkoelen", LICHT);
    } else if (st.bewaking == BEW_NIET_GEIJKT) {
      tekenTekst("nieuwe mat?", "knop 5 s vasthouden", LICHT);
    } else if (st.bewaking == BEW_LAGE_STAND) {
      tekenTekst("lage stand", "weinig vangst, minstens 70 %", LICHT);
    } else if (st.bewaking == BEW_STABILISEREN) {
      tekenTekst("even meten...", nullptr, MIDDEN);
    } else {
      snprintf(s, sizeof s, "%.0f Pa, %u tpm", st.dp, st.toeren);
      tekenTekst(s, nullptr, LICHT);
    }
    // filterbalk: hoe vol het filter is (alleen met een verse meting op een te bewaken stand)
    if (st.bewaking == BEW_OK && !isnan(st.vol)) balk(st.vol, vol ? V_ORANJE : V_BEIGE);
  }
  canvas->flush();
}

void schakel() {
  t.aan = !t.aan;
  teBewaren = true;
  gewijzigd = true;
  laatsteWijziging = millis();
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
  t.pct = constrain(prefs.getInt("pct", 70), MIN_PCT, MAX_PCT); // 70 %: de laagste beschermende stand
  t.aan = false; // na het aanzetten (ook na een stroomonderbreking) altijd UIT
  gekoppeld = prefs.getBytes("modulemac", moduleMac, 6) == 6 && prefs.getBytes("sleutel", sleutel, 16) == 16;
  if (!gekoppeld) for (auto &b : sleutel) b = (uint8_t)esp_random();
  t.sessie = (uint16_t)(prefs.getUShort("sessie", 0) + 1);
  prefs.putUShort("sessie", t.sessie);
  encoderVorig = encoderLees();

  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(KANAAL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) Serial.println("ESP-NOW start niet");
  esp_now_set_pmk(PMK);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, IEDEREEN, 6); // alleen voor de koppelvraag
  peer.channel = KANAAL;
  peer.encrypt = false;
  esp_now_add_peer(&peer);
  if (gekoppeld) voegModuleToe();
  esp_now_register_recv_cb(bijOntvangst);
}

void loop() {
  const uint32_t nu = millis();

  // draaiknop: zuigkracht
  const long enc = encoderLees();
  const long stappen = (enc - encoderVorig) / ENCODER_PER_STAP;
  if (stappen != 0) {
    encoderVorig += stappen * ENCODER_PER_STAP;
    if (!t.aan) {
      schakel();
    } else {
      const int nieuw = constrain(t.pct + (int)stappen * STAP_PCT, MIN_PCT, MAX_PCT);
      if (nieuw != t.pct) {
        t.pct = nieuw;
        gewijzigd = true;
      }
      teBewaren = true;
      laatsteWijziging = nu;
    }
  }

  // drukknop: kort = aan/uit, 1 s = boost, 5..10 s = ijken (bij het loslaten), 10 s = opnieuw koppelen
  static uint32_t knopSinds = 0;
  static bool knopGebruikt = false, knopVorig = false;
  const bool knop = digitalRead(KNOP) == LOW;
  if (knop && !knopVorig) {
    knopSinds = nu;
    knopGebruikt = false;
  }
  if (knop && !knopGebruikt && nu - knopSinds > KOPPEL_HOUD_MS) {
    knopGebruikt = true;
    gekoppeld = false;
    prefs.remove("modulemac");
    prefs.remove("sleutel");
    for (auto &b : sleutel) b = (uint8_t)esp_random();
  }
  if (!knop && knopVorig && !knopGebruikt && nu - knopSinds > 30) {
    const uint32_t duur = nu - knopSinds;
    if (duur >= IJK_HOUD_MS) {
      t.aan = true; // ijken gebeurt met de ventilator aan
      t.ijk++;
    } else if (duur >= BOOST_HOUD_MS) {
      t.aan = true;
      t.boost++;
      boostVraag = nu;
    } else {
      schakel();
    }
    gewijzigd = true;
  }
  knopVorig = knop;

  // koppelen: vragen tot een module antwoordt (in haar koppelvenster)
  static uint32_t vorigeVraag = 0;
  if (!gekoppeld && nu - vorigeVraag >= 500) {
    vorigeVraag = nu;
    Koppel k;
    if (!uitdaging) uitdaging = esp_random() | 1; // niet 0
    k.uitdaging = uitdaging;
    memcpy(k.sleutel, sleutel, 16);
    esp_now_send(IEDEREEN, (const uint8_t *)&k, sizeof k);
  }
  if (koppelAntwoord) {
    portENTER_CRITICAL(&slot);
    memcpy(moduleMac, koppelVan, 6);
    koppelAntwoord = false;
    portEXIT_CRITICAL(&slot);
    prefs.putBytes("modulemac", moduleMac, 6);
    prefs.putBytes("sleutel", sleutel, 16);
    gekoppeld = true;
    voegModuleToe();
  }

  // opdracht naar de module: meteen bij een wijziging, anders 4 keer per seconde
  static uint32_t vorigeOpdracht = 0;
  if (gewijzigd || nu - vorigeOpdracht >= 250) {
    stuurOpdracht();
    vorigeOpdracht = nu;
    gewijzigd = false;
  }

  if (teBewaren && nu - laatsteWijziging > BEWAAR_NA_MS) {
    prefs.putInt("pct", t.pct); // alleen de stand; AAN wordt bewust niet bewaard
    teBewaren = false;
  }

  static uint32_t vorigBeeld = 0;
  if (nu - vorigBeeld >= 50) {
    teken(nu);
    vorigBeeld = nu;
  }
}
