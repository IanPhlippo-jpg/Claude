// Tests van include/ir.h:  python -m platformio test -e native -f test_ir
// NEC en RC5 heen en terug, marges, herhalingen, raw-vingerafdruk, leren uit een nagemaakte draaggolf.
#include <unity.h>

#include <string>
#include <vector>

#include "ir.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {

std::vector<uint16_t> pulsen(const IrCode &c, bool toggle = false) {
  static uint32_t buf[MAX_IR_PULSEN];
  int n = irPulsen(c, buf, MAX_IR_PULSEN, toggle);
  std::vector<uint16_t> v;
  for (int i = 0; i < n; i++) v.push_back((uint16_t)(buf[i] > 65535 ? 65535 : buf[i]));
  return v;
}

IrCode nec(uint16_t adres, uint16_t cmd, int herhaal = 1) {
  IrCode c;
  c.gebruikt = true;
  c.soort = IR_NEC;
  c.adres = adres;
  c.commando = cmd;
  c.herhaal = (uint8_t)herhaal;
  return c;
}

IrCode rc5(uint16_t adres, uint16_t cmd) {
  IrCode c = nec(adres, cmd);
  c.soort = IR_RC5;
  c.khz = 36;
  return c;
}

std::string tekst(const IrGelezen &g) {
  char t[IR_TEKST_LEN];
  irTekst(g, t, sizeof t);
  return t;
}

/** een omhullende (µs) als draaggolf zoals de TSMP58000 ze doorgeeft: per periode een korte aan-puls (duty) */
std::vector<uint32_t> draaggolf(const std::vector<uint16_t> &env, double khz, double duty = 0.33) {
  std::vector<uint32_t> ns;
  double periode = 1e6 / khz; // ns
  uint32_t aan = (uint32_t)(periode * duty), uit = (uint32_t)(periode - aan);
  for (size_t i = 0; i < env.size(); i++) {
    if (i % 2 == 0) {
      int perioden = (int)(env[i] * 1000.0 / periode + 0.5);
      if (perioden < 1) perioden = 1;
      for (int p = 0; p < perioden; p++) {
        ns.push_back(aan);
        if (p + 1 < perioden) ns.push_back(uit);
      }
      // de laatste uit-tijd van het pakketje hoort bij de pauze die volgt
      if (i + 1 < env.size()) ns.push_back(uit + env[i + 1] * 1000u - (uint32_t)0);
    }
  }
  return ns;
}

} // namespace

void test_nec_heen_en_terug() {
  std::vector<uint16_t> p = pulsen(nec(0x00, 0x12));
  TEST_ASSERT_EQUAL(67, (int)p.size());
  TEST_ASSERT_EQUAL(9000, p[0]);
  TEST_ASSERT_EQUAL(4500, p[1]);
  IrGelezen g;
  TEST_ASSERT_TRUE(irHerken(p.data(), (int)p.size(), g));
  TEST_ASSERT_EQUAL(IR_NEC, g.soort);
  TEST_ASSERT_EQUAL(0, g.adres);
  TEST_ASSERT_EQUAL(0x12, g.commando);
  TEST_ASSERT_EQUAL_STRING("nec:00FF12ED", tekst(g).c_str());
  // dezelfde tekst als de bewaarde code
  char t[IR_TEKST_LEN];
  irCodeTekst(nec(0x00, 0x12), t, sizeof t);
  TEST_ASSERT_EQUAL_STRING("nec:00FF12ED", t);
  // uitgebreid adres (16 bit)
  p = pulsen(nec(0x1234, 0x45));
  TEST_ASSERT_TRUE(necLees(p.data(), (int)p.size(), g));
  TEST_ASSERT_EQUAL_HEX16(0x1234, g.adres);
  TEST_ASSERT_EQUAL_STRING("nec:341245BA", tekst(g).c_str());
}

void test_nec_marges() {
  std::vector<uint16_t> p = pulsen(nec(7, 99));
  // zoals een TSOP: pulsen 20 % langer, pauzes 15 % korter
  std::vector<uint16_t> q = p;
  for (size_t i = 0; i < q.size(); i++) q[i] = (uint16_t)(i % 2 == 0 ? q[i] * 1.20 : q[i] * 0.85);
  IrGelezen g;
  TEST_ASSERT_TRUE(necLees(q.data(), (int)q.size(), g));
  TEST_ASSERT_EQUAL(7, g.adres);
  TEST_ASSERT_EQUAL(99, g.commando);
  // 60 % te lang: geen NEC meer (dan raw)
  for (size_t i = 0; i < q.size(); i++) q[i] = (uint16_t)(p[i] * 1.6);
  TEST_ASSERT_FALSE(necLees(q.data(), (int)q.size(), g));
  TEST_ASSERT_TRUE(irHerken(q.data(), (int)q.size(), g));
  TEST_ASSERT_EQUAL(IR_RAW, g.soort);
  // een frame dat te vroeg stopt
  TEST_ASSERT_FALSE(necLees(p.data(), 40, g));
}

