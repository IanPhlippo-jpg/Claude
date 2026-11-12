// Kleine hulpjes voor het onderhoud van de doos, zonder hardware (testen: test/test_onderhoud):
//   LangeDruk     de BOOT-knop (GPIO0) 5 s ingedrukt houden = het wifi-wachtwoord terug naar "treinbaan"
//                 (voor wie het wachtwoord vergeten is: zonder dat kom je niet meer in het dashboard)
//   HotspotWacht  beslist wanneer main.cpp de hotspot opnieuw moet starten als hij weg is (elke 10 s nakijken,
//                 bij herhaald mislukken steeds wat langer wachten, tot 60 s)
//   UpdateControle  kijkt een nieuwe firmware na voor ze geschreven wordt: begint met 0xE9 (het teken van een
//                 ESP32-image) en past in het vrije app-slot (default_16MB.csv: app0 en app1, elk 6,25 MB)
#pragma once
#include <stddef.h>
#include <stdint.h>

namespace trein {

constexpr uint32_t LANGE_DRUK_MS = 5000;   // zo lang de BOOT-knop vasthouden
constexpr uint32_t KNOP_ONTDENDER_MS = 50; // korter ingedrukt telt niet
constexpr uint32_t HOTSPOT_KIJK_MS = 10000, HOTSPOT_MAX_WACHT_MS = 60000;
constexpr uint8_t ESP_IMAGE_MAGIC = 0xE9;

/** voor de tijd geldt dezelfde afspraak als in licht.h: verschillen, zodat millis() mag rondlopen */
inline bool voorbijOnderhoud(uint32_t nu, uint32_t moment) { return (int32_t)(nu - moment) >= 0; }

/** een knop die lang ingedrukt moet worden. stap() geeft precies één keer true per keer vasthouden. Een knop die
 *  bij het opstarten al ingedrukt is (de BOOT-knop zet de ESP dan in de flashmodus) telt pas na loslaten. */
class LangeDruk {
 public:
  explicit LangeDruk(uint32_t duurMs = LANGE_DRUK_MS) : duur_(duurMs) {}

  bool stap(bool ingedrukt, uint32_t nu) {
    if (!gestart_) {
      gestart_ = true;
      geblokkeerd_ = ingedrukt;
      laatst_ = ingedrukt;
      sinds_ = nu;
      return false;
    }
    if (ingedrukt != laatst_) { laatst_ = ingedrukt; sinds_ = nu; }
    // ontdenderd: pas na KNOP_ONTDENDER_MS dezelfde lezing telt de nieuwe toestand
    if (!voorbijOnderhoud(nu, sinds_ + KNOP_ONTDENDER_MS)) return false;
    if (!ingedrukt) { geblokkeerd_ = false; gemeld_ = false; return false; }
    if (geblokkeerd_ || gemeld_) return false;
    if (voorbijOnderhoud(nu, sinds_ + duur_)) { gemeld_ = true; return true; }
    return false;
  }

  /** hoe lang de knop al (ontdenderd) vastgehouden wordt, 0 = niet; voor een lampje dat aftelt */
  uint32_t vast(uint32_t nu) const { return (gestart_ && laatst_ && !geblokkeerd_) ? nu - sinds_ : 0; }

 private:
  uint32_t duur_, sinds_ = 0;
  bool gestart_ = false, laatst_ = false, geblokkeerd_ = false, gemeld_ = false;
};

/** wanneer de hotspot opnieuw starten. kijk() elke lus: true = nu opnieuw starten (main.cpp doet het). */
class HotspotWacht {
 public:
  bool kijk(bool hotspotGoed, uint32_t nu) {
    if (!gestart_) { gestart_ = true; volgende_ = nu + HOTSPOT_KIJK_MS; }
    if (!voorbijOnderhoud(nu, volgende_)) return false;
    if (hotspotGoed) {
      wacht_ = HOTSPOT_KIJK_MS;
      volgende_ = nu + HOTSPOT_KIJK_MS;
      return false;
    }
    herstarts++;
    volgende_ = nu + wacht_;
    wacht_ = wacht_ * 2 > HOTSPOT_MAX_WACHT_MS ? HOTSPOT_MAX_WACHT_MS : wacht_ * 2;
    return true;
  }
  uint32_t herstarts = 0; // hoe vaak al (voor de seriële monitor)
  uint32_t wacht() const { return wacht_; }

 private:
  bool gestart_ = false;
  uint32_t volgende_ = 0, wacht_ = HOTSPOT_KIJK_MS;
};

/** een nieuwe firmware nakijken terwijl ze binnenkomt. nullptr = goed, anders de reden (voor het dashboard). */
class UpdateControle {
 public:
  /** begin: de verwachte grootte (0 = onbekend) en de grootte van het vrije app-slot */
  const char *begin(size_t verwacht, size_t slot) {
    slot_ = slot;
    ontvangen_ = 0;
    eerste_ = true;
    if (slot == 0) return "Er is geen vrije plaats voor een nieuwe firmware.";
    if (verwacht > slot) return "Dit bestand is te groot voor de doos.";
    return nullptr;
  }
  /** een stuk ontvangen */
  const char *stuk(const uint8_t *data, size_t n) {
    if (eerste_ && n > 0) {
      eerste_ = false;
      if (data[0] != ESP_IMAGE_MAGIC) return "Dit is geen firmware voor de ESP32 (kies het .bin-bestand van de doos, niet de .elf of een ander bestand).";
    }
    ontvangen_ += n;
    if (ontvangen_ > slot_) return "Dit bestand is te groot voor de doos.";
    return nullptr;
  }
  /** einde: iets ontvangen? */
  const char *einde() const { return ontvangen_ == 0 ? "Het bestand is leeg." : nullptr; }
  size_t ontvangen() const { return ontvangen_; }

 private:
  size_t slot_ = 0, ontvangen_ = 0;
  bool eerste_ = true;
};

} // namespace trein
