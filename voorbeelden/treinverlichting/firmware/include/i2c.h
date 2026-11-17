// De drivers van de I2C-chips (firmware 2.2.0): PCA9685 (lichtgroepen, 0x40/0x41), PCA9685 op 50 Hz (servo's, 0x42) en
// MCP23017 (IR-leds en ingangen, 0x20/0x21). Zonder Arduino: elke driver is een template op de I2C-klasse W, met
// dezelfde functies als TwoWire (beginTransmission, write, endTransmission, requestFrom, read). Op de doos is W =
// TwoWire (src/hw.h); in de tests een nep-bus met een model van de chips (test/nep/nepwire.h, test/test_hw).
//
// Fable 5.2 (2026-11-16):
//   E6  de bus loopt op 100 kHz (± 1 m dupont over de naad): een schrijfbeurt van alle 16 kanalen duurt dan 6,5 ms,
//       langer dan de tick van 5 ms. Daarom schrijven zet() van beide PCA9685's alleen de kanalen die veranderden
//       (per reeks aaneensluitende kanalen één overdracht, 4 bytes per kanaal), en leest de MCP23017 op 0x20 alleen
//       poort B (3 bytes: INTFB, INTCAPB, GPIOB). Daarvoor staat de MCP23017 in BANK = 1 (de registers van poort A en
//       B apart, zie Mcp23017T).
//   E1  de IR-leds (GPA van 0x20) hebben dezelfde polariteit als de lichtgroepen, instelbaar (irLedActiefLaag):
//       zetA() schrijft actiefLaag ? ~leds : leds, en begin() zet eerst OLATA op "alles uit" en pas dan IODIRA.
//   E7  GPA7 en GPB7 van de MCP23017 zijn volgens het aangepaste datablad (Microchip, 2022) alleen uitgang: nooit als
//       ingang gebruikt (ze staan als uitgang, laag). Ingang 24 bestaat niet meer; op 0x21 zijn het er 14 (25-38).
//   F10 INTF en INTCAP bevriezen bij de eerste verandering op een poort tot ze gelezen zijn (elke 5 ms): een puls korter
//       dan 5 ms op een ANDERE pin van dezelfde poort in dezelfde tick wordt niet gezien (een langere wel, via GPIO).
//       Voor hallsensoren (± 17 ms bij 6 m/s) geen probleem; hang de snelste sensoren aan ingang 1..16 (GPIO's met een
//       eigen interrupt).
// Fable 5.2, tweede ronde (firmware 2.2.0):
//   FN2 begin() van beide PCA9685's zet MODE1 eerst op 0x30 (slapen MET adres ophogen, AI): anders landen de 4 bytes
//       "alle kanalen uit" alle vier in ALL_LED_ON_L en wordt ALL_LED_OFF_H nooit geschreven. Na een warme reset
//       (watchdog, update) gingen de kanalen die aan waren dan weer branden zodra OE laag ging.
//   QN1 i2cSchrijf weigert een overdracht die niet in de buffer van Wire past (128 bytes met het registeradres): Wire
//       zou ze stil afkappen en de helft schrijven. Het grootste wat de drivers schrijven is 1 + 64 bytes.
#pragma once
#include <stddef.h>
#include <stdint.h>

#include "licht.h"

