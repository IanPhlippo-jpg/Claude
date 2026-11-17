// Tests van de I2C-drivers (include/i2c.h) tegen een nep-bus met modellen van de chips (test/nep/nepwire.h):
//   python -m platformio test -e native -f test_hw
// PCA9685: alleen gewijzigde kanalen (E6), teruglezen (Q1); servo-PCA9685; MCP23017: polariteit van de IR-leds (E1),
// GPA7/GPB7 nooit ingang (E7), BANK = 1 en alleen poort B lezen (E6), een spanningsdip, twee pinnen in één tick (F10).
// Het zijn modellen: wat de echte chips doen, wordt pas op TRN-20 gemeten.
#include <unity.h>

#include "../nep/nepwire.h"
#include "i2c.h"
#include "ingangen.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {
typedef Pca9685T<NepWire> Pca;
typedef PcaServoT<NepWire> Servo;
typedef Mcp23017T<NepWire> Mcp;

/** het model van de 8-kanaals MOSFET-module -Q4: welke kanalen geleiden bij deze OLATA? */
uint8_t q4Geleidt(uint8_t olat, bool moduleActiefLaag) { return moduleActiefLaag ? (uint8_t)~olat : olat; }
} // namespace

void test_pca_alleen_gewijzigde_kanalen() {
  NepWire w;
  NepChip chip;
  w.koppel(0x40, &chip);
  Pca p;
  TEST_ASSERT_TRUE(p.begin(w, 0x40));
  TEST_ASSERT_EQUAL_HEX8(pcaMode2(UITGANG_ACTIEF_LAAG), chip.reg[Pca::MODE2]);
  size_t van = w.log.size();
  TEST_ASSERT_TRUE(p.zet(0)); // de eerste keer: alle 16 in één overdracht
  TEST_ASSERT_EQUAL(1, (int)(w.log.size() - van));
  TEST_ASSERT_EQUAL(64, (int)w.log.back().data.size());
  van = w.log.size();
  TEST_ASSERT_TRUE(p.zet(0)); // niets veranderd: niets op de bus
  TEST_ASSERT_EQUAL(0, (int)(w.log.size() - van));
  TEST_ASSERT_TRUE(p.zet(1u << 5)); // één kanaal: 4 bytes vanaf LED5_ON_L
  TEST_ASSERT_EQUAL(1, (int)(w.log.size() - van));
  TEST_ASSERT_EQUAL_HEX8(0x06 + 4 * 5, w.log.back().reg);
  TEST_ASSERT_EQUAL(4, (int)w.log.back().data.size());
  TEST_ASSERT_EQUAL_HEX8(0x10, chip.reg[0x06 + 4 * 5 + 1]); // ON_H bit 4 = volledig aan
  TEST_ASSERT_EQUAL_HEX8(0x00, chip.reg[0x06 + 4 * 5 + 3]);
  // bij 100 kHz (± 9 bits per byte): één kanaal = 6 bytes = ± 0,5 ms, ver onder de tick van 5 ms
  TEST_ASSERT_TRUE(w.bytesSinds(van) * 9 * 10 < 5000);
  van = w.log.size();
  TEST_ASSERT_TRUE(p.zet((1u << 5) | (1u << 6) | (1u << 7) | (1u << 12))); // 6, 7 aan erbij en 12: 2 reeksen
  TEST_ASSERT_EQUAL(2, (int)(w.log.size() - van));
  TEST_ASSERT_EQUAL_HEX8(0x06 + 4 * 6, w.log[van].reg);
  TEST_ASSERT_EQUAL(8, (int)w.log[van].data.size());
  TEST_ASSERT_EQUAL_HEX8(0x06 + 4 * 12, w.log[van + 1].reg);
  // teruglezen (zelftest)
  uint16_t terug = 0;
  TEST_ASSERT_TRUE(p.leesTerug(terug));
  TEST_ASSERT_EQUAL_HEX16((1u << 5) | (1u << 6) | (1u << 7) | (1u << 12), terug);
  // een mislukte overdracht: de volgende keer weer alles
  w.koppel(0x40, nullptr);
  TEST_ASSERT_FALSE(p.zet(0));
  w.koppel(0x40, &chip);
  van = w.log.size();
  TEST_ASSERT_TRUE(p.zet(0));
  TEST_ASSERT_EQUAL(64, (int)w.log[van].data.size());
  TEST_ASSERT_TRUE(p.controleer());
  chip.reg[Pca::MODE1] = 0x11; // spanningsdip: slaapt weer
  TEST_ASSERT_FALSE(p.controleer());
}

