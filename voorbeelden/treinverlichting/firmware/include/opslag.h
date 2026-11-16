// Alle instellingen en de laatste stand, en hun JSON (bestanden in LittleFS en de JSON-API). Zonder hardware;
// testen: test/test_opslag.
//
// Twee bestanden in het flashgeheugen van de ESP:
//   /instellingen.json  namen, scènes, functies, ingangen, wachtwoord, dag/nacht-duur, opstartgedrag
//   /stand.json         de stand van de groepen (voor na een stroomonderbreking), apart zodat het vaak bewaren
//                       van de stand de instellingen nooit in gevaar brengt
// Elk bestand heeft een versienummer ("versie": 4, CONFIG_VERSIE) en wordt bij het laden volledig nagekeken:
//   - onleesbaar (kapotte JSON), te groot (> 160 kB, MAX_BESTAND), geen object, onbekende versie of een onderdeel van het verkeerde
//     soort (bv. "groepen" is geen lijst): het hele bestand is ONGELDIG -> standaardinstellingen + melding
//     (main.cpp bewaart het kapotte bestand als /instellingen.kapot.json, er gaat niets verloren);
//   - een losse waarde buiten het bereik of van het verkeerde soort (naam te lang, onbekend effect, nalopen -5):
//     die ene waarde wordt aangepast of krijgt de standaard, de rest blijft (HERSTELD + melding met het aantal).
// Versie 1 (firmware 1.0 tot 1.2, met dimmen) wordt netjes omgezet (OMGEZET, geen melding; main.cpp bewaart het
// bestand meteen als versie 2): "helderheid", "max" en "faduur" vallen weg (een groep die aan stond, blijft aan),
// een stap "helderheid" wordt "aan" (waarde > 0) of "uit" (0), de effecten vuur, tv en ademen worden "aan" zonder
// effect.
// Versie 2 (firmware 1.3.0) wordt gewoon geladen (OMGEZET, main.cpp bewaart het als versie 3): de nieuwe onderdelen
// van firmware 2.0.0 krijgen hun standaard (geen IR-codes, servo's, bussen, punten of haltes; alle ingangen npn).
// Versie 3 (firmware 2.0.0) heeft er bij: "ir" (32 IR-codes), "servos" (16), "bussen" (8), "punten" (48 meetpunten),
// "haltes" (8), per ingang "polariteit" (40 ingangen) en de functiestappen servo, ir en geluid. Met geleerde raw-codes
// kan het bestand groter worden: tot 160 kB.
// Versie 4 (firmware 2.1.0, Fable 5.2) heeft er bij: in "instellingen" "printSoort" (5 x "vcc"|"gnd"|"apart", E3),
// "irLedActiefLaag" (E1) en "irDuty" (33|50, E4); per IR-code de soort "continu" (F1) en "adres16"/"commando16"
// (F13); per servo "pulsUitS" (E19); per punt "alleenBus" (V1); per halte "herhalen" (F2) en "maxVerkeerS" (F12).
// Versie 1..3 laden nog (OMGEZET): de nieuwe waarden krijgen hun standaard, en een print waarop een pnp-ingang staat
// wordt "gnd" (zo bedraadde versie 3 PNP: COM aan 0 V, niets omkeren), de andere "vcc". Een pnp-ingang op een print
// "vcc" in een bestand van versie 4 kan niet: die ingang wordt npn (HERSTELD).
// Nooit crashen: elke waarde wordt begrensd voor ze gebruikt wordt; lijsten worden ingekort tot hun maximum.
#pragma once
#include <ArduinoJson.h>
#include <math.h>
#include <stdio.h>

#include <string>

#include "bussen.h"
#include "functies.h"
#include "halte.h"
#include "ingangen.h"
#include "ir.h"
#include "kastjes.h"
#include "servo.h"

