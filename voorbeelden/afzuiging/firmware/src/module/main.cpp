// Afzuiging Lush Beauty, module: een ESP32-C3 SuperMini in de voedingsbox onder het blad stuurt de radiale
// ventilator in de afzuiging (San Ace C175 9TG24P0S01, 24 V, 56 W, PWM 25 kHz: 0 % = stil) en bewaakt het filter
// met een verschildrukmeter (Sensirion SDP810-500Pa, een slangetje naar de ruimte onder het filter). De knop in het
// blad stuurt de opdrachten draadloos (ESP-NOW, zie protocol.h) en toont de status die de module terugstuurt.
//
// Alle beslissingen (aan/uit, toerentalregeling, boosttegoed, ijken, meetgeldigheid, bewaking, koppelen) zitten in
// regel.h en zijn op de pc getest (test/test_regel). Dit bestand doet alleen de hardware: PWM, tacho, I2C, ESP-NOW
// en het NVS. Een nieuwe knop koppelen: de schakelaar van de box 3 keer kort aan en uit (telkens < 5 s), dan staat het
// koppelvenster 60 s open.
//
// Aansluiting (zie ../../schema/Aansluitschema-afzuiging.pdf):
//   GPIO5 SDA, GPIO6 SCL -> SDP810 (adres 0x25, 3,3 V uit de 3V3-pin, pull-ups 4,7 kOhm naar 3,3 V)
//   GPIO3 -> 1 kOhm -> basis Q1 (BC547); collector -> PWM-draad van de ventilator (bruin); emitter -> GND.
//            Basis 10 kOhm naar 3,3 V: bij het opstarten geleidt Q1, de PWM-draad is laag, de ventilator staat stil.
//   GPIO4 <- tacho van de ventilator (geel, open collector), 10 kOhm naar 3,3 V; 2 pulsen per omwenteling.
//   5V-pin uit de regelaar D24V10F5 (L5), GND gemeenschappelijk; de ventilator op 24 V (L+) via de M8-kabel.
// Q1 keert het PWM-signaal om: hoog op GPIO3 trekt de PWM-draad laag. De firmware rekent dat om.

#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_now.h>
#include <esp_wifi.h>

#include "protocol.h"
#include "regel.h"

namespace {

using namespace afzuiging;

constexpr int PIN_SDA = 5, PIN_SCL = 6;
constexpr int PIN_PWM = 3;
constexpr int PIN_TACHO = 4;
constexpr int PULSEN_PER_OMW = 2;
constexpr int PWM_KANAAL = 0;
constexpr int PWM_FREQ = 25000; // Intel-specificatie voor 4-draads ventilatoren
constexpr int PWM_BITS = 8;
constexpr uint8_t SDP_ADRES = 0x25;
constexpr float SDP_SCHAAL = 60.0f; // SDP810-500Pa: 60 per Pa (de meter stuurt de factor ook mee)
// gemeenschappelijke hoofdsleutel van ESP-NOW (PMK); de sleutel per set (LMK) komt van de knop bij het koppelen
const uint8_t PMK[16] = {'L', 'u', 's', 'h', 'B', 'e', 'a', 'u', 't', 'y', '-', 'A', 'F', 'Z', 'v', '2'};
const uint8_t IEDEREEN[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

Preferences prefs;
Regelaar regel;
Koppeling koppeling;

// ontvangen in de callback, verwerkt in loop()
portMUX_TYPE slot = portMUX_INITIALIZER_UNLOCKED;
volatile bool nieuweOpdracht = false, nieuweKoppeling = false;
Opdracht ontvangen;
uint8_t ontvangenVan[6];
Koppel koppelVraag;
uint8_t koppelVan[6];

volatile uint32_t tachoPulsen = 0;
void IRAM_ATTR tachoIsr() { tachoPulsen++; }

void zetPwm(int pct) {
  // het PWM-signaal is omgekeerd door Q1: 0 % op de ventilator (stil) = GPIO altijd hoog
  const int max = (1 << PWM_BITS) - 1;
  ledcWrite(PWM_KANAAL, max - (constrain(pct, 0, 100) * max) / 100);
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

// ---- ESP-NOW ----

void bijOntvangst(const uint8_t *mac, const uint8_t *data, int len) {
  if (len == (int)sizeof(Opdracht)) {
    portENTER_CRITICAL(&slot);
    memcpy(&ontvangen, data, sizeof ontvangen);
    memcpy(ontvangenVan, mac, 6);
    nieuweOpdracht = true;
    portEXIT_CRITICAL(&slot);
  } else if (len == (int)sizeof(Koppel)) {
    Koppel k;
    memcpy(&k, data, sizeof k);
    if (k.magie != MAGIE || k.versie != VERSIE || k.soort != SOORT_KOPPEL) return;
    portENTER_CRITICAL(&slot);
    koppelVraag = k;
    memcpy(koppelVan, mac, 6);
    nieuweKoppeling = true;
    portEXIT_CRITICAL(&slot);
  }
}

void voegKnopToe() {
  esp_now_del_peer(koppeling.mac);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, koppeling.mac, 6);
  peer.channel = KANAAL;
  peer.encrypt = true;
  memcpy(peer.lmk, koppeling.sleutel, 16);
  esp_now_add_peer(&peer);
}

} // namespace

void setup() {
  // eerst de ventilator stil houden (de basisweerstand van Q1 doet dat al tot hier), dan de PWM
  pinMode(PIN_TACHO, INPUT_PULLUP);
  attachInterrupt(PIN_TACHO, tachoIsr, FALLING);
  ledcSetup(PWM_KANAAL, PWM_FREQ, PWM_BITS);
  ledcAttachPin(PIN_PWM, PWM_KANAAL);
  zetPwm(0);
  Serial.begin(115200);

  Wire.begin(PIN_SDA, PIN_SCL, 100000);
  if (sdpStart()) regel.meterHersteld();

  prefs.begin("afzuiging", false);
  float w[5], tp[5];
  if (prefs.getBytes("schoon", w, sizeof w) == sizeof w && prefs.getBytes("toeren", tp, sizeof tp) == sizeof tp)
    regel.laadIjking(w, tp, 5); // alleen geldige, stijgende waarden worden geladen
  uint8_t m[6], k[16];
  if (prefs.getBytes("knopmac", m, 6) == 6 && prefs.getBytes("knopsleutel", k, 16) == 16) koppeling.laad(m, k);
  // bewuste handeling om een nieuwe knop te koppelen: de schakelaar 3 keer kort (< 5 s) aan en uit
  const uint8_t snel = prefs.getUChar("snelstart", 0) + 1;
  prefs.putUChar("snelstart", snel);
  if (herkoppelHandeling(snel)) {
    koppeling.herkoppelen = true;
    prefs.putUChar("snelstart", 0);
    Serial.println("koppelvenster open voor een nieuwe knop (60 s)");
  }

  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(KANAAL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) Serial.println("ESP-NOW start niet");
  esp_now_set_pmk(PMK);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, IEDEREEN, 6); // alleen voor KOPPEL_OK in het koppelvenster
  peer.channel = KANAAL;
  esp_now_add_peer(&peer);
  if (koppeling.gekoppeld) voegKnopToe();
  esp_now_register_recv_cb(bijOntvangst);
}

