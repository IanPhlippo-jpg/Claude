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
// Firmware 2.1.0 (Fable 5.2):
//   F2  "herhalen" (standaard aan): de stopcode elke 400 ms opnieuw in aankomst, stop, wachten en verkeer, voor een
//       bus die alleen stilstaat zolang hij IR ziet. Uit: zoals vroeger (aankomst en stop, 2,5 s). Na het opstarten
//       (en na het bewaren van een halte) zendt elke halte één keer haar rijdcode: een bus die de stopcode onthoudt en
//       tijdens een stroomonderbreking aan de halte stond, rijdt dan weer.
//   F3  een tweede bus die aankomt terwijl de halte bezet is, wordt onthouden (één wachtende per halte) en krijgt
//       meteen de stopcode (met herhalen: elke 400 ms, en dan geen rijdcode meer in groen); is de halte weer vrij, dan
//       begint ze meteen met die bus. Een melding van de bus die er al staat (of in aankomst..verkeer een onbekende)
//       telt niet als tweede bus.
//   F12 maxVerkeerS (standaard 60, 0 = geen grens): blijft een vrij-ingang langer bezet, dan toch groen, met een
//       melding (teLang). Regel voor vrijMinS: minstens de afstand van de sensor tot de invoeging / traagste snelheid.
// Codesoort "continu" (F1): de Baan laat de stopleds branden zolang de halte de bus vasthoudt (houdt()).
// Alles wat naar buiten gaat (IR, lichtgroepen, servo, vertrek) loopt via HalteUit (de Baan; in de tests een nep).
#pragma once
#include <stdint.h>
#include <string.h>

#include "bussen.h"
#include "ingangen.h"