namespace trein {

constexpr int CONFIG_VERSIE = 4;     // 4 = firmware 2.1.0 (printSoort, irLedActiefLaag, irDuty, ...)
constexpr int VERSIE_200 = 3;        // firmware 2.0.0 (IR, servo's, bussen, punten, haltes, polariteit)
constexpr int VERSIE_130 = 2;        // firmware 1.3.0: laadt gewoon, de nieuwe onderdelen krijgen hun standaard
constexpr int OUDE_VERSIE = 1;       // firmware 1.0 tot 1.2 (met dimmen): wordt bij het laden omgezet
constexpr size_t MAX_BESTAND = 160 * 1024;
constexpr const char *STD_WACHTWOORD = "treinbaan";
constexpr const char *HOTSPOT_NAAM = "Treinbaan";
constexpr uint16_t MIN_DAGNACHT_MIN = 2, MAX_DAGNACHT_MIN = 240;

struct GroepCfg {
  char naam[NAAM_LEN] = {0};
  bool dagnacht = false; // doet mee aan de dag/nacht-cyclus
};

struct Instellingen {
  uint16_t dagnachtMin = 20;   // duur van een hele dag (dag + avond + nacht + ochtend) in minuten
  bool opstartLaatste = true;  // na een stroomonderbreking: true = de laatste stand terug, false = alles uit
  char wachtwoord[64] = {0};   // wifi (WPA2): 8..63 gewone tekens
  // thuis-wifi (optioneel): de doos meldt zich daar ook aan (naast haar eigen hotspot); leeg = niet gebruikt
  char thuisSsid[33] = {0};        // 1..32 bytes
  char thuisWachtwoord[64] = {0};  // leeg (open netwerk) of 8..63 gewone tekens
  uint8_t printSoort[N_PRINTEN] = {PRINT_VCC, PRINT_VCC, PRINT_VCC, PRINT_VCC, PRINT_VCC}; // E3, per optocouplerprint
  bool irLedActiefLaag = UITGANG_ACTIEF_LAAG; // E1: polariteit van -Q4 (standaard dezelfde als -Q1)
  uint8_t irDuty = IR_DUTY_STD;               // E4: 33 of 50 %
};

/** keert de Baan ingang i om? (printsoort en polariteit, E3) */
inline bool ingangOmgekeerd(const Instellingen &in, const IngangCfg &c, int i) {
  int p = printVanIngang(i);
  return p >= 0 && ingangOmkeren(in.printSoort[p], c.polariteit);
}

struct Config {
  Instellingen inst;
  GroepCfg groep[N_GROEPEN];
  Scene scene[MAX_SCENES];
  Functie functie[MAX_FUNCTIES];
  IngangCfg ingang[N_INGANGEN];
  IrCode ir[MAX_IR_CODES];
  ServoCfg servo[MAX_SERVOS];
  BusCfg bus[MAX_BUSSEN];
  PuntCfg punt[MAX_PUNTEN];
  HalteCfg halte[MAX_HALTES];
};

/** wat na een stroomonderbreking terugkomt */
struct Stand {
  GroepStand groep[N_GROEPEN];
  bool dagnachtLoopt = false;
  uint32_t dagnachtPosMs = 0;
  uint16_t functies = 0; // lopende herhalende functies (bit f = functie f+1)
  uint16_t servosB = 0;  // servo's in stand B (bit s = servo s+1); de andere in A
};

enum class Laad { OK, OMGEZET, HERSTELD, ONGELDIG };

/** een codetekst zoals irTekst() ze maakt ("nec:...", "rc5:...", "raw:..."), of leeg */
inline bool codeTekstGeldig(const char *c) {
  if (!c) return false;
  if (!c[0]) return true;
  size_t n = strlen(c);
  if (n >= (size_t)IR_TEKST_LEN || n < 5) return false;
  if (strncmp(c, "nec:", 4) != 0 && strncmp(c, "rc5:", 4) != 0 && strncmp(c, "raw:", 4) != 0) return false;
  for (size_t i = 4; i < n; i++)
    if (!((c[i] >= '0' && c[i] <= '9') || (c[i] >= 'A' && c[i] <= 'F') || (c[i] >= 'a' && c[i] <= 'f'))) return false;
  return true;
}

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
  for (int i = 0; i < MAX_IR_CODES; i++) c.ir[i] = IrCode();
  for (int i = 0; i < MAX_SERVOS; i++) c.servo[i] = ServoCfg();
  for (int i = 0; i < MAX_BUSSEN; i++) c.bus[i] = BusCfg();
  for (int i = 0; i < MAX_PUNTEN; i++) c.punt[i] = PuntCfg();
  for (int i = 0; i < MAX_HALTES; i++) c.halte[i] = HalteCfg();
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
    s.aan = janee(v["aan"], s.aan); // "helderheid" (firmware 1.2) telt niet meer: aan blijft aan
    JsonVariantConst e = v["effect"];
    if (!e.isNull() && vervallenEffect(e.as<const char *>())) {
      // vuur, tv, ademen (firmware 1.2, met tussenwaarden): gewoon aan of uit zonder effect, hun instellingen vervallen
      s.effect = FX_GEEN;
      s.p1 = s.p2 = 0;
      s.fase = 0;
      return;
    }
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
    if (act < 0 && a.is<const char *>() && strcmp(a.as<const char *>(), "helderheid") == 0) {
      // firmware 1.2: "helderheid" met een waarde 1..100 -> aan (> 0) of uit (0)
      JsonVariantConst w = v["waarde"];
      act = (w.is<double>() && !(w.as<double>() > 0)) ? ACT_UIT : ACT_AAN;
    }
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
      case ACT_SCENE: s.waarde = getal(v["waarde"], 1, MAX_SCENES, 1); break;
      case ACT_DAGNACHT: s.waarde = getal(v["waarde"], 0, 1, 1); break;
      case ACT_EFFECT: {
        JsonVariantConst e = v["effect"];
        int nr = e.is<const char *>() ? effectVanId(e.as<const char *>()) : -1;
        if (nr < 0 && vervallenEffect(e.as<const char *>())) { s.actie = ACT_AAN; break; } // firmware 1.2: gewoon aan
        if (nr < 0) { hersteld++; nr = FX_GEEN; }
        s.effect = (uint8_t)nr;
        const EffectInfo &i = effectInfo(nr);
        s.p1 = getal(v["p1"], i.p1Min, i.p1Max, i.p1Std);
        s.p2 = getal(v["p2"], i.p2Min, i.p2Max, i.p2Std);
        break;
      }
      case ACT_SERVO: {
        s.groepen = 0;
        s.waarde = getal(v["servo"], 1, MAX_SERVOS, 1);
        JsonVariantConst st = v["stand"];
        const char *t = st.is<const char *>() ? st.as<const char *>() : "";
        if (strcmp(t, "a") == 0) s.stand = 0;
        else if (strcmp(t, "b") == 0) s.stand = 1;
        else if (strcmp(t, "wissel") == 0) s.stand = 2;
        else hersteld++;
        break;
      }
      case ACT_IR:
        s.groepen = 0;
        s.waarde = getal(v["code"], 1, MAX_IR_CODES, 1);
        s.leds = leds(v["leds"], 0);
        break;
      case ACT_GELUID: {
        s.groepen = 0;
        JsonVariantConst k = v["kastje"], g = v["geluid"];
        if (k.is<const char *>() && k.as<const char *>()[0] && strlen(k.as<const char *>()) < (size_t)KASTJE_NAAM_LEN)
          strcpy(s.kastje, k.as<const char *>());
        else hersteld++;
        if (g.is<const char *>() && geluidNaamGeldig(g.as<const char *>())) strcpy(s.geluid, g.as<const char *>());
        else hersteld++;
        s.volume = (uint8_t)getal(v["volume"], 0, 100, 80);
        break;
      }
      default: break;
    }
    s.wachtMs = seconden(v["wacht"], 0, MAX_WACHT_MS, 0);
    return true;
  }

  /** een lijst IR-leds (1..8) naar een masker; ontbreekt = huidig */
  uint8_t leds(JsonVariantConst v, uint8_t huidig) {
    if (v.isNull()) return huidig;
    if (!v.is<JsonArrayConst>()) { hersteld++; return huidig; }
    uint8_t m = 0;
    for (JsonVariantConst x : v.as<JsonArrayConst>()) {
      int8_t k = verwijzing(x, IR_LEDS, -1); // telt zelf wat niet klopt
      if (k >= 0) m |= (uint8_t)(1u << k);
    }
    return m;
  }

  /** een lijst ingangen (1..40) naar een masker */
  IngangMasker ingangLijst(JsonVariantConst v, IngangMasker huidig) {
    if (v.isNull()) return huidig;
    if (!v.is<JsonArrayConst>()) { hersteld++; return huidig; }
    IngangMasker m = 0;
    for (JsonVariantConst x : v.as<JsonArrayConst>()) {
      int8_t k = verwijzing(x, N_INGANGEN, -1);
      if (k >= 0) m |= ingangBit(k);
    }
    return m;
  }

  /** een korte tekst (id, kleur, code) met een eigen controle; fout = de huidige blijft */
  void tekst(JsonVariantConst v, char *doel, size_t len, bool (*geldig)(const char *)) {
    if (v.isNull()) return;
    if (!v.is<const char *>() || strlen(v.as<const char *>()) >= len || !geldig(v.as<const char *>())) { hersteld++; return; }
    strcpy(doel, v.as<const char *>());
  }

  void irCode(JsonVariantConst v, IrCode &c, int nr) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    if (!c.gebruikt) {
      c = IrCode();
      c.gebruikt = true;
      standaardNaam(c.naam, "Code", nr + 1);
    }
    naam(v["naam"], c.naam);
    JsonVariantConst so = v["soort"];
    if (!so.isNull()) {
      int x = so.is<const char *>() ? irSoortVanId(so.as<const char *>()) : -1;
      if (x < 0) hersteld++;
      else c.soort = (uint8_t)x;
    }
    c.khz = (uint8_t)getal(v["khz"], IR_KHZ_MIN, IR_KHZ_MAX, c.khz);
    bool rc5 = c.soort == IR_RC5;
    c.adres = (uint16_t)getal(v["adres"], 0, rc5 ? 31 : 65535, rc5 ? (c.adres & 31) : c.adres);
    c.commando = (uint16_t)getal(v["commando"], 0, rc5 ? 127 : 65535, rc5 ? (c.commando & 127) : c.commando);
    c.herhaal = (uint8_t)getal(v["herhaal"], 1, IR_HERHAAL_MAX, c.herhaal);
    JsonVariantConst r = v["raw"];
    if (r.is<JsonArrayConst>()) {
      c.nRaw = 0;
      for (JsonVariantConst x : r.as<JsonArrayConst>()) {
        if (c.nRaw >= MAX_RAW) { hersteld++; break; }
        c.raw[c.nRaw++] = (uint16_t)getal(x, 1, 65535, 1);
      }
    } else if (!r.isNull()) {
      hersteld++;
    }
    c.adres16 = janee(v["adres16"], c.adres16);
    c.commando16 = janee(v["commando16"], c.commando16);
  }

  void servo(JsonVariantConst v, ServoCfg &c, int nr) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    if (!c.gebruikt) {
      c = ServoCfg();
      c.gebruikt = true;
      c.kanaal = (uint8_t)nr;
      standaardNaam(c.naam, "Servo", nr + 1);
    }
    naam(v["naam"], c.naam);
    c.kanaal = (uint8_t)(getal(v["kanaal"], 1, MAX_SERVOS, c.kanaal + 1) - 1);
    c.a = (uint16_t)getal(v["a"], SERVO_MIN_US, SERVO_MAX_US, c.a);
    c.b = (uint16_t)getal(v["b"], SERVO_MIN_US, SERVO_MAX_US, c.b);
    c.snelheid = (uint16_t)getal(v["snelheid"], 0, SERVO_MAX_SNELHEID, c.snelheid);
    c.pulsUitS = (uint8_t)getal(v["pulsUitS"], 0, SERVO_MAX_PULS_UIT_S, c.pulsUitS);
    JsonVariantConst so = v["soort"];
    if (!so.isNull()) {
      int x = so.is<const char *>() ? servoSoortVanId(so.as<const char *>()) : -1;
      if (x < 0) hersteld++;
      else c.soort = (uint8_t)x;
    }
  }

  void bus(JsonVariantConst v, BusCfg &c, int nr) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    if (!c.gebruikt) {
      c = BusCfg();
      c.gebruikt = true;
      standaardNaam(c.naam, "Bus", nr + 1);
      strcpy(c.kleur, "#d23");
    }
    naam(v["naam"], c.naam);
    tekst(v["kleur"], c.kleur, sizeof c.kleur, kleurGeldig);
    tekst(v["code"], c.code, sizeof c.code, codeTekstGeldig);
  }

  /** een meetpunt; false = geen geldige id (dan niet te gebruiken) */
  bool punt(JsonVariantConst v, PuntCfg &c) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return false; }
    tekst(v["id"], c.id, sizeof c.id, puntIdGeldig);
    if (!puntIdGeldig(c.id)) return false;
    c.gebruikt = true;
    if (!v["ingang"].isNull()) {
      c.ingang = verwijzing(v["ingang"], N_INGANGEN, c.ingang);
      if (c.ingang >= 0) c.ontvanger = -1;
    }
    if (!v["ontvanger"].isNull()) {
      c.ontvanger = verwijzing(v["ontvanger"], IR_ONTVANGERS, c.ontvanger);
      if (c.ontvanger >= 0) c.ingang = -1;
    }
    JsonVariantConst so = v["soort"];
    if (!so.isNull()) {
      int x = so.is<const char *>() ? meldSoortVanId(so.as<const char *>()) : -1;
      if (so.is<const char *>() && strcmp(so.as<const char *>(), "auto") == 0) c.soort = MELD_AUTO;
      else if (x < 0) hersteld++;
      else c.soort = (uint8_t)x;
    }
    JsonVariantConst vo = v["volgende"];
    if (!vo.isNull()) {
      if (vo.is<const char *>() && (!vo.as<const char *>()[0] || puntIdGeldig(vo.as<const char *>())))
        strcpy(c.volgende, vo.as<const char *>());
      else hersteld++;
    }
    c.alleenBus = janee(v["alleenBus"], c.alleenBus);
    return true;
  }

  void halte(JsonVariantConst v, HalteCfg &c, int nr) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    if (!c.gebruikt) {
      c = HalteCfg();
      c.gebruikt = true;
      standaardNaam(c.naam, "Halte", nr + 1);
    }
    naam(v["naam"], c.naam);
    JsonVariantConst ap = v["aankomstPunt"];
    if (!ap.isNull()) {
      if (ap.is<const char *>() && (!ap.as<const char *>()[0] || puntIdGeldig(ap.as<const char *>())))
        strcpy(c.aankomstPunt, ap.as<const char *>());
      else hersteld++;
    }
    c.stopLeds = leds(v["stopLeds"], c.stopLeds);
    c.stopCode = verwijzing(v["stopCode"], MAX_IR_CODES, c.stopCode);
    c.rijdCode = verwijzing(v["rijdCode"], MAX_IR_CODES, c.rijdCode);
    c.wachtS = (uint16_t)getal(v["wachtS"], 0, HALTE_MAX_S, c.wachtS);
    c.vrijIngangen = ingangLijst(v["vrijIngangen"], c.vrijIngangen);
    c.vrijMinS = (uint16_t)getal(v["vrijMinS"], 0, HALTE_MAX_S, c.vrijMinS);
    JsonVariantConst l = v["licht"];
    if (l.is<JsonObjectConst>()) {
      c.rood = verwijzing(l["rood"], N_GROEPEN, c.rood);
      c.oranje = verwijzing(l["oranje"], N_GROEPEN, c.oranje);
      c.groen = verwijzing(l["groen"], N_GROEPEN, c.groen);
    } else if (!l.isNull()) {
      hersteld++;
    }
    c.groenS = (uint16_t)getal(v["groenS"], 0, HALTE_MAX_S, c.groenS);
    c.servo = verwijzing(v["servo"], MAX_SERVOS, c.servo);
    c.herhalen = janee(v["herhalen"], c.herhalen);
    c.maxVerkeerS = (uint16_t)getal(v["maxVerkeerS"], 0, HALTE_MAX_S, c.maxVerkeerS);
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
    JsonVariantConst s = v["soort"];
    if (!s.isNull()) {
      int nr = s.is<const char *>() ? soortVanId(s.as<const char *>()) : -1;
      if (nr < 0) hersteld++;
      else c.soort = (uint8_t)nr;
    }
    c.vasthoudMs = (uint16_t)seconden(v["vasthouden"], 0, MAX_VASTHOUD_MS, c.vasthoudMs);
    JsonVariantConst p = v["polariteit"];
    if (!p.isNull()) {
      int nr = p.is<const char *>() ? polariteitVanId(p.as<const char *>()) : -1;
      if (nr < 0) hersteld++;
      else c.polariteit = (uint8_t)nr;
    }
  }

  void groepCfg(JsonVariantConst v, GroepCfg &g) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
    naam(v["naam"], g.naam); // "max" (firmware 1.2) telt niet meer
    g.dagnacht = janee(v["dagnacht"], g.dagnacht);
  }

  void instellingen(JsonVariantConst v, Instellingen &i) {
    if (!v.is<JsonObjectConst>()) { if (!v.isNull()) hersteld++; return; }
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
    JsonVariantConst ps = v["printSoort"];
    if (ps.is<JsonArrayConst>()) {
      int k = 0;
      for (JsonVariantConst x : ps.as<JsonArrayConst>()) {
        if (k >= N_PRINTEN) { hersteld++; break; }
        int s = x.is<const char *>() ? printSoortVanId(x.as<const char *>()) : -1;
        if (s < 0) hersteld++;
        else i.printSoort[k] = (uint8_t)s;
        k++;
      }
    } else if (!ps.isNull()) {
      hersteld++;
    }
    i.irLedActiefLaag = janee(v["irLedActiefLaag"], i.irLedActiefLaag);
    JsonVariantConst du = v["irDuty"];
    if (!du.isNull()) {
      if (du.is<int>() && (du.as<int>() == 33 || du.as<int>() == 50)) i.irDuty = (uint8_t)du.as<int>();
      else hersteld++;
    }
  }
};