namespace trein {

typedef void (*WachtUs)(uint32_t us);

constexpr uint8_t ADRES_MCP1 = 0x20, ADRES_MCP2 = 0x21, ADRES_PCA1 = 0x40, ADRES_PCA2 = 0x41, ADRES_SERVO = 0x42;

/** MODE2 van de PCA9685: OUTDRV (totem-pole); actief laag: INVRT en OUTNE = 01 (met OE hoog zijn alle uitgangen 1 = uit);
 *  actief hoog: niet omgekeerd, OUTNE = 00 (met OE hoog alle uitgangen 0 = uit) */
constexpr uint8_t pcaMode2(bool actiefLaag) { return actiefLaag ? 0x15 : 0x04; }

constexpr size_t I2C_BUFFER = 128; // de zendbuffer van Wire (ESP32 Arduino 2.x), registeradres inbegrepen

namespace detail {
template <class W>
bool i2cSchrijf(W *w, uint8_t adres, uint8_t reg, const uint8_t *data, size_t n) {
  if (n + 1 > I2C_BUFFER) return false; // QN1: niet beginnen (Wire zou afkappen)
  w->beginTransmission(adres);
  bool heel = w->write(reg) == 1 && (!n || w->write(data, n) == n);
  return w->endTransmission() == 0 && heel;
}
template <class W>
bool i2cLees(W *w, uint8_t adres, uint8_t reg, uint8_t *v, uint8_t n) {
  w->beginTransmission(adres);
  w->write(reg);
  if (w->endTransmission(false) != 0) return false;
  if (w->requestFrom(adres, n) != n) return false;
  for (uint8_t i = 0; i < n; i++) v[i] = (uint8_t)w->read();
  return true;
}
/** de reeksen aaneensluitende bits in verschil: voor elke reeks f(eerste, aantal); false zodra f faalt */
template <class F>
bool perReeks(uint16_t verschil, F f) {
  int ch = 0;
  while (ch < 16) {
    if (!(verschil >> ch & 1)) { ch++; continue; }
    int van = ch;
    while (ch < 16 && (verschil >> ch & 1)) ch++;
    if (!f(van, ch - van)) return false;
  }
  return true;
}
} // namespace detail

// ------------------------------------------------------------------------------------------- PCA9685 (licht)
/** 16 kanalen alleen volledig aan of uit (LEDn_ON_H of LEDn_OFF_H bit 4), 1017 Hz (prescale 5), wordt elke 2 s
 *  nagekeken (na een spanningsdip slaapt hij weer: dan opnieuw begin()). */
template <class W>
class Pca9685T {
 public:
  static constexpr uint8_t MODE1 = 0x00, MODE2 = 0x01, LED0_ON_L = 0x06, ALL_LED_ON_L = 0xFA, PRESCALE = 0xFE;
  static constexpr uint8_t PRESCALE_1KHZ = 5;
  static constexpr uint8_t MODE1_SLAAP_AI = 0x30; // SLEEP (bit 4) + AI (bit 5)

  /** instellen met ALLE kanalen uit; true = de chip antwoordt en staat goed */
  bool begin(W &w, uint8_t adres, WachtUs wacht = nullptr) {
    wire_ = &w;
    adres_ = adres;
    laatst_ = NOG_NIETS; // de volgende zet() schrijft alles
    if (!schrijf(MODE1, MODE1_SLAAP_AI)) return false;  // slapen (prescaler mag veranderen) met AI (FN2)
    const uint8_t allesUit[4] = {0x00, 0x00, 0x00, 0x10}; // ALL_LED_OFF_H bit 4 = volledig uit (4 registers: AI nodig)
    if (!detail::i2cSchrijf(wire_, adres_, ALL_LED_ON_L, allesUit, 4)) return false;
    schrijf(PRESCALE, PRESCALE_1KHZ);
    schrijf(MODE2, pcaMode2(UITGANG_ACTIEF_LAAG)); // totem-pole; omgekeerd bij modules die actief laag schakelen
    schrijf(MODE1, 0x20);                          // wakker, registers automatisch ophogen (AI), ALLCALL uit
    if (wacht) wacht(600);                         // de oscillator heeft 500 µs nodig
    return controleer();
  }

  /** wakker en de juiste frequentie? */
  bool controleer() {
    uint8_t m, p, m2;
    return lees(MODE1, m) && lees(PRESCALE, p) && lees(MODE2, m2) && !(m & 0x10) && (m & 0x20) && p == PRESCALE_1KHZ &&
           m2 == pcaMode2(UITGANG_ACTIEF_LAAG);
  }

  /** bit k = kanaal k volledig aan, anders volledig uit. Alleen de kanalen die veranderden (de eerste keer na begin():
   *  alle 16 in één overdracht). */
  bool zet(uint16_t aanMasker) {
    if (laatst_ != NOG_NIETS && aanMasker == (uint16_t)laatst_) return true;
    uint16_t verschil = laatst_ == NOG_NIETS ? 0xFFFF : (uint16_t)(aanMasker ^ (uint16_t)laatst_);
    bool ok = detail::perReeks(verschil, [&](int van, int n) {
      uint8_t b[64];
      for (int k = 0; k < n; k++) {
        bool aan = (aanMasker >> (van + k)) & 1;
        b[4 * k] = 0;                              // LEDn_ON_L
        b[4 * k + 1] = (uint8_t)(aan ? 0x10 : 0);  // LEDn_ON_H: bit 4 = volledig aan
        b[4 * k + 2] = 0;                          // LEDn_OFF_L
        b[4 * k + 3] = (uint8_t)(aan ? 0 : 0x10);  // LEDn_OFF_H: bit 4 = volledig uit
      }
      return detail::i2cSchrijf(wire_, adres_, (uint8_t)(LED0_ON_L + 4 * van), b, (size_t)(4 * n));
    });
    laatst_ = ok ? aanMasker : NOG_NIETS;
    return ok;
  }

