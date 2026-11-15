// De 16 ingangen (knoppen, schakelaars, sensoren, hallsensoren), zonder hardware. Testen: test/test_ingangen.
//
// main.cpp leest de 16 GPIO's elke 5 ms en geeft twee getallen met 16 bits door (bit i = ingang i+1):
//   ruw      de ingang is nu ACTIEF (de optocoupler trekt de pin laag; main.cpp keert dat al om)
//   flanken  sinds de vorige lezing was er minstens één "actief"-flank (een GPIO-interrupt zet die vlag, hw.h): zo
//            wordt ook een puls gezien die korter is dan 5 ms en tussen twee lezingen valt
//
// Soort per ingang (hoe het signaal gelezen wordt):
//   contact  knop, schakelaar, reed: een ingang wisselt pas als hij 30 ms onafgebroken de nieuwe waarde heeft
//            (contacten "stuiteren"); de flanken tellen niet mee
//   puls     hallsensor onder het spoor (magneet onder de loc) of een andere korte puls: GEEN ontdendering; elke lezing
//            met de ingang actief of met een flank telt als een puls. De ingang blijft daarna nog "vasthouden" ms
//            actief (standaard 300 ms), zodat de functies en het dashboard de puls zeker zien. Een puls van 1 ms
//            (zelfs korter, zolang de optocoupler schakelt) wordt zo altijd gezien.
// Teller per ingang (sinds het opstarten, te wissen): contact = aantal keer actief (na de ontdendering),
// puls = aantal pulsen (een nieuwe puls telt pas als de vorige lezing niets zag; pulsen binnen dezelfde 5 ms tellen
// samen als één).
// Gedrag per ingang (werkt op het signaal na de soort):
//   geen        alleen tonen in het dashboard
//   drukknop    bij indrukken functie A starten; met "wisselen": loopt A al, dan stopt hij (nog eens drukken = stop)
//   schakelaar  functie A bij aan, functie B bij uit
//   sensor      bij bezet functie A (één keer, ook als de sensor even wegvalt en terugkomt);
//               pas als hij N seconden onafgebroken vrij is: functie B
// Bij het opstarten geldt de eerste lezing als de rusttoestand: een knop of schakelaar die dan al actief is, start
// niets (anders zou na een stroomonderbreking alles nog eens starten).
#pragma once
#include <stdint.h>

#include "functies.h"

namespace trein {

constexpr int N_INGANGEN = 16;
constexpr uint32_t ONTDENDER_MS = 30;
constexpr uint16_t MAX_NALOOP_S = 3600;
constexpr uint16_t STD_VASTHOUD_MS = 300, MAX_VASTHOUD_MS = 10000; // puls: zo lang blijft de ingang actief

enum Soort : uint8_t { SOORT_CONTACT, SOORT_PULS, N_SOORTEN };

inline const char *soortId(int s) {
  static const char *T[N_SOORTEN] = {"contact", "puls"};
  return T[(s >= 0 && s < N_SOORTEN) ? s : 0];
}

inline int soortVanId(const char *id) {
  if (!id) return -1;
  for (int s = 0; s < N_SOORTEN; s++)
    if (strcmp(soortId(s), id) == 0) return s;
  return -1;
}

enum Gedrag : uint8_t { GEDRAG_GEEN, GEDRAG_DRUKKNOP, GEDRAG_SCHAKELAAR, GEDRAG_SENSOR, N_GEDRAG };

inline const char *gedragId(int g) {
  static const char *T[N_GEDRAG] = {"geen", "drukknop", "schakelaar", "sensor"};
  return T[(g >= 0 && g < N_GEDRAG) ? g : 0];
}

inline int gedragVanId(const char *id) {
  if (!id) return -1;
  for (int g = 0; g < N_GEDRAG; g++)
    if (strcmp(gedragId(g), id) == 0) return g;
  return -1;
}

struct IngangCfg {
  char naam[NAAM_LEN] = {0};
  uint8_t gedrag = GEDRAG_GEEN;
  int8_t functieA = -1, functieB = -1; // 0..15, -1 = geen
  bool wisselen = false;               // drukknop: nog eens drukken = stoppen
  uint16_t naloopS = 10;               // sensor: zoveel seconden vrij voor functie B
  uint8_t soort = SOORT_CONTACT;       // contact (30 ms ontdenderd) of puls (hallsensor)
  uint16_t vasthoudMs = STD_VASTHOUD_MS; // puls: zo lang na de puls nog actief
};

enum OpdrachtSoort : uint8_t { OPDR_START, OPDR_STOP, OPDR_WISSEL };

struct Opdracht {
  int8_t functie;
  uint8_t soort;
  uint8_t ingang;
};

class Ingangen {
 public:
  struct Toestand {
    bool ruw = false;      // laatste lezing
    bool actief = false;   // na de ontdendering (contact) of met de vasthoudtijd (puls)
    bool bezet = false;    // sensor: bezet gemeld (ook tijdens het nalopen)
    bool naloop = false;   // sensor: vrij, aan het aftellen
    bool gezien = false;   // puls: de vorige lezing zag de ingang actief of een flank
    uint32_t ruwSinds = 0, vrijSinds = 0, gezienOm = 0;
    uint32_t teller = 0;   // activeringen (contact) of pulsen (puls) sinds het opstarten
  };
  Toestand t[N_INGANGEN];