void test_nec_herhalingen() {
  std::vector<uint16_t> p = pulsen(nec(1, 2, 3));
  TEST_ASSERT_EQUAL(67 + 2 * 4, (int)p.size());
  // het tweede frame begint 108 ms na het eerste
  uint32_t t = 0;
  for (int i = 0; i < 68; i++) t += p[i];
  TEST_ASSERT_EQUAL_UINT32(NEC_PERIODE, t);
  IrGelezen g;
  TEST_ASSERT_TRUE(necLees(&p[68], 3, g));
  TEST_ASSERT_TRUE(g.herhaling);
  // herhalen begrensd tot 10
  IrCode c = nec(1, 2, 50);
  TEST_ASSERT_EQUAL(67 + 9 * 4, (int)pulsen(c).size());
}

void test_rc5_heen_en_terug() {
  const uint16_t gevallen[][2] = {{0, 0}, {5, 0x10}, {31, 63}, {20, 64}, {0, 127}, {17, 85}};
  for (auto &gv : gevallen) {
    for (int toggle = 0; toggle < 2; toggle++) {
      std::vector<uint16_t> p = pulsen(rc5(gv[0], gv[1]), toggle);
      IrGelezen g;
      TEST_ASSERT_TRUE(rc5Lees(p.data(), (int)p.size(), g));
      TEST_ASSERT_EQUAL(gv[0], g.adres);
      TEST_ASSERT_EQUAL(gv[1], g.commando);
      TEST_ASSERT_EQUAL(toggle, g.toggle);
    }
  }
  std::vector<uint16_t> p = pulsen(rc5(5, 0x10));
  IrGelezen g;
  TEST_ASSERT_TRUE(irHerken(p.data(), (int)p.size(), g));
  TEST_ASSERT_EQUAL(IR_RC5, g.soort);
  TEST_ASSERT_EQUAL_STRING("rc5:0510", tekst(g).c_str());
  // alle tijden zijn een halve of een hele bit
  for (uint16_t d : p) TEST_ASSERT_TRUE(d == RC5_HALF || d == 2 * RC5_HALF);
  // met marge (TSOP)
  for (size_t i = 0; i < p.size(); i++) p[i] = (uint16_t)(i % 2 == 0 ? p[i] + 120 : p[i] - 120);
  TEST_ASSERT_TRUE(rc5Lees(p.data(), (int)p.size(), g));
  TEST_ASSERT_EQUAL(0x10, g.commando);
  // twee keer: de pauze vult 114 ms
  IrCode c = rc5(1, 1);
  c.herhaal = 2;
  std::vector<uint16_t> q = pulsen(c);
  TEST_ASSERT_EQUAL((int)pulsen(rc5(1, 1)).size() * 2 + 1, (int)q.size());
}

void test_raw_vingerafdruk() {
  const uint16_t a[] = {3000, 1500, 400, 400, 400, 1200, 400, 400, 400, 1200, 400};
  uint16_t b[11];
  for (int i = 0; i < 11; i++) b[i] = (uint16_t)(a[i] * (i % 3 ? 1.08 : 0.93)); // kleine verschillen
  TEST_ASSERT_NOT_EQUAL(0, irVingerafdruk(a, 11));
  TEST_ASSERT_EQUAL_UINT32(irVingerafdruk(a, 11), irVingerafdruk(b, 11));
  uint16_t c[11];
  memcpy(c, a, sizeof a);
  c[5] = 400; // een andere vorm
  TEST_ASSERT_NOT_EQUAL(irVingerafdruk(a, 11), irVingerafdruk(c, 11));
  IrGelezen g;
  TEST_ASSERT_TRUE(irHerken(a, 11, g));
  TEST_ASSERT_EQUAL(IR_RAW, g.soort);
  TEST_ASSERT_EQUAL(12, (int)tekst(g).size()); // raw:XXXXXXXX
  // te kort: geen code (een lichtsluis of een stoorpuls)
  const uint16_t kort[] = {20000};
  TEST_ASSERT_FALSE(irHerken(kort, 1, g));
  // raw zenden: oneven aantal (eindigt met aan), herhalen met een pauze
  IrCode r;
  r.soort = IR_RAW;
  r.nRaw = 10;
  memcpy(r.raw, a, 10 * sizeof(uint16_t));
  r.herhaal = 2;
  std::vector<uint16_t> p = pulsen(r);
  TEST_ASSERT_EQUAL(9 + 1 + 9, (int)p.size());
  TEST_ASSERT_EQUAL(40000, p[9]);
  IrCode leeg;
  leeg.soort = IR_RAW;
  TEST_ASSERT_EQUAL(0, (int)pulsen(leeg).size());
}

