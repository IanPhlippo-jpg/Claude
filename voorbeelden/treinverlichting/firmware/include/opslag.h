// Alle instellingen en de laatste stand, en hun JSON (bestanden in LittleFS en de JSON-API). Zonder hardware;
// testen: test/test_opslag.
//
// Twee bestanden in het flashgeheugen van de ESP:
//   /instellingen.json  namen, scènes, functies, ingangen, wachtwoord, faduur, dag/nacht-duur, opstartgedrag
//   /stand.json         de stand van de groepen (voor na een stroomonderbreking), apart zodat het vaak bewaren
//                       van de stand de instellingen nooit in gevaar brengt
// Elk bestand heeft een versienummer ("versie": 1) en wordt bij het laden volledig nagekeken:
//   - onleesbaar (kapotte JSON), te groot (> 48 kB), geen object, onbekende versie of een onderdeel van het verkeerde
//     soort (bv. "groepen" is geen lijst): het hele bestand is ONGELDIG -> standaardinstellingen + melding
//     (main.cpp bewaart het kapotte bestand als /instellingen.kapot.json, er gaat niets verloren);
//   - een losse waarde buiten het bereik of van het verkeerde soort (helderheid 250, naam te lang, onbekend effect):
//     die ene waarde wordt aangepast of krijgt de standaard, de rest blijft (HERSTELD + melding met het aantal).
// Nooit crashen: elke waarde wordt begrensd voor ze gebruikt wordt; lijsten worden ingekort tot hun maximum.
#pragma once
#include <ArduinoJson.h>
#include <math.h>
#include <stdio.h>

#include <string>

#include "functies.h"
#include "ingangen.h"

