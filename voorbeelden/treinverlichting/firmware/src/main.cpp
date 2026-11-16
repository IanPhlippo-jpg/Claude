// Lichtsturing modelbaan ("Treinbaan"), ESP32-S3-DevKitC-1 N16R8.
// Al het denkwerk zit in include/ (baan.h en verder, getest op de pc). Dit bestand doet alleen de hardware, de wifi,
// de webserver en het bewaren.
//
// Vaste aansluitingen:
//   GPIO8  SDA, GPIO9  SCL (I2C, 100 kHz sinds 2.1.0: ± 1 m dupont over de naad, Fable 5.2 E6)
//   GPIO10 OE van beide PCA9685's (licht 0x40 en servo's 0x42; actief laag). De externe pull-up van 1 kΩ houdt de
//          uitgangen UIT tijdens een warme reset en het flashen. Na een KOUDE start niet: de PCA9685 begint dan niet
//          omgekeerd, zodat actief-lage modules aan staan tot pcaBegin() (± 1 s) of blijvend als de ESP niet start
//          (E5; meten op TRN-22, zie hw.h).
//   PCA9685 op 0x40: kanaal 0..15 = groep 1..16, alleen volledig aan of uit (IN1..IN8 van MOSFET-module 1 en 2,
//   standaard actief laag: hw.h);
//   met TREIN_GROEPEN > 16 een tweede op 0x41 (groep 17..32)
//   ingang 1..16 = GPIO 1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41 (OUT1..OUT8 van de 2 optocouplerprints;
//   INPUT_PULLUP, de optocoupler trekt de pin naar GND; elk met een interrupt op elke flank voor korte pulsen van
//   hallsensoren; actief of rust volgens de printsoort, E3). Zie src/hw.h.
//   Alles via de schroefklemadapter van de ESP (versie 4: kant-en-klare modules, geen gaatjesprints).
//   GPIO38 RGB-led op het bord = statuslampje: groen = hotspot actief, rood = PCA9685 antwoordt niet (gaat voor),
//          blauw = BOOT-knop wordt vastgehouden / knippert: het wifi-wachtwoord is teruggezet
//   GPIO0  BOOT-knop op het bord: 5 s vasthouden = wifi-wachtwoord terug naar "treinbaan" (en thuisnet uit)
// Firmware 2.0.0 erbij:
//   GPIO47 IR zenden (RMT TX, draaggolf) naar de snelle MOSFET-module in de retour van de IR-leds
//   GPIO48 leerontvanger TSMP58000 (ontvanger 1), GPIO11, 39, 42 IR-/FTR-ontvangers op de baan (ontvanger 2, 3, 4;
//          sinds 2.1.0 ook als niveau gelezen: lang laag = aanwezigheid, E2)
//   I2C 0x20 MCP23017: GPA = IR-led 1..8 aan/uit, GPB0..6 = ingang 17..23 (reflexsensoren, E2), GPB7 uitgang (E7)
//   I2C 0x21 MCP23017 (optioneel, bij het opstarten gezocht): ingang 25..38
//   I2C 0x42 PCA9685 op 50 Hz: servo 1..16 (eigen voeding 5-6 V; OE aan GPIO10 samen met de lichtchip, F9: bij een
//          fout op de lichtchip krijgen ook de servo's geen puls)
//   0x41 blijft vrij voor een tweede licht-PCA9685 (groep 17..32)
//
// Veilig opstarten: OE hoog (alles uit) -> PCA9685 instellen met alle kanalen 0 -> OE laag -> instellingen laden ->
// pas dan de laatste stand terug (of alles uit, naar keuze). Antwoordt de PCA9685 niet meer, dan gaat OE hoog.
//
// Twee taken, allebei bewaakt door de watchdog (8 s zonder teken van leven = de ESP start opnieuw):
//   licht  (prioriteit 5) elke 5 ms: de flankvlaggen ophalen, de ingangen lezen en de Baan laten rekenen; elke 10 ms
//          de uitgangen (aan/uit) naar de PCA9685 (alleen als er iets veranderde). Zo blijven knipperen en de andere
//          effecten op tijd, ook als de webserver bezig is.
//          Ook de ingangen 17..40 (MCP23017), de servo's (elke 20 ms naar de PCA9685 op 0x42) en het IR-zenden
//          (IR-leds kiezen via de MCP23017, dan de RMT) gebeuren hier: alles op de I2C-bus in één taak.
//   loop() de hotspot (en het thuisnet), DNS (captive portal), de webserver, de updates, de BOOT-knop en het
//          bewaren in LittleFS. Is de hotspot weg, dan start loop() hem opnieuw (HotspotWacht, onderhoud.h).
//   ir     (prioriteit 4) haalt de frames van de 4 IR-ontvangers op en geeft ze aan de Baan (leren, meldingen)
//   kastjes (prioriteit 1) stuurt de HTTP-opdrachten naar de geluidskastjes (POST http://<ip>/speel ...)
// De Baan wordt door alle taken gebruikt: altijd met het slot (Slot s;). Het opbouwen van de JSON (staat, instellingen)
// gebeurt op een kopie, buiten het slot (F15): de lichttaak wacht dan geen tientallen ms.
// Toegang (F6): elke POST/PUT alleen van de eigen hotspot of met het wifi-wachtwoord in de kop X-Treinbaan-Wachtwoord,
// en nooit met een Origin van een andere pagina (toegang() in api.h). Uitzondering: de aanmelding van een geluidskastje.
#include <Arduino.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Update.h>
#include <WebServer.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_task_wdt.h>

