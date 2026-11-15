// Het lichthart van de doos: van de stand van een groep (aan/uit, effect) naar aan of uit voor het PCA9685-kanaal.
// Zonder hardware (geen Arduino-functies): main.cpp geeft de tijd en schrijft de uitgangen weg. Zo is alles op de pc
// te testen (test/test_licht, pio test -e native).
//
// Firmware 1.3.0 (Ian, 2026-11-15: "dimmers zijn niet nodig"): elke groep is alleen AAN of UIT. Geen helderheid,
// geen zachte overgang, geen maximum en geen gamma meer; de PCA9685 zet elk kanaal volledig aan of volledig uit
// (het aan/uit-bit, geen PWM-waarden). Effecten die alleen aan/uit nodig hebben, blijven:
//   knipperen  vaste aan- en uittijd
//   overweg    twee groepen om beurten
//   lasvlam    reeksen korte flitsen met een pauze ertussen
//   tl         een tl-buis die een paar keer flikkert en dan blijft branden
// Vervallen (vroegen tussenwaarden): vuur, tv en ademen. Een oude instelling met zo'n effect wordt gewoon "aan".
// Elke 10 ms (stap) rekent Lampen per groep uit of ze brandt: uitgang = masker (bit g = groep g+1 brandt).
//
// Alle tijden zijn millis() van de ESP (uint32). Vergelijken gaat altijd met verschillen (voorbij()), zodat de
// doos ook na 49 dagen (als millis() rondloopt) gewoon verder werkt.
// Effecten met toeval gebruiken een eigen rekenreeks per groep (vaste startwaarde): dezelfde tijden geven altijd
// dezelfde uitvoer (testbaar), en hoe vaak er gerekend wordt maakt voor het patroon niet uit.
#pragma once
#include <stdint.h>
#include <string.h>

namespace trein {

// Het aantal lichtgroepen: standaard 16 (één PCA9685). Uitbreiden tot 32 met een tweede PCA9685 op 0x41:
// build_flags = -DTREIN_GROEPEN=32 (zie README, "Uitbreiden"). Groepen zitten als bits in een GroepMasker (32 bit).
#ifndef TREIN_GROEPEN
#define TREIN_GROEPEN 16
#endif
constexpr int N_GROEPEN = TREIN_GROEPEN;
static_assert(N_GROEPEN >= 1 && N_GROEPEN <= 32, "TREIN_GROEPEN moet 1 tot 32 zijn");
/** bit i = groep i+1 */
typedef uint32_t GroepMasker;
/** het masker met alle groepen */
constexpr GroepMasker ALLE_GROEPEN = (GroepMasker)(0xFFFFFFFFu >> (32 - N_GROEPEN));
/** het masker van één groep (index 0..N_GROEPEN-1) */
inline GroepMasker groepBit(int g) { return (GroepMasker)1u << g; }

/** is het moment al aangebroken? (werkt ook als millis() rondloopt) */
inline bool voorbij(uint32_t nu, uint32_t moment) { return (int32_t)(nu - moment) >= 0; }

inline int32_t klem(int32_t v, int32_t lo, int32_t hi) { return v < lo ? lo : (v > hi ? hi : v); }

enum Effect : uint8_t { FX_GEEN, FX_KNIPPEREN, FX_OVERWEG, FX_LASVLAM, FX_TL, N_EFFECTEN };

/** per effect: de naam in de API en twee eenvoudige instellingen met grenzen en standaardwaarde
 *  (het dashboard heeft dezelfde tabel in ui/dashboard.html, EFFECTEN) */
struct EffectInfo {
  const char *id;
  const char *p1Naam;
  int32_t p1Min, p1Max, p1Std;
  const char *p2Naam;
  int32_t p2Min, p2Max, p2Std;
};

inline const EffectInfo &effectInfo(int e) {
  static const EffectInfo T[N_EFFECTEN] = {
      {"geen", "", 0, 0, 0, "", 0, 0, 0},
      {"knipperen", "aan (ms)", 50, 10000, 500, "uit (ms)", 50, 10000, 500},
      {"overweg", "tempo (ms)", 100, 5000, 600, "tweede groep", 0, N_GROEPEN, 0},
      {"lasvlam", "flitsen per reeks", 2, 30, 12, "pauze (s)", 1, 60, 5},
      {"tl", "flikkers", 0, 20, 4, "starttijd (ms)", 200, 10000, 1500},
  };
  return T[(e >= 0 && e < N_EFFECTEN) ? e : 0];
}

/** effectnummer bij een naam uit de API ("vuur"), -1 = onbekend */
inline int effectVanId(const char *id) {
  if (!id) return -1;
  for (int e = 0; e < N_EFFECTEN; e++)
    if (strcmp(effectInfo(e).id, id) == 0) return e;
  return -1;
}

/** effecten van firmware 1.2 die tussenwaarden (dimmen) nodig hadden: in een oude instelling wordt de groep gewoon
 *  "aan" zonder effect (geen fout) */
inline bool vervallenEffect(const char *id) {
  return id && (strcmp(id, "vuur") == 0 || strcmp(id, "tv") == 0 || strcmp(id, "ademen") == 0);
}

/** wat de gebruiker voor een groep gekozen heeft (ook wat een scène bewaart) */
struct GroepStand {
  bool aan = false;
  uint8_t effect = FX_GEEN;
  int32_t p1 = 0, p2 = 0;   // de twee instellingen van het effect (zie effectInfo)
  uint8_t fase = 0;         // overweg: 0 = brandt eerst, 1 = brandt als de andere uit is