// ---------------------------------------------------------------------------------------------- JSON schrijven
inline void schrijfStand(JsonObject o, const GroepStand &s) {
  o["aan"] = s.aan;
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
  if (s.actie == ACT_SCENE || s.actie == ACT_DAGNACHT) o["waarde"] = s.waarde;
  if (s.actie == ACT_EFFECT) {
    o["effect"] = effectInfo(s.effect).id;
    o["p1"] = s.p1;
    o["p2"] = s.p2;
  }
  if (s.actie == ACT_SERVO) {
    o["servo"] = s.waarde;
    o["stand"] = s.stand == 1 ? "b" : (s.stand == 2 ? "wissel" : "a");
  }
  if (s.actie == ACT_IR) {
    o["code"] = s.waarde;
    JsonArray l = o["leds"].to<JsonArray>();
    for (int k = 0; k < IR_LEDS; k++)
      if (s.leds >> k & 1) l.add(k + 1);
  }
  if (s.actie == ACT_GELUID) {
    o["kastje"] = s.kastje;
    o["geluid"] = s.geluid;
    o["volume"] = s.volume;
  }
  o["wacht"] = s.wachtMs / 1000.0;
}

inline void schrijfLeds(JsonArray l, uint8_t m) {
  for (int k = 0; k < IR_LEDS; k++)
    if (m >> k & 1) l.add(k + 1);
}