namespace trein {

constexpr int CONFIG_VERSIE = 1;
constexpr size_t MAX_BESTAND = 48 * 1024;
constexpr const char *STD_WACHTWOORD = "treinbaan";
constexpr const char *HOTSPOT_NAAM = "Treinbaan";
constexpr uint32_t MAX_FADUUR_MS = 10000;
constexpr uint16_t MIN_DAGNACHT_MIN = 2, MAX_DAGNACHT_MIN = 240;

struct GroepCfg {
  char naam[NAAM_LEN] = {0};
  uint8_t max = 100;     // maximumhelderheid 1..100 %
  bool dagnacht = false; // doet mee aan de dag/nacht-cyclus
};

struct Instellingen {
  uint32_t faduurMs = 500;
  uint16_t dagnachtMin = 20;   // duur van een hele dag (dag + avond + nacht + ochtend) in minuten
  bool opstartLaatste = true;  // na een stroomonderbreking: true = de laatste stand terug, false = alles uit
  char wachtwoord[64] = {0};   // wifi (WPA2): 8..63 gewone tekens
  // thuis-wifi (optioneel): de doos meldt zich daar ook aan (naast haar eigen hotspot); leeg = niet gebruikt
  char thuisSsid[33] = {0};        // 1..32 bytes
  char thuisWachtwoord[64] = {0};  // leeg (open netwerk) of 8..63 gewone tekens
};

struct Config {
  Instellingen inst;
  GroepCfg groep[N_GROEPEN];
  Scene scene[MAX_SCENES];
  Functie functie[MAX_FUNCTIES];
  IngangCfg ingang[N_INGANGEN];
};

/** wat na een stroomonderbreking terugkomt */
struct Stand {
  GroepStand groep[N_GROEPEN];
  bool dagnachtLoopt = false;
  uint32_t dagnachtPosMs = 0;
  uint16_t functies = 0; // lopende herhalende functies (bit f = functie f+1)
};

enum class Laad { OK, HERSTELD, ONGELDIG };

/** WPA2: 8 tot 63 gewone tekens (geen é, geen stuurtekens) */
inline bool wachtwoordGeldig(const char *w) {
  if (!w) return false;
  size_t n = strlen(w);
  if (n < 8 || n > 63) return false;
  for (size_t i = 0; i < n; i++)
    if ((unsigned char)w[i] < 0x20 || (unsigned char)w[i] > 0x7E) return false;
  return true;
}

/** naam van een wifi-netwerk: 0..32 bytes, geen stuurtekens (0 = thuisnet uit) */
inline bool ssidGeldig(const char *w) {
  if (!w) return false;
  size_t n = strlen(w);
  if (n > 32) return false;
  for (size_t i = 0; i < n; i++)
    if ((unsigned char)w[i] < 0x20 || (unsigned char)w[i] == 0x7F) return false;
  return true;
}

/** wachtwoord van het thuisnet: leeg (open netwerk) of zoals WPA2 */
inline bool thuisWachtwoordGeldig(const char *w) { return w && (!w[0] || wachtwoordGeldig(w)); }

inline void standaardNaam(char *doel, const char *soort, int nr) { snprintf(doel, NAAM_LEN, "%s %d", soort, nr); }

/** de standaardinstellingen (alles in de plaats zelf: Config is 10 kB, te groot voor de stapel van de ESP) */
inline void standaard(Config &c) {
  c.inst = Instellingen();
  strcpy(c.inst.wachtwoord, STD_WACHTWOORD);
  for (int g = 0; g < N_GROEPEN; g++) {
    c.groep[g] = GroepCfg();
    standaardNaam(c.groep[g].naam, "Groep", g + 1);
  }
  for (int i = 0; i < MAX_SCENES; i++) c.scene[i] = Scene();
  for (int f = 0; f < MAX_FUNCTIES; f++) c.functie[f] = Functie();
  for (int i = 0; i < N_INGANGEN; i++) {
    c.ingang[i] = IngangCfg();
    standaardNaam(c.ingang[i].naam, "Ingang", i + 1);
  }
  // twee scènes en één voorbeeldfunctie om mee te beginnen
  Scene &aan = c.scene[0];
  aan.gebruikt = true;
  strcpy(aan.naam, "Alles aan");
  for (int g = 0; g < N_GROEPEN; g++) aan.groep[g].aan = true;
  Scene &uit = c.scene[1];
  uit.gebruikt = true;
  strcpy(uit.naam, "Alles uit");
  Functie &ow = c.functie[0];
  ow.gebruikt = true;
  strcpy(ow.naam, "Overweg");
  ow.stopUit = true;
  ow.nStappen = 2;
  ow.stap[0].groepen = (1u << 2) | (1u << 3); // groepen 3 en 4
  ow.stap[0].actie = ACT_EFFECT;
  ow.stap[0].effect = FX_OVERWEG;
  ow.stap[0].p1 = 600;
  ow.stap[0].wachtMs = 30000;
  ow.stap[1].groepen = (1u << 2) | (1u << 3);
  ow.stap[1].actie = ACT_UIT;
  // functie 2 en ingang 1: een knop "alles aan/uit" (Fable, 2026-11-12: een fysieke knop werkt ook zonder gsm)
  Functie &au = c.functie[1];
  au.gebruikt = true;
  strcpy(au.naam, "Alles aan/uit");
  au.stopUit = false;
  au.nStappen = 1;
  au.stap[0].groepen = ALLE_GROEPEN;
  au.stap[0].actie = ACT_WISSEL;
  IngangCfg &k = c.ingang[0];
  strcpy(k.naam, "Knop alles aan/uit");
  k.gedrag = GEDRAG_DRUKKNOP;
  k.functieA = 1;
}

// ------------------------------------------------------------------------------------------------- JSON lezen
/** leest waarden uit JSON met grenzen; telt wat aangepast moest worden. Een ontbrekende waarde laat de huidige
 *  staan (zo werkt dezelfde code voor een volledig bestand en voor een gedeeltelijke wijziging uit de API). */
struct Lezer {
  int hersteld = 0;