void test_servo_pca_alleen_gewijzigde_kanalen() {
  NepWire w;
  NepChip chip;
  w.koppel(0x42, &chip);
  Servo s;
  TEST_ASSERT_TRUE(s.begin(w, 0x42));
  TEST_ASSERT_EQUAL(121, chip.reg[Servo::PRESCALE]);
  uint16_t t[16] = {0};
  size_t van = w.log.size();
  TEST_ASSERT_TRUE(s.zet(t));
  TEST_ASSERT_EQUAL(64, (int)w.log[van].data.size());
  t[3] = 307;
  van = w.log.size();
  TEST_ASSERT_TRUE(s.zet(t));
  TEST_ASSERT_EQUAL(1, (int)(w.log.size() - van));
  TEST_ASSERT_EQUAL_HEX8(0x06 + 4 * 3, w.log[van].reg);
  TEST_ASSERT_EQUAL(307 & 0xFF, chip.reg[0x06 + 4 * 3 + 2]);
  TEST_ASSERT_EQUAL(307 >> 8, chip.reg[0x06 + 4 * 3 + 3]);
  t[3] = 0; // geen puls: bit 4 van OFF_H
  s.zet(t);
  TEST_ASSERT_EQUAL_HEX8(0x10, chip.reg[0x06 + 4 * 3 + 3]);
}

// E1: de IR-leds hebben dezelfde polariteit als de lichtgroepen. Met een actief-lage module -Q4 (zoals -Q1):
//   - begin() zet OLATA eerst op 0xFF (alles uit) en pas dan IODIRA op uitgang: geen led tijdens het opstarten;
//   - IR-led 1 kiezen = alleen kanaal 1 geleidt.
// Negatieve proef: met de polariteit van 2.0.0 (actief hoog op een actief-lage module) geleiden de andere 7.
void test_mcp_ir_leds_polariteit() {
  NepWire w;
  NepMcp chip;
  w.koppel(0x20, &chip);
  Mcp m;
  TEST_ASSERT_TRUE(m.begin(w, 0x20, true, true));
  TEST_ASSERT_TRUE(chip.uitgangGezet[0]);
  TEST_ASSERT_EQUAL_HEX8(0xFF, chip.olatBijUitgang[0]); // eerst uit, dan uitgang
  TEST_ASSERT_EQUAL_HEX8(0x00, q4Geleidt(chip.olat(0), true));
  TEST_ASSERT_TRUE(m.zetA(0x01));
  TEST_ASSERT_EQUAL_HEX8(0x01, q4Geleidt(chip.olat(0), true)); // alleen IR-led 1
  TEST_ASSERT_TRUE(m.zetA(0x30));
  TEST_ASSERT_EQUAL_HEX8(0x30, q4Geleidt(chip.olat(0), true));
  TEST_ASSERT_TRUE(m.zetA(0));
  TEST_ASSERT_EQUAL_HEX8(0x00, q4Geleidt(chip.olat(0), true));
  // de instelling irLedActiefLaag omzetten: meteen opnieuw geschreven
  m.zetA(0x01);
  TEST_ASSERT_TRUE(m.zetActiefLaag(false));
  TEST_ASSERT_EQUAL_HEX8(0x01, chip.olat(0));
  TEST_ASSERT_EQUAL_HEX8(0x01, q4Geleidt(chip.olat(0), false));
  // negatieve proef: actief hoog sturen op een actief-lage module (de fout van 2.0.0): alle leds BEHALVE de gekozen
  TEST_ASSERT_EQUAL_HEX8(0xFE, q4Geleidt(chip.olat(0), true));
  NepMcp oud;
  NepWire w2;
  w2.koppel(0x20, &oud);
  Mcp m2;
  m2.begin(w2, 0x20, true, false);
  TEST_ASSERT_EQUAL_HEX8(0xFF, q4Geleidt(oud.olatBijUitgang[0], true)); // tijdens het opstarten: alle 8 aan
}