/** een IR-code met zijn tijden (raw); voorApi: ook de codetekst en het aantal tijden (/api/staat) */
inline void schrijfIrCode(JsonObject o, const IrCode &c, bool metRaw) {
  o["naam"] = c.naam;
  o["soort"] = irSoortId(c.soort);
  o["khz"] = c.khz;
  o["adres"] = c.adres;
  o["commando"] = c.commando;
  o["herhaal"] = c.herhaal;
  if (c.nRaw) {
    JsonArray r = o["raw"].to<JsonArray>();
    for (int i = 0; i < c.nRaw; i++) r.add(c.raw[i]);
  }
  if (c.adres16) o["adres16"] = true;
  if (c.commando16) o["commando16"] = true;
  if (!metRaw) {
    char t[IR_TEKST_LEN];
    irCodeTekst(c, t, sizeof t);
    o["tekst"] = t;
    o["tijden"] = c.nRaw;
  }
}

inline void schrijfServo(JsonObject o, const ServoCfg &c) {
  o["naam"] = c.naam;
  o["kanaal"] = c.kanaal + 1;
  o["a"] = c.a;
  o["b"] = c.b;
  o["snelheid"] = c.snelheid;
  o["soort"] = servoSoortId(c.soort);
  o["pulsUitS"] = c.pulsUitS;
}