  int32_t getal(JsonVariantConst v, int32_t lo, int32_t hi, int32_t huidig) {
    if (v.isNull()) return huidig;
    if (!v.is<double>()) { hersteld++; return huidig; }
    double d = v.as<double>();
    if (!(d == d)) { hersteld++; return huidig; }
    if (d < lo) { hersteld++; return lo; }
    if (d > hi) { hersteld++; return hi; }
    return (int32_t)lround(d);
  }

  /** seconden (met decimalen) in JSON, ms in het geheugen */
  uint32_t seconden(JsonVariantConst v, uint32_t loMs, uint32_t hiMs, uint32_t huidigMs) {
    if (v.isNull()) return huidigMs;
    if (!v.is<double>()) { hersteld++; return huidigMs; }
    double ms = v.as<double>() * 1000.0;
    if (!(ms == ms)) { hersteld++; return huidigMs; }
    if (ms < loMs) { hersteld++; return loMs; }
    if (ms > hiMs) { hersteld++; return hiMs; }
    return (uint32_t)llround(ms);
  }

  bool janee(JsonVariantConst v, bool huidig) {
    if (v.isNull()) return huidig;
    if (!v.is<bool>()) { hersteld++; return huidig; }
    return v.as<bool>();
  }

  /** een naam; leeg of geen tekst = de huidige blijft */
  void naam(JsonVariantConst v, char *doel) {
    if (v.isNull()) return;
    if (!v.is<const char *>()) { hersteld++; return; }
    char tmp[NAAM_LEN];
    if (kopieerNaam(tmp, v.as<const char *>())) hersteld++;
    if (tmp[0]) strcpy(doel, tmp);
    else hersteld++;
  }

  /** een nummer in JSON (1..max) naar een index; 0 = geen (-1). Een nummer dat niet bestaat wordt "geen". */
  int8_t verwijzing(JsonVariantConst v, int max, int8_t huidig) {
    if (v.isNull()) return huidig;
    if (!v.is<int>() || v.as<int>() < 0 || v.as<int>() > max) { hersteld++; return -1; }
    return (int8_t)(v.as<int>() - 1);
  }

  void groepStand(JsonVariantConst v, GroepStand &s) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    s.aan = janee(v["aan"], s.aan);
    s.helderheid = (uint8_t)getal(v["helderheid"], 1, 100, s.helderheid);
    JsonVariantConst e = v["effect"];
    if (!e.isNull()) {
      int nr = e.is<const char *>() ? effectVanId(e.as<const char *>()) : -1;
      if (nr < 0) hersteld++;
      else if (nr != s.effect) {
        s.effect = (uint8_t)nr;
        s.p1 = effectInfo(nr).p1Std;
        s.p2 = effectInfo(nr).p2Std;
        s.fase = 0;
      }
    }
    const EffectInfo &i = effectInfo(s.effect);
    s.p1 = getal(v["p1"], i.p1Min, i.p1Max, klem(s.p1, i.p1Min, i.p1Max));
    s.p2 = getal(v["p2"], i.p2Min, i.p2Max, klem(s.p2, i.p2Min, i.p2Max));
    s.fase = (uint8_t)getal(v["fase"], 0, 1, s.fase);
    s = geldig(s);
  }

