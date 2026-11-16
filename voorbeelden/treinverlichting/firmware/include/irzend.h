// IR zenden in stappen (firmware 2.1.0), zonder hardware: welke IR-leds wanneer meedoen en wanneer de RMT zendt.
// De lichttaak (main.cpp) roept stap() elke 5 ms aan; de hardware zit achter IrZendHw (src: MCP23017 + RMT, in de
// tests een nep). Testen: test/test_ir.
//
//   F4  de optocoupler en de gate van -Q4 hebben tijd nodig (uit: tot ± 1 ms). Daarom: leds kiezen, 2 ticks (10 ms)
//       wachten, dan pas zenden; na het zenden weer 2 ticks wachten voor de leds uit gaan. Zo krijgt bij RC5 of raw
//       noch het begin verloren, noch de vorige led het begin mee.
//   F1  codesoort "continu": de leds van de haltes die een bus vasthouden branden zonder draaggolf (continuLeds). Een
//       gewone code gaat voor: de continu-leds gaan dan even uit (± 70 ms bij NEC) en daarna weer aan.
//   F5  een code die niet in één keer past, wordt niet verzonden: de teller nietVerzonden telt, laatsteFout zegt waarom.
#pragma once
#include <stdint.h>

#include "ir.h"

namespace trein {

struct IrZend {
  int8_t code = -1; // index; IR_ZELFTEST = de testcode van de zelftest
  uint8_t leds = 0; // bit k = IR-led k+1
};
constexpr int8_t IR_ZELFTEST = -2;
constexpr int IR_WACHT_TICKS = 2; // F4: 2 x 5 ms

struct IrZendHw {
  virtual bool kiesLeds(uint8_t leds) = 0;     // MCP23017 GPA
  virtual bool zend(const IrCode &c) = 0;      // RMT met draaggolf; false = niet gestart
  virtual bool klaar() = 0;                     // de RMT is klaar met het vorige frame
  virtual void continu(bool aan) = 0;           // RMT-pin vast hoog zonder draaggolf (F1)
  virtual ~IrZendHw() {}
};

class IrZender {
 public:
  enum Fase : uint8_t { RUST, KIEZEN, ZENDEN, NALOOP, CONTINU_KIEZEN };
  uint8_t fase = RUST;
  uint32_t nietVerzonden = 0;
  const char *laatsteFout = "";

  /** bezig met een frame? (dan niet in het flashgeheugen schrijven, F8) */
  bool bezig() const { return fase == KIEZEN || fase == ZENDEN || fase == NALOOP; }

  /** elke tick. haal(z, code): de volgende opdracht uit de rij (false = geen); continuLeds: de leds die nu continu
   *  moeten branden */
  template <class Haal>
  void stap(IrZendHw &hw, Haal &&haal, uint8_t continuLeds) {
    switch (fase) {
      case RUST: {
        IrZend z;
        if (haal(z, code_)) {
          if (continuAan_) { hw.continu(false); continuAan_ = false; }
          huidigContinu_ = 0;
          hw.kiesLeds(z.leds);
          fase = KIEZEN;
          wacht_ = IR_WACHT_TICKS;
          return;
        }
        if (continuLeds != huidigContinu_) {
          if (continuAan_) { hw.continu(false); continuAan_ = false; }
          hw.kiesLeds(continuLeds);
          huidigContinu_ = continuLeds;
          if (continuLeds) { fase = CONTINU_KIEZEN; wacht_ = IR_WACHT_TICKS; }
        }
        return;
      }
      case CONTINU_KIEZEN:
        if (--wacht_ > 0) return;
        hw.continu(true);
        continuAan_ = true;
        fase = RUST;
        return;
      case KIEZEN:
        if (--wacht_ > 0) return;
        if (!irPast(code_)) {
          fout("De code is te lang om in één keer te zenden (minder herhalingen).");
        } else if (!hw.zend(code_)) {
          fout("De RMT zond de code niet.");
        } else {
          fase = ZENDEN;
          return;
        }
        fase = NALOOP;
        wacht_ = IR_WACHT_TICKS;
        return;
      case ZENDEN:
        if (!hw.klaar()) return;
        fase = NALOOP;
        wacht_ = IR_WACHT_TICKS;
        return;
      case NALOOP:
        if (--wacht_ > 0) return;
        hw.kiesLeds(0);
        fase = RUST; // de volgende tick zet de continu-leds terug
        return;
      default:
        fase = RUST;
        return;
    }
  }

 private:
  IrCode code_;
  int wacht_ = 0;
  uint8_t huidigContinu_ = 0;
  bool continuAan_ = false;

  void fout(const char *t) {
    nietVerzonden++;
    laatsteFout = t;
  }
};

} // namespace trein