inline void schrijfBus(JsonObject o, const BusCfg &c) {
  o["naam"] = c.naam;
  o["kleur"] = c.kleur;
  o["code"] = c.code;
}

inline void schrijfPunt(JsonObject o, const PuntCfg &c) {
  o["id"] = c.id;
  if (c.ingang >= 0) o["ingang"] = c.ingang + 1;
  if (c.ontvanger >= 0) o["ontvanger"] = c.ontvanger + 1;
  o["soort"] = c.soort == MELD_AUTO ? "auto" : meldSoortId(c.soort);
  o["volgende"] = c.volgende;
  o["alleenBus"] = c.alleenBus;
}

inline void schrijfHalte(JsonObject o, const HalteCfg &c) {
  o["naam"] = c.naam;
  o["aankomstPunt"] = c.aankomstPunt;
  schrijfLeds(o["stopLeds"].to<JsonArray>(), c.stopLeds);
  o["stopCode"] = c.stopCode + 1;
  o["rijdCode"] = c.rijdCode + 1;
  o["wachtS"] = c.wachtS;
  JsonArray vi = o["vrijIngangen"].to<JsonArray>();
  for (int i = 0; i < N_INGANGEN; i++)
    if (c.vrijIngangen >> i & 1) vi.add(i + 1);
  o["vrijMinS"] = c.vrijMinS;
  JsonObject l = o["licht"].to<JsonObject>();
  l["rood"] = c.rood + 1;
  l["oranje"] = c.oranje + 1;
  l["groen"] = c.groen + 1;
  o["groenS"] = c.groenS;
  o["servo"] = c.servo + 1;
  o["herhalen"] = c.herhalen;
  o["maxVerkeerS"] = c.maxVerkeerS;
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
  o["soort"] = soortId(c.soort);
  o["vasthouden"] = c.vasthoudMs / 1000.0;
  o["polariteit"] = polariteitId(c.polariteit);
}

