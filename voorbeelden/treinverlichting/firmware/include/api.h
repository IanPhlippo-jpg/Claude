// De JSON-API van het dashboard, zonder hardware: main.cpp geeft de tekst van het verzoek door en stuurt het antwoord
// terug. Testen: test/test_api.
//
//   GET  /api/staat            alles (namen, scènes, functies, ingangen, instellingen en de live stand)
//   GET  /api/staat?kort=1     alleen de live stand (het dashboard vraagt dit elke seconde; staat "rev" anders dan
//                              de vorige keer, dan haalt het alles opnieuw op)
//   POST /api/groep            {"nr":3,"aan":true,"helderheid":60,"effect":"vuur","p1":60,"p2":5}  (nr ook [3,4])
//                              {"nr":3,"naam":"Station","max":80,"dagnacht":true}
//                              {"allesUit":true}
//   POST /api/scene            {"actie":"oproepen","nr":1}  {"actie":"bewaren","naam":"Avond"}  (met "nr": overschrijven)
//                              {"actie":"hernoemen","nr":1,"naam":"..."}  {"actie":"wissen","nr":1}
//   POST /api/functie          {"actie":"start"|"stop"|"wissel","nr":1}  {"actie":"wissen","nr":1}
//                              {"actie":"bewaren","nr":2,"functie":{"naam":"Overweg","herhalen":false,"stopUit":true,
//                                "stappen":[{"groepen":[3,4],"actie":"effect","effect":"overweg","p1":600,"wacht":30},
//                                           {"groepen":[3,4],"actie":"uit","wacht":0}]}}   (zonder "nr": nieuwe)
//   POST /api/ingang           {"nr":1,"naam":"Knop perron","gedrag":"drukknop","functieA":1,"wisselen":true}
//                              (functieA/B: 0 = geen; "nalopen": seconden voor een sensor)
//   POST /api/instellingen     {"faduur":0.5,"dagnachtMin":20,"opstart":"laatste"|"uit","wachtwoord":"..."}
//                              {"fabrieksinstellingen":true}
//                              {"thuisnet":{"ssid":"Thuis","wachtwoord":"..."}}  (ssid "" = thuisnet uit)
//   POST /api/dagnacht         {"loopt":true,"vanaf":"avond"}  {"loopt":false}
//   POST /api/test             {"actie":"looplicht","stapS":1}  {"actie":"vast","groep":5}  {"actie":"stop"}
//   POST /api/update           (main.cpp) de nieuwe firmware (.bin) als multipart-upload; daarna herstart de doos
// Antwoord: {"ok":true} (eventueel met "nr"), of HTTP 400 met {"ok":false,"fout":"uitleg in gewone taal"}.
// Groepen, scènes, functies en ingangen hebben in de API nummers vanaf 1 (zoals op het dashboard).
#pragma once
#include <string>

#include "baan.h"

