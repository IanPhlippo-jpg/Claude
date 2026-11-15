// Meetpunten, meldingen en bussen (firmware 2.0.0), zonder hardware. Testen: test/test_bus en test/test_interpolatie.
//
// Meetpunt  een plaats op de baan met de id uit plan.json van het situatieplan ("HALL1", "STOP_lijnbus3", ...),
//           gekoppeld aan een bron: een ingang (hallsensor, reflexsensor) of een IR-/FTR-ontvanger (1..4).
//           Optioneel "volgende": het punt dat een bus daarna normaal bereikt (anders leert de doos dat zelf uit de
//           ritten die ze zag: het laatst gereden traject vanaf dit punt).
// Melding   elke keer een meetpunt iets ziet: een ingang wordt actief (soort "hall"), een ontvanger leest een code ("ir")
//           of alleen licht zonder code ("ftr", lichtsluis). Ringbuffer van 64 meldingen met een volgnummer en de tijd
//           (ms van de doos); de tv-pagina vraagt elke 250 ms de nieuwe op (GET /api/meldingen?sinds=<volgnr>).
//           Dezelfde code op dezelfde ontvanger binnen 1,5 s is dezelfde doorkomst (een bus zendt zijn code
//           voortdurend): geen nieuwe melding. Een lichtsluis zonder code: hoogstens één melding per seconde.
// Bus       naam, kleur en de code die de ontvangers van die bus lezen. Een bus is "gezien bij punt Y" als de ontvanger
//           van Y zijn code leest, of als de ingang van Y actief wordt: dan de bus die volgens de volgorde naar Y op
//           weg is (de langst onderweg zijnde als er meer zijn).
// Rijtijd   per traject A -> B een voortschrijdend gemiddelde: zonder metingen 10 s; de eerste meting telt helemaal,
//           daarna het gemiddelde van 2, van 3 en vanaf de vierde voor een kwart (exponentieel). Een meting korter dan
//           0,2 s of (na 2 metingen) langer dan 3 x het gemiddelde telt niet (de bus stond stil of reed om).
// Fractie   hoe ver de bus tussen van en naar is: min(0,98; (nu - gezien) / rijtijd). De tv rekent zelf verder met
//           msNu; de bus blijft vlak voor het volgende punt wachten tot hij daar echt gezien wordt.
#pragma once
#include <stdint.h>
#include <string.h>

#include "ir.h"

namespace trein {

constexpr int MAX_PUNTEN = 48;
constexpr int PUNT_ID_LEN = 24;
constexpr int MAX_BUSSEN = 8;
constexpr int MAX_MELDINGEN = 64;
constexpr int MAX_TRAJECTEN = 48;
constexpr int IR_LAATST = 8;
constexpr uint32_t RIJTIJD_START_MS = 10000, RIJTIJD_MIN_MS = 200;
constexpr uint32_t DOORKOMST_MS = 1500, FTR_MIN_MS = 1000;
constexpr uint32_t BUS_KWIJT_MS = 300000; // 5 min niet gezien: onbekend
constexpr float FRACTIE_MAX = 0.98f;

enum MeldSoort : uint8_t { MELD_HALL, MELD_IR, MELD_FTR, N_MELD_SOORTEN, MELD_AUTO = 255 };
inline const char *meldSoortId(int s) {
  static const char *T[N_MELD_SOORTEN] = {"hall", "ir", "ftr"};
  return T[(s >= 0 && s < N_MELD_SOORTEN) ? s : 0];
}
inline int meldSoortVanId(const char *id) {
  if (!id) return -1;
  for (int s = 0; s < N_MELD_SOORTEN; s++)
    if (strcmp(meldSoortId(s), id) == 0) return s;
  return -1;
}

/** een id voor een punt: 1..23 tekens, letters, cijfers, _ - . (zoals in plan.json) */
inline bool puntIdGeldig(const char *id) {
  if (!id || !id[0] || strlen(id) >= (size_t)PUNT_ID_LEN) return false;
  for (const char *p = id; *p; p++) {
    char c = *p;
    if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_' || c == '-' || c == '.'))
      return false;
  }
  return true;
}

struct PuntCfg {
  bool gebruikt = false;
  char id[PUNT_ID_LEN] = {0};
  int8_t ingang = -1;      // 0..N_INGANGEN-1 (-1 = geen: los)
  int8_t ontvanger = -1;   // 0..3
  uint8_t soort = MELD_AUTO; // hall/ir/ftr; AUTO = hall bij een ingang, ir (of ftr zonder code) bij een ontvanger
  char volgende[PUNT_ID_LEN] = {0};
};

struct BusCfg {
  bool gebruikt = false;
  char naam[NAAM_LEN] = {0};
  char kleur[8] = {0};     // "#d23" of "#dd2233"
  char code[IR_TEKST_LEN] = {0};
};

inline bool kleurGeldig(const char *k) {
  if (!k || k[0] != '#') return false;
  size_t n = strlen(k);
  if (n != 4 && n != 7) return false;
  for (size_t i = 1; i < n; i++) {
    char c = k[i];
    if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) return false;
  }
  return true;
}

