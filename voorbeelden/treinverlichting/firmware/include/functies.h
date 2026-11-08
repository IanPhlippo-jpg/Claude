// Scènes en functies (macro's), zonder hardware. Testen: test/test_functies (pio test -e native).
//
// Scène    de stand van alle 16 groepen onder een naam ("Avond", "Nacht"); oproepen zet alle groepen in één keer
//          (met de gewone zachte overgang).
// Functie  een lijst stappen. Elke stap = groep(en) + actie + wachttijd. De stap wordt uitgevoerd, daarna wacht de
//          functie de wachttijd af en gaat naar de volgende stap. Na de laatste stap (en zijn wachttijd) stopt de
//          functie, of begint opnieuw als "herhalen" aan staat.
//            Voorbeeld "Overweg":  stap 1  groepen 3 en 4, effect om beurten, wacht 30 s
//                                  stap 2  groepen 3 en 4, uit, wacht 0 s
//          Starten terwijl ze loopt = opnieuw van voren af aan. Stoppen = meteen stoppen; als "bij stoppen uit" aan
//          staat, gaan alle groepen uit die in de stappen voorkomen (anders zou een overweg blijven knipperen).
//          Verschillende functies kunnen tegelijk lopen. De wachttijden tellen vanaf het geplande moment (geen
//          verloop), ook als de doos even bezig was.
// Scènes en functies hebben vaste plaatsen (1..12 en 1..16): een andere scène of functie wissen verschuift niets,
// zodat de koppelingen van knoppen en stappen blijven kloppen.
#pragma once
#include <stdint.h>
#include <string.h>

#include "licht.h"

namespace trein {

constexpr int NAAM_LEN = 32; // bytes inclusief de afsluitende 0 (UTF-8: é telt voor 2)
constexpr int MAX_SCENES = 12;
constexpr int MAX_FUNCTIES = 16;
constexpr int MAX_STAPPEN = 12;
constexpr uint32_t MAX_WACHT_MS = 3600000u; // 1 uur per stap
constexpr uint32_t MIN_HERHAAL_MS = 100;    // een herhalende functie duurt minstens zo lang (anders geen herhalen)

/** een naam kopiëren: hooguit NAAM_LEN-1 bytes, niet midden in een UTF-8-teken afknippen, geen stuurtekens.
 *  Geeft true als er iets aangepast moest worden. */
inline bool kopieerNaam(char *doel, const char *bron) {
  bool aangepast = false;
  int n = 0;
  if (!bron) bron = "";
  const unsigned char *p = (const unsigned char *)bron;
  while (*p) {
    if (*p < 0x20 || *p == 0x7F) { aangepast = true; p++; continue; }
    // lengte van dit UTF-8-teken; een kapot teken wordt overgeslagen
    int len = (*p < 0x80) ? 1 : (*p >= 0xC2 && *p < 0xE0) ? 2 : (*p >= 0xE0 && *p < 0xF0) ? 3
            : (*p >= 0xF0 && *p < 0xF5) ? 4 : 0;
    bool heel = len > 0;
    for (int k = 1; heel && k < len; k++)
      if ((p[k] & 0xC0) != 0x80) heel = false; // ook als de tekst hier eindigt (0)
    if (!heel) { aangepast = true; p++; continue; }
    if (n + len > NAAM_LEN - 1) { aangepast = true; break; }
    for (int k = 0; k < len; k++) doel[n++] = (char)p[k];
    p += len;
  }
  doel[n] = 0;
  // spaties vooraan en achteraan weg
  while (n > 0 && doel[n - 1] == ' ') doel[--n] = 0;
  int b = 0;
  while (doel[b] == ' ') b++;
  if (b) memmove(doel, doel + b, (size_t)(n - b + 1));
  return aangepast;
}

struct Scene {
  bool gebruikt = false;
  char naam[NAAM_LEN] = {0};
  GroepStand groep[N_GROEPEN];
};

enum Actie : uint8_t { ACT_AAN, ACT_UIT, ACT_HELDERHEID, ACT_EFFECT, ACT_SCENE, ACT_DAGNACHT, N_ACTIES };

inline const char *actieId(int a) {
  static const char *T[N_ACTIES] = {"aan", "uit", "helderheid", "effect", "scene", "dagnacht"};
  return T[(a >= 0 && a < N_ACTIES) ? a : 0];
}

inline int actieVanId(const char *id) {
  if (!id) return -1;
  for (int a = 0; a < N_ACTIES; a++)
    if (strcmp(actieId(a), id) == 0) return a;
  return -1;
}

struct Stap {
  uint16_t groepen = 0;   // bit i = groep i+1
  uint8_t actie = ACT_AAN;
  int32_t waarde = 0;     // helderheid: 1..100; scene: scènenummer 1..12; dagnacht: 1 = starten, 0 = stoppen
  uint8_t effect = FX_GEEN;
  int32_t p1 = 0, p2 = 0; // de instellingen van het effect
  uint32_t wachtMs = 0;   // na deze stap zo lang wachten
};

struct Functie {
  bool gebruikt = false;
  char naam[NAAM_LEN] = {0};
  bool herhalen = false;
  bool stopUit = true;    // bij stoppen: de groepen uit de stappen uit
  uint8_t nStappen = 0;
  Stap stap[MAX_STAPPEN];

