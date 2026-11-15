// De bushalte (firmware 2.0.0), zonder hardware: een toestandsmachine per halte. Testen: test/test_halte.
//
// Fasen:
//   vrij      wacht op een bus: een melding op het aankomstpunt (code, hallsensor of lichtsluis; de bus mag onbekend zijn)
//   aankomst  0,5 s: rood aan (oranje en groen uit), stopCode meteen via de stopLeds
//   stop      2 s: stopCode elke 0,5 s opnieuw (de bus mag hem niet missen)
//   wachten   wachtS seconden (in- en uitstappen)
//   verkeer   wacht tot ALLE vrijIngangen samen vrijMinS seconden onafgebroken niet actief waren (geen ingangen: meteen)
//   groen     groen aan, rood uit; rijdCode via de stopLeds (meteen en nog 2 keer om de 0,5 s); de servo (slagboom)
//             naar B; de rijtijd van de bus telt vanaf nu; groenS seconden
//   vertrek   groen uit, oranje 2 s; dan rood aan, oranje uit, servo terug naar A -> vrij
// Een halte die bezig is, let niet op een tweede bus (die wacht in de rij van de busbaan zelf: hij krijgt geen
// stopcode, Car System-bussen blijven dan staan bij het stoppunt ervoor als dat zo gebouwd is).
// Alles wat naar buiten gaat (IR, lichtgroepen, servo, vertrek) loopt via HalteUit (de Baan; in de tests een nep).
#pragma once
#include <stdint.h>
#include <string.h>

#include "bussen.h"
#include "ingangen.h"

namespace trein {

constexpr int MAX_HALTES = 8;
constexpr uint32_t HALTE_AANKOMST_MS = 500, HALTE_STOP_MS = 2000, HALTE_HERHAAL_MS = 500, HALTE_ORANJE_MS = 2000;
constexpr int HALTE_RIJD_KEER = 3;
constexpr uint16_t HALTE_MAX_S = 3600;

enum HalteFase : uint8_t { FASE_VRIJ, FASE_AANKOMST, FASE_STOP, FASE_WACHTEN, FASE_VERKEER, FASE_GROEN, FASE_VERTREK, N_FASEN };
inline const char *halteFaseId(int f) {
  static const char *T[N_FASEN] = {"vrij", "aankomst", "stop", "wachten", "verkeer", "groen", "vertrek"};
  return T[(f >= 0 && f < N_FASEN) ? f : 0];
}

struct HalteCfg {
  bool gebruikt = false;
  char naam[NAAM_LEN] = {0};
  char aankomstPunt[PUNT_ID_LEN] = {0};
  uint8_t stopLeds = 0;        // bit k = IR-led k+1
  int8_t stopCode = -1, rijdCode = -1; // IR-code (index), -1 = geen
  uint16_t wachtS = 12;
  IngangMasker vrijIngangen = 0;
  uint16_t vrijMinS = 3;
  int8_t rood = -1, oranje = -1, groen = -1; // lichtgroep (index), -1 = geen
  uint16_t groenS = 5;
  int8_t servo = -1;           // -1 = geen
};

struct HalteUit {
  virtual void halteIr(int code, uint8_t leds, uint32_t nu) = 0;
  virtual void halteLicht(int groep, bool aan, uint32_t nu) = 0;
  virtual void halteServo(int servo, bool naarB, uint32_t nu) = 0;
  virtual void halteVertrek(int bus, uint32_t nu) = 0;
  virtual ~HalteUit() {}
};

class Haltes {
 public:
  struct Toestand {
    uint8_t fase = FASE_VRIJ;
    int8_t bus = -1;
    uint32_t sinds = 0;      // begin van de fase
    uint32_t volgendeIr = 0; // stop/groen: wanneer de code opnieuw
    uint8_t rijdKeer = 0;
    uint32_t vrijSinds = 0;  // verkeer: sinds wanneer alles vrij is
  };
  Toestand t[MAX_HALTES];

  /** (opnieuw) beginnen: vrij, rood aan (na het opstarten en na het bewaren van de halte) */
  void begin(int h, const HalteCfg &c, HalteUit &u, uint32_t nu) {
    if (h < 0 || h >= MAX_HALTES) return;
    t[h] = Toestand();
    t[h].sinds = nu;
    if (!c.gebruikt) return;
    licht(c, u, true, false, false, nu);
  }

  /** een melding bij punt id (bus = index of -1): start de haltes met dat aankomstpunt die vrij zijn */
  void melding(const HalteCfg *cfg, const char *id, int bus, HalteUit &u, uint32_t nu) {
    for (int h = 0; h < MAX_HALTES; h++) {
      if (!cfg[h].gebruikt || t[h].fase != FASE_VRIJ || strcmp(cfg[h].aankomstPunt, id) != 0) continue;
      t[h].bus = (int8_t)bus;
      naarFase(h, cfg[h], FASE_AANKOMST, u, nu);
    }
  }

