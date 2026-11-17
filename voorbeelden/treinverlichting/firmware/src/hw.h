// De hardware van de doos (alleen Wire en de gewone Arduino-functies, geen andere bibliotheken).
// Sinds firmware 2.1.0 zitten de drivers van de I2C-chips in include/i2c.h (getest op de pc tegen een nep-bus, Fable 5.2
// Q1); hier staan alleen nog de GPIO-ingangen, het statuslampje en het herstel van een hangende I2C-bus.
//   PCA9685  16 uitgangen (I2C 0x40, en 0x41 bij 32 groepen), elk kanaal stuurt een ingang van een 8-kanaals
//            MOSFET-module met optocouplers (-Q1/-Q2). Alleen AAN of UIT. Wordt elke 2 s nagekeken.
//   ingangen 16 GPIO's van de ESP32-S3 achter 2 optocouplerprints PC817 (zie INGANG_PINNEN onderaan), elk met een
//            GPIO-interrupt op ELKE flank (sinds 2.1.0: de printsoort kan een ingang omkeren, E3): die zet alleen een
//            vlag (flankMasker), de lichttaak haalt de vlaggen elke 5 ms atomair op (ingangenFlanken). Zo wordt een
//            korte puls van een hallsensor nooit gemist.
//
// Polariteit (na te meten op TRN-20):
//   uitgangen  standaard ACTIEF LAAG (UITGANG_ACTIEF_LAAG in include/licht.h; -DTREIN_UITGANG_ACTIEF_HOOG voor modules
//              met de led tussen IN en GND). Dezelfde polariteit geldt voor de IR-leds (-Q4), daar ook als instelling
//              irLedActiefLaag (E1).
//   ingangen   de optocoupler trekt OUT naar GND als hij geleidt; INPUT_PULLUP. Wat "geleiden" betekent (actief of rust)
//              hangt van de print af: printSoort (E3, include/ingangen.h). Een print die zelf actief hoog uitgeeft:
//              -DTREIN_INGANG_ACTIEF_HOOG (INPUT_PULLDOWN).
// Na het inschakelen (E5, Fable 5.2): de PCA9685 begint met MODE2 = 0x04 (niet omgekeerd, OUTNE = 00): met OE hoog zijn
// zijn uitgangen LAAG. Bij actief-lage modules is dat "aan": vanaf het inschakelen tot pcaBegin() MODE2 schrijft (± 1 s),
// en blijvend als de ESP niet start, branden alle groepen. De pull-up van OE (-R1) helpt daar niet tegen; alleen na een
// warme reset (de PCA9685 blijft ingesteld) houdt OE hoog alles uit. Meten op TRN-20 (ESP uit de adapter, 12 V aan:
// brandt het bordje?); zo ja: modules die op hoog schakelen, of het zo laten (het staat in de README).
#pragma once
#include <Arduino.h>
#include <Wire.h>

#include "i2c.h"

#ifdef TREIN_INGANG_ACTIEF_HOOG
constexpr bool INGANG_ACTIEF_LAAG = false;
#else
constexpr bool INGANG_ACTIEF_LAAG = true;
#endif

typedef trein::Pca9685T<TwoWire> Pca9685;
typedef trein::PcaServoT<TwoWire> PcaServo;
typedef trein::Mcp23017T<TwoWire> Mcp23017;

/** de 16 ingangen, rechtstreeks op GPIO's van de ESP32-S3 (ingang 1..16 in deze volgorde), via de schroefklemmen van
 *  de klemmenadapter op OUT1..OUT8 van de 2 optocouplerprints. De optocoupler trekt de pin naar GND als hij geleidt;
 *  in rust houdt de interne pull-up (INPUT_PULLUP) hem hoog (TREIN_INGANG_ACTIEF_HOOG: andersom, INPUT_PULLDOWN).
 *  Niet gebruikt (bewust): 0, 3, 45, 46 (strapping), 19, 20 (USB), 35, 36, 37 (octal PSRAM van de N16R8),
 *  43, 44 (UART0), 38 (RGB-led op de DevKitC-1 v1.1; v1.0: 48); 8, 9 (I2C) en 10 (OE) zijn al bezet.
 *  In gebruik sinds 2.0.0: 11, 39, 42 (IR-ontvangers), 47 (IR zenden), 48 (leerontvanger, alleen op v1.1). */
