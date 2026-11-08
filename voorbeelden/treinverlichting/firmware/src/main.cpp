// Lichtsturing modelbaan ("Treinbaan"), ESP32-S3-DevKitC-1 N16R8.
// Al het denkwerk zit in include/ (baan.h en verder, getest op de pc). Dit bestand doet alleen de hardware, de wifi,
// de webserver en het bewaren.
//
// Vaste aansluitingen:
//   GPIO8  SDA, GPIO9  SCL (I2C, 400 kHz)
//   GPIO10 OE van de PCA9685 (actief laag; een externe pull-up houdt alles UIT tijdens reset en flashen)
//   PCA9685 op 0x40: kanaal 0..15 = groep 1..16
//   ingang 1..16 = GPIO 1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41 (INPUT_PULLUP; de optocoupler trekt
//   de pin naar GND = actief). GPIO11 is vrij. Zie src/hw.h voor de pinnen die bewust niet gebruikt worden.
//   GPIO38 RGB-led op het bord = statuslampje: groen = hotspot actief, rood = PCA9685 antwoordt niet (gaat voor)
//
// Veilig opstarten: OE hoog (alles uit) -> PCA9685 instellen met alle kanalen 0 -> OE laag -> instellingen laden ->
// pas dan de laatste stand terug (of alles uit, naar keuze). Antwoordt de PCA9685 niet meer, dan gaat OE hoog.
//
// Twee taken:
//   licht  (prioriteit 5) elke 5 ms: ingangen lezen en de Baan laten rekenen; elke 10 ms de 16 uitgangen naar de
//          PCA9685. Zo blijven effecten vloeiend, ook als de webserver bezig is.
//   loop() de hotspot, DNS (captive portal), de webserver en het bewaren in LittleFS.
// De Baan wordt door beide gebruikt: altijd met het slot (Slot s;).
#include <Arduino.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <WebServer.h>
#include <WiFi.h>
#include <Wire.h>

#include "api.h"
#include "dashboard.h"
#include "hw.h"

using namespace trein;

