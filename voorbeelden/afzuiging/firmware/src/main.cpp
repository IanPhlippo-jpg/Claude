// Afzuiging Lush Beauty: de M5Stack Dial (ESP32-S3, rond scherm, draaiknop) stuurt de ventilator
// (Noctua NF-F12 industrialPPC-3000 PWM, 12 V, 4 draden) van de ingebouwde nagelstofafzuiging.
//
// Bediening
//   draaien          snelheid in stappen van 5 % (20 tot 100 %)
//   drukken          aan / uit
//   lang drukken     boost: 2 minuten 100 %, daarna terug naar de ingestelde snelheid
//   scherm tikken    aan / uit
// Het scherm toont de snelheid (ring en %), het gemeten toerental en waarschuwt als de ventilator niet draait.
// De laatste snelheid blijft bewaard na het uitschakelen van de stroom.
//
// Aansluiting (zie ../aansluitschema.svg): Port B van de Dial
//   G2 (geel)  -> 1 kΩ -> basis BC547; collector -> PWM-draad van de ventilator (blauw); emitter -> GND
//   G1 (wit)   <- 1 kΩ <- tachodraad van de ventilator (groen); interne pull-up naar 3,3 V
//   GND (zwart) gemeenschappelijk; de 5V-draad (rood) blijft los.
// De transistor keert het signaal om: hoog op G2 trekt de PWM-draad laag. De firmware rekent dat om.

#include <M5Dial.h>
#include <Preferences.h>

namespace {

constexpr int PIN_PWM = 2;   // Port B, geel
constexpr int PIN_TACHO = 1; // Port B, wit
constexpr int PWM_KANAAL = 0;
constexpr int PWM_FREQ = 25000; // Intel-specificatie voor 4-draads ventilatoren
constexpr int PWM_BITS = 8;

constexpr int MIN_PCT = 20, MAX_PCT = 100, STAP_PCT = 5;
constexpr int ENCODER_PER_STAP = 4;           // de encoder telt 4 per klik
constexpr uint32_t BOOST_MS = 2 * 60 * 1000;  // boost: 2 minuten volle kracht
constexpr uint32_t BEWAAR_NA_MS = 3000;       // instelling bewaren 3 s na de laatste wijziging
constexpr uint32_t STORING_NA_MS = 4000;      // geen toerental na 4 s draaien: storing

// huisstijl Lush Beauty
constexpr uint32_t BEIGE = 0xDCCBB3;
constexpr uint32_t BRUIN = 0x5E4040;
constexpr uint32_t ROOD = 0xE0533F;
constexpr uint32_t GRIJS = 0x55585E;

Preferences prefs;
M5Canvas canvas(&M5Dial.Display);

volatile uint32_t tachoPulsen = 0;
void IRAM_ATTR opTacho() { tachoPulsen = tachoPulsen + 1; }

struct Toestand {
  bool aan = false;
  int pct = 50;
  uint32_t boostTot = 0; // millis(); 0 = geen boost
  uint32_t rpm = 0;
  bool storing = false;
} t;

long encoderVorig = 0;
uint32_t laatsteWijziging = 0;
bool teBewaren = false;
uint32_t draaitSinds = 0;

bool boostActief(uint32_t nu) { return t.boostTot != 0 && (int32_t)(t.boostTot - nu) > 0; }

/** gevraagde snelheid van de ventilator (0 = stil) */
int doelPct(uint32_t nu) {
  if (!t.aan) return 0;
  return boostActief(nu) ? MAX_PCT : t.pct;
}

void zetPwm(int pct) {
  // omgekeerd door de transistor: 0 % op de ventilator = GPIO altijd hoog
  const int max = (1 << PWM_BITS) - 1;
  ledcWrite(PWM_KANAAL, max - (pct * max) / 100);
}

void piep(int hz, int ms) { M5Dial.Speaker.tone(hz, ms); }

void teken(uint32_t nu) {
  canvas.fillScreen(TFT_BLACK);
  const int cx = 120, cy = 120;
  const bool boost = t.aan && boostActief(nu);
  const int pct = doelPct(nu);
  // ring: 270° van linksonder naar rechtsonder; grijs = bereik, beige = huidige snelheid
  canvas.fillArc(cx, cy, 116, 104, 135, 405, GRIJS);
  if (t.aan) {
    const float eind = 135 + 270.0f * pct / 100.0f;
    canvas.fillArc(cx, cy, 116, 104, 135, eind, t.storing ? ROOD : BEIGE);
  }
  canvas.setTextDatum(middle_center);
  canvas.setTextColor(BEIGE);
  canvas.setFont(&fonts::FreeSans9pt7b);
  canvas.drawString("LUSH BEAUTY", cx, 52);
  if (!t.aan) {
    canvas.setTextColor(0xA0A0A0);
    canvas.setFont(&fonts::FreeSansBold24pt7b);
    canvas.drawString("UIT", cx, cy);
    canvas.setFont(&fonts::FreeSans9pt7b);
    canvas.drawString("druk om te starten", cx, 172);
  } else {
    canvas.setTextColor(TFT_WHITE);
    canvas.setFont(&fonts::FreeSansBold24pt7b);
    canvas.drawString(String(pct) + "%", cx, cy - 4);
    canvas.setFont(&fonts::FreeSans9pt7b);
    canvas.setTextColor(t.storing ? ROOD : 0xC8C8C8);
    if (t.storing) {
      canvas.drawString("ventilator draait niet", cx, 160);
      canvas.drawString("kabel en filter nakijken", cx, 180);
    } else if (boost) {
      const uint32_t rest = (t.boostTot - nu) / 1000;
      char s[24];
      snprintf(s, sizeof s, "BOOST %lu:%02lu", (unsigned long)(rest / 60), (unsigned long)(rest % 60));
      canvas.setTextColor(BEIGE);
      canvas.drawString(s, cx, 160);
      canvas.setTextColor(0xC8C8C8);
      canvas.drawString(String(t.rpm) + " rpm", cx, 182);
    } else {
      canvas.drawString(String(t.rpm) + " rpm", cx, 164);
    }
  }
  canvas.pushSprite(0, 0);
}

void schakel() {
  t.aan = !t.aan;
  t.boostTot = 0;
  t.storing = false;
  draaitSinds = millis();
  piep(t.aan ? 2400 : 1600, 40);
  teBewaren = true;
  laatsteWijziging = millis();
}

} // namespace

