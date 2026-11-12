// De bediening van de knop zonder hardware: draaien, drukken, het scherm "Nieuw filter geplaatst?", de wens (aan, stand,
// boost- en ijkvraag) en wat de knop met de status van de module doet. src/knop/main.cpp geeft de tijd, de draaiknop,
// de drukknop en de status door, stuurt de opdracht en tekent het scherm dat scherm() kiest. Zo is de bediening op de
// pc te testen (test/test_regel).
//
// Bediening
//   draaien                 zuigkracht in stappen van 5 % (20 tot 80 %); draaien als hij uit staat zet hem aan
//   kort drukken            aan / uit (UIT heeft voorrang: ook een ijking stopt meteen)
//   1 tot 5 s vasthouden    boost: 2 minuten 100 % (de module houdt tijd en tegoed bij)
//   5 tot 10 s vasthouden   bij het loslaten het scherm "Nieuw filter geplaatst?": kort drukken = ijken, 3 tot 8 s
//                           vasthouden = "ander merk filter" (de eerste ijking vervalt, deze wordt de referentie: 7.2),
//                           draaien of 10 s niets doen = annuleren. Zonder bevestiging vraagt de knop geen ijking.
//   10 s vasthouden         opnieuw koppelen (nog tijdens het vasthouden)
//
// Herstart
//   - de knop zelf: hij neemt de stand van de module over uit de eerste status en stuurt niets tot de gebruiker iets doet;
//   - de module: ziet de knop een ander startId dan het vorige terwijl zijn wens AAN is, dan zet hij de wens op UIT en
//     toont hij "afzuiging herstart, druk om aan te zetten". De module zelf neemt AAN alleen aan met haar nieuwe startId.
//   - zonder verse status (jonger dan 2 s) toont de knop nooit een bevestigde stand: "UIT?" of "AAN?".
//   - 7.2: stopt de module zelf (filter ontbreekt of geen luchtstroom, 10 min geen knop, 4 uur geen bediening), dan zet de
//     knop zijn wens op UIT en toont hij waarom; de module start pas weer na die UIT en een nieuwe AAN.
#pragma once
#include <stdint.h>

#include "protocol.h"

namespace afzuiging {

constexpr int MIN_PCT = 20, MAX_PCT = 80, STAP_PCT = 5; // 100 % alleen als boost (warmte box)
constexpr uint32_t KORT_MIN_MS = 30;                    // korter = dender, geen druk
constexpr uint32_t BOOST_HOUD_MS = 1000, IJK_HOUD_MS = 5000, KOPPEL_HOUD_MS = 10000;
constexpr uint32_t NIEUW_FILTER_MS = 10000; // zo lang wacht "Nieuw filter geplaatst?" op een bevestiging
constexpr uint32_t REF_HOUD_MIN_MS = 3000, REF_HOUD_MAX_MS = 8000; // 7.2: "ander merk filter" op dat scherm
constexpr uint32_t VERS_MS = 2000;          // een status is 2 s vers; daarna is niets meer bevestigd

// wat de knop toont (de meldingen binnen SCH_AAN kiest main.cpp uit de status)
enum Scherm : uint8_t {
  SCH_KOPPELEN,     // "KOPPELEN"
  SCH_NIEUW_FILTER, // "NIEUW FILTER?" (bevestigen of annuleren)
  SCH_IJKEN,        // "IJKEN" met voortgang
  SCH_AAN_ONBEVESTIGD, // "AAN?" geen verbinding met de box, stand niet bevestigd
  SCH_UIT_ONBEVESTIGD, // "UIT?" niet bevestigd, geen verbinding
  SCH_HERSTART,     // "UIT" afzuiging herstart, druk om aan te zetten
  SCH_UIT,          // "UIT" druk om te starten
  SCH_AAN,          // de bevestigde stand en de meldingen
  SCH_GESTOPT,      // 7.2: "UIT" de module stopte zelf (reden in gestopt), druk om opnieuw te starten
};

class Bediening {
 public:
  // de wens van de gebruiker
  bool aan = false;
  int pct = 80;
  uint8_t ijk = 0, boost = 0, refWis = 0;
  uint8_t gestopt = STOP_GEEN; // 7.2: de module stopte zelf (reden), tot de volgende handeling
  // toestand
  bool zenden = false;        // de gebruiker deed iets sinds de start: opdrachten sturen
  bool basis = false;         // eerst één opdracht met de toestand van vóór die eerste handeling (main.cpp)
  bool gewijzigd = false;     // meteen een opdracht sturen (main.cpp zet terug)
  bool nieuwFilter = false;   // scherm "Nieuw filter geplaatst?"
  bool herstart = false;      // de module is herstart terwijl de knop AAN wilde
  bool koppelVraag = false;   // 10 s vastgehouden: main.cpp wist de koppeling en zet terug
  uint32_t moduleStart = 0;   // startId uit de laatste status
  uint32_t boostVraag = 0;    // wanneer de laatste boost gevraagd werd
  Status st;                  // de laatste status
  bool heeftStatus = false;

  /** stappen van de draaiknop (+ of -) */
  void draai(long stappen, uint32_t nu) {
    if (stappen == 0) return;
    if (nieuwFilter) { nieuwFilter = false; return; } // draaien annuleert, verder niets
    if (!aan) {
      handeling();
      aan = true;
      return;
    }
    long nieuw = pct + stappen * STAP_PCT;
    nieuw = nieuw < MIN_PCT ? MIN_PCT : nieuw > MAX_PCT ? MAX_PCT : nieuw;
    if (nieuw != pct) {
      handeling();
      pct = (int)nieuw;
    }
    (void)nu;
  }

