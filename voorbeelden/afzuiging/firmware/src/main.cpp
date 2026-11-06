// Afzuiging Lush Beauty: de VIEWE-knop 1,5" (UEDX46460015-MD50E: ESP32-S3, rond AMOLED-scherm 466 x 466, draaiknop
// en drukknop) stuurt de ventilator (Delta PFR1212UHE-SP00, 12 V, 32 W, 300 Pa, PWM) van de ingebouwde
// nagelstofafzuiging en bewaakt de filters met een verschildrukmeter (Sensirion SDP810-500Pa) over het filterpakket.
//
// Bediening
//   draaien                 zuigkracht in stappen van 5 % (20 tot 100 %); draaien als hij uit staat zet hem aan
//   drukken                 aan / uit
//   1 s vasthouden          boost: 2 minuten 100 %
//   5 s vasthouden          ijken op schone filters (na het vervangen): de ventilator loopt 20 -> 100 % en de knop
//                           onthoudt het drukverschil van schone filters bij elke snelheid
// Het scherm toont de zuigkracht (ring en %), het drukverschil over de filters en hoe vol de filters zijn. Is het
// drukverschil bij dezelfde snelheid verdubbeld, dan meldt het scherm "Filter vol" (oranje ring).
// Valt het drukverschil weg terwijl de ventilator hoort te draaien, dan meldt het een storing (rode ring).
//
// Aansluiting (zie ../schema/Aansluitschema-afzuiging.pdf), via de 10-polige FPC van de knop en de adapterprint -A3:
//   FPC 6 (GPIO44) SDA en FPC 7 (GPIO43) SCL -> SDP810 (adres 0x25, 3,3 V, pull-ups 4,7 kOhm naar 3,3 V). Het zijn de
//                  UART0-lijnen: in rust hoog, net als I2C; de console loopt over USB (CDC).
//   FPC 5 (GPIO39) -> 1 kOhm -> basis Q1 (BC547); collector -> PWM-draad van de ventilator; emitter -> GND
//   FPC 4 (GPIO40) -> 1 kOhm -> basis Q2 (BC547) die de gate van Q3 (IRF4905, P-MOSFET) laag trekt: +12 V naar de
//                  ventilator aan. Gate 10 kOhm naar +12 V: zonder signaal (opstarten) staat de ventilator uit.
//   FPC 1 +5 V en FPC 3 GND uit de 5V-regelaar op de print; FPC 9/10 (USB D+/D-) naar de USB-C-bus in de kuip.
// Q1 keert het PWM-signaal om: hoog op GPIO39 trekt de PWM-draad laag. De firmware rekent dat om.

#include <U8g2lib.h> // lettertypes (vóór de GFX-bibliotheek)
#include <Arduino_GFX_Library.h>
#include <Preferences.h>
#include <Wire.h>