  /** een stap; false = onbruikbaar (geen object of onbekende actie) */
  bool stap(JsonVariantConst v, Stap &s) {
    if (!v.is<JsonObjectConst>()) { hersteld++; return false; }
    s = Stap();
    JsonVariantConst a = v["actie"];
    int act = a.is<const char *>() ? actieVanId(a.as<const char *>()) : -1;
    if (act < 0) { hersteld++; return false; }
    s.actie = (uint8_t)act;
    JsonVariantConst gs = v["groepen"];
    if (gs.is<JsonArrayConst>()) {
      for (JsonVariantConst g : gs.as<JsonArrayConst>()) {
        int8_t nr = verwijzing(g, N_GROEPEN, -1);
        if (nr >= 0) s.groepen |= groepBit(nr);
        else hersteld++;
      }
    } else if (!gs.isNull()) {
      hersteld++;
    }
    switch (s.actie) {
      case ACT_HELDERHEID: s.waarde = getal(v["waarde"], 1, 100, 100); break;
      case ACT_SCENE: s.waarde = getal(v["waarde"], 1, MAX_SCENES, 1); break;
      case ACT_DAGNACHT: s.waarde = getal(v["waarde"], 0, 1, 1); break;
      case ACT_EFFECT: {
        JsonVariantConst e = v["effect"];
        int nr = e.is<const char *>() ? effectVanId(e.as<const char *>()) : -1;
        if (nr < 0) { hersteld++; nr = FX_GEEN; }
        s.effect = (uint8_t)nr;
        const EffectInfo &i = effectInfo(nr);
        s.p1 = getal(v["p1"], i.p1Min, i.p1Max, i.p1Std);
        s.p2 = getal(v["p2"], i.p2Min, i.p2Max, i.p2Std);
        break;
      }
      default: break;
    }
    s.wachtMs = seconden(v["wacht"], 0, MAX_WACHT_MS, 0);
    return true;
  }

  void functie(JsonVariantConst v, Functie &f, int nr) {
    f = Functie();
    if (!v.is<JsonObjectConst>()) { hersteld++; return; }
    f.gebruikt = true;
    standaardNaam(f.naam, "Functie", nr + 1);
    naam(v["naam"], f.naam);
    f.herhalen = janee(v["herhalen"], false);
    f.stopUit = janee(v["stopUit"], true);
    JsonVariantConst st = v["stappen"];
    if (st.is<JsonArrayConst>()) {
      for (JsonVariantConst s : st.as<JsonArrayConst>()) {
        if (f.nStappen >= MAX_STAPPEN) { hersteld++; break; }
        if (stap(s, f.stap[f.nStappen])) f.nStappen++;
      }
    } else if (!st.isNull()) {
      hersteld++;
    }
    if (f.herhalen && f.totaleWacht() < MIN_HERHAAL_MS) { f.herhalen = false; hersteld++; }
  }

  void scene(JsonVariantConst v, Scene &s, int nr) {
    s = Scene();
    if (!v.is<JsonObjectConst>()) { hersteld++; return; }
    s.gebruikt = true;
    standaardNaam(s.naam, "Scène", nr + 1);
    naam(v["naam"], s.naam);
    JsonVariantConst gs = v["groepen"];
    if (!gs.is<JsonArrayConst>()) { hersteld++; return; }
    int g = 0;
    for (JsonVariantConst x : gs.as<JsonArrayConst>()) {
      if (g >= N_GROEPEN) { hersteld++; break; }
      groepStand(x, s.groep[g++]);
    }
  }