  bool operator==(const GroepStand &o) const {
    return aan == o.aan && effect == o.effect && p1 == o.p1 && p2 == o.p2 &&
           fase == o.fase;
  }
  bool operator!=(const GroepStand &o) const { return !(*this == o); }
};

/** een stand binnen de grenzen brengen (effect bestaat, instellingen binnen hun grenzen) */
inline GroepStand geldig(GroepStand s) {
  if (s.effect >= N_EFFECTEN) s.effect = FX_GEEN;
  const EffectInfo &i = effectInfo(s.effect);
  s.p1 = klem(s.p1, i.p1Min, i.p1Max);
  s.p2 = klem(s.p2, i.p2Min, i.p2Max);
  s.fase = s.effect == FX_OVERWEG ? (s.fase & 1) : 0;
  return s;
}

/** kleine, snelle toevalsreeks (xorshift32): met dezelfde startwaarde altijd dezelfde getallen */
struct Toeval {
  uint32_t s = 1;
  void zaai(uint32_t z) { s = z ? z : 0x6D2B79F5u; }
  uint32_t volgende() {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return s;
  }
  float r() { return (float)(volgende() >> 8) * (1.0f / 16777216.0f); } // 0 <= r < 1
  uint32_t onder(uint32_t n) { return n ? volgende() % n : 0; }        // 0 .. n-1
};

/** wat een effect onthoudt tussen twee berekeningen */
struct FxToestand {
  Toeval rnd;
  uint32_t start = 0;       // begin van het effect (ook: overweg-paren starten samen)
  uint32_t segEind = 0;     // lasvlam, tl: einde van de huidige flits of tussenpoos
  int teller = 0;           // lasvlam: flitsen nog in deze reeks; tl: flikkers nog te gaan
  uint8_t toestand = 0;     // lasvlam: 0 pauze, 1 flits, 2 tussen flitsen; tl: 0 donker, 1 flikker, 2 donker, 3 brandt
};

/** brandt het effect op tijdstip nu? */
inline bool fxAan(const GroepStand &s, FxToestand &f, uint32_t nu) {
  const uint32_t t = nu - f.start;
  const int MAX_INHAAL = 512; // na een lange onderbreking niet eindeloos inhalen
  switch (s.effect) {
    case FX_KNIPPEREN: {
      uint32_t per = (uint32_t)(s.p1 + s.p2);
      return (t % per) < (uint32_t)s.p1;
    }
    case FX_OVERWEG:
      return ((t / (uint32_t)s.p1) % 2) == s.fase;
    case FX_LASVLAM: {
      // pauze (donker), dan een reeks van 2..p1 korte flitsen met korte, soms langere tussenpozen
      int n = 0;
      while (voorbij(nu, f.segEind) && n++ < MAX_INHAAL) {
        if (f.toestand == 1) { // flits voorbij
          if (--f.teller <= 0) {
            f.toestand = 0;
            uint32_t p = (uint32_t)s.p2 * 1000u;
            f.segEind += p / 2 + f.rnd.onder(p + 1); // 0,5 .. 1,5 x de pauze
          } else {
            f.toestand = 2;
            bool lang = f.rnd.onder(100) < 15;       // af en toe zet de lasser even af
            f.segEind += 15 + f.rnd.onder(lang ? 400 : 100);
          }
        } else { // nieuwe flits (na een pauze: nieuwe reeks)
          if (f.toestand == 0) f.teller = 2 + (int)f.rnd.onder((uint32_t)s.p1 - 1);
          f.toestand = 1;
          f.segEind += 15 + f.rnd.onder(70);
        }
      }
      if (n >= MAX_INHAAL) { f.toestand = 0; f.segEind = nu + 300; }
      return f.toestand == 1;
    }
    case FX_TL: {
      // eerst even donker, dan p1 flikkers met donker ertussen, daarna brandt hij; uiterlijk na p2 ms
      if (f.toestand == 3) return true;
      if (f.teller <= 0 || t >= (uint32_t)s.p2) { f.toestand = 3; return true; }
      uint32_t vak = (uint32_t)s.p2 / ((uint32_t)s.p1 + 1);
      int n = 0;
      while (voorbij(nu, f.segEind) && n++ < MAX_INHAAL) {
        if (f.toestand == 1) { // flikker voorbij
          if (--f.teller <= 0) { f.toestand = 3; return true; }
          f.toestand = 2;
          f.segEind += vak / 2 + f.rnd.onder(vak / 2 + 1);
        } else {
          f.toestand = 1;
          f.segEind += 20 + f.rnd.onder(80);
        }
      }
      return f.toestand == 1;
    }
    default:
      return true;
  }
}

/** een effect van voren af aan laten beginnen (vaste startwaarde per groep) */
inline void fxHerstart(FxToestand &f, int groep, uint32_t zaad, const GroepStand &s, uint32_t nu) {
  f = FxToestand();
  f.rnd.zaai(zaad ^ ((uint32_t)(groep + 1) * 0x9E3779B9u));
  f.start = f.segEind = nu;
  if (s.effect == FX_LASVLAM) f.segEind = nu + 300;
  if (s.effect == FX_TL) {
    f.teller = s.p1;
    f.segEind = nu + (uint32_t)s.p2 / ((uint32_t)s.p1 + 1) / 2;
  }
}

/** alle groepen: stand en effect -> aan of uit */
class Lampen {
 public:
  GroepStand stand[N_GROEPEN];
  GroepMasker uitgang = 0;          // wat naar de PCA9685 gaat: bit g = groep g+1 brandt (ook voor het dashboard)