namespace trein {

constexpr size_t MAX_VERZOEK = 8192;

struct Antwoord {
  int code = 200;
  std::string json;
  bool hotspotOpnieuw = false; // het wifi-wachtwoord is veranderd: main.cpp start de hotspot opnieuw
  bool thuisnetOpnieuw = false; // het thuisnet is veranderd: main.cpp verbindt opnieuw
};

inline Antwoord fout(const char *tekst) {
  Antwoord a;
  a.code = 400;
  JsonDocument d;
  d["ok"] = false;
  d["fout"] = tekst;
  serializeJson(d, a.json);
  return a;
}

/** foutmelding met een getal erin (bv. het aantal groepen) */
inline Antwoord foutN(const char *formaat, int n) {
  char t[160];
  snprintf(t, sizeof t, formaat, n);
  return fout(t);
}

inline Antwoord goed(int nr = 0) {
  Antwoord a;
  a.json = nr > 0 ? "{\"ok\":true,\"nr\":" + std::to_string(nr) + "}" : "{\"ok\":true}";
  return a;
}

/** het verzoek lezen; false = a bevat de fout */
inline bool leesVerzoek(const char *body, size_t len, JsonDocument &d, Antwoord &a) {
  if (!body || len == 0) { a = fout("Het verzoek is leeg."); return false; }
  if (len > MAX_VERZOEK) { a = fout("Het verzoek is te lang."); return false; }
  if (deserializeJson(d, body, len, DeserializationOption::NestingLimit(6)) || !d.is<JsonObject>()) {
    a = fout("Het verzoek is geen geldige JSON.");
    return false;
  }
  return true;
}

/** een nummer 1..max uit het verzoek naar een index; -1 = ontbreekt of fout */
inline int index(JsonVariantConst v, int max) {
  if (!v.is<int>()) return -1;
  int n = v.as<int>();
  return (n >= 1 && n <= max) ? n - 1 : -1;
}

// ------------------------------------------------------------------------------------------------------ staat
inline std::string apiStaat(const Baan &b, uint32_t nu, bool kort) {
  JsonDocument d;
  JsonObject o = d.to<JsonObject>();
  o["rev"] = b.cfgRev;
  o["melding"] = b.melding;
  JsonArray gs = o["groepen"].to<JsonArray>();
  for (int g = 0; g < N_GROEPEN; g++) {
    JsonObject x = gs.add<JsonObject>();
    schrijfStand(x, b.lampen.stand[g]);
    x["lamp"] = (int)lrintf(b.lampen.lamp[g] * 100.f);
    if (!kort) {
      x["nr"] = g + 1;
      x["naam"] = b.cfg.groep[g].naam;
      x["max"] = b.cfg.groep[g].max;
      x["dagnacht"] = b.cfg.groep[g].dagnacht;
    }
  }
  JsonArray lopend = o["lopend"].to<JsonArray>();
  for (int f = 0; f < MAX_FUNCTIES; f++) lopend.add(b.seq.loopt(f));
  JsonArray in = o["ingangen"].to<JsonArray>();
  for (int i = 0; i < N_INGANGEN; i++) {
    JsonObject x = in.add<JsonObject>();
    const IngangCfg &c = b.cfg.ingang[i];
    x["actief"] = b.ingangen.t[i].actief;
    x["toestand"] = b.ingangen.toestandTekst(i, c);
    int32_t over = b.ingangen.vrijOver(i, c, nu);
    if (over >= 0) x["vrijOver"] = over;
    if (!kort) {
      x["nr"] = i + 1;
      schrijfIngang(x, c);
    }
  }
  JsonObject dn = o["dagnacht"].to<JsonObject>();
  dn["loopt"] = b.dn.loopt;
  dn["fase"] = b.dn.loopt ? dagFaseId(b.dn.fase(nu)) : "";
  dn["pos"] = b.dn.loopt ? (int)(b.dn.positie(nu) * 1000.f) / 1000.0 : 0;
  JsonObject test = o["test"].to<JsonObject>();
  test["soort"] = testId(b.testSoort);
  test["groep"] = b.testAan(nu) + 1;
  if (b.testSoort == TEST_LOOPLICHT) test["stapS"] = b.testStapMs / 1000.0;
  JsonObject th = o["thuisnet"].to<JsonObject>();
  th["ssid"] = b.cfg.inst.thuisSsid;
  th["verbonden"] = b.thuisVerbonden;
  th["ip"] = b.thuisIp;
  if (!kort) {
    o["aantalGroepen"] = N_GROEPEN;
    o["versie"] = FW_VERSIE;
    o["hotspot"] = HOTSPOT_NAAM;
    schrijfInstellingen(o["instellingen"].to<JsonObject>(), b.cfg.inst, false);
    JsonArray sc = o["scenes"].to<JsonArray>();
    for (int i = 0; i < MAX_SCENES; i++) {
      if (!b.cfg.scene[i].gebruikt) { sc.add<JsonVariant>(); continue; }
      JsonObject x = sc.add<JsonObject>();
      x["nr"] = i + 1;
      x["naam"] = b.cfg.scene[i].naam;
    }
    JsonArray fs = o["functies"].to<JsonArray>();
    for (int f = 0; f < MAX_FUNCTIES; f++) {
      if (!b.cfg.functie[f].gebruikt) { fs.add<JsonVariant>(); continue; }
      JsonObject x = fs.add<JsonObject>();
      x["nr"] = f + 1;
      schrijfFunctie(x, b.cfg.functie[f]);
    }
  }
  std::string t;
  serializeJson(d, t);
  return t;
}

// ----------------------------------------------------------------------------------------------------- groep
inline Antwoord apiGroep(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  JsonVariantConst r = d.as<JsonVariantConst>();
  if (r["allesUit"].is<bool>() && r["allesUit"].as<bool>()) {
    b.allesUit(nu);
    return goed();
  }
  GroepMasker m = 0;
  JsonVariantConst nr = r["nr"];
  if (nr.is<JsonArrayConst>()) {
    for (JsonVariantConst x : nr.as<JsonArrayConst>()) {
      int g = index(x, N_GROEPEN);
      if (g < 0) return fout("Onbekende groep.");
      m |= groepBit(g);
    }
  } else {
    int g = index(nr, N_GROEPEN);
    if (g < 0) return foutN("Welke groep? Geef \"nr\" van 1 tot %d.", N_GROEPEN);
    m = groepBit(g);
  }
  JsonVariantConst e = r["effect"];
  if (!e.isNull() && (!e.is<const char *>() || effectVanId(e.as<const char *>()) < 0))
    return fout("Onbekend effect.");
  if (!r["naam"].isNull() && (!r["naam"].is<const char *>() || !r["naam"].as<const char *>()[0]))
    return fout("Geef een naam.");
  bool cfgGewijzigd = false;
  Lezer l;
  for (int g = 0; g < N_GROEPEN; g++) {
    if (!(m >> g & 1)) continue;
    GroepStand s = b.lampen.stand[g];
    l.groepStand(r, s);
    if (s != b.lampen.stand[g]) b.zetGroep(g, s, nu);
    GroepCfg &c = b.cfg.groep[g];
    GroepCfg oud = c;
    l.groepCfg(r, c);
    if (strcmp(oud.naam, c.naam) != 0 || oud.max != c.max || oud.dagnacht != c.dagnacht) cfgGewijzigd = true;
  }
  if (cfgGewijzigd) b.instellingenGewijzigd(nu);
  return goed();
}

// ----------------------------------------------------------------------------------------------------- scene
inline Antwoord apiScene(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "";
  int i = index(d["nr"], MAX_SCENES);
  const char *naam = d["naam"] | "";
  if (strcmp(actie, "oproepen") == 0) {
    if (!b.sceneOproepen(i, nu)) return fout("Deze scène bestaat niet.");
    return goed(i + 1);
  }
  if (strcmp(actie, "bewaren") == 0) {
    if (!d["nr"].isNull() && i < 0) return fout("Onbekende scène.");
    int p = b.sceneBewaren(i, naam);
    if (p < 0) return fout("Alle 12 plaatsen voor scènes zijn bezet. Wis eerst een scène.");
    return goed(p + 1);
  }
  if (strcmp(actie, "hernoemen") == 0) {
    if (i < 0 || !b.cfg.scene[i].gebruikt) return fout("Deze scène bestaat niet.");
    char t[NAAM_LEN];
    kopieerNaam(t, naam);
    if (!t[0]) return fout("Geef een naam.");
    strcpy(b.cfg.scene[i].naam, t);
    b.cfgRev++;
    return goed(i + 1);
  }
  if (strcmp(actie, "wissen") == 0) {
    if (!b.sceneWissen(i)) return fout("Deze scène bestaat niet.");
    return goed();
  }
  return fout("Onbekende actie voor een scène.");
}

// --------------------------------------------------------------------------------------------------- functie
inline Antwoord apiFunctie(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "";
  int f = index(d["nr"], MAX_FUNCTIES);
  bool bestaat = f >= 0 && b.cfg.functie[f].gebruikt;
  if (strcmp(actie, "start") == 0 || strcmp(actie, "stop") == 0 || strcmp(actie, "wissel") == 0) {
    if (!bestaat) return fout("Deze functie bestaat niet.");
    bool stop = strcmp(actie, "wissel") == 0 ? b.seq.loopt(f) : strcmp(actie, "stop") == 0;
    if (stop) b.functieStop(f, nu);
    else b.functieStart(f, nu);
    return goed(f + 1);
  }
  if (strcmp(actie, "bewaren") == 0) {
    if (!d["nr"].isNull() && f < 0) return fout("Onbekende functie.");
    JsonVariantConst fv = d["functie"];
    if (!fv.is<JsonObjectConst>()) return fout("De functie ontbreekt.");
    Functie nieuw;
    Lezer l;
    l.functie(fv, nieuw, f < 0 ? 0 : f);
    int p = b.functieBewaren(f, nieuw, nu);
    if (p < 0) return fout("Alle 16 plaatsen voor functies zijn bezet. Wis eerst een functie.");
    return goed(p + 1);
  }
  if (strcmp(actie, "wissen") == 0) {
    if (!b.functieWissen(f, nu)) return fout("Deze functie bestaat niet.");
    return goed();
  }
  return fout("Onbekende actie voor een functie.");
}

// ---------------------------------------------------------------------------------------------------- ingang
inline Antwoord apiIngang(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  int i = index(d["nr"], N_INGANGEN);
  if (i < 0) return foutN("Welke ingang? Geef \"nr\" van 1 tot %d.", N_INGANGEN);
  JsonVariantConst g = d["gedrag"];
  if (!g.isNull() && (!g.is<const char *>() || gedragVanId(g.as<const char *>()) < 0))
    return fout("Onbekend gedrag (geen, drukknop, schakelaar of sensor).");
  for (const char *k : {"functieA", "functieB"}) {
    JsonVariantConst v = d[k];
    if (v.isNull()) continue;
    int n = v.is<int>() ? v.as<int>() : -1;
    if (n < 0 || n > MAX_FUNCTIES || (n > 0 && !b.cfg.functie[n - 1].gebruikt)) return fout("Deze functie bestaat niet.");
  }
  Lezer l;
  l.ingang(d.as<JsonVariantConst>(), b.cfg.ingang[i]);
  b.instellingenGewijzigd(nu);
  return goed(i + 1);
}

// ---------------------------------------------------------------------------------------------- instellingen
inline Antwoord apiInstellingen(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  JsonVariantConst r = d.as<JsonVariantConst>();
  if (r["fabrieksinstellingen"].is<bool>() && r["fabrieksinstellingen"].as<bool>()) {
    bool anderWachtwoord = strcmp(b.cfg.inst.wachtwoord, STD_WACHTWOORD) != 0;
    b.allesUit(nu);
    standaard(b.cfg);
    b.melding.clear();
    b.instellingenGewijzigd(nu);
    a = goed();
    a.hotspotOpnieuw = anderWachtwoord;
    a.thuisnetOpnieuw = true;
    return a;
  }
  JsonVariantConst w = r["wachtwoord"];
  if (!w.isNull() && (!w.is<const char *>() || !wachtwoordGeldig(w.as<const char *>())))
    return fout("Het wachtwoord moet 8 tot 63 tekens hebben: letters, cijfers en gewone tekens (geen é of ë).");
  JsonVariantConst o = r["opstart"];
  if (!o.isNull() && strcmp(o | "", "laatste") != 0 && strcmp(o | "", "uit") != 0)
    return fout("Opstarten: kies \"laatste\" of \"uit\".");
  JsonVariantConst t = r["thuisnet"];
  if (!t.isNull()) {
    if (!t.is<JsonObjectConst>()) return fout("\"thuisnet\" moet een object zijn: {\"ssid\":...,\"wachtwoord\":...}.");
    JsonVariantConst s = t["ssid"], tw = t["wachtwoord"];
    if (!s.isNull() && (!s.is<const char *>() || !ssidGeldig(s.as<const char *>())))
      return fout("De naam van het thuisnet mag hoogstens 32 tekens hebben.");
    if (!tw.isNull() && (!tw.is<const char *>() || !thuisWachtwoordGeldig(tw.as<const char *>())))
      return fout("Het wachtwoord van het thuisnet is leeg (open netwerk) of heeft 8 tot 63 gewone tekens.");
  }
  char oud[64], oudSsid[33], oudThuis[64];
  strcpy(oud, b.cfg.inst.wachtwoord);
  strcpy(oudSsid, b.cfg.inst.thuisSsid);
  strcpy(oudThuis, b.cfg.inst.thuisWachtwoord);
  Lezer l;
  l.instellingen(r, b.cfg.inst);
  b.instellingenGewijzigd(nu);
  a = goed();
  a.hotspotOpnieuw = strcmp(oud, b.cfg.inst.wachtwoord) != 0;
  a.thuisnetOpnieuw = strcmp(oudSsid, b.cfg.inst.thuisSsid) != 0 || strcmp(oudThuis, b.cfg.inst.thuisWachtwoord) != 0;
  return a;
}

// ------------------------------------------------------------------------------------------------- dagnacht
inline Antwoord apiDagnacht(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  if (!d["loopt"].is<bool>()) return fout("Geef \"loopt\": true of false.");
  if (!d["loopt"].as<bool>()) {
    b.dagnachtStop();
    return goed();
  }
  const char *vanaf = d["vanaf"] | "dag";
  int fase = -1;
  for (int f = 0; f < 4; f++)
    if (strcmp(dagFaseId(f), vanaf) == 0) fase = f;
  if (fase < 0) return fout("Beginnen bij: dag, avond, nacht of ochtend.");
  if (b.deelnemers() == 0) return fout("Er doet nog geen groep mee. Vink bij Instellingen aan welke groepen meedoen.");
  b.dagnachtStart(nu, fase);
  return goed();
}

// ------------------------------------------------------------------------------------------------------- test
inline Antwoord apiTest(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "";
  if (strcmp(actie, "stop") == 0) {
    b.testStop();
    return goed();
  }
  if (strcmp(actie, "looplicht") == 0) {
    JsonVariantConst s = d["stapS"];
    double sec = s.isNull() ? TEST_STAP_STD_MS / 1000.0 : (s.is<double>() ? s.as<double>() : -1);
    if (!(sec >= TEST_STAP_MIN_MS / 1000.0 && sec <= TEST_STAP_MAX_MS / 1000.0))
      return fout("Tijd per groep: 0,3 tot 5 s.");
    b.testLooplicht(nu, (uint32_t)lround(sec * 1000.0));
    return goed();
  }
  if (strcmp(actie, "vast") == 0) {
    int g = index(d["groep"], N_GROEPEN);
    if (g < 0 || !b.testVast(g)) return foutN("Welke groep? Geef \"groep\" van 1 tot %d.", N_GROEPEN);
    return goed(g + 1);
  }
  return fout("Testmodus: kies \"looplicht\", \"vast\" of \"stop\".");
}

} // namespace trein
