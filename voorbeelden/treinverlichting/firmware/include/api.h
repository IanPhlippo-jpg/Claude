// De JSON-API van het dashboard, zonder hardware: main.cpp geeft de tekst van het verzoek door en stuurt het antwoord
// terug. Testen: test/test_api.
//
//   GET  /api/staat            alles (namen, scènes, functies, ingangen, instellingen en de live stand)
//   GET  /api/staat?kort=1     alleen de live stand (het dashboard vraagt dit elke seconde; staat "rev" anders dan
//                              de vorige keer, dan haalt het alles opnieuw op)
//   POST /api/groep            {"nr":3,"aan":true}  {"nr":3,"aan":true,"effect":"knipperen","p1":500,"p2":500}
//                              (nr ook [3,4]; alleen aan/uit, geen helderheid sinds firmware 1.3.0)
//                              {"nr":3,"naam":"Station","dagnacht":true}
//                              {"allesUit":true}
//   POST /api/scene            {"actie":"oproepen","nr":1}  {"actie":"bewaren","naam":"Avond"}  (met "nr": overschrijven)
//                              {"actie":"bewaren","nr":3,"naam":"Avond","aan":[1,2,5]}  per groep kiezen: 1, 2, 5 aan,
//                              de rest uit (zonder "aan": de huidige stand van de groepen)
//                              {"actie":"hernoemen","nr":1,"naam":"..."}  {"actie":"wissen","nr":1}
//   POST /api/functie          {"actie":"start"|"stop"|"wissel","nr":1}  {"actie":"wissen","nr":1}
//                              {"actie":"bewaren","nr":2,"functie":{"naam":"Overweg","herhalen":false,"stopUit":true,
//                                "stappen":[{"groepen":[3,4],"actie":"effect","effect":"overweg","p1":600,"wacht":30},
//                                           {"groepen":[3,4],"actie":"uit","wacht":0}]}}   (zonder "nr": nieuwe)
//   POST /api/ingang           {"nr":1,"naam":"Knop perron","gedrag":"drukknop","functieA":1,"wisselen":true}
//                              (functieA/B: 0 = geen; "nalopen": seconden voor een sensor)
//                              {"nr":5,"soort":"puls","vasthouden":0.3}  hallsensor: korte puls, 0,3 s vasthouden
//                              {"nr":5,"tellerNul":true}  {"tellersNul":true}  (de teller van één of alle ingangen op 0)
//   POST /api/instellingen     {"dagnachtMin":20,"opstart":"laatste"|"uit","wachtwoord":"..."}
//                              {"fabrieksinstellingen":true}
//                              {"thuisnet":{"ssid":"Thuis","wachtwoord":"..."}}  (ssid "" = thuisnet uit)
//   POST /api/dagnacht         {"loopt":true,"vanaf":"avond"}  {"loopt":false}
//   POST /api/test             {"actie":"looplicht","stapS":1}  {"actie":"vast","groep":5}  {"actie":"stop"}
//   POST /api/update           (main.cpp) de nieuwe firmware (.bin) als multipart-upload; daarna herstart de doos
// Firmware 2.0.0 erbij (zie README, "API"):
//   POST /api/ingang           ook {"nr":5,"polariteit":"pnp"} en {"groep":1,"polariteit":"pnp"} (groep 1..5 = ingang
//                              1-8, 9-16, 17-23, 25-31, 32-38: de printen, sinds 2.1.0)
//   POST /api/ir               {"actie":"leren","naam":"Stop bus","ontvanger":1}  (10 s; resultaat in "leren")
//                              {"actie":"bewaren","nr":3,"code":{"naam":..,"soort":"nec"|"rc5"|"raw","khz":38,"adres":0,
//                                "commando":18,"raw":[9000,4500,...],"herhaal":1}}   (zonder nr: nieuw)
//                              {"actie":"zenden","nr":3,"leds":[5,6]}  {"actie":"wissen","nr":3}
//                              {"actie":"hernoemen","nr":3,"naam":".."}
//   POST /api/bus              {"nr":1,"naam":"Bus 1","kleur":"#d23","code":"nec:00FF12ED"}  {"actie":"wissen","nr":1}
//                              {"actie":"gezien","bus":1,"punt":"P3"}
//   POST /api/punt             {"id":"P3","ingang":5}  {"id":"P4","ontvanger":2}  (optioneel "soort":"hall"|"ir"|"ftr",
//                              "volgende":"P5")  {"actie":"wissen","id":"P3"}
//   POST /api/servo            {"nr":1,"naam":"Wissel 1","kanaal":1,"a":1100,"b":1900,"snelheid":400,"soort":"wissel"}
//                              {"nr":1,"naar":"a"|"b"|"wissel"}  {"nr":1,"proef":1500}  {"actie":"wissen","nr":1}
//   POST /api/halte            {"nr":1,"naam":..,"aankomstPunt":"P5","stopLeds":[5],"stopCode":3,"rijdCode":4,"wachtS":12,
//                              "vrijIngangen":[7],"vrijMinS":3,"licht":{"rood":9,"oranje":10,"groen":11},"groenS":5,
//                              "servo":0}  {"actie":"wissen","nr":1}
//   POST /api/kastje           {"actie":"aanmelden",...} (van het kastje)  {"actie":"spelen","kastje":"Kerk",
//                              "geluid":"klok.wav","volume":80}  {"actie":"stop","kastje":"Kerk"}
//                              {"actie":"hernoemen","id":"a1b2c3","naam":"Kerk"}
//   GET  /api/meldingen?sinds=812   de meldingen van de meetpunten na volgnummer 812 (apiMeldingen)
//   GET/PUT /api/plan, POST /api/plan/beeld, GET /plan.jpg, GET /tv, GET /tv/<bestand>, POST /api/tv/bestand?naam=
//                              (main.cpp, bestanden in LittleFS; planNakijken controleert de plan-JSON)
// Firmware 2.1.0 erbij (Fable 5.2; zie README, "Nieuw in 2.1.0"):
//   POST /api/instellingen     {"printSoort":["vcc","gnd","apart"]}  (1 tot 5 printen: 1-8, 9-16, 17-23, 25-31, 32-38;
//                              "vcc" geweigerd zolang er een pnp-ingang op die print staat)  {"irLedActiefLaag":true}
//                              {"irDuty":33|50}
//   POST /api/ingang           polariteit "pnp" op een print "vcc": geweigerd (400). {"groep":g,...}: g = print 1..5
//   POST /api/ir               {"actie":"zelftest","led":5}  (NEC-testcode via IR-led 5, -B1 leest mee; resultaat in
//                              "zelftest" van /api/staat); soort "continu"; "adres16"/"commando16" (NEC); een code
//                              die met haar herhalingen te lang wordt: geweigerd
//   POST /api/servo            "pulsUitS": 0 (altijd puls) of 1..10
//   POST /api/punt             "alleenBus": true|false
//   POST /api/halte            "herhalen": true|false, "maxVerkeerS": 0..3600 (0 = geen grens)
// Firmware 2.2.0 erbij (Fable 5.2, tweede ronde; zie README, "Nieuw in 2.2.0"):
//   POST /api/halte            "wachtLeds": [4] (FN1: de IR-led vóór de halte voor een tweede bus; [] = de tweede bus
//                              niet tegenhouden). Moet een andere led zijn dan stopLeds (400).
//   POST /api/instellingen     {"servoRemGroepen":0..N} (FN3: 0 = uit, standaard; anders boven zoveel groepen aan één
//                              servo tegelijk), {"servoMaxBewegend":1..4} (EN3, standaard 2)
//   GET  /api/staat            "servoWachtLang": nr van een servo die al > 5 s wacht (0 = geen)
//                              "ir": {"continu": true als er een code "continu" is, "continuWaarschuwing": "..."};
//                              per halte "continu": true (stopcode continu), "continuTeLang": true (EN1: de led ging
//                              op haar tijdsgrens uit)
//   GET  /api/staat            "ir": {"rijVol": n} (FN7: codes van de haltes die niet in de rij van 8 pasten);
//                              "nietVerzonden" telt nu ook codes waarvoor de IR-leds niet gekozen konden worden
//   GET  /api/staat            "ontvangerLaag": [false,true,false,false] (TN3: het niveau van ontvangerpin 1..4 nu;
//                              een TCRT5000/fototransistor op GPIO11 = ontvanger 2: laag = IR-licht, ook zonder draaggolf)
//   POST /api/ir, /api/halte   met een code "continu" (bewaren, zenden, als stopcode): {"ok":true,"nr":n,
//                              "waarschuwing":"... 470 Ω ..."} (EN1)
//   GET  /api/zelftest         (main.cpp, apiZelftest) I2C-scan, PCA9685 teruglezen, MCP23017, LittleFS, stapels, wifi
//   Toegang (main.cpp, toegang()): elke POST/PUT alleen van de hotspot (192.168.4.x) of met de kop
//   X-Treinbaan-Wachtwoord = het wifi-wachtwoord (anders 401); een Origin die niet de doos zelf is: 403.
// Antwoord: {"ok":true} (eventueel met "nr"), of HTTP 400 met {"ok":false,"fout":"uitleg in gewone taal"}.
// Groepen, scènes, functies en ingangen hebben in de API nummers vanaf 1 (zoals op het dashboard).
#pragma once
#include <string>