  /** de 16 kanalen teruglezen (zelftest): aan = bit k als kanaal k volledig aan staat; false = de chip antwoordt niet */
  bool leesTerug(uint16_t &aan) {
    uint8_t b[64];
    aan = 0;
    for (int deel = 0; deel < 2; deel++) // 2 x 32 bytes (de buffer van Wire is 128, maar zo blijft het kort)
      if (!detail::i2cLees(wire_, adres_, (uint8_t)(LED0_ON_L + 32 * deel), b + 32 * deel, 32)) return false;
    for (int k = 0; k < 16; k++)
      if ((b[4 * k + 1] & 0x10) && !(b[4 * k + 3] & 0x10)) aan |= (uint16_t)(1u << k);
    return true;
  }
  /** wat zet() laatst schreef; false = nog niets (of de laatste keer mislukt) */
  bool laatst(uint16_t &m) const {
    m = (uint16_t)laatst_;
    return laatst_ != NOG_NIETS;
  }

 private:
  static constexpr uint32_t NOG_NIETS = 0xFFFFFFFFu; // geen geldig masker van 16 bit: alles opnieuw schrijven
  W *wire_ = nullptr;
  uint8_t adres_ = ADRES_PCA1;
  uint32_t laatst_ = NOG_NIETS;

  bool schrijf(uint8_t reg, uint8_t v) { return detail::i2cSchrijf(wire_, adres_, reg, &v, 1); }
  bool lees(uint8_t reg, uint8_t &v) { return detail::i2cLees(wire_, adres_, reg, &v, 1); }
};

// ------------------------------------------------------------------------------------------- PCA9685 (servo's)
// Tweede PCA9685 op 0x42: 50 Hz (prescale 121), niet omgekeerd, totem-pole. Per kanaal LEDn_ON = 0 en LEDn_OFF = de
// pulsbreedte in tellen (servoTellen in servo.h); 0 tellen = geen puls (volledig uit). Na het aanzetten staan alle
// kanalen uit: een servo krijgt pas een puls als de doos hem een stand geeft.
// OE van deze chip hangt aan GPIO10, samen met die van de lichtchip (zo bedraad, opbouw.mjs; Fable 5.2, F9): bij een
// reset of een fout op de lichtchip (OE hoog) krijgen ook de servo's geen puls meer (ze blijven staan waar ze zijn).
template <class W>
class PcaServoT {
 public:
  static constexpr uint8_t MODE1 = 0x00, MODE2 = 0x01, LED0_ON_L = 0x06, ALL_LED_ON_L = 0xFA, PRESCALE = 0xFE;
  static constexpr uint8_t PRESCALE_50HZ = 121;
  static constexpr uint8_t MODE1_SLAAP_AI = 0x30;

  bool begin(W &w, uint8_t adres, WachtUs wacht = nullptr) {
    wire_ = &w;
    adres_ = adres;
    vergeet();
    if (!schrijf(MODE1, MODE1_SLAAP_AI)) return false; // FN2: met AI, anders landt "alles uit" in één register
    const uint8_t allesUit[4] = {0x00, 0x00, 0x00, 0x10};
    if (!detail::i2cSchrijf(wire_, adres_, ALL_LED_ON_L, allesUit, 4)) return false;
    schrijf(PRESCALE, PRESCALE_50HZ);
    schrijf(MODE2, 0x04);
    schrijf(MODE1, 0x20);
    if (wacht) wacht(600);
    return controleer();
  }

  bool controleer() {
    uint8_t m, p;
    return detail::i2cLees(wire_, adres_, MODE1, &m, 1) && detail::i2cLees(wire_, adres_, PRESCALE, &p, 1) &&
           !(m & 0x10) && p == PRESCALE_50HZ;
  }

