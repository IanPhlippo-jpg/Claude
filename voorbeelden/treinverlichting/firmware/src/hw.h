// De hardware van de doos (alleen Wire en de gewone Arduino-functies, geen andere bibliotheken).
//   PCA9685  16 PWM-uitgangen (12 bit, I2C), elk kanaal stuurt een MOSFET-module (low-side) voor één lichtgroep;
//            eigen kleine driver, wordt elke 2 s nagekeken (na een spanningsdip slaapt hij weer: dan opnieuw instellen)
//   ingangen 16 GPIO's van de ESP32-S3 achter optocouplers (zie INGANG_PINNEN onderaan)
#pragma once
#include <Arduino.h>
#include <Wire.h>

class Pca9685 {
 public:
  static constexpr uint8_t MODE1 = 0x00, MODE2 = 0x01, LED0_ON_L = 0x06, ALL_LED_ON_L = 0xFA, PRESCALE = 0xFE;
  // 25 MHz / (4096 x (5 + 1)) = 1017 Hz: boven wat het oog of een camera als flikkeren ziet, traag genoeg voor de
  // MOSFET-modules
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
    schrijf(MODE2, 0x04);  // totem-pole, niet omgekeerd
    schrijf(MODE1, 0x20);  // wakker, registers automatisch ophogen (AI), ALLCALL uit
    delayMicroseconds(600); // de oscillator heeft 500 us nodig
    return controleer();
  }

  /** wakker en de juiste frequentie? */
  bool controleer() {
    uint8_t m, p;
    return lees(MODE1, m) && lees(PRESCALE, p) && !(m & 0x10) && (m & 0x20) && p == PRESCALE_1KHZ;
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

/** de 16 ingangen, rechtstreeks op GPIO's van de ESP32-S3 (ingang 1..16 in deze volgorde). Elke ingang zit achter
 *  een optocoupler die de pin naar GND trekt = ACTIEF; in rust houdt de interne pull-up (INPUT_PULLUP) hem hoog.
 *  Niet gebruikt (bewust): 0, 3, 45, 46 (strapping), 19, 20 (USB), 35, 36, 37 (octal PSRAM van de N16R8),
 *  43, 44 (UART0), 38 (RGB-led op de DevKitC-1 v1.1; v1.0: 48), 48; 8, 9 (I2C) en 10 (OE) zijn al bezet,
 *  11 is vrij. */
constexpr uint8_t INGANG_PINNEN[16] = {1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41};

/** de RGB-led op het bord (DevKitC-1 v1.1), gebruikt als statuslampje */
constexpr uint8_t PIN_STATUS_LED = 38;

inline void ingangenBegin() {
  for (uint8_t p : INGANG_PINNEN) pinMode(p, INPUT_PULLUP);
}

/** bit i = ingang i+1 actief (pin laag) */
inline uint16_t ingangenLees() {
  uint16_t actief = 0;
  for (int i = 0; i < 16; i++)
    if (digitalRead(INGANG_PINNEN[i]) == LOW) actief |= (uint16_t)(1u << i);
  return actief;
}