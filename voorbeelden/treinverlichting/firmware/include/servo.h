// Servo's (firmware 2.0.0): wissels, slagbomen en armseinen op een tweede PCA9685 (0x42, 50 Hz), zonder hardware.
// Testen: test/test_servo.
//
// Per servo: kanaal (1..16 van de PCA9685 op 0x42), eindstand A en B in µs (500..2500), snelheid in µs per seconde
// (0 = meteen) en de soort (wissel, slagboom, armsein: alleen voor het dashboard en de tv).
// Bewegen: de puls schuift met de snelheid van de huidige stand naar het doel. Hoogstens 4 (2.2.0: maxBewegend, standaard 2) servo's tegelijk in beweging
// (om de 5-6 V-voeding te sparen: een servo trekt tijdens het bewegen tot 0,5-1 A); de andere wachten in volgorde van
// aanvraag in een rij. Een servo met snelheid 0 springt meteen naar zijn doel maar houdt 0,3 s een plaats bezet (zo lang
// heeft hij nodig om er te geraken). Krijgt een servo die al beweegt of wacht een nieuw doel, dan houdt hij zijn plaats.
// Een servo die nog nooit een stand kreeg, krijgt geen puls (kanaal 0 tellen = uit): hij blijft waar hij is.
// Firmware 2.1.0 (Fable 5.2):
//   E8  de eerste puls van een servo (na het opstarten: naarStart; of de eerste opdracht) gaat ook door de rij, en
//       hoogstens één servo per 300 ms krijgt zijn eerste puls: bij het opstarten gaan ze één voor één naar hun stand
//       in plaats van alle 16 samen (tot 16 x de blokkeerstroom op de 5,5 V).
//   E14 geremd (de Baan zet het als meer dan 12 lichtgroepen aan staan): geen nieuwe beweging, de rij wacht. (2.2.0:
//       standaard uit en één tegelijk in plaats van stilstaan, zie FN3.)
//   E19 pulsUitS per servo (0 = altijd een puls; 1..10): zoveel seconden na aankomst geen puls meer (een wissel die
//       tegen zijn aanslag duwt, trekt dan geen blokkeerstroom meer). De volgende opdracht zet de puls weer aan.
// Firmware 2.2.0 (Fable 5.2, tweede ronde):
//   EN3 maxBewegend (instelling servoMaxBewegend, 1..4, standaard 2): de XL4015 begrenst op 3 A; 2 x 1,2 A past, 4 niet.
//   FN3 de rem van E14 telt groepen, geen stroom: standaard UIT (instelling servoRemGroepen, 0 = uit). Staat ze aan en
//       branden er meer groepen, dan staan de servo's niet meer stil maar beweegt er één tegelijk. Een servo die
//       langer dan 5 s in de rij staat, geeft een melding (langWachtend; de Baan zet ze in logicaMelding).
// Tellen voor de PCA9685: 25 MHz / (4096 x (121 + 1)) = 50,03 Hz, één tel = 122 / 25 MHz = 4,88 µs; 1500 µs = 307 tellen.
#pragma once
#include <stdint.h>
#include <string.h>

#include "functies.h"