  /** de pulsen van de 16 kanalen (tellen, 0 = uit); alleen de kanalen die veranderden */
  bool zet(const uint16_t *tellen) {
    uint16_t verschil = 0;
    for (int i = 0; i < 16; i++)
      if (tellen[i] != laatst_[i]) verschil |= (uint16_t)(1u << i);
    if (!verschil) return true;
    bool ok = detail::perReeks(verschil, [&](int van, int n) {
      uint8_t b[64];
      for (int k = 0; k < n; k++) {
        uint16_t t = tellen[van + k] > 4095 ? 4095 : tellen[van + k];
        b[4 * k] = 0;
        b[4 * k + 1] = 0;
        b[4 * k + 2] = (uint8_t)(t & 0xFF);
        b[4 * k + 3] = (uint8_t)(t ? (t >> 8) : 0x10); // 0 = volledig uit (bit 4 van LEDn_OFF_H)
      }
      if (!detail::i2cSchrijf(wire_, adres_, (uint8_t)(LED0_ON_L + 4 * van), b, (size_t)(4 * n))) return false;
      for (int k = 0; k < n; k++) laatst_[van + k] = tellen[van + k];
      return true;
    });
    if (!ok) vergeet();
    return ok;
  }

 private:
  W *wire_ = nullptr;
  uint8_t adres_ = ADRES_SERVO;
  uint16_t laatst_[16];

  void vergeet() {
    for (int i = 0; i < 16; i++) laatst_[i] = 0xFFFF; // de volgende zet() schrijft alles
  }
  bool schrijf(uint8_t reg, uint8_t v) { return detail::i2cSchrijf(wire_, adres_, reg, &v, 1); }
};

// ------------------------------------------------------------------------------------------------ MCP23017
// Registers met IOCON.BANK = 1 (poort A op 0x00..0x0A, poort B op 0x10..0x1A), SEQOP = 0 (adres ophogen):
//   0x20  GPA0..GPA7 = UITGANG: kiest IR-led 1..8 (via de 8-kanaals MOSFET-module -Q4; polariteit: irLedActiefLaag)
//         GPB0..GPB6 = ingang 17..23 (reflexsensoren of een derde optocouplerprint; actief laag, interne pull-up)
//         GPB7 = uitgang, laag (E7)
//   0x21  (optioneel) GPA0..GPA6 = ingang 25..31, GPB0..GPB6 = ingang 32..38; GPA7 en GPB7 uitgang, laag (E7)
// Korte pulsen: interrupt-on-change op elke ingang (GPINTEN, vergelijken met de vorige waarde). De INT-pin is NIET
// aangesloten (geen vrije GPIO): de lichttaak leest elke 5 ms INTF (welke pin veranderde) en INTCAP (de waarde op dat
// moment) mee. Zie F10 bovenaan voor de grens.
// Na het aanzetten staat de chip in BANK = 0. begin() werkt in elke toestand: eerst 0x00 naar 0x05 (BANK = 1: IOCON,
// terug naar BANK = 0; BANK = 0: GPINTENB, onschuldig), dan 0x80 naar 0x0A (in BANK = 0 is dat IOCON: naar BANK = 1).
// controleer() leest IOCON op 0x05: na een spanningsdip staat daar GPINTENB (0x00) en begint de driver opnieuw.
template <class W>
class Mcp23017T {
 public:
  static constexpr uint8_t IODIRA = 0x00, GPINTENA = 0x02, INTCONA = 0x04, IOCON = 0x05, GPPUA = 0x06, INTFA = 0x07,
                           OLATA = 0x0A, POORT_B = 0x10, IOCON_BANK0 = 0x0A;
  static constexpr uint8_t IOCON_WAARDE = 0x80; // BANK = 1, MIRROR = 0, SEQOP = 0
  static constexpr uint8_t INGANG_PINNEN = 0x7F; // GPx0..GPx6 (GPx7 is alleen uitgang, E7)

  /** uitgangenA: GPA zijn de IR-leds (0x20), anders 14 ingangen (0x21). actiefLaag: polariteit van de IR-leds.
   *  true = de chip antwoordt en staat goed */
  bool begin(W &w, uint8_t adres, bool uitgangenA, bool actiefLaag = UITGANG_ACTIEF_LAAG) {
    wire_ = &w;
    adres_ = adres;
    uitA_ = uitgangenA;
    actiefLaag_ = actiefLaag;
    ok_ = false;
    if (!schrijf(IOCON, 0x00)) return false;           // BANK = 1 -> 0 (in BANK = 0: GPINTENB = 0)
    if (!schrijf(IOCON_BANK0, IOCON_WAARDE)) return false; // BANK = 0 -> 1
    // eerst de uitgangen op "uit", pas dan de richting (E1): geen led tijdens het opstarten
    schrijf(OLATA, uitgangenA ? uitWaarde() : 0x00);
    schrijf(IODIRA, uitgangenA ? 0x00 : INGANG_PINNEN);
    schrijf(POORT_B + OLATA, 0x00);
    schrijf(POORT_B + IODIRA, INGANG_PINNEN);
    schrijf(GPPUA, uitgangenA ? 0x00 : INGANG_PINNEN);
    schrijf(POORT_B + GPPUA, INGANG_PINNEN);
    schrijf(INTCONA, 0x00); // vergelijken met de vorige waarde (elke verandering)
    schrijf(POORT_B + INTCONA, 0x00);
    schrijf(GPINTENA, uitgangenA ? 0x00 : INGANG_PINNEN);
    schrijf(POORT_B + GPINTENA, INGANG_PINNEN);
    laatsteA_ = 0;
    uint8_t r[3];
    if (!uitgangenA) leesPoort(0, r);
    leesPoort(1, r); // een oude interrupt wissen
    ok_ = controleer();
    return ok_;
  }

