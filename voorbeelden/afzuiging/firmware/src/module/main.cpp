// Afzuiging Lush Beauty, module: een ESP32-C3 SuperMini in het elektronicavak stuurt de ventilator (Delta
// PFR1212UHE-SP00, 12 V, 32 W, 300 Pa, PWM) en bewaakt de filters met een verschildrukmeter (Sensirion SDP810-500Pa)
// over het filterpakket. De knop in het blad stuurt de opdrachten draadloos (ESP-NOW, zie protocol.h) en toont de
// status die de module terugstuurt.
//
// Filterbewaking: bij het ijken (op schone filters, gevraagd vanaf de knop) loopt de ventilator 20 -> 100 % en onthoudt
// de module het drukverschil bij elke snelheid. Is het drukverschil bij dezelfde snelheid verdubbeld, dan zijn de
// filters vol; valt het weg terwijl de ventilator hoort te draaien, dan is er een storing (ventilator of slang).
//
// Aansluiting (zie ../../schema/Aansluitschema-afzuiging.pdf):
//   GPIO5 SDA, GPIO6 SCL -> SDP810 (adres 0x25, 3,3 V uit de 3V3-pin, pull-ups 4,7 kOhm naar 3,3 V)
//   GPIO3 -> 1 kOhm -> basis Q1 (BC547); collector -> PWM-draad van de ventilator; emitter -> GND
//   GPIO4 -> 1 kOhm -> basis Q2 (BC547) die de gate van Q3 (IRF4905, P-MOSFET) laag trekt: +12 V naar de ventilator.
//            Gate 10 kOhm naar +12 V: zonder signaal (opstarten) staat de ventilator uit.
//   5V-pin uit de regelaar D24V10F5 (L5), GND gemeenschappelijk.
// Q1 keert het PWM-signaal om: hoog op GPIO3 trekt de PWM-draad laag. De firmware rekent dat om.

#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_now.h>
#include <esp_wifi.h>

#include "protocol.h"

namespace {

using namespace afzuiging;

constexpr int PIN_SDA = 5, PIN_SCL = 6;
constexpr int PIN_PWM = 3;
constexpr int PIN_AAN = 4; // voeding van de ventilator aan/uit (via Q2/Q3)
constexpr int PWM_KANAAL = 0;
constexpr int PWM_FREQ = 25000; // Intel-specificatie voor 4-draads ventilatoren
constexpr int PWM_BITS = 8;

constexpr uint8_t SDP_ADRES = 0x25;
constexpr float SDP_SCHAAL = 60.0f;     // SDP810-500Pa: 60 per Pa (de meter stuurt de factor ook mee)
constexpr int IJK_PUNTEN = 5;           // 20, 40, 60, 80, 100 %
constexpr uint32_t IJK_STAP_MS = 8000;  // per punt: 6 s stabiliseren, 2 s meten
constexpr float VOL_FACTOR = 2.0f;      // drukverschil verdubbeld = filter vol
constexpr float STORING_FACTOR = 0.25f; // minder dan een kwart van schoon = ventilator of slang stuk
constexpr uint32_t STABIEL_MS = 6000;   // na een snelheidswijziging eerst 6 s wachten

Preferences prefs;
const uint8_t IEDEREEN[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

// de laatste opdracht van de knop (geschreven in de ontvangst-callback)
volatile bool nieuweOpdracht = false;
Opdracht ontvangen;
portMUX_TYPE slot = portMUX_INITIALIZER_UNLOCKED;

Opdracht opdracht; // in gebruik
Status status;
float dp = NAN;
float schoon[IJK_PUNTEN] = {0};
uint32_t snelheidSinds = 0;
int vorigDoel = -1;

// ijken (zonder te blokkeren)
int ijkStap = 0; // 0 = niet aan het ijken
uint32_t ijkStart = 0;
float ijkSom = 0;
int ijkN = 0;

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
  return schoon[i] + (schoon[i + 1] - schoon[i]) * (p - i);
}

// ---- ESP-NOW ----

void bijOntvangst(const uint8_t *, const uint8_t *data, int len) {
  if (len != (int)sizeof(Opdracht)) return;
  Opdracht o;
  memcpy(&o, data, sizeof o);
  if (o.magie != MAGIE || o.soort != SOORT_OPDRACHT) return;
  portENTER_CRITICAL(&slot);
  ontvangen = o;
  nieuweOpdracht = true;
  portEXIT_CRITICAL(&slot);
}

void stuurStatus() {
  status.dp = dp;
  status.ijken = ijkStap;
  status.ijkVoortgang = ijkStap ? (uint8_t)min<uint32_t>(100, ((ijkStap - 1) * IJK_STAP_MS + millis() - ijkStart) * 100 / (IJK_PUNTEN * IJK_STAP_MS)) : 0;
  esp_now_send(IEDEREEN, (const uint8_t *)&status, sizeof status);
}

void startIjken() {
  if (!status.meter) return;
  ijkStap = 1;
  ijkStart = millis();
  ijkSom = 0;
  ijkN = 0;
}

/** één stap van het ijken: per punt 6 s stabiliseren en 2 s meten, daarna het volgende punt */
void ijkVerder(uint32_t nu, bool gemeten, float pa) {
  const int pct = 20 + 20 * (ijkStap - 1);
  zetPwm(pct);
  if (gemeten && nu - ijkStart > 6000) {
    ijkSom += pa;
    ijkN++;
  }
  if (nu - ijkStart < IJK_STAP_MS) return;
  schoon[ijkStap - 1] = ijkN ? ijkSom / ijkN : 0;
  ijkSom = 0;
  ijkN = 0;
  ijkStart = nu;
  if (++ijkStap <= IJK_PUNTEN) return;
  // klaar: stijgend en niet nul (een te kleine waarde zou elke meting 'vol' maken)
  for (int i = 0; i < IJK_PUNTEN; i++) schoon[i] = max(schoon[i], i ? schoon[i - 1] : 1.0f);
  prefs.putBytes("schoon", schoon, sizeof schoon);
  prefs.putBool("geijkt", true);
  status.geijkt = 1;
  status.vol = 0;
  ijkStap = 0;
  snelheidSinds = nu;
  vorigDoel = -1;
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

  Wire.begin(PIN_SDA, PIN_SCL, 100000);
  status.meter = sdpStart();
  status.dp = NAN;
  status.vol = NAN;

  prefs.begin("afzuiging", false);
  status.geijkt = prefs.getBool("geijkt", false) && prefs.getBytes("schoon", schoon, sizeof schoon) == sizeof schoon;
  opdracht.aan = 0; // tot de knop iets zegt

  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(KANAAL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) Serial.println("ESP-NOW start niet");
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, IEDEREEN, 6);
  peer.channel = KANAAL;
  peer.encrypt = false;
  esp_now_add_peer(&peer);
  esp_now_register_recv_cb(bijOntvangst);
  snelheidSinds = millis();
}

