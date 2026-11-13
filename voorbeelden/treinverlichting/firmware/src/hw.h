// De hardware van de doos (alleen Wire en de gewone Arduino-functies, geen andere bibliotheken).
//   PCA9685  16 PWM-uitgangen (12 bit, I2C), elk kanaal stuurt een ingang van een kant-en-klare 8-kanaals
//            MOSFET-module met optocouplers (versie 4; low-side, één lichtgroep per kanaal); eigen kleine driver, wordt
//            elke 2 s nagekeken (na een spanningsdip slaapt hij weer: dan opnieuw instellen).
//            Meer dan 16 groepen (TREIN_GROEPEN): een tweede PCA9685 op 0x41 (A0 op 3,3 V), zelfde I2C en OE.
//   ingangen 16 GPIO's van de ESP32-S3 achter 2 optocouplerprints PC817 (zie INGANG_PINNEN onderaan)
//
// Polariteit (versie 4, de modules zijn gekocht; na te kijken bij de proefopstelling, meetblad TRN-20):
//   uitgangen  standaard ACTIEF LAAG: de MOSFET-module (3,3 V-versie) heeft de led van zijn optocoupler tussen VCC
//              en IN, dus de PCA9685 trekt IN naar 0 V om de groep aan te zetten (MODE2: INVRT, totem-pole, en met OE
//              hoog zijn de uitgangen 1 = alles uit). Een module met de led tussen IN en GND: -DTREIN_UITGANG_ACTIEF_HOOG.
//   ingangen   standaard ACTIEF LAAG: de optocouplerprint (jumper op pull-up) trekt OUT naar GND als de knop
//              ingedrukt is; INPUT_PULLUP. Een print die actief hoog uitgeeft: -DTREIN_INGANG_ACTIEF_HOOG (INPUT_PULLDOWN).
#pragma once
#include <Arduino.h>
#include <Wire.h>

#ifdef TREIN_UITGANG_ACTIEF_HOOG
constexpr bool UITGANG_ACTIEF_LAAG = false;
#else
constexpr bool UITGANG_ACTIEF_LAAG = true;
#endif
#ifdef TREIN_INGANG_ACTIEF_HOOG
constexpr bool INGANG_ACTIEF_LAAG = false;
#else
constexpr bool INGANG_ACTIEF_LAAG = true;
#endif

/** MODE2 van de PCA9685: OUTDRV (totem-pole); actief laag: INVRT en OUTNE = 01 (met OE hoog zijn alle uitgangen 1 = uit);
 *  actief hoog: niet omgekeerd, OUTNE = 00 (met OE hoog alle uitgangen 0 = uit) */
constexpr uint8_t pcaMode2(bool actiefLaag) { return actiefLaag ? 0x15 : 0x04; }

class Pca9685 {
 public:
  static constexpr uint8_t MODE1 = 0x00, MODE2 = 0x01, LED0_ON_L = 0x06, ALL_LED_ON_L = 0xFA, PRESCALE = 0xFE;
  // 25 MHz / (4096 x (5 + 1)) = 1017 Hz: boven wat het oog of een camera als flikkeren ziet, traag genoeg voor de
  // optocouplers van de MOSFET-modules (PC817: schakeltijden van enkele tot tientallen µs, docs/Berekeningen.md)
  static constexpr uint8_t PRESCALE_1KHZ = 5;

  /** instellen met ALLE kanalen uit; true = de chip antwoordt en staat goed */
  bool begin(TwoWire &w, uint8_t adres) {
    wire_ = &w;
    adres_ = adres;
    for (int i = 0; i < 16; i++) laatst_[i] = 0xFFFF; // de volgende zet() schrijft alles
    if (!schrijf(MODE1, 0x10)) return false;          // slapen: dan mag de prescaler veranderen
    const uint8_t allesUit[4] = {0x00, 0x00, 0x00, 0x10}; // ALL_LED_OFF_H bit 4 = volledig uit
    if (!schrijf(ALL_LED_ON_L, allesUit, 4)) return false;
    schrijf(PRESCALE, PRESCALE_1KHZ);
    schrijf(MODE2, pcaMode2(UITGANG_ACTIEF_LAAG)); // totem-pole; omgekeerd bij modules die actief laag schakelen
    schrijf(MODE1, 0x20);  // wakker, registers automatisch ophogen (AI), ALLCALL uit
    delayMicroseconds(600); // de oscillator heeft 500 us nodig
    return controleer();
  }

