// Geluidskastje van de modelbaan (treinverlichting versie 6): ESP32-S3-Zero (Waveshare) + MAX98357A + luidspreker.
// Al het denkwerk zit in include/ (kastje.h, http.h, wifiplan.h, getest op de pc). Dit bestand doet de hardware, de
// wifi, de kleine webserver, het aanmelden bij de doos en het bewaren in LittleFS.
//
// Aansluitingen (ESP32-S3-Zero, geen strapping-pinnen: dat zijn GPIO0, 3, 45 en 46):
//   GPIO4  BCLK  -> MAX98357A BCLK
//   GPIO5  LRC   -> MAX98357A LRC (word select)
//   GPIO6  DIN   -> MAX98357A DIN (data)
//   GPIO1  SD    -> MAX98357A SD: hoog = aan (linkerkanaal; het kastje stuurt links = rechts), laag = uit (geen ruis
//                   als er niets speelt)
//   GPIO21 RGB-led op het bord (WS2812): groen = verbonden en aangemeld bij de doos, geel = verbonden maar de doos
//          antwoordt niet, blauw = eigen hotspot, oranje knipperend = zoekt "Treinbaan", wit = speelt
//   GPIO0  BOOT-knop: 5 s vasthouden = de wifi terug naar "Treinbaan" / "treinbaan"
//   5V en GND van de 5 V-regelaar (MP1584EN, 12 V -> 5,0 V) naar 5V/GND van de ESP en VIN/GND van de MAX98357A.
//
// Wifi: verbindt met het netwerk van de doos ("Treinbaan", wachtwoord "treinbaan"; te wijzigen met POST /wifi). Lukt
// dat 60 s niet, dan komt er een eigen hotspot "Geluidskastje-<id>" (wachtwoord "treinbaan") op 192.168.5.1 (een ander
// net dan de doos, 192.168.4.x, zodat er niets botst als het kastje daarna toch verbindt). Elke 30 s meldt het kastje
// zich aan: POST http://192.168.4.1/api/kastje (contract versie 6).
//
// De speler is een eigen taak: hij leest de WAV in stukken van 1024 bytes uit LittleFS, zet er het volume op en schrijft
// stereo naar I2S (DMA). Een nieuw /speel of /stop onderbreekt meteen.
#include <Arduino.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <WiFi.h>
#include <driver/i2s.h>

#include "http.h"
#include "kastje.h"
#include "pagina.h"
#include "wifiplan.h"

using namespace gk;

namespace {

constexpr int PIN_SD = 1, PIN_BCLK = 4, PIN_LRC = 5, PIN_DIN = 6, PIN_LED = 21, PIN_BOOT = 0;
constexpr const char *BESTAND_CONFIG = "/kastje.json";
constexpr const char *BESTAND_UPLOAD = "/upload.tmp";
constexpr size_t RESERVE = 24 * 1024;      // zoveel blijft vrij in LittleFS (bestandsbeheer, instellingen)
constexpr uint32_t KOP_MS = 3000;          // een verzoek moet zijn kop binnen 3 s sturen
constexpr uint32_t STIL_MS = 10000;        // een upload mag hoogstens 10 s stilvallen
constexpr size_t KOP_BUF = 4096;           // zoveel van het begin van een WAV wordt nagekeken
const IPAddress IP_HOTSPOT(192, 168, 5, 1), MASKER(255, 255, 255, 0);

Config cfg;
std::string id, apNaam, hostNaam;
std::vector<Geluid> geluiden; // alleen uit loop() gebruikt
bool fsOk = false;
WiFiServer server(80);
WifiKeuze wifiKeuze;
Aanmelder aanmelder;
LangeDruk bootKnop;

// ---------------------------------------------------------------- speler (eigen taak)
struct Opdracht {
  char geluid[48];
  int volume;
  bool stop;
};
QueueHandle_t opdrachten;
SemaphoreHandle_t slot;
char speeltNu[48] = {0}; // onder slot

void zetSpeelt(const char *n) {
  xSemaphoreTake(slot, portMAX_DELAY);
  strncpy(speeltNu, n, sizeof speeltNu - 1);
  xSemaphoreGive(slot);
}
std::string speelt() {
  xSemaphoreTake(slot, portMAX_DELAY);
  std::string s = speeltNu;
  xSemaphoreGive(slot);
  return s;
}

void i2sStart() {
  i2s_config_t c = {};
  c.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX);
  c.sample_rate = 16000;
  c.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
  c.channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT;
  c.communication_format = I2S_COMM_FORMAT_STAND_I2S;
  c.intr_alloc_flags = 0;
  c.dma_buf_count = 8;
  c.dma_buf_len = 256;
  c.use_apll = false;
  c.tx_desc_auto_clear = true; // geen data = stilte, geen herhaald stukje
  i2s_driver_install(I2S_NUM_0, &c, 0, nullptr);
  i2s_pin_config_t p = {};
  p.mck_io_num = I2S_PIN_NO_CHANGE;
  p.bck_io_num = PIN_BCLK;
  p.ws_io_num = PIN_LRC;
  p.data_out_num = PIN_DIN;
  p.data_in_num = I2S_PIN_NO_CHANGE;
  i2s_set_pin(I2S_NUM_0, &p);
  i2s_zero_dma_buffer(I2S_NUM_0);
}

/** speelt o; geeft true als er onderweg een nieuwe opdracht kwam (dan staat die in o) */
bool speelEen(Opdracht &o) {
  static uint8_t kop[512];
  static int16_t mono[512], stereo[1024];
  std::string pad = std::string("/") + o.geluid;
  File f = LittleFS.open(pad.c_str(), "r");
  if (!f) return false;
  size_t n = f.read(kop, sizeof kop);
  Wav w = leesWav(kop, n, (uint32_t)f.size());
  if (!w.ok) { f.close(); return false; }
  i2s_set_clk(I2S_NUM_0, w.hz, I2S_BITS_PER_SAMPLE_16BIT, I2S_CHANNEL_STEREO);
  f.seek(w.dataStart);
  zetSpeelt(o.geluid);
  digitalWrite(PIN_SD, HIGH);
  uint32_t rest = w.dataBytes;
  const int speelVolume = o.volume;
  bool onderbroken = false;
  while (rest > 0) {
    if (xQueueReceive(opdrachten, &o, 0) == pdTRUE) { onderbroken = true; break; }
    size_t wil = rest < sizeof mono ? rest : sizeof mono;
    size_t kreeg = f.read((uint8_t *)mono, wil) & ~(size_t)1;
    if (kreeg == 0) break;
    rest -= kreeg;
    naarStereo(mono, kreeg / 2, stereo, volumeFactor(samenVolume(speelVolume, cfg.volume)));
    size_t geschreven = 0;
    i2s_write(I2S_NUM_0, stereo, kreeg * 2, &geschreven, portMAX_DELAY);
  }
  f.close();
  return onderbroken;
}

void spelerTaak(void *) {
  i2sStart();
  Opdracht o;
  for (;;) {
    if (xQueueReceive(opdrachten, &o, portMAX_DELAY) != pdTRUE) continue;
    while (!o.stop && speelEen(o)) {}
    // de laatste stukjes uit de DMA laten lopen, dan stilte en de versterker uit
    vTaskDelay(pdMS_TO_TICKS(40));
    i2s_zero_dma_buffer(I2S_NUM_0);
    if (uxQueueMessagesWaiting(opdrachten) == 0) digitalWrite(PIN_SD, LOW);
    zetSpeelt("");
  }
}

void stuur(const std::string &geluid, int volume, bool stop) {
  Opdracht o = {};
  strncpy(o.geluid, geluid.c_str(), sizeof o.geluid - 1);
  o.volume = volume;
  o.stop = stop;
  xQueueSend(opdrachten, &o, pdMS_TO_TICKS(100));
}
/** stopt de speler als hij dit geluid speelt en wacht tot het bestand dicht is */
void stopAls(const std::string &naam) {
  if (speelt() != naam) return;
  stuur("", 0, true);
  for (int i = 0; i < 50 && speelt() == naam; i++) delay(10);
}

// ---------------------------------------------------------------- opslag
bool schrijf(const char *pad, const std::string &t) {
  std::string tmp = std::string(pad) + ".tmp";
  File f = LittleFS.open(tmp.c_str(), "w");
  if (!f) return false;
  bool ok = f.write((const uint8_t *)t.data(), t.size()) == t.size();
  f.close();
  if (!ok) return false;
  LittleFS.remove(pad);
  return LittleFS.rename(tmp.c_str(), pad);
}
void bewaarConfig() { if (fsOk) schrijf(BESTAND_CONFIG, configNaarJson(cfg)); }
void laadConfig() {
  cfg = Config();
  File f = LittleFS.open(BESTAND_CONFIG, "r");
  if (f) {
    std::string t;
    while (f.available() && t.size() <= MAX_JSON) t += (char)f.read();
    f.close();
    if (!configVanJson(t.data(), t.size(), cfg)) Serial.println("kastje.json onleesbaar: standaardinstellingen");
  }
  if (cfg.naam.empty()) cfg.naam = "Kastje " + id;
}
uint32_t vrij() { return fsOk ? (uint32_t)(LittleFS.totalBytes() - LittleFS.usedBytes()) : 0; }

/** alle geluiden in LittleFS opzoeken (bij het opstarten) */
void leesGeluiden() {
  geluiden.clear();
  LittleFS.remove(BESTAND_UPLOAD);
  File root = LittleFS.open("/");
  for (File f = root.openNextFile(); f; f = root.openNextFile()) {
    std::string naam = f.name(), fout;
    if (!naam.empty() && naam[0] == '/') naam.erase(0, 1);
    if (f.isDirectory() || geluidNaam(naam, fout) != naam) continue;
    uint8_t kop[512];
    size_t n = f.read(kop, sizeof kop);
    Wav w = leesWav(kop, n, (uint32_t)f.size());
    if (w.ok && geluiden.size() < MAX_GELUIDEN) zetGeluid(geluiden, {naam, w.seconden(), (uint32_t)f.size()});
  }
}

// ---------------------------------------------------------------- wifi en aanmelden
std::string ipNu() { return WiFi.status() == WL_CONNECTED ? std::string(WiFi.localIP().toString().c_str()) : std::string(IP_HOTSPOT.toString().c_str()); }

void wifiStart() {
  WiFi.persistent(false);
  WiFi.setHostname(hostNaam.c_str());
  WiFi.mode(wifiKeuze.hotspot() ? WIFI_AP_STA : WIFI_STA);
  WiFi.setSleep(false); // sneller antwoorden en uploaden
  WiFi.setAutoReconnect(true);
  WiFi.begin(cfg.ssid.c_str(), cfg.wachtwoord.empty() ? nullptr : cfg.wachtwoord.c_str());
  Serial.printf("Zoekt wifi \"%s\"\n", cfg.ssid.c_str());
}
void hotspot(bool aan) {
  if (aan) {
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAPConfig(IP_HOTSPOT, IP_HOTSPOT, MASKER);
    WiFi.softAP(apNaam.c_str(), STD_WACHTWOORD);
    Serial.printf("Eigen hotspot \"%s\" op %s\n", apNaam.c_str(), IP_HOTSPOT.toString().c_str());
  } else {
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    Serial.println("Eigen hotspot uit");
  }
}
bool aanmelden() {
  WiFiClient wc;
  HTTPClient h;
  h.setConnectTimeout(1500);
  h.setTimeout(2000);
  std::string url = "http://" + cfg.doos + "/api/kastje";
  if (!h.begin(wc, url.c_str())) return false;
  h.addHeader("Content-Type", "application/json");
  std::string json = aanmeldJson(id, cfg.naam, ipNu(), geluiden);
  int code = h.POST((uint8_t *)json.data(), json.size());
  h.end();
  return code == 200;
}

// ---------------------------------------------------------------- de webserver
/** een regel tot \n (zonder \r\n); false bij een time-out of een te lange regel */
bool leesRegel(WiFiClient &c, std::string &r, uint32_t tot) {
  r.clear();
  while (true) {
    while (!c.available()) {
      if (!c.connected() || !voorbij(tot, millis())) return false;
      delay(1);
    }
    char ch = (char)c.read();
    if (ch == '\n') { if (!r.empty() && r.back() == '\r') r.pop_back(); return true; }
    r += ch;
    if (r.size() > MAX_KOPREGEL) return false;
  }
}
bool leesBody(WiFiClient &c, size_t n, std::string &uit) {
  uit.clear();
  uint32_t laatst = millis();
  while (uit.size() < n) {
    int a = c.available();
    if (a > 0) {
      char b[256];
      int k = c.read((uint8_t *)b, (size_t)a < sizeof b ? (size_t)a : sizeof b);
      if (k > 0) { uit.append(b, (size_t)k > n - uit.size() ? n - uit.size() : (size_t)k); laatst = millis(); }
    } else {
      if (!c.connected() || millis() - laatst > KOP_MS) return false;
      delay(1);
    }
  }
  return true;
}
/** de rest van een body weggooien (zodat de browser het foutantwoord ook leest) */
void slik(WiFiClient &c, size_t n) {
  uint8_t b[512];
  uint32_t laatst = millis();
  while (n > 0 && c.connected() && millis() - laatst < STIL_MS) {
    int k = c.read(b, n < sizeof b ? n : sizeof b);
    if (k > 0) { n -= (size_t)k; laatst = millis(); } else delay(1);
  }
}
void antwoord(WiFiClient &c, int code, const std::string &body, const char *type = "application/json") {
  std::string k = antwoordKop(code, type, body.size());
  c.write((const uint8_t *)k.data(), k.size());
  if (!body.empty()) c.write((const uint8_t *)body.data(), body.size());
}
void fout(WiFiClient &c, const std::string &tekst, int code = 400) { antwoord(c, code, foutJson(tekst)); }

Status status() {
  Status s;
  s.id = id;
  s.naam = cfg.naam;
  s.ip = ipNu();
  s.speelt = speelt();
  s.ssid = cfg.ssid;
  s.volume = cfg.volume;
  s.vrij = vrij();
  s.totaal = fsOk ? (uint32_t)LittleFS.totalBytes() : 0;
  s.verbonden = WiFi.status() == WL_CONNECTED;
  s.hotspot = wifiKeuze.hotspot();
  s.doosOk = aanmelder.gelukt();
  s.rssi = s.verbonden ? WiFi.RSSI() : 0;
  return s;
}