  /** nieuwe lezing verwerken; schrijft de opdrachten voor de functies in uit[] en geeft hun aantal.
   *  flanken: bit i = sinds de vorige lezing was er een actief-flank op ingang i+1 (de interrupt in main.cpp) */
  int stap(uint16_t ruw, uint32_t nu, const IngangCfg *cfg, Opdracht *uit, int max, uint16_t flanken = 0) {
    int n = 0;
    for (int i = 0; i < N_INGANGEN; i++) {
      bool r = (ruw >> i) & 1;
      Toestand &s = t[i];
      const IngangCfg &c = cfg[i];
      if (!gestart_) {
        s.ruw = s.actief = s.bezet = s.gezien = r;
        s.naloop = false;
        s.ruwSinds = s.gezienOm = nu;
        continue;
      }
      if (r != s.ruw) { s.ruw = r; s.ruwSinds = nu; }
      bool gewisseld = false;
      if (c.soort == SOORT_PULS) {
        // geen ontdendering: actief of een flank sinds de vorige lezing = puls; daarna nog vasthoudMs actief
        bool g = r || ((flanken >> i) & 1);
        if (g) {
          if (!s.gezien) s.teller++;
          s.gezienOm = nu;
        }
        s.gezien = g;
        bool a = g || (s.actief && nu - s.gezienOm < (uint32_t)c.vasthoudMs);
        if (a != s.actief) { s.actief = a; gewisseld = true; }
      } else {
        if (s.ruw != s.actief && nu - s.ruwSinds >= ONTDENDER_MS) {
          s.actief = s.ruw;
          gewisseld = true;
          if (s.actief) s.teller++;
        }
        s.gezien = s.actief; // overschakelen naar puls telt geen valse puls
      }
      auto zend = [&](int8_t f, uint8_t soort) {
        if (f >= 0 && f < MAX_FUNCTIES && n < max) uit[n++] = Opdracht{f, soort, (uint8_t)i};
      };
      switch (c.gedrag) {
        case GEDRAG_DRUKKNOP:
          if (gewisseld && s.actief) zend(c.functieA, c.wisselen ? OPDR_WISSEL : OPDR_START);
          break;
        case GEDRAG_SCHAKELAAR:
          if (gewisseld) zend(s.actief ? c.functieA : c.functieB, OPDR_START);
          break;
        case GEDRAG_SENSOR:
          if (s.actief) {
            s.naloop = false;
            if (!s.bezet) { s.bezet = true; zend(c.functieA, OPDR_START); }
          } else if (s.bezet) {
            if (!s.naloop) { s.naloop = true; s.vrijSinds = nu; }
            if (nu - s.vrijSinds >= (uint32_t)c.naloopS * 1000u) {
              s.bezet = false;
              s.naloop = false;
              zend(c.functieB, OPDR_START);
            }
          }
          break;
        default:
          break;
      }
      if (c.gedrag != GEDRAG_SENSOR) { s.bezet = s.actief; s.naloop = false; }
    }
    gestart_ = true;
    return n;
  }

  /** de teller van ingang i op 0 (i < 0: alle ingangen) */
  void tellerNul(int i = -1) {
    for (int k = 0; k < N_INGANGEN; k++)
      if (i < 0 || k == i) t[k].teller = 0;
  }

  /** sensor aan het nalopen: nog zoveel seconden (naar boven afgerond) tot "vrij"; anders -1 */
  int32_t vrijOver(int i, const IngangCfg &c, uint32_t nu) const {
    const Toestand &s = t[i];
    if (c.gedrag != GEDRAG_SENSOR || !s.naloop) return -1;
    uint32_t weg = nu - s.vrijSinds, totaal = (uint32_t)c.naloopS * 1000u;
    return weg >= totaal ? 0 : (int32_t)((totaal - weg + 999) / 1000);
  }

  /** een korte tekst voor het dashboard */
  const char *toestandTekst(int i, const IngangCfg &c) const {
    const Toestand &s = t[i];
    if (c.soort == SOORT_PULS && c.gedrag != GEDRAG_SENSOR) return s.actief ? "puls" : "rust"; // hallsensor
    switch (c.gedrag) {
      case GEDRAG_SENSOR: return s.actief ? "bezet" : (s.naloop ? "nalopen" : "vrij");
      case GEDRAG_SCHAKELAAR: return s.actief ? "aan" : "uit";
      case GEDRAG_DRUKKNOP: return s.actief ? "ingedrukt" : "los";
      default: return s.actief ? "actief" : "rust";
    }
  }

 private:
  bool gestart_ = false;
};

} // namespace trein