inline void schrijfInstellingen(JsonObject o, const Instellingen &i, bool metWachtwoord) {
  o["dagnachtMin"] = i.dagnachtMin;
  o["opstart"] = i.opstartLaatste ? "laatste" : "uit";
  if (metWachtwoord) o["wachtwoord"] = i.wachtwoord;
  JsonObject t = o["thuisnet"].to<JsonObject>();
  t["ssid"] = i.thuisSsid;
  if (metWachtwoord) t["wachtwoord"] = i.thuisWachtwoord;
  else t["metWachtwoord"] = i.thuisWachtwoord[0] != 0; // het dashboard krijgt het wachtwoord nooit te zien
  JsonArray ps = o["printSoort"].to<JsonArray>();
  for (int k = 0; k < N_PRINTEN; k++) ps.add(printSoortId(i.printSoort[k]));
  o["irLedActiefLaag"] = i.irLedActiefLaag;
  o["irDuty"] = i.irDuty;
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
  // de onderdelen van firmware 2.0.0: lijsten met vaste plaatsen (null = vrij); punten zonder vaste plaats
  JsonArray ir = o["ir"].to<JsonArray>();
  for (int i = 0; i < MAX_IR_CODES; i++) {
    if (!c.ir[i].gebruikt) { ir.add<JsonVariant>(); continue; }
    schrijfIrCode(ir.add<JsonObject>(), c.ir[i], true);
  }
  JsonArray sv = o["servos"].to<JsonArray>();
  for (int i = 0; i < MAX_SERVOS; i++) {
    if (!c.servo[i].gebruikt) { sv.add<JsonVariant>(); continue; }
    schrijfServo(sv.add<JsonObject>(), c.servo[i]);
  }
  JsonArray bs = o["bussen"].to<JsonArray>();
  for (int i = 0; i < MAX_BUSSEN; i++) {
    if (!c.bus[i].gebruikt) { bs.add<JsonVariant>(); continue; }
    schrijfBus(bs.add<JsonObject>(), c.bus[i]);
  }
  JsonArray pt = o["punten"].to<JsonArray>();
  for (int i = 0; i < MAX_PUNTEN; i++)
    if (c.punt[i].gebruikt) schrijfPunt(pt.add<JsonObject>(), c.punt[i]);
  JsonArray hs = o["haltes"].to<JsonArray>();
  for (int i = 0; i < MAX_HALTES; i++) {
    if (!c.halte[i].gebruikt) { hs.add<JsonVariant>(); continue; }
    schrijfHalte(hs.add<JsonObject>(), c.halte[i]);
  }
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
  if (!v.is<int>() || v.as<int>() < OUDE_VERSIE || v.as<int>() > CONFIG_VERSIE) return "onbekende versie";
  return "";
}

