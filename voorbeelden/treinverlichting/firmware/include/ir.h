// Infrarood (firmware 2.0.0), zonder hardware: codes maken (zenden), codes herkennen (ontvangen) en leren uit de
// draaggolf. Testen: test/test_ir.
//
// Tijden: een rij duren in µs, om beurten AAN (er komt licht / de ontvanger is actief) en UIT, altijd beginnend met AAN.
//   NEC  draaggolf 38 kHz; leider 9000 aan + 4500 uit, 32 bits (LSB eerst): 560 aan + 560 uit (0) of 1690 uit (1),
//        stopbit 560 aan. De 4 bytes: adres, ~adres (of adres hoog), commando, ~commando. Herhaling (knop vast):
//        9000 aan + 2250 uit + 560 aan, elke 108 ms.
//   RC5  draaggolf 36 kHz; Manchester met halve bits van 889 µs, 14 bits (MSB eerst): S1 = 1, S2 (= NIET commando-bit 6),
//        toggle, 5 adresbits, 6 commandobits. Een 1 = eerst uit dan aan, een 0 = eerst aan dan uit. Elke 114 ms.
//   raw  de tijden zelf (max 256), zoals geleerd.
//   continu  (firmware 2.1.0, Fable 5.2 F1) geen code: de IR-led brandt zonder draaggolf zolang de halte de bus
//        vasthoudt (voor een systeem dat stopt op een continu brandende IR-led). Niet te leren of te herkennen.
// Herkennen gaat met een marge: 25 % + 80 µs (een TSOP maakt de pulsen iets langer en de pauzes iets korter).
// Codetekst (in de API, in de meldingen en om een bus te koppelen):
//   "nec:AABBCCDD"  de 4 bytes zoals gezonden (bv. nec:00FF12ED = adres 0, commando 0x12)
//   "rc5:AACC"      adres (0..31) en commando (0..127), zonder de togglebit
//   "raw:XXXXXXXX"  een vingerafdruk (FNV-1, 32 bit) van de vorm: elke tijd vergeleken met de tijd 2 verder
//                   (korter / gelijk / langer, 20 % marge), zodat kleine verschillen in de tijden niet tellen.
// Leren (leerontvanger TSMP58000 op GPIO48): die geeft de draaggolf door. main.cpp meet elke flank (RMT, 0,5 µs) en geeft
// de duren in ns. leerUitDraaggolf() rekent de frequentie uit (aantal perioden / tijd binnen de pakketjes) en de omhullende
// (de pakketjes worden één AAN-tijd; een pauze langer dan 80 µs is een UIT-tijd). Zonder draaggolf (een TSOP die al
// gedemoduleerd is) worden de duren zelf de omhullende en blijft de frequentie 38 kHz.
// NEC (F13): de 4 bytes worden bewaard zoals gelezen. Een uitgebreid adres waarvan de hoge byte 0 is ("12 00 ..") heet
// adres 0x0012 met adres16 = true; zonder die vlag zou het zenden er "12 ED" van maken.
// Lange niveaus (E2): de RMT sluit een frame af na 12 ms zonder flank en negeert een niveau dat langer duurt
// ("The receiver will ignore pulses longer than this setting", ESP-IDF 4.4, RMT, idle_threshold). Een lichtsluis of
// reflexsensor die lang laag blijft, geeft dus geen frame. Daarom leest main.cpp de ontvangerpinnen 2..4 ook als
// niveau (NiveauWacht): laag langer dan 50 ms = een melding "ftr" (aanwezigheid), weer hoog = einde.
#pragma once
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "functies.h"