#include <ctype.h>

#include "baan.h"

namespace trein {

constexpr size_t MAX_VERZOEK = 8192;
constexpr size_t MAX_PLAN = 256 * 1024; // /api/plan (plan.json van het situatieplan is ± 120 kB, met inspringen)

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

/** goed, met een waarschuwing die het dashboard toont (EN1: codesoort continu) */
inline Antwoord goedMet(int nr, const char *waarschuwing) {
  if (!waarschuwing || !waarschuwing[0]) return goed(nr);
  Antwoord a;
  JsonDocument d;
  d["ok"] = true;
  if (nr > 0) d["nr"] = nr;
  d["waarschuwing"] = waarschuwing;
  serializeJson(d, a.json);
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
/** het deel van /api/staat van firmware 2.0.0: servo's, bussen, IR, leren, haltes (en volledig: punten, kastjes) */
inline void staatErbij(JsonObject o, const Baan &b, uint32_t nu, bool kort) {
  o["msNu"] = nu;
  o["volgnr"] = b.volg.meldingen.volgnr;
  JsonArray sv = o["servos"].to<JsonArray>();
  for (int i = 0; i < MAX_SERVOS; i++) {
    if (!b.cfg.servo[i].gebruikt) continue;
    JsonObject x = sv.add<JsonObject>();
    x["nr"] = i + 1;
    x["us"] = b.servos.t[i].actief ? b.servos.us(i) : 0;
    x["stand"] = b.servos.standTekst(i);
    if (!kort) schrijfServo(x, b.cfg.servo[i]);
  }
  JsonArray bs = o["bussen"].to<JsonArray>();
  for (int i = 0; i < MAX_BUSSEN; i++) {
    if (!b.cfg.bus[i].gebruikt) continue;
    const Volg::Bus &v = b.volg.bus[i];
    JsonObject x = bs.add<JsonObject>();
    x["nr"] = i + 1;
    x["van"] = v.van;
    x["naar"] = v.naar;
    x["fractie"] = (int)(b.volg.fractie(i, nu) * 1000.f + 0.5f) / 1000.0;
    x["gezienMs"] = v.gezienMs;
    x["staat"] = b.volg.staat(i, nu, b.haltes.houdtVast(i));
    if (!kort) schrijfBus(x, b.cfg.bus[i]);
  }
  JsonArray il = o["irLaatst"].to<JsonArray>();
  for (int i = 0; i < b.volg.nIrLaatst; i++) {
    JsonObject x = il.add<JsonObject>();
    x["ontvanger"] = b.volg.irLaatst[i].ontvanger + 1;
    x["code"] = b.volg.irLaatst[i].code;
    x["ms"] = b.volg.irLaatst[i].ms;
  }
  JsonObject le = o["leren"].to<JsonObject>();
  le["loopt"] = b.leren.loopt;
  if (b.leren.loopt) {
    le["ontvanger"] = b.leren.ontvanger + 1;
    uint32_t weg = nu - b.leren.start;
    le["resterendS"] = weg >= LEER_MS ? 0 : (int)((LEER_MS - weg + 999) / 1000);
  } else {
    if (b.leren.nr >= 0) le["nr"] = b.leren.nr + 1;
    if (b.leren.fout[0]) le["fout"] = b.leren.fout;
  }
  JsonArray hs = o["haltes"].to<JsonArray>();
  for (int i = 0; i < MAX_HALTES; i++) {
    if (!b.cfg.halte[i].gebruikt) continue;
    JsonObject x = hs.add<JsonObject>();
    x["nr"] = i + 1;
    x["fase"] = halteFaseId(b.haltes.t[i].fase);
    x["bus"] = b.haltes.t[i].bus + 1;
    x["resterendS"] = b.haltes.resterendS(i, b.cfg.halte[i], nu);
    // F3: de wachtende bus (nummer), 0 = een onbekende bus wacht, -1 = niemand
    x["wachtend"] = b.haltes.t[i].heeftWachtend ? b.haltes.t[i].wachtendBus + 1 : -1;
    if (b.haltes.t[i].teLang) x["teLang"] = true;
    if (b.continuHalte(i)) {
      x["continu"] = true; // EN1: de stopcode is continu (470 Ω!)
      if (b.haltes.continuTeLang(i, b.cfg.halte[i], nu)) x["continuTeLang"] = true;
    }
    if (!kort) schrijfHalte(x, b.cfg.halte[i]);
  }
  o["servoWachtLampen"] = b.servos.geremd && b.servos.wachtend() > 0; // E14 (2.2.0: dan één tegelijk)
  o["servoWachtLang"] = b.servos.langWachtend(nu) + 1;                // FN3: servo die > 5 s wacht (0 = geen)
  JsonArray ob = o["ontvangerBezet"].to<JsonArray>();                  // E2: lang laag op ontvanger 1..4
  for (int i = 0; i < IR_ONTVANGERS; i++) ob.add(b.niveau[i].bezet);
  JsonArray ol = o["ontvangerLaag"].to<JsonArray>(); // TN3: het niveau nu (ontvanger 1 = -B1 wordt niet gelezen)
  for (int i = 0; i < IR_ONTVANGERS; i++) ol.add(b.ontvangerLaag[i]);
  JsonObject zt = o["zelftest"].to<JsonObject>(); // E4
  zt["loopt"] = b.zelftest.loopt;
  zt["ok"] = b.zelftest.ok;
  if (b.zelftest.led >= 0) zt["led"] = b.zelftest.led + 1;
  zt["khz"] = b.zelftest.khzTiende / 10.0;
  zt["code"] = b.zelftest.code;
  zt["fout"] = b.zelftest.fout;
  zt["ongemoduleerd"] = b.zelftest.ongemoduleerd;
  JsonObject ir = o["ir"].to<JsonObject>(); // F5
  ir["nietVerzonden"] = b.irNietVerzonden;
  ir["rijVol"] = b.irRijVol; // FN7: codes van de haltes die niet in de rij pasten
  ir["laatsteFout"] = b.irLaatsteFout;
  ir["continu"] = b.continuGebruikt();                // EN1: er is een code "continu" bewaard
  ir["continuWaarschuwing"] = IR_CONTINU_WAARSCHUWING; // de tekst voor het dashboard
  if (kort) return;
  JsonArray codes = ir["codes"].to<JsonArray>();
  for (int i = 0; i < MAX_IR_CODES; i++) {
    if (!b.cfg.ir[i].gebruikt) continue;
    JsonObject x = codes.add<JsonObject>();
    x["nr"] = i + 1;
    schrijfIrCode(x, b.cfg.ir[i], false);
  }
  ir["leds"] = IR_LEDS;
  JsonArray ont = ir["ontvangers"].to<JsonArray>();
  static const uint8_t PIN[IR_ONTVANGERS] = {48, 11, 39, 42};
  for (int i = 0; i < IR_ONTVANGERS; i++) {
    JsonObject x = ont.add<JsonObject>();
    x["nr"] = i + 1;
    x["pin"] = PIN[i];
    x["soort"] = i == 0 ? "leren" : "baan";
  }
  JsonArray pt = o["punten"].to<JsonArray>();
  for (int i = 0; i < MAX_PUNTEN; i++)
    if (b.cfg.punt[i].gebruikt) schrijfPunt(pt.add<JsonObject>(), b.cfg.punt[i]);
  JsonArray ks = o["kastjes"].to<JsonArray>();
  for (int i = 0; i < MAX_KASTJES; i++) {
    const Kastje &k = b.kastjes.k[i];
    if (!k.gebruikt) continue;
    JsonObject x = ks.add<JsonObject>();
    x["id"] = k.id;
    x["naam"] = k.naam;
    x["ip"] = k.ip;
    x["versie"] = k.versie;
    x["online"] = b.kastjes.online(i, nu);
    x["gezienMs"] = k.gezienMs;
    JsonArray g = x["geluiden"].to<JsonArray>();
    for (int j = 0; j < k.nGeluiden; j++) {
      JsonObject y = g.add<JsonObject>();
      y["naam"] = k.geluid[j].naam;
      y["s"] = k.geluid[j].ds / 10.0;
    }
  }
}

inline std::string apiStaat(const Baan &b, uint32_t nu, bool kort) {
  JsonDocument d;
  JsonObject o = d.to<JsonObject>();
  o["rev"] = b.cfgRev;
  o["melding"] = b.melding;
  JsonArray gs = o["groepen"].to<JsonArray>();
  for (int g = 0; g < N_GROEPEN; g++) {
    JsonObject x = gs.add<JsonObject>();
    schrijfStand(x, b.lampen.stand[g]);
    x["brandt"] = b.lampen.brandt(g); // nu echt aan (bij een effect: deze tel van het knipperen)
    if (!kort) {
      x["nr"] = g + 1;
      x["naam"] = b.cfg.groep[g].naam;
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
    x["teller"] = b.ingangen.t[i].teller;
    x["toestand"] = b.ingangen.toestandTekst(i, c);
    x["aanwezig"] = (bool)(b.ingangAanwezig >> i & 1);
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
  staatErbij(o, b, nu, kort);
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
      JsonArray aan = x["aan"].to<JsonArray>(); // de groepen die de scène aanzet
      for (int g = 0; g < N_GROEPEN; g++)
        if (b.cfg.scene[i].groep[g].aan) aan.add(g + 1);
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
    if (strcmp(oud.naam, c.naam) != 0 || oud.dagnacht != c.dagnacht) cfgGewijzigd = true;
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
    JsonVariantConst lijst = d["aan"];
    GroepMasker aan = 0;
    if (!lijst.isNull()) {
      if (!lijst.is<JsonArrayConst>()) return fout("\"aan\" moet een lijst met groepnummers zijn.");
      for (JsonVariantConst x : lijst.as<JsonArrayConst>()) {
        int g = index(x, N_GROEPEN);
        if (g < 0) return fout("Onbekende groep.");
        aan |= groepBit(g);
      }
    }
    int p = b.sceneBewaren(i, naam, lijst.isNull() ? nullptr : &aan);
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
constexpr const char *PNP_OP_VCC =
    "PNP kan niet op een print met gemeenschappelijke VCC: kies voor die print \"gnd\" of \"apart\" (Instellingen, "
    "soort print; nameten volgens TRN-22, stap optocouplerprint).";

inline Antwoord apiIngang(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  if (d["tellersNul"].is<bool>() && d["tellersNul"].as<bool>()) {
    b.ingangen.tellerNul();
    return goed();
  }
  JsonVariantConst pol = d["polariteit"];
  int polNr = pol.isNull() ? -1 : (pol.is<const char *>() ? polariteitVanId(pol.as<const char *>()) : -2);
  if (polNr == -2 || (!pol.isNull() && polNr < 0)) return fout("Polariteit: kies \"npn\" of \"pnp\".");
  if (!d["groep"].isNull()) {
    int g = index(d["groep"], N_PRINTEN);
    if (g < 0) return foutN("Welke print? Geef \"groep\" van 1 tot %d (1 = ingang 1-8, 2 = 9-16, 3 = 17-23, 4 = 25-31, 5 = 32-38).", N_PRINTEN);
    if (polNr < 0) return fout("Geef de polariteit voor de print: \"npn\" of \"pnp\".");
    if (!polariteitMag(b.cfg.inst.printSoort[g], (uint8_t)polNr)) return fout(PNP_OP_VCC);
    for (int k = 0; k < N_INGANGEN; k++)
      if (printVanIngang(k) == g) b.zetPolariteit(k, (uint8_t)polNr);
    b.instellingenGewijzigd(nu);
    return goed(g + 1);
  }
  int i = index(d["nr"], N_INGANGEN);
  if (i < 0) return foutN("Welke ingang? Geef \"nr\" van 1 tot %d.", N_INGANGEN);
  if (polNr >= 0 && printVanIngang(i) >= 0 && !polariteitMag(b.cfg.inst.printSoort[printVanIngang(i)], (uint8_t)polNr))
    return fout(PNP_OP_VCC);
  if (d["tellerNul"].is<bool>() && d["tellerNul"].as<bool>()) {
    b.ingangen.tellerNul(i);
    if (d.as<JsonObjectConst>().size() == 2) return goed(i + 1); // alleen de teller: geen instellingen gewijzigd
  }
  JsonVariantConst g = d["gedrag"];
  if (!g.isNull() && (!g.is<const char *>() || gedragVanId(g.as<const char *>()) < 0))
    return fout("Onbekend gedrag (geen, drukknop, schakelaar of sensor).");
  JsonVariantConst so = d["soort"];
  if (!so.isNull() && (!so.is<const char *>() || soortVanId(so.as<const char *>()) < 0))
    return fout("Onbekende soort (contact of puls).");
  JsonVariantConst vh = d["vasthouden"];
  if (!vh.isNull() && (!vh.is<double>() || !(vh.as<double>() >= 0 && vh.as<double>() <= MAX_VASTHOUD_MS / 1000.0)))
    return fout("Vasthouden: 0 tot 10 s.");
  for (const char *k : {"functieA", "functieB"}) {
    JsonVariantConst v = d[k];
    if (v.isNull()) continue;
    int n = v.is<int>() ? v.as<int>() : -1;
    if (n < 0 || n > MAX_FUNCTIES || (n > 0 && !b.cfg.functie[n - 1].gebruikt)) return fout("Deze functie bestaat niet.");
  }
  if (polNr >= 0) b.zetPolariteit(i, (uint8_t)polNr);
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
  JsonVariantConst ps = r["printSoort"];
  uint8_t soorten[N_PRINTEN];
  int nPs = 0;
  if (!ps.isNull()) {
    if (!ps.is<JsonArrayConst>() || ps.size() < 1 || ps.size() > (size_t)N_PRINTEN)
      return foutN("printSoort: een lijst van 1 tot %d printen, elk \"vcc\", \"gnd\" of \"apart\".", N_PRINTEN);
    for (JsonVariantConst x : ps.as<JsonArrayConst>()) {
      int s = x.is<const char *>() ? printSoortVanId(x.as<const char *>()) : -1;
      if (s < 0) return fout("printSoort: kies per print \"vcc\", \"gnd\" of \"apart\".");
      soorten[nPs++] = (uint8_t)s;
    }
    for (int i = 0; i < N_INGANGEN; i++) {
      int p = printVanIngang(i);
      if (p >= 0 && p < nPs && !polariteitMag(soorten[p], b.cfg.ingang[i].polariteit)) {
        char t[200];
        snprintf(t, sizeof t, "Print %d kan geen \"vcc\" zijn: ingang %d staat op pnp. %s", p + 1, i + 1, PNP_OP_VCC);
        return fout(t);
      }
    }
  }
  JsonVariantConst ia = r["irLedActiefLaag"];
  if (!ia.isNull() && !ia.is<bool>()) return fout("irLedActiefLaag: true of false.");
  JsonVariantConst du = r["irDuty"];
  if (!du.isNull() && (!du.is<int>() || (du.as<int>() != 33 && du.as<int>() != 50)))
    return fout("irDuty: 33 of 50 (% van de periode dat de IR-led aan is).");
  auto bereik = [](JsonVariantConst v, long lo, long hi) {
    return v.isNull() || (v.is<long>() && v.as<long>() >= lo && v.as<long>() <= hi);
  };
  if (!bereik(r["servoRemGroepen"], 0, N_GROEPEN))
    return foutN("servoRemGroepen: 0 (uit) tot %d lichtgroepen.", N_GROEPEN);
  if (!bereik(r["servoMaxBewegend"], 1, SERVO_MAX_BEWEGEND))
    return fout("servoMaxBewegend: 1 tot 4 servo's tegelijk (2 past binnen de 3 A van de voeding).");
  for (int p = 0; p < nPs; p++) b.zetPrintSoort(p, soorten[p]);
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

// ------------------------------------------------------------------------------------------- hulp (2.0.0)
/** een lijst nummers 1..max naar een masker; false = iets in de lijst klopt niet */
inline bool lijstMasker(JsonVariantConst v, int max, uint64_t &m) {
  m = 0;
  if (v.isNull()) return true;
  if (!v.is<JsonArrayConst>()) return false;
  for (JsonVariantConst x : v.as<JsonArrayConst>()) {
    int k = index(x, max);
    if (k < 0) return false;
    m |= (uint64_t)1u << k;
  }
  return true;
}

/** een getal (geheel) in [lo, hi] als het er is; false = fout soort of buiten het bereik */
inline bool getalOk(JsonVariantConst v, long lo, long hi) {
  if (v.isNull()) return true;
  if (!v.is<long>()) return false;
  long x = v.as<long>();
  return x >= lo && x <= hi;
}

/** een verwijzing 0 (= geen) of 1..max naar iets dat bestaat */
inline bool verwijzingOk(JsonVariantConst v, int max, bool (*bestaat)(const Baan &, int), const Baan &b) {
  if (v.isNull()) return true;
  if (!v.is<int>()) return false;
  int n = v.as<int>();
  if (n == 0) return true;
  return n >= 1 && n <= max && (!bestaat || bestaat(b, n - 1));
}

inline bool naamOk(JsonVariantConst v) {
  return v.isNull() || (v.is<const char *>() && v.as<const char *>()[0]);
}

// -------------------------------------------------------------------------------------------------------- IR
inline Antwoord apiIr(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "";
  int i = index(d["nr"], MAX_IR_CODES);
  bool bestaat = i >= 0 && b.cfg.ir[i].gebruikt;
  if (strcmp(actie, "leren") == 0) {
    JsonVariantConst o = d["ontvanger"];
    int ont = o.isNull() ? 0 : index(o, IR_ONTVANGERS);
    if (ont < 0) return foutN("Welke ontvanger? Geef \"ontvanger\" van 1 tot %d (1 = de leerontvanger).", IR_ONTVANGERS);
    if (!naamOk(d["naam"])) return fout("Geef een naam.");
    b.lerenStart(ont, d["naam"] | "", nu);
    return goed();
  }
  if (strcmp(actie, "zelftest") == 0) {
    int led = index(d["led"], IR_LEDS);
    const char *f = b.zelftestStart(led, nu);
    if (f[0]) return fout(f);
    return goed(led + 1);
  }
  if (strcmp(actie, "bewaren") == 0) {
    if (!d["nr"].isNull() && i < 0) return foutN("Onbekende code: \"nr\" van 1 tot %d.", MAX_IR_CODES);
    JsonVariantConst c = d["code"];
    if (!c.is<JsonObjectConst>()) return fout("De code ontbreekt.");
    JsonVariantConst so = c["soort"];
    int soort = so.is<const char *>() ? irSoortVanId(so.as<const char *>()) : (bestaat && so.isNull() ? b.cfg.ir[i].soort : -1);
    if (soort < 0) return fout("Soort: kies \"nec\", \"rc5\", \"raw\" of \"continu\".");
    for (const char *k : {"adres16", "commando16"})
      if (!c[k].isNull() && !c[k].is<bool>()) return fout("adres16 en commando16: true of false.");
    if (!getalOk(c["khz"], IR_KHZ_MIN, IR_KHZ_MAX)) return fout("Draaggolf: 30 tot 56 kHz.");
    if (!getalOk(c["herhaal"], 1, IR_HERHAAL_MAX)) return fout("Herhalen: 1 tot 10 keer.");
    if (!getalOk(c["adres"], 0, soort == IR_RC5 ? 31 : 65535)) return fout(soort == IR_RC5 ? "Adres: 0 tot 31 (RC5)." : "Adres: 0 tot 65535.");
    if (!getalOk(c["commando"], 0, soort == IR_RC5 ? 127 : 65535)) return fout(soort == IR_RC5 ? "Commando: 0 tot 127 (RC5)." : "Commando: 0 tot 65535.");
    if (!naamOk(c["naam"])) return fout("Geef een naam.");
    JsonVariantConst raw = c["raw"];
    if (!raw.isNull()) {
      if (!raw.is<JsonArrayConst>() || raw.size() > (size_t)MAX_RAW) return fout("Raw: een lijst van hoogstens 256 tijden in µs.");
      for (JsonVariantConst x : raw.as<JsonArrayConst>())
        if (!x.is<long>() || x.as<long>() < 1 || x.as<long>() > 65535) return fout("Raw: elke tijd is 1 tot 65535 µs.");
    }
    int plaats = i;
    if (plaats < 0)
      for (int k = 0; k < MAX_IR_CODES && plaats < 0; k++)
        if (!b.cfg.ir[k].gebruikt) plaats = k;
    if (plaats < 0) return fout("Alle 32 plaatsen voor IR-codes zijn bezet. Wis eerst een code.");
    IrCode nieuw = b.cfg.ir[plaats];
    if (!nieuw.gebruikt) nieuw = IrCode();
    Lezer l;
    l.irCode(c, nieuw, plaats);
    nieuw.soort = (uint8_t)soort;
    if (soort == IR_RAW && nieuw.nRaw < 2) return fout("Een raw-code heeft minstens 2 tijden nodig (aan en uit).");
    if (soort != IR_RAW && raw.isNull()) nieuw.nRaw = 0;
    if (!irPast(nieuw)) { // F5: anders wordt ze later stil niet verzonden
      int m = irMaxHerhaal(nieuw);
      return m > 0 ? foutN("Deze code is met haar herhalingen te lang om in één keer te zenden: hoogstens %d keer herhalen.", m)
                   : fout("Deze code is te lang om te zenden (te veel of te lange tijden).");
    }
    b.cfg.ir[plaats] = nieuw;
    b.cfgRev++;
    return goedMet(plaats + 1, soort == IR_CONTINU ? IR_CONTINU_WAARSCHUWING : ""); // EN1
  }
  if (strcmp(actie, "zenden") == 0) {
    if (!bestaat) return fout("Deze IR-code bestaat niet.");
    uint64_t m;
    if (!lijstMasker(d["leds"], IR_LEDS, m)) return fout("IR-leds: een lijst met nummers 1 tot 8.");
    if (!b.irZenden(i, (uint8_t)m)) return fout("De doos is nog bezig met zenden. Probeer zo dadelijk opnieuw.");
    return goedMet(i + 1, b.cfg.ir[i].soort == IR_CONTINU ? IR_CONTINU_WAARSCHUWING : ""); // EN1
  }
  if (strcmp(actie, "wissen") == 0) {
    if (!bestaat) return fout("Deze IR-code bestaat niet.");
    b.cfg.ir[i] = IrCode();
    for (int h = 0; h < MAX_HALTES; h++) {
      if (b.cfg.halte[h].stopCode == i) b.cfg.halte[h].stopCode = -1;
      if (b.cfg.halte[h].rijdCode == i) b.cfg.halte[h].rijdCode = -1;
    }
    b.cfgRev++;
    return goed();
  }
  if (strcmp(actie, "hernoemen") == 0) {
    if (!bestaat) return fout("Deze IR-code bestaat niet.");
    char t[NAAM_LEN];
    kopieerNaam(t, d["naam"] | "");
    if (!t[0]) return fout("Geef een naam.");
    strcpy(b.cfg.ir[i].naam, t);
    b.cfgRev++;
    return goed(i + 1);
  }
  return fout("IR: kies \"leren\", \"bewaren\", \"zenden\", \"wissen\", \"hernoemen\" of \"zelftest\".");
}

// ------------------------------------------------------------------------------------------------------- bus
inline Antwoord apiBus(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "bewaren";
  if (strcmp(actie, "gezien") == 0) {
    int bus = index(d["bus"], MAX_BUSSEN);
    if (bus < 0 || !b.cfg.bus[bus].gebruikt) return fout("Deze bus bestaat niet.");
    const char *p = d["punt"] | "";
    if (!puntIdGeldig(p)) return fout("Welk punt? Geef \"punt\" (de id uit het plan, bv. \"P3\").");
    b.busGezien(bus, p, nu);
    return goed(bus + 1);
  }
  int i = index(d["nr"], MAX_BUSSEN);
  if (strcmp(actie, "wissen") == 0) {
    if (i < 0 || !b.cfg.bus[i].gebruikt) return fout("Deze bus bestaat niet.");
    b.cfg.bus[i] = BusCfg();
    b.volg.vergeetBus(i);
    b.cfgRev++;
    return goed();
  }
  if (strcmp(actie, "bewaren") != 0) return fout("Bus: kies \"bewaren\", \"wissen\" of \"gezien\".");
  if (!d["nr"].isNull() && i < 0) return foutN("Onbekende bus: \"nr\" van 1 tot %d.", MAX_BUSSEN);
  if (!naamOk(d["naam"])) return fout("Geef een naam.");
  JsonVariantConst k = d["kleur"], c = d["code"];
  if (!k.isNull() && (!k.is<const char *>() || !kleurGeldig(k.as<const char *>())))
    return fout("Kleur: zoals \"#d23\" of \"#dd2233\".");
  if (!c.isNull() && (!c.is<const char *>() || !codeTekstGeldig(c.as<const char *>())))
    return fout("Code: zoals een ontvanger ze leest, bv. \"nec:00FF12ED\" (of leeg).");
  if (i < 0)
    for (int x = 0; x < MAX_BUSSEN && i < 0; x++)
      if (!b.cfg.bus[x].gebruikt) i = x;
  if (i < 0) return fout("Alle 8 plaatsen voor bussen zijn bezet. Wis eerst een bus.");
  Lezer l;
  l.bus(d.as<JsonVariantConst>(), b.cfg.bus[i], i);
  b.cfgRev++;
  return goed(i + 1);
}

// ------------------------------------------------------------------------------------------------------ punt
inline Antwoord apiPunt(Baan &b, const char *body, size_t len, uint32_t nu) {
  (void)nu;
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "bewaren";
  const char *id = d["id"] | "";
  if (!puntIdGeldig(id)) return fout("Geef de id van het punt (1 tot 23 letters, cijfers, _ - .), zoals in het plan.");
  int i = b.volg.puntIndex(b.cfg.punt, id);
  if (strcmp(actie, "wissen") == 0) {
    if (i < 0) return fout("Dit punt bestaat niet.");
    b.cfg.punt[i] = PuntCfg();
    b.volg.vergeetPunt(id);
    b.cfgRev++;
    return goed();
  }
  if (strcmp(actie, "bewaren") != 0) return fout("Punt: kies \"bewaren\" of \"wissen\".");
  // 0 = loskoppelen (het dashboard stuurt {"id":"P3","ingang":0})
  JsonVariantConst in = d["ingang"], on = d["ontvanger"];
  if (!in.isNull() && (!in.is<int>() || in.as<int>() < 0 || in.as<int>() > N_INGANGEN)) return foutN("Ingang: 1 tot %d (0 = los).", N_INGANGEN);
  if (!on.isNull() && (!on.is<int>() || on.as<int>() < 0 || on.as<int>() > IR_ONTVANGERS)) return foutN("Ontvanger: 1 tot %d (0 = los).", IR_ONTVANGERS);
  if ((in | 0) > 0 && (on | 0) > 0) return fout("Een punt hangt aan een ingang OF aan een ontvanger, niet aan allebei.");
  if (i < 0 && in.isNull() && on.isNull()) return fout("Kies de bron van het punt: \"ingang\" of \"ontvanger\".");
  JsonVariantConst so = d["soort"];
  if (!so.isNull() && (!so.is<const char *>() || (meldSoortVanId(so.as<const char *>()) < 0 && strcmp(so.as<const char *>(), "auto") != 0)))
    return fout("Soort: \"hall\", \"ir\", \"ftr\" of \"auto\".");
  JsonVariantConst vo = d["volgende"];
  if (!vo.isNull() && (!vo.is<const char *>() || (vo.as<const char *>()[0] && !puntIdGeldig(vo.as<const char *>()))))
    return fout("\"volgende\": de id van een ander punt (of leeg).");
  if (!d["alleenBus"].isNull() && !d["alleenBus"].is<bool>()) return fout("alleenBus: true of false.");
  if (i < 0)
    for (int x = 0; x < MAX_PUNTEN && i < 0; x++)
      if (!b.cfg.punt[x].gebruikt) i = x;
  if (i < 0) return foutN("Alle %d plaatsen voor punten zijn bezet. Wis eerst een punt.", MAX_PUNTEN);
  Lezer l;
  l.punt(d.as<JsonVariantConst>(), b.cfg.punt[i]);
  b.cfgRev++;
  return goed(i + 1);
}

// ----------------------------------------------------------------------------------------------------- servo
inline bool servoBestaat(const Baan &b, int s) { return b.cfg.servo[s].gebruikt; }
inline bool irBestaat(const Baan &b, int s) { return b.cfg.ir[s].gebruikt; }

inline Antwoord apiServo(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "";
  int i = index(d["nr"], MAX_SERVOS);
  if (i < 0) return foutN("Welke servo? Geef \"nr\" van 1 tot %d.", MAX_SERVOS);
  bool bestaat = b.cfg.servo[i].gebruikt;
  if (strcmp(actie, "wissen") == 0) {
    if (!bestaat) return fout("Deze servo bestaat niet.");
    b.cfg.servo[i] = ServoCfg();
    b.servos.vergeet(i);
    for (int h = 0; h < MAX_HALTES; h++)
      if (b.cfg.halte[h].servo == i) b.cfg.halte[h].servo = -1;
    b.cfgRev++;
    return goed();
  }
  if (!d["naar"].isNull()) {
    const char *n = d["naar"] | "";
    int st = strcmp(n, "a") == 0 ? 0 : strcmp(n, "b") == 0 ? 1 : strcmp(n, "wissel") == 0 ? 2 : -1;
    if (st < 0) return fout("Naar: \"a\", \"b\" of \"wissel\".");
    if (!b.servoNaar(i, st, nu)) return fout("Deze servo bestaat niet.");
    return goed(i + 1);
  }
  if (!d["proef"].isNull()) {
    // het dashboard stuurt {"nr","kanaal","proef"}: ook voor een servo die nog niet bewaard is (eindstanden zoeken)
    if (!getalOk(d["proef"], SERVO_MIN_US, SERVO_MAX_US)) return fout("Proefstand: 500 tot 2500 µs.");
    if (!getalOk(d["kanaal"], 1, MAX_SERVOS)) return foutN("Kanaal: 1 tot %d.", MAX_SERVOS);
    if (!bestaat || !d["kanaal"].isNull()) {
      Lezer l;
      l.servo(d.as<JsonVariantConst>(), b.cfg.servo[i], i);
      b.cfgRev++;
    }
    b.servoProef(i, (uint16_t)d["proef"].as<int>(), nu);
    return goed(i + 1);
  }
  if (actie[0] && strcmp(actie, "bewaren") != 0) return fout("Servo: \"naar\", \"proef\", bewaren of \"wissen\".");
  if (!naamOk(d["naam"])) return fout("Geef een naam.");
  if (!getalOk(d["kanaal"], 1, MAX_SERVOS)) return foutN("Kanaal: 1 tot %d.", MAX_SERVOS);
  if (!getalOk(d["a"], SERVO_MIN_US, SERVO_MAX_US) || !getalOk(d["b"], SERVO_MIN_US, SERVO_MAX_US))
    return fout("Eindstanden A en B: 500 tot 2500 µs.");
  if (!getalOk(d["snelheid"], 0, SERVO_MAX_SNELHEID)) return fout("Snelheid: 0 (meteen) tot 20000 µs per seconde.");
  if (!getalOk(d["pulsUitS"], 0, SERVO_MAX_PULS_UIT_S)) return fout("pulsUitS: 0 (altijd een puls) of 1 tot 10 s.");
  JsonVariantConst so = d["soort"];
  if (!so.isNull() && (!so.is<const char *>() || servoSoortVanId(so.as<const char *>()) < 0))
    return fout("Soort: \"wissel\", \"slagboom\" of \"armsein\".");
  Lezer l;
  l.servo(d.as<JsonVariantConst>(), b.cfg.servo[i], i);
  // staat hij al ergens: naar de (eventueel nieuwe) eindstand van zijn stand
  if (bestaat && b.servos.t[i].actief && !b.servos.onderweg(i)) b.servoNaar(i, b.servos.t[i].stand, nu);
  b.cfgRev++;
  return goed(i + 1);
}

// ----------------------------------------------------------------------------------------------------- halte
inline Antwoord apiHalte(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "bewaren";
  int i = index(d["nr"], MAX_HALTES);
  if (strcmp(actie, "wissen") == 0) {
    if (i < 0 || !b.cfg.halte[i].gebruikt) return fout("Deze halte bestaat niet.");
    b.cfg.halte[i] = HalteCfg();
    b.haltesOpnieuw(nu, i);
    b.cfgRev++;
    return goed();
  }
  if (strcmp(actie, "bewaren") != 0) return fout("Halte: bewaren of \"wissen\".");
  if (!d["nr"].isNull() && i < 0) return foutN("Onbekende halte: \"nr\" van 1 tot %d.", MAX_HALTES);
  if (!naamOk(d["naam"])) return fout("Geef een naam.");
  JsonVariantConst ap = d["aankomstPunt"];
  if (!ap.isNull() && (!ap.is<const char *>() || (ap.as<const char *>()[0] && !puntIdGeldig(ap.as<const char *>()))))
    return fout("Aankomstpunt: de id van een punt uit het plan (bv. \"P5\").");
  uint64_t m, ms, mw;
  if (!lijstMasker(d["stopLeds"], IR_LEDS, ms)) return fout("Stopleds: een lijst met IR-leds 1 tot 8.");
  if (!lijstMasker(d["wachtLeds"], IR_LEDS, mw)) return fout("Wachtleds: een lijst met IR-leds 1 tot 8 (leeg = geen).");
  {
    // FN1: de wachtled moet een andere led zijn dan de stopled (stopLeds leeg = alle leds)
    uint8_t stop = d["stopLeds"].isNull() && i >= 0 ? b.cfg.halte[i].stopLeds : (uint8_t)ms;
    uint8_t wacht = d["wachtLeds"].isNull() && i >= 0 ? b.cfg.halte[i].wachtLeds : (uint8_t)mw;
    if (wacht && !stop) return fout("Met een wachtled moet je de stopled kiezen (niets gekozen = alle leds, ook de wachtled).");
    if (wacht & stop) return fout("Wachtled en stopled moeten verschillende IR-leds zijn: één led zendt één code tegelijk.");
  }
  if (!lijstMasker(d["vrijIngangen"], N_INGANGEN, m)) return foutN("Vrije ingangen: een lijst met ingangen 1 tot %d.", N_INGANGEN);
  if (!verwijzingOk(d["stopCode"], MAX_IR_CODES, irBestaat, b) || !verwijzingOk(d["rijdCode"], MAX_IR_CODES, irBestaat, b))
    return fout("Stop- of rijdcode: het nummer van een bewaarde IR-code (0 = geen).");
  if (!verwijzingOk(d["servo"], MAX_SERVOS, servoBestaat, b)) return fout("Servo: het nummer van een servo (0 = geen).");
  for (const char *k : {"wachtS", "vrijMinS", "groenS", "maxVerkeerS"})
    if (!getalOk(d[k], 0, HALTE_MAX_S)) return fout("Tijden van de halte: 0 tot 3600 s.");
  if (!d["herhalen"].isNull() && !d["herhalen"].is<bool>()) return fout("herhalen: true of false.");
  JsonVariantConst l = d["licht"];
  if (!l.isNull()) {
    if (!l.is<JsonObjectConst>()) return fout("Licht: {\"rood\":9,\"oranje\":10,\"groen\":11} (lichtgroepen, 0 = geen).");
    for (const char *k : {"rood", "oranje", "groen"})
      if (!verwijzingOk(l[k], N_GROEPEN, nullptr, b)) return foutN("Licht: lichtgroepen 1 tot %d (0 = geen).", N_GROEPEN);
  }
  if (i < 0)
    for (int x = 0; x < MAX_HALTES && i < 0; x++)
      if (!b.cfg.halte[x].gebruikt) i = x;
  if (i < 0) return fout("Alle 8 plaatsen voor haltes zijn bezet. Wis eerst een halte.");
  Lezer lz;
  lz.halte(d.as<JsonVariantConst>(), b.cfg.halte[i], i);
  b.haltesOpnieuw(nu, i);
  b.cfgRev++;
  return goedMet(i + 1, b.continuHalte(i) ? IR_CONTINU_WAARSCHUWING : ""); // EN1
}

// ---------------------------------------------------------------------------------------------------- kastje
inline Antwoord apiKastje(Baan &b, const char *body, size_t len, uint32_t nu) {
  JsonDocument d;
  Antwoord a;
  if (!leesVerzoek(body, len, d, a)) return a;
  const char *actie = d["actie"] | "";
  if (strcmp(actie, "aanmelden") == 0) {
    Kastje k;
    const char *id = d["id"] | "", *naam = d["naam"] | "", *ip = d["ip"] | "", *versie = d["versie"] | "";
    size_t n = strlen(id);
    if (n < 1 || n >= (size_t)KASTJE_ID_LEN) return fout("Id van het kastje: 1 tot 15 tekens.");
    for (const char *p = id; *p; p++)
      if (!isalnum((unsigned char)*p) && *p != '-' && *p != '_') return fout("Id van het kastje: letters en cijfers.");
    if (!ipGeldig(ip)) return fout("IP-adres van het kastje ontbreekt of klopt niet.");
    strcpy(k.id, id);
    strcpy(k.ip, ip);
    strncpy(k.naam, naam[0] ? naam : id, KASTJE_NAAM_LEN - 1);
    strncpy(k.versie, versie, KASTJE_VERSIE_LEN - 1);
    JsonVariantConst gs = d["geluiden"];
    if (!gs.isNull() && !gs.is<JsonArrayConst>()) return fout("\"geluiden\" moet een lijst zijn.");
    for (JsonVariantConst g : gs.as<JsonArrayConst>()) {
      if (k.nGeluiden >= MAX_GELUIDEN) break;
      const char *gn = g["naam"] | "";
      if (!geluidNaamGeldig(gn)) continue;
      Geluid &x = k.geluid[k.nGeluiden++];
      strcpy(x.naam, gn);
      double sec = g["s"] | 0.0;
      x.ds = (uint16_t)(sec < 0 ? 0 : (sec > 6000 ? 60000 : sec * 10 + 0.5));
    }
    // een naam die de doos gaf (hernoemen) blijft, ook als het kastje zich nog met de oude meldt
    int oud = b.kastjes.zoek(id);
    if (oud >= 0 && strcmp(b.kastjes.k[oud].id, id) == 0 && !naam[0]) strcpy(k.naam, b.kastjes.k[oud].naam);
    int p = b.kastjes.aanmelden(k, nu);
    if (p < 0) return fout("Er zijn al 8 geluidskastjes aangemeld.");
    return goed(p + 1);
  }
  const char *f = nullptr;
  if (strcmp(actie, "spelen") == 0) {
    if (!getalOk(d["volume"], 0, 100)) return fout("Volume: 0 tot 100.");
    f = b.kastjes.spelen(d["kastje"] | "", d["geluid"] | "", d["volume"] | 80, nu);
  } else if (strcmp(actie, "stop") == 0) {
    f = b.kastjes.stop(d["kastje"] | "", nu);
  } else if (strcmp(actie, "hernoemen") == 0) {
    f = b.kastjes.hernoemen(d["id"] | "", d["naam"] | "");
  } else {
    return fout("Kastje: \"aanmelden\", \"spelen\", \"stop\" of \"hernoemen\".");
  }
  if (f[0]) return fout(f);
  return goed();
}

// ------------------------------------------------------------------------------------------------- meldingen
/** GET /api/meldingen?sinds=<volgnr>: {"volgnr":812,"msNu":123456,"meldingen":[{"nr":811,"ms":..,"soort":"hall",
 *  "punt":"P3","ingang":5,"ontvanger":2,"code":"nec:..","bus":1}]} (ingang, ontvanger, code en bus alleen als ze er zijn) */
inline std::string apiMeldingen(const Baan &b, uint32_t sinds, uint32_t nu) {
  JsonDocument d;
  d["volgnr"] = b.volg.meldingen.volgnr;
  d["msNu"] = nu;
  JsonArray l = d["meldingen"].to<JsonArray>();
  const Melding *m[MAX_MELDINGEN];
  int n = b.volg.meldingen.sinds(sinds, m, MAX_MELDINGEN);
  for (int i = 0; i < n; i++) {
    JsonObject x = l.add<JsonObject>();
    x["nr"] = m[i]->nr;
    x["ms"] = m[i]->ms;
    x["soort"] = meldSoortId(m[i]->soort);
    x["punt"] = m[i]->punt;
    if (m[i]->ingang >= 0) x["ingang"] = m[i]->ingang + 1;
    if (m[i]->ontvanger >= 0) x["ontvanger"] = m[i]->ontvanger + 1;
    if (m[i]->code[0]) x["code"] = m[i]->code;
    if (m[i]->bus >= 0) x["bus"] = m[i]->bus + 1;
  }
  std::string t;
  serializeJson(d, t);
  return t;
}

/** "sinds" uit de vraag (tekst): een getal >= 0, anders 0 */
inline uint32_t sindsVan(const char *t) {
  uint32_t v = 0;
  if (!t) return 0;
  for (; *t >= '0' && *t <= '9'; t++) v = v * 10 + (uint32_t)(*t - '0');
  return v;
}

// --------------------------------------------------------------------------------------------- toegang (F6)
/** mag dit verzoek iets wijzigen? 0 = ja, 401 = wachtwoord nodig, 403 = een andere webpagina (Origin).
 *  clientIp: het IP van de client ("192.168.4.23"); kop: X-Treinbaan-Wachtwoord; origin/host: de koppen Origin en Host;
 *  thuisIp: het IP van de doos op het thuisnet ("" = niet verbonden). Regels (Fable 5.2, F6):
 *    - een Origin die niet de doos zelf is (http://192.168.4.1, http://treinbaan.local of http://<thuisIp>)
 *      = een formulier of script van een andere pagina: altijd 403;
 *    - FN5 (2.2.0): ook de kop Host moet de doos zelf zijn (192.168.4.1, treinbaan.local of het thuis-IP; leeg mag).
 *      Bij DNS-rebinding zijn Origin en Host allebei de naam van de aanvaller: 2.1.0 aanvaardde "Origin = Host";
 *    - van de eigen hotspot (192.168.4.x): goed;
 *    - anders (thuisnet) alleen met het wifi-wachtwoord in de kop. */
inline int toegang(const char *clientIp, const char *kop, const char *origin, const char *host, const char *thuisIp,
                   const char *wachtwoord) {
  // FN5: de naam van de doos zelf, eventueel met ":80"
  auto eigen = [thuisIp](const char *h) {
    if (!h || !h[0]) return false;
    for (const char *n : {"192.168.4.1", "treinbaan.local", thuisIp}) {
      if (!n || !n[0]) continue;
      size_t k = strlen(n);
      if (strncmp(h, n, k) == 0 && (h[k] == 0 || strcmp(h + k, ":80") == 0)) return true;
    }
    return false;
  };
  if (host && host[0] && !eigen(host)) return 403;
  if (origin && origin[0] && (strncmp(origin, "http://", 7) != 0 || !eigen(origin + 7))) return 403;
  if (clientIp && strncmp(clientIp, "192.168.4.", 10) == 0) return 0;
  if (kop && wachtwoord && wachtwoord[0] && strcmp(kop, wachtwoord) == 0) return 0;
  return 401;
}

inline Antwoord geweigerd(int code) {
  Antwoord a = fout(code == 403 ? "Geweigerd: dit verzoek komt van een andere webpagina (of niet via 192.168.4.1, "
                                  "treinbaan.local of het IP van de doos)."
                                : "Wachtwoord nodig: vul in het dashboard het wifi-wachtwoord van de doos in (alleen op het thuisnet nodig).");
  a.code = code;
  return a;
}

// -------------------------------------------------------------------------------------------- zelftest (Q1)
/** wat main.cpp op het bord nakijkt voor GET /api/zelftest */
struct ZelftestHw {
  bool i2c[5] = {false, false, false, false, false}; // 0x20, 0x21, 0x40, 0x41, 0x42 gevonden
  bool pcaTerug = false;      // de PCA9685 (0x40) gaf terug wat de doos schreef
  uint16_t pcaGeschreven = 0, pcaGelezen = 0;
  bool mcp1 = false, mcp2 = false, servo = false;
  bool fs = false;
  uint32_t fsTotaal = 0, fsGebruikt = 0;
  uint32_t stapelLicht = 0, stapelIr = 0, stapelKastjes = 0, stapelLoop = 0; // vrije bytes (hoogwatermerk, F15)
  int wifiClients = 0;
  uint32_t vrijGeheugen = 0, vrijPsram = 0;
};

inline std::string apiZelftest(const ZelftestHw &z) {
  JsonDocument d;
  static const uint8_t ADRES[5] = {0x20, 0x21, 0x40, 0x41, 0x42};
  static const char *WAT[5] = {"MCP23017 (IR-leds, ingang 17-23)", "MCP23017 (ingang 25-38, optioneel)",
                               "PCA9685 (groep 1-16)", "PCA9685 (groep 17-32, optioneel)", "PCA9685 (servo's)"};
  JsonArray i2c = d["i2c"].to<JsonArray>();
  for (int i = 0; i < 5; i++) {
    JsonObject x = i2c.add<JsonObject>();
    char a[8];
    snprintf(a, sizeof a, "0x%02X", ADRES[i]);
    x["adres"] = a;
    x["wat"] = WAT[i];
    x["gevonden"] = z.i2c[i];
  }
  JsonObject p = d["pca9685"].to<JsonObject>();
  p["ok"] = z.pcaTerug;
  p["geschreven"] = z.pcaGeschreven;
  p["gelezen"] = z.pcaGelezen;
  d["mcp23017"] = z.mcp1;
  d["mcp23017b"] = z.mcp2;
  d["servoPca"] = z.servo;
  JsonObject f = d["littlefs"].to<JsonObject>();
  f["ok"] = z.fs;
  f["totaal"] = z.fsTotaal;
  f["gebruikt"] = z.fsGebruikt;
  JsonObject s = d["stapelVrij"].to<JsonObject>();
  s["licht"] = z.stapelLicht;
  s["ir"] = z.stapelIr;
  s["kastjes"] = z.stapelKastjes;
  s["loop"] = z.stapelLoop;
  d["wifiClients"] = z.wifiClients;
  d["vrijGeheugen"] = z.vrijGeheugen;
  d["vrijPsram"] = z.vrijPsram;
  d["ok"] = z.i2c[0] && z.i2c[2] && z.i2c[4] && z.pcaTerug && z.mcp1 && z.servo && z.fs;
  std::string t;
  serializeJson(d, t);
  return t;
}

// ------------------------------------------------------------------------------------------------------ plan
/** PUT /api/plan: de body moet een JSON-object zijn van hoogstens 256 kB (het formaat van situatieplan/plan.json) */
inline const char *planFout(const char *body, size_t len) {
  if (!body || len == 0) return "Het plan is leeg.";
  if (len > MAX_PLAN) return "Het plan is te groot (hoogstens 256 kB).";
  JsonDocument d;
  JsonDocument filter; // alleen nakijken of het een object is: niets bijhouden
  filter["versie"] = true;
  if (deserializeJson(d, body, len, DeserializationOption::Filter(filter), DeserializationOption::NestingLimit(16)) ||
      !d.is<JsonObject>())
    return "Het plan is geen geldige JSON (een object).";
  return "";
}
inline Antwoord planNakijken(const char *body, size_t len) {
  const char *f = planFout(body, len);
  return f[0] ? fout(f) : goed();
}

/** naam van een bestand voor de tv-pagina (/tv/<naam>): 1..31 tekens, letters, cijfers, _ - . en een extensie */
inline bool tvNaamGeldig(const char *n) {
  if (!n || !n[0] || strlen(n) > 31 || n[0] == '.') return false;
  bool punt = false;
  for (const char *p = n; *p; p++) {
    if (*p == '.') punt = true;
    else if (!(isalnum((unsigned char)*p) || *p == '_' || *p == '-')) return false;
  }
  return punt;
}

/** het soort inhoud van een bestand voor de webserver */
inline const char *inhoudSoort(const char *n) {
  const char *e = strrchr(n, '.');
  if (!e) return "application/octet-stream";
  if (!strcmp(e, ".html") || !strcmp(e, ".htm")) return "text/html; charset=utf-8";
  if (!strcmp(e, ".json")) return "application/json";
  if (!strcmp(e, ".js")) return "text/javascript";
  if (!strcmp(e, ".css")) return "text/css";
  if (!strcmp(e, ".jpg") || !strcmp(e, ".jpeg")) return "image/jpeg";
  if (!strcmp(e, ".png")) return "image/png";
  if (!strcmp(e, ".svg")) return "image/svg+xml";
  if (!strcmp(e, ".webp")) return "image/webp";
  return "application/octet-stream";
}

} // namespace trein