#include "api.h"
#include "dashboard.h"
#include "hw.h"
#include "irhw.h"
#include "onderhoud.h"
#include "tv.h"

using namespace trein;

namespace {

constexpr int PIN_SDA = 8, PIN_SCL = 9, PIN_OE = 10, PIN_BOOT = 0; // de ingangen: INGANG_PINNEN in hw.h
constexpr uint32_t I2C_HZ = 100000;                     // E6
constexpr uint16_t I2C_TIMEOUT_MS = 10;                 // F11: een hangende bus houdt de lichttaak niet 50 ms vast
constexpr uint8_t ADRES_PCA = ADRES_PCA1;               // de tweede (0x41) alleen bij meer dan 16 groepen
constexpr int N_PCA = (N_GROEPEN + 15) / 16;
constexpr uint32_t SERVO_MS = 20;                 // servo's naar de PCA9685 (één periode van 50 Hz)
constexpr const char *BESTAND_PLAN = "/plan.json"; // PUT /api/plan
constexpr const char *BESTAND_BEELD = "/plan.jpg"; // POST /api/plan/beeld (jpg of png)
constexpr const char *TV_MAP = "/tv/";             // bestanden van de tv-pagina (POST /api/tv/bestand?naam=)
constexpr size_t MAX_BEELD = 1536 * 1024;          // 1,5 MB per beeld of tv-bestand
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
Mcp23017 mcp1, mcp2;
PcaServo pcaServo;
IrHw ir;
IrZender irZender;
SemaphoreHandle_t slot;
Baan *staatKopie = nullptr;   // F15: /api/staat wordt op deze kopie opgebouwd, buiten het slot
Config *cfgKopie = nullptr;   // F15: /instellingen.json idem

volatile bool pcaOk = false;
volatile bool mcp1Ok = false, mcp2Ok = false, servoOk = false;
IrZendEsp irZendHw(ir, mcp1, mcp1Ok);
volatile bool irBezig = false;         // F8: niet bewaren zolang er een IR-frame loopt
volatile bool zelftestVraag = false, zelftestKlaar = false; // Q1: de lichttaak doet de I2C-zelftest
ZelftestHw zelftestUit;
TaskHandle_t taakLicht = nullptr, taakIr = nullptr, taakKastjes = nullptr;
bool mcp2Gevonden = false; // alleen gezocht bij het opstarten
bool hotspotOk = false;
bool fsOk = false;
std::string meldingLaden;
uint32_t hotspotOpnieuwOm = 0, herstartOm = 0, blauwTot = 0;
LangeDruk bootKnop;
HotspotWacht hotspotWacht;
UpdateControle updateControle;
const char *updateFout = nullptr;
int updateToegang = 0; // F6

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
    schrijfBestand(BESTAND_INST, configNaarJson(baan.cfg)); // ook OMGEZET: versie 1 (met dimmen) wordt versie 2
    Serial.printf("Instellingen: %s\n", r == Laad::OMGEZET ? "omgezet naar versie 4 (firmware 2.1.0)." : meldingLaden.c_str());
  }
}

/** de laatste stand: de lampen alleen als "opstarten: laatste stand"; de servo's altijd (zonder beweging, maar één voor
 *  één om de 300 ms, E8) */
void laadStand(uint32_t nu, bool lampen) {
  std::string t;
  Stand s;
  bool ok = leesBestand(BESTAND_STAND, t) && standVanJson(t.data(), t.size(), s);
  if (ok && lampen) baan.herstelStand(s, nu);
  else baan.servosOpStand(ok ? s.servosB : 0, nu);
}

// --------------------------------------------------------------------------------------------- de PWM-chips
/** alle PCA9685's instellen (alle kanalen uit); true = allemaal in orde */
bool pcaBegin() {
  bool ok = true;
  for (int i = 0; i < N_PCA; i++) ok = pca[i].begin(Wire, i == 0 ? ADRES_PCA : ADRES_PCA2, delayMicroseconds) && ok;
  return ok;
}
bool pcaControleer() {
  bool ok = true;
  for (int i = 0; i < N_PCA; i++) ok = pca[i].controleer() && ok;
  return ok;
}
/** de uitgangen van alle groepen wegschrijven (bit g = groep g+1 aan): per chip 16 kanalen (niet gebruikte uit) */
bool pcaZet(GroepMasker uit) {
  bool ok = true;
  uit &= ALLE_GROEPEN;
  for (int i = 0; i < N_PCA; i++) ok = pca[i].zet((uint16_t)(uit >> (16 * i))) && ok;
  return ok;
}

