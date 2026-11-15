// Wanneer de eigen hotspot aan of uit gaat, wanneer het kastje zich aanmeldt bij de doos, en de BOOT-knop (testen:
// test/test_wifi). De tijd in ms (millis()); altijd met verschillen gerekend, zodat millis() mag rondlopen.
//   WifiKeuze  het kastje zoekt "Treinbaan" (of het netwerk uit /wifi); 60 s zonder verbinding: de eigen hotspot
//              "Geluidskastje-xxxx" gaat aan (192.168.4.1, wachtwoord "treinbaan"), het zoeken gaat door; is het
//              kastje 10 s verbonden en hangt er niemand aan de hotspot, dan gaat die weer uit.
//   Aanmelder  verbonden: 1,5 s na het verbinden aanmelden, daarna elke 30 s; mislukt: na 10 s opnieuw; na een
//              wijziging (naam, geluid erbij of weg) binnen 1 s.
//   LangeDruk  de BOOT-knop 5 s vasthouden = de wifi terug naar "Treinbaan" / "treinbaan".
#pragma once
#include <stdint.h>

namespace gk {

constexpr uint32_t HOTSPOT_NA_MS = 60000, HOTSPOT_UIT_NA_MS = 10000;
constexpr uint32_t AANMELD_MS = 30000, AANMELD_OPNIEUW_MS = 10000, AANMELD_EERST_MS = 1500, AANMELD_SNEL_MS = 1000;
constexpr uint32_t LANGE_DRUK_MS = 5000, ONTDENDER_MS = 50;

inline bool voorbij(uint32_t nu, uint32_t moment) { return (int32_t)(nu - moment) >= 0; }

enum class WifiActie { niets, hotspotAan, hotspotUit };

class WifiKeuze {
 public:
  void start(uint32_t nu) { zoekSinds_ = nu; hotspot_ = false; verbonden_ = false; }
  /** elke lus: verbonden met het netwerk van de doos? hoeveel toestellen hangen aan de eigen hotspot? */
  WifiActie stap(bool verbonden, int klanten, uint32_t nu) {
    if (verbonden) {
      if (!verbonden_) { verbonden_ = true; verbondenSinds_ = nu; }
      if (hotspot_ && klanten == 0 && voorbij(nu, verbondenSinds_ + HOTSPOT_UIT_NA_MS)) { hotspot_ = false; return WifiActie::hotspotUit; }
      return WifiActie::niets;
    }
    if (verbonden_) { verbonden_ = false; zoekSinds_ = nu; } // verbinding kwijt: opnieuw 60 s zoeken
    if (!hotspot_ && voorbij(nu, zoekSinds_ + HOTSPOT_NA_MS)) { hotspot_ = true; return WifiActie::hotspotAan; }
    return WifiActie::niets;
  }
  /** na POST /wifi of de BOOT-knop: opnieuw zoeken (de hotspot blijft zoals hij is) */
  void opnieuw(uint32_t nu) { zoekSinds_ = nu; verbonden_ = false; }
  bool hotspot() const { return hotspot_; }

 private:
  uint32_t zoekSinds_ = 0, verbondenSinds_ = 0;
  bool hotspot_ = false, verbonden_ = false;
};

class Aanmelder {
 public:
  /** true = nu aanmelden (daarna klaar() met het resultaat) */
  bool stap(bool verbonden, uint32_t nu) {
    if (!verbonden) { verbonden_ = false; return false; }
    if (!verbonden_) { verbonden_ = true; volgende_ = nu + AANMELD_EERST_MS; return false; }
    if (!voorbij(nu, volgende_)) return false;
    volgende_ = nu + AANMELD_MS; // voor het geval klaar() niet komt
    return true;
  }
  void klaar(bool gelukt, uint32_t nu) { volgende_ = nu + (gelukt ? AANMELD_MS : AANMELD_OPNIEUW_MS); gelukt_ = gelukt; }
  /** er veranderde iets dat de doos moet weten */
  void snel(uint32_t nu) { if (verbonden_ && !voorbij(nu + AANMELD_SNEL_MS, volgende_)) volgende_ = nu + AANMELD_SNEL_MS; }
  bool gelukt() const { return gelukt_ && verbonden_; }

 private:
  uint32_t volgende_ = 0;
  bool verbonden_ = false, gelukt_ = false;
};

/** een knop die lang ingedrukt moet worden: stap() geeft precies één keer true per keer vasthouden; een knop die bij
 *  het opstarten al ingedrukt is (de BOOT-knop: flashmodus) telt pas na loslaten */
class LangeDruk {
 public:
  bool stap(bool in, uint32_t nu) {
    if (!gestart_) { gestart_ = true; geblokkeerd_ = in; laatst_ = in; sinds_ = nu; return false; }
    if (in != laatst_) { laatst_ = in; sinds_ = nu; }
    if (!voorbij(nu, sinds_ + ONTDENDER_MS)) return false;
    if (!in) { geblokkeerd_ = false; gemeld_ = false; return false; }
    if (geblokkeerd_ || gemeld_) return false;
    if (voorbij(nu, sinds_ + LANGE_DRUK_MS)) { gemeld_ = true; return true; }
    return false;
  }

 private:
  uint32_t sinds_ = 0;
  bool gestart_ = false, geblokkeerd_ = false, laatst_ = false, gemeld_ = false;
};

} // namespace gk