// E7 en E6: GPB7 (en op 0x21 ook GPA7) is uitgang, zonder pull-up of interrupt; de ingangen van 0x20 komen in één
// leesbeurt van 3 bytes (BANK = 1: INTFB, INTCAPB, GPIOB)
void test_mcp_gpx7_en_alleen_poort_b() {
  NepWire w;
  NepMcp a, b;
  w.koppel(0x20, &a);
  w.koppel(0x21, &b);
  Mcp m1, m2;
  TEST_ASSERT_TRUE(m1.begin(w, 0x20, true, true));
  TEST_ASSERT_TRUE(m2.begin(w, 0x21, false, true));
  TEST_ASSERT_TRUE(a.bank1());
  TEST_ASSERT_EQUAL_HEX8(0x7F, a.iodir(1));
  TEST_ASSERT_EQUAL_HEX8(0x7F, a.gppu(1));
  TEST_ASSERT_EQUAL_HEX8(0x7F, a.gpinten(1));
  TEST_ASSERT_EQUAL_HEX8(0x00, a.iodir(0));
  TEST_ASSERT_EQUAL_HEX8(0x7F, b.iodir(0));
  TEST_ASSERT_EQUAL_HEX8(0x7F, b.iodir(1));
  TEST_ASSERT_EQUAL_HEX8(0x7F, b.gpinten(0));
  // ingang 17 (GPB0) laag, en GPB7 "laag" (wat er ook aan hangt): alleen ingang 17
  a.zetPin(1, 0, false);
  a.zetPin(1, 7, false);
  size_t van = w.log.size();
  uint16_t laag, intf, cap;
  TEST_ASSERT_TRUE(m1.leesIngangen(laag, intf, cap));
  TEST_ASSERT_EQUAL(1, (int)(w.log.size() - van));
  TEST_ASSERT_TRUE(w.log[van].lezen);
  TEST_ASSERT_EQUAL_HEX8(0x17, w.log[van].reg); // INTFB in BANK = 1
  TEST_ASSERT_EQUAL(3, (int)w.log[van].data.size());
  TEST_ASSERT_EQUAL_HEX16(0x0100, laag);
  TEST_ASSERT_EQUAL_HEX64(ingangBit(16), mcp1Ingangen(laag));
  TEST_ASSERT_EQUAL_HEX16(0x0100, mcpActiefFlanken(intf, cap, 0));
  // de tweede: A en B
  b.zetPin(0, 6, false);
  b.zetPin(1, 6, false);
  TEST_ASSERT_TRUE(m2.leesIngangen(laag, intf, cap));
  TEST_ASSERT_EQUAL_HEX64(ingangBit(30) | ingangBit(37), mcp2Ingangen(laag));
  // spanningsdip: de chip staat weer in BANK = 0 met alles ingang; controleer() ziet het, begin() herstelt
  a.reset();
  TEST_ASSERT_FALSE(m1.controleer());
  TEST_ASSERT_TRUE(m1.begin(w, 0x20, true, true));
  TEST_ASSERT_TRUE(m1.controleer());
  TEST_ASSERT_EQUAL_HEX8(0xFF, a.olatBijUitgang[0]);
  // begin() terwijl de chip al in BANK = 1 staat (een leesfout, geen dip): OLATA blijft heel tot hij "uit" schrijft
  m1.zetA(0x04);
  TEST_ASSERT_TRUE(m1.begin(w, 0x20, true, true));
  TEST_ASSERT_TRUE(a.bank1());
  TEST_ASSERT_EQUAL_HEX8(0xFF, a.olat(0));
}