namespace trein {

constexpr int MAX_SERVOS = 16;
constexpr int SERVO_MAX_BEWEGEND = 4;      // de grens van de instelling servoMaxBewegend
constexpr int SERVO_MAX_BEWEGEND_STD = 2;  // EN3: 2 x 1,2 A binnen de 3 A van de XL4015
constexpr uint32_t SERVO_WACHT_MELDING_MS = 5000; // FN3: langer in de rij = een melding in het dashboard
constexpr uint16_t SERVO_MIN_US = 500, SERVO_MAX_US = 2500, SERVO_STD_US = 1500;
constexpr uint16_t SERVO_MAX_SNELHEID = 20000; // µs per seconde
constexpr uint32_t SERVO_SPRONG_MS = 300;       // een sprong duurt zo lang; ook: hoogstens één eerste puls per 300 ms
constexpr uint8_t SERVO_MAX_PULS_UIT_S = 10;
constexpr uint8_t PCA_SERVO_PRESCALE = 121;    // 50 Hz bij de interne oscillator van 25 MHz

enum ServoSoort : uint8_t { SERVO_WISSEL, SERVO_SLAGBOOM, SERVO_ARMSEIN, N_SERVO_SOORTEN };
inline const char *servoSoortId(int s) {
  static const char *T[N_SERVO_SOORTEN] = {"wissel", "slagboom", "armsein"};
  return T[(s >= 0 && s < N_SERVO_SOORTEN) ? s : 0];
}
inline int servoSoortVanId(const char *id) {
  if (!id) return -1;
  for (int s = 0; s < N_SERVO_SOORTEN; s++)
    if (strcmp(servoSoortId(s), id) == 0) return s;
  return -1;
}

enum ServoStand : uint8_t { STAND_A, STAND_B };

struct ServoCfg {
  bool gebruikt = false;
  char naam[NAAM_LEN] = {0};
  uint8_t kanaal = 0;          // 0..15 (in de API 1..16)
  uint16_t a = 1100, b = 1900; // µs
  uint16_t snelheid = 400;     // µs per seconde, 0 = meteen
  uint8_t soort = SERVO_WISSEL;
  uint8_t pulsUitS = 0;        // E19: 0 = altijd puls, anders de puls uit zoveel s na aankomst
};

/** µs naar tellen van de PCA9685 bij 50 Hz (prescale 121) */
inline uint16_t servoTellen(uint32_t us) { return (uint16_t)((us * 25u + 61u) / 122u); }

class Servos {
 public:
  struct Toestand {
    bool actief = false;  // heeft al een stand gekregen (anders geen puls)
    int32_t mus = 0;      // huidige puls in milli-µs (voor een gelijkmatige beweging)
    uint16_t doel = 0;    // µs
    uint8_t stand = STAND_A; // de laatst gevraagde eindstand (proef: de dichtste)
    bool beweegt = false, wacht = false;
    bool pulsUit = false;  // E19: na aankomst de puls uit
    uint32_t sinds = 0, laatst = 0, aangekomen = 0;
    uint32_t wachtSinds = 0; // FN3: sinds wanneer in de rij
  };
  Toestand t[MAX_SERVOS];
  bool geremd = false;     // E14/FN3: te veel lampen aan: hoogstens één servo tegelijk
  int maxBewegend = SERVO_MAX_BEWEGEND_STD; // EN3: hoeveel servo's tegelijk mogen bewegen (1..4)

  /** hoeveel er nu tegelijk mogen bewegen */
  int limiet() const {
    int m = maxBewegend < 1 ? 1 : (maxBewegend > SERVO_MAX_BEWEGEND ? SERVO_MAX_BEWEGEND : maxBewegend);
    return geremd ? 1 : m;
  }
  /** FN3: de eerste servo die al langer dan 5 s in de rij staat (-1 = geen) */
  int langWachtend(uint32_t nu) const {
    for (int i = 0; i < nRij_; i++)
      if (nu - t[rij_[i]].wachtSinds >= SERVO_WACHT_MELDING_MS) return rij_[i];
    return -1;
  }

  uint16_t us(int s) const { return (uint16_t)((t[s].mus + 500) / 1000); }
  bool onderweg(int s) const { return t[s].beweegt || t[s].wacht; }
  const char *standTekst(int s) const { return onderweg(s) ? "onderweg" : (t[s].stand == STAND_B ? "b" : "a"); }

  int bewegend() const {
    int n = 0;
    for (int s = 0; s < MAX_SERVOS; s++) n += t[s].beweegt;
    return n;
  }
  int wachtend() const { return nRij_; }

  /** na het opstarten naar de laatste stand, zonder beweging maar door de rij (E8): de puls komt pas als de servo aan
   *  de beurt is, één nieuwe servo per 300 ms */
  void naarStart(int s, uint16_t usDoel, uint8_t stand, uint32_t nu) {
    if (s < 0 || s >= MAX_SERVOS) return;
    uitRij(s);
    Toestand &x = t[s];
    x = Toestand();
    x.mus = (int32_t)usDoel * 1000;
    x.doel = usDoel;
    x.stand = stand;
    vraagPlaats(s, nu, true);
  }

  /** meteen op een stand zetten zonder beweging en zonder de rij (alleen voor proeven; het opstarten gebruikt
   *  naarStart) */
  void zetMeteen(int s, uint16_t usDoel, uint8_t stand) {
    if (s < 0 || s >= MAX_SERVOS) return;
    uitRij(s);
    Toestand &x = t[s];
    x = Toestand();
    x.actief = true;
    x.mus = (int32_t)usDoel * 1000;
    x.doel = usDoel;
    x.stand = stand;
  }

