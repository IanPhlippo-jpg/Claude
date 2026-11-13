// Lichtsturing modelbaan ("Treinbaan"), ESP32-S3-DevKitC-1 N16R8.
// Al het denkwerk zit in include/ (baan.h en verder, getest op de pc). Dit bestand doet alleen de hardware, de wifi,
// de webserver en het bewaren.
//
// Vaste aansluitingen:
//   GPIO8  SDA, GPIO9  SCL (I2C, 400 kHz)
//   GPIO10 OE van de PCA9685 (actief laag; een externe pull-up van 1 kΩ houdt alles UIT tijdens reset en flashen)
//   PCA9685 op 0x40: kanaal 0..15 = groep 1..16 (IN1..IN8 van MOSFET-module 1 en 2, standaard actief laag: hw.h);
//   met TREIN_GROEPEN > 16 een tweede op 0x41 (groep 17..32)
//   ingang 1..16 = GPIO 1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41 (OUT1..OUT8 van de 2 optocouplerprints;
//   INPUT_PULLUP, de optocoupler trekt de pin naar GND = actief). Vrij: GPIO 11, 39, 42, 47, 48. Zie src/hw.h.
//   Alles via de schroefklemadapter van de ESP (versie 4: kant-en-klare modules, geen gaatjesprints).
//   GPIO38 RGB-led op het bord = statuslampje: groen = hotspot actief, rood = PCA9685 antwoordt niet (gaat voor),
//          blauw = BOOT-knop wordt vastgehouden / knippert: het wifi-wachtwoord is teruggezet
//   GPIO0  BOOT-knop op het bord: 5 s vasthouden = wifi-wachtwoord terug naar "treinbaan" (en thuisnet uit)
//
// Veilig opstarten: OE hoog (alles uit) -> PCA9685 instellen met alle kanalen 0 -> OE laag -> instellingen laden ->
// pas dan de laatste stand terug (of alles uit, naar keuze). Antwoordt de PCA9685 niet meer, dan gaat OE hoog.
//
// Twee taken, allebei bewaakt door de watchdog (8 s zonder teken van leven = de ESP start opnieuw):
//   licht  (prioriteit 5) elke 5 ms: ingangen lezen en de Baan laten rekenen; elke 10 ms de uitgangen naar de
//          PCA9685. Zo blijven effecten vloeiend, ook als de webserver bezig is.
//   loop() de hotspot (en het thuisnet), DNS (captive portal), de webserver, de updates, de BOOT-knop en het
//          bewaren in LittleFS. Is de hotspot weg, dan start loop() hem opnieuw (HotspotWacht, onderhoud.h).
// De Baan wordt door beide gebruikt: altijd met het slot (Slot s;).
#include <Arduino.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <Update.h>
#include <WebServer.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_task_wdt.h>

#include "api.h"
#include "dashboard.h"
#include "hw.h"
#include "onderhoud.h"

using namespace trein;