namespace trein {

constexpr int MAX_IR_CODES = 32;
constexpr int MAX_RAW = 256;         // tijden per geleerde code
constexpr int IR_LEDS = 8;           // IR-led 1..8 (GPA0..GPA7 van de MCP23017)
constexpr int IR_ONTVANGERS = 4;     // 1 = leerontvanger (GPIO48), 2 = GPIO11, 3 = GPIO39, 4 = GPIO42
constexpr int IR_KHZ_MIN = 30, IR_KHZ_MAX = 56;
constexpr int IR_HERHAAL_MAX = 10;
constexpr int IR_TEKST_LEN = 24;     // "nec:AABBCCDD" en een 0 past ruim
constexpr int MAX_IR_PULSEN = 1200;  // genoeg voor 10 x een NEC- of RC5-frame met de pauzes (raw: zie irPulsen)
constexpr int IR_MAX_ITEMS = 700;    // RMT-items om te zenden (2 tijden per item, een tijd > 32767 µs telt dubbel)
constexpr int IR_ITEMS_ZONDER_BIJVULLEN = 144; // FN6: 3 geheugenblokken van RMT-kanaal 1 (src/irhw.h)
constexpr uint8_t IR_DUTY_STD = 33;  // draaggolf: % aan (E4: 33 of 50, instelling irDuty)
constexpr uint32_t FTR_NIVEAU_MS = 50; // E2: een ontvangerpin zo lang laag = aanwezigheid
constexpr uint32_t IR_CONTINU_PROEF_MS = 2000; // een continu-code met de hand zenden: zo lang aan
// EN1 (2.2.0): een continu-led brandt seconden tot minuten aan een stuk; met 120 Ω krijgt die weerstand 0,95 W blijvend
constexpr const char *IR_CONTINU_WAARSCHUWING =
    "Codesoort continu alleen met een serieweerstand van 470 Ω (0,5 W) in plaats van 120 Ω (Berekeningen §9).";

enum IrSoort : uint8_t { IR_NEC, IR_RC5, IR_RAW, IR_CONTINU, N_IR_SOORTEN };

inline const char *irSoortId(int s) {
  static const char *T[N_IR_SOORTEN] = {"nec", "rc5", "raw", "continu"};
  return T[(s >= 0 && s < N_IR_SOORTEN) ? s : 0];
}
inline int irSoortVanId(const char *id) {
  if (!id) return -1;
  for (int s = 0; s < N_IR_SOORTEN; s++)
    if (strcmp(irSoortId(s), id) == 0) return s;
  return -1;
}

struct IrCode {
  bool gebruikt = false;
  char naam[NAAM_LEN] = {0};
  uint8_t soort = IR_NEC;
  uint8_t khz = 38;
  uint16_t adres = 0, commando = 0; // NEC: adres 0..65535 (> 255 = uitgebreid), commando 0..255 (of 16 bit); RC5: 0..31 / 0..127
  uint8_t herhaal = 1;               // zoveel keer het frame (NEC: daarna herhaalcodes)
  bool adres16 = false, commando16 = false; // NEC: de tweede (vierde) byte is de hoge byte, ook als die 0 is (F13)
  uint16_t nRaw = 0;
  uint16_t raw[MAX_RAW] = {0};       // raw: µs, aan/uit om beurten, begint met aan
};

/** wat een ontvanger las */
struct IrGelezen {
  uint8_t soort = IR_RAW;
  uint16_t adres = 0, commando = 0;
  uint8_t bytes[4] = {0, 0, 0, 0}; // NEC zoals gezonden
  bool herhaling = false;          // NEC-herhaalcode (knop vastgehouden): geen nieuwe code
  uint8_t toggle = 0;              // RC5
  uint32_t vingerafdruk = 0;       // raw
};

// ------------------------------------------------------------------------------------------------------ hulp
constexpr uint32_t NEC_LEIDER_AAN = 9000, NEC_LEIDER_UIT = 4500, NEC_HERHAAL_UIT = 2250, NEC_BIT = 560,
                   NEC_EEN = 1690, NEC_PERIODE = 108000;
constexpr uint32_t RC5_HALF = 889, RC5_PERIODE = 113778;
constexpr uint32_t RAW_PAUZE = 40000; // tussen 2 herhalingen van een raw-code

/** ligt v binnen de marge rond doel? (25 % + 80 µs) */
inline bool irNaast(uint32_t v, uint32_t doel) {
  uint32_t m = doel / 4 + 80;
  return v + m >= doel && v <= doel + m;
}

// --------------------------------------------------------------------------------------------- herkennen
inline bool necLees(const uint16_t *d, int n, IrGelezen &g) {
  if (n < 3 || !irNaast(d[0], NEC_LEIDER_AAN)) return false;
  if (irNaast(d[1], NEC_HERHAAL_UIT) && irNaast(d[2], NEC_BIT)) {
    g = IrGelezen();
    g.soort = IR_NEC;
    g.herhaling = true;
    return true;
  }
  if (n < 67 || !irNaast(d[1], NEC_LEIDER_UIT)) return false;
  uint8_t b[4] = {0, 0, 0, 0};
  for (int i = 0; i < 32; i++) {
    if (!irNaast(d[2 + 2 * i], NEC_BIT)) return false;
    uint16_t u = d[3 + 2 * i];
    if (irNaast(u, NEC_EEN)) b[i / 8] |= (uint8_t)(1u << (i % 8));
    else if (!irNaast(u, NEC_BIT)) return false;
  }
  if (!irNaast(d[66], NEC_BIT)) return false;
  g = IrGelezen();
  g.soort = IR_NEC;
  memcpy(g.bytes, b, 4);
  g.adres = b[1] == (uint8_t)~b[0] ? b[0] : (uint16_t)(b[0] | b[1] << 8);
  g.commando = b[3] == (uint8_t)~b[2] ? b[2] : (uint16_t)(b[2] | b[3] << 8);
  return true;
}

inline bool rc5Lees(const uint16_t *d, int n, IrGelezen &g) {
  if (n < 1 || n > 28) return false;
  uint8_t h[32];
  int k = 0;
  h[k++] = 0; // S1 = 1 begint met een halve bit uit (niet te zien)
  for (int i = 0; i < n; i++) {
    uint8_t niveau = (i % 2 == 0) ? 1 : 0;
    int halven = irNaast(d[i], RC5_HALF) ? 1 : irNaast(d[i], 2 * RC5_HALF) ? 2 : 0;
    if (!halven) return false;
    for (int j = 0; j < halven; j++) {
      if (k >= 28) return false;
      h[k++] = niveau;
    }
  }
  if (k == 27) h[k++] = 0; // eindigt met een 0-bit: de laatste halve bit uit is niet te zien
  if (k != 28) return false;
  uint16_t bits = 0;
  for (int b = 0; b < 14; b++) {
    if (h[2 * b] == h[2 * b + 1]) return false;
    bits = (uint16_t)(bits << 1 | (h[2 * b + 1] ? 1 : 0));
  }
  if (!(bits >> 13 & 1)) return false; // S1
  g = IrGelezen();
  g.soort = IR_RC5;
  bool s2 = bits >> 12 & 1;
  g.toggle = (uint8_t)(bits >> 11 & 1);
  g.adres = (uint16_t)(bits >> 6 & 0x1F);
  g.commando = (uint16_t)((bits & 0x3F) | (s2 ? 0 : 0x40));
  return true;
}

/** vingerafdruk van een rij tijden (zoals IRremote "decodeHash"); 0 bij minder dan 6 tijden */
inline uint32_t irVingerafdruk(const uint16_t *d, int n) {
  if (n < 6) return 0;
  uint32_t h = 2166136261u;
  for (int i = 1; i + 2 < n; i++) {
    uint32_t oud = d[i], nieuw = d[i + 2];
    uint32_t w = (nieuw * 10 < oud * 8) ? 0 : (oud * 10 < nieuw * 8) ? 2 : 1;
    h = (h * 16777619u) ^ w;
  }
  return h;
}

/** een rij tijden herkennen: NEC, dan RC5, anders raw (vingerafdruk). false = te kort om iets te zijn (< 6 tijden en
 *  geen herkende code): dan was het eerder een lichtsluis (FTR) of een stoorpuls. */
inline bool irHerken(const uint16_t *d, int n, IrGelezen &g) {
  if (necLees(d, n, g) || rc5Lees(d, n, g)) return true;
  g = IrGelezen();
  g.soort = IR_RAW;
  g.vingerafdruk = irVingerafdruk(d, n);
  return n >= 6;
}

inline void irTekst(const IrGelezen &g, char *uit, size_t len) {
  if (g.soort == IR_CONTINU) snprintf(uit, len, "continu");
  else if (g.soort == IR_NEC) snprintf(uit, len, "nec:%02X%02X%02X%02X", g.bytes[0], g.bytes[1], g.bytes[2], g.bytes[3]);
  else if (g.soort == IR_RC5) snprintf(uit, len, "rc5:%02X%02X", g.adres & 0x1F, g.commando & 0x7F);
  else snprintf(uit, len, "raw:%08X", (unsigned)g.vingerafdruk);
}

// ------------------------------------------------------------------------------------------------- zenden
inline void necBytes(uint16_t adres, uint16_t commando, uint8_t *b, bool adres16 = false, bool commando16 = false) {
  b[0] = (uint8_t)adres;
  b[1] = (adres > 0xFF || adres16) ? (uint8_t)(adres >> 8) : (uint8_t)~b[0];
  b[2] = (uint8_t)commando;
  b[3] = (commando > 0xFF || commando16) ? (uint8_t)(commando >> 8) : (uint8_t)~b[2];
}

/** de codetekst van een bewaarde code (zelfde tekst als wat een ontvanger van die code leest) */
inline void irCodeTekst(const IrCode &c, char *uit, size_t len) {
  IrGelezen g;
  g.soort = c.soort;
  g.adres = c.adres;
  g.commando = c.commando;
  if (c.soort == IR_NEC) necBytes(c.adres, c.commando, g.bytes, c.adres16, c.commando16);
  if (c.soort == IR_RAW) g.vingerafdruk = irVingerafdruk(c.raw, c.nRaw);
  irTekst(g, uit, len);
}

namespace detail {
struct Schrijver {
  uint32_t *uit;
  int max, n = 0;
  bool vol = false;
  Schrijver(uint32_t *u, int m) : uit(u), max(m) {}
  void zet(uint32_t us) {
    if (n < max) uit[n++] = us;
    else vol = true;
  }
  uint32_t som(int van) const {
    uint32_t s = 0;
    for (int i = van; i < n; i++) s += uit[i];
    return s;
  }
};

inline void necFrame(Schrijver &s, const uint8_t *b) {
  s.zet(NEC_LEIDER_AAN);
  s.zet(NEC_LEIDER_UIT);
  for (int i = 0; i < 32; i++) {
    s.zet(NEC_BIT);
    s.zet(b[i / 8] >> (i % 8) & 1 ? NEC_EEN : NEC_BIT);
  }
  s.zet(NEC_BIT);
}

inline void rc5Frame(Schrijver &s, uint16_t adres, uint16_t commando, bool toggle) {
  uint16_t bits = (uint16_t)(1u << 13 | ((commando & 0x40) ? 0 : 1u << 12) | (toggle ? 1u << 11 : 0) |
                             (adres & 0x1F) << 6 | (commando & 0x3F));
  uint8_t h[28];
  for (int b = 0; b < 14; b++) {
    bool een = bits >> (13 - b) & 1;
    h[2 * b] = een ? 0 : 1;
    h[2 * b + 1] = een ? 1 : 0;
  }
  // h[0] is altijd 0 (S1 = 1): niet te zien. De rest in looptijden, beginnend met aan; de laatste uit-tijd valt weg.
  int i = 1;
  while (i < 28) {
    int j = i;
    while (j < 28 && h[j] == h[i]) j++;
    if (!(h[i] == 0 && j == 28)) s.zet((uint32_t)(j - i) * RC5_HALF);
    i = j;
  }
}
} // namespace detail

/** de tijden om een code te zenden (aan/uit om beurten, begint met aan; eindigt met aan), met alle herhalingen en de
 *  pauzes ertussen. Geeft het aantal tijden, 0 als de code leeg is of niet past. */
inline int irPulsen(const IrCode &c, uint32_t *uit, int max, bool toggle = false) {
  detail::Schrijver s(uit, max);
  int herhaal = c.herhaal < 1 ? 1 : (c.herhaal > IR_HERHAAL_MAX ? IR_HERHAAL_MAX : c.herhaal);
  if (c.soort == IR_NEC) {
    uint8_t b[4];
    necBytes(c.adres, c.commando, b, c.adres16, c.commando16);
    detail::necFrame(s, b);
    uint32_t duur = s.som(0);
    for (int r = 1; r < herhaal; r++) {
      s.zet(NEC_PERIODE - duur);
      int van = s.n;
      s.zet(NEC_LEIDER_AAN);
      s.zet(NEC_HERHAAL_UIT);
      s.zet(NEC_BIT);
      duur = s.som(van);
    }
  } else if (c.soort == IR_RC5) {
    for (int r = 0; r < herhaal; r++) {
      int van = s.n;
      detail::rc5Frame(s, c.adres, c.commando, toggle);
      if (r + 1 < herhaal) s.zet(RC5_PERIODE - s.som(van));
    }
  } else if (c.soort == IR_CONTINU) {
    return 0; // geen pulsen: de led brandt zonder draaggolf (IrZender)
  } else {
    int n = c.nRaw > MAX_RAW ? MAX_RAW : c.nRaw;
    if (n % 2 == 0) n--; // eindigen met aan
    if (n <= 0) return 0;
    for (int r = 0; r < herhaal; r++) {
      for (int i = 0; i < n; i++) s.zet(c.raw[i] ? c.raw[i] : 1);
      if (r + 1 < herhaal) s.zet(RAW_PAUZE);
    }
  }
  return s.vol ? 0 : s.n;
}

/** het aantal RMT-items voor deze tijden (2 tijden per item; een tijd > 32767 µs wordt gesplitst) */
inline int irItems(const uint32_t *us, int n) {
  int helften = 0;
  for (int i = 0; i < n; i++) helften += (int)((us[i] + 32766) / 32767);
  return (helften + 1) / 2;
}

/** het aantal RMT-items van de code met al haar herhalingen (0 = past niet in de pulsbuffer; continu: 0) */
inline int irCodeItems(const IrCode &c) {
  if (c.soort == IR_CONTINU) return 0;
  static uint32_t us[MAX_IR_PULSEN];
  int n = irPulsen(c, us, MAX_IR_PULSEN);
  return n > 0 ? irItems(us, n) : 0;
}

/** past de code met al haar herhalingen in één keer zenden? (F5: anders werd ze stil niet verzonden) */
inline bool irPast(const IrCode &c) {
  if (c.soort == IR_CONTINU) return true;
  int n = irCodeItems(c);
  return n > 0 && n <= IR_MAX_ITEMS;
}

/** FN6: moet de RMT deze code tijdens het zenden bijvullen (meer dan 144 items, de 3 blokken van kanaal 1)? */
inline bool irLang(const IrCode &c) { return irCodeItems(c) > IR_ITEMS_ZONDER_BIJVULLEN; }

/** hoe vaak deze code hoogstens herhaald kan worden (0 = zelfs één keer past niet) */
inline int irMaxHerhaal(const IrCode &c) {
  IrCode x = c;
  int beste = 0;
  for (int h = 1; h <= IR_HERHAAL_MAX; h++) {
    x.herhaal = (uint8_t)h;
    if (!irPast(x)) break;
    beste = h;
  }
  return beste;
}

// -------------------------------------------------------------------------------------------------- leren
struct Leerresultaat {
  int khz = 0;      // gemeten draaggolf (afgerond); 0 = er was geen draaggolf (gedemoduleerde ontvanger)
  int khzTiende = 0; // dezelfde in tienden van een kHz (zelftest: 380 = 38,0 kHz)
  int n = 0;        // aantal tijden in de omhullende
  uint16_t us[MAX_RAW] = {0};
  bool afgekapt = false; // meer dan MAX_RAW tijden: de rest viel weg
};

/** de draaggolf en de omhullende uit de flanken van de TSMP58000. ns: duren in nanoseconden, aan/uit om beurten,
 *  begint met aan. gatNs: een uit-tijd langer dan dit sluit een pakketje af. */
inline bool leerUitDraaggolf(const uint32_t *ns, int n, Leerresultaat &r, uint32_t gatNs = 80000) {
  r = Leerresultaat();
  if (!ns || n < 1) return false;
  // 1. frequentie: binnen elk pakketje (perioden tussen de eerste en de laatste stijgende flank)
  uint64_t span = 0, t = 0, begin = 0, laatste = 0;
  uint32_t perioden = 0;
  int k = 0;
  for (int i = 0; i < n; i++) {
    if (i % 2 == 0) {
      if (k == 0) begin = t;
      laatste = t;
      k++;
    }
    bool einde = (i % 2 == 1 && ns[i] > gatNs) || i == n - 1;
    if (einde && k > 0) {
      if (k >= 2) { span += laatste - begin; perioden += (uint32_t)(k - 1); }
      k = 0;
    }
    t += ns[i];
  }
  bool draaggolf = perioden >= 8;
  uint64_t periodeNs = draaggolf ? span / perioden : 0;
  if (draaggolf) {
    r.khz = (int)((perioden * 1000000ull + span / 2) / span); // perioden per ms = kHz
    r.khzTiende = (int)((perioden * 10000000ull + span / 2) / span);
  }
  // 2. de omhullende
  auto zet = [&r](uint64_t us) {
    if (r.n >= MAX_RAW) { r.afgekapt = true; return; }
    r.us[r.n++] = (uint16_t)(us > 65535 ? 65535 : (us < 1 ? 1 : us));
  };
  if (!draaggolf) {
    for (int i = 0; i < n; i++) zet((ns[i] + 500) / 1000);
    return r.n > 0;
  }
  t = 0;
  k = 0;
  uint64_t eindeVorige = 0;
  for (int i = 0; i < n; i++) {
    if (i % 2 == 0) {
      if (k == 0) {
        if (r.n > 0) zet((t - eindeVorige + 500) / 1000);
        begin = t;
      }
      laatste = t;
      k++;
    }
    bool einde = (i % 2 == 1 && ns[i] > gatNs) || i == n - 1;
    if (einde && k > 0) {
      eindeVorige = laatste + periodeNs;
      zet((eindeVorige - begin + 500) / 1000);
      k = 0;
    }
    t += ns[i];
  }
  return r.n > 0;
}

/** een geleerde omhullende als code: NEC of RC5 als ze herkend wordt, anders raw met de tijden zelf */
inline void leerNaarCode(const Leerresultaat &r, IrCode &c) {
  IrGelezen g;
  c.khz = (uint8_t)(r.khz >= IR_KHZ_MIN && r.khz <= IR_KHZ_MAX ? r.khz : (r.khz ? (r.khz < IR_KHZ_MIN ? IR_KHZ_MIN : IR_KHZ_MAX) : 38));
  c.herhaal = 1;
  c.nRaw = 0;
  if (necLees(r.us, r.n, g) && !g.herhaling) {
    c.soort = IR_NEC;
    c.adres = g.adres;
    c.commando = g.commando;
    c.adres16 = g.bytes[1] != (uint8_t)~g.bytes[0]; // de 4 bytes zoals gelezen (F13)
    c.commando16 = g.bytes[3] != (uint8_t)~g.bytes[2];
  } else if (rc5Lees(r.us, r.n, g)) {
    c.soort = IR_RC5;
    c.adres = g.adres;
    c.commando = g.commando;
    if (!r.khz) c.khz = 36;
  } else {
    c.soort = IR_RAW;
    c.nRaw = (uint16_t)r.n;
    memcpy(c.raw, r.us, sizeof(uint16_t) * (size_t)r.n);
  }
}

/** E2: het niveau van een ontvangerpin (laag = licht, of een sensor die trekt), elke 5 ms. Laag langer dan
 *  FTR_NIVEAU_MS = begin van een aanwezigheid (+1, één keer), weer hoog = einde (-1); anders 0. */
class NiveauWacht {
 public:
  bool bezet = false;
  int stap(bool laag, uint32_t nu) {
    if (!laag) {
      laag_ = false;
      if (bezet) { bezet = false; return -1; }
      return 0;
    }
    if (!laag_) { laag_ = true; sinds_ = nu; }
    if (!bezet && nu - sinds_ >= FTR_NIVEAU_MS) { bezet = true; return 1; }
    return 0;
  }

 private:
  bool laag_ = false;
  uint32_t sinds_ = 0;
};

} // namespace trein
