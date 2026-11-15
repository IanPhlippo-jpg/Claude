// Geluidskastjes (firmware 2.0.0), zonder hardware. Testen: test/test_api (eindpunt /api/kastje) en test_functies.
//
// Een kastje (ESP32-S3-Zero + MAX98357A, eigen firmware in ../geluidskastje/firmware) meldt zich elke 30 s aan:
//   POST /api/kastje {"actie":"aanmelden","id":"a1b2c3","naam":"Kerk","ip":"192.168.4.23",
//                     "geluiden":[{"naam":"klok.wav","s":4.2}],"versie":"1.0.0"}
// De doos onthoudt hoogstens 8 kastjes (niet bewaard: ze melden zich vanzelf opnieuw); niet gezien in 90 s = offline.
// Spelen, stoppen en hernoemen gaan als HTTP-opdracht naar het kastje: de Baan zet ze in een rij (hoogstens 8), een
// aparte taak in main.cpp stuurt ze (POST http://<ip>/speel {"geluid":"klok.wav","volume":80}, /stop, /naam).
// Een kastje zoeken gaat op naam (hoofdletters tellen niet) of op id.
#pragma once
#include <ArduinoJson.h>
#include <ctype.h>
#include <stdint.h>
#include <string.h>

#include <string>

#include "functies.h"

namespace trein {

constexpr int MAX_KASTJES = 8, MAX_GELUIDEN = 24, KASTJE_ID_LEN = 16, IP_LEN = 16, KASTJE_VERSIE_LEN = 12;
constexpr uint32_t KASTJE_ONLINE_MS = 90000;
constexpr int MAX_HTTP_RIJ = 8, HTTP_PAD_LEN = 12, HTTP_BODY_LEN = 112;

/** bestandsnaam van een geluid: 1..31 tekens, letters, cijfers, spatie, _ - . (geen / of ") */
inline bool geluidNaamGeldig(const char *n) {
  if (!n || !n[0] || strlen(n) >= (size_t)GELUID_LEN) return false;
  for (const char *p = n; *p; p++) {
    char c = *p;
    if (!(isalnum((unsigned char)c) || c == ' ' || c == '_' || c == '-' || c == '.')) return false;
  }
  return n[0] != '.';
}

/** een IPv4-adres als tekst (a.b.c.d) */
inline bool ipGeldig(const char *ip) {
  if (!ip || strlen(ip) >= (size_t)IP_LEN) return false;
  int delen = 0, waarde = -1;
  for (const char *p = ip;; p++) {
    if (*p >= '0' && *p <= '9') {
      waarde = (waarde < 0 ? 0 : waarde * 10) + (*p - '0');
      if (waarde > 255) return false;
    } else if (*p == '.' || *p == 0) {
      if (waarde < 0) return false;
      delen++;
      waarde = -1;
      if (*p == 0) break;
    } else {
      return false;
    }
  }
  return delen == 4;
}

inline bool zelfdeNaam(const char *a, const char *b) {
  for (; *a && *b; a++, b++)
    if (tolower((unsigned char)*a) != tolower((unsigned char)*b)) return false;
  return *a == *b;
}

struct Geluid {
  char naam[GELUID_LEN] = {0};
  uint16_t ds = 0; // duur in tienden van een seconde
};

struct Kastje {
  bool gebruikt = false;
  char id[KASTJE_ID_LEN] = {0};
  char naam[KASTJE_NAAM_LEN] = {0};
  char ip[IP_LEN] = {0};
  char versie[KASTJE_VERSIE_LEN] = {0};
  uint8_t nGeluiden = 0;
  Geluid geluid[MAX_GELUIDEN];
  uint32_t gezienMs = 0;
};

struct HttpOpdracht {
  char ip[IP_LEN] = {0};
  char pad[HTTP_PAD_LEN] = {0};   // "/speel", "/stop", "/naam"
  char body[HTTP_BODY_LEN] = {0}; // JSON
};

class Kastjes {
 public:
  Kastje k[MAX_KASTJES];

  bool online(int i, uint32_t nu) const { return k[i].gebruikt && nu - k[i].gezienMs < KASTJE_ONLINE_MS; }