void loop() {
  const uint32_t nu = millis();

  // koppelen (alleen in de eerste 60 s na het aanzetten van de box)
  if (nieuweKoppeling) {
    portENTER_CRITICAL(&slot);
    const Koppel k = koppelVraag;
    uint8_t van[6];
    memcpy(van, koppelVan, 6);
    nieuweKoppeling = false;
    portEXIT_CRITICAL(&slot);
    if (koppeling.vraag(van, k, nu)) {
      prefs.putBytes("knopmac", koppeling.mac, 6);
      prefs.putBytes("knopsleutel", koppeling.sleutel, 16);
      Koppel ok; // dezelfde uitdaging terug, zonder sleutel; de knop aanvaardt alleen zijn eigen uitdaging
      ok.soort = SOORT_KOPPEL_OK;
      ok.uitdaging = k.uitdaging;
      esp_now_send(IEDEREEN, (const uint8_t *)&ok, sizeof ok);
      voegKnopToe();
      Serial.println("knop gekoppeld");
    }
  }
  // na 5 s draaien is dit geen snelle start meer
  static bool snelGewist = false;
  if (!snelGewist && nu > 5000) {
    prefs.putUChar("snelstart", 0);
    snelGewist = true;
  }

  // opdrachten: alleen van de gekoppelde knop, met een stijgend volgnummer
  if (nieuweOpdracht) {
    portENTER_CRITICAL(&slot);
    const Opdracht o = ontvangen;
    uint8_t van[6];
    memcpy(van, ontvangenVan, 6);
    nieuweOpdracht = false;
    portEXIT_CRITICAL(&slot);
    if (koppeling.aanvaard(van, o)) regel.opdracht(o, nu);
  }

  // drukverschil 4 keer per seconde; een weggevallen meter elke seconde opnieuw starten
  static uint32_t vorigeMeting = 0, vorigeHerstart = 0;
  if (nu - vorigeMeting >= 250) {
    vorigeMeting = nu;
    float pa = NAN;
    const bool ok = sdpLees(pa);
    regel.meting(ok, pa, nu);
    if (!regel.meter && nu - vorigeHerstart >= 1000) {
      vorigeHerstart = nu;
      if (sdpStart()) regel.meterHersteld();
    }
  }

  // toerental elke seconde
  static uint32_t vorigeTacho = 0, pulsenVorig = 0;
  if (nu - vorigeTacho >= 1000) {
    const uint32_t p = tachoPulsen;
    regel.tacho((uint16_t)((p - pulsenVorig) * 60000UL / ((nu - vorigeTacho) * PULSEN_PER_OMW)), nu);
    pulsenVorig = p;
    vorigeTacho = nu;
  }

  zetPwm(regel.stap(nu));

  if (regel.nieuweIjking) {
    prefs.putBytes("schoon", regel.ijking(), 5 * sizeof(float));
    prefs.putBytes("toeren", regel.ijkToeren(), 5 * sizeof(float));
    regel.nieuweIjking = false;
  }

  static uint32_t vorigeStatus = 0;
  if (koppeling.gekoppeld && nu - vorigeStatus >= 250) {
    vorigeStatus = nu;
    Status s;
    regel.vulStatus(s, nu);
    esp_now_send(koppeling.mac, (const uint8_t *)&s, sizeof s);
  }

  static uint32_t vorigLog = 0;
  if (nu - vorigLog >= 1000) {
    vorigLog = nu;
    Serial.printf("aan=%d stand=%d pwm=%d toeren=%u dp=%.1f vers=%d vol=%.2f bewaking=%d storing=%d geijkt=%d ijken=%d fout=%d tegoed=%lu\n",
                  regel.aan, regel.stand, regel.gegeven, regel.toeren, regel.dp, regel.meetVers(nu), regel.vol, regel.bewaking, regel.storing,
                  regel.geijkt, regel.ijkStap, regel.ijkFout, (unsigned long)regel.boostTegoed);
  }
  delay(5);
}