  /** de drukknop (ingedrukt of niet), elke lus */
  void knop(bool ingedrukt, uint32_t nu) {
    if (ingedrukt && !knopVorig) {
      knopSinds = nu;
      knopGebruikt = false;
    }
    if (ingedrukt && !knopGebruikt && nu - knopSinds >= KOPPEL_HOUD_MS) {
      knopGebruikt = true;
      nieuwFilter = false;
      koppelVraag = true;
    }
    if (!ingedrukt && knopVorig && !knopGebruikt && nu - knopSinds >= KORT_MIN_MS) {
      const uint32_t duur = nu - knopSinds;
      if (nieuwFilter) {
        nieuwFilter = false;
        if (duur < BOOST_HOUD_MS) { // kort drukken = bevestigen: nu pas de ijkvraag
          handeling();
          aan = true; // ijken gebeurt met de ventilator aan
          ijk++;
        } else if (duur >= REF_HOUD_MIN_MS && duur < REF_HOUD_MAX_MS) { // 7.2: ander merk: nieuwe referentie en ijken
          handeling();
          aan = true;
          refWis++;
          ijk++;
        }                           // anders vasthouden = annuleren
      } else if (duur >= IJK_HOUD_MS) {
        nieuwFilter = true;         // eerst bevestigen
        nieuwFilterSinds = nu;
      } else if (duur >= BOOST_HOUD_MS) {
        handeling();
        aan = true;
        boost++;
        boostVraag = nu ? nu : 1;
      } else {
        handeling();
        aan = !aan;
      }
    }
    knopVorig = ingedrukt;
    // geen bevestiging binnen 10 s: annuleren (niet terwijl de knop ingedrukt is)
    if (nieuwFilter && !ingedrukt && nu - nieuwFilterSinds >= NIEUW_FILTER_MS) nieuwFilter = false;
  }

  /** een geldige status van de gekoppelde module */
  void status(const Status &s, uint32_t nu) {
    if (!heeftStatus && !zenden) {
      // de knop is (her)start en de gebruiker deed nog niets: de stand van de module overnemen, niets sturen
      aan = s.gewoon > 0;
      if (s.gewoon) pct = s.gewoon < MIN_PCT ? MIN_PCT : s.gewoon > MAX_PCT ? MAX_PCT : s.gewoon;
    } else if (s.startId != moduleStart && aan) {
      // de module is herstart (of nooit eerder gezien) terwijl de knop AAN wil: zij staat UIT, de knop ook
      aan = false;
      herstart = true;
      gewijzigd = true;
    } else if (s.uitReden != STOP_GEEN && !s.aan && aan) {
      // 7.2: de module stopte zelf: de wens wordt UIT (dan aanvaardt de module een nieuwe AAN)
      aan = false;
      gestopt = s.uitReden;
      gewijzigd = true;
    }
    moduleStart = s.startId;
    st = s;
    heeftStatus = true;
    laatsteStatus = nu ? nu : 1;
  }

  bool vers(uint32_t nu) const { return heeftStatus && nu - laatsteStatus < VERS_MS; }

  /** het scherm dat de knop nu toont */
  Scherm scherm(uint32_t nu, bool gekoppeld) const {
    if (!gekoppeld) return SCH_KOPPELEN;
    if (nieuwFilter) return SCH_NIEUW_FILTER;
    const bool v = vers(nu);
    if (v && st.ijken) return SCH_IJKEN;
    if (!v) return aan ? SCH_AAN_ONBEVESTIGD : SCH_UIT_ONBEVESTIGD;
    if (!st.aan) return herstart ? SCH_HERSTART : gestopt != STOP_GEEN ? SCH_GESTOPT : SCH_UIT;
    return SCH_AAN;
  }

  /** de opdracht met de huidige wens (main.cpp vult sessie en volgnr in) */
  void vulOpdracht(Opdracht &o) const {
    o.aan = aan;
    o.pct = (uint8_t)pct;
    o.ijk = ijk;
    o.boost = boost;
    o.startId = moduleStart;
    o.refWis = refWis;
  }
  /** de opdracht van vóór de eerste handeling: zet de tellers in de module zonder iets te vragen */
  void vulBasis(Opdracht &o) const {
    o.aan = basisAan;
    o.pct = (uint8_t)basisPct;
    o.ijk = basisIjk;
    o.boost = basisBoost;
    o.startId = moduleStart;
    o.refWis = basisRefWis;
  }

  /** resterende tijd op "Nieuw filter geplaatst?" (0..1) */
  float nieuwFilterRest(uint32_t nu) const {
    if (!nieuwFilter) return 0;
    const uint32_t d = nu - nieuwFilterSinds;
    return d >= NIEUW_FILTER_MS ? 0.0f : 1.0f - (float)d / NIEUW_FILTER_MS;
  }

 private:
  /** een handeling van de gebruiker, vóór de wens verandert */
  void handeling() {
    if (!zenden) {
      zenden = true;
      basis = true;
      basisAan = aan;
      basisPct = pct;
      basisIjk = ijk;
      basisBoost = boost;
      basisRefWis = refWis;
    }
    herstart = false;
    gestopt = STOP_GEEN;
    gewijzigd = true;
  }

  uint32_t knopSinds = 0, nieuwFilterSinds = 0, laatsteStatus = 0;
  bool knopGebruikt = false, knopVorig = false;
  bool basisAan = false;
  int basisPct = 80;
  uint8_t basisIjk = 0, basisBoost = 0, basisRefWis = 0;
};

} // namespace afzuiging
