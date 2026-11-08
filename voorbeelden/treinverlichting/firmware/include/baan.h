// De hele lichtsturing samen, zonder hardware: groepen, effecten, dag/nacht, scènes, functies en ingangen.
// main.cpp roept elke 10 ms tick() aan met de tijd en de ingangen, en schrijft lampen.uitgang[] naar de PCA9685.
// Het dashboard (api.h) gebruikt de bedieningsfuncties hieronder. Testen: test/test_functies, test/test_api.
//
// Afspraken:
//   - "Alles uit" stopt alle functies en de dag/nacht-cyclus en zet alle groepen uit (helderheid en effect blijven
//     bewaard: weer aanzetten geeft dezelfde lamp terug);
//   - overweg (om beurten): een groep met een tweede groep (p2) neemt die tweede groep mee: zelfde tempo, tegengesteld,
//     samen aan en uit. Een functiestap met effect overweg op meer groepen laat ze om beurten knipperen
//     (1e, 3e, ... samen; 2e, 4e, ... samen);
//   - dag/nacht: alleen op de overgangen (avond: aan, ochtend: uit) zet de cyclus een deelnemende groep; wie een
//     groep tussendoor met de hand aan- of uitzet, houdt die stand tot de volgende overgang;
//   - cfgRev telt elke wijziging van de instellingen (main.cpp bewaart dan /instellingen.json; het dashboard laadt
//     alles opnieuw), standRev elke wijziging van de stand (main.cpp bewaart /stand.json).
#pragma once
#include <string>

#include "functies.h"
#include "ingangen.h"
#include "licht.h"
#include "opslag.h"

namespace trein {

constexpr const char *FW_VERSIE = "1.0.0";

class Baan : public Uitvoerder {
 public:
  Config cfg;
  Lampen lampen;
  Sequencer seq;
  Ingangen ingangen;
  DagNacht dn;
  uint16_t ingangRuw = 0;
  uint32_t cfgRev = 1, standRev = 1;
  std::string melding; // voor het dashboard (instellingen hersteld, chip niet gevonden, ...)

  explicit Baan(uint32_t zaad = 20261108u) : lampen(zaad) {
    standaard(cfg);
    dn.zaad = zaad;
    for (int g = 0; g < N_GROEPEN; g++) dnVorig_[g] = false;
    toepassen(0);
  }

  /** na het laden of wijzigen van de instellingen: faduur, maxima en dag/nacht-duur doorgeven */
  void toepassen(uint32_t nu) {
    lampen.faduurMs = cfg.inst.faduurMs;
    for (int g = 0; g < N_GROEPEN; g++) lampen.maxPct[g] = cfg.groep[g].max;
    uint32_t duur = (uint32_t)cfg.inst.dagnachtMin * 60000u;
    if (duur != dn.duurMs) dn.zetDuur(duur, nu);
  }

  void instellingenGewijzigd(uint32_t nu) {
    toepassen(nu);
    cfgRev++;
  }

  /** elke 10 ms */
  void tick(uint32_t nu, uint16_t ruw) {
    ingangRuw = ruw;
    Opdracht op[N_INGANGEN];
    int n = ingangen.stap(ruw, nu, cfg.ingang, op, N_INGANGEN);
    for (int i = 0; i < n; i++) {
      int f = op[i].functie;
      if (op[i].soort == OPDR_STOP || (op[i].soort == OPDR_WISSEL && seq.loopt(f))) functieStop(f, nu);
      else functieStart(f, nu);
    }
    seq.stap(cfg.functie, *this, nu);
    dagnachtStap(nu);
    lampen.stap(nu);
  }

  // ------------------------------------------------------------------------------------------------ groepen
  /** een groep zetten (met de tweede groep van een overweg) */
  void zetGroep(int g, const GroepStand &s, uint32_t nu) {
    if (g < 0 || g >= N_GROEPEN) return;
    GroepStand n = geldig(s);
    int p = n.p2 - 1;
    if (n.effect == FX_OVERWEG && p >= 0 && p < N_GROEPEN && p != g) {
      GroepStand m = lampen.stand[p];
      m.aan = n.aan;
      m.helderheid = n.helderheid;
      m.effect = FX_OVERWEG;
      m.p1 = n.p1;
      m.p2 = g + 1;
      m.fase = (uint8_t)(1 - n.fase);
      lampen.zet(g, n, nu, true);
      lampen.zet(p, m, nu, true);
    } else {
      lampen.zet(g, n, nu);
    }
    standRev++;
  }

