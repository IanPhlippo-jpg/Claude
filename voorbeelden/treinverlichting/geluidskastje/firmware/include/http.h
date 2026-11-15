// Een kleine HTTP/1.1-server zonder hardware (testen: test/test_http): de verzoekregel, de kopregels, de
// queryparameters (URL-gecodeerd), de antwoordkop met CORS (Access-Control-Allow-Origin: *) en het uitpakken van een
// upload in multipart/form-data.
// Waarom niet de WebServer van Arduino-ESP32 (2.0.17)? Een POST met een binaire body (de WAV) kan daar alleen via de
// "raw"-handler, en dan worden de queryparameters (?naam=klok.wav) niet gelezen; de gewone weg zet de body in een String
// en breekt af op de eerste nulbyte. main.cpp leest de verzoeken dus zelf met WiFiServer en deze hulpjes.
#pragma once
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include <string>
#include <utility>
#include <vector>

namespace gk {

constexpr size_t MAX_KOPREGEL = 1024; // langer = 431
constexpr size_t MAX_KOPREGELS = 40;

inline int hexWaarde(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}
/** %xx en '+' (spatie) terug naar tekst; een kapotte %-reeks blijft staan */
inline std::string urlDecode(const std::string &s) {
  std::string u;
  for (size_t i = 0; i < s.size(); i++) {
    char c = s[i];
    if (c == '+') u += ' ';
    else if (c == '%' && i + 2 < s.size() && hexWaarde(s[i + 1]) >= 0 && hexWaarde(s[i + 2]) >= 0) {
      u += (char)(hexWaarde(s[i + 1]) * 16 + hexWaarde(s[i + 2]));
      i += 2;
    } else u += c;
  }
  return u;
}
inline bool gelijkZonderHoofdletters(const std::string &a, const char *b) {
  size_t n = strlen(b);
  if (a.size() != n) return false;
  for (size_t i = 0; i < n; i++) {
    char x = a[i], y = b[i];
    if (x >= 'A' && x <= 'Z') x = (char)(x - 'A' + 'a');
    if (y >= 'A' && y <= 'Z') y = (char)(y - 'A' + 'a');
    if (x != y) return false;
  }
  return true;
}

struct Verzoek {
  std::string methode, pad;
  std::vector<std::pair<std::string, std::string>> args;
  bool heeftLengte = false;
  size_t lengte = 0;
  std::string type;        // Content-Type
  std::string grens;       // de boundary van multipart/form-data (leeg = geen multipart)
  bool doorgaan = false;   // Expect: 100-continue (curl doet dat bij een grote upload)
  std::string arg(const char *naam) const {
    for (const auto &a : args) if (a.first == naam) return a.second;
    return "";
  }
  bool heeft(const char *naam) const {
    for (const auto &a : args) if (a.first == naam) return true;
    return false;
  }
};

inline void leesQuery(const std::string &q, Verzoek &v) {
  size_t a = 0;
  while (a < q.size()) {
    size_t e = q.find('&', a);
    if (e == std::string::npos) e = q.size();
    std::string deel = q.substr(a, e - a);
    if (!deel.empty()) {
      size_t is = deel.find('=');
      if (is == std::string::npos) v.args.emplace_back(urlDecode(deel), "");
      else v.args.emplace_back(urlDecode(deel.substr(0, is)), urlDecode(deel.substr(is + 1)));
    }
    a = e + 1;
  }
}
/** "POST /geluid?naam=klok.wav HTTP/1.1" -> methode, pad, args; false als de regel geen HTTP-verzoek is */
inline bool leesVerzoekRegel(const std::string &regel, Verzoek &v) {
  size_t s1 = regel.find(' ');
  if (s1 == std::string::npos || s1 == 0) return false;
  size_t s2 = regel.find(' ', s1 + 1);
  if (s2 == std::string::npos) return false;
  if (regel.compare(s2 + 1, 5, "HTTP/") != 0) return false;
  v.methode = regel.substr(0, s1);
  std::string doel = regel.substr(s1 + 1, s2 - s1 - 1);
  if (doel.empty() || doel[0] != '/') return false;
  size_t vraag = doel.find('?');
  v.pad = urlDecode(doel.substr(0, vraag));
  if (vraag != std::string::npos) leesQuery(doel.substr(vraag + 1), v);
  return true;
}
/** een kopregel ("Content-Length: 1234"); onbekende koppen worden genegeerd. false = ongeldige lengte */
inline bool leesKopRegel(const std::string &regel, Verzoek &v) {
  size_t dp = regel.find(':');
  if (dp == std::string::npos) return true;
  std::string naam = regel.substr(0, dp), w = regel.substr(dp + 1);
  while (!w.empty() && (w[0] == ' ' || w[0] == '\t')) w.erase(0, 1);
  while (!w.empty() && (w.back() == ' ' || w.back() == '\r')) w.pop_back();
  if (gelijkZonderHoofdletters(naam, "content-length")) {
    if (w.empty() || w.size() > 9) return false;
    size_t n = 0;
    for (char c : w) { if (c < '0' || c > '9') return false; n = n * 10 + (size_t)(c - '0'); }
    v.lengte = n;
    v.heeftLengte = true;
  } else if (gelijkZonderHoofdletters(naam, "content-type")) {
    v.type = w;
    std::string klein;
    for (char c : w) klein += (c >= 'A' && c <= 'Z') ? (char)(c - 'A' + 'a') : c;
    if (klein.rfind("multipart/form-data", 0) == 0) {
      size_t b = klein.find("boundary=");
      if (b != std::string::npos) {
        std::string g = w.substr(b + 9);
        size_t puntkomma = g.find(';');
        if (puntkomma != std::string::npos) g = g.substr(0, puntkomma);
        if (g.size() >= 2 && g.front() == '"' && g.back() == '"') g = g.substr(1, g.size() - 2);
        v.grens = g;
      }
    }
  } else if (gelijkZonderHoofdletters(naam, "expect")) {
    v.doorgaan = gelijkZonderHoofdletters(w, "100-continue");
  }
  return true;
}

inline const char *statusTekst(int code) {
  switch (code) {
    case 100: return "Continue";
    case 200: return "OK";
    case 204: return "No Content";
    case 400: return "Bad Request";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 408: return "Request Timeout";
    case 411: return "Length Required";
    case 413: return "Payload Too Large";
    case 431: return "Request Header Fields Too Large";
    case 500: return "Internal Server Error";
    case 507: return "Insufficient Storage";
    default: return "OK";
  }
}
/** de kop van een antwoord: altijd CORS voor iedereen (het dashboard van de doos uploadt rechtstreeks naar het kastje) en
 *  Connection: close (één verzoek per verbinding) */
inline std::string antwoordKop(int code, const char *type, size_t lengte) {
  char b[400];
  snprintf(b, sizeof b,
           "HTTP/1.1 %d %s\r\nContent-Type: %s\r\nContent-Length: %u\r\nAccess-Control-Allow-Origin: *\r\n"
           "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n"
           "Access-Control-Max-Age: 600\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
           code, statusTekst(code), type, (unsigned)lengte);
  return b;
}

/**
 * Pakt een upload in multipart/form-data uit terwijl hij binnenkomt (de browser stuurt een FormData zo): eerst de
 * kop van het deel (tot de lege regel), dan de inhoud, en op het einde "\r\n--<grens>--\r\n" die er niet bij hoort.
 * totaal = Content-Length van het hele verzoek. voeg() geeft per stuk welk deel ervan inhoud is (begin, lengte).
 */
class MultipartFilter {
 public:
  MultipartFilter(const std::string &grens, size_t totaal) : grens_(grens), totaal_(totaal), staart_(grens.size() + 8) {}
  /** stuk [b, b+n) erbij; inhoud = (begin, lengte) binnen dit stuk; false = de kop is kapot of te lang */
  bool voeg(const uint8_t *b, size_t n, size_t &begin, size_t &lengte) {
    begin = 0; lengte = 0;
    size_t i = 0;
    if (!inhoud_) {
      for (; i < n; i++) {
        kop_ += (char)b[i];
        if (kop_.size() > 2048) return false;
        size_t e = kop_.size();
        if (e >= 4 && kop_.compare(e - 4, 4, "\r\n\r\n") == 0) {
          if (kop_.compare(0, 2 + grens_.size(), "--" + grens_) != 0) return false;
          inhoud_ = true;
          gezien_ += i + 1;
          i++;
          break;
        }
      }
      if (!inhoud_) { gezien_ += n; return true; }
    }
    // de inhoud loopt tot totaal - staart
    size_t eind = totaal_ > staart_ ? totaal_ - staart_ : 0;
    size_t hier = n - i; // bytes van dit stuk vanaf i
    begin = i;
    if (gezien_ >= eind) lengte = 0;
    else lengte = hier < eind - gezien_ ? hier : eind - gezien_;
    gezien_ += hier;
    return true;
  }
  bool inInhoud() const { return inhoud_; }
  /** de naam van het bestand uit de kop van het deel (filename="..."), of "" */
  std::string bestandsnaam() const {
    size_t f = kop_.find("filename=\"");
    if (f == std::string::npos) return "";
    size_t e = kop_.find('"', f + 10);
    return e == std::string::npos ? "" : kop_.substr(f + 10, e - f - 10);
  }
  size_t inhoudLengte() const { size_t k = kop_.size(); return totaal_ > k + staart_ ? totaal_ - k - staart_ : 0; }

 private:
  std::string grens_, kop_;
  size_t totaal_, staart_, gezien_ = 0;
  bool inhoud_ = false;
};

} // namespace gk
