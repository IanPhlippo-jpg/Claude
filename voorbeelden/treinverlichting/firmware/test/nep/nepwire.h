// Een nep-I2C-bus voor de tests (firmware 2.1.0, Fable 5.2 Q1; 2.2.0: QN1): dezelfde functies als TwoWire van Arduino, met per
// adres een model van een chip. Elke overdracht komt in een logboek (adres, register, bytes), zodat een test kan
// nakijken wat de drivers in include/i2c.h op de bus zetten en in welke volgorde.
// Modellen: NepChip (een registerbestand met adres ophogen: PCA9685) en NepMcp (MCP23017 met BANK 0/1, IODIR, OLAT,
// GPIO-pinnen, GPINTEN, en INTF/INTCAP die bevriezen bij de eerste verandering tot ze gelezen zijn, zoals Fable 5.2 F10
// het datablad leest; een MODEL, geen meting).
// Geen test: deze map heet niet test_*, PlatformIO bouwt ze niet apart. Gebruik: #include "../nep/nepwire.h".
// Firmware 2.2.0 (Fable 5.2, tweede ronde, QN1): strenger.
//   - NepChip (PCA9685) hoogt het registeradres alleen op als AI (bit 5 van MODE1, register 0) gezet is, zoals de
//     echte chip; ALL_LED_ON_L..ALL_LED_OFF_H (0xFA..0xFD) schrijven zet dat byte in alle 16 kanalen (datablad 7.3.4).
//   - NACK halverwege: nackNa = het aantal databytes dat de chip nog aanneemt; daarna NACK (endTransmission geeft 3) en
//     de rest wordt niet geschreven. Eén keer: daarna weer -1.
//   - NepWire heeft de zendbuffer van Wire (128 bytes met het registeradres): write() neemt er niet meer aan (geeft
//     minder terug dan gevraagd) en endTransmission() zendt wat erin zit, zoals TwoWire van ESP32 Arduino 2.x.
#pragma once
#include <stddef.h>
#include <stdint.h>

#include <deque>
#include <vector>

struct NepChip {
  uint8_t reg[256] = {0};
  uint8_t wijzer = 0;
  int nackNa = -1; // QN1: NACK na zoveel databytes in de volgende schrijfbeurt (-1 = nooit)
  virtual void schrijf(uint8_t r, uint8_t v) {
    reg[r] = v;
    if (r >= 0xFA && r <= 0xFD) // ALL_LED_*: in alle kanalen
      for (int k = 0; k < 16; k++) reg[0x06 + 4 * k + (r - 0xFA)] = v;
  }
  virtual uint8_t lees(uint8_t r) { return reg[r]; }
  /** PCA9685: alleen ophogen met AI (MODE1 bit 5); zonder AI blijft de wijzer op hetzelfde register */
  virtual uint8_t volgende(uint8_t r) { return (reg[0] & 0x20) ? (uint8_t)(r + 1) : r; }
  virtual ~NepChip() {}
};

struct Overdracht {
  uint8_t adres = 0;
  bool lezen = false;
  uint8_t reg = 0;            // het register waar de overdracht begon
  std::vector<uint8_t> data;  // geschreven of gelezen bytes (zonder het registeradres)
};

class NepWire {
 public:
  NepChip *chip[128] = {nullptr};
  std::vector<Overdracht> log;

  void koppel(uint8_t adres, NepChip *c) { chip[adres & 0x7F] = c; }

  void beginTransmission(uint8_t adres) {
    adres_ = adres;
    buf_.clear();
  }
  static constexpr size_t BUFFER = 128; // zoals I2C_BUFFER_LENGTH van ESP32 Arduino 2.x

  size_t write(uint8_t b) {
    if (buf_.size() >= BUFFER) return 0; // vol: Wire neemt niets meer aan
    buf_.push_back(b);
    return 1;
  }
  size_t write(const uint8_t *b, size_t n) {
    for (size_t i = 0; i < n; i++)
      if (!write(b[i])) return i;
    return n;
  }
  uint8_t endTransmission(bool stop = true) {
    (void)stop;
    NepChip *c = chip[adres_ & 0x7F];
    if (!c) return 2; // NACK op het adres
    if (buf_.empty()) return 0;
    c->wijzer = buf_[0];
    uint8_t r = 0;
    if (buf_.size() > 1) {
      Overdracht o;
      o.adres = adres_;
      o.reg = buf_[0];
      for (size_t i = 1; i < buf_.size(); i++) {
        if (c->nackNa >= 0 && (int)(i - 1) >= c->nackNa) { r = 3; break; } // NACK op een databyte
        c->schrijf(c->wijzer, buf_[i]);
        o.data.push_back(buf_[i]);
        c->wijzer = c->volgende(c->wijzer);
      }
      c->nackNa = -1;
      log.push_back(o);
    }
    return r;
  }
  uint8_t requestFrom(uint8_t adres, uint8_t n) {
    NepChip *c = chip[adres & 0x7F];
    rx_.clear();
    if (!c) return 0;
    Overdracht o;
    o.adres = adres;
    o.lezen = true;
    o.reg = c->wijzer;
    for (uint8_t i = 0; i < n; i++) {
      uint8_t v = c->lees(c->wijzer);
      rx_.push_back(v);
      o.data.push_back(v);
      c->wijzer = c->volgende(c->wijzer);
    }
    log.push_back(o);
    return n;
  }
  int read() {
    if (rx_.empty()) return -1;
    int v = rx_.front();
    rx_.pop_front();
    return v;
  }

