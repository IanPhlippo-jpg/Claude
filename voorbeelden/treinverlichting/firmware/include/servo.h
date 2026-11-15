// Servo's (firmware 2.0.0): wissels, slagbomen en armseinen op een tweede PCA9685 (0x42, 50 Hz), zonder hardware.
// Testen: test/test_servo.
//
// Per servo: kanaal (1..16 van de PCA9685 op 0x42), eindstand A en B in µs (500..2500), snelheid in µs per seconde
// (0 = meteen) en de soort (wissel, slagboom, armsein: alleen voor het dashboard en de tv).
// Bewegen: de puls schuift met de snelheid van de huidige stand naar het doel. Hoogstens 4 servo's tegelijk in beweging
// (om de 5-6 V-voeding te sparen: een servo trekt tijdens het bewegen tot 0,5-1 A); de andere wachten in volgorde van
// aanvraag in een rij. Een servo met snelheid 0 springt meteen naar zijn doel maar houdt 0,3 s een plaats bezet (zo lang
// heeft hij nodig om er te geraken). Krijgt een servo die al beweegt of wacht een nieuw doel, dan houdt hij zijn plaats.
// Een servo die nog nooit een stand kreeg, krijgt geen puls (kanaal 0 tellen = uit): hij blijft waar hij is.
// Tellen voor de PCA9685: 25 MHz / (4096 x (121 + 1)) = 50,03 Hz, één tel = 122 / 25 MHz = 4,88 µs; 1500 µs = 307 tellen.
#pragma once
#include <stdint.h>
#include <string.h>

#include "functies.h"

namespace trein {

constexpr int MAX_SERVOS = 16;
constexpr int SERVO_MAX_BEWEGEND = 4;
constexpr uint16_t SERVO_MIN_US = 500, SERVO_MAX_US = 2500, SERVO_STD_US = 1500;
constexpr uint16_t SERVO_MAX_SNELHEID = 20000; // µs per seconde
constexpr uint32_t SERVO_SPRONG_MS = 300;
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
    uint32_t sinds = 0, laatst = 0;
  };
  Toestand t[MAX_SERVOS];

  uint16_t us(int s) const { return (uint16_t)((t[s].mus + 500) / 1000); }
  bool onderweg(int s) const { return t[s].beweegt || t[s].wacht; }
  const char *standTekst(int s) const { return onderweg(s) ? "onderweg" : (t[s].stand == STAND_B ? "b" : "a"); }

  int bewegend() const {
    int n = 0;
    for (int s = 0; s < MAX_SERVOS; s++) n += t[s].beweegt;
    return n;
  }
  int wachtend() const { return nRij_; }

  /** meteen op een stand zetten zonder beweging (na het opstarten: de laatste stand) */
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
      // de eerste keer: de echte stand is onbekend; meteen naar het doel (een servo springt dan toch)
      x.actief = true;
      x.mus = (int32_t)usDoel * 1000;
      x.doel = usDoel;
      vraagPlaats(s, nu, true);
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
      if (klaar) x.beweegt = false;
    }
    while (nRij_ > 0 && bewegend() < SERVO_MAX_BEWEGEND) {
      int s = rij_[0];
      memmove(rij_, rij_ + 1, (size_t)(nRij_ - 1));
      nRij_--;
      t[s].wacht = false;
      begin(s, nu, cfg[s].snelheid == 0);
    }
  }

  /** puls in tellen voor de PCA9685 (0 = geen puls) */
  uint16_t tellen(int s) const { return t[s].actief ? servoTellen(us(s)) : 0; }

  /** een servo vergeten (gewist): geen puls meer */
  void vergeet(int s) {
    if (s < 0 || s >= MAX_SERVOS) return;
    uitRij(s);
    t[s] = Toestand();
  }

 private:
  uint8_t rij_[MAX_SERVOS];
  int nRij_ = 0;

  void begin(int s, uint32_t nu, bool sprong) {
    Toestand &x = t[s];
    x.beweegt = true;
    x.sinds = x.laatst = nu;
    if (sprong) x.mus = (int32_t)x.doel * 1000;
  }
  void vraagPlaats(int s, uint32_t nu, bool sprong) {
    if (bewegend() < SERVO_MAX_BEWEGEND && nRij_ == 0) { begin(s, nu, sprong); return; }
    t[s].wacht = true;
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