namespace trein {

constexpr int MAX_HALTES = 8;
constexpr uint32_t HALTE_AANKOMST_MS = 500, HALTE_STOP_MS = 2000, HALTE_HERHAAL_MS = 500, HALTE_ORANJE_MS = 2000;
constexpr uint32_t HALTE_VASTHOUD_MS = 400; // F2: stopcode herhalen
constexpr uint16_t HALTE_MAX_VERKEER_STD_S = 60;
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
  bool herhalen = true;        // F2: stopcode elke 400 ms tot groen
  uint16_t maxVerkeerS = HALTE_MAX_VERKEER_STD_S; // F12: 0 = geen grens
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
    uint32_t volgendeStop = 0; // F2/F3: wanneer de stopcode opnieuw
    bool heeftWachtend = false; // F3: een tweede bus wacht
    int8_t wachtendBus = -1;
    bool teLang = false;     // F12: het verkeer bleef te lang bezet (toch groen gegeven)
  };
  Toestand t[MAX_HALTES];

  /** (opnieuw) beginnen: vrij, rood aan (na het opstarten en na het bewaren van de halte) */
  void begin(int h, const HalteCfg &c, HalteUit &u, uint32_t nu) {
    if (h < 0 || h >= MAX_HALTES) return;
    t[h] = Toestand();
    t[h].sinds = nu;
    if (!c.gebruikt) return;
    licht(c, u, true, false, false, nu);
    if (c.rijdCode >= 0) u.halteIr(c.rijdCode, c.stopLeds, nu); // F2: een bus die nog vastgehouden werd, mag rijden
  }

  /** een melding bij punt id (bus = index of -1): start de haltes met dat aankomstpunt die vrij zijn; een bezette
   *  halte onthoudt een tweede bus (F3) */
  void melding(const HalteCfg *cfg, const char *id, int bus, HalteUit &u, uint32_t nu) {
    for (int h = 0; h < MAX_HALTES; h++) {
      const HalteCfg &c = cfg[h];
      Toestand &x = t[h];
      if (!c.gebruikt || strcmp(c.aankomstPunt, id) != 0) continue;
      if (x.fase == FASE_VRIJ) {
        x.bus = (int8_t)bus;
        naarFase(h, c, FASE_AANKOMST, u, nu);
        continue;
      }
      if (bus >= 0 && bus == x.bus) continue;              // de bus die er al staat
      if (bus < 0 && x.fase <= FASE_VERKEER) continue;      // onbekend terwijl een bus staat: waarschijnlijk dezelfde
      if (x.heeftWachtend) continue;                        // hoogstens één wachtende
      x.heeftWachtend = true;
      x.wachtendBus = (int8_t)bus;
      u.halteIr(c.stopCode, c.stopLeds, nu);
      x.volgendeStop = nu + HALTE_VASTHOUD_MS;
    }
  }

  /** houdt de halte nu een bus vast (aankomst tot en met verkeer, of een wachtende bus)? */
  bool houdt(int h) const {
    const Toestand &x = t[h];
    return (x.fase >= FASE_AANKOMST && x.fase <= FASE_VERKEER) || (x.fase != FASE_VRIJ && x.heeftWachtend);
  }

  /** elke tick; actief = de ingangen die nu actief zijn */
  void stap(const HalteCfg *cfg, IngangMasker actief, HalteUit &u, uint32_t nu) {
    for (int h = 0; h < MAX_HALTES; h++) {
      const HalteCfg &c = cfg[h];
      Toestand &x = t[h];
      if (!c.gebruikt) { x.fase = FASE_VRIJ; continue; }
      uint32_t in = nu - x.sinds;
      // F2/F3: de stopcode herhalen zolang de halte een bus vasthoudt
      bool vasthouden = (x.fase >= FASE_AANKOMST && x.fase <= FASE_VERKEER) || (x.fase != FASE_VRIJ && x.heeftWachtend);
      if (c.herhalen && vasthouden && voorbij(nu, x.volgendeStop)) {
        u.halteIr(c.stopCode, c.stopLeds, nu);
        x.volgendeStop += HALTE_VASTHOUD_MS;
        if (voorbij(nu, x.volgendeStop)) x.volgendeStop = nu + HALTE_VASTHOUD_MS; // te ver achter: niet inhalen
      }
      switch (x.fase) {
        case FASE_AANKOMST:
          if (in >= HALTE_AANKOMST_MS) naarFase(h, c, FASE_STOP, u, nu);
          break;
        case FASE_STOP:
          if (in >= HALTE_STOP_MS) naarFase(h, c, FASE_WACHTEN, u, nu);
          else if (!c.herhalen && voorbij(nu, x.volgendeIr)) {
            u.halteIr(c.stopCode, c.stopLeds, nu);
            x.volgendeIr += HALTE_HERHAAL_MS;
          }
          break;
        case FASE_WACHTEN:
          if (in >= (uint32_t)c.wachtS * 1000u) naarFase(h, c, FASE_VERKEER, u, nu);
          break;
        case FASE_VERKEER:
          if (actief & c.vrijIngangen) x.vrijSinds = nu;
          if (!c.vrijIngangen || nu - x.vrijSinds >= (uint32_t)c.vrijMinS * 1000u) {
            naarFase(h, c, FASE_GROEN, u, nu);
          } else if (c.maxVerkeerS && in >= (uint32_t)c.maxVerkeerS * 1000u) {
            x.teLang = true; // F12: toch groen, de Baan meldt het
            naarFase(h, c, FASE_GROEN, u, nu);
          }
          break;
        case FASE_GROEN:
          if (!x.heeftWachtend && x.rijdKeer < HALTE_RIJD_KEER && voorbij(nu, x.volgendeIr)) {
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
            if (x.heeftWachtend) { // F3: meteen de volgende bus
              x.heeftWachtend = false;
              x.bus = x.wachtendBus;
              x.wachtendBus = -1;
              naarFase(h, c, FASE_AANKOMST, u, nu);
            }
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
        x.volgendeStop = nu + HALTE_VASTHOUD_MS;
        break;
      case FASE_STOP:
        if (c.herhalen) break; // de stopcode loopt al elke 400 ms
        u.halteIr(c.stopCode, c.stopLeds, nu); // meteen nog eens, daarna elke 0,5 s
        x.volgendeIr = nu + HALTE_HERHAAL_MS;
        break;
      case FASE_VERKEER:
        x.vrijSinds = nu;
        x.teLang = false;
        break;
      case FASE_GROEN:
        licht(c, u, false, false, true, nu);
        if (!x.heeftWachtend) u.halteIr(c.rijdCode, c.stopLeds, nu);
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