  void allesUit(uint32_t nu) {
    seq.stopAlles();
    dn.loopt = false;
    for (int g = 0; g < N_GROEPEN; g++) {
      GroepStand s = lampen.stand[g];
      s.aan = false;
      lampen.zet(g, s, nu);
    }
    standRev++;
  }

  // ------------------------------------------------------------------------------------------------- scènes
  bool sceneOproepen(int i, uint32_t nu) {
    if (i < 0 || i >= MAX_SCENES || !cfg.scene[i].gebruikt) return false;
    for (int g = 0; g < N_GROEPEN; g++) {
      const GroepStand &s = cfg.scene[i].groep[g];
      lampen.zet(g, s, nu, s.effect == FX_OVERWEG); // overweg-paren samen laten beginnen
    }
    standRev++;
    return true;
  }

  /** de huidige stand bewaren; plaats -1 = de eerste vrije. Geeft de plaats, of -1 als alles vol is. */
  int sceneBewaren(int plaats, const char *naam) {
    if (plaats < 0)
      for (int i = 0; i < MAX_SCENES && plaats < 0; i++)
        if (!cfg.scene[i].gebruikt) plaats = i;
    if (plaats < 0 || plaats >= MAX_SCENES) return -1;
    Scene &s = cfg.scene[plaats];
    char oud[NAAM_LEN];
    strcpy(oud, s.gebruikt ? s.naam : "");
    s.gebruikt = true;
    kopieerNaam(s.naam, naam);
    if (!s.naam[0]) {
      if (oud[0]) strcpy(s.naam, oud);
      else standaardNaam(s.naam, "Scène", plaats + 1);
    }
    for (int g = 0; g < N_GROEPEN; g++) s.groep[g] = lampen.stand[g];
    cfgRev++;
    return plaats;
  }

  bool sceneWissen(int i) {
    if (i < 0 || i >= MAX_SCENES || !cfg.scene[i].gebruikt) return false;
    cfg.scene[i] = Scene();
    cfgRev++;
    return true;
  }

  // ----------------------------------------------------------------------------------------------- functies
  void functieStart(int f, uint32_t nu) { seq.start(cfg.functie, f, *this, nu); }
  void functieStop(int f, uint32_t nu) { seq.stop(cfg.functie, f, *this, nu, true); }

  /** een functie bewaren (plaats -1 = de eerste vrije); een lopende functie stopt eerst. -1 = vol. */
  int functieBewaren(int plaats, const Functie &f, uint32_t nu) {
    if (plaats < 0)
      for (int i = 0; i < MAX_FUNCTIES && plaats < 0; i++)
        if (!cfg.functie[i].gebruikt) plaats = i;
    if (plaats < 0 || plaats >= MAX_FUNCTIES) return -1;
    functieStop(plaats, nu);
    cfg.functie[plaats] = f;
    cfg.functie[plaats].gebruikt = true;
    if (!cfg.functie[plaats].naam[0]) standaardNaam(cfg.functie[plaats].naam, "Functie", plaats + 1);
    cfgRev++;
    return plaats;
  }

  /** wissen: stopt hem en haalt hem weg bij de ingangen die hem startten */
  bool functieWissen(int f, uint32_t nu) {
    if (f < 0 || f >= MAX_FUNCTIES || !cfg.functie[f].gebruikt) return false;
    functieStop(f, nu);
    cfg.functie[f] = Functie();
    for (int i = 0; i < N_INGANGEN; i++) {
      if (cfg.ingang[i].functieA == f) cfg.ingang[i].functieA = -1;
      if (cfg.ingang[i].functieB == f) cfg.ingang[i].functieB = -1;
    }
    cfgRev++;
    return true;
  }

  // ---------------------------------------------------------------------------------------------- dag/nacht
  uint16_t deelnemers() const {
    uint16_t m = 0;
    for (int g = 0; g < N_GROEPEN; g++)
      if (cfg.groep[g].dagnacht) m |= (uint16_t)(1u << g);
    return m;
  }

  /** starten vanaf het begin van een fase (DAG, AVOND, NACHT, OCHTEND), of op een bepaalde plaats (ms) */
  void dagnachtStart(uint32_t nu, int vanafFase, int32_t posMs = -1) {
    dn.duurMs = (uint32_t)cfg.inst.dagnachtMin * 60000u;
    dn.begin(nu, vanafFase);
    if (posMs >= 0) dn.start = nu - ((uint32_t)posMs % dn.duurMs);
    // de deelnemers meteen in de juiste stand
    uint16_t m = deelnemers();
    for (int g = 0; g < N_GROEPEN; g++) {
      if (!(m >> g & 1)) continue;
      dnVorig_[g] = dn.wilAan(g, m, nu);
      zetAan(g, dnVorig_[g], nu);
    }
  }