  int zoek(const char *naamOfId) const {
    if (!naamOfId || !naamOfId[0]) return -1;
    for (int i = 0; i < MAX_KASTJES; i++)
      if (k[i].gebruikt && strcmp(k[i].id, naamOfId) == 0) return i;
    for (int i = 0; i < MAX_KASTJES; i++)
      if (k[i].gebruikt && zelfdeNaam(k[i].naam, naamOfId)) return i;
    return -1;
  }

  /** een aanmelding opnemen (nieuw of bijwerken). -1 = vol (8 kastjes die allemaal online zijn) */
  int aanmelden(const Kastje &nieuw, uint32_t nu) {
    int plaats = -1;
    for (int i = 0; i < MAX_KASTJES && plaats < 0; i++)
      if (k[i].gebruikt && strcmp(k[i].id, nieuw.id) == 0) plaats = i;
    for (int i = 0; i < MAX_KASTJES && plaats < 0; i++)
      if (!k[i].gebruikt) plaats = i;
    if (plaats < 0) {
      // vol: het langst offline kastje maakt plaats
      for (int i = 0; i < MAX_KASTJES; i++)
        if (!online(i, nu) && (plaats < 0 || (int32_t)(k[i].gezienMs - k[plaats].gezienMs) < 0)) plaats = i;
      if (plaats < 0) return -1;
    }
    k[plaats] = nieuw;
    k[plaats].gebruikt = true;
    k[plaats].gezienMs = nu;
    return plaats;
  }

  /** een HTTP-opdracht in de rij; false = de rij is vol */
  bool opdracht(const char *ip, const char *pad, const std::string &body) {
    if (nRij_ >= MAX_HTTP_RIJ || body.size() >= (size_t)HTTP_BODY_LEN) return false;
    HttpOpdracht &o = rij_[nRij_++];
    o = HttpOpdracht();
    strncpy(o.ip, ip, IP_LEN - 1);
    strncpy(o.pad, pad, HTTP_PAD_LEN - 1);
    strcpy(o.body, body.c_str());
    return true;
  }

  /** speel een geluid op een kastje (naam of id). Fout: "" = goed, anders de uitleg */
  const char *spelen(const char *kastje, const char *geluid, int volume, uint32_t nu) {
    int i = zoek(kastje);
    if (i < 0) return "Dit geluidskastje is onbekend (het heeft zich nog niet aangemeld).";
    if (!online(i, nu)) return "Dit geluidskastje is offline.";
    if (!geluidNaamGeldig(geluid)) return "Onbekende naam van een geluid.";
    JsonDocument d;
    d["geluid"] = geluid;
    d["volume"] = volume < 0 ? 0 : (volume > 100 ? 100 : volume);
    std::string b;
    serializeJson(d, b);
    if (!opdracht(k[i].ip, "/speel", b)) return "De doos is nog bezig met andere opdrachten voor de kastjes.";
    return "";
  }

  const char *stop(const char *kastje, uint32_t nu) {
    int i = zoek(kastje);
    if (i < 0) return "Dit geluidskastje is onbekend (het heeft zich nog niet aangemeld).";
    if (!online(i, nu)) return "Dit geluidskastje is offline.";
    if (!opdracht(k[i].ip, "/stop", "{}")) return "De doos is nog bezig met andere opdrachten voor de kastjes.";
    return "";
  }

  const char *hernoemen(const char *id, const char *naam) {
    int i = zoek(id);
    if (i < 0) return "Dit geluidskastje is onbekend (het heeft zich nog niet aangemeld).";
    char t[KASTJE_NAAM_LEN];
    if (!naam || !naam[0] || strlen(naam) >= (size_t)KASTJE_NAAM_LEN) return "Geef een naam van 1 tot 23 tekens.";
    strcpy(t, naam);
    JsonDocument d;
    d["naam"] = t;
    std::string b;
    serializeJson(d, b);
    if (!opdracht(k[i].ip, "/naam", b)) return "De doos is nog bezig met andere opdrachten voor de kastjes.";
    strcpy(k[i].naam, t);
    return "";
  }

  /** de volgende opdracht voor main.cpp; false = geen */
  bool haal(HttpOpdracht &o) {
    if (nRij_ == 0) return false;
    o = rij_[0];
    memmove(rij_, rij_ + 1, sizeof(HttpOpdracht) * (size_t)(nRij_ - 1));
    nRij_--;
    return true;
  }
  int wachtend() const { return nRij_; }

 private:
  HttpOpdracht rij_[MAX_HTTP_RIJ];
  int nRij_ = 0;
};

} // namespace trein