  void ingang(JsonVariantConst v, IngangCfg &c) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    naam(v["naam"], c.naam);
    JsonVariantConst g = v["gedrag"];
    if (!g.isNull()) {
      int nr = g.is<const char *>() ? gedragVanId(g.as<const char *>()) : -1;
      if (nr < 0) hersteld++;
      else c.gedrag = (uint8_t)nr;
    }
    c.functieA = verwijzing(v["functieA"], MAX_FUNCTIES, c.functieA);
    c.functieB = verwijzing(v["functieB"], MAX_FUNCTIES, c.functieB);
    c.wisselen = janee(v["wisselen"], c.wisselen);
    c.naloopS = (uint16_t)getal(v["nalopen"], 0, MAX_NALOOP_S, c.naloopS);
  }

  void groepCfg(JsonVariantConst v, GroepCfg &g) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    naam(v["naam"], g.naam);
    g.max = (uint8_t)getal(v["max"], 1, 100, g.max);
    g.dagnacht = janee(v["dagnacht"], g.dagnacht);
  }

  void instellingen(JsonVariantConst v, Instellingen &i) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    i.faduurMs = seconden(v["faduur"], 0, MAX_FADUUR_MS, i.faduurMs);
    i.dagnachtMin = (uint16_t)getal(v["dagnachtMin"], MIN_DAGNACHT_MIN, MAX_DAGNACHT_MIN, i.dagnachtMin);
    JsonVariantConst o = v["opstart"];
    if (!o.isNull()) {
      const char *t = o.is<const char *>() ? o.as<const char *>() : "";
      if (strcmp(t, "laatste") == 0) i.opstartLaatste = true;
      else if (strcmp(t, "uit") == 0) i.opstartLaatste = false;
      else hersteld++;
    }
    JsonVariantConst w = v["wachtwoord"];
    if (!w.isNull()) {
      if (w.is<const char *>() && wachtwoordGeldig(w.as<const char *>())) strcpy(i.wachtwoord, w.as<const char *>());
      else hersteld++;
    }
    JsonVariantConst t = v["thuisnet"];
    if (!t.isNull()) {
      if (!t.is<JsonObjectConst>()) { hersteld++; return; }
      JsonVariantConst s = t["ssid"], tw = t["wachtwoord"];
      if (!s.isNull()) {
        if (s.is<const char *>() && ssidGeldig(s.as<const char *>())) strcpy(i.thuisSsid, s.as<const char *>());
        else hersteld++;
      }
      if (!tw.isNull()) {
        if (tw.is<const char *>() && thuisWachtwoordGeldig(tw.as<const char *>())) strcpy(i.thuisWachtwoord, tw.as<const char *>());
        else hersteld++;
      }
      if (!i.thuisSsid[0]) i.thuisWachtwoord[0] = 0; // geen netwerk: ook geen wachtwoord bewaren
    }
  }
};

// ---------------------------------------------------------------------------------------------- JSON schrijven
inline void schrijfStand(JsonObject o, const GroepStand &s) {
  o["aan"] = s.aan;
  o["helderheid"] = s.helderheid;
  o["effect"] = effectInfo(s.effect).id;
  o["p1"] = s.p1;
  o["p2"] = s.p2;
  o["fase"] = s.fase;
}

inline void schrijfStap(JsonObject o, const Stap &s) {
  JsonArray g = o["groepen"].to<JsonArray>();
  for (int i = 0; i < N_GROEPEN; i++)
    if (s.groepen >> i & 1) g.add(i + 1);
  o["actie"] = actieId(s.actie);
  if (s.actie == ACT_HELDERHEID || s.actie == ACT_SCENE || s.actie == ACT_DAGNACHT) o["waarde"] = s.waarde;
  if (s.actie == ACT_EFFECT) {
    o["effect"] = effectInfo(s.effect).id;
    o["p1"] = s.p1;
    o["p2"] = s.p2;
  }
  o["wacht"] = s.wachtMs / 1000.0;
}

inline void schrijfFunctie(JsonObject o, const Functie &f) {
  o["naam"] = f.naam;
  o["herhalen"] = f.herhalen;
  o["stopUit"] = f.stopUit;
  JsonArray st = o["stappen"].to<JsonArray>();
  for (int i = 0; i < f.nStappen; i++) schrijfStap(st.add<JsonObject>(), f.stap[i]);
}

inline void schrijfIngang(JsonObject o, const IngangCfg &c) {
  o["naam"] = c.naam;
  o["gedrag"] = gedragId(c.gedrag);
  o["functieA"] = c.functieA + 1;
  o["functieB"] = c.functieB + 1;
  o["wisselen"] = c.wisselen;
  o["nalopen"] = c.naloopS;
}

