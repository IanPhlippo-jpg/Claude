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

#include <U8g2lib.h> // lettertypes (vóór de GFX-bibliotheek)
#include <Arduino_GFX_Library.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

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

void tekst(const String &s, int x, int y, const uint8_t *font, uint16_t kleur) {
  canvas->setFont(font);
  canvas->setTextColor(kleur);
  int16_t bx, by;
  uint16_t w, h;
  canvas->getTextBounds(s.c_str(), 0, 0, &bx, &by, &w, &h);
  canvas->setCursor(x - w / 2 - bx, y - h / 2 - by);
  canvas->print(s);
}

void ring(float tot, uint16_t kleur) {
  if (tot > 0) canvas->fillArc(S(120), S(120), S(116), S(104), 135, 135 + tot, kleur);
}

void tekenTekst(const char *a, const char *b, uint16_t kleur) {
  tekst(a, S(120), S(158), u8g2_font_helvR18_tf, kleur);
  if (b) tekst(b, S(120), S(178), u8g2_font_helvR18_tf, kleur);
}

void teken(uint32_t nu) {
  Status st;
  portENTER_CRITICAL(&slot);
  st = ontvangen;
  const bool verbonden = laatsteStatus && nu - laatsteStatus < STILTE_MS;
  portEXIT_CRITICAL(&slot);

  canvas->fillScreen(ZWART);
  if (verbonden && st.ijken) {
    ring(270.0f * st.ijkVoortgang / 100.0f, BEIGE);
    tekst("IJKEN", S(120), S(104), u8g2_font_helvB24_tf, WIT);
    tekst(String("schone filters, ") + (20 * st.ijken) + " %", S(120), S(136), u8g2_font_helvR18_tf, WIT);
    canvas->flush();
    return;
  }
  const bool boost = t.aan && boostActief(nu);
  const int pct = doelPct(nu);
  const bool vol = verbonden && t.aan && !isnan(st.vol) && st.vol >= 1.0f;
  const bool storing = verbonden && t.aan && st.storing;
  const uint16_t kleur = storing ? ROOD : vol ? ORANJE : BEIGE;
  ring(270, GRIJS);
  if (t.aan) ring(270.0f * pct / 100.0f, kleur);
  tekst("LUSH BEAUTY", S(120), S(50), u8g2_font_helvR18_tf, BEIGE);
  if (!t.aan) {
    tekst("UIT", S(120), S(116), u8g2_font_logisoso58_tr, MIDDEN);
    tekenTekst("druk om te starten", verbonden ? nullptr : "geen verbinding met de module", MIDDEN);
  } else {
    tekst(String(pct) + "%", S(120), S(110), u8g2_font_logisoso58_tr, WIT);
    char s[32];
    if (!verbonden) {
      tekenTekst("geen verbinding", "met de module", ORANJE);
    } else if (!st.meter) {
      tekenTekst("drukmeter niet gevonden", "bedrading in de module nakijken", ORANJE);
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
    if (verbonden && st.geijkt && !isnan(st.vol)) {
      const int w = S(110), x0 = S(120) - w / 2, y0 = S(196);
      canvas->drawRoundRect(x0, y0, w, S(8), S(4), GRIJS);
      canvas->fillRoundRect(x0, y0, max(1, (int)(w * constrain(st.vol, 0.0f, 1.0f))), S(8), S(4), vol ? ORANJE : BEIGE);
    }
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