  /** staan BANK en de richtingen nog goed? (na een spanningsdip: BANK = 0 en alles ingang: dan opnieuw begin()) */
  bool controleer() {
    uint8_t a[6], b;
    if (!detail::i2cLees(wire_, adres_, IODIRA, a, 6) || !detail::i2cLees(wire_, adres_, POORT_B + IODIRA, &b, 1))
      return false;
    return a[5] == IOCON_WAARDE && a[0] == (uitA_ ? 0x00 : INGANG_PINNEN) && b == INGANG_PINNEN;
  }

  /** de ingangen lezen (bit 0..7 = GPA, 8..15 = GPB): laag = pin laag, intf = verandering sinds de vorige lezing,
   *  cap = de pin op het moment van de eerste verandering. 0x20: alleen poort B (3 bytes). false = geen antwoord */
  bool leesIngangen(uint16_t &laag, uint16_t &intf, uint16_t &cap) {
    uint8_t a[3] = {0, 0, 0xFF}, b[3];
    if (!uitA_ && !leesPoort(0, a)) return false;
    if (!leesPoort(1, b)) return false;
    intf = (uint16_t)((a[0] | b[0] << 8) & (INGANG_PINNEN | INGANG_PINNEN << 8));
    cap = (uint16_t)(a[1] | b[1] << 8);
    laag = (uint16_t)(~(a[2] | b[2] << 8) & (INGANG_PINNEN | INGANG_PINNEN << 8));
    if (uitA_) { intf &= 0xFF00; laag &= 0xFF00; }
    return true;
  }

  /** de IR-leds (bit k = led k+1 doet mee), alleen als het verandert */
  bool zetA(uint8_t m) {
    if (m == laatsteA_) return true;
    if (!schrijf(OLATA, actiefLaag_ ? (uint8_t)~m : m)) return false;
    laatsteA_ = m;
    return true;
  }
  /** de polariteit van de IR-leds (instelling irLedActiefLaag): bij een wijziging meteen opnieuw schrijven */
  bool zetActiefLaag(bool laag) {
    if (laag == actiefLaag_) return true;
    actiefLaag_ = laag;
    return schrijf(OLATA, actiefLaag_ ? (uint8_t)~laatsteA_ : laatsteA_);
  }

  bool ok() const { return ok_; }
  void zetOk(bool o) { ok_ = o; }

 private:
  W *wire_ = nullptr;
  uint8_t adres_ = ADRES_MCP1, laatsteA_ = 0;
  bool uitA_ = true, ok_ = false, actiefLaag_ = UITGANG_ACTIEF_LAAG;

  uint8_t uitWaarde() const { return actiefLaag_ ? 0xFF : 0x00; }
  bool schrijf(uint8_t reg, uint8_t v) { return detail::i2cSchrijf(wire_, adres_, reg, &v, 1); }
  /** INTFx, INTCAPx, GPIOx van poort p (0 = A, 1 = B) in één overdracht */
  bool leesPoort(int p, uint8_t *r) { return detail::i2cLees(wire_, adres_, (uint8_t)(p * POORT_B + INTFA), r, 3); }
};

/** de actief-flanken van een MCP23017: een pin die veranderde (intf) en op dat moment actief was (laag, of hoog bij
 *  een omgekeerde ingang: omkeer = bit 1, zie ingangOmkeren in ingangen.h) */
inline uint16_t mcpActiefFlanken(uint16_t intf, uint16_t cap, uint16_t omkeer) {
  return (uint16_t)(intf & (uint16_t) ~(cap ^ omkeer));
}

} // namespace trein