void test_leren_nec_uit_draaggolf() {
  std::vector<uint16_t> env = pulsen(nec(0x00, 0x12));
  std::vector<uint32_t> ns = draaggolf(env, 38.0);
  Leerresultaat r;
  TEST_ASSERT_TRUE(leerUitDraaggolf(ns.data(), (int)ns.size(), r));
  TEST_ASSERT_EQUAL(38, r.khz);
  TEST_ASSERT_EQUAL(67, r.n);
  for (int i = 0; i < r.n; i++) TEST_ASSERT_INT_WITHIN(40, env[i], r.us[i]); // binnen ongeveer een periode
  IrCode c;
  leerNaarCode(r, c);
  TEST_ASSERT_EQUAL(IR_NEC, c.soort);
  TEST_ASSERT_EQUAL(38, c.khz);
  char t[IR_TEKST_LEN];
  irCodeTekst(c, t, sizeof t);
  TEST_ASSERT_EQUAL_STRING("nec:00FF12ED", t);
}

void test_leren_rc5_en_raw_en_zonder_draaggolf() {
  // RC5 op 36 kHz met een andere duty
  std::vector<uint16_t> env = pulsen(rc5(5, 0x10));
  std::vector<uint32_t> ns = draaggolf(env, 36.0, 0.5);
  Leerresultaat r;
  TEST_ASSERT_TRUE(leerUitDraaggolf(ns.data(), (int)ns.size(), r));
  TEST_ASSERT_EQUAL(36, r.khz);
  IrCode c;
  leerNaarCode(r, c);
  TEST_ASSERT_EQUAL(IR_RC5, c.soort);
  TEST_ASSERT_EQUAL(5, c.adres);
  TEST_ASSERT_EQUAL(0x10, c.commando);
  // een onbekend protocol op 56 kHz: raw, met de frequentie
  const uint16_t vreemd[] = {2400, 600, 1200, 600, 600, 600, 1200, 600, 600, 600, 1200};
  ns = draaggolf(std::vector<uint16_t>(vreemd, vreemd + 11), 56.0);
  TEST_ASSERT_TRUE(leerUitDraaggolf(ns.data(), (int)ns.size(), r));
  TEST_ASSERT_EQUAL(56, r.khz);
  leerNaarCode(r, c);
  TEST_ASSERT_EQUAL(IR_RAW, c.soort);
  TEST_ASSERT_EQUAL(56, c.khz);
  TEST_ASSERT_EQUAL(11, c.nRaw);
  TEST_ASSERT_INT_WITHIN(30, 2400, c.raw[0]);
  // de geleerde raw-code zenden en weer lezen geeft dezelfde vingerafdruk
  char t1[IR_TEKST_LEN], t2[IR_TEKST_LEN];
  irCodeTekst(c, t1, sizeof t1);
  IrGelezen g;
  irHerken(vreemd, 11, g);
  irTekst(g, t2, sizeof t2);
  TEST_ASSERT_EQUAL_STRING(t2, t1);
  // een ontvanger zonder draaggolf (TSOP, al gedemoduleerd): de tijden zelf, 38 kHz standaard
  env = pulsen(nec(3, 4));
  ns.clear();
  for (uint16_t d : env) ns.push_back(d * 1000u);
  TEST_ASSERT_TRUE(leerUitDraaggolf(ns.data(), (int)ns.size(), r));
  TEST_ASSERT_EQUAL(0, r.khz);
  leerNaarCode(r, c);
  TEST_ASSERT_EQUAL(IR_NEC, c.soort);
  TEST_ASSERT_EQUAL(38, c.khz);
  TEST_ASSERT_EQUAL(4, c.commando);
  // leeg
  TEST_ASSERT_FALSE(leerUitDraaggolf(nullptr, 0, r));
}

void test_soort_namen() {
  TEST_ASSERT_EQUAL(IR_RC5, irSoortVanId("rc5"));
  TEST_ASSERT_EQUAL(-1, irSoortVanId("sony"));
  TEST_ASSERT_EQUAL_STRING("raw", irSoortId(IR_RAW));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_nec_heen_en_terug);
  RUN_TEST(test_nec_marges);
  RUN_TEST(test_nec_herhalingen);
  RUN_TEST(test_rc5_heen_en_terug);
  RUN_TEST(test_raw_vingerafdruk);
  RUN_TEST(test_leren_nec_uit_draaggolf);
  RUN_TEST(test_leren_rc5_en_raw_en_zonder_draaggolf);
  RUN_TEST(test_soort_namen);
  return UNITY_END();
}