  /** bytes op de bus sinds logboekplaats van (adres + register + data, plus het leesadres bij lezen) */
  size_t bytesSinds(size_t van) const {
    size_t n = 0;
    for (size_t i = van; i < log.size(); i++) n += 2 + log[i].data.size() + (log[i].lezen ? 1 : 0);
    return n;
  }

 private:
  uint8_t adres_ = 0;
  std::vector<uint8_t> buf_;
  std::deque<uint8_t> rx_;
};

/** MCP23017: logische registers met het adres van BANK = 0 (A even, B oneven) */
struct NepMcp : NepChip {
  enum { IODIR = 0x00, IPOL = 0x02, GPINTEN = 0x04, DEFVAL = 0x06, INTCON = 0x08, IOCON = 0x0A, GPPU = 0x0C,
         INTF = 0x0E, INTCAP = 0x10, GPIO = 0x12, OLAT = 0x14 };
  uint8_t r[0x16] = {0};
  uint8_t pin[2] = {0xFF, 0xFF};     // het niveau op de pinnen (ingangen), 1 = hoog
  uint8_t olatBijUitgang[2] = {0, 0}; // OLAT op het moment dat IODIR een pin uitgang maakte (E1)
  bool uitgangGezet[2] = {false, false};
  NepMcp() { reset(); }
  void reset() { // spanningsdip of inschakelen
    for (auto &x : r) x = 0;
    r[IODIR] = r[IODIR + 1] = 0xFF;
    uitgangGezet[0] = uitgangGezet[1] = false;
  }
  bool bank1() const { return r[IOCON] & 0x80; }
  /** fysiek adres -> logisch register (-1 = bestaat niet) */
  int logisch(uint8_t a) const {
    if (!bank1()) return a < 0x16 ? a : -1;
    if (a <= 0x0A) return a * 2;
    if (a >= 0x10 && a <= 0x1A) return (a - 0x10) * 2 + 1;
    return -1;
  }
  void schrijf(uint8_t a, uint8_t v) override {
    int l = logisch(a);
    if (l < 0) return;
    if (l == IOCON || l == IOCON + 1) { r[IOCON] = r[IOCON + 1] = v; return; }
    if (l == INTF || l == INTF + 1 || l == INTCAP || l == INTCAP + 1) return; // alleen lezen
    if (l == GPIO || l == GPIO + 1) l += 2;                                   // GPIO schrijven = OLAT
    if (l == IODIR || l == IODIR + 1) {
      int p = l & 1;
      if ((r[l] & ~v) && !uitgangGezet[p]) { olatBijUitgang[p] = r[OLAT + p]; uitgangGezet[p] = true; }
    }
    r[l] = v;
  }
  uint8_t lees(uint8_t a) override {
    int l = logisch(a);
    if (l < 0) return 0;
    if (l == GPIO || l == GPIO + 1) {
      int p = l & 1;
      r[INTF + p] = 0; // GPIO lezen wist de interrupt
      return (uint8_t)((pin[p] & r[IODIR + p]) | (r[OLAT + p] & ~r[IODIR + p]));
    }
    if (l == INTCAP || l == INTCAP + 1) {
      uint8_t v = r[l];
      r[INTF + (l & 1)] = 0;
      return v;
    }
    return r[l];
  }
  uint8_t volgende(uint8_t a) override {
    if (bank1()) return a == 0x0A ? 0x10 : (a == 0x1A ? 0x00 : (uint8_t)(a + 1));
    return a >= 0x15 ? 0 : (uint8_t)(a + 1);
  }
  /** een pin van poort p (0 = A, 1 = B) verandert: interrupt-on-change met bevriezen (F10) */
  void zetPin(int p, int bit, bool hoog) {
    uint8_t oud = pin[p];
    if (hoog) pin[p] |= (uint8_t)(1u << bit);
    else pin[p] &= (uint8_t) ~(1u << bit);
    if (oud == pin[p] || !(r[GPINTEN + p] >> bit & 1) || !(r[IODIR + p] >> bit & 1)) return;
    if (r[INTF + p]) return; // bevroren tot INTCAP of GPIO gelezen wordt
    r[INTF + p] = (uint8_t)(1u << bit);
    r[INTCAP + p] = pin[p];
  }
  uint8_t olat(int p) const { return r[OLAT + p]; }
  uint8_t iodir(int p) const { return r[IODIR + p]; }
  uint8_t gppu(int p) const { return r[GPPU + p]; }
  uint8_t gpinten(int p) const { return r[GPINTEN + p]; }
};