  /** naar een doel (µs) bewegen met de snelheid van c */
  void naar(int s, uint16_t usDoel, uint8_t stand, const ServoCfg &c, uint32_t nu) {
    if (s < 0 || s >= MAX_SERVOS) return;
    Toestand &x = t[s];
    usDoel = usDoel < SERVO_MIN_US ? SERVO_MIN_US : (usDoel > SERVO_MAX_US ? SERVO_MAX_US : usDoel);
    x.stand = stand;
    if (!x.actief) {
      // de eerste keer: de echte stand is onbekend; meteen naar het doel (een servo springt dan toch), maar door de
      // rij: actief (= puls) pas in begin() (E8)
      x.mus = (int32_t)usDoel * 1000;
      x.doel = usDoel;
      if (!x.beweegt && !x.wacht) vraagPlaats(s, nu, true);
      return;
    }
    x.doel = usDoel;
    if (x.beweegt || x.wacht) return; // houdt zijn plaats
    if (x.mus == (int32_t)usDoel * 1000) return;
    vraagPlaats(s, nu, c.snelheid == 0);
  }

  /** elke tick: de bewegende servo's verder schuiven, klare servo's maken plaats voor de rij */
  void stap(const ServoCfg *cfg, uint32_t nu) {
    for (int s = 0; s < MAX_SERVOS; s++) {
      Toestand &x = t[s];
      if (!x.beweegt) continue;
      uint32_t dt = nu - x.laatst;
      x.laatst = nu;
      int32_t doel = (int32_t)x.doel * 1000;
      uint16_t v = cfg[s].snelheid;
      if (v == 0) x.mus = doel;
      else {
        int32_t d = (int32_t)(dt * v); // milli-µs in dt ms
        if (x.mus < doel) x.mus = x.mus + d > doel ? doel : x.mus + d;
        else if (x.mus > doel) x.mus = x.mus - d < doel ? doel : x.mus - d;
      }
      bool klaar = x.mus == doel && (v != 0 || nu - x.sinds >= SERVO_SPRONG_MS);
      if (klaar) {
        x.beweegt = false;
        x.aangekomen = nu;
      }
    }
    for (int s = 0; s < MAX_SERVOS; s++) {
      Toestand &x = t[s];
      if (x.actief && !x.beweegt && !x.wacht && !x.pulsUit && cfg[s].pulsUitS &&
          nu - x.aangekomen >= (uint32_t)cfg[s].pulsUitS * 1000u)
        x.pulsUit = true;
    }
    while (nRij_ > 0 && bewegend() < limiet() && magBeginnen(rij_[0], nu)) {
      int s = rij_[0];
      memmove(rij_, rij_ + 1, (size_t)(nRij_ - 1));
      nRij_--;
      t[s].wacht = false;
      begin(s, nu, cfg[s].snelheid == 0);
    }
  }

  /** puls in tellen voor de PCA9685 (0 = geen puls) */
  uint16_t tellen(int s) const { return t[s].actief && !t[s].pulsUit ? servoTellen(us(s)) : 0; }

  /** een servo vergeten (gewist): geen puls meer */
  void vergeet(int s) {
    if (s < 0 || s >= MAX_SERVOS) return;
    uitRij(s);
    t[s] = Toestand();
  }

 private:
  uint8_t rij_[MAX_SERVOS];
  int nRij_ = 0;
  bool eersteGezet_ = false;
  uint32_t eersteOm_ = 0; // wanneer de laatste servo zijn eerste puls kreeg

  /** mag servo s nu beginnen? een servo zonder puls pas 300 ms na de vorige eerste puls (de rem zit in limiet()) */
  bool magBeginnen(int s, uint32_t nu) const {
    return t[s].actief || !eersteGezet_ || nu - eersteOm_ >= SERVO_SPRONG_MS;
  }

  void begin(int s, uint32_t nu, bool sprong) {
    Toestand &x = t[s];
    if (!x.actief) {
      x.actief = true;
      eersteGezet_ = true;
      eersteOm_ = nu;
    }
    x.pulsUit = false;
    x.beweegt = true;
    x.sinds = x.laatst = nu;
    if (sprong) x.mus = (int32_t)x.doel * 1000;
  }
  void vraagPlaats(int s, uint32_t nu, bool sprong) {
    if (bewegend() < limiet() && nRij_ == 0 && magBeginnen(s, nu)) { begin(s, nu, sprong); return; }
    t[s].wacht = true;
    t[s].wachtSinds = nu;
    rij_[nRij_++] = (uint8_t)s;
  }
  void uitRij(int s) {
    for (int i = 0; i < nRij_; i++)
      if (rij_[i] == s) {
        memmove(rij_ + i, rij_ + i + 1, (size_t)(nRij_ - i - 1));
        nRij_--;
        break;
      }
    t[s].wacht = false;
  }
};

} // namespace trein