// F10 (model): INTF en INTCAP bevriezen bij de eerste verandering op een poort. Twee korte pulsen op 2 pinnen van
// dezelfde poort binnen één tick: alleen de eerste wordt gezien; op een andere poort, of een lange puls: wel.
void test_mcp_twee_pinnen_in_een_tick() {
  NepWire w;
  NepMcp a;
  w.koppel(0x21, &a);
  Mcp m;
  TEST_ASSERT_TRUE(m.begin(w, 0x21, false, true));
  uint16_t laag, intf, cap;
  m.leesIngangen(laag, intf, cap);
  // tick: pin A0 kort laag, dan pin A1 kort laag, dan pin B2 kort laag
  a.zetPin(0, 0, false);
  a.zetPin(0, 0, true);
  a.zetPin(0, 1, false);
  a.zetPin(0, 1, true);
  a.zetPin(1, 2, false);
  a.zetPin(1, 2, true);
  TEST_ASSERT_TRUE(m.leesIngangen(laag, intf, cap));
  uint16_t f = mcpActiefFlanken(intf, cap, 0);
  TEST_ASSERT_TRUE(f & 0x0001);    // A0 gezien
  TEST_ASSERT_FALSE(f & 0x0002);   // A1 gemist (bevroren): daarom de snelste sensoren op ingang 1..16
  TEST_ASSERT_TRUE(f & 0x0400);    // B2 (andere poort) gezien
  // een langere puls op A1 (nog laag bij de volgende lezing): gezien via het niveau
  a.zetPin(0, 0, false);
  a.zetPin(0, 1, false);
  TEST_ASSERT_TRUE(m.leesIngangen(laag, intf, cap));
  TEST_ASSERT_TRUE(laag & 0x0002);
  // omgekeerde ingang (print "gnd" + npn): de actief-flank is dan hoog
  TEST_ASSERT_EQUAL_HEX16(0x0001, mcpActiefFlanken(0x0001, 0x0001, 0x0001));
  TEST_ASSERT_EQUAL_HEX16(0x0000, mcpActiefFlanken(0x0001, 0x0001, 0x0000));
}

// FN2 (Fable 5.2, tweede ronde): een warme reset (watchdog, update) laat de PCA9685 aan staan met de kanalen van
// voor de reset. begin() moet ze ALLEMAAL uit zetten vóór OE laag gaat. Dat lukt alleen als MODE1 eerst 0x30 krijgt
// (slapen met AI): dan landen de 4 bytes in ALL_LED_ON_L..ALL_LED_OFF_H. Negatieve proef: met de MODE1 = 0x10 van 2.1.0
// komen ze alle vier in ALL_LED_ON_L en brandt alles weer.
void test_pca_begin_na_warme_reset_alles_uit() {
  NepWire w;
  NepChip chip;
  w.koppel(0x40, &chip);
  Pca p;
  TEST_ASSERT_TRUE(p.begin(w, 0x40));
  TEST_ASSERT_TRUE(p.zet(0xFFFF));
  uint16_t terug = 0;
  TEST_ASSERT_TRUE(p.leesTerug(terug));
  TEST_ASSERT_EQUAL_HEX16(0xFFFF, terug);
  Pca na; // de ESP herstart, de PCA9685 niet
  TEST_ASSERT_TRUE(na.begin(w, 0x40));
  TEST_ASSERT_TRUE(na.leesTerug(terug));
  TEST_ASSERT_EQUAL_HEX16(0x0000, terug);
  // negatieve proef: de volgorde van 2.1.0 met hetzelfde model
  TEST_ASSERT_TRUE(na.zet(0xFFFF)); // weer alles aan
  for (int r = 0xFA; r <= 0xFD; r++) chip.reg[r] = 0; // wat de goede begin() er schreef, weg
  chip.reg[Pca::MODE1] = 0x20;
  const uint8_t slaap = 0x10, uit[4] = {0, 0, 0, 0x10};
  detail::i2cSchrijf(&w, 0x40, Pca::MODE1, &slaap, 1);
  detail::i2cSchrijf(&w, 0x40, Pca::ALL_LED_ON_L, uit, 4);
  TEST_ASSERT_EQUAL_HEX8(0x10, chip.reg[Pca::ALL_LED_ON_L]); // alle 4 bytes in één register (de laatste wint)
  TEST_ASSERT_EQUAL_HEX8(0x00, chip.reg[0xFD]);              // ALL_LED_OFF_H nooit geschreven
  const uint8_t wakker = 0x20;
  detail::i2cSchrijf(&w, 0x40, Pca::MODE1, &wakker, 1);
  TEST_ASSERT_TRUE(na.leesTerug(terug));
  TEST_ASSERT_EQUAL_HEX16(0xFFFF, terug); // alles brandt weer
  // ook de servo-PCA9685: na een warme reset geen oude pulsen meer
  NepChip sc;
  w.koppel(0x42, &sc);
  Servo s;
  TEST_ASSERT_TRUE(s.begin(w, 0x42));
  uint16_t t[16];
  for (int i = 0; i < 16; i++) t[i] = 307;
  TEST_ASSERT_TRUE(s.zet(t));
  Servo s2;
  TEST_ASSERT_TRUE(s2.begin(w, 0x42));
  for (int k = 0; k < 16; k++) TEST_ASSERT_EQUAL_HEX8(0x10, sc.reg[0x06 + 4 * k + 3]); // OFF_H bit 4: geen puls
}

