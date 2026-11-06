// Berichten tussen de knop en de module (ESP-NOW op kanaal 1), versie 2.
//
// Koppeling per set: een nieuwe knop zendt KOPPEL (broadcast) met een willekeurige sleutel van 16 bytes. De module
// aanvaardt dat alleen in de eerste 60 s na het aanzetten van de voedingsbox (koppelvenster) en bewaart het MAC-adres
// van de knop en de sleutel; ze antwoordt KOPPEL_OK. Daarna praten beide alleen nog met elkaar, versleuteld (ESP-NOW
// CCMP met die sleutel), en weigert de module elke andere afzender. Een tweede set in dezelfde salon stoort dus niet.
//   knop -> module  Opdracht, 4 keer per seconde en meteen bij een wijziging (volgnummer: geen herhaalde berichten)
//   module -> knop  Status, 4 keer per seconde: de bevestigde toestand van de module (niet wat de knop wil)
// Verbindingsverlies: de module draait verder op de laatste gewone stand (de stofvangst valt niet weg tijdens het
// werk); een boost vervalt in de module zelf na 120 s. De schakelaar op de box zet alles altijd uit (geen netisolatie:
// trek de stekker uit voor onderhoud).
#pragma once
#include <stdint.h>

namespace afzuiging {

constexpr uint32_t MAGIE = 0x5A41424C; // "LBAZ"
constexpr uint8_t VERSIE = 2;
constexpr uint8_t KANAAL = 1;
constexpr uint8_t SOORT_OPDRACHT = 1, SOORT_STATUS = 2, SOORT_KOPPEL = 3, SOORT_KOPPEL_OK = 4;

struct __attribute__((packed)) Opdracht {
  uint32_t magie = MAGIE;
  uint8_t versie = VERSIE;
  uint8_t soort = SOORT_OPDRACHT;
  uint8_t aan = 0;      // de gebruiker wil de afzuiging aan
  uint8_t pct = 50;     // gewone stand 20..100 %
  uint8_t ijk = 0;      // teller: verhoogt bij elke vraag om te ijken
  uint8_t boost = 0;    // teller: verhoogt bij elke vraag om boost (de module houdt zelf de 120 s bij)
  uint16_t sessie = 0;  // willekeurig bij elke start van de knop: een herstart is geen ijk- of boostvraag
  uint32_t volgnr = 0;  // stijgt per bericht binnen een sessie
};

struct __attribute__((packed)) Koppel {
  uint32_t magie = MAGIE;
  uint8_t versie = VERSIE;
  uint8_t soort = SOORT_KOPPEL;
  uint8_t sleutel[16] = {0};
};

// fout bij het ijken (de vorige geldige ijking blijft dan bewaard)
enum IjkFout : uint8_t { IJK_OK = 0, IJK_GEEN_METING = 1, IJK_ONPLAUSIBEL = 2, IJK_BUITEN_BEREIK = 3, IJK_GEEN_TOEREN = 4, IJK_AFGEBROKEN = 5 };
// storing tijdens het werk
enum Storing : uint8_t { STORING_GEEN = 0, STORING_GEEN_LUCHT = 1, STORING_STIL = 2 };

struct __attribute__((packed)) Status {
  uint32_t magie = MAGIE;
  uint8_t versie = VERSIE;
  uint8_t soort = SOORT_STATUS;
  uint8_t aan = 0;          // bevestigd: de module stuurt de ventilator aan
  uint8_t pct = 0;          // de stand die de module nu werkelijk geeft (0 = stil)
  uint8_t boostRest = 0;    // resterende boost in s (0 = geen)
  uint8_t meter = 0;        // drukmeter antwoordt
  uint8_t meetVers = 0;     // de laatste meting is jonger dan 1 s (anders zijn dp en vol ongeldig)
  uint8_t geijkt = 0;       // een geldige ijking op een schoon filter is bewaard
  uint8_t storing = STORING_GEEN;
  uint8_t ijken = 0;        // 0 = niet aan het ijken, anders de stap 1..5
  uint8_t ijkVoortgang = 0; // 0..100 %
  uint8_t ijkFout = IJK_OK; // uitkomst van de laatste ijking
  uint16_t toeren = 0;      // gemeten toerental (omw/min, uit de tacho)
  float dp = 0;             // drukverschil over het filter (Pa), NAN als niet vers
  float vol = 0;            // 0 = schoon, 1 = vervangen, NAN als onbekend of op deze stand niet te bewaken
};

} // namespace afzuiging
