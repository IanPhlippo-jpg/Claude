// Afzuiging Lush Beauty, module: een ESP32-C3 SuperMini in de voedingsbox onder het blad stuurt de radiale
// ventilator in de afzuiging (San Ace C175 9TG24P0S01, 24 V, 56 W, PWM 25 kHz: bij 0 % staat hij stil volgens de
// datasheet van Sanyo Denki, catalogus C1111B002: "zero fan speed at 0%"; een losse PWM-draad geeft wel VOL toerental,
// daarom schakelt -Q2 de 24 V af als de ventilator uit moet) en bewaakt het filter
// met een verschildrukmeter (Sensirion SDP810-500Pa, een slangetje naar de ruimte onder het filter). De knop in het
// blad stuurt de opdrachten draadloos (ESP-NOW, zie protocol.h) en toont de status die de module terugstuurt.
//
// Alle beslissingen (aan/uit, toerentalregeling, boosttegoed, ijken, meetgeldigheid, bewaking, koppelen, voeding van
// de ventilator) zitten in regel.h en zijn op de pc getest (test/test_regel). Dit bestand doet alleen de hardware: PWM,
// voeding, tacho, I2C, ESP-NOW en het NVS. Een nieuwe knop koppelen: de schakelaar van de box 3 keer kort aan en uit
// (telkens < 5 s), dan staat het koppelvenster 60 s open. Versie 7.2: die handeling wist de eerste ijking niet meer
// (daarvoor is "ander merk filter" op de knop); de sleutel van de set komt uit X25519 (sleutel.h); een task-watchdog
// van 3 s herstart de ESP32-C3 als de lus vastloopt (dan is -Q2 open: de ventilator spanningsloos, en na de herstart UIT).
//
// Aansluiting (zie ../../schema/Aansluitschema-afzuiging.pdf):
//   GPIO5 SDA, GPIO6 SCL -> SDP810 (adres 0x25, 3,3 V uit de 3V3-pin, pull-ups 4,7 kOhm naar 3,3 V)
//   GPIO3 -> 1 kOhm -> basis Q1 (BC547); collector -> PWM-draad van de ventilator (bruin); emitter -> GND.
//            Basis 10 kOhm naar 3,3 V: bij het opstarten geleidt Q1, de PWM-draad is laag, de ventilator staat stil.
//   GPIO7 -> basis -Q3 (BC547), die de hoge-zijde-schakelaar -Q2 (IRF4905) in de 24 V naar de ventilator aanstuurt.
//            Hoog = 24 V aan. Een weerstand trekt de basis van -Q3 laag: bij reset, flashen of zonder 5 V/3,3 V is de
//            ventilator spanningsloos (veilige toestand = stil). GPIO2, 8 en 9 zijn strapping-pinnen: niet gebruikt.
//   GPIO4 <- tacho van de ventilator (geel, open collector), 10 kOhm naar 3,3 V; 2 pulsen per omwenteling (datasheet).
//            7.2: RC-filter -R14 1 kOhm in serie en -C3 10 nF naar GND bij GPIO4; in de software ontdenderd (TACHO_MIN_US)
//            en het toerental uit de periode (regel.h).
//   5V-pin uit de regelaar D24V10F5 (L5), GND gemeenschappelijk; de ventilator op 24 V (via -Q2) via de M8-kabel.
// Q1 keert het PWM-signaal om: hoog op GPIO3 trekt de PWM-draad laag. De firmware rekent dat om.

#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_now.h>
#include <esp_task_wdt.h>
#include <esp_wifi.h>

#include "protocol.h"
#include "regel.h"
#include "sleutel.h"

