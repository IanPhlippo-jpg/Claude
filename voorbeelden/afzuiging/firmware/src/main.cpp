// Afzuiging Lush Beauty: de M5Stack Dial (ESP32-S3, rond scherm, draaiknop) stuurt de ventilator
// (Delta PFR1212UHE-SP00, 12 V, 32 W, 300 Pa, PWM) van de ingebouwde nagelstofafzuiging en bewaakt de filters met een
// verschildrukmeter (Sensirion SDP810-500Pa) over het filterpakket.
//
// Bediening
//   draaien                 zuigkracht in stappen van 5 % (20 tot 100 %); draaien als hij uit staat zet hem aan
//   drukken                 aan / uit
//   lang drukken (knop)     boost: 2 minuten 100 %
//   scherm kort tikken      aan / uit
//   scherm 2 s vasthouden   ijken op schone filters (na het vervangen): de ventilator loopt 20 -> 100 % en de
//                           Dial onthoudt het drukverschil van schone filters bij elke snelheid
// Het scherm toont de zuigkracht (ring en %), het drukverschil over de filters en hoe vol de filters zijn. Is het
// drukverschil bij dezelfde snelheid verdubbeld, dan meldt het scherm "Filter vol" (oranje ring, piep elke 10 min).
// Valt het drukverschil weg terwijl de ventilator hoort te draaien, dan meldt het een storing (rode ring).
//
// Aansluiting (zie ../aansluitschema.svg):
//   Port A (I2C)  SDA/SCL -> SDP810 (adres 0x25, 3,3 V uit een eigen regelaar, pull-ups 4,7 kΩ naar 3,3 V)
//   Port B G2     -> 1 kΩ -> basis Q1 (BC547); collector -> PWM-draad van de ventilator; emitter -> GND
//   Port B G1     -> 1 kΩ -> basis Q2 (BC547) die de gate van Q3 (IRF4905, P-MOSFET) laag trekt: +12 V naar de
//                    ventilator aan. Gate 10 kΩ naar +12 V: zonder signaal (opstarten) staat de ventilator uit.
//   GND gemeenschappelijk; de 5V-draad van Port B blijft los, die van Port A voedt de 3,3V-regelaar.
// Q1 keert het PWM-signaal om: hoog op G2 trekt de PWM-draad laag. De firmware rekent dat om.

#include <M5Dial.h>
#include <Preferences.h>
#include <Wire.h>

namespace {

constexpr int PIN_PWM = 2; // Port B
constexpr int PIN_AAN = 1; // Port B: voeding van de ventilator aan/uit (via Q2/Q3)
constexpr int PWM_KANAAL = 0;
constexpr int PWM_FREQ = 25000; // Intel-specificatie voor 4-draads ventilatoren
constexpr int PWM_BITS = 8;

constexpr int MIN_PCT = 20, MAX_PCT = 100, STAP_PCT = 5;
constexpr int ENCODER_PER_STAP = 4;          // de encoder telt 4 per klik
constexpr uint32_t BOOST_MS = 2 * 60 * 1000; // boost: 2 minuten volle kracht
constexpr uint32_t BEWAAR_NA_MS = 3000;      // instelling bewaren 3 s na de laatste wijziging

// filterbewaking
constexpr uint8_t SDP_ADRES = 0x25;
constexpr float SDP_SCHAAL = 60.0f;      // SDP810-500Pa: 60 per Pa (de meter stuurt de factor ook mee)
constexpr int IJK_PUNTEN = 5;            // 20, 40, 60, 80, 100 %
constexpr float VOL_FACTOR = 2.0f;       // drukverschil verdubbeld = filter vol
constexpr float STORING_FACTOR = 0.25f;  // minder dan een kwart van schoon = ventilator of slang stuk
constexpr uint32_t STABIEL_MS = 6000;    // na een snelheidswijziging eerst 6 s wachten
constexpr uint32_t PIEP_VOL_MS = 10 * 60 * 1000;

// huisstijl Lush Beauty
constexpr uint32_t BEIGE = 0xDCCBB3;
constexpr uint32_t ROOD = 0xE0533F;
constexpr uint32_t ORANJE = 0xE89A3C;
constexpr uint32_t GRIJS = 0x55585E;

Preferences prefs;
M5Canvas canvas(&M5Dial.Display);

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
uint32_t laatsteWijziging = 0, snelheidSinds = 0, vorigePiep = 0;
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

void piep(int hz, int ms) { M5Dial.Speaker.tone(hz, ms); }

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

// ---- scherm ----

void tekenTekst(const char *a, const char *b, uint32_t kleur) {
  canvas.setFont(&fonts::FreeSans9pt7b);
  canvas.setTextColor(kleur);
  canvas.drawString(a, 120, 158);
  if (b) canvas.drawString(b, 120, 178);
}

void teken(uint32_t nu) {
  canvas.fillScreen(TFT_BLACK);
  const int cx = 120, cy = 120;
  const bool boost = t.aan && boostActief(nu);
  const int pct = doelPct(nu);
  const bool vol = t.aan && !isnan(t.vol) && t.vol >= 1.0f;
  const uint32_t ring = t.storing ? ROOD : vol ? ORANJE : BEIGE;
  canvas.fillArc(cx, cy, 116, 104, 135, 405, GRIJS);
  if (t.aan) canvas.fillArc(cx, cy, 116, 104, 135, 135 + 270.0f * pct / 100.0f, ring);
  canvas.setTextDatum(middle_center);
  canvas.setTextColor(BEIGE);
  canvas.setFont(&fonts::FreeSans9pt7b);
  canvas.drawString("LUSH BEAUTY", cx, 50);
  if (!t.aan) {
    canvas.setTextColor(0xA0A0A0);
    canvas.setFont(&fonts::FreeSansBold24pt7b);
    canvas.drawString("UIT", cx, cy - 4);
    tekenTekst("druk om te starten", nullptr, 0xA0A0A0);
  } else {
    canvas.setTextColor(TFT_WHITE);
    canvas.setFont(&fonts::FreeSansBold24pt7b);
    canvas.drawString(String(pct) + "%", cx, cy - 10);
    char s[32];
    if (!t.meter) {
      tekenTekst("drukmeter niet gevonden", "kabel Port A nakijken", ORANJE);
    } else if (t.storing) {
      tekenTekst("geen luchtstroom", "ventilator of slang nakijken", ROOD);
    } else if (vol) {
      tekenTekst("Filter vol", "filters uitkloppen", ORANJE);
    } else if (boost) {
      const uint32_t rest = (t.boostTot - nu) / 1000;
      snprintf(s, sizeof s, "BOOST %lu:%02lu", (unsigned long)(rest / 60), (unsigned long)(rest % 60));
      tekenTekst(s, nullptr, BEIGE);
    } else if (!t.geijkt) {
      tekenTekst("nieuwe filters?", "scherm 2 s vasthouden", 0xC8C8C8);
    } else {
      snprintf(s, sizeof s, "%.0f Pa over de filters", t.dp);
      tekenTekst(s, nullptr, 0xC8C8C8);
    }
    // filterbalk: hoe vol de filters zijn
    if (t.geijkt && !isnan(t.vol)) {
      const int w = 110, x0 = cx - w / 2, y0 = 196;
      canvas.drawRoundRect(x0, y0, w, 8, 4, GRIJS);
      canvas.fillRoundRect(x0, y0, (int)(w * constrain(t.vol, 0.0f, 1.0f)), 8, 4, vol ? ORANJE : BEIGE);
    }
  }
  canvas.pushSprite(0, 0);
}

void schakel() {
  t.aan = !t.aan;
  t.boostTot = 0;
  t.storing = false;
  piep(t.aan ? 2400 : 1600, 40);
  teBewaren = true;
  laatsteWijziging = millis();
}

/** ijken: de ventilator loopt 20 -> 100 %, telkens 6 s stabiliseren en 2 s meten */
void ijk() {
  if (!t.meter) {
    piep(880, 300);
    return;
  }
  piep(2000, 60);
  for (int i = 0; i < IJK_PUNTEN; i++) {
    const int pct = 20 + 20 * i;
    zetPwm(pct);
    float som = 0;
    int n = 0;
    const uint32_t start = millis();
    while (millis() - start < 8000) {
      M5Dial.update();
      float pa;
      if (millis() - start > 6000 && sdpLees(pa)) {
        som += pa;
        n++;
      }
      canvas.fillScreen(TFT_BLACK);
      canvas.fillArc(120, 120, 116, 104, 135, 135 + 270.0f * (i * 8000 + millis() - start) / (IJK_PUNTEN * 8000.0f), BEIGE);
      canvas.setTextDatum(middle_center);
      canvas.setTextColor(TFT_WHITE);
      canvas.setFont(&fonts::FreeSansBold12pt7b);
      canvas.drawString("IJKEN", 120, 104);
      canvas.setFont(&fonts::FreeSans9pt7b);
      canvas.drawString(String("schone filters, ") + pct + " %", 120, 136);
      canvas.pushSprite(0, 0);
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
  piep(2600, 80);
}

} // namespace

void setup() {
  // eerst de ventilator uit houden (de gate-weerstand doet dat al tot hier), dan de PWM
  pinMode(PIN_AAN, OUTPUT);
  digitalWrite(PIN_AAN, LOW);
  ledcSetup(PWM_KANAAL, PWM_FREQ, PWM_BITS);
  ledcAttachPin(PIN_PWM, PWM_KANAAL);
  zetPwm(0);

  auto cfg = M5.config();
  M5Dial.begin(cfg, true, false); // encoder aan, RFID uit
  M5Dial.Display.setBrightness(160);
  canvas.setColorDepth(16);
  canvas.createSprite(240, 240);

  // Port A als I2C voor de drukmeter
  Wire.begin(M5.getPin(m5::pin_name_t::port_a_sda), M5.getPin(m5::pin_name_t::port_a_scl), 100000);
  t.meter = sdpStart();

  prefs.begin("afzuiging", false);
  t.pct = constrain(prefs.getInt("pct", 50), MIN_PCT, MAX_PCT);
  t.aan = prefs.getBool("aan", false);
  t.geijkt = prefs.getBool("geijkt", false) && prefs.getBytes("schoon", t.schoon, sizeof t.schoon) == sizeof t.schoon;
  encoderVorig = M5Dial.Encoder.read();
  snelheidSinds = millis();
  Serial.begin(115200);
}

void loop() {
  M5Dial.update();
  const uint32_t nu = millis();

  // draaiknop: zuigkracht
  const long enc = M5Dial.Encoder.read();
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
        piep(3000, 8);
      }
      teBewaren = true;
      laatsteWijziging = nu;
    }
  }

  // knop en scherm
  if (M5Dial.BtnA.wasHold()) {
    if (!t.aan) schakel();
    t.boostTot = nu + BOOST_MS;
    piep(3200, 60);
  } else if (M5Dial.BtnA.wasClicked()) {
    schakel();
  }
  const auto tik = M5Dial.Touch.getDetail();
  static uint32_t tikSinds = 0;
  static bool tikGebruikt = false;
  if (tik.isPressed()) {
    if (!tikSinds) tikSinds = nu ? nu : 1;
    if (!tikGebruikt && nu - tikSinds > 2000) {
      tikGebruikt = true; // één keer per aanraking
      ijk();
    }
  } else {
    if (tikSinds && !tikGebruikt && nu - tikSinds < 600) schakel();
    tikSinds = 0;
    tikGebruikt = false;
  }
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
      if (t.vol >= 1.0f && nu - vorigePiep > PIEP_VOL_MS) {
        piep(1200, 200);
        vorigePiep = nu;
      }
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