  void dagnachtStop() {
    dn.loopt = false;
    standRev++;
  }

  // ------------------------------------------------------------------------------------- stand na stroomuitval
  Stand bewaarStand(uint32_t nu) const {
    Stand s;
    for (int g = 0; g < N_GROEPEN; g++) s.groep[g] = lampen.stand[g];
    s.dagnachtLoopt = dn.loopt;
    s.dagnachtPosMs = dn.loopt ? dn.positieMs(nu) : 0;
    for (int f = 0; f < MAX_FUNCTIES; f++)
      if (seq.loopt(f) && cfg.functie[f].herhalen) s.functies |= (uint16_t)(1u << f);
    return s;
  }

  /** de laatste stand terugzetten (met de gewone zachte overgang vanaf donker) */
  void herstelStand(const Stand &s, uint32_t nu) {
    for (int g = 0; g < N_GROEPEN; g++) lampen.zet(g, s.groep[g], nu, s.groep[g].effect == FX_OVERWEG);
    if (s.dagnachtLoopt) dagnachtStart(nu, DAG, (int32_t)s.dagnachtPosMs);
    for (int f = 0; f < MAX_FUNCTIES; f++)
      if (s.functies >> f & 1 && cfg.functie[f].herhalen) functieStart(f, nu);
    standRev++;
  }

  // ------------------------------------------------------------------------------- Uitvoerder (de functies)
  void voerUit(const Stap &st, uint32_t nu) override {
    switch (st.actie) {
      case ACT_AAN:
      case ACT_UIT:
        for (int g = 0; g < N_GROEPEN; g++)
          if (st.groepen >> g & 1) zetAan(g, st.actie == ACT_AAN, nu);
        break;
      case ACT_HELDERHEID:
        for (int g = 0; g < N_GROEPEN; g++)
          if (st.groepen >> g & 1) {
            GroepStand s = lampen.stand[g];
            s.aan = true;
            s.helderheid = (uint8_t)klem(st.waarde, 1, 100);
            zetGroep(g, s, nu);
          }
        break;
      case ACT_EFFECT: {
        int lijst[N_GROEPEN], n = 0;
        for (int g = 0; g < N_GROEPEN; g++)
          if (st.groepen >> g & 1) lijst[n++] = g;
        for (int i = 0; i < n; i++) {
          GroepStand s = lampen.stand[lijst[i]];
          s.aan = true;
          s.effect = st.effect;
          s.p1 = st.p1;
          s.p2 = st.p2;
          s.fase = 0;
          if (st.effect == FX_OVERWEG && n >= 2) {
            // om beurten over de gekozen groepen; de buur in het paar is de tweede groep
            s.fase = (uint8_t)(i & 1);
            s.p2 = (i ^ 1) < n ? lijst[i ^ 1] + 1 : 0;
            lampen.zet(lijst[i], s, nu, true);
            standRev++;
          } else {
            zetGroep(lijst[i], s, nu);
          }
        }
        break;
      }
      case ACT_SCENE:
        sceneOproepen(st.waarde - 1, nu);
        break;
      case ACT_DAGNACHT:
        if (st.waarde) dagnachtStart(nu, DAG);
        else dagnachtStop();
        break;
      default:
        break;
    }
  }

  void groepenUit(uint16_t groepen, uint32_t nu) override {
    for (int g = 0; g < N_GROEPEN; g++)
      if (groepen >> g & 1) zetAan(g, false, nu);
  }

 private:
  bool dnVorig_[N_GROEPEN];

  void zetAan(int g, bool aan, uint32_t nu) {
    GroepStand s = lampen.stand[g];
    s.aan = aan;
    zetGroep(g, s, nu);
  }

  void dagnachtStap(uint32_t nu) {
    if (!dn.loopt) return;
    uint16_t m = deelnemers();
    for (int g = 0; g < N_GROEPEN; g++) {
      if (!(m >> g & 1)) continue;
      bool w = dn.wilAan(g, m, nu);
      if (w != dnVorig_[g]) {
        dnVorig_[g] = w;
        zetAan(g, w, nu);
      }
    }
  }
};

} // namespace trein