  explicit Lampen(uint32_t zaad = 20261108u) : zaad_(zaad) {
    for (int g = 0; g < N_GROEPEN; g++) fxHerstart(fx_[g], g, zaad_, stand[g], 0);
  }

  /** brandt groep g nu? */
  bool brandt(int g) const { return g >= 0 && g < N_GROEPEN && (uitgang >> g & 1); }

  /** een groep een nieuwe stand geven; het effect begint opnieuw als het effect of zijn instellingen veranderen,
   *  als de groep aangaat, of als herstart gevraagd wordt (overweg-paren samen laten beginnen) */
  void zet(int g, const GroepStand &nieuw, uint32_t nu, bool herstart = false) {
    if (g < 0 || g >= N_GROEPEN) return;
    GroepStand n = geldig(nieuw);
    GroepStand &o = stand[g];
    bool opnieuw = herstart || n.effect != o.effect || n.p1 != o.p1 || n.p2 != o.p2 || n.fase != o.fase ||
                   (n.aan && !o.aan);
    o = n;
    if (opnieuw) fxHerstart(fx_[g], g, zaad_, o, nu);
  }

  /** alle uitgangen opnieuw berekenen voor tijdstip nu */
  void stap(uint32_t nu) {
    GroepMasker m = 0;
    for (int g = 0; g < N_GROEPEN; g++) {
      const GroepStand &s = stand[g];
      if (s.aan && (s.effect == FX_GEEN || fxAan(s, fx_[g], nu))) m |= groepBit(g);
    }
    uitgang = m;
  }

 private:
  uint32_t zaad_;
  FxToestand fx_[N_GROEPEN];
};

// ---------------------------------------------------------------------------------------------------------------
// Dag en nacht: een cyclus van instelbare duur (standaard 20 minuten voor een hele dag). De deelnemende groepen
// gaan 's avonds één voor één aan en 's ochtends één voor één uit, elk op een eigen moment (gelijk verdeeld over
// het avond- of ochtendvenster, met wat speling). De volgorde is elke "dag" anders, maar vast voor een gegeven
// startwaarde. Wie het eerst aangaat, gaat ook het eerst uit.
//   positie in de cyclus   0 ... 40 %    40 ... 55 %   55 ... 85 %   85 ... 97 %     97 ... 100 %
//   fase                   dag           avond         nacht         ochtend         dag
// ---------------------------------------------------------------------------------------------------------------
enum DagFase : uint8_t { DAG, AVOND, NACHT, OCHTEND };

inline const char *dagFaseId(int f) {
  static const char *T[] = {"dag", "avond", "nacht", "ochtend"};
  return T[(f >= 0 && f < 4) ? f : 0];
}

inline uint32_t meng(uint32_t x) { // murmur3-finalizer: goede spreiding van een getal
  x ^= x >> 16;
  x *= 0x85EBCA6Bu;
  x ^= x >> 13;
  x *= 0xC2B2AE35u;
  x ^= x >> 16;
  return x;
}

struct DagNacht {
  // grenzen in duizendsten van de cyclus
  static constexpr uint32_t AVOND_BEGIN = 400, AVOND_EIND = 550, OCHTEND_BEGIN = 850, OCHTEND_EIND = 970;