namespace {

using namespace afzuiging;

constexpr int PIN_SDA = 5, PIN_SCL = 6;
constexpr int PIN_PWM = 3;
constexpr int PIN_VOEDING = 7; // -Q3/-Q2: 24 V naar de ventilator (hoog = aan)
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
bool radioOk = false; // ESP-NOW draait en de knop staat als peer: anders is er geen verbinding (logboek)

// ontvangen in de callback, verwerkt in loop()
portMUX_TYPE slot = portMUX_INITIALIZER_UNLOCKED;
volatile bool nieuweOpdracht = false, nieuweKoppeling = false, nieuwLeven = false;
Opdracht ontvangen;
uint8_t ontvangenVan[6];
Leven leven;
uint8_t levenVan[6];
uint8_t kandidaatLmk[16]; // de sleutel die we met de publieke sleutel van de kandidaat uitrekenden
Koppel koppelBericht;
uint8_t koppelVan[6];

// tacho: alleen flanken minstens TACHO_MIN_US na de vorige (ontdendering), met het tijdstip van de laatste (periodemeting)
volatile uint32_t tachoPulsen = 0, tachoLaatsteUs = 0;
void IRAM_ATTR tachoIsr() {
  const uint32_t t = micros();
  if (!tachoPulsGeldig(tachoLaatsteUs, t)) return;
  tachoLaatsteUs = t;
  tachoPulsen++;
}

void zetPwm(int pct) {
  // het PWM-signaal is omgekeerd door Q1: 0 % op de ventilator (stil) = GPIO altijd hoog
  const int max = (1 << PWM_BITS) - 1;
  ledcWrite(PWM_KANAAL, max - (constrain(pct, 0, 100) * max) / 100);
  digitalWrite(PIN_VOEDING, voedingAan(pct) ? HIGH : LOW); // UIT = ook spanningsloos
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
  } else if (len == (int)sizeof(Leven)) {
    portENTER_CRITICAL(&slot);
    memcpy(&leven, data, sizeof leven);
    memcpy(levenVan, mac, 6);
    nieuwLeven = true;
    portEXIT_CRITICAL(&slot);
  } else if (len == (int)sizeof(Koppel)) {
    Koppel k;
    memcpy(&k, data, sizeof k);
    if (k.magie != MAGIE || k.versie != VERSIE || (k.soort != SOORT_KOPPEL && k.soort != SOORT_KOPPEL_BEVESTIG)) return;
    portENTER_CRITICAL(&slot);
    koppelBericht = k;
    memcpy(koppelVan, mac, 6);
    nieuweKoppeling = true;
    portEXIT_CRITICAL(&slot);
  }
}

/** de gekoppelde knop als versleutelde peer; false = lukt niet (dan is er geen verbinding) */
bool voegKnopToe() {
  esp_now_del_peer(koppeling.mac);
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, koppeling.mac, 6);
  peer.channel = KANAAL;
  peer.encrypt = true;
  memcpy(peer.lmk, koppeling.sleutel, 16);
  radioOk = esp_now_add_peer(&peer) == ESP_OK;
  if (!radioOk) Serial.println("knop niet toegevoegd: geen verbinding");
  return radioOk;
}

/** 7.2: klopt het bewijs in een KOPPEL_BEVESTIG met de sleutel die we voor de kandidaat uitrekenden? */
bool bewijsKlopt(const Koppel &k) {
  uint8_t b[8];
  koppelBewijs(kandidaatLmk, k.uitdaging, b);
  return memcmp(b, k.bewijs, 8) == 0;
}

void koppelen(uint32_t nu) {
  if (koppeling.tik(nu) && koppeling.gekoppeld) voegKnopToe(); // geen bevestiging: de vorige knop terug
  if (!nieuweKoppeling) return;
  portENTER_CRITICAL(&slot);
  const Koppel k = koppelBericht;
  uint8_t van[6];
  memcpy(van, koppelVan, 6);
  nieuweKoppeling = false;
  portEXIT_CRITICAL(&slot);
  if (k.soort == SOORT_KOPPEL) {
    // alleen kandidaat; nog niets bewaren. Is het de al gekoppelde knop (opnieuw koppelen met een nieuwe sleutel), dan
    // even zonder versleutelde peer, zodat zijn onversleutelde bevestiging binnenkomt.
    if (!koppeling.vraag(van, k, nu)) return;
    // 7.2: een eigen sleutelpaar; de sleutel van de set uit ons geheim en de publieke sleutel van de knop
    uint8_t geheim[32], publiek[32];
    const bool sleutelOk = maakSleutelpaar(geheim, publiek) && setSleutel(geheim, k.pub, k.uitdaging, kandidaatLmk);
    memset(geheim, 0, sizeof geheim);
    if (!sleutelOk) {
      Serial.println("sleutel niet uitgerekend: geen antwoord");
      return;
    }
    koppeling.kandidaatSleutel(kandidaatLmk);
    if (koppeling.gekoppeld && memcmp(van, koppeling.mac, 6) == 0) esp_now_del_peer(van);
    Koppel ok; // dezelfde uitdaging, ons eigen MAC-adres en onze publieke sleutel (geen geheim)
    ok.soort = SOORT_KOPPEL_OK;
    ok.uitdaging = k.uitdaging;
    memcpy(ok.pub, publiek, 32);
    memcpy(ok.mac, koppeling.eigen, 6);
    if (esp_now_send(IEDEREEN, (const uint8_t *)&ok, sizeof ok) != ESP_OK) Serial.println("KOPPEL_OK niet verzonden");
  } else if (bewijsKlopt(k) && koppeling.bevestig(van, k, nu, true)) {
    // de knop koos deze module: nu pas toevoegen en bewaren (lukt het toevoegen niet, dan niets bewaren)
    if (voegKnopToe()) {
      prefs.putBytes("knopmac", koppeling.mac, 6);
      prefs.putBytes("knopsleutel", koppeling.sleutel, 16);
      Serial.println("knop gekoppeld");
    } else {
      koppeling.gekoppeld = false;
    }
  }
}

} // namespace