  /** elke tick; actief = de ingangen die nu actief zijn */
  void stap(const HalteCfg *cfg, IngangMasker actief, HalteUit &u, uint32_t nu) {
    for (int h = 0; h < MAX_HALTES; h++) {
      const HalteCfg &c = cfg[h];
      Toestand &x = t[h];
      if (!c.gebruikt) { x.fase = FASE_VRIJ; continue; }
      uint32_t in = nu - x.sinds;
      switch (x.fase) {
        case FASE_AANKOMST:
          if (in >= HALTE_AANKOMST_MS) naarFase(h, c, FASE_STOP, u, nu);
          break;
        case FASE_STOP:
          if (in >= HALTE_STOP_MS) naarFase(h, c, FASE_WACHTEN, u, nu);
          else if (voorbij(nu, x.volgendeIr)) {
            u.halteIr(c.stopCode, c.stopLeds, nu);
            x.volgendeIr += HALTE_HERHAAL_MS;
          }
          break;
        case FASE_WACHTEN:
          if (in >= (uint32_t)c.wachtS * 1000u) naarFase(h, c, FASE_VERKEER, u, nu);
          break;
        case FASE_VERKEER:
          if (actief & c.vrijIngangen) x.vrijSinds = nu;
          if (!c.vrijIngangen || nu - x.vrijSinds >= (uint32_t)c.vrijMinS * 1000u) naarFase(h, c, FASE_GROEN, u, nu);
          break;
        case FASE_GROEN:
          if (x.rijdKeer < HALTE_RIJD_KEER && voorbij(nu, x.volgendeIr)) {
            u.halteIr(c.rijdCode, c.stopLeds, nu);
            x.rijdKeer++;
            x.volgendeIr += HALTE_HERHAAL_MS;
          }
          if (in >= (uint32_t)c.groenS * 1000u) naarFase(h, c, FASE_VERTREK, u, nu);
          break;
        case FASE_VERTREK:
          if (in >= HALTE_ORANJE_MS) {
            licht(c, u, true, false, false, nu);
            if (c.servo >= 0) u.halteServo(c.servo, false, nu);
            x.fase = FASE_VRIJ;
            x.bus = -1;
            x.sinds = nu;
          }
          break;
        default:
          break;
      }
    }
  }

  /** hoeveel seconden de fase nog duurt (naar boven afgerond); verkeer: hoe lang alles nog vrij moet blijven */
  int resterendS(int h, const HalteCfg &c, uint32_t nu) const {
    const Toestand &x = t[h];
    uint32_t in = nu - x.sinds, duur = 0;
    switch (x.fase) {
      case FASE_AANKOMST: duur = HALTE_AANKOMST_MS; break;
      case FASE_STOP: duur = HALTE_STOP_MS; break;
      case FASE_WACHTEN: duur = (uint32_t)c.wachtS * 1000u; break;
      case FASE_VERKEER: duur = (uint32_t)c.vrijMinS * 1000u; in = nu - x.vrijSinds; break;
      case FASE_GROEN: duur = (uint32_t)c.groenS * 1000u; break;
      case FASE_VERTREK: duur = HALTE_ORANJE_MS; break;
      default: return 0;
    }
    return in >= duur ? 0 : (int)((duur - in + 999) / 1000);
  }

  /** houdt een halte deze bus vast? (aankomst tot en met verkeer) */
  bool houdtVast(int bus) const {
    if (bus < 0) return false;
    for (int h = 0; h < MAX_HALTES; h++)
      if (t[h].bus == bus && t[h].fase >= FASE_AANKOMST && t[h].fase <= FASE_VERKEER) return true;
    return false;
  }

 private:
  static void licht(const HalteCfg &c, HalteUit &u, bool rood, bool oranje, bool groen, uint32_t nu) {
    if (c.rood >= 0) u.halteLicht(c.rood, rood, nu);
    if (c.oranje >= 0) u.halteLicht(c.oranje, oranje, nu);
    if (c.groen >= 0) u.halteLicht(c.groen, groen, nu);
  }

  void naarFase(int h, const HalteCfg &c, uint8_t f, HalteUit &u, uint32_t nu) {
    Toestand &x = t[h];
    x.fase = f;
    x.sinds = nu;
    switch (f) {
      case FASE_AANKOMST:
        licht(c, u, true, false, false, nu);
        u.halteIr(c.stopCode, c.stopLeds, nu);
        break;
      case FASE_STOP:
        x.volgendeIr = nu; // meteen nog eens, daarna elke 0,5 s
        u.halteIr(c.stopCode, c.stopLeds, nu);
        x.volgendeIr = nu + HALTE_HERHAAL_MS;
        break;
      case FASE_VERKEER:
        x.vrijSinds = nu;
        break;
      case FASE_GROEN:
        licht(c, u, false, false, true, nu);
        u.halteIr(c.rijdCode, c.stopLeds, nu);
        x.rijdKeer = 1;
        x.volgendeIr = nu + HALTE_HERHAAL_MS;
        if (c.servo >= 0) u.halteServo(c.servo, true, nu);
        u.halteVertrek(x.bus, nu);
        break;
      case FASE_VERTREK:
        licht(c, u, false, true, false, nu);
        break;
      default:
        break;
    }
  }
};

} // namespace trein