/** de instellingen laden en volledig nakijken. ONGELDIG: c = de standaardinstellingen. OMGEZET: een bestand van
 *  versie 1 (met dimmen), 2 (firmware 1.3.0) of 3 (2.0.0), zonder fouten omgezet; main.cpp bewaart het meteen als
 *  versie 4. */
inline Laad configVanJson(const char *tekst, size_t len, Config &c, std::string &melding) {
  melding.clear();
  standaard(c);
  JsonDocument d;
  std::string reden = kijkNa(tekst, len, d);
  if (reden.empty()) {
    // elk onderdeel moet het juiste soort zijn (of ontbreken)
    const char *lijsten[] = {"groepen", "scenes", "functies", "ingangen", "ir", "servos", "bussen", "punten", "haltes"};
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
  n = 0;
  for (JsonVariantConst x : d["ir"].as<JsonArrayConst>()) {
    if (n >= MAX_IR_CODES) { l.hersteld++; break; }
    if (!x.isNull()) l.irCode(x, c.ir[n], n);
    n++;
  }
  n = 0;
  for (JsonVariantConst x : d["servos"].as<JsonArrayConst>()) {
    if (n >= MAX_SERVOS) { l.hersteld++; break; }
    if (!x.isNull()) l.servo(x, c.servo[n], n);
    n++;
  }
  n = 0;
  for (JsonVariantConst x : d["bussen"].as<JsonArrayConst>()) {
    if (n >= MAX_BUSSEN) { l.hersteld++; break; }
    if (!x.isNull()) l.bus(x, c.bus[n], n);
    n++;
  }
  n = 0;
  for (JsonVariantConst x : d["punten"].as<JsonArrayConst>()) {
    if (n >= MAX_PUNTEN) { l.hersteld++; break; }
    PuntCfg p;
    if (!l.punt(x, p)) { l.hersteld++; continue; }
    bool dubbel = false;
    for (int k = 0; k < n; k++) dubbel |= strcmp(c.punt[k].id, p.id) == 0;
    if (dubbel) { l.hersteld++; continue; }
    c.punt[n++] = p;
  }
  n = 0;
  for (JsonVariantConst x : d["haltes"].as<JsonArrayConst>()) {
    if (n >= MAX_HALTES) { l.hersteld++; break; }
    if (!x.isNull()) l.halte(x, c.halte[n], n);
    n++;
  }
  bool oud = d["versie"].as<int>() != CONFIG_VERSIE;
  if (d["versie"].as<int>() < CONFIG_VERSIE) {
    // versie 1..3: een print met een pnp-ingang was bedraad met COM aan 0 V = "gnd" (niets omkeren), de andere "vcc"
    for (int p = 0; p < N_PRINTEN; p++) c.inst.printSoort[p] = PRINT_VCC;
    for (int i = 0; i < N_INGANGEN; i++) {
      int p = printVanIngang(i);
      if (p >= 0 && c.ingang[i].polariteit == POL_PNP) c.inst.printSoort[p] = PRINT_GND;
    }
  }
  for (int i = 0; i < N_INGANGEN; i++) {
    int p = printVanIngang(i);
    if (p >= 0 && !polariteitMag(c.inst.printSoort[p], c.ingang[i].polariteit)) {
      c.ingang[i].polariteit = POL_NPN; // pnp op een print "vcc" kan niet (E3)
      l.hersteld++;
    }
  }
  if (l.hersteld > 0) {
    char t[160];
    snprintf(t, sizeof t, "%d waarde%s in de instellingen klopte%s niet en %s aangepast.", l.hersteld,
             l.hersteld == 1 ? "" : "n", l.hersteld == 1 ? "" : "n", l.hersteld == 1 ? "is" : "zijn");
    melding = t;
    return Laad::HERSTELD;
  }
  return oud ? Laad::OMGEZET : Laad::OK;
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
  JsonArray sb = o["servosB"].to<JsonArray>();
  for (int i = 0; i < MAX_SERVOS; i++)
    if (s.servosB >> i & 1) sb.add(i + 1);
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
  for (JsonVariantConst x : d["servosB"].as<JsonArrayConst>()) {
    int32_t nr = l.getal(x, 0, MAX_SERVOS, 0);
    if (nr >= 1) s.servosB |= (uint16_t)(1u << (nr - 1));
  }
  return true;
}

} // namespace trein