constexpr uint8_t INGANG_PINNEN[16] = {1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41};

/** de RGB-led op het bord (DevKitC-1 v1.1), gebruikt als statuslampje */
constexpr uint8_t PIN_STATUS_LED = 38;

// Korte pulsen (hallsensor): per ingang een GPIO-interrupt op elke flank. De ISR staat in IRAM en doet alleen één
// OF-bewerking in een kritieke sectie: de vlag "er was een flank" van die ingang. De lichttaak haalt alle vlaggen elke
// 5 ms in één keer op en zet ze op 0 (ingangenFlanken, ook in een kritieke sectie: de ISR kan op de andere kern lopen).
// Tellen en vasthouden gebeuren in ingangen.h (getest op de pc): een flank telt daar als puls; het einde van een puls
// die al gezien was, telt niet opnieuw (de vorige lezing zag hem al).
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

/** bit i = sinds de vorige oproep was er minstens één flank op ingang i+1; zet de vlaggen weer op 0 */
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
    attachInterruptArg(digitalPinToInterrupt(p), ingangFlank, (void *)(uintptr_t)(1u << i), CHANGE);
  }
}

/** bit i = de optocoupler van ingang i+1 geleidt (pin laag; of hoog met TREIN_INGANG_ACTIEF_HOOG). Of dat "actief" is,
 *  beslist de Baan (printSoort, E3). */
inline uint16_t ingangenLees() {
  uint16_t actief = 0;
  const int actiefNiveau = INGANG_ACTIEF_LAAG ? LOW : HIGH;
  for (int i = 0; i < 16; i++)
    if (digitalRead(INGANG_PINNEN[i]) == actiefNiveau) actief |= (uint16_t)(1u << i);
  return actief;
}

/** F11 (Fable 5.2): een slave die de bus vasthoudt (SDA laag midden in een byte, bv. na een stoorpuls) loslaten:
 *  Wire stoppen, 9 klokpulsen op SCL (de slave schuift zijn byte uit en laat SDA los), een STOP-conditie, en Wire
 *  opnieuw beginnen. Daarna stelt de lichttaak de chips opnieuw in.
 *  FN4 (2.2.0): eerst kijken of SCL zelf laag blijft (kortsluiting, of een chip die de klok vasthoudt): dan helpen
 *  pulsen niet en geeft de functie false (melding "I2C-bus kortgesloten"). De STOP netjes: SCL laag, SDA laag, SCL
 *  hoog, SDA hoog (2.1.0 trok SDA laag terwijl SCL hoog was: eerst een START, dan pas de STOP). */
inline bool i2cHerstel(TwoWire &w, int sda, int scl, uint32_t hz) {
  w.end();
  pinMode(sda, INPUT_PULLUP);
  pinMode(scl, INPUT_PULLUP);
  delayMicroseconds(10);
  bool sclVrij = digitalRead(scl) == HIGH;
  if (sclVrij) {
    digitalWrite(scl, HIGH);
    pinMode(scl, OUTPUT_OPEN_DRAIN);
    for (int i = 0; i < 9; i++) {
      digitalWrite(scl, LOW);
      delayMicroseconds(5);
      digitalWrite(scl, HIGH);
      delayMicroseconds(5);
    }
    digitalWrite(scl, LOW); // STOP: SCL laag, SDA laag, SCL hoog, SDA hoog
    delayMicroseconds(5);
    digitalWrite(sda, LOW);
    pinMode(sda, OUTPUT_OPEN_DRAIN);
    delayMicroseconds(5);
    digitalWrite(scl, HIGH);
    delayMicroseconds(5);
    digitalWrite(sda, HIGH);
    delayMicroseconds(5);
    pinMode(scl, INPUT_PULLUP);
    delayMicroseconds(10);
    sclVrij = digitalRead(scl) == HIGH; // na het loslaten: nog altijd laag = kortgesloten
  }
  w.begin(sda, scl, hz);
  w.setTimeOut(10);
  return sclVrij;
}