namespace {

constexpr int PIN_SDA = 8, PIN_SCL = 9, PIN_OE = 10, PIN_BOOT = 0; // de ingangen: INGANG_PINNEN in hw.h
constexpr uint32_t I2C_HZ = 400000;
constexpr uint8_t ADRES_PCA = 0x40, ADRES_PCA2 = 0x41; // de tweede alleen bij meer dan 16 groepen
constexpr int N_PCA = (N_GROEPEN + 15) / 16;
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
constexpr uint32_t WATCHDOG_S = 8;              // zo lang mag een taak hangen voor de ESP opnieuw start

Baan baan;
WebServer web(80);
DNSServer dns;
Pca9685 pca[N_PCA];
SemaphoreHandle_t slot;

volatile bool pcaOk = false;
bool hotspotOk = false;
bool fsOk = false;
std::string meldingLaden;
uint32_t hotspotOpnieuwOm = 0, herstartOm = 0, blauwTot = 0;
LangeDruk bootKnop;
HotspotWacht hotspotWacht;
UpdateControle updateControle;
const char *updateFout = nullptr;

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

// --------------------------------------------------------------------------------------------- de PWM-chips
/** alle PCA9685's instellen (alle kanalen uit); true = allemaal in orde */
bool pcaBegin() {
  bool ok = true;
  for (int i = 0; i < N_PCA; i++) ok = pca[i].begin(Wire, i == 0 ? ADRES_PCA : ADRES_PCA2) && ok;
  return ok;
}
bool pcaControleer() {
  bool ok = true;
  for (int i = 0; i < N_PCA; i++) ok = pca[i].controleer() && ok;
  return ok;
}
/** de uitgangen van alle groepen wegschrijven: per chip 16 kanalen (niet gebruikte kanalen 0) */
bool pcaZet(const uint16_t *uit) {
  bool ok = true;
  for (int i = 0; i < N_PCA; i++) {
    uint16_t blok[16] = {0};
    for (int k = 0; k < 16 && i * 16 + k < N_GROEPEN; k++) blok[k] = uit[i * 16 + k];
    ok = pca[i].zet(blok) && ok;
  }
  return ok;
}

// --------------------------------------------------------------------------------------------- lichttaak
void lichtTaak(void *) {
  esp_task_wdt_add(nullptr); // deze taak wordt bewaakt
  TickType_t wakker = xTaskGetTickCount();
  uint32_t controle = millis(), geschreven = millis();
  uint16_t uit[N_GROEPEN];
  for (;;) {
    vTaskDelayUntil(&wakker, pdMS_TO_TICKS(TICK_MS));
    esp_task_wdt_reset();
    uint32_t nu = millis();
    uint16_t ingangen = ingangenLees(); // bit i = ingang i+1 actief (de optocoupler trekt de pin laag)
    {
      Slot s;
      baan.tick(nu, ingangen);
      memcpy(uit, baan.lampen.uitgang, sizeof uit);
    }
    if (nu - geschreven >= UITGANG_MS) {
      geschreven = nu;
      if (pcaOk && !pcaZet(uit)) pcaOk = false;
    }
    // de PCA9685 nakijken (en na een spanningsdip opnieuw instellen)
    if (nu - controle >= CONTROLE_MS) {
      controle = nu;
      if (!pcaOk || !pcaControleer()) {
        digitalWrite(PIN_OE, HIGH); // veilig: alles uit zolang de chips niet goed staan
        pcaOk = pcaBegin() && pcaZet(uit);
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
  if (!pcaOk)
    erbij(N_PCA > 1 ? "De uitgangen (PCA9685, adres 0x40 of 0x41) antwoorden niet: alle lampen blijven uit. Kijk de draden na."
                    : "De uitgangen (PCA9685, adres 0x40) antwoorden niet: alle lampen blijven uit. Kijk de draden na.");
  bool verbonden = WiFi.status() == WL_CONNECTED;
  std::string ip = verbonden ? std::string(WiFi.localIP().toString().c_str()) : std::string();
  Slot s;
  if (baan.melding != m) baan.melding = m;
  baan.thuisVerbonden = verbonden;
  baan.thuisIp = ip;
}

/** statuslampje (RGB-led op GPIO38): blauw = BOOT-knop vast (of knippert: wachtwoord teruggezet), rood = PCA9685
 *  antwoordt niet, groen = hotspot actief, anders uit. Zwak (1/8 van vol), alleen schrijven als de kleur verandert. */
void statusLed(uint32_t nu) {
  static int vorige = -1;
  int kleur;
  if (blauwTot && !voorbij(nu, blauwTot)) kleur = (nu / 200) % 2 ? 3 : 0; // knipperen
  else if (bootKnop.vast(nu) > 1000) kleur = 3;                          // de knop wordt vastgehouden
  else kleur = !pcaOk ? 1 : hotspotOk ? 2 : 0;
  if (kleur == vorige) return;
  vorige = kleur;
  neopixelWrite(PIN_STATUS_LED, kleur == 1 ? 32 : 0, kleur == 2 ? 32 : 0, kleur == 3 ? 40 : 0);
}

// ------------------------------------------------------------------------------------------------- wifi
/** de eigen hotspot, en als er een thuisnet ingesteld is ook daar aanmelden (AP + STA) */
void startWifi() {
  char ww[64], ssid[33], thuisWw[64];
  {
    Slot s;
    strcpy(ww, baan.cfg.inst.wachtwoord);
    strcpy(ssid, baan.cfg.inst.thuisSsid);
    strcpy(thuisWw, baan.cfg.inst.thuisWachtwoord);
  }
  WiFi.disconnect(false, true);
  WiFi.setHostname(MDNS_NAAM);
  WiFi.mode(ssid[0] ? WIFI_AP_STA : WIFI_AP);
  WiFi.softAPConfig(IP_DOOS, IP_DOOS, MASKER);
  hotspotOk = WiFi.softAP(HOTSPOT_NAAM, ww, 6, 0, 6);
  Serial.printf("Hotspot \"%s\" op %s\n", HOTSPOT_NAAM, WiFi.softAPIP().toString().c_str());
  if (ssid[0]) {
    WiFi.setAutoReconnect(true);
    WiFi.begin(ssid, thuisWw[0] ? thuisWw : nullptr);
    Serial.printf("Aanmelden op het thuisnet \"%s\"\n", ssid);
  }
}

bool hotspotGoed() { return (WiFi.getMode() & WIFI_MODE_AP) && WiFi.softAPIP() == IP_DOOS; }

/** de BOOT-knop 5 s vastgehouden: wifi-wachtwoord terug naar de standaard en het thuisnet uit */
void wachtwoordTerug(uint32_t nu) {
  {
    Slot s;
    strcpy(baan.cfg.inst.wachtwoord, STD_WACHTWOORD);
    baan.cfg.inst.thuisSsid[0] = 0;
    baan.cfg.inst.thuisWachtwoord[0] = 0;
    baan.instellingenGewijzigd(nu);
  }
  Serial.println("BOOT-knop: wifi-wachtwoord teruggezet naar \"treinbaan\", thuisnet uit.");
  blauwTot = nu + 3000;
  hotspotOpnieuwOm = nu + 3000;
}

// --------------------------------------------------------------------------------------------- webserver
void stuur(const Antwoord &a) {
  web.sendHeader("Cache-Control", "no-store");
  web.send(a.code, "application/json", a.json.c_str());
  if (a.hotspotOpnieuw || a.thuisnetOpnieuw) hotspotOpnieuwOm = millis() + 1000; // eerst het antwoord laten vertrekken
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

/** een kleine eigen pagina om bij te werken, ook als het dashboard zelf stuk zou zijn */
const char UPDATE_PAGINA[] PROGMEM =
    "<!doctype html><html lang=nl><meta charset=utf-8><meta name=viewport content='width=device-width'>"
    "<title>Treinbaan bijwerken</title><body style='font-family:sans-serif;max-width:30em;margin:2em auto;padding:0 1em'>"
    "<h1>Firmware bijwerken</h1><p>Kies het bestand <b>firmware.bin</b> (.pio/build/doos/firmware.bin). De doos start "
    "daarna opnieuw; alle instellingen blijven.</p><form method=post action=/api/update enctype=multipart/form-data>"
    "<input type=file name=firmware accept=.bin required> <button>Bijwerken</button></form>"
    "<p><a href=/>terug naar het dashboard</a></p></body></html>";

/** de nieuwe firmware komt in stukken binnen (multipart); elk stuk meteen nakijken en wegschrijven */
void updateStuk() {
  HTTPUpload &u = web.upload();
  esp_task_wdt_reset(); // een grote upload duurt langer dan de watchdog
  if (u.status == UPLOAD_FILE_START) {
    updateFout = updateControle.begin(0, ESP.getFreeSketchSpace()); // multipart: de grootte is vooraf niet bekend
    if (!updateFout && !Update.begin(UPDATE_SIZE_UNKNOWN)) updateFout = "De doos kon de update niet beginnen.";
    if (!updateFout) Serial.printf("Update: %s\n", u.filename.c_str());
  } else if (u.status == UPLOAD_FILE_WRITE) {
    if (updateFout) return;
    updateFout = updateControle.stuk(u.buf, u.currentSize);
    if (!updateFout && Update.write(u.buf, u.currentSize) != u.currentSize) updateFout = "Schrijven in het geheugen mislukte.";
    if (updateFout) Update.abort();
  } else if (u.status == UPLOAD_FILE_END) {
    if (!updateFout) updateFout = updateControle.einde();
    if (!updateFout && !Update.end(true)) updateFout = "De nieuwe firmware is niet in orde (de controle mislukte).";
  } else if (u.status == UPLOAD_FILE_ABORTED) {
    Update.abort();
    updateFout = "De upload is afgebroken.";
  }
}

void updateKlaar() {
  if (updateFout) {
    stuur(fout(updateFout));
    Serial.printf("Update mislukt: %s\n", updateFout);
    updateFout = nullptr;
    return;
  }
  Antwoord a = goed();
  a.json = "{\"ok\":true,\"herstart\":true}";
  stuur(a);
  Serial.printf("Update gelukt (%u bytes): herstarten.\n", (unsigned)updateControle.ontvangen());
  herstartOm = millis() + 1500;
}

/** captive portal: elke onbekende vraag (ook de controle van Android, iPhone en Windows) gaat naar het dashboard */
void nietGevonden() {
  web.sendHeader("Location", String("http://") + IP_DOOS.toString() + "/");
  web.send(302, "text/plain", "");
}

void startWeb() {
  web.on("/", HTTP_GET, dashboard);
  web.on("/index.html", HTTP_GET, dashboard);
  web.on("/update", HTTP_GET, []() { web.send_P(200, "text/html; charset=utf-8", UPDATE_PAGINA); });
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
  post("/api/test", apiTest);
  web.on("/api/update", HTTP_POST, updateKlaar, updateStuk);
  web.onNotFound(nietGevonden);
  web.begin();
}

// ------------------------------------------------------------------------------------------------ bewaren
uint32_t cfgGezien = 0, cfgBewaard = 0, cfgOm = 0;
uint32_t standGezien = 0, standBewaard = 0, standOm = 0, standEersteOm = 0;

void bewaarIndienNodig(uint32_t nu, bool nu_meteen = false) {
  uint32_t cfgRev, standRev;
  {
    Slot s;
    cfgRev = baan.cfgRev;
    standRev = baan.standRev;
  }
  if (cfgRev != cfgGezien) { cfgGezien = cfgRev; cfgOm = nu; }
  if (cfgGezien != cfgBewaard && (nu_meteen || nu - cfgOm >= BEWAAR_INST_MS)) {
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
  if (standGezien != standBewaard &&
      (nu_meteen || nu - standOm >= BEWAAR_STAND_RUST_MS || nu - standEersteOm >= BEWAAR_STAND_MAX_MS)) {
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
  pinMode(PIN_BOOT, INPUT_PULLUP);
  Serial.begin(115200);
  Serial.printf("\nTreinbaan lichtsturing %s (%d groepen)\n", FW_VERSIE, N_GROEPEN);
  slot = xSemaphoreCreateMutex();

  // 2. I2C en de PCA9685('s): eerst alle kanalen 0, dan pas OE laag
  Wire.begin(PIN_SDA, PIN_SCL, I2C_HZ);
  pcaOk = pcaBegin();
  if (pcaOk) digitalWrite(PIN_OE, LOW);
  else Serial.println("PCA9685 antwoordt niet: uitgangen blijven uit.");

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

  // 5. de watchdog (na het laden: LittleFS formatteren kan de eerste keer enkele seconden duren), dan de lichttaak
  esp_task_wdt_init(WATCHDOG_S, true);
  esp_task_wdt_add(nullptr); // de looptaak (setup en loop draaien erin)
  xTaskCreatePinnedToCore(lichtTaak, "licht", 6144, nullptr, 5, nullptr, 1);

  // 6. wifi, captive portal, mDNS en het dashboard
  startWifi();
  dns.setErrorReplyCode(DNSReplyCode::NoError);
  dns.start(53, "*", IP_DOOS);
  if (MDNS.begin(MDNS_NAAM)) MDNS.addService("http", "tcp", 80);
  startWeb();
  Serial.println("Klaar: verbind met wifi \"Treinbaan\" en open http://192.168.4.1");
}

void loop() {
  esp_task_wdt_reset();
  dns.processNextRequest();
  web.handleClient();
  uint32_t nu = millis();
  static uint32_t meldingOm = 0, ledOm = 0;
  if (nu - meldingOm >= 1000) {
    meldingOm = nu;
    meldingBijwerken();
  }
  if (nu - ledOm >= 50) {
    ledOm = nu;
    statusLed(nu);
  }
  if (bootKnop.stap(digitalRead(PIN_BOOT) == LOW, nu)) wachtwoordTerug(nu);
  bewaarIndienNodig(nu);
  if (hotspotOpnieuwOm && voorbij(nu, hotspotOpnieuwOm)) {
    hotspotOpnieuwOm = 0;
    startWifi(); // nieuw wachtwoord of ander thuisnet: de gsm moet opnieuw verbinden
  } else if (hotspotWacht.kijk(hotspotGoed(), nu)) {
    Serial.printf("De hotspot was weg: opnieuw starten (%u keer).\n", (unsigned)hotspotWacht.herstarts);
    startWifi();
  }
  if (herstartOm && voorbij(nu, herstartOm)) {
    bewaarIndienNodig(nu, true); // eerst alles bewaren
    digitalWrite(PIN_OE, HIGH);
    ESP.restart();
  }
  delay(2);
}