// --------------------------------------------------------------------------------------------- lichttaak
/** Q1: de zelftest op de I2C-bus (in de lichttaak: die bezit de bus) */
void zelftestI2c() {
  static const uint8_t ADRES[5] = {ADRES_MCP1, ADRES_MCP2, ADRES_PCA1, ADRES_PCA2, ADRES_SERVO};
  ZelftestHw z = zelftestUit; // de rest (stapels, LittleFS, wifi) vult de looptaak in
  for (int i = 0; i < 5; i++) {
    Wire.beginTransmission(ADRES[i]);
    z.i2c[i] = Wire.endTransmission() == 0;
  }
  uint16_t gelezen = 0, geschreven = 0;
  z.pcaTerug = pcaOk && pca[0].laatst(geschreven) && pca[0].leesTerug(gelezen) && gelezen == geschreven;
  z.pcaGeschreven = geschreven;
  z.pcaGelezen = gelezen;
  z.mcp1 = mcp1Ok && mcp1.controleer();
  z.mcp2 = mcp2Ok && mcp2.controleer();
  z.servo = servoOk && pcaServo.controleer();
  zelftestUit = z;
}

void lichtTaak(void *) {
  esp_task_wdt_add(nullptr); // deze taak wordt bewaakt
  TickType_t wakker = xTaskGetTickCount();
  uint32_t controle = millis(), geschreven = millis(), servoOm = millis();
  GroepMasker uit = 0;
  IngangMasker omkeer = 0;      // van de vorige tick: welke ingangen de Baan omkeert (voor de flanken van de MCP23017)
  bool irLedLaag = UITGANG_ACTIEF_LAAG;
  uint8_t irDuty = IR_DUTY_STD, continu = 0;
  bool busFout = false;         // F11: een chip die werkte, antwoordde niet meer
  for (;;) {
    vTaskDelayUntil(&wakker, pdMS_TO_TICKS(TICK_MS));
    esp_task_wdt_reset();
    uint32_t nu = millis();
    IngangMasker flanken = ingangenFlanken(); // eerst de flankvlaggen (korte pulsen sinds de vorige keer) ...
    IngangMasker ingangen = ingangenLees();   // ... dan het niveau: bit i = de optocoupler van ingang i+1 geleidt
    uint16_t laag, intf, cap;
    if (mcp1Ok) {
      if (mcp1.leesIngangen(laag, intf, cap)) { // alleen poort B (E6): ingang 17..23
        ingangen |= mcp1Ingangen(laag);
        flanken |= mcp1Ingangen(mcpActiefFlanken(intf, cap, mcp1Bits(omkeer)));
      } else {
        mcp1Ok = false;
        busFout = true;
      }
    }
    if (mcp2Ok) {
      if (mcp2.leesIngangen(laag, intf, cap)) { // ingang 25..38
        ingangen |= mcp2Ingangen(laag);
        flanken |= mcp2Ingangen(mcpActiefFlanken(intf, cap, mcp2Bits(omkeer)));
      } else {
        mcp2Ok = false;
        busFout = true;
      }
    }
    bool ontvangerLaag[IR_ONTVANGERS];
    for (int o = 1; o < IR_ONTVANGERS; o++) ontvangerLaag[o] = ir.laag(o); // E2 (niet de leerontvanger)
    uint16_t tellen[16];
    bool servoNu = nu - servoOm >= SERVO_MS;
    {
      Slot s;
      baan.ingangAanwezig = INGANGEN_GPIO | (mcp1Ok ? INGANGEN_MCP1 : 0) | (mcp2Ok ? INGANGEN_MCP2 : 0);
      baan.irNietVerzonden = irZender.nietVerzonden;
      baan.irLaatsteFout = irZender.laatsteFout;
      baan.tick(nu, ingangen, flanken);
      for (int o = 1; o < IR_ONTVANGERS; o++) baan.ontvangerNiveau(o, ontvangerLaag[o], nu);
      uit = baan.lampen.uitgang;
      omkeer = baan.omkeerMasker();
      irLedLaag = baan.cfg.inst.irLedActiefLaag;
      irDuty = baan.cfg.inst.irDuty;
      continu = baan.continuLeds(nu);
      if (servoNu) baan.servoTellen(tellen);
    }
    if (servoNu) {
      servoOm = nu;
      if (servoOk && !pcaServo.zet(tellen)) { servoOk = false; busFout = true; }
    }
    // IR: leds kiezen, 2 ticks wachten, zenden, 2 ticks wachten, leds uit (F4); continu-leds (F1)
    if (mcp1Ok && !mcp1.zetActiefLaag(irLedLaag)) mcp1Ok = false;
    ir.zetDuty(irDuty);
    irZender.stap(irZendHw, [](IrZend &z, IrCode &c) {
      Slot s;
      return baan.haalIrZend(z) && baan.irCodeVoor(z, c);
    }, continu);
    irBezig = irZender.bezig();
    if (nu - geschreven >= UITGANG_MS) {
      geschreven = nu;
      if (pcaOk && !pcaZet(uit)) { pcaOk = false; busFout = true; }
    }
    if (zelftestVraag) {
      zelftestI2c();
      zelftestVraag = false;
      zelftestKlaar = true;
    }
    // de chips nakijken (en na een spanningsdip opnieuw instellen)
    if (nu - controle >= CONTROLE_MS) {
      controle = nu;
      if (busFout) { // F11: eerst de bus vrijmaken (9 klokpulsen), dan alles opnieuw instellen
        busFout = false;
        i2cHerstel(Wire, PIN_SDA, PIN_SCL, I2C_HZ);
      }
      if (!pcaOk || !pcaControleer()) {
        digitalWrite(PIN_OE, HIGH); // veilig: alles uit zolang de chips niet goed staan (ook de servo's: F9)
        pcaOk = pcaBegin() && pcaZet(uit);
        if (pcaOk) digitalWrite(PIN_OE, LOW);
      }
      // de chips van 2.0.0: na een spanningsdip opnieuw instellen (de tweede MCP23017 alleen als hij er was)
      if (!mcp1Ok || !mcp1.controleer()) mcp1Ok = mcp1.begin(Wire, ADRES_MCP1, true, irLedLaag);
      if (mcp2Gevonden && (!mcp2Ok || !mcp2.controleer())) mcp2Ok = mcp2.begin(Wire, ADRES_MCP2, false);
      if (!servoOk || !pcaServo.controleer()) servoOk = pcaServo.begin(Wire, ADRES_SERVO, delayMicroseconds);
    }
  }
}