// QN1: het model zelf: zonder AI blijft de wijzer staan (zoals de echte PCA9685), met AI hoogt hij op
void test_nep_pca_ai_bit() {
  NepWire w;
  NepChip chip;
  w.koppel(0x40, &chip);
  const uint8_t drie[3] = {1, 2, 3};
  detail::i2cSchrijf(&w, 0x40, 0x06, drie, 3);
  TEST_ASSERT_EQUAL(3, chip.reg[0x06]);
  TEST_ASSERT_EQUAL(0, chip.reg[0x07]);
  chip.reg[0] = 0x20;
  detail::i2cSchrijf(&w, 0x40, 0x06, drie, 3);
  TEST_ASSERT_EQUAL(1, chip.reg[0x06]);
  TEST_ASSERT_EQUAL(3, chip.reg[0x08]);
}

// QN1: de buffer van Wire is 128 bytes (met het registeradres). Wire zelf kapt stil af (write geeft minder terug);
// i2cSchrijf weigert zo'n overdracht vooraf: niets op de bus.
void test_nep_buffer_128_bytes() {
  NepWire w;
  NepChip chip;
  w.koppel(0x40, &chip);
  uint8_t veel[129] = {0};
  w.beginTransmission(0x40);
  TEST_ASSERT_EQUAL(128, (int)w.write(veel, 129)); // zoals TwoWire: de 129e past niet
  TEST_ASSERT_EQUAL(0, (int)w.write(1));
  w.endTransmission();
  TEST_ASSERT_EQUAL(127, (int)w.log.back().data.size()); // afgekapt verzonden (registeradres + 127)
  size_t van = w.log.size();
  TEST_ASSERT_FALSE(detail::i2cSchrijf(&w, 0x40, 0x06, veel, 128)); // 129 bytes: geweigerd
  TEST_ASSERT_EQUAL(0, (int)(w.log.size() - van));
  TEST_ASSERT_TRUE(detail::i2cSchrijf(&w, 0x40, 0x06, veel, 127)); // 128 bytes: past
}

// QN1: NACK halverwege een schrijfbeurt (stoorpuls, chip in reset): zet() meldt het en schrijft de volgende keer alles
void test_pca_nack_halverwege() {
  NepWire w;
  NepChip chip;
  w.koppel(0x40, &chip);
  Pca p;
  TEST_ASSERT_TRUE(p.begin(w, 0x40));
  TEST_ASSERT_TRUE(p.zet(0));
  chip.nackNa = 10; // 2,5 kanalen komen aan, dan NACK
  TEST_ASSERT_FALSE(p.zet(0x00FF));
  uint16_t m;
  TEST_ASSERT_FALSE(p.laatst(m));
  size_t van = w.log.size();
  TEST_ASSERT_TRUE(p.zet(0x00FF));
  TEST_ASSERT_EQUAL(64, (int)w.log[van].data.size()); // alles opnieuw
  uint16_t terug;
  TEST_ASSERT_TRUE(p.leesTerug(terug));
  TEST_ASSERT_EQUAL_HEX16(0x00FF, terug);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_pca_begin_na_warme_reset_alles_uit);
  RUN_TEST(test_nep_pca_ai_bit);
  RUN_TEST(test_nep_buffer_128_bytes);
  RUN_TEST(test_pca_nack_halverwege);
  RUN_TEST(test_pca_alleen_gewijzigde_kanalen);
  RUN_TEST(test_servo_pca_alleen_gewijzigde_kanalen);
  RUN_TEST(test_mcp_ir_leds_polariteit);
  RUN_TEST(test_mcp_gpx7_en_alleen_poort_b);
  RUN_TEST(test_mcp_twee_pinnen_in_een_tick);
  return UNITY_END();
}