  /** wakker en de juiste frequentie? */
  bool controleer() {
    uint8_t m, p, m2;
    return lees(MODE1, m) && lees(PRESCALE, p) && lees(MODE2, m2) && !(m & 0x10) && (m & 0x20) && p == PRESCALE_1KHZ &&
           m2 == pcaMode2(UITGANG_ACTIEF_LAAG);
  }

  /** alle 16 kanalen in één keer (0..4095); alleen als er iets veranderd is. De kanalen beginnen elk op een ander
   *  moment in de periode (kanaal x 256): zo schakelen de 16 MOSFET's niet allemaal tegelijk. */
  bool zet(const uint16_t *v) {
    bool anders = false;
    for (int i = 0; i < 16; i++)
      if (v[i] != laatst_[i]) anders = true;
    if (!anders) return true;
    wire_->beginTransmission(adres_);
    wire_->write(LED0_ON_L);
    for (int ch = 0; ch < 16; ch++) {
      uint16_t aan, uit;
      if (v[ch] == 0) { aan = 0; uit = 0x1000; }            // volledig uit
      else if (v[ch] >= 4095) { aan = 0x1000; uit = 0; }    // volledig aan
      else { aan = (uint16_t)(ch * 256); uit = (uint16_t)((aan + v[ch]) & 0x0FFF); }
      wire_->write((uint8_t)(aan & 0xFF));
      wire_->write((uint8_t)(aan >> 8));
      wire_->write((uint8_t)(uit & 0xFF));
      wire_->write((uint8_t)(uit >> 8));
    }
    if (wire_->endTransmission() != 0) {
      for (int i = 0; i < 16; i++) laatst_[i] = 0xFFFF;
      return false;
    }
    for (int i = 0; i < 16; i++) laatst_[i] = v[i];
    return true;
  }

 private:
  TwoWire *wire_ = nullptr;
  uint8_t adres_ = 0x40;
  uint16_t laatst_[16];

  bool schrijf(uint8_t reg, uint8_t waarde) { return schrijf(reg, &waarde, 1); }
  bool schrijf(uint8_t reg, const uint8_t *data, size_t n) {
    wire_->beginTransmission(adres_);
    wire_->write(reg);
    wire_->write(data, n);
    return wire_->endTransmission() == 0;
  }
  bool lees(uint8_t reg, uint8_t &waarde) {
    wire_->beginTransmission(adres_);
    wire_->write(reg);
    if (wire_->endTransmission(false) != 0) return false;
    if (wire_->requestFrom(adres_, (uint8_t)1) != 1) return false;
    waarde = (uint8_t)wire_->read();
    return true;
  }
};

/** de 16 ingangen, rechtstreeks op GPIO's van de ESP32-S3 (ingang 1..16 in deze volgorde), via de schroefklemmen van
 *  de klemmenadapter op OUT1..OUT8 van de 2 optocouplerprints. Standaard trekt de optocoupler de pin naar GND = ACTIEF;
 *  in rust houdt de interne pull-up (INPUT_PULLUP) hem hoog (TREIN_INGANG_ACTIEF_HOOG: andersom, INPUT_PULLDOWN).
 *  Niet gebruikt (bewust): 0, 3, 45, 46 (strapping), 19, 20 (USB), 35, 36, 37 (octal PSRAM van de N16R8),
 *  43, 44 (UART0), 38 (RGB-led op de DevKitC-1 v1.1; v1.0: 48); 8, 9 (I2C) en 10 (OE) zijn al bezet.
 *  Vrij voor uitbreidingen: 11, 39, 42, 47 en 48 (48 alleen op v1.1). */
constexpr uint8_t INGANG_PINNEN[16] = {1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41};

/** de RGB-led op het bord (DevKitC-1 v1.1), gebruikt als statuslampje */
constexpr uint8_t PIN_STATUS_LED = 38;

inline void ingangenBegin() {
  for (uint8_t p : INGANG_PINNEN) pinMode(p, INGANG_ACTIEF_LAAG ? INPUT_PULLUP : INPUT_PULLDOWN);
}

/** bit i = ingang i+1 actief (pin laag, of hoog met TREIN_INGANG_ACTIEF_HOOG) */
inline uint16_t ingangenLees() {
  uint16_t actief = 0;
  const int actiefNiveau = INGANG_ACTIEF_LAAG ? LOW : HIGH;
  for (int i = 0; i < 16; i++)
    if (digitalRead(INGANG_PINNEN[i]) == actiefNiveau) actief |= (uint16_t)(1u << i);
  return actief;
}