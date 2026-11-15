// De logica van het geluidskastje zonder hardware (testen op de pc: test/test_kastje en test/test_wav):
//   - de kop van een WAV-bestand lezen en nakijken (PCM 16-bit mono, 8 tot 22,05 kHz)
//   - het volume (0..100, kwadratisch zoals het oor hoort) op de samples, mono naar de 2 kanalen van I2S
//   - namen: van een geluid (bestandsnaam in LittleFS) en van het kastje
//   - de instellingen (/kastje.json) en de JSON van de API: /info, aanmelden bij de doos, de verzoeken
// Contract versie 6 (treinverlichting): het kastje meldt zich elke 30 s aan bij de doos met
//   POST http://192.168.4.1/api/kastje {"actie":"aanmelden","id":"a1b2c3","naam":"Kerk","ip":"192.168.4.23",
//                                      "geluiden":[{"naam":"klok.wav","s":4.2}],"versie":"1.0.0"}
// en antwoordt zelf op GET /info, POST /speel, /stop, /geluid?naam=.., DELETE /geluid?naam=.., POST /naam, /volume, /wifi.
// Elk antwoord: {"ok":true,...} of HTTP 400 {"ok":false,"fout":"..."}.
#pragma once
#include <ArduinoJson.h>
#include <math.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include <string>
#include <vector>

namespace gk {

constexpr const char *VERSIE = "1.0.0";
constexpr uint32_t MIN_HZ = 8000, MAX_HZ = 22050;
constexpr size_t MAX_GELUID_NAAM = 40;  // met ".wav"
constexpr size_t MAX_KASTJE_NAAM = 32;  // bytes (UTF-8)
constexpr size_t MAX_GELUIDEN = 64;
constexpr size_t MAX_JSON = 2048;       // een verzoek of /kastje.json
constexpr const char *STD_SSID = "Treinbaan";
constexpr const char *STD_WACHTWOORD = "treinbaan";
constexpr const char *STD_DOOS = "192.168.4.1";

// ---------------------------------------------------------------- WAV
inline uint16_t le16(const uint8_t *p) { return (uint16_t)(p[0] | (p[1] << 8)); }
inline uint32_t le32(const uint8_t *p) { return (uint32_t)p[0] | ((uint32_t)p[1] << 8) | ((uint32_t)p[2] << 16) | ((uint32_t)p[3] << 24); }

struct Wav {
  bool ok = false;
  const char *fout = "";
  uint16_t formaat = 0, kanalen = 0, bits = 0;
  uint32_t hz = 0;
  uint32_t dataStart = 0; // waar de samples beginnen (bytes vanaf het begin van het bestand)
  uint32_t dataBytes = 0; // hoeveel bytes samples (altijd even)
  double seconden() const { return hz && kanalen && bits ? (double)dataBytes / (kanalen * (bits / 8)) / hz : 0.0; }
};

/**
 * De kop van een WAV-bestand uit de eerste n bytes (b). totaal = de grootte van het hele bestand (0 = onbekend): een
 * data-blok met lengte 0 of 0xFFFFFFFF (gestreamd opgenomen) of langer dan het bestand loopt dan tot het einde.
 * Blokken voor "data" (LIST, fact, bext ...) worden overgeslagen; WAVE_FORMAT_EXTENSIBLE met PCM telt als PCM.
 */
inline Wav leesWav(const uint8_t *b, size_t n, uint32_t totaal = 0) {
  Wav w;
  if (n < 12 || memcmp(b, "RIFF", 4) != 0 || memcmp(b + 8, "WAVE", 4) != 0) { w.fout = "Geen WAV-bestand (RIFF/WAVE ontbreekt)."; return w; }
  size_t p = 12;
  bool fmt = false;
  while (p + 8 <= n) {
    const uint8_t *c = b + p;
    uint32_t len = le32(c + 4);
    if (memcmp(c, "fmt ", 4) == 0) {
      if (len < 16 || p + 8 + 16 > n) { w.fout = "Het fmt-blok is te kort."; return w; }
      w.formaat = le16(c + 8);
      w.kanalen = le16(c + 10);
      w.hz = le32(c + 12);
      w.bits = le16(c + 22);
      if (w.formaat == 0xFFFE && len >= 40 && p + 8 + 26 <= n) w.formaat = le16(c + 8 + 24); // het subformaat
      fmt = true;
    } else if (memcmp(c, "data", 4) == 0) {
      if (!fmt) { w.fout = "Het data-blok staat voor het fmt-blok."; return w; }
      w.dataStart = (uint32_t)(p + 8);
      w.dataBytes = len;
      if (totaal) {
        if (totaal < w.dataStart) { w.fout = "Het bestand is korter dan zijn kop."; return w; }
        if (len == 0 || len == 0xFFFFFFFFu || (uint64_t)w.dataStart + len > totaal) w.dataBytes = totaal - w.dataStart;
      }
      w.dataBytes &= ~1u;
      if (w.formaat != 1) { w.fout = "Geen gewone PCM (bv. gecomprimeerd of float): bewaar als WAV, signed 16-bit PCM."; return w; }
      if (w.bits != 16) { w.fout = "Geen 16-bit: bewaar als WAV, signed 16-bit PCM."; return w; }
      if (w.kanalen != 1) { w.fout = "Stereo: maak er mono van (Audacity: Sporen > Mixen > Stereo naar mono mixen)."; return w; }
      if (w.hz < MIN_HZ || w.hz > MAX_HZ) { w.fout = "Samplefrequentie buiten 8000..22050 Hz: zet de projectfrequentie op 16000 Hz."; return w; }
      if (w.dataBytes == 0) { w.fout = "Het geluid is leeg."; return w; }
      w.ok = true;
      return w;
    }
    if (len > n) break; // het volgende blok begint buiten wat we hebben
    p += 8 + (size_t)len + (len & 1u); // blokken met een oneven lengte hebben een opvulbyte
  }
  w.fout = fmt ? "Het data-blok begint te ver in het bestand (kop groter dan 4 kB)." : "Het fmt-blok ontbreekt.";
  return w;
}

/** een eenvoudige kop van 44 bytes (PCM 16-bit mono) voor n samples op hz: voor de tests en een proeftoon */
inline std::vector<uint8_t> wavKop(uint32_t hz, uint32_t samples, uint16_t kanalen = 1, uint16_t bits = 16, uint16_t formaat = 1) {
  std::vector<uint8_t> k(44);
  auto z32 = [&](size_t i, uint32_t v) { for (int j = 0; j < 4; j++) k[i + j] = (uint8_t)(v >> (8 * j)); };
  auto z16 = [&](size_t i, uint16_t v) { k[i] = (uint8_t)v; k[i + 1] = (uint8_t)(v >> 8); };
  uint32_t data = samples * kanalen * (bits / 8);
  memcpy(&k[0], "RIFF", 4); z32(4, 36 + data); memcpy(&k[8], "WAVE", 4);
  memcpy(&k[12], "fmt ", 4); z32(16, 16); z16(20, formaat); z16(22, kanalen); z32(24, hz);
  z32(28, hz * kanalen * (bits / 8)); z16(32, (uint16_t)(kanalen * (bits / 8))); z16(34, bits);
  memcpy(&k[36], "data", 4); z32(40, data);
  return k;
}

// ---------------------------------------------------------------- volume
inline int begrens(int v, int lo, int hi) { return v < lo ? lo : v > hi ? hi : v; }
/** volume 0..100 -> factor in Q15 (32768 = 1): kwadratisch, zodat 50 ongeveer half zo luid klinkt (-12 dB) */
inline uint16_t volumeFactor(int volume) {
  uint32_t v = (uint32_t)begrens(volume, 0, 100);
  return (uint16_t)((v * v * 32768u) / 10000u);
}
/** het volume van één keer spelen (0..100, van de doos) maal het volume van het kastje (0..100, /volume) */
inline int samenVolume(int speelVolume, int kastjeVolume) { return begrens(speelVolume, 0, 100) * begrens(kastjeVolume, 0, 100) / 100; }
inline int16_t schaal(int16_t s, uint16_t factor) { return (int16_t)(((int32_t)s * (int32_t)factor) >> 15); }
/** n mono-samples naar n stereo-frames (links = rechts) met het volume erop; de MAX98357A speelt (L+R)/2 of L */
inline void naarStereo(const int16_t *in, size_t n, int16_t *uit, uint16_t factor) {
  for (size_t i = 0; i < n; i++) { int16_t v = schaal(in[i], factor); uit[2 * i] = v; uit[2 * i + 1] = v; }
}

// ---------------------------------------------------------------- namen
inline std::string trim(const std::string &s) {
  size_t a = 0, e = s.size();
  while (a < e && (s[a] == ' ' || s[a] == '\t' || s[a] == '\r' || s[a] == '\n')) a++;
  while (e > a && (s[e - 1] == ' ' || s[e - 1] == '\t' || s[e - 1] == '\r' || s[e - 1] == '\n')) e--;
  return s.substr(a, e - a);
}
/**
 * de naam van een geluid (zoals hij in LittleFS staat): kleine letters, cijfers, '-', '_' en '.', eindigt op ".wav"
 * (zonder extensie: ".wav" erbij), hoogstens 40 tekens. Hoofdletters worden kleine letters, spaties een '-'.
 * Geeft "" en een foutmelding als het niet kan.
 */
inline std::string geluidNaam(const std::string &in, std::string &fout) {
  std::string s = trim(in), uit;
  for (char c : s) {
    if (c >= 'A' && c <= 'Z') c = (char)(c - 'A' + 'a');
    if (c == ' ') c = '-';
    bool goed = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.';
    if (!goed) { fout = "Naam van het geluid: alleen letters a-z, cijfers, '-', '_' en '.' (geen accenten of /)."; return ""; }
    uit += c;
  }
  if (uit.empty()) { fout = "Geef het geluid een naam (bv. klok.wav)."; return ""; }
  size_t punt = uit.rfind('.');
  if (punt == std::string::npos) uit += ".wav";
  else if (uit.substr(punt) != ".wav") { fout = "Alleen WAV-bestanden (de naam eindigt op .wav)."; return ""; }
  if (uit[0] == '.' || uit.find("..") != std::string::npos || uit == ".wav") { fout = "Ongeldige naam van het geluid."; return ""; }
  if (uit.size() > MAX_GELUID_NAAM) { fout = "De naam van het geluid is te lang (hoogstens 40 tekens met .wav)."; return ""; }
  return uit;
}
/** de naam van het kastje (bv. "Kerk"): 1 tot 32 bytes UTF-8, geen stuurtekens; spaties aan de randen vallen weg */
inline std::string kastjeNaam(const std::string &in, std::string &fout) {
  std::string s = trim(in);
  if (s.empty()) { fout = "Geef het kastje een naam (bv. Kerk)."; return ""; }
  if (s.size() > MAX_KASTJE_NAAM) { fout = "De naam van het kastje is te lang (hoogstens 32 tekens)."; return ""; }
  for (unsigned char c : s) if (c < 0x20 || c == 0x7F) { fout = "De naam van het kastje bevat een stuurteken."; return ""; }
  return s;
}
/** het id van het kastje: de laatste 3 bytes van het MAC-adres in kleine hex ("a1b2c3") */
inline std::string kastjeId(const uint8_t mac[6]) {
  static const char *h = "0123456789abcdef";
  std::string s;
  for (int i = 3; i < 6; i++) { s += h[mac[i] >> 4]; s += h[mac[i] & 15]; }
  return s;
}
inline bool geldigIp(const std::string &s) {
  int delen = 0, getal = -1;
  for (size_t i = 0; i <= s.size(); i++) {
    char c = i < s.size() ? s[i] : '.';
    if (c >= '0' && c <= '9') { getal = (getal < 0 ? 0 : getal * 10) + (c - '0'); if (getal > 255) return false; }
    else if (c == '.') { if (getal < 0) return false; delen++; getal = -1; }
    else return false;
  }
  return delen == 4;
}

// ---------------------------------------------------------------- instellingen (/kastje.json)
struct Config {
  std::string naam;               // leeg = "Kastje <id>" (main.cpp)
  int volume = 80;                // 0..100, het volume van het kastje zelf
  std::string ssid = STD_SSID;    // het netwerk van de doos
  std::string wachtwoord = STD_WACHTWOORD;
  std::string doos = STD_DOOS;    // waar het kastje zich aanmeldt
};

inline std::string configNaarJson(const Config &c) {
  JsonDocument d;
  d["versie"] = 1;
  d["naam"] = c.naam;
  d["volume"] = c.volume;
  d["ssid"] = c.ssid;
  d["wachtwoord"] = c.wachtwoord;
  d["doos"] = c.doos;
  std::string s;
  serializeJson(d, s);
  return s;
}
/** leest /kastje.json; elke ontbrekende of ongeldige waarde krijgt de standaard. false = onleesbaar (alles standaard) */
inline bool configVanJson(const char *t, size_t n, Config &c) {
  c = Config();
  if (n > MAX_JSON) return false;
  JsonDocument d;
  if (deserializeJson(d, t, n) || !d.is<JsonObject>()) return false;
  std::string fout;
  if (d["naam"].is<const char *>()) c.naam = kastjeNaam(d["naam"].as<const char *>(), fout);
  if (d["volume"].is<int>()) c.volume = begrens(d["volume"].as<int>(), 0, 100);
  if (d["ssid"].is<const char *>()) { std::string s = d["ssid"].as<const char *>(); if (!s.empty() && s.size() <= 32) c.ssid = s; }
  if (d["wachtwoord"].is<const char *>()) { std::string w = d["wachtwoord"].as<const char *>(); if (w.empty() || (w.size() >= 8 && w.size() <= 63)) c.wachtwoord = w; }
  if (d["doos"].is<const char *>()) { std::string i = d["doos"].as<const char *>(); if (geldigIp(i)) c.doos = i; }
  return true;
}

// ---------------------------------------------------------------- verzoeken
inline bool leesObject(const char *t, size_t n, JsonDocument &d, std::string &fout) {
  if (n > MAX_JSON) { fout = "Het verzoek is te groot."; return false; }
  if (deserializeJson(d, t, n) || !d.is<JsonObject>()) { fout = "Geen geldige JSON (verwacht een object)."; return false; }
  return true;
}
/** volume uit een veld: een geheel getal 0..100 (ontbreekt: std) */
inline bool leesVolumeVeld(JsonVariantConst v, int std, int &uit, std::string &fout) {
  if (v.isNull()) { uit = std; return true; }
  if (!v.is<int>() && !v.is<float>()) { fout = "volume moet een getal 0..100 zijn."; return false; }
  double x = v.as<double>();
  if (x < 0 || x > 100) { fout = "volume moet tussen 0 en 100 liggen."; return false; }
  uit = (int)lround(x);
  return true;
}

struct Speel { std::string geluid; int volume = 100; };
/** POST /speel {"geluid":"klok.wav","volume":80}; zonder volume: 100 (dan telt alleen het volume van het kastje) */
inline bool leesSpeel(const char *t, size_t n, Speel &s, std::string &fout) {
  JsonDocument d;
  if (!leesObject(t, n, d, fout)) return false;
  if (!d["geluid"].is<const char *>()) { fout = "geluid ontbreekt (bv. {\"geluid\":\"klok.wav\"})."; return false; }
  s.geluid = geluidNaam(d["geluid"].as<const char *>(), fout);
  if (s.geluid.empty()) return false;
  return leesVolumeVeld(d["volume"], 100, s.volume, fout);
}
/** POST /naam {"naam":"Kerk"} */
inline bool leesNaam(const char *t, size_t n, std::string &naam, std::string &fout) {
  JsonDocument d;
  if (!leesObject(t, n, d, fout)) return false;
  if (!d["naam"].is<const char *>()) { fout = "naam ontbreekt (bv. {\"naam\":\"Kerk\"})."; return false; }
  naam = kastjeNaam(d["naam"].as<const char *>(), fout);
  return !naam.empty();
}
/** POST /volume {"volume":80} */
inline bool leesVolume(const char *t, size_t n, int &v, std::string &fout) {
  JsonDocument d;
  if (!leesObject(t, n, d, fout)) return false;
  if (d["volume"].isNull()) { fout = "volume ontbreekt (bv. {\"volume\":80})."; return false; }
  return leesVolumeVeld(d["volume"], 0, v, fout);
}
/** POST /wifi {"ssid":"Treinbaan","wachtwoord":"treinbaan","doos":"192.168.4.1"} (doos mag ontbreken) */
inline bool leesWifi(const char *t, size_t n, Config &c, std::string &fout) {
  JsonDocument d;
  if (!leesObject(t, n, d, fout)) return false;
  if (!d["ssid"].is<const char *>()) { fout = "ssid ontbreekt."; return false; }
  std::string ssid = d["ssid"].as<const char *>(), ww = d["wachtwoord"].is<const char *>() ? d["wachtwoord"].as<const char *>() : "";
  if (ssid.empty() || ssid.size() > 32) { fout = "ssid: 1 tot 32 tekens."; return false; }
  if (!ww.empty() && (ww.size() < 8 || ww.size() > 63)) { fout = "wachtwoord: leeg (open netwerk) of 8 tot 63 tekens."; return false; }
  std::string doos = c.doos;
  if (d["doos"].is<const char *>()) {
    doos = d["doos"].as<const char *>();
    if (!geldigIp(doos)) { fout = "doos: een IP-adres zoals 192.168.4.1."; return false; }
  }
  c.ssid = ssid; c.wachtwoord = ww; c.doos = doos;
  return true;
}

// ---------------------------------------------------------------- antwoorden
struct Geluid {
  std::string naam;
  double s;
  uint32_t bytes;
  Geluid() : s(0), bytes(0) {}
  Geluid(const std::string &n, double sec, uint32_t b) : naam(n), s(sec), bytes(b) {}
};
inline double tiende(double s) { return round(s * 10.0) / 10.0; }

inline std::string okJson() { return "{\"ok\":true}"; }
inline std::string foutJson(const std::string &fout) {
  JsonDocument d;
  d["ok"] = false;
  d["fout"] = fout;
  std::string s;
  serializeJson(d, s);
  return s;
}
inline void geluidenIn(JsonArray a, const std::vector<Geluid> &g, bool bytes) {
  for (const Geluid &x : g) {
    JsonObject o = a.add<JsonObject>();
    o["naam"] = x.naam;
    o["s"] = tiende(x.s);
    if (bytes) o["bytes"] = x.bytes;
  }
}
/** het aanmelden bij de doos (POST http://<doos>/api/kastje) */
inline std::string aanmeldJson(const std::string &id, const std::string &naam, const std::string &ip, const std::vector<Geluid> &g) {
  JsonDocument d;
  d["actie"] = "aanmelden";
  d["id"] = id;
  d["naam"] = naam;
  d["ip"] = ip;
  geluidenIn(d["geluiden"].to<JsonArray>(), g, false);
  d["versie"] = VERSIE;
  std::string s;
  serializeJson(d, s);
  return s;
}
struct Status {
  std::string id, naam, ip, speelt, ssid;
  int volume = 80;
  uint32_t vrij = 0, totaal = 0;
  bool verbonden = false, hotspot = false, doosOk = false;
  int rssi = 0;
};
/** GET /info */
inline std::string infoJson(const Status &st, const std::vector<Geluid> &g) {
  JsonDocument d;
  d["ok"] = true;
  d["id"] = st.id;
  d["naam"] = st.naam;
  geluidenIn(d["geluiden"].to<JsonArray>(), g, true);
  d["vrij"] = st.vrij;
  d["totaal"] = st.totaal;
  d["versie"] = VERSIE;
  d["volume"] = st.volume;
  if (st.speelt.empty()) d["speelt"] = nullptr; else d["speelt"] = st.speelt;
  d["ip"] = st.ip;
  JsonObject w = d["wifi"].to<JsonObject>();
  w["ssid"] = st.ssid;
  w["verbonden"] = st.verbonden;
  w["hotspot"] = st.hotspot;
  w["rssi"] = st.rssi;
  w["doosOk"] = st.doosOk;
  std::string s;
  serializeJson(d, s);
  return s;
}

/** de geluiden op naam gesorteerd; zoek() geeft -1 als het er niet is */
inline int zoek(const std::vector<Geluid> &g, const std::string &naam) {
  for (size_t i = 0; i < g.size(); i++) if (g[i].naam == naam) return (int)i;
  return -1;
}
inline void zetGeluid(std::vector<Geluid> &g, const Geluid &x) {
  int i = zoek(g, x.naam);
  if (i >= 0) { g[i] = x; return; }
  size_t p = 0;
  while (p < g.size() && g[p].naam < x.naam) p++;
  g.insert(g.begin() + (long)p, x);
}
inline bool wisGeluid(std::vector<Geluid> &g, const std::string &naam) {
  int i = zoek(g, naam);
  if (i < 0) return false;
  g.erase(g.begin() + i);
  return true;
}

} // namespace gk
