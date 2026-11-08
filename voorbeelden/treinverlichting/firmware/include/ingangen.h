// De 16 ingangen (knoppen, schakelaars, sensoren), zonder hardware. Testen: test/test_ingangen.
//
// main.cpp leest de 16 GPIO's elke 5 ms en geeft een getal met 16 bits door: bit i = ingang i+1 is ACTIEF
// (de optocoupler trekt de pin laag; main.cpp keert dat al om).
//
// Ontdendering: een ingang wisselt pas als hij 30 ms onafgebroken de nieuwe waarde heeft (contacten "stuiteren").
// Gedrag per ingang:
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
    bool actief = false;   // na de ontdendering
    bool bezet = false;    // sensor: bezet gemeld (ook tijdens het nalopen)
    bool naloop = false;   // sensor: vrij, aan het aftellen
    uint32_t ruwSinds = 0, vrijSinds = 0;
  };
  Toestand t[N_INGANGEN];

  /** nieuwe lezing verwerken; schrijft de opdrachten voor de functies in uit[] en geeft hun aantal */
  int stap(uint16_t ruw, uint32_t nu, const IngangCfg *cfg, Opdracht *uit, int max) {
    int n = 0;
    for (int i = 0; i < N_INGANGEN; i++) {
      bool r = (ruw >> i) & 1;
      Toestand &s = t[i];
      if (!gestart_) {
        s.ruw = s.actief = s.bezet = r;
        s.naloop = false;
        s.ruwSinds = nu;
        continue;
      }
      if (r != s.ruw) { s.ruw = r; s.ruwSinds = nu; }
      bool gewisseld = false;
      if (s.ruw != s.actief && nu - s.ruwSinds >= ONTDENDER_MS) {
        s.actief = s.ruw;
        gewisseld = true;
      }
      const IngangCfg &c = cfg[i];
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
