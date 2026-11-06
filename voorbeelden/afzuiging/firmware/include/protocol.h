// Berichten tussen de knop en de module (ESP-NOW, broadcast op kanaal 1). Elk bericht begint met MAGIE en een soort;
// andere ESP-NOW-apparaten in de buurt worden zo genegeerd.
//   knop -> module  Opdracht, 4 keer per seconde en meteen bij een wijziging
//   module -> knop  Status, 4 keer per seconde
// Valt de verbinding weg, dan houdt de module de laatste opdracht aan (de zuigkracht valt niet weg tijdens het werk);
// de schakelaar aan de zijkant zet alles altijd uit.
#pragma once
#include <stdint.h>

namespace afzuiging {

constexpr uint32_t MAGIE = 0x5A41424C; // "LBAZ"
constexpr uint8_t KANAAL = 1;
constexpr uint8_t SOORT_OPDRACHT = 1, SOORT_STATUS = 2;

struct __attribute__((packed)) Opdracht {
  uint32_t magie = MAGIE;
  uint8_t soort = SOORT_OPDRACHT;
  uint8_t aan = 0;    // ventilator aan
  uint8_t pct = 50;   // zuigkracht 20..100 % (boost: 100)
  uint8_t ijk = 0;    // teller: verhoogt bij elke vraag om te ijken
  uint16_t sessie = 0; // willekeurig bij elke start van de knop: een herstart is geen ijkvraag
};

struct __attribute__((packed)) Status {
  uint32_t magie = MAGIE;
  uint8_t soort = SOORT_STATUS;
  uint8_t meter = 0;    // drukmeter gevonden
  uint8_t geijkt = 0;   // ijking op schone filters bewaard
  uint8_t storing = 0;  // geen luchtstroom terwijl de ventilator draait
  uint8_t ijken = 0;    // 0 = niet aan het ijken, anders de stap 1..5
  uint8_t ijkVoortgang = 0; // 0..100 %
  float dp = 0;         // drukverschil over de filters (Pa), NAN als onbekend
  float vol = 0;        // 0 = schoon, 1 = vol (uitkloppen), NAN als onbekend
};

} // namespace afzuiging