namespace {

// knop (VIEWE BSP bsp_knob_15_md50et)
constexpr int LCD_CS = 12, LCD_SCK = 10, LCD_D0 = 13, LCD_D1 = 11, LCD_D2 = 14, LCD_D3 = 9, LCD_RST = 8, LCD_VOEDING = 17;
constexpr int ENC_A = 6, ENC_B = 5, KNOP = 0;
constexpr int SCHERM = 466, KOLOM_OFFSET = 6; // het paneel is 472 breed: 6 kolommen verschuiven
// lijnen op de FPC
constexpr int PIN_SDA = 44, PIN_SCL = 43;
constexpr int PIN_PWM = 39;
constexpr int PIN_AAN = 40; // voeding van de ventilator aan/uit (via Q2/Q3)
constexpr int PWM_KANAAL = 0;
constexpr int PWM_FREQ = 25000; // Intel-specificatie voor 4-draads ventilatoren
constexpr int PWM_BITS = 8;

constexpr int MIN_PCT = 20, MAX_PCT = 100, STAP_PCT = 5;
constexpr int ENCODER_PER_STAP = 4;          // de encoder telt 4 flanken per klik
constexpr uint32_t BOOST_MS = 2 * 60 * 1000; // boost: 2 minuten volle kracht
constexpr uint32_t BOOST_HOUD_MS = 1000, IJK_HOUD_MS = 5000;
constexpr uint32_t BEWAAR_NA_MS = 3000; // instelling bewaren 3 s na de laatste wijziging

// filterbewaking
constexpr uint8_t SDP_ADRES = 0x25;
constexpr float SDP_SCHAAL = 60.0f;     // SDP810-500Pa: 60 per Pa (de meter stuurt de factor ook mee)
constexpr int IJK_PUNTEN = 5;           // 20, 40, 60, 80, 100 %
constexpr float VOL_FACTOR = 2.0f;      // drukverschil verdubbeld = filter vol
constexpr float STORING_FACTOR = 0.25f; // minder dan een kwart van schoon = ventilator of slang stuk
constexpr uint32_t STABIEL_MS = 6000;   // na een snelheidswijziging eerst 6 s wachten

// huisstijl Lush Beauty (RGB565)
constexpr uint16_t rgb(uint32_t c) { return ((c >> 8) & 0xF800) | ((c >> 5) & 0x07E0) | ((c >> 3) & 0x001F); }
constexpr uint16_t BEIGE = rgb(0xDCCBB3), ROOD = rgb(0xE0533F), ORANJE = rgb(0xE89A3C), GRIJS = rgb(0x55585E);
constexpr uint16_t WIT = rgb(0xFFFFFF), LICHT = rgb(0xC8C8C8), MIDDEN = rgb(0xA0A0A0), ZWART = 0;

Preferences prefs;
Arduino_DataBus *bus = new Arduino_ESP32QSPI(LCD_CS, LCD_SCK, LCD_D0, LCD_D1, LCD_D2, LCD_D3);
Arduino_CO5300 *paneel = new Arduino_CO5300(bus, LCD_RST, 0, false, SCHERM, SCHERM, KOLOM_OFFSET, 0, 0, 0);
Arduino_Canvas *canvas = new Arduino_Canvas(SCHERM, SCHERM, paneel); // 434 kB: in het PSRAM

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

struct Toestand {
  bool aan = false;
  int pct = 50;
  uint32_t boostTot = 0; // millis(); 0 = geen boost
  float dp = NAN;        // gefilterd drukverschil over de filters (Pa)
  bool meter = false;    // drukmeter gevonden
  float vol = NAN;       // 0 = schoon, 1 = vol (vervangen)
  bool storing = false;
  bool geijkt = false;
  float schoon[IJK_PUNTEN] = {0};
} t;

long encoderVorig = 0;
uint32_t laatsteWijziging = 0, snelheidSinds = 0;
bool teBewaren = false;
int vorigDoel = -1;

bool boostActief(uint32_t nu) { return t.boostTot != 0 && (int32_t)(t.boostTot - nu) > 0; }

int doelPct(uint32_t nu) {
  if (!t.aan) return 0;
  return boostActief(nu) ? MAX_PCT : t.pct;
}

void zetPwm(int pct) {
  // voeding uit bij 0 %; het PWM-signaal is omgekeerd door Q1 (0 % op de ventilator = GPIO altijd hoog)
  digitalWrite(PIN_AAN, pct > 0 ? HIGH : LOW);
  const int max = (1 << PWM_BITS) - 1;
  ledcWrite(PWM_KANAAL, pct > 0 ? max - (pct * max) / 100 : 0);
}

// ---- Sensirion SDP810: continu meten (gemiddeld tot uitlezen), 9 bytes met CRC-8 (polynoom 0x31, start 0xFF) ----

uint8_t crc8(const uint8_t *d, int n) {
  uint8_t c = 0xFF;
  for (int i = 0; i < n; i++) {
    c ^= d[i];
    for (int b = 0; b < 8; b++) c = (c & 0x80) ? (uint8_t)((c << 1) ^ 0x31) : (uint8_t)(c << 1);
  }
  return c;
}

bool sdpStart() {
  Wire.beginTransmission(SDP_ADRES);
  Wire.write(0x36); // continu: verschildruk, gemiddeld tot uitlezen
  Wire.write(0x15);
  return Wire.endTransmission() == 0;
}

bool sdpLees(float &pa) {
  if (Wire.requestFrom((int)SDP_ADRES, 9) != 9) return false;
  uint8_t b[9];
  for (auto &x : b) x = Wire.read();
  if (crc8(b, 2) != b[2] || crc8(b + 6, 2) != b[8]) return false;
  const int16_t ruw = (int16_t)((b[0] << 8) | b[1]);
  const uint16_t schaal = (uint16_t)((b[6] << 8) | b[7]);
  pa = ruw / (schaal ? (float)schaal : SDP_SCHAAL);
  return true;
}

/** drukverschil van schone filters bij deze snelheid (lineair tussen de ijkpunten) */
float schoonBij(int pct) {
  const float p = constrain((pct - 20) / 20.0f, 0.0f, (float)(IJK_PUNTEN - 1));
  const int i = min((int)p, IJK_PUNTEN - 2);
  return t.schoon[i] + (t.schoon[i + 1] - t.schoon[i]) * (p - i);
}

void bewaarIjking() {
  prefs.putBytes("schoon", t.schoon, sizeof t.schoon);
  prefs.putBool("geijkt", true);
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
  canvas->fillScreen(ZWART);
  const bool boost = t.aan && boostActief(nu);
  const int pct = doelPct(nu);
  const bool vol = t.aan && !isnan(t.vol) && t.vol >= 1.0f;
  const uint16_t kleur = t.storing ? ROOD : vol ? ORANJE : BEIGE;
  ring(270, GRIJS);
  if (t.aan) ring(270.0f * pct / 100.0f, kleur);
  tekst("LUSH BEAUTY", S(120), S(50), u8g2_font_helvR18_tf, BEIGE);
  if (!t.aan) {
    tekst("UIT", S(120), S(116), u8g2_font_logisoso58_tr, MIDDEN);
    tekenTekst("druk om te starten", nullptr, MIDDEN);
  } else {
    tekst(String(pct) + "%", S(120), S(110), u8g2_font_logisoso58_tr, WIT);
    char s[32];
    if (!t.meter) {
      tekenTekst("drukmeter niet gevonden", "kabel naar de print nakijken", ORANJE);
    } else if (t.storing) {
      tekenTekst("geen luchtstroom", "ventilator of slang nakijken", ROOD);
    } else if (vol) {
      tekenTekst("Filter vol", "filters uitkloppen", ORANJE);
    } else if (boost) {
      const uint32_t rest = (t.boostTot - nu) / 1000;
      snprintf(s, sizeof s, "BOOST %lu:%02lu", (unsigned long)(rest / 60), (unsigned long)(rest % 60));
      tekenTekst(s, nullptr, BEIGE);
    } else if (!t.geijkt) {
      tekenTekst("nieuwe filters?", "knop 5 s vasthouden", LICHT);
    } else {
      snprintf(s, sizeof s, "%.0f Pa over de filters", t.dp);
      tekenTekst(s, nullptr, LICHT);
    }
    // filterbalk: hoe vol de filters zijn
    if (t.geijkt && !isnan(t.vol)) {
      const int w = S(110), x0 = S(120) - w / 2, y0 = S(196);
      canvas->drawRoundRect(x0, y0, w, S(8), S(4), GRIJS);
      canvas->fillRoundRect(x0, y0, max(1, (int)(w * constrain(t.vol, 0.0f, 1.0f))), S(8), S(4), vol ? ORANJE : BEIGE);
    }
  }
  canvas->flush();
}

void schakel() {
  t.aan = !t.aan;
  t.boostTot = 0;
  t.storing = false;
  teBewaren = true;
  laatsteWijziging = millis();
}

/** ijken: de ventilator loopt 20 -> 100 %, telkens 6 s stabiliseren en 2 s meten */
void ijk() {
  if (!t.meter) return;
  for (int i = 0; i < IJK_PUNTEN; i++) {
    const int pct = 20 + 20 * i;
    zetPwm(pct);
    float som = 0;
    int n = 0;
    const uint32_t start = millis();
    while (millis() - start < 8000) {
      float pa;
      if (millis() - start > 6000 && sdpLees(pa)) {
        som += pa;
        n++;
      }
      canvas->fillScreen(ZWART);
      ring(270.0f * (i * 8000 + millis() - start) / (IJK_PUNTEN * 8000.0f), BEIGE);
      tekst("IJKEN", S(120), S(104), u8g2_font_helvB24_tf, WIT);
      tekst(String("schone filters, ") + pct + " %", S(120), S(136), u8g2_font_helvR18_tf, WIT);
      canvas->flush();
      delay(50);
    }
    t.schoon[i] = n ? som / n : 0;
  }
  // stijgend en niet nul (een te kleine waarde zou elke meting 'vol' maken)
  for (int i = 0; i < IJK_PUNTEN; i++) t.schoon[i] = max(t.schoon[i], i ? t.schoon[i - 1] : 1.0f);
  t.geijkt = true;
  t.vol = 0;
  bewaarIjking();
  snelheidSinds = millis();
}

} // namespace

