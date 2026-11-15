// De hardware van de doos (alleen Wire en de gewone Arduino-functies, geen andere bibliotheken).
//   PCA9685  16 uitgangen (I2C), elk kanaal stuurt een ingang van een kant-en-klare 8-kanaals MOSFET-module met
//            optocouplers (versie 4; low-side, één lichtgroep per kanaal). Sinds firmware 1.3.0 alleen AAN of UIT: elk
//            kanaal krijgt het "volledig aan"- of "volledig uit"-bit (LEDn_ON_H of LEDn_OFF_H bit 4), geen PWM-waarden
//            (de PCA9685 blijft omdat er te weinig vrije GPIO's zijn). Eigen kleine driver, wordt elke 2 s nagekeken
//            (na een spanningsdip slaapt hij weer: dan opnieuw instellen).
//            Meer dan 16 groepen (TREIN_GROEPEN): een tweede PCA9685 op 0x41 (A0 op 3,3 V), zelfde I2C en OE.
//   ingangen 16 GPIO's van de ESP32-S3 achter 2 optocouplerprints PC817 (zie INGANG_PINNEN onderaan), elk met een
//            GPIO-interrupt op de actief-flank: die zet alleen een vlag (flankMasker), de lichttaak haalt de vlaggen
//            elke 5 ms atomair op (ingangenFlanken). Zo wordt een korte puls van een hallsensor nooit gemist.
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
  // 25 MHz / (4096 x (5 + 1)) = 1017 Hz. Sinds 1.3.0 alleen volledig aan of uit (geen PWM meer op de uitgangen);
  // de prescaler blijft vast ingesteld zodat controleer() kan zien of de chip na een spanningsdip opnieuw begon.
  static constexpr uint8_t PRESCALE_1KHZ = 5;

  /** instellen met ALLE kanalen uit; true = de chip antwoordt en staat goed */
  bool begin(TwoWire &w, uint8_t adres) {
    wire_ = &w;
    adres_ = adres;
    laatst_ = NOG_NIETS;                                // de volgende zet() schrijft alles
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

  /** alle 16 kanalen in één keer: bit k = kanaal k volledig aan, anders volledig uit; alleen als er iets veranderd is */
  bool zet(uint16_t aanMasker) {
    if (aanMasker == laatst_) return true;
    wire_->beginTransmission(adres_);
    wire_->write(LED0_ON_L);
    for (int ch = 0; ch < 16; ch++) {
      bool aan = (aanMasker >> ch) & 1;
      wire_->write((uint8_t)0);                    // LEDn_ON_L
      wire_->write((uint8_t)(aan ? 0x10 : 0x00));  // LEDn_ON_H: bit 4 = volledig aan
      wire_->write((uint8_t)0);                    // LEDn_OFF_L
      wire_->write((uint8_t)(aan ? 0x00 : 0x10));  // LEDn_OFF_H: bit 4 = volledig uit
    }
    if (wire_->endTransmission() != 0) {
      laatst_ = NOG_NIETS;
      return false;
    }
    laatst_ = aanMasker;
    return true;
  }

 private:
  static constexpr uint32_t NOG_NIETS = 0xFFFFFFFFu; // geen geldig masker van 16 bit: alles opnieuw schrijven
  TwoWire *wire_ = nullptr;
  uint8_t adres_ = 0x40;
  uint32_t laatst_ = NOG_NIETS;

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

// Korte pulsen (hallsensor): per ingang een GPIO-interrupt op de actief-flank (FALLING; actief hoog: RISING). De ISR
// staat in IRAM en doet alleen één OF-bewerking in een kritieke sectie: de vlag "er was een flank" van die ingang.
// De lichttaak haalt alle vlaggen elke 5 ms in één keer op en zet ze op 0 (ingangenFlanken, ook in een kritieke
// sectie: de ISR kan op de andere kern lopen). Tellen en vasthouden gebeuren in ingangen.h (getest op de pc).
// Tijdens het schrijven in het flashgeheugen (bewaren, update) wacht de interrupt tot het schrijven klaar is, maar de
// flank blijft in de GPIO-hardware staan: hij gaat niet verloren.
static portMUX_TYPE flankSlot = portMUX_INITIALIZER_UNLOCKED;
static volatile uint16_t flankMasker = 0;

static void IRAM_ATTR ingangFlank(void *arg) {
  const uint16_t bit = (uint16_t)(uintptr_t)arg;
  portENTER_CRITICAL_ISR(&flankSlot);
  flankMasker |= bit;
  portEXIT_CRITICAL_ISR(&flankSlot);
}

/** bit i = sinds de vorige oproep was er minstens één actief-flank op ingang i+1; zet de vlaggen weer op 0
 *  (met -DTREIN_PNP_KEERT_OM: elke flank, want een pnp-ingang is dan actief hoog) */
inline uint16_t ingangenFlanken() {
  portENTER_CRITICAL(&flankSlot);
  uint16_t f = flankMasker;
  flankMasker = 0;
  portEXIT_CRITICAL(&flankSlot);
  return f;
}

inline void ingangenBegin() {
  for (int i = 0; i < 16; i++) {
    const uint8_t p = INGANG_PINNEN[i];
    pinMode(p, INGANG_ACTIEF_LAAG ? INPUT_PULLUP : INPUT_PULLDOWN);
#ifdef TREIN_PNP_KEERT_OM
    attachInterruptArg(digitalPinToInterrupt(p), ingangFlank, (void *)(uintptr_t)(1u << i), CHANGE);
#else
    attachInterruptArg(digitalPinToInterrupt(p), ingangFlank, (void *)(uintptr_t)(1u << i),
                       INGANG_ACTIEF_LAAG ? FALLING : RISING);
#endif
  }
}

/** bit i = ingang i+1 actief (pin laag, of hoog met TREIN_INGANG_ACTIEF_HOOG) */
inline uint16_t ingangenLees() {
  uint16_t actief = 0;
  const int actiefNiveau = INGANG_ACTIEF_LAAG ? LOW : HIGH;
  for (int i = 0; i < 16; i++)
    if (digitalRead(INGANG_PINNEN[i]) == actiefNiveau) actief |= (uint16_t)(1u << i);
  return actief;
}
// =============================================================================================== firmware 2.0.0
// MCP23017 (I2C, 16 GPIO's). Registers met BANK = 0 (standaard na het aanzetten), adres automatisch ophogen (SEQOP = 0).
//   0x20  GPA0..GPA7 = UITGANG: schakelt IR-led 1..8 (via een 8-kanaals MOSFET-module; hoog = de led doet mee)
//         GPB0..GPB7 = ingang 17..24 (een derde optocouplerprint; actief laag, interne pull-up)
//   0x21  (optioneel) GPA0..GPA7 = ingang 25..32, GPB0..GPB7 = ingang 33..40 (2 optocouplerprints PC817)
// Korte pulsen: interrupt-on-change op elke ingang (GPINTEN, vergelijken met de vorige waarde). De INT-pin is NIET
// aangesloten (geen vrije GPIO): de lichttaak leest elke 5 ms INTF (welke pin veranderde sinds de vorige lezing) en
// INTCAP (de waarde op dat moment) mee. INTF met INTCAP laag = er was een actief-flank, ook als de puls al voorbij is.
class Mcp23017 {
 public:
  static constexpr uint8_t IODIRA = 0x00, IODIRB = 0x01, GPINTENA = 0x04, INTCONA = 0x08, IOCON = 0x0A, GPPUA = 0x0C,
                           INTFA = 0x0E, GPIOA = 0x12, OLATA = 0x14;

  /** uitgangenA: GPA zijn uitgangen (0x20, IR-leds), anders 16 ingangen (0x21). true = de chip antwoordt */
  bool begin(TwoWire &w, uint8_t adres, bool uitgangenA) {
    wire_ = &w;
    adres_ = adres;
    uitA_ = uitgangenA;
    ok_ = false;
    if (!schrijf(IOCON, 0x00)) return false;
    if (uitgangenA) {
      schrijf(OLATA, 0x00);                         // eerst laag, dan pas uitgang: geen led tijdens het opstarten
      const uint8_t dir[2] = {0x00, 0xFF};
      schrijf2(IODIRA, dir);
    } else {
      const uint8_t dir[2] = {0xFF, 0xFF};
      schrijf2(IODIRA, dir);
    }
    const uint8_t pu[2] = {(uint8_t)(uitgangenA ? 0x00 : 0xFF), 0xFF};
    schrijf2(GPPUA, pu);
    const uint8_t con[2] = {0x00, 0x00};              // vergelijken met de vorige waarde (elke verandering)
    schrijf2(INTCONA, con);
    const uint8_t en[2] = {(uint8_t)(uitgangenA ? 0x00 : 0xFF), 0xFF};
    schrijf2(GPINTENA, en);
    laatsteA_ = 0;
    ok_ = controleer();
    return ok_;
  }

  /** staan de richtingen nog goed? (na een spanningsdip staat IODIR weer op 0xFF: dan opnieuw begin()) */
  bool controleer() {
    uint8_t d[2];
    if (!lees(IODIRA, d, 2)) return false;
    return d[0] == (uitA_ ? 0x00 : 0xFF) && d[1] == 0xFF;
  }

  /** de ingangen lezen: actief = bit k laag op de pin (16 bits, GPA = bit 0..7, GPB = bit 8..15), flanken = INTF
   *  met INTCAP laag (een actief-flank sinds de vorige lezing). false = de chip antwoordt niet */
  bool leesIngangen(uint16_t &laag, uint16_t &flanken) {
    uint8_t r[6]; // INTFA, INTFB, INTCAPA, INTCAPB, GPIOA, GPIOB
    if (!lees(INTFA, r, 6)) return false;
    uint16_t intf = (uint16_t)(r[0] | r[1] << 8), cap = (uint16_t)(r[2] | r[3] << 8), gpio = (uint16_t)(r[4] | r[5] << 8);
#ifdef TREIN_PNP_KEERT_OM
    flanken = intf; // een pnp-ingang kan ook actief hoog zijn: elke verandering telt als flank
#else
    flanken = intf & (uint16_t)~cap;
#endif
    laag = (uint16_t)~gpio;
    return true;
  }

  /** de uitgangen GPA (alleen als het verandert) */
  bool zetA(uint8_t m) {
    if (m == laatsteA_) return true;
    if (!schrijf(OLATA, m)) return false;
    laatsteA_ = m;
    return true;
  }

  bool ok() const { return ok_; }
  void zetOk(bool o) { ok_ = o; }

 private:
  TwoWire *wire_ = nullptr;
  uint8_t adres_ = 0x20, laatsteA_ = 0;
  bool uitA_ = true, ok_ = false;

  bool schrijf(uint8_t reg, uint8_t v) {
    wire_->beginTransmission(adres_);
    wire_->write(reg);
    wire_->write(v);
    return wire_->endTransmission() == 0;
  }
  bool schrijf2(uint8_t reg, const uint8_t *v) {
    wire_->beginTransmission(adres_);
    wire_->write(reg);
    wire_->write(v, 2);
    return wire_->endTransmission() == 0;
  }
  bool lees(uint8_t reg, uint8_t *v, uint8_t n) {
    wire_->beginTransmission(adres_);
    wire_->write(reg);
    if (wire_->endTransmission(false) != 0) return false;
    if (wire_->requestFrom(adres_, n) != n) return false;
    for (uint8_t i = 0; i < n; i++) v[i] = (uint8_t)wire_->read();
    return true;
  }
};

// Tweede PCA9685 op 0x42 voor de servo's: 50 Hz (prescale 121), niet omgekeerd, totem-pole. Per kanaal LEDn_ON = 0 en
// LEDn_OFF = de pulsbreedte in tellen (servoTellen in include/servo.h); 0 tellen = geen puls (volledig uit).
// Na het aanzetten staan alle kanalen volledig uit: een servo krijgt pas een puls als de doos hem een stand geeft.
// OE van deze chip aan GND (de servo's horen niet uit te vallen als de lichtchip een fout heeft).
class PcaServo {
 public:
  static constexpr uint8_t MODE1 = 0x00, MODE2 = 0x01, LED0_ON_L = 0x06, ALL_LED_ON_L = 0xFA, PRESCALE = 0xFE;
  static constexpr uint8_t PRESCALE_50HZ = 121;

  bool begin(TwoWire &w, uint8_t adres) {
    wire_ = &w;
    adres_ = adres;
    for (int i = 0; i < 16; i++) laatst_[i] = 0xFFFF;
    if (!schrijf(MODE1, 0x10)) return false;
    const uint8_t allesUit[4] = {0x00, 0x00, 0x00, 0x10};
    wire_->beginTransmission(adres_);
    wire_->write(ALL_LED_ON_L);
    wire_->write(allesUit, 4);
    if (wire_->endTransmission() != 0) return false;
    schrijf(PRESCALE, PRESCALE_50HZ);
    schrijf(MODE2, 0x04);
    schrijf(MODE1, 0x20);
    delayMicroseconds(600);
    return controleer();
  }

  bool controleer() {
    uint8_t m, p;
    return lees(MODE1, m) && lees(PRESCALE, p) && !(m & 0x10) && p == PRESCALE_50HZ;
  }

  /** de pulsen van de 16 kanalen (tellen, 0 = uit); alleen als er iets veranderde */
  bool zet(const uint16_t *tellen) {
    bool anders = false;
    for (int i = 0; i < 16; i++) anders |= tellen[i] != laatst_[i];
    if (!anders) return true;
    wire_->beginTransmission(adres_);
    wire_->write(LED0_ON_L);
    for (int ch = 0; ch < 16; ch++) {
      uint16_t t = tellen[ch] > 4095 ? 4095 : tellen[ch];
      wire_->write((uint8_t)0);
      wire_->write((uint8_t)0);
      wire_->write((uint8_t)(t & 0xFF));
      wire_->write((uint8_t)(t ? (t >> 8) : 0x10)); // 0 = volledig uit (bit 4 van LEDn_OFF_H)
    }
    if (wire_->endTransmission() != 0) {
      for (int i = 0; i < 16; i++) laatst_[i] = 0xFFFF;
      return false;
    }
    for (int i = 0; i < 16; i++) laatst_[i] = tellen[i];
    return true;
  }

 private:
  TwoWire *wire_ = nullptr;
  uint8_t adres_ = 0x42;
  uint16_t laatst_[16];

  bool schrijf(uint8_t reg, uint8_t v) {
    wire_->beginTransmission(adres_);
    wire_->write(reg);
    wire_->write(v);
    return wire_->endTransmission() == 0;
  }
  bool lees(uint8_t reg, uint8_t &v) {
    wire_->beginTransmission(adres_);
    wire_->write(reg);
    if (wire_->endTransmission(false) != 0) return false;
    if (wire_->requestFrom(adres_, (uint8_t)1) != 1) return false;
    v = (uint8_t)wire_->read();
    return true;
  }
};