void setup() {
  // eerst de PWM, zodat de ventilator zo kort mogelijk op volle kracht draait (zonder signaal draait hij voluit)
  ledcSetup(PWM_KANAAL, PWM_FREQ, PWM_BITS);
  ledcAttachPin(PIN_PWM, PWM_KANAAL);
  zetPwm(0);

  auto cfg = M5.config();
  M5Dial.begin(cfg, true, false); // encoder aan, RFID uit
  M5Dial.Display.setBrightness(160);
  canvas.setColorDepth(16);
  canvas.createSprite(240, 240);

  pinMode(PIN_TACHO, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_TACHO), opTacho, FALLING);

  prefs.begin("afzuiging", false);
  t.pct = constrain(prefs.getInt("pct", 50), MIN_PCT, MAX_PCT);
  t.aan = prefs.getBool("aan", false);
  draaitSinds = millis();
  encoderVorig = M5Dial.Encoder.read();
  Serial.begin(115200);
}

void loop() {
  M5Dial.update();
  const uint32_t nu = millis();

  // draaiknop: snelheid; draaien terwijl de ventilator uit staat zet hem aan
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
  if (tik.wasClicked()) schakel();

  // toerental: 2 pulsen per omwenteling, elke seconde
  static uint32_t vorigeMeting = 0;
  if (nu - vorigeMeting >= 1000) {
    noInterrupts();
    const uint32_t p = tachoPulsen;
    tachoPulsen = 0;
    interrupts();
    t.rpm = p * 60 / 2 * 1000 / (nu - vorigeMeting);
    vorigeMeting = nu;
    // storing: hij hoort te draaien maar meet geen toerental
    const bool moetDraaien = doelPct(nu) >= MIN_PCT && nu - draaitSinds > STORING_NA_MS;
    const bool storing = moetDraaien && t.rpm == 0;
    if (storing && !t.storing) piep(880, 300);
    t.storing = storing;
    Serial.printf("aan=%d pct=%d boost=%d rpm=%lu storing=%d\n", t.aan, doelPct(nu), boostActief(nu), (unsigned long)t.rpm, t.storing);
  }
  if (t.boostTot != 0 && !boostActief(nu)) t.boostTot = 0;

  zetPwm(doelPct(nu));

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
