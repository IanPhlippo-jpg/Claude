// Afzuiging Lush Beauty, knop: de VIEWE-knop 1,5" (UEDX46460015-MD50E: ESP32-S3, rond AMOLED-scherm 466 x 466,
// draaiknop en drukknop) in het blad. Hij stuurt de module in het elektronicavak draadloos aan (ESP-NOW, zie
// protocol.h) en toont wat de module terugmeldt. De knop krijgt alleen 5 V over een gewone USB-C-kabel.
//
// Bediening
//   draaien                 zuigkracht in stappen van 5 % (20 tot 100 %); draaien als hij uit staat zet hem aan
//   drukken                 aan / uit
//   1 s vasthouden          boost: 2 minuten 100 %
//   5 s vasthouden          ijken op schone filters (na het vervangen): de module laat de ventilator 20 -> 100 % lopen
//                           en onthoudt het drukverschil van schone filters bij elke snelheid
// Het scherm toont de zuigkracht (ring en %), het drukverschil over de filters en hoe vol de filters zijn. Is het
// drukverschil bij dezelfde snelheid verdubbeld, dan meldt het scherm "Filter vol" (oranje ring). Valt het
// drukverschil weg terwijl de ventilator hoort te draaien, dan meldt het een storing (rode ring).
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

namespace {

using namespace afzuiging;

// knop (VIEWE BSP bsp_knob_15_md50et)
constexpr int LCD_CS = 12, LCD_SCK = 10, LCD_D0 = 13, LCD_D1 = 11, LCD_D2 = 14, LCD_D3 = 9, LCD_RST = 8, LCD_VOEDING = 17;
constexpr int ENC_A = 6, ENC_B = 5, KNOP = 0;
constexpr int SCHERM = 466, KOLOM_OFFSET = 6; // het paneel is 472 breed: 6 kolommen verschuiven

constexpr int MIN_PCT = 20, MAX_PCT = 100, STAP_PCT = 5;
constexpr int ENCODER_PER_STAP = 4;          // de encoder telt 4 flanken per klik
constexpr uint32_t BOOST_MS = 2 * 60 * 1000; // boost: 2 minuten volle kracht
constexpr uint32_t BOOST_HOUD_MS = 1000, IJK_HOUD_MS = 5000;
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

// status van de module (geschreven in de ontvangst-callback)
Status ontvangen;
volatile uint32_t laatsteStatus = 0;
portMUX_TYPE slot = portMUX_INITIALIZER_UNLOCKED;

void bijOntvangst(const uint8_t *, const uint8_t *data, int len) {
  if (len != (int)sizeof(Status)) return;
  Status st;
  memcpy(&st, data, sizeof st);
  if (st.magie != MAGIE || st.soort != SOORT_STATUS) return;
  portENTER_CRITICAL(&slot);
  ontvangen = st;
  laatsteStatus = millis();
  portEXIT_CRITICAL(&slot);
}

struct Toestand {
  bool aan = false;
  int pct = 50;
  uint32_t boostTot = 0; // millis(); 0 = geen boost
  uint8_t ijk = 0;       // teller voor de ijkvraag
  uint16_t sessie = 0;   // willekeurig bij de start
} t;

long encoderVorig = 0;
uint32_t laatsteWijziging = 0;
bool teBewaren = false, gewijzigd = true;

bool boostActief(uint32_t nu) { return t.boostTot != 0 && (int32_t)(t.boostTot - nu) > 0; }

int doelPct(uint32_t nu) {
  if (!t.aan) return 0;
  return boostActief(nu) ? MAX_PCT : t.pct;
}

void stuurOpdracht(uint32_t nu) {
  Opdracht o;
  o.aan = t.aan;
  o.pct = t.aan ? doelPct(nu) : t.pct;
  o.ijk = t.ijk;
  o.sessie = t.sessie;
  esp_now_send(IEDEREEN, (const uint8_t *)&o, sizeof o);
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
  if (verbonden && st.ijken) {
    ring(BOOG * st.ijkVoortgang / 100.0f, &V_BEIGE);
    logo(S(120), S(52), BEIGE);
    tekst(TITEL, "IJKEN", S(120), S(104), WIT);
    tekst(TEKST, (String("schone filters, ") + (20 * st.ijken) + " %").c_str(), S(120), S(136), WIT);
    canvas->flush();
    return;
  }
  const bool boost = t.aan && boostActief(nu);
  const int pct = doelPct(nu);
  const bool vol = verbonden && t.aan && !isnan(st.vol) && st.vol >= 1.0f;
  const bool storing = verbonden && t.aan && st.storing;
  const Verloop *verloop = storing ? &V_ROOD : vol ? &V_ORANJE : &V_BEIGE;
  ring(t.aan ? BOOG * pct / 100.0f : 0, t.aan ? verloop : nullptr);
  logo(S(120), S(52), BEIGE);
  if (!t.aan) {
    tekst(GROOT, "UIT", S(120), S(112), MIDDEN);
    tekenTekst("druk om te starten", verbonden ? nullptr : "geen verbinding met de box", MIDDEN);
  } else {
    procent(pct, S(110));
    char s[32];
    if (!verbonden) {
      tekenTekst("geen verbinding", "met de voedingsbox", ORANJE);
    } else if (!st.meter) {
      tekenTekst("drukmeter niet gevonden", "bedrading in de box nakijken", ORANJE);
    } else if (storing && st.storing == 2) {
      tekenTekst("ventilator draait niet", "M8-kabel nakijken", ROOD);
    } else if (storing) {
      tekenTekst("geen luchtstroom", "slang en filters nakijken", ROOD);
    } else if (vol) {
      tekenTekst("Filter vol", "filters uitkloppen", ORANJE);
    } else if (boost) {
      const uint32_t rest = (t.boostTot - nu) / 1000;
      snprintf(s, sizeof s, "BOOST %lu:%02lu", (unsigned long)(rest / 60), (unsigned long)(rest % 60));
      tekenTekst(s, nullptr, BEIGE);
    } else if (!st.geijkt) {
      tekenTekst("nieuwe filters?", "knop 5 s vasthouden", LICHT);
    } else {
      snprintf(s, sizeof s, "%.0f Pa over de filters", st.dp);
      tekenTekst(s, nullptr, LICHT);
    }
    // filterbalk: hoe vol de filters zijn
    if (verbonden && st.geijkt && !isnan(st.vol)) balk(st.vol, vol ? V_ORANJE : V_BEIGE);
  }
  canvas->flush();
}

void schakel() {
  t.aan = !t.aan;
  t.boostTot = 0;
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
  t.pct = constrain(prefs.getInt("pct", 50), MIN_PCT, MAX_PCT);
  t.aan = prefs.getBool("aan", false);
  t.sessie = (uint16_t)esp_random();
  encoderVorig = encoderLees();

  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(KANAAL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) Serial.println("ESP-NOW start niet");
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, IEDEREEN, 6);
  peer.channel = KANAAL;
  peer.encrypt = false;
  esp_now_add_peer(&peer);
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
        t.boostTot = 0;
        gewijzigd = true;
      }
      teBewaren = true;
      laatsteWijziging = nu;
    }
  }

  // drukknop: kort = aan/uit, 1 s = boost (bij loslaten), 5 s = ijken (meteen)
  static uint32_t knopSinds = 0;
  static bool knopGebruikt = false, knopVorig = false;
  const bool knop = digitalRead(KNOP) == LOW;
  if (knop && !knopVorig) {
    knopSinds = nu;
    knopGebruikt = false;
  }
  if (knop && !knopGebruikt && nu - knopSinds > IJK_HOUD_MS) {
    knopGebruikt = true; // één keer per indrukken
    t.ijk++;
    gewijzigd = true;
  }
  if (!knop && knopVorig && !knopGebruikt && nu - knopSinds > 30) {
    if (nu - knopSinds >= BOOST_HOUD_MS) {
      if (!t.aan) schakel();
      t.boostTot = nu + BOOST_MS;
      gewijzigd = true;
    } else {
      schakel();
    }
  }
  knopVorig = knop;
  if (t.boostTot != 0 && !boostActief(nu)) {
    t.boostTot = 0;
    gewijzigd = true;
  }

  // opdracht naar de module: meteen bij een wijziging, anders 4 keer per seconde
  static uint32_t vorigeOpdracht = 0;
  if (gewijzigd || nu - vorigeOpdracht >= 250) {
    stuurOpdracht(nu);
    vorigeOpdracht = nu;
    gewijzigd = false;
  }

  if (teBewaren && nu - laatsteWijziging > BEWAAR_NA_MS) {
    prefs.putInt("pct", t.pct);
    prefs.putBool("aan", t.aan);
    teBewaren = false;
  }

  static uint32_t vorigBeeld = 0;
  if (nu - vorigBeeld >= 50) {
    teken(nu);
    vorigBeeld = nu;
  }
}