struct Melding {
  uint32_t nr = 0, ms = 0;
  uint8_t soort = MELD_HALL;
  char punt[PUNT_ID_LEN] = {0};
  int8_t ingang = -1, ontvanger = -1;
  char code[IR_TEKST_LEN] = {0};
  int8_t bus = -1;
};

class Meldingen {
 public:
  uint32_t volgnr = 0; // nummer van de laatste melding (0 = nog geen)

  const Melding &voegToe(Melding m) {
    m.nr = ++volgnr;
    m_[m.nr % MAX_MELDINGEN] = m;
    return m_[m.nr % MAX_MELDINGEN];
  }
  /** de meldingen met een nummer groter dan sinds (de oudste eerst, hoogstens de laatste 64) */
  int sinds(uint32_t s, const Melding **uit, int max) const {
    if (s > volgnr) s = 0; // de doos is herstart: alles wat er is
    uint32_t van = s + 1;
    if (volgnr >= (uint32_t)MAX_MELDINGEN && van + MAX_MELDINGEN <= volgnr) van = volgnr - MAX_MELDINGEN + 1;
    int n = 0;
    for (uint32_t nr = van; nr <= volgnr && n < max; nr++) uit[n++] = &m_[nr % MAX_MELDINGEN];
    return n;
  }

 private:
  Melding m_[MAX_MELDINGEN];
};

struct Traject {
  char a[PUNT_ID_LEN] = {0}, b[PUNT_ID_LEN] = {0};
  uint32_t ms = RIJTIJD_START_MS;
  uint16_t n = 0;
  uint32_t laatst = 0; // wanneer voor het laatst gereden
};

/** de volgende waarde van het voortschrijdend gemiddelde; false = meting telt niet */
inline bool rijtijdErbij(Traject &t, uint32_t meting, uint32_t nu) {
  if (meting < RIJTIJD_MIN_MS) return false;
  t.laatst = nu;
  if (t.n >= 2 && meting > 3 * t.ms) return false;
  uint32_t deler = t.n + 1 < 4 ? t.n + 1 : 4;
  t.ms = (uint32_t)((int64_t)t.ms + ((int64_t)meting - (int64_t)t.ms) / (int64_t)deler);
  if (t.n < 60000) t.n++;
  return true;
}

/** fractie tussen van en naar; 0 als er geen rijtijd is */
inline float fractieVan(uint32_t verlopenMs, uint32_t rijtijdMs) {
  if (!rijtijdMs) return 0;
  float f = (float)verlopenMs / (float)rijtijdMs;
  return f > FRACTIE_MAX ? FRACTIE_MAX : (f < 0 ? 0 : f);
}

class Volg {
 public:
  struct Bus {
    bool gezien = false;
    char van[PUNT_ID_LEN] = {0}, naar[PUNT_ID_LEN] = {0};
    uint32_t gezienMs = 0;
  };
  Bus bus[MAX_BUSSEN];
  Traject traject[MAX_TRAJECTEN];
  int nTrajecten = 0;
  Meldingen meldingen;
  struct Laatst {
    uint8_t ontvanger;
    char code[IR_TEKST_LEN];
    uint32_t ms;
  };
  Laatst irLaatst[IR_LAATST]; // de laatste 8 gelezen codes (de nieuwste achteraan)
  int nIrLaatst = 0;