  /** alle groepen die in de stappen aan, uit of gedimd worden (scènes en dag/nacht niet meegerekend) */
  uint16_t groepenInStappen() const {
    uint16_t m = 0;
    for (int i = 0; i < nStappen; i++)
      if (stap[i].actie != ACT_SCENE && stap[i].actie != ACT_DAGNACHT) m |= stap[i].groepen;
    return m;
  }
  uint32_t totaleWacht() const {
    uint32_t t = 0;
    for (int i = 0; i < nStappen; i++) t += stap[i].wachtMs;
    return t;
  }
};

/** wie de stappen echt uitvoert (de Baan; in de tests een nep-uitvoerder) */
struct Uitvoerder {
  virtual void voerUit(const Stap &s, uint32_t nu) = 0;
  virtual void groepenUit(uint16_t groepen, uint32_t nu) = 0;
  virtual ~Uitvoerder() {}
};

/** houdt bij welke functies lopen en bij welke stap ze zijn */
class Sequencer {
 public:
  struct Loper {
    bool loopt = false;
    uint8_t stap = 0;       // de volgende uit te voeren stap (== nStappen: de laatste wachttijd loopt nog)
    uint32_t volgende = 0;  // wanneer
  };
  Loper loper[MAX_FUNCTIES];

  bool loopt(int f) const { return f >= 0 && f < MAX_FUNCTIES && loper[f].loopt; }

  /** (opnieuw) starten: de eerste stap meteen */
  void start(const Functie *fs, int f, Uitvoerder &u, uint32_t nu) {
    if (f < 0 || f >= MAX_FUNCTIES || !fs[f].gebruikt || fs[f].nStappen == 0) return;
    loper[f].loopt = true;
    loper[f].stap = 0;
    loper[f].volgende = nu;
    stapEen(fs[f], loper[f], u, nu);
  }

  /** stoppen; lichtUit: de groepen uit de stappen uit (als de functie dat vraagt) */
  void stop(const Functie *fs, int f, Uitvoerder &u, uint32_t nu, bool lichtUit = true) {
    if (!loopt(f)) return;
    loper[f].loopt = false;
    if (lichtUit && fs[f].stopUit) u.groepenUit(fs[f].groepenInStappen(), nu);
  }

  void stopAlles() {
    for (int f = 0; f < MAX_FUNCTIES; f++) loper[f].loopt = false;
  }

  /** elke 10 ms: de stappen uitvoeren die aan de beurt zijn */
  void stap(const Functie *fs, Uitvoerder &u, uint32_t nu) {
    for (int f = 0; f < MAX_FUNCTIES; f++)
      if (loper[f].loopt) stapEen(fs[f], loper[f], u, nu);
  }

 private:
  static void stapEen(const Functie &fn, Loper &l, Uitvoerder &u, uint32_t nu) {
    int n = 0;
    while (l.loopt && voorbij(nu, l.volgende) && n++ <= MAX_STAPPEN) {
      if (!fn.gebruikt || fn.nStappen == 0) { l.loopt = false; break; }
      if (l.stap >= fn.nStappen) {
        if (fn.herhalen) l.stap = 0;
        else { l.loopt = false; break; }
      }
      const Stap &s = fn.stap[l.stap++];
      l.volgende += s.wachtMs;
      u.voerUit(s, nu);
    }
  }
};

} // namespace trein