/** POST /geluid?naam=klok.wav: de body (een WAV, of een FormData met één bestand) gaat rechtstreeks naar LittleFS */
void upload(WiFiClient &c, const Verzoek &v) {
  if (!v.heeftLengte) { fout(c, "Content-Length ontbreekt.", 411); return; }
  std::string f, naam;
  if (v.heeft("naam")) {
    naam = geluidNaam(v.arg("naam"), f);
    if (naam.empty()) { slik(c, v.lengte); fout(c, f); return; }
  }
  if (!fsOk) { slik(c, v.lengte); fout(c, "Het geheugen (LittleFS) werkt niet.", 500); return; }
  int oud = naam.empty() ? -1 : zoek(geluiden, naam);
  size_t plaats = vrij() + (oud >= 0 ? geluiden[oud].bytes : 0);
  if (v.lengte + RESERVE > plaats) {
    slik(c, v.lengte);
    char t[160];
    snprintf(t, sizeof t, "Te weinig plaats: %u kB nodig, %u kB vrij. Wis eerst een geluid of maak het korter (16 kHz mono).", (unsigned)(v.lengte / 1024), (unsigned)((plaats > RESERVE ? plaats - RESERVE : 0) / 1024));
    fout(c, t, 507);
    return;
  }
  if (oud < 0 && geluiden.size() >= MAX_GELUIDEN) { slik(c, v.lengte); fout(c, "Al 64 geluiden op dit kastje: wis er eerst een."); return; }
  if (v.doorgaan) c.print("HTTP/1.1 100 Continue\r\n\r\n");
  File bestand = LittleFS.open(BESTAND_UPLOAD, "w");
  if (!bestand) { slik(c, v.lengte); fout(c, "Kan het bestand niet maken.", 500); return; }
  MultipartFilter mp(v.grens, v.lengte);
  const bool multipart = !v.grens.empty();
  static uint8_t buf[1436], kop[KOP_BUF];
  size_t kopN = 0, gelezen = 0, geschreven = 0;
  bool goed = true;
  std::string reden;
  Wav w;
  uint32_t laatst = millis();
  while (gelezen < v.lengte) {
    int a = c.available();
    if (a <= 0) {
      if (!c.connected() || millis() - laatst > STIL_MS) { goed = false; reden = "De upload is afgebroken."; break; }
      delay(1);
      continue;
    }
    size_t wil = v.lengte - gelezen;
    if (wil > sizeof buf) wil = sizeof buf;
    int k = c.read(buf, wil);
    if (k <= 0) continue;
    laatst = millis();
    gelezen += (size_t)k;
    if (!goed) continue; // de rest wegslikken
    size_t b = 0, l = (size_t)k;
    if (multipart && !mp.voeg(buf, (size_t)k, b, l)) { goed = false; reden = "De upload (multipart) is onleesbaar."; continue; }
    if (l == 0) continue;
    // het begin nakijken voor er veel geschreven wordt
    if (kopN < KOP_BUF) {
      size_t n = l < KOP_BUF - kopN ? l : KOP_BUF - kopN;
      memcpy(kop + kopN, buf + b, n);
      kopN += n;
    }
    if (bestand.write(buf + b, l) != l) { goed = false; reden = "Schrijven in het geheugen mislukt (vol?)."; continue; }
    geschreven += l;
    if (kopN == KOP_BUF && !w.ok) {
      w = leesWav(kop, kopN, 0);
      if (!w.ok) { goed = false; reden = w.fout; }
    }
  }
  bestand.close();
  if (goed) {
    w = leesWav(kop, kopN, (uint32_t)geschreven);
    if (!w.ok) { goed = false; reden = w.fout; }
  }
  if (goed && naam.empty()) {
    naam = geluidNaam(mp.bestandsnaam(), f);
    if (naam.empty()) { goed = false; reden = "Geef een naam mee: /geluid?naam=klok.wav"; }
  }
  if (!goed) { LittleFS.remove(BESTAND_UPLOAD); fout(c, "Geluid niet bewaard: " + reden); return; }
  stopAls(naam);
  std::string pad = "/" + naam;
  LittleFS.remove(pad.c_str());
  if (!LittleFS.rename(BESTAND_UPLOAD, pad.c_str())) { LittleFS.remove(BESTAND_UPLOAD); fout(c, "Hernoemen mislukt.", 500); return; }
  zetGeluid(geluiden, {naam, w.seconden(), (uint32_t)geschreven});
  aanmelder.snel(millis());
  JsonDocument d;
  d["ok"] = true;
  d["naam"] = naam;
  d["s"] = tiende(w.seconden());
  d["vrij"] = vrij();
  std::string t;
  serializeJson(d, t);
  antwoord(c, 200, t);
  Serial.printf("Geluid %s bewaard (%u bytes, %.1f s, %u Hz)\n", naam.c_str(), (unsigned)geschreven, w.seconden(), (unsigned)w.hz);
}