  int puntIndex(const PuntCfg *p, const char *id) const {
    if (!id || !id[0]) return -1;
    for (int i = 0; i < MAX_PUNTEN; i++)
      if (p[i].gebruikt && strcmp(p[i].id, id) == 0) return i;
    return -1;
  }
  int busVanCode(const BusCfg *b, const char *code) const {
    if (!code || !code[0]) return -1;
    for (int i = 0; i < MAX_BUSSEN; i++)
      if (b[i].gebruikt && b[i].code[0] && strcmp(b[i].code, code) == 0) return i;
    return -1;
  }
  /** de bus die op weg is naar dit punt (de langst onderweg zijnde); -1 = geen */
  int verwachteBus(const BusCfg *b, const char *punt) const {
    int beste = -1;
    for (int i = 0; i < MAX_BUSSEN; i++) {
      if (!b[i].gebruikt || !bus[i].gezien || strcmp(bus[i].naar, punt) != 0) continue;
      if (beste < 0 || (int32_t)(bus[i].gezienMs - bus[beste].gezienMs) < 0) beste = i;
    }
    return beste;
  }

  const Traject *zoekTraject(const char *a, const char *b) const {
    for (int i = 0; i < nTrajecten; i++)
      if (strcmp(traject[i].a, a) == 0 && strcmp(traject[i].b, b) == 0) return &traject[i];
    return nullptr;
  }
  uint32_t rijtijd(const char *a, const char *b) const {
    const Traject *t = zoekTraject(a, b);
    return t ? t->ms : RIJTIJD_START_MS;
  }

  /** het punt na dit punt: "volgende" van het punt, anders het laatst gereden traject vanaf dit punt */
  void volgendePunt(const PuntCfg *p, const char *id, char *uit) const {
    uit[0] = 0;
    int i = puntIndex(p, id);
    if (i >= 0 && p[i].volgende[0]) { strcpy(uit, p[i].volgende); return; }
    const Traject *beste = nullptr;
    for (int k = 0; k < nTrajecten; k++)
      if (strcmp(traject[k].a, id) == 0 && (!beste || (int32_t)(traject[k].laatst - beste->laatst) > 0)) beste = &traject[k];
    if (beste) strcpy(uit, beste->b);
  }

  /** bus b (index) gezien bij punt id: rijtijd meten, van/naar bijwerken */
  void busGezien(int b, const char *id, const PuntCfg *p, uint32_t nu) {
    if (b < 0 || b >= MAX_BUSSEN) return;
    Bus &x = bus[b];
    if (x.gezien && x.van[0] && strcmp(x.van, id) != 0) {
      Traject *t = const_cast<Traject *>(zoekTraject(x.van, id));
      if (!t) t = nieuwTraject(x.van, id);
      rijtijdErbij(*t, nu - x.gezienMs, nu);
    }
    x.gezien = true;
    strcpy(x.van, id);
    x.gezienMs = nu;
    volgendePunt(p, id, x.naar);
  }

  /** de bus vertrekt (de halte gaf groen): de rijtijd naar het volgende punt telt vanaf nu */
  void vertrek(int b, uint32_t nu) {
    if (b >= 0 && b < MAX_BUSSEN && bus[b].gezien) bus[b].gezienMs = nu;
  }

  float fractie(int b, uint32_t nu) const {
    const Bus &x = bus[b];
    if (!x.gezien || !x.naar[0]) return 0;
    return fractieVan(nu - x.gezienMs, rijtijd(x.van, x.naar));
  }

  /** rijdt | halte | wacht | onbekend (inHalte: een halte houdt deze bus vast) */
  const char *staat(int b, uint32_t nu, bool inHalte) const {
    const Bus &x = bus[b];
    if (!x.gezien || nu - x.gezienMs > BUS_KWIJT_MS) return "onbekend";
    if (inHalte) return "halte";
    if (!x.naar[0]) return "wacht";
    uint32_t r = rijtijd(x.van, x.naar);
    return (uint64_t)(nu - x.gezienMs) * 2 > (uint64_t)r * 3 ? "wacht" : "rijdt";
  }

  /** een ingang werd actief. Geeft de melding (of nullptr als de ingang aan geen punt hangt). */
  const Melding *ingangActief(int ingang, const PuntCfg *p, const BusCfg *b, uint32_t nu) {
    for (int i = 0; i < MAX_PUNTEN; i++) {
      if (!p[i].gebruikt || p[i].ingang != ingang) continue;
      Melding m;
      m.ms = nu;
      m.soort = p[i].soort == MELD_AUTO ? MELD_HALL : p[i].soort;
      strcpy(m.punt, p[i].id);
      m.ingang = (int8_t)ingang;
      m.bus = (int8_t)verwachteBus(b, p[i].id);
      if (m.bus >= 0) busGezien(m.bus, p[i].id, p, nu);
      return &meldingen.voegToe(m);
    }
    return nullptr;
  }