inline void schrijfInstellingen(JsonObject o, const Instellingen &i, bool metWachtwoord) {
  o["faduur"] = i.faduurMs / 1000.0;
  o["dagnachtMin"] = i.dagnachtMin;
  o["opstart"] = i.opstartLaatste ? "laatste" : "uit";
  if (metWachtwoord) o["wachtwoord"] = i.wachtwoord;
  JsonObject t = o["thuisnet"].to<JsonObject>();
  t["ssid"] = i.thuisSsid;
  if (metWachtwoord) t["wachtwoord"] = i.thuisWachtwoord;
  else t["metWachtwoord"] = i.thuisWachtwoord[0] != 0; // het dashboard krijgt het wachtwoord nooit te zien
}

inline std::string configNaarJson(const Config &c) {
  JsonDocument d;
  JsonObject o = d.to<JsonObject>();
  o["versie"] = CONFIG_VERSIE;
  schrijfInstellingen(o["instellingen"].to<JsonObject>(), c.inst, true);
  JsonArray gs = o["groepen"].to<JsonArray>();
  for (int g = 0; g < N_GROEPEN; g++) {
    JsonObject x = gs.add<JsonObject>();
    x["naam"] = c.groep[g].naam;
    x["max"] = c.groep[g].max;
    x["dagnacht"] = c.groep[g].dagnacht;
  }
  JsonArray sc = o["scenes"].to<JsonArray>();
  for (int i = 0; i < MAX_SCENES; i++) {
    if (!c.scene[i].gebruikt) { sc.add<JsonVariant>(); continue; }
    JsonObject x = sc.add<JsonObject>();
    x["naam"] = c.scene[i].naam;
    JsonArray st = x["groepen"].to<JsonArray>();
    for (int g = 0; g < N_GROEPEN; g++) schrijfStand(st.add<JsonObject>(), c.scene[i].groep[g]);
  }
  JsonArray fs = o["functies"].to<JsonArray>();
  for (int f = 0; f < MAX_FUNCTIES; f++) {
    if (!c.functie[f].gebruikt) { fs.add<JsonVariant>(); continue; }
    schrijfFunctie(fs.add<JsonObject>(), c.functie[f]);
  }
  JsonArray in = o["ingangen"].to<JsonArray>();
  for (int i = 0; i < N_INGANGEN; i++) schrijfIngang(in.add<JsonObject>(), c.ingang[i]);
  std::string s;
  serializeJson(d, s);
  return s;
}

/** begin van een bestand nakijken: grootte, JSON, object, versie. Geeft "" of de reden waarom het ongeldig is. */
inline std::string kijkNa(const char *tekst, size_t len, JsonDocument &d) {
  if (!tekst || len == 0) return "leeg bestand";
  if (len > MAX_BESTAND) return "bestand te groot";
  DeserializationError fout = deserializeJson(d, tekst, len, DeserializationOption::NestingLimit(8));
  if (fout) return std::string("kapot bestand (") + fout.c_str() + ")";
  if (!d.is<JsonObject>()) return "kapot bestand (geen object)";
  JsonVariantConst v = d["versie"];
  if (!v.is<int>() || v.as<int>() != CONFIG_VERSIE) return "onbekende versie";
  return "";
}