void setup() {
  // eerst de ventilator spanningsloos en stil (de weerstanden van -Q3 en Q1 doen dat al tot hier), dan de PWM
  pinMode(PIN_VOEDING, OUTPUT);
  digitalWrite(PIN_VOEDING, LOW);
  pinMode(PIN_TACHO, INPUT_PULLUP);
  attachInterrupt(PIN_TACHO, tachoIsr, FALLING);
  ledcSetup(PWM_KANAAL, PWM_FREQ, PWM_BITS);
  ledcAttachPin(PIN_PWM, PWM_KANAAL);
  zetPwm(0);
  Serial.begin(115200);

  Wire.begin(PIN_SDA, PIN_SCL, 100000);
  if (sdpStart()) regel.meterHersteld();

  prefs.begin("afzuiging", false);
  // bewuste handeling: de schakelaar 3 keer kort (< 5 s) aan en uit: nieuwe knop koppelen en de eerste ijking wissen
  const uint8_t snel = prefs.getUChar("snelstart", 0) + 1;
  prefs.putUChar("snelstart", snel);
  if (herkoppelHandeling(snel)) {
    koppeling.herkoppelen = true;
    prefs.putUChar("snelstart", 0);
    Serial.println("koppelvenster open voor een nieuwe knop (60 s)");
  }
  regel.filterVol = prefs.getBool("filtervol", false); // 7.2: de melding "filter vervangen" blijft na een herstart
  float w[5], tp[5], e[5];
  if (prefs.getBytes("schoon", w, sizeof w) == sizeof w && prefs.getBytes("toeren", tp, sizeof tp) == sizeof tp)
    if (!regel.laadIjking(w, tp, 5)) Serial.println("bewaarde ijking ongeldig: niet geladen");
  if (prefs.getBytes("eerste", e, sizeof e) == sizeof e && !regel.laadEerste(e, 5)) Serial.println("eerste ijking ongeldig");
  uint8_t m[6], k[16];
  if (prefs.getBytes("knopmac", m, 6) == 6 && prefs.getBytes("knopsleutel", k, 16) == 16) koppeling.laad(m, k);

  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(KANAAL, WIFI_SECOND_CHAN_NONE);
  esp_wifi_get_mac(WIFI_IF_STA, koppeling.eigen);
  // startnummer van deze start (met de radio aan is esp_random echt willekeurig); nooit 0
  regel.startId = esp_random() | 1;
  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW start niet: geen verbinding");
  } else {
    esp_now_set_pmk(PMK);
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, IEDEREEN, 6); // alleen voor KOPPEL_OK in het koppelvenster
    peer.channel = KANAAL;
    if (esp_now_add_peer(&peer) != ESP_OK) Serial.println("broadcast-peer niet toegevoegd: koppelen kan niet");
    if (koppeling.gekoppeld) voegKnopToe();
    esp_now_register_recv_cb(bijOntvangst);
  }
  // 7.2: task-watchdog van 3 s op de lus (paniek = herstart: -Q2 open, daarna UIT)
  esp_task_wdt_init(3, true);
  esp_task_wdt_add(nullptr);
}