namespace {

constexpr int PIN_SDA = 8, PIN_SCL = 9, PIN_OE = 10; // de ingangen: INGANG_PINNEN in hw.h
constexpr uint32_t I2C_HZ = 400000;
constexpr uint8_t ADRES_PCA = 0x40;
const IPAddress IP_DOOS(192, 168, 4, 1), MASKER(255, 255, 255, 0);
constexpr const char *MDNS_NAAM = "treinbaan"; // http://treinbaan.local
constexpr const char *BESTAND_INST = "/instellingen.json";
constexpr const char *BESTAND_STAND = "/stand.json";
constexpr const char *BESTAND_KAPOT = "/instellingen.kapot.json";
constexpr uint32_t TICK_MS = 5;                 // ingangen lezen en rekenen
constexpr uint32_t UITGANG_MS = 10;             // uitgangen schrijven
constexpr uint32_t CONTROLE_MS = 2000;          // chips nakijken
constexpr uint32_t BEWAAR_INST_MS = 1000;       // instellingen: 1 s na de laatste wijziging
constexpr uint32_t BEWAAR_STAND_RUST_MS = 3000; // stand: 3 s na de laatste wijziging ...
constexpr uint32_t BEWAAR_STAND_MAX_MS = 30000; // ... maar ten laatste na 30 s (een functie die blijft lopen)

Baan baan;
WebServer web(80);
DNSServer dns;
Pca9685 pca;
SemaphoreHandle_t slot;

volatile bool pcaOk = false;
bool hotspotOk = false;
bool fsOk = false;
std::string meldingLaden;
uint32_t hotspotOpnieuwOm = 0;

struct Slot {
  Slot() { xSemaphoreTake(slot, portMAX_DELAY); }
  ~Slot() { xSemaphoreGive(slot); }
};

// ------------------------------------------------------------------------------------------- bestanden
bool leesBestand(const char *pad, std::string &uit) {
  if (!fsOk) return false;
  String tmp = String(pad) + ".tmp";
  if (!LittleFS.exists(pad) && LittleFS.exists(tmp)) LittleFS.rename(tmp, pad); // onderbroken bij het hernoemen
  File f = LittleFS.open(pad, "r");
  if (!f) return false;
  size_t n = f.size();
  if (n > MAX_BESTAND + 1) n = MAX_BESTAND + 1; // te groot: het nakijken meldt het
  uit.resize(n);
  size_t gelezen = n ? f.read((uint8_t *)&uit[0], n) : 0;
  uit.resize(gelezen);
  f.close();
  return true;
}

/** eerst naar een tijdelijk bestand, dan hernoemen: een stroomonderbreking laat nooit een half bestand achter */
bool schrijfBestand(const char *pad, const std::string &inhoud) {
  if (!fsOk) return false;
  String tmp = String(pad) + ".tmp";
  File f = LittleFS.open(tmp, "w");
  if (!f) return false;
  size_t n = f.write((const uint8_t *)inhoud.data(), inhoud.size());
  f.close();
  if (n != inhoud.size()) {
    LittleFS.remove(tmp);
    return false;
  }
  if (!LittleFS.rename(tmp, pad)) {
    LittleFS.remove(pad);
    if (!LittleFS.rename(tmp, pad)) return false;
  }
  return true;
}

void laadInstellingen() {
  std::string t;
  if (!leesBestand(BESTAND_INST, t)) {
    standaard(baan.cfg); // eerste keer (of geen geheugen): standaard, en meteen bewaren
    schrijfBestand(BESTAND_INST, configNaarJson(baan.cfg));
    Serial.println("Geen instellingen gevonden: standaardinstellingen.");
    return;
  }
  Laad r = configVanJson(t.data(), t.size(), baan.cfg, meldingLaden);
  if (r == Laad::ONGELDIG) schrijfBestand(BESTAND_KAPOT, t); // niets weggooien
  if (r != Laad::OK) {
    schrijfBestand(BESTAND_INST, configNaarJson(baan.cfg));
    Serial.printf("Instellingen: %s\n", meldingLaden.c_str());
  }
}

void laadStand(uint32_t nu) {
  std::string t;
  Stand s;
  if (leesBestand(BESTAND_STAND, t) && standVanJson(t.data(), t.size(), s)) baan.herstelStand(s, nu);
}

// --------------------------------------------------------------------------------------------- lichttaak
void lichtTaak(void *) {
  TickType_t wakker = xTaskGetTickCount();
  uint32_t controle = millis(), geschreven = millis();
  uint16_t uit[N_GROEPEN];
  for (;;) {
    vTaskDelayUntil(&wakker, pdMS_TO_TICKS(TICK_MS));
    uint32_t nu = millis();
    uint16_t ingangen = ingangenLees(); // bit i = ingang i+1 actief (de optocoupler trekt de pin laag)
    {
      Slot s;
      baan.tick(nu, ingangen);
      memcpy(uit, baan.lampen.uitgang, sizeof uit);
    }
    if (nu - geschreven >= UITGANG_MS) {
      geschreven = nu;
      if (pcaOk && !pca.zet(uit)) pcaOk = false;
    }
    // de PCA9685 nakijken (en na een spanningsdip opnieuw instellen)
    if (nu - controle >= CONTROLE_MS) {
      controle = nu;
      if (!pcaOk || !pca.controleer()) {
        digitalWrite(PIN_OE, HIGH); // veilig: alles uit zolang de chip niet goed staat
        pcaOk = pca.begin(Wire, ADRES_PCA) && pca.zet(uit);
        if (pcaOk) digitalWrite(PIN_OE, LOW);
      }
    }
  }
}

// -------------------------------------------------------------------------------------------- meldingen
void meldingBijwerken() {
  std::string m = meldingLaden;
  auto erbij = [&m](const char *t) {
    if (!m.empty()) m += " ";
    m += t;
  };
  if (!fsOk) erbij("Het geheugen van de doos werkt niet: wijzigingen worden niet bewaard.");
  if (!pcaOk) erbij("De uitgangen (PCA9685, adres 0x40) antwoorden niet: alle lampen blijven uit. Kijk de draden na.");
  Slot s;
  if (baan.melding != m) baan.melding = m;
}

/** statuslampje (RGB-led op GPIO38): rood = PCA9685 antwoordt niet, groen = hotspot actief, anders uit.
 *  Zwak (1/8 van vol), alleen schrijven als de kleur verandert. */
void statusLed() {
  static int vorige = -1;
  int kleur = !pcaOk ? 1 : hotspotOk ? 2 : 0;
  if (kleur == vorige) return;
  vorige = kleur;
  neopixelWrite(PIN_STATUS_LED, kleur == 1 ? 32 : 0, kleur == 2 ? 32 : 0, 0);
}

// ------------------------------------------------------------------------------------------------- wifi
void startHotspot() {
  char ww[64];
  {
    Slot s;
    strcpy(ww, baan.cfg.inst.wachtwoord);
  }
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(IP_DOOS, IP_DOOS, MASKER);
  hotspotOk = WiFi.softAP(HOTSPOT_NAAM, ww, 6, 0, 6);
  Serial.printf("Hotspot \"%s\" op %s\n", HOTSPOT_NAAM, WiFi.softAPIP().toString().c_str());
}

// --------------------------------------------------------------------------------------------- webserver
void stuur(const Antwoord &a) {
  web.sendHeader("Cache-Control", "no-store");
  web.send(a.code, "application/json", a.json.c_str());
  if (a.hotspotOpnieuw) hotspotOpnieuwOm = millis() + 1000; // eerst het antwoord laten vertrekken
}

using Eindpunt = Antwoord (*)(Baan &, const char *, size_t, uint32_t);

void post(const char *pad, Eindpunt f) {
  web.on(pad, HTTP_POST, [f]() {
    const String &body = web.arg("plain");
    Antwoord a;
    {
      Slot s;
      a = f(baan, body.c_str(), body.length(), millis());
    }
    stuur(a);
  });
}

void dashboard() {
  web.sendHeader("Content-Encoding", "gzip");
  web.sendHeader("Cache-Control", "no-cache");
  web.send_P(200, "text/html; charset=utf-8", (const char *)DASHBOARD_GZ, DASHBOARD_GZ_LEN);
}

/** captive portal: elke onbekende vraag (ook de controle van Android, iPhone en Windows) gaat naar het dashboard */
void nietGevonden() {
  web.sendHeader("Location", String("http://") + IP_DOOS.toString() + "/");
  web.send(302, "text/plain", "");
}

void startWeb() {
  web.on("/", HTTP_GET, dashboard);
  web.on("/index.html", HTTP_GET, dashboard);
  web.on("/api/staat", HTTP_GET, []() {
    bool kort = web.hasArg("kort");
    std::string t;
    {
      Slot s;
      t = apiStaat(baan, millis(), kort);
    }
    web.sendHeader("Cache-Control", "no-store");
    web.send(200, "application/json", t.c_str());
  });
  post("/api/groep", apiGroep);
  post("/api/scene", apiScene);
  post("/api/functie", apiFunctie);
  post("/api/ingang", apiIngang);
  post("/api/instellingen", apiInstellingen);
  post("/api/dagnacht", apiDagnacht);
  web.onNotFound(nietGevonden);
  web.begin();
}

// ------------------------------------------------------------------------------------------------ bewaren
uint32_t cfgGezien = 0, cfgBewaard = 0, cfgOm = 0;
uint32_t standGezien = 0, standBewaard = 0, standOm = 0, standEersteOm = 0;

void bewaarIndienNodig(uint32_t nu) {
  uint32_t cfgRev, standRev;
  {
    Slot s;
    cfgRev = baan.cfgRev;
    standRev = baan.standRev;
  }
  if (cfgRev != cfgGezien) { cfgGezien = cfgRev; cfgOm = nu; }
  if (cfgGezien != cfgBewaard && nu - cfgOm >= BEWAAR_INST_MS) {
    std::string t;
    {
      Slot s;
      t = configNaarJson(baan.cfg);
    }
    if (schrijfBestand(BESTAND_INST, t)) Serial.println("Instellingen bewaard.");
    cfgBewaard = cfgGezien;
  }
  if (standRev != standGezien) {
    if (standGezien == standBewaard) standEersteOm = nu;
    standGezien = standRev;
    standOm = nu;
  }
  if (standGezien != standBewaard && (nu - standOm >= BEWAAR_STAND_RUST_MS || nu - standEersteOm >= BEWAAR_STAND_MAX_MS)) {
    std::string t;
    {
      Slot s;
      t = standNaarJson(baan.bewaarStand(nu));
    }
    schrijfBestand(BESTAND_STAND, t);
    standBewaard = standGezien;
  }
}

} // namespace