void bediend(WiFiClient &c) {
  uint32_t tot = millis() + KOP_MS;
  std::string regel;
  Verzoek v;
  if (!leesRegel(c, regel, tot) || !leesVerzoekRegel(regel, v)) { fout(c, "Geen HTTP-verzoek."); return; }
  for (size_t n = 0;; n++) {
    if (!leesRegel(c, regel, tot)) { fout(c, "De kop van het verzoek is te lang of kwam niet.", 431); return; }
    if (regel.empty()) break;
    if (n >= MAX_KOPREGELS || !leesKopRegel(regel, v)) { fout(c, "Ongeldige kop.", 400); return; }
  }
  const std::string &m = v.methode, &p = v.pad;
  if (m == "OPTIONS") { antwoord(c, 204, ""); return; } // CORS-voorvraag van de browser
  if (p == "/geluid" && m == "POST") { upload(c, v); return; }
  std::string body, f;
  if (v.lengte > MAX_JSON) { slik(c, v.lengte); fout(c, "Het verzoek is te groot.", 413); return; }
  if (v.lengte && !leesBody(c, v.lengte, body)) { fout(c, "Het verzoek kwam niet helemaal aan.", 408); return; }

  if (p == "/" && m == "GET") { antwoord(c, 200, PAGINA, "text/html; charset=utf-8"); return; }
  if (p == "/info" && m == "GET") { antwoord(c, 200, infoJson(status(), geluiden)); return; }
  if (p == "/speel" && m == "POST") {
    Speel s;
    if (!leesSpeel(body.data(), body.size(), s, f)) { fout(c, f); return; }
    if (zoek(geluiden, s.geluid) < 0) { fout(c, "Geluid \"" + s.geluid + "\" staat niet op kastje " + cfg.naam + "."); return; }
    stuur(s.geluid, s.volume, false);
    antwoord(c, 200, okJson());
    return;
  }
  if (p == "/stop" && m == "POST") { stuur("", 0, true); antwoord(c, 200, okJson()); return; }
  if (p == "/geluid" && m == "DELETE") {
    std::string naam = geluidNaam(v.arg("naam"), f);
    if (naam.empty()) { fout(c, f); return; }
    if (zoek(geluiden, naam) < 0) { fout(c, "Geluid \"" + naam + "\" bestaat niet."); return; }
    stopAls(naam);
    LittleFS.remove(("/" + naam).c_str());
    wisGeluid(geluiden, naam);
    aanmelder.snel(millis());
    antwoord(c, 200, okJson());
    return;
  }
  if (p == "/naam" && m == "POST") {
    std::string naam;
    if (!leesNaam(body.data(), body.size(), naam, f)) { fout(c, f); return; }
    cfg.naam = naam;
    bewaarConfig();
    aanmelder.snel(millis());
    antwoord(c, 200, okJson());
    return;
  }
  if (p == "/volume" && m == "POST") {
    int vol;
    if (!leesVolume(body.data(), body.size(), vol, f)) { fout(c, f); return; }
    cfg.volume = vol;
    bewaarConfig();
    antwoord(c, 200, okJson());
    return;
  }
  if (p == "/wifi" && m == "POST") {
    Config nieuw = cfg;
    if (!leesWifi(body.data(), body.size(), nieuw, f)) { fout(c, f); return; }
    cfg = nieuw;
    bewaarConfig();
    antwoord(c, 200, okJson());
    c.stop();
    delay(100);
    WiFi.disconnect(false, false);
    wifiKeuze.opnieuw(millis());
    WiFi.begin(cfg.ssid.c_str(), cfg.wachtwoord.empty() ? nullptr : cfg.wachtwoord.c_str());
    return;
  }
  const bool bekend = p == "/" || p == "/info" || p == "/speel" || p == "/stop" || p == "/geluid" || p == "/naam" || p == "/volume" || p == "/wifi";
  if (bekend) fout(c, "Methode " + m + " kan niet op " + p + ".", 405);
  else fout(c, "Onbekend adres: " + p, 404);
}