void loop() {
  const uint32_t nu = millis();
  esp_task_wdt_reset();

  // koppelen (alleen in de eerste 60 s na het aanzetten van de box, en pas na de bevestiging van de knop)
  koppelen(nu);
  // na 5 s draaien is dit geen snelle start meer
  static bool snelGewist = false;
  if (!snelGewist && nu > 5000) {
    prefs.putUChar("snelstart", 0);
    snelGewist = true;
  }

  // opdrachten: alleen van de gekoppelde knop, met een stijgend volgnummer (AAN alleen met ons startnummer: regel.h)
  if (nieuweOpdracht) {
    portENTER_CRITICAL(&slot);
    const Opdracht o = ontvangen;
    uint8_t van[6];
    memcpy(van, ontvangenVan, 6);
    nieuweOpdracht = false;
    portEXIT_CRITICAL(&slot);
    if (koppeling.aanvaard(van, o)) regel.opdracht(o, nu);
  }
  if (nieuwLeven) { // 7.2: levensteken van de knop
    portENTER_CRITICAL(&slot);
    const Leven l = leven;
    uint8_t van[6];
    memcpy(van, levenVan, 6);
    nieuwLeven = false;
    portEXIT_CRITICAL(&slot);
    if (koppeling.aanvaard(van, l)) regel.knopLeeft(nu);
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

  // toerental elke seconde, uit de periode: de pulsen sinds de vorige keer en de tijd tussen de laatste puls van toen en
  // de laatste puls van nu (7.2)
  static uint32_t vorigeTacho = 0, pulsenVorig = 0, laatsteUsVorig = 0;
  if (nu - vorigeTacho >= 1000) {
    noInterrupts();
    const uint32_t p = tachoPulsen, tl = tachoLaatsteUs;
    interrupts();
    const uint32_t n = p - pulsenVorig;
    regel.tacho(n && laatsteUsVorig ? toerenUitPeriode(n, tl - laatsteUsVorig, PULSEN_PER_OMW) : 0, nu);
    pulsenVorig = p;
    laatsteUsVorig = tl;
    vorigeTacho = nu;
  }

  zetPwm(regel.stap(nu)); // PWM en 24 V samen

  if (regel.nieuweIjking) {
    prefs.putBytes("schoon", regel.ijking(), 5 * sizeof(float));
    prefs.putBytes("toeren", regel.ijkToeren(), 5 * sizeof(float));
    regel.nieuweIjking = false;
  }
  if (regel.nieuweEerste) {
    prefs.putBytes("eerste", regel.eersteIjking(), 5 * sizeof(float));
    regel.nieuweEerste = false;
  }
  if (regel.eersteGewist) { // 7.2: "ander merk filter" op de knop
    prefs.remove("eerste");
    regel.eersteGewist = false;
  }
  if (regel.nieuweVolMelding) {
    prefs.putBool("filtervol", regel.filterVol);
    regel.nieuweVolMelding = false;
  }

  static uint32_t vorigeStatus = 0, statusFouten = 0;
  if (koppeling.gekoppeld && radioOk && nu - vorigeStatus >= 250) {
    vorigeStatus = nu;
    Status s;
    regel.vulStatus(s, nu);
    if (esp_now_send(koppeling.mac, (const uint8_t *)&s, sizeof s) != ESP_OK) statusFouten++; // de knop ziet dan geen verse status
  }

  static uint32_t vorigLog = 0;
  if (nu - vorigLog >= 1000) {
    vorigLog = nu;
    Serial.printf("aan=%d stand=%d pwm=%d toeren=%u dp=%.1f vers=%d vol=%.2f filtervol=%d bewaking=%d storing=%d uit=%d geijkt=%d ijken=%d fout=%d tegoed=%lu radio=%d zendfouten=%lu\n",
                  regel.aan, regel.stand, regel.gegeven, regel.toeren, regel.dp, regel.meetVers(nu), regel.vol, regel.filterVol, regel.bewaking, regel.storing,
                  regel.uitReden, regel.geijkt, regel.ijkStap, regel.ijkFout, (unsigned long)regel.boostTegoed, radioOk, (unsigned long)statusFouten);
  }
  delay(5);
}