  /** een ontvanger (0..3) las iets: code = codetekst, of "" voor licht zonder code (lichtsluis).
   *  Geeft de melding, of nullptr (zelfde doorkomst, of de ontvanger hangt aan geen punt). */
  const Melding *ontvangen(int ontvanger, const char *code, const PuntCfg *p, const BusCfg *b, uint32_t nu) {
    if (code[0]) {
      // dezelfde doorkomst? (de bus zendt zijn code voortdurend)
      bool zelfde = false;
      for (int i = nIrLaatst - 1; i >= 0; i--)
        if (irLaatst[i].ontvanger == ontvanger) {
          zelfde = strcmp(irLaatst[i].code, code) == 0 && nu - irLaatst[i].ms < DOORKOMST_MS;
          if (zelfde) irLaatst[i].ms = nu;
          break;
        }
      if (zelfde) return nullptr;
      if (nIrLaatst == IR_LAATST) {
        memmove(irLaatst, irLaatst + 1, sizeof(Laatst) * (IR_LAATST - 1));
        nIrLaatst--;
      }
      Laatst &l = irLaatst[nIrLaatst++];
      l.ontvanger = (uint8_t)ontvanger;
      strncpy(l.code, code, IR_TEKST_LEN - 1);
      l.code[IR_TEKST_LEN - 1] = 0;
      l.ms = nu;
    } else {
      if (ftrGezien_[ontvanger & 3] && nu - ftrMs_[ontvanger & 3] < FTR_MIN_MS) return nullptr;
      ftrGezien_[ontvanger & 3] = true;
      ftrMs_[ontvanger & 3] = nu;
    }
    for (int i = 0; i < MAX_PUNTEN; i++) {
      if (!p[i].gebruikt || p[i].ontvanger != ontvanger) continue;
      Melding m;
      m.ms = nu;
      m.soort = code[0] ? MELD_IR : MELD_FTR;
      if (p[i].soort != MELD_AUTO && !(p[i].soort == MELD_IR && !code[0])) m.soort = p[i].soort;
      strcpy(m.punt, p[i].id);
      m.ontvanger = (int8_t)ontvanger;
      strncpy(m.code, code, IR_TEKST_LEN - 1);
      m.bus = (int8_t)(code[0] ? busVanCode(b, code) : verwachteBus(b, p[i].id));
      if (m.bus >= 0) busGezien(m.bus, p[i].id, p, nu);
      return &meldingen.voegToe(m);
    }
    return nullptr;
  }

  /** met de hand (testen): bus b gezien bij punt id */
  const Melding *handmatig(int b, const char *id, const PuntCfg *p, uint32_t nu) {
    Melding m;
    m.ms = nu;
    int i = puntIndex(p, id);
    m.soort = (i >= 0 && p[i].soort != MELD_AUTO) ? p[i].soort : (i >= 0 && p[i].ontvanger >= 0 ? MELD_IR : MELD_HALL);
    strcpy(m.punt, id);
    if (i >= 0) { m.ingang = p[i].ingang; m.ontvanger = p[i].ontvanger; }
    m.bus = (int8_t)b;
    busGezien(b, id, p, nu);
    return &meldingen.voegToe(m);
  }

  /** een bus vergeten (gewist of nieuwe code) */
  void vergeetBus(int b) {
    if (b >= 0 && b < MAX_BUSSEN) bus[b] = Bus();
  }
  /** een punt is gewist of hernoemd: trajecten met dat punt weg */
  void vergeetPunt(const char *id) {
    int k = 0;
    for (int i = 0; i < nTrajecten; i++)
      if (strcmp(traject[i].a, id) != 0 && strcmp(traject[i].b, id) != 0) traject[k++] = traject[i];
    nTrajecten = k;
  }

 private:
  bool ftrGezien_[IR_ONTVANGERS] = {false, false, false, false};
  uint32_t ftrMs_[IR_ONTVANGERS] = {0, 0, 0, 0};

  Traject *nieuwTraject(const char *a, const char *b) {
    int i = nTrajecten;
    if (nTrajecten < MAX_TRAJECTEN) nTrajecten++;
    else {
      // vol: het langst niet gereden traject maakt plaats
      i = 0;
      for (int k = 1; k < MAX_TRAJECTEN; k++)
        if ((int32_t)(traject[k].laatst - traject[i].laatst) < 0) i = k;
    }
    traject[i] = Traject();
    strcpy(traject[i].a, a);
    strcpy(traject[i].b, b);
    return &traject[i];
  }
};

} // namespace trein
