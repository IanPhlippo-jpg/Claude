// De bushalte (firmware 2.0.0; 2.2.0: wachtLeds), zonder hardware: een toestandsmachine per halte. Testen: test/test_halte.
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
// Firmware 2.2.0 (Fable 5.2, tweede ronde):
//   FN1 een IR-led zendt één code tegelijk. In 2.1.0 ging de stopcode voor de wachtende bus via dezelfde stopLeds als
//       de rijdcode voor de eerste: de eerste bus kreeg in groen geen rijdcode en bleef staan. Nu heeft elke halte een
//       tweede masker wachtLeds (de IR-led vóór de halte, waar de tweede bus stilstaat):
//         - de stopcode voor de wachtende gaat ALLEEN via wachtLeds (elke 400 ms met herhalen);
//         - de eerste bus krijgt in groen ALTIJD zijn rijdcode via stopLeds (3 keer), wat er ook wacht;
//         - is de halte weer vrij, dan krijgt de wachtende zijn rijdcode via wachtLeds (3 keer) en begint de halte
//           met hem (stopcode via stopLeds: hij rijdt van de wachtled naar de stopled en stopt daar);
//         - wachtLeds leeg: de tweede bus wordt niet tegengehouden en niet onthouden (zoals 2.0.0).
//       wachtLeds en stopLeds mogen geen led delen (de API weigert het).
//   FN7 na het opstarten gaat de rijdcode 3 keer (om de 0,5 s) via stopLeds en wachtLeds, zoals in groen.
// Codesoort "continu" (F1): de Baan laat de stopleds branden zolang de halte de eerste bus vasthoudt (houdtStop) en
// de wachtleds zolang er een bus wacht (houdtWacht).
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
constexpr uint32_t HALTE_CONTINU_MARGE_MS = 10000; // EN1: marge op de grens voor een continu-stopled

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
  uint8_t wachtLeds = 0;       // FN1: de IR-led(s) vóór de halte voor een tweede bus; 0 = de tweede bus niet tegenhouden
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
    uint32_t volgendeStop = 0; // F2: wanneer de stopcode opnieuw (stopLeds)
    uint32_t volgendeWacht = 0; // FN1: wanneer de stopcode voor de wachtende opnieuw (wachtLeds)
    bool heeftWachtend = false; // F3: een tweede bus wacht
    int8_t wachtendBus = -1;
    bool teLang = false;     // F12: het verkeer bleef te lang bezet (toch groen gegeven)
    uint8_t opstartKeer = 0;   // FN7: na het opstarten nog zoveel keer de rijdcode (in vrij)
    uint8_t wachtRijdKeer = 0; // FN1: de vorige wachtende rijdt door: nog zoveel keer de rijdcode via wachtLeds
    uint32_t volgendeWachtRijd = 0;
    uint32_t vastSinds = 0;    // EN1: begin van aankomst (de eerste bus wordt vastgehouden)
    uint32_t wachtBegin = 0;   // EN1: sinds wanneer de tweede bus wacht
  };
  Toestand t[MAX_HALTES];

  /** (opnieuw) beginnen: vrij, rood aan (na het opstarten en na het bewaren van de halte) */
  void begin(int h, const HalteCfg &c, HalteUit &u, uint32_t nu) {
    if (h < 0 || h >= MAX_HALTES) return;
    t[h] = Toestand();
    t[h].sinds = nu;
    if (!c.gebruikt) return;
    licht(c, u, true, false, false, nu);
    if (c.rijdCode < 0) return;
    // F2/FN7: een bus die nog vastgehouden werd (ook aan de wachtled), mag rijden: 3 keer, om de 0,5 s
    u.halteIr(c.rijdCode, opstartLeds(c), nu);
    t[h].opstartKeer = HALTE_RIJD_KEER - 1;
    t[h].volgendeIr = nu + HALTE_HERHAAL_MS;
  }

  /** de leds voor de rijdcode na het opstarten: stopLeds en wachtLeds (stopLeds leeg = alle) */
  static uint8_t opstartLeds(const HalteCfg &c) { return c.stopLeds ? (uint8_t)(c.stopLeds | c.wachtLeds) : 0; }

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
      if (!c.wachtLeds) continue;                           // FN1: geen wachtled: niet tegenhouden (zoals 2.0.0)
      x.heeftWachtend = true;
      x.wachtendBus = (int8_t)bus;
      x.wachtRijdKeer = 0;
      x.wachtBegin = nu;
      u.halteIr(c.stopCode, c.wachtLeds, nu); // FN1: alleen via de wachtled
      x.volgendeWacht = nu + HALTE_VASTHOUD_MS;
    }
  }

  /** houdt de halte de eerste bus vast (aankomst tot en met verkeer)? dan de stopcode via stopLeds */
  bool houdtStop(int h) const { return t[h].fase >= FASE_AANKOMST && t[h].fase <= FASE_VERKEER; }
  /** wacht er een tweede bus aan de wachtled? dan de stopcode via wachtLeds (FN1) */
  bool houdtWacht(int h) const { return t[h].fase != FASE_VRIJ && t[h].heeftWachtend; }
  /** houdt de halte nu een bus vast (de eerste of een wachtende)? */
  bool houdt(int h) const { return houdtStop(h) || houdtWacht(h); }

  /** EN1: hoe lang een continu-stopled hoogstens brandt: aankomst + stop + wachtS + maxVerkeerS (0 = geen grens: dan
   *  60 s) + 10 s marge; aan de wachtled ook nog groen en oranje van de bus ervoor. Normaal komt groen eerder; alleen
   *  bij "geen grens" of een fout gaat de led op deze grens uit (de weerstand mag niet blijvend 0,95 W krijgen). */
  static uint32_t continuGrensMs(const HalteCfg &c, bool wacht) {
    uint32_t verkeer = (uint32_t)(c.maxVerkeerS ? c.maxVerkeerS : HALTE_MAX_VERKEER_STD_S) * 1000u;
    uint32_t g = HALTE_AANKOMST_MS + HALTE_STOP_MS + (uint32_t)c.wachtS * 1000u + verkeer + HALTE_CONTINU_MARGE_MS;
    return wacht ? g + (uint32_t)c.groenS * 1000u + HALTE_ORANJE_MS : g;
  }
  /** EN1: mag de continu-stopled (wacht = de wachtled) nu nog branden? */
  bool continuMag(int h, const HalteCfg &c, uint32_t nu, bool wacht) const {
    const Toestand &x = t[h];
    return wacht ? houdtWacht(h) && nu - x.wachtBegin < continuGrensMs(c, true)
                 : houdtStop(h) && nu - x.vastSinds < continuGrensMs(c, false);
  }
  /** EN1: hield de halte langer vast dan een continu-stopled mag branden? */
  bool continuTeLang(int h, const HalteCfg &c, uint32_t nu) const {
    return (houdtStop(h) && !continuMag(h, c, nu, false)) || (houdtWacht(h) && !continuMag(h, c, nu, true));
  }

  /** elke tick; actief = de ingangen die nu actief zijn */
  void stap(const HalteCfg *cfg, IngangMasker actief, HalteUit &u, uint32_t nu) {
    for (int h = 0; h < MAX_HALTES; h++) {
      const HalteCfg &c = cfg[h];
      Toestand &x = t[h];
      if (!c.gebruikt) { x.fase = FASE_VRIJ; continue; }
      uint32_t in = nu - x.sinds;
      // F2: de stopcode herhalen zolang de halte de eerste bus vasthoudt (via stopLeds)
      if (c.herhalen && houdtStop(h) && voorbij(nu, x.volgendeStop)) {
        u.halteIr(c.stopCode, c.stopLeds, nu);
        x.volgendeStop += HALTE_VASTHOUD_MS;
        if (voorbij(nu, x.volgendeStop)) x.volgendeStop = nu + HALTE_VASTHOUD_MS; // te ver achter: niet inhalen
      }
      // FN1: los daarvan de stopcode voor de wachtende bus, via wachtLeds
      if (c.herhalen && houdtWacht(h) && voorbij(nu, x.volgendeWacht)) {
        u.halteIr(c.stopCode, c.wachtLeds, nu);
        x.volgendeWacht += HALTE_VASTHOUD_MS;
        if (voorbij(nu, x.volgendeWacht)) x.volgendeWacht = nu + HALTE_VASTHOUD_MS;
      }
      // FN1: de vorige wachtende rijdt van de wachtled naar de stopled (rijdcode nog 2 keer via wachtLeds)
      if (x.wachtRijdKeer && voorbij(nu, x.volgendeWachtRijd)) {
        u.halteIr(c.rijdCode, c.wachtLeds, nu);
        x.wachtRijdKeer--;
        x.volgendeWachtRijd += HALTE_HERHAAL_MS;
      }
      switch (x.fase) {
        case FASE_VRIJ: // FN7: na het opstarten de rijdcode nog 2 keer
          if (x.opstartKeer && voorbij(nu, x.volgendeIr)) {
            u.halteIr(c.rijdCode, opstartLeds(c), nu);
            x.opstartKeer--;
            x.volgendeIr += HALTE_HERHAAL_MS;
          }
          break;
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
          if (x.rijdKeer < HALTE_RIJD_KEER && voorbij(nu, x.volgendeIr)) { // FN1: ook als er een bus wacht
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
              // FN1: hij staat aan de wachtled: daar de rijdcode (3 keer), dan stopt hij aan de stopled
              if (c.rijdCode >= 0) {
                u.halteIr(c.rijdCode, c.wachtLeds, nu);
                x.wachtRijdKeer = HALTE_RIJD_KEER - 1;
                x.volgendeWachtRijd = nu + HALTE_HERHAAL_MS;
              }
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
        x.opstartKeer = 0; // FN7: een bus komt aan: geen rijdcodes van het opstarten meer
        x.vastSinds = nu;
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
        u.halteIr(c.rijdCode, c.stopLeds, nu); // FN1: altijd, ook als er een bus wacht (die zit aan wachtLeds)
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