void setup() {
  // 1. alle uitgangen uit: OE hoog (de externe pull-up deed dat al tijdens de reset)
  pinMode(PIN_OE, OUTPUT);
  digitalWrite(PIN_OE, HIGH);
  Serial.begin(115200);
  Serial.printf("\nTreinbaan lichtsturing %s\n", FW_VERSIE);
  slot = xSemaphoreCreateMutex();

  // 2. I2C en de PCA9685: eerst alle kanalen 0, dan pas OE laag
  Wire.begin(PIN_SDA, PIN_SCL, I2C_HZ);
  pcaOk = pca.begin(Wire, ADRES_PCA);
  if (pcaOk) digitalWrite(PIN_OE, LOW);
  else Serial.println("PCA9685 (0x40) antwoordt niet: uitgangen blijven uit.");

  // 3. de ingangen (16 GPIO's met interne pull-up)
  ingangenBegin();

  // 4. instellingen laden, dan de laatste stand (of alles uit)
  fsOk = LittleFS.begin(true);
  if (!fsOk) Serial.println("LittleFS werkt niet.");
  laadInstellingen();
  uint32_t nu = millis();
  baan.toepassen(nu);
  if (baan.cfg.inst.opstartLaatste) laadStand(nu);
  cfgGezien = cfgBewaard = baan.cfgRev;
  standGezien = standBewaard = baan.standRev;
  meldingBijwerken();

  // 5. de lichttaak: vanaf nu rekent de Baan en worden de uitgangen geschreven
  xTaskCreatePinnedToCore(lichtTaak, "licht", 6144, nullptr, 5, nullptr, 1);

  // 6. wifi, captive portal, mDNS en het dashboard
  startHotspot();
  dns.setErrorReplyCode(DNSReplyCode::NoError);
  dns.start(53, "*", IP_DOOS);
  if (MDNS.begin(MDNS_NAAM)) MDNS.addService("http", "tcp", 80);
  startWeb();
  Serial.println("Klaar: verbind met wifi \"Treinbaan\" en open http://192.168.4.1");
}

void loop() {
  dns.processNextRequest();
  web.handleClient();
  uint32_t nu = millis();
  static uint32_t meldingOm = 0;
  if (nu - meldingOm >= 1000) {
    meldingOm = nu;
    meldingBijwerken();
    statusLed();
  }
  bewaarIndienNodig(nu);
  if (hotspotOpnieuwOm && voorbij(nu, hotspotOpnieuwOm)) {
    hotspotOpnieuwOm = 0;
    startHotspot(); // nieuw wachtwoord: de gsm moet opnieuw verbinden
  }
  delay(2);
}