void setup() {
  // eerst de ventilator uit houden (de gate-weerstand doet dat al tot hier), dan de PWM
  pinMode(PIN_AAN, OUTPUT);
  digitalWrite(PIN_AAN, LOW);
  ledcSetup(PWM_KANAAL, PWM_FREQ, PWM_BITS);
  ledcAttachPin(PIN_PWM, PWM_KANAAL);
  zetPwm(0);
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

  // I2C voor de drukmeter op de UART0-lijnen van de FPC
  Wire.begin(PIN_SDA, PIN_SCL, 100000);
  t.meter = sdpStart();

  prefs.begin("afzuiging", false);
  t.pct = constrain(prefs.getInt("pct", 50), MIN_PCT, MAX_PCT);
  t.aan = prefs.getBool("aan", false);
  t.geijkt = prefs.getBool("geijkt", false) && prefs.getBytes("schoon", t.schoon, sizeof t.schoon) == sizeof t.schoon;
  encoderVorig = encoderLees();
  snelheidSinds = millis();
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
    ijk();
  }
  if (!knop && knopVorig && !knopGebruikt && nu - knopSinds > 30) {
    if (nu - knopSinds >= BOOST_HOUD_MS) {
      if (!t.aan) schakel();
      t.boostTot = nu + BOOST_MS;
    } else {
      schakel();
    }
  }
  knopVorig = knop;
  if (t.boostTot != 0 && !boostActief(nu)) t.boostTot = 0;

  const int doel = doelPct(nu);
  if (doel != vorigDoel) {
    snelheidSinds = nu; // na een wijziging eerst stabiliseren
    vorigDoel = doel;
  }
  zetPwm(doel);

  // drukverschil over de filters, 4 keer per seconde, laagdoorlaatfilter
  static uint32_t vorigeMeting = 0;
  if (nu - vorigeMeting >= 250) {
    vorigeMeting = nu;
    float pa;
    if (t.meter && sdpLees(pa)) {
      t.dp = isnan(t.dp) ? pa : t.dp + 0.15f * (pa - t.dp);
    } else if (!t.meter) {
      t.meter = sdpStart();
    }
    const bool stabiel = doel >= 30 && nu - snelheidSinds > STABIEL_MS;
    if (t.geijkt && t.meter && stabiel && !isnan(t.dp)) {
      const float ref = schoonBij(doel);
      t.vol = constrain((t.dp / ref - 1.0f) / (VOL_FACTOR - 1.0f), 0.0f, 1.2f);
      t.storing = t.dp < ref * STORING_FACTOR;
    }
    if (!t.aan) t.storing = false;
  }

  static uint32_t vorigLog = 0;
  if (nu - vorigLog >= 1000) {
    vorigLog = nu;
    Serial.printf("aan=%d pct=%d dp=%.1f vol=%.2f storing=%d geijkt=%d\n", t.aan, doel, t.dp, t.vol, t.storing, t.geijkt);
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