// ---------------------------------------------------------------- statuslampje
void lampje(uint32_t nu) {
  static uint32_t vorige = 0;
  if (nu - vorige < 200) return;
  vorige = nu;
  const bool knip = (nu / 500) % 2;
  if (!speelt().empty()) neopixelWrite(PIN_LED, 20, 20, 20);
  else if (WiFi.status() == WL_CONNECTED) neopixelWrite(PIN_LED, aanmelder.gelukt() ? 0 : 20, 20, 0);
  else if (wifiKeuze.hotspot()) neopixelWrite(PIN_LED, 0, 0, 25);
  else neopixelWrite(PIN_LED, knip ? 25 : 0, knip ? 8 : 0, 0);
}

} // namespace

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SD, OUTPUT);
  digitalWrite(PIN_SD, LOW); // versterker uit tot er iets speelt
  pinMode(PIN_BOOT, INPUT_PULLUP);
  neopixelWrite(PIN_LED, 0, 0, 0);
  uint8_t mac[6];
  WiFi.macAddress(mac);
  id = kastjeId(mac);
  apNaam = "Geluidskastje-" + id.substr(2);
  hostNaam = "kastje-" + id;
  fsOk = LittleFS.begin(true);
  if (!fsOk) Serial.println("LittleFS werkt niet: geen geluiden en geen instellingen");
  laadConfig();
  if (fsOk) leesGeluiden();
  Serial.printf("Geluidskastje %s (%s), firmware %s, %u geluiden, %u kB vrij\n", cfg.naam.c_str(), id.c_str(), VERSIE, (unsigned)geluiden.size(), (unsigned)(vrij() / 1024));
  slot = xSemaphoreCreateMutex();
  opdrachten = xQueueCreate(4, sizeof(Opdracht));
  xTaskCreatePinnedToCore(spelerTaak, "speler", 6144, nullptr, 5, nullptr, 1);
  wifiKeuze.start(millis());
  wifiStart();
  server.begin();
  if (MDNS.begin(hostNaam.c_str())) MDNS.addService("http", "tcp", 80);
}

void loop() {
  const uint32_t nu = millis();
  const bool verbonden = WiFi.status() == WL_CONNECTED;
  switch (wifiKeuze.stap(verbonden, WiFi.softAPgetStationNum(), nu)) {
    case WifiActie::hotspotAan: hotspot(true); break;
    case WifiActie::hotspotUit: hotspot(false); break;
    default: break;
  }
  if (aanmelder.stap(verbonden, nu)) {
    bool ok = aanmelden();
    aanmelder.klaar(ok, millis());
    if (!ok) Serial.printf("Aanmelden bij %s mislukt\n", cfg.doos.c_str());
  }
  if (bootKnop.stap(digitalRead(PIN_BOOT) == LOW, nu)) {
    Serial.println("BOOT 5 s: wifi terug naar Treinbaan / treinbaan");
    cfg.ssid = STD_SSID;
    cfg.wachtwoord = STD_WACHTWOORD;
    cfg.doos = STD_DOOS;
    bewaarConfig();
    WiFi.disconnect(false, false);
    wifiKeuze.opnieuw(millis());
    WiFi.begin(cfg.ssid.c_str(), cfg.wachtwoord.c_str());
  }
  WiFiClient c = server.available();
  if (c) {
    bediend(c);
    c.flush();
    delay(2);
    c.stop();
  }
  lampje(nu);
  delay(2);
}