void loop() {
  const uint32_t nu = millis();

  if (nieuweOpdracht) {
    portENTER_CRITICAL(&slot);
    const Opdracht o = ontvangen;
    nieuweOpdracht = false;
    portEXIT_CRITICAL(&slot);
    // een nieuwe ijkvraag binnen dezelfde sessie van de knop: ijken (een herstart van de knop telt niet)
    if (o.sessie == opdracht.sessie && o.ijk != opdracht.ijk) startIjken();
    opdracht = o;
  }

  // drukverschil over de filters, 4 keer per seconde, laagdoorlaatfilter
  static uint32_t vorigeMeting = 0;
  bool gemeten = false;
  float pa = 0;
  if (nu - vorigeMeting >= 250) {
    vorigeMeting = nu;
    if (status.meter && sdpLees(pa)) {
      gemeten = true;
      dp = isnan(dp) ? pa : dp + 0.15f * (pa - dp);
    } else if (!status.meter) {
      status.meter = sdpStart();
    }
  }

  if (ijkStap) {
    ijkVerder(nu, gemeten, pa);
  } else {
    const int doel = opdracht.aan ? constrain((int)opdracht.pct, 20, 100) : 0;
    if (doel != vorigDoel) {
      snelheidSinds = nu; // na een wijziging eerst stabiliseren
      vorigDoel = doel;
    }
    zetPwm(doel);
    const bool stabiel = doel >= 30 && nu - snelheidSinds > STABIEL_MS;
    if (gemeten && status.geijkt && status.meter && stabiel && !isnan(dp)) {
      const float ref = schoonBij(doel);
      status.vol = constrain((dp / ref - 1.0f) / (VOL_FACTOR - 1.0f), 0.0f, 1.2f);
      status.storing = dp < ref * STORING_FACTOR;
    }
    if (!opdracht.aan) status.storing = 0;
  }

  static uint32_t vorigeStatus = 0;
  if (nu - vorigeStatus >= 250) {
    vorigeStatus = nu;
    stuurStatus();
  }

  static uint32_t vorigLog = 0;
  if (nu - vorigLog >= 1000) {
    vorigLog = nu;
    Serial.printf("aan=%d pct=%d dp=%.1f vol=%.2f storing=%d geijkt=%d ijken=%d\n", opdracht.aan, opdracht.pct, dp, status.vol, status.storing, status.geijkt, ijkStap);
  }
  delay(5);
}