/** de instellingen laden en volledig nakijken. ONGELDIG: c = de standaardinstellingen. */
inline Laad configVanJson(const char *tekst, size_t len, Config &c, std::string &melding) {
  melding.clear();
  standaard(c);
  JsonDocument d;
  std::string reden = kijkNa(tekst, len, d);
  if (reden.empty()) {
    // elk onderdeel moet het juiste soort zijn (of ontbreken)
    const char *lijsten[] = {"groepen", "scenes", "functies", "ingangen"};
    for (const char *k : lijsten)
      if (!d[k].isNull() && !d[k].is<JsonArrayConst>()) reden = std::string("\"") + k + "\" is geen lijst";
    if (!d["instellingen"].isNull() && !d["instellingen"].is<JsonObjectConst>())
      reden = "\"instellingen\" is geen object";
  }
  if (!reden.empty()) {
    standaard(c);
    melding = "De instellingen waren niet bruikbaar (" + reden + "). De standaardinstellingen zijn geladen.";
    return Laad::ONGELDIG;
  }
  Lezer l;
  l.instellingen(d["instellingen"], c.inst);
  int n = 0;
  for (JsonVariantConst g : d["groepen"].as<JsonArrayConst>()) {
    if (n >= N_GROEPEN) { l.hersteld++; break; }
    l.groepCfg(g, c.groep[n++]);
  }
  n = 0;
  for (JsonVariantConst s : d["scenes"].as<JsonArrayConst>()) {
    if (n >= MAX_SCENES) { l.hersteld++; break; }
    if (s.isNull()) c.scene[n] = Scene();
    else l.scene(s, c.scene[n], n);
    n++;
  }
  if (!d["scenes"].isNull())
    for (; n < MAX_SCENES; n++) c.scene[n] = Scene();
  n = 0;
  for (JsonVariantConst f : d["functies"].as<JsonArrayConst>()) {
    if (n >= MAX_FUNCTIES) { l.hersteld++; break; }
    if (f.isNull()) c.functie[n] = Functie();
    else l.functie(f, c.functie[n], n);
    n++;
  }
  if (!d["functies"].isNull())
    for (; n < MAX_FUNCTIES; n++) c.functie[n] = Functie();
  n = 0;
  for (JsonVariantConst i : d["ingangen"].as<JsonArrayConst>()) {
    if (n >= N_INGANGEN) { l.hersteld++; break; }
    l.ingang(i, c.ingang[n++]);
  }
  if (l.hersteld > 0) {
    char t[160];
    snprintf(t, sizeof t, "%d waarde%s in de instellingen klopte%s niet en %s aangepast.", l.hersteld,
             l.hersteld == 1 ? "" : "n", l.hersteld == 1 ? "" : "n", l.hersteld == 1 ? "is" : "zijn");
    melding = t;
    return Laad::HERSTELD;
  }
  return Laad::OK;
}

inline std::string standNaarJson(const Stand &s) {
  JsonDocument d;
  JsonObject o = d.to<JsonObject>();
  o["versie"] = CONFIG_VERSIE;
  JsonArray gs = o["groepen"].to<JsonArray>();
  for (int g = 0; g < N_GROEPEN; g++) schrijfStand(gs.add<JsonObject>(), s.groep[g]);
  JsonObject dn = o["dagnacht"].to<JsonObject>();
  dn["loopt"] = s.dagnachtLoopt;
  dn["pos"] = s.dagnachtPosMs;
  JsonArray fs = o["functies"].to<JsonArray>();
  for (int f = 0; f < MAX_FUNCTIES; f++)
    if (s.functies >> f & 1) fs.add(f + 1);
  std::string t;
  serializeJson(d, t);
  return t;
}

/** de laatste stand laden; false = ongeldig (dan blijft alles uit) */
inline bool standVanJson(const char *tekst, size_t len, Stand &s) {
  s = Stand();
  JsonDocument d;
  if (!kijkNa(tekst, len, d).empty() || !d["groepen"].is<JsonArrayConst>()) return false;
  Lezer l;
  int g = 0;
  for (JsonVariantConst x : d["groepen"].as<JsonArrayConst>()) {
    if (g >= N_GROEPEN) break;
    l.groepStand(x, s.groep[g++]);
  }
  JsonVariantConst dn = d["dagnacht"];
  s.dagnachtLoopt = l.janee(dn["loopt"], false);
  s.dagnachtPosMs = (uint32_t)l.getal(dn["pos"], 0, MAX_DAGNACHT_MIN * 60000, 0);
  for (JsonVariantConst f : d["functies"].as<JsonArrayConst>()) {
    int32_t nr = l.getal(f, 0, MAX_FUNCTIES, 0);
    if (nr >= 1) s.functies |= (uint16_t)(1u << (nr - 1));
  }
  return true;
}

} // namespace trein