// ------------------------------------------------------------------------------------------------ IR-taak
void irTaak(void *) {
  for (;;) {
    bool iets = false;
    for (int o = 0; o < IR_ONTVANGERS; o++) {
      const uint32_t *ns;
      bool afgekapt;
      int n = ir.ontvang(o, ns, afgekapt);
      if (n <= 0) continue; // ook een frame met alleen een lang niveau (E2): dat ziet ontvangerNiveau
      iets = true;
      Slot s;
      baan.irFrame(o, ns, n, millis(), afgekapt);
    }
    if (!iets) vTaskDelay(pdMS_TO_TICKS(5));
  }
}

// ------------------------------------------------------------------------------------------- kastjes-taak
void kastjesTaak(void *) {
  for (;;) {
    HttpOpdracht o;
    bool er;
    {
      Slot s;
      er = baan.kastjes.haal(o);
    }
    if (!er) {
      vTaskDelay(pdMS_TO_TICKS(50));
      continue;
    }
    WiFiClient client;
    HTTPClient http;
    String url = String("http://") + o.ip + o.pad;
    if (http.begin(client, url)) {
      http.setTimeout(KASTJE_TIMEOUT_MS);
      http.setConnectTimeout(KASTJE_TIMEOUT_MS);
      http.addHeader("Content-Type", "application/json");
      int code = http.POST((uint8_t *)o.body, strlen(o.body));
      if (code != 200) Serial.printf("Kastje %s%s: %d\n", o.ip, o.pad, code);
      http.end();
      if (code < 0) { // geen antwoord (F16): meteen offline, zijn andere opdrachten vervallen
        Slot s;
        baan.kastjes.offlineIp(o.ip);
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
  if (!pcaOk) // F9: OE is gedeeld met de servoprint
    erbij(N_PCA > 1 ? "De uitgangen (PCA9685, adres 0x40 of 0x41) antwoorden niet: alle lampen blijven uit en de servo's "
                      "krijgen geen puls (OE is gedeeld). Kijk de draden na."
                    : "De uitgangen (PCA9685, adres 0x40) antwoorden niet: alle lampen blijven uit en de servo's krijgen "
                      "geen puls (OE is gedeeld). Kijk de draden na.");
  bool irGebruikt = false, ingangHoog = false, servoGebruikt = false;
  std::string logica;
  {
    Slot s;
    for (int i = 0; i < MAX_IR_CODES; i++) irGebruikt |= baan.cfg.ir[i].gebruikt;
    for (int i = 16; i < 23; i++) ingangHoog |= baan.cfg.ingang[i].gedrag != GEDRAG_GEEN;
    for (int i = 0; i < MAX_SERVOS; i++) servoGebruikt |= baan.cfg.servo[i].gebruikt;
    logica = baan.logicaMelding();
  }
  if (!mcp1Ok && (irGebruikt || ingangHoog))
    erbij("De MCP23017 (adres 0x20) antwoordt niet: de IR-leds en ingang 17-23 werken niet. Kijk de draden na.");
  if (!servoOk && servoGebruikt)
    erbij("De servo-PCA9685 (adres 0x42) antwoordt niet: de servo's bewegen niet. Kijk de draden en de 5-6 V na.");
  if (mcp2Gevonden && !mcp2Ok) erbij("De tweede MCP23017 (adres 0x21) antwoordt niet meer: ingang 25-38 werken niet.");
  if (!logica.empty()) erbij(logica.c_str());
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
  hotspotOk = WiFi.softAP(HOTSPOT_NAAM, ww, 6, 0, 10); // F7: 10 toestellen (het maximum van de ESP32)
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

/** F6: mag dit verzoek iets wijzigen? 0 = ja, anders 401 of 403 */
int toegangNu() {
  char ww[64], thuis[16];
  {
    Slot s;
    strcpy(ww, baan.cfg.inst.wachtwoord);
    strncpy(thuis, baan.thuisIp.c_str(), sizeof thuis - 1);
    thuis[sizeof thuis - 1] = 0;
  }
  String ip = web.client().remoteIP().toString();
  return toegang(ip.c_str(), web.header("X-Treinbaan-Wachtwoord").c_str(), web.header("Origin").c_str(),
                 web.header("Host").c_str(), thuis, ww);
}

/** een geluidskastje dat zich aanmeldt (van het thuisnet, zonder wachtwoord): mag altijd (F6, uitzondering) */
bool kastjeAanmelding(const String &body) {
  JsonDocument d;
  return !deserializeJson(d, body.c_str(), body.length()) && strcmp(d["actie"] | "", "aanmelden") == 0;
}

void post(const char *pad, Eindpunt f) {
  web.on(pad, HTTP_POST, [f]() {
    const String &body = web.arg("plain");
    int t = toegangNu();
    if (t && !(f == apiKastje && t == 401 && kastjeAanmelding(body))) {
      stuur(geweigerd(t));
      return;
    }
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

/** een bestand uit LittleFS sturen; false = bestaat niet */
bool stuurBestand(const String &pad, const char *soort = nullptr) {
  if (!fsOk || !LittleFS.exists(pad)) return false;
  File f = LittleFS.open(pad, "r");
  if (!f) return false;
  String s = soort ? String(soort) : String(inhoudSoort(pad.c_str()));
  if (!soort && pad.endsWith(".jpg")) {
    uint8_t b[2] = {0, 0};
    f.read(b, 2);
    f.seek(0);
    if (b[0] == 0x89 && b[1] == 'P') s = "image/png"; // /plan.jpg mag ook een png zijn
  }
  web.sendHeader("Cache-Control", "no-cache");
  web.streamFile(f, s);
  f.close();
  return true;
}

/** de tv-pagina (/tv en /tv/): uit de firmware (ui/tv.html), of anders uit LittleFS /tv/tv.html */
void tvPagina() {
  if (TV_GZ_LEN > 0) {
    web.sendHeader("Content-Encoding", "gzip");
    web.sendHeader("Cache-Control", "no-cache");
    web.send_P(200, "text/html; charset=utf-8", (const char *)TV_GZ, TV_GZ_LEN);
    return;
  }
  if (stuurBestand(String(TV_MAP) + "tv.html")) return;
  web.send(404, "text/plain; charset=utf-8", "De tv-pagina ontbreekt: zet tv.html op de doos (POST /api/tv/bestand?naam=tv.html).");
}

// Bestanden ontvangen (plan, beeld, tv-bestanden): als multipart-formulier (upload) of als ruwe body (raw). Eerst naar
// <doel>.tmp, op het einde hernoemen; te groot of afgebroken = weg.
File ontvangBestand;
String ontvangDoel;
size_t ontvangGrootte = 0, ontvangMax = 0;
const char *ontvangFout = nullptr;
bool (*ontvangControle)(const String &tmp) = nullptr; // nakijken voor het hernoemen (het plan); false = ontvangFout

int ontvangToegang = 0; // F6: de upload is geweigerd (401/403)

void ontvangStart(const String &doel, size_t max) {
  ontvangFout = nullptr;
  ontvangToegang = toegangNu();
  if (ontvangToegang) { ontvangFout = "Geen toegang."; return; }
  ontvangDoel = doel;
  ontvangGrootte = 0;
  ontvangMax = max;
  if (!fsOk) { ontvangFout = "Het geheugen van de doos werkt niet."; return; }
  if (!doel.length()) { ontvangFout = "Naam: 1 tot 31 tekens (letters, cijfers, _ -) met een extensie, bv. achtergrond.jpg."; return; }
  if (doel.startsWith(TV_MAP)) LittleFS.mkdir("/tv");
  ontvangBestand = LittleFS.open(doel + ".tmp", "w");
  if (!ontvangBestand) ontvangFout = "Het bestand kon niet aangemaakt worden.";
}
void ontvangStuk(const uint8_t *buf, size_t n) {
  esp_task_wdt_reset();
  if (ontvangFout || !n) return;
  ontvangGrootte += n;
  if (ontvangGrootte > ontvangMax) { ontvangFout = "Het bestand is te groot."; return; }
  if (ontvangBestand.write(buf, n) != n) ontvangFout = "Het geheugen van de doos is vol.";
}
/** afsluiten: nakijken (ontvangControle), dan het oude bestand vervangen; bij een fout blijft het oude */
void ontvangEinde(bool afgebroken) {
  if (ontvangBestand) ontvangBestand.close();
  String tmp = ontvangDoel + ".tmp";
  if (afgebroken && !ontvangFout) ontvangFout = "De upload is afgebroken.";
  if (!ontvangFout && ontvangGrootte == 0) ontvangFout = "Het bestand is leeg.";
  if (!ontvangFout && ontvangControle) ontvangControle(tmp);
  if (ontvangFout) { LittleFS.remove(tmp); return; }
  LittleFS.remove(ontvangDoel);
  if (!LittleFS.rename(tmp, ontvangDoel)) ontvangFout = "Het bestand kon niet bewaard worden.";
}

/** de upload-functie voor web.on(..., klaar, stuk): multipart (Content-Type multipart/...) of ruw */
template <typename DoelFn>
void ontvang(DoelFn doel, size_t max, bool (*controle)(const String &) = nullptr) {
  bool multipart = web.header("Content-Type").startsWith("multipart/");
  if (multipart) {
    HTTPUpload &u = web.upload();
    if (u.status == UPLOAD_FILE_START) ontvangControle = controle;
    if (u.status == UPLOAD_FILE_START) ontvangStart(doel(), max);
    else if (u.status == UPLOAD_FILE_WRITE) ontvangStuk(u.buf, u.currentSize);
    else if (u.status == UPLOAD_FILE_END) ontvangEinde(false);
    else if (u.status == UPLOAD_FILE_ABORTED) ontvangEinde(true);
  } else {
    HTTPRaw &r = web.raw();
    if (r.status == RAW_START) ontvangControle = controle;
    if (r.status == RAW_START) ontvangStart(doel(), max);
    else if (r.status == RAW_WRITE) ontvangStuk(r.buf, r.currentSize);
    else if (r.status == RAW_END) ontvangEinde(false);
    else if (r.status == RAW_ABORTED) ontvangEinde(true);
  }
}

void ontvangKlaar() {
  if (ontvangToegang) stuur(geweigerd(ontvangToegang));
  else if (ontvangFout) stuur(fout(ontvangFout));
  else stuur(goed());
  ontvangFout = nullptr;
}

/** PUT /api/plan: nakijken voor het oude plan vervangen wordt (JSON-object, hoogstens 256 kB) */
bool planControle(const String &tmp) {
  std::string t;
  File f = LittleFS.open(tmp, "r");
  if (f) {
    t.resize(f.size());
    if (t.size()) f.read((uint8_t *)&t[0], t.size());
    f.close();
  }
  const char *e = planFout(t.data(), t.size());
  if (e[0]) ontvangFout = e;
  return !e[0];
}

String tvBestandNaam() {
  String n = web.arg("naam");
  return tvNaamGeldig(n.c_str()) ? String(TV_MAP) + n : String();
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
    updateToegang = toegangNu(); // F6: geen firmware van een andere webpagina of van het thuisnet zonder wachtwoord
    if (updateToegang) { updateFout = "Geen toegang."; return; }
    updateFout = updateControle.begin(0, ESP.getFreeSketchSpace()); // multipart: de grootte is vooraf niet bekend
    if (!updateFout && !Update.begin(UPDATE_SIZE_UNKNOWN)) updateFout = "De doos kon de update niet beginnen.";
    if (!updateFout) Serial.printf("Update: %s\n", u.filename.c_str());
  } else if (u.status == UPLOAD_FILE_WRITE) {
    if (updateFout) return;
    updateFout = updateControle.stuk(u.buf, u.currentSize);
    if (!updateFout && Update.write(u.buf, u.currentSize) != u.currentSize) updateFout = "Schrijven in het geheugen mislukte.";
    if (updateFout) Update.abort();
  } else if (u.status == UPLOAD_FILE_END) {
    // F14: nagekeken worden alleen de grootte, het begin en de controlesom (Update.end): een firmware die start en dan
    // vastloopt, blijft herstarten; terug kan dan alleen met USB (de opening in de voorwand)
    if (!updateFout) updateFout = updateControle.einde();
    if (!updateFout && !Update.end(true)) updateFout = "De nieuwe firmware is niet in orde (de controle mislukte).";
  } else if (u.status == UPLOAD_FILE_ABORTED) {
    Update.abort();
    updateFout = "De upload is afgebroken.";
  }
}

void updateKlaar() {
  if (updateToegang) {
    stuur(geweigerd(updateToegang));
    updateToegang = 0;
    updateFout = nullptr;
    return;
  }
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

/** captive portal: elke onbekende vraag (ook de controle van Android, iPhone en Windows) gaat naar het dashboard.
 *  Eerst: /tv/<bestand> (en een bestand naast de tv-pagina, zoals /achtergrond.jpg) uit LittleFS /tv/. */
void nietGevonden() {
  String pad = web.uri();
  if (web.method() == HTTP_GET) {
    String naam = pad.startsWith("/tv/") ? pad.substring(4) : pad.substring(1);
    if (tvNaamGeldig(naam.c_str())) {
      if (stuurBestand(String(TV_MAP) + naam)) return;
      if (naam == "plan.json" && stuurBestand(BESTAND_PLAN)) return; // het plan uit PUT /api/plan
      if (pad.startsWith("/tv/")) {
        web.send(404, "text/plain; charset=utf-8", "Niet gevonden");
        return;
      }
    }
  }
  web.sendHeader("Location", String("http://") + IP_DOOS.toString() + "/");
  web.send(302, "text/plain", "");
}

void startWeb() {
  web.on("/", HTTP_GET, dashboard);
  web.on("/index.html", HTTP_GET, dashboard);
  web.on("/update", HTTP_GET, []() { web.send_P(200, "text/html; charset=utf-8", UPDATE_PAGINA); });
  web.on("/api/staat", HTTP_GET, []() {
    bool kort = web.hasArg("kort");
    uint32_t nu;
    {
      Slot s;
      *staatKopie = baan; // F15: alleen kopiëren onder het slot (± 1 ms), de JSON erbuiten
      nu = millis();
    }
    std::string t = apiStaat(*staatKopie, nu, kort);
    web.sendHeader("Cache-Control", "no-store");
    web.sendHeader("Access-Control-Allow-Origin", "*"); // V5: een tv-pagina van een andere host
    web.send(200, "application/json", t.c_str());
  });
  web.on("/api/zelftest", HTTP_GET, []() { // Q1: wat op het bord nagekeken kan worden
    zelftestUit = ZelftestHw();
    zelftestUit.fs = fsOk;
    if (fsOk) {
      zelftestUit.fsTotaal = LittleFS.totalBytes();
      zelftestUit.fsGebruikt = LittleFS.usedBytes();
    }
    zelftestUit.stapelLicht = taakLicht ? uxTaskGetStackHighWaterMark(taakLicht) : 0;
    zelftestUit.stapelIr = taakIr ? uxTaskGetStackHighWaterMark(taakIr) : 0;
    zelftestUit.stapelKastjes = taakKastjes ? uxTaskGetStackHighWaterMark(taakKastjes) : 0;
    zelftestUit.stapelLoop = uxTaskGetStackHighWaterMark(nullptr);
    zelftestUit.wifiClients = WiFi.softAPgetStationNum();
    zelftestUit.vrijGeheugen = ESP.getFreeHeap();
    zelftestUit.vrijPsram = ESP.getFreePsram();
    zelftestKlaar = false;
    zelftestVraag = true;
    for (int i = 0; i < 100 && !zelftestKlaar; i++) delay(5); // de lichttaak doet de I2C (± 10 ms)
    web.sendHeader("Cache-Control", "no-store");
    web.send(zelftestKlaar ? 200 : 503, "application/json", apiZelftest(zelftestUit).c_str());
  });
  post("/api/groep", apiGroep);
  post("/api/scene", apiScene);
  post("/api/functie", apiFunctie);
  post("/api/ingang", apiIngang);
  post("/api/instellingen", apiInstellingen);
  post("/api/dagnacht", apiDagnacht);
  post("/api/test", apiTest);
  post("/api/ir", apiIr);
  post("/api/bus", apiBus);
  post("/api/punt", apiPunt);
  post("/api/servo", apiServo);
  post("/api/halte", apiHalte);
  post("/api/kastje", apiKastje);
  web.on("/api/meldingen", HTTP_GET, []() {
    uint32_t sinds = sindsVan(web.arg("sinds").c_str());
    std::string t;
    {
      Slot s;
      t = apiMeldingen(baan, sinds, millis());
    }
    web.sendHeader("Cache-Control", "no-store");
    web.sendHeader("Access-Control-Allow-Origin", "*");
    web.send(200, "application/json", t.c_str());
  });
  // het plan (situatieplan/plan.json) en het beeld
  web.on("/api/plan", HTTP_GET, []() {
    web.sendHeader("Access-Control-Allow-Origin", "*"); // V5
    if (stuurBestand(BESTAND_PLAN, "application/json")) return;
    if (stuurBestand(String(TV_MAP) + "plan.json", "application/json")) return;
    stuur(fout("Er is nog geen plan op de doos."));
  });
  web.on("/api/plan", HTTP_PUT, ontvangKlaar, []() { ontvang([]() { return String(BESTAND_PLAN); }, MAX_PLAN, planControle); });
  web.on("/api/plan/beeld", HTTP_POST, ontvangKlaar, []() { ontvang([]() { return String(BESTAND_BEELD); }, MAX_BEELD); });
  web.on("/plan.jpg", HTTP_GET, []() {
    if (!stuurBestand(BESTAND_BEELD)) web.send(404, "text/plain", "");
  });
  // de tv-pagina en haar bestanden
  web.on("/tv", HTTP_GET, tvPagina);
  web.on("/tv/", HTTP_GET, tvPagina);
  web.on("/api/tv/bestand", HTTP_POST, ontvangKlaar, []() {
    ontvang(tvBestandNaam, MAX_BEELD);
  });
  web.on("/api/update", HTTP_POST, updateKlaar, updateStuk);
  web.onNotFound(nietGevonden);
  const char *koppen[] = {"Content-Type", "Origin", "Host", "X-Treinbaan-Wachtwoord"};
  web.collectHeaders(koppen, 4);
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
  if (!nu_meteen && irBezig) return; // F8: niet in het flashgeheugen schrijven terwijl de RMT een frame zendt
  if (cfgGezien != cfgBewaard && (nu_meteen || nu - cfgOm >= BEWAAR_INST_MS)) {
    {
      Slot s;
      *cfgKopie = baan.cfg; // F15: kopiëren onder het slot, de JSON (tot 160 kB) erbuiten
    }
    std::string t = configNaarJson(*cfgKopie);
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
  // 1. alle uitgangen uit: OE hoog (de externe pull-up deed dat al tijdens een warme reset; na een koude start staan
  //    actief-lage modules tot pcaBegin() aan, E5)
  pinMode(PIN_OE, OUTPUT);
  digitalWrite(PIN_OE, HIGH);
  pinMode(PIN_BOOT, INPUT_PULLUP);
  Serial.begin(115200);
  Serial.printf("\nTreinbaan lichtsturing %s (%d groepen)\n", FW_VERSIE, N_GROEPEN);
  slot = xSemaphoreCreateMutex();
  staatKopie = new Baan();
  cfgKopie = new Config();

  // 2. I2C en de PCA9685('s): eerst alle kanalen 0, dan pas OE laag
  Wire.begin(PIN_SDA, PIN_SCL, I2C_HZ);
  Wire.setTimeOut(I2C_TIMEOUT_MS);
  pcaOk = pcaBegin();
  if (pcaOk) digitalWrite(PIN_OE, LOW);
  else Serial.println("PCA9685 antwoordt niet: uitgangen blijven uit.");

  // 3. de ingangen (16 GPIO's met interne pull-up en een interrupt op elke flank), de servo-PCA9685 en de IR (RMT)
  ingangenBegin();
  servoOk = pcaServo.begin(Wire, ADRES_SERVO, delayMicroseconds);
  ir.begin();
  Serial.printf("IR: zenden %s, ontvangers %d%d%d%d\n", ir.zendOk ? "ok" : "NIET", ir.ontvangOk[0], ir.ontvangOk[1],
                ir.ontvangOk[2], ir.ontvangOk[3]);

  // 4. instellingen laden (de polariteit van de IR-leds, E1), de MCP23017's, dan de laatste stand (of alles uit)
  fsOk = LittleFS.begin(true);
  if (!fsOk) Serial.println("LittleFS werkt niet.");
  laadInstellingen();
  mcp1Ok = mcp1.begin(Wire, ADRES_MCP1, true, baan.cfg.inst.irLedActiefLaag); // tot hier: GPA ingang (geen led aan)
  mcp2Gevonden = mcp2Ok = mcp2.begin(Wire, ADRES_MCP2, false);
  ir.zetDuty(baan.cfg.inst.irDuty);
  Serial.printf("MCP23017 0x20: %s, 0x21: %s, servo-PCA9685 0x42: %s\n", mcp1Ok ? "ja" : "nee",
                mcp2Gevonden ? "ja (ingang 25-38)" : "nee", servoOk ? "ja" : "nee");
  uint32_t nu = millis();
  baan.toepassen(nu);
  laadStand(nu, baan.cfg.inst.opstartLaatste);
  baan.haltesOpnieuw(nu); // alle haltes vrij, rood aan, één keer de rijdcode (F2)
  cfgGezien = cfgBewaard = baan.cfgRev;
  standGezien = standBewaard = baan.standRev;
  meldingBijwerken();

  // 5. de watchdog (na het laden: LittleFS formatteren kan de eerste keer enkele seconden duren), dan de lichttaak
  esp_task_wdt_init(WATCHDOG_S, true);
  esp_task_wdt_add(nullptr); // de looptaak (setup en loop draaien erin)
  // de stapels (6 kB) zijn niet gemeten: GET /api/zelftest en de seriële monitor (na 30 s) geven het hoogwatermerk (F15)
  xTaskCreatePinnedToCore(lichtTaak, "licht", 6144, nullptr, 5, &taakLicht, 1);
  xTaskCreatePinnedToCore(irTaak, "ir", 6144, nullptr, 4, &taakIr, 1);
  xTaskCreatePinnedToCore(kastjesTaak, "kastjes", 6144, nullptr, 1, &taakKastjes, 0);

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
  static bool stapelGelogd = false;
  if (!stapelGelogd && nu > 30000) { // F15: één keer de vrije stapel (bytes) per taak
    stapelGelogd = true;
    Serial.printf("Stapel vrij: licht %u, ir %u, kastjes %u, loop %u bytes\n",
                  (unsigned)uxTaskGetStackHighWaterMark(taakLicht), (unsigned)uxTaskGetStackHighWaterMark(taakIr),
                  (unsigned)uxTaskGetStackHighWaterMark(taakKastjes), (unsigned)uxTaskGetStackHighWaterMark(nullptr));
  }
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