  bool loopt = false;
  uint32_t start = 0;            // millis() van het begin van de (eerste) dag
  uint32_t duurMs = 20u * 60000u;
  uint32_t zaad = 1;

  uint32_t positieMs(uint32_t nu) const { return (nu - start) % duurMs; }
  uint32_t cyclus(uint32_t nu) const { return (nu - start) / duurMs; }
  float positie(uint32_t nu) const { return (float)positieMs(nu) / (float)duurMs; }

  /** een moment in de cyclus (duizendsten) in ms */
  uint32_t ms(uint32_t duizendste) const { return (uint32_t)((uint64_t)duurMs * duizendste / 1000u); }

  int fase(uint32_t nu) const {
    uint32_t p = positieMs(nu);
    if (p < ms(AVOND_BEGIN) || p >= ms(OCHTEND_EIND)) return DAG;
    if (p < ms(AVOND_EIND)) return AVOND;
    if (p < ms(OCHTEND_BEGIN)) return NACHT;
    return OCHTEND;
  }

  /** beginnen (vanaf het begin van een fase) */
  void begin(uint32_t nu, int vanafFase) {
    static const uint32_t B[] = {0, AVOND_BEGIN, AVOND_EIND, OCHTEND_BEGIN};
    loopt = true;
    start = nu - ms(B[(vanafFase >= 0 && vanafFase < 4) ? vanafFase : 0]);
  }

  /** een andere duur: de positie (in %) blijft dezelfde */
  void zetDuur(uint32_t nieuweMs, uint32_t nu) {
    if (nieuweMs < 1000) nieuweMs = 1000;
    uint32_t pos = (uint32_t)((uint64_t)positieMs(nu) * nieuweMs / duurMs);
    duurMs = nieuweMs;
    start = nu - pos;
  }

  /** plaats (0 = eerst) van groep g tussen de deelnemers in cyclus c, en het aantal deelnemers */
  int rang(int g, GroepMasker deelnemers, uint32_t c, int &aantal) const {
    aantal = 0;
    int r = 0;
    uint32_t mijn = meng(zaad ^ (c * 0x9E3779B9u) ^ ((uint32_t)(g + 1) * 0x27D4EB2Fu));
    for (int i = 0; i < N_GROEPEN; i++) {
      if (!(deelnemers >> i & 1)) continue;
      aantal++;
      uint32_t k = meng(zaad ^ (c * 0x9E3779B9u) ^ ((uint32_t)(i + 1) * 0x27D4EB2Fu));
      if (k < mijn || (k == mijn && i < g)) r++;
    }
    return r;
  }

  /** moment (ms in de cyclus) waarop de deelnemer met deze rang aangaat (avond) of uitgaat (ochtend) */
  uint32_t moment(int r, int aantal, bool avond, int g, uint32_t c) const {
    uint32_t b = ms(avond ? AVOND_BEGIN : OCHTEND_BEGIN), e = ms(avond ? AVOND_EIND : OCHTEND_EIND);
    uint32_t vak = (e - b) / (uint32_t)aantal;
    // binnen het eigen vak: 20 .. 80 %, zo vallen er nooit twee groepen samen
    uint32_t speling = meng(zaad + c * 31u + (uint32_t)g * 7u + (avond ? 0u : 1u)) % 601u;
    return b + vak * (uint32_t)r + (uint32_t)((uint64_t)vak * (200u + speling) / 1000u);
  }

  /** wil de cyclus groep g nu aan? (deelnemers: bit i = groep i+1 doet mee) */
  bool wilAan(int g, GroepMasker deelnemers, uint32_t nu) const {
    if (!(deelnemers >> g & 1)) return false;
    uint32_t c = cyclus(nu);
    int aantal;
    int r = rang(g, deelnemers, c, aantal);
    uint32_t p = positieMs(nu);
    return p >= moment(r, aantal, true, g, c) && p < moment(r, aantal, false, g, c);
  }
};

} // namespace trein
