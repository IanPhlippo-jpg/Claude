// Tests van include/ir.h:  python -m platformio test -e native -f test_ir
// NEC en RC5 heen en terug, marges, herhalingen, raw-vingerafdruk, leren uit een nagemaakte draaggolf.
#include <unity.h>

#include <string>
#include <vector>

#include "ir.h"
#include "irrmt.h"

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
  TEST_ASSERT_EQUAL(IR_CONTINU, irSoortVanId("continu"));
  TEST_ASSERT_EQUAL_STRING("raw", irSoortId(IR_RAW));
}

// F13: een NEC-code met een uitgebreid adres waarvan de hoge byte 0 is: geleerd "12 00 34 CB" moet zo terug gezonden
// worden (2.0.0 maakte er "12 ED 34 CB" van). Negatieve proef: zonder de vlag adres16 komt "12 ED".
void test_nec_hoge_adresbyte_nul() {
  uint8_t b[4] = {0x12, 0x00, 0x34, 0xCB};
  std::vector<uint16_t> env;
  env.push_back(9000);
  env.push_back(4500);
  for (int i = 0; i < 32; i++) {
    env.push_back(560);
    env.push_back(b[i / 8] >> (i % 8) & 1 ? 1690 : 560);
  }
  env.push_back(560);
  std::vector<uint32_t> ns = draaggolf(env, 38.0);
  Leerresultaat r;
  TEST_ASSERT_TRUE(leerUitDraaggolf(ns.data(), (int)ns.size(), r));
  IrCode c;
  leerNaarCode(r, c);
  TEST_ASSERT_EQUAL(IR_NEC, c.soort);
  TEST_ASSERT_EQUAL_HEX16(0x0012, c.adres);
  TEST_ASSERT_TRUE(c.adres16);
  TEST_ASSERT_FALSE(c.commando16);
  char t[IR_TEKST_LEN];
  irCodeTekst(c, t, sizeof t);
  TEST_ASSERT_EQUAL_STRING("nec:120034CB", t);
  // zenden en weer herkennen: dezelfde 4 bytes
  std::vector<uint16_t> p = pulsen(c);
  IrGelezen g;
  TEST_ASSERT_TRUE(necLees(p.data(), (int)p.size(), g));
  TEST_ASSERT_EQUAL_STRING("nec:120034CB", tekst(g).c_str());
  c.adres16 = false; // negatieve proef: zo deed 2.0.0 het
  irCodeTekst(c, t, sizeof t);
  TEST_ASSERT_EQUAL_STRING("nec:12ED34CB", t);
}

// F5: een raw-code van 255 tijden met "herhaal 5" past niet (1279 tijden): irPast zegt nee, irMaxHerhaal zegt hoeveel
void test_raw_te_lang_met_herhalingen() {
  IrCode c;
  c.gebruikt = true;
  c.soort = IR_RAW;
  c.nRaw = 255;
  for (int i = 0; i < 255; i++) c.raw[i] = (uint16_t)(400 + (i % 7) * 100);
  c.herhaal = 1;
  TEST_ASSERT_TRUE(irPast(c));
  c.herhaal = 5;
  static uint32_t us[MAX_IR_PULSEN];
  TEST_ASSERT_EQUAL(0, irPulsen(c, us, MAX_IR_PULSEN)); // vroeger: stil niets gezonden
  TEST_ASSERT_FALSE(irPast(c));
  TEST_ASSERT_EQUAL(4, irMaxHerhaal(c));
  // lange tijden (> 32767 µs) tellen dubbel in RMT-items: ook dan te lang
  IrCode l = c;
  for (int i = 0; i < 255; i++) l.raw[i] = 60000;
  l.herhaal = 3;
  int n = irPulsen(l, us, MAX_IR_PULSEN);
  TEST_ASSERT_TRUE(n > 0);
  TEST_ASSERT_TRUE(irItems(us, n) > IR_MAX_ITEMS);
  TEST_ASSERT_FALSE(irPast(l));
  TEST_ASSERT_EQUAL(2, irMaxHerhaal(l));
  // NEC met 10 herhalingen past ruim; continu past altijd (geen pulsen)
  TEST_ASSERT_TRUE(irPast(nec(0, 1, 10)));
  IrCode k;
  k.soort = IR_CONTINU;
  TEST_ASSERT_EQUAL(0, irPulsen(k, us, MAX_IR_PULSEN));
  TEST_ASSERT_TRUE(irPast(k));
}

// Q1: de RMT-items (zenden en ontvangen) zonder hardware
void test_rmt_items_heen_en_terug() {
  IrCode c = nec(0, 0x12, 2);
  static uint32_t us[MAX_IR_PULSEN];
  int n = irPulsen(c, us, MAX_IR_PULSEN);
  static RmtItem it[IR_MAX_ITEMS];
  int k = irNaarItems(us, n, it, IR_MAX_ITEMS);
  TEST_ASSERT_EQUAL(irItems(us, n), k);
  TEST_ASSERT_EQUAL(9000, it[0].duration0);
  TEST_ASSERT_EQUAL(1, it[0].level0);
  TEST_ASSERT_EQUAL(4500, it[0].duration1);
  TEST_ASSERT_EQUAL(0, it[0].level1);
  // de pauze tot de herhaalcode (> 32767 µs) is gesplitst: samen weer de hele pauze
  uint32_t som = 0;
  for (int i = 0; i < k; i++) som += it[i].duration0 + it[i].duration1;
  uint32_t verwacht = 0;
  for (int i = 0; i < n; i++) verwacht += us[i];
  TEST_ASSERT_EQUAL_UINT32(verwacht, som);
  // past niet: -1 en niets half (F5)
  TEST_ASSERT_EQUAL(-1, irNaarItems(us, n, it, 10));
  // ontvangen: een ontvanger is actief laag (niveau 0 = licht), tel 0,5 µs; eindmarkering = duur 0
  RmtItem rx[3] = {{18000, 0, 9000, 1}, {1120, 0, 1120, 1}, {1120, 0, 0, 1}};
  uint32_t ns[8];
  bool afgekapt = true;
  int m = itemsNaarNs(rx, 3, ns, 8, 500, afgekapt);
  TEST_ASSERT_FALSE(afgekapt);
  TEST_ASSERT_EQUAL(5, m);
  TEST_ASSERT_EQUAL_UINT32(9000000, ns[0]);
  TEST_ASSERT_EQUAL_UINT32(4500000, ns[1]);
  TEST_ASSERT_EQUAL_UINT32(560000, ns[4]);
  m = itemsNaarNs(rx, 3, ns, 3, 500, afgekapt); // te klein: afgekapt (F17)
  TEST_ASSERT_EQUAL(3, m);
  TEST_ASSERT_TRUE(afgekapt);
}

// E2: een frame met alleen een lang niveau (een lichtsluis die blijft onderbroken of een bus boven de reflexsensor):
// de RMT geeft dan alleen een eindmarkering, dus 0 tijden. Het niveau van de pin (NiveauWacht) ziet het wel.
void test_lang_niveau_geeft_geen_frame_maar_wel_niveau() {
  RmtItem rx[1] = {{0, 0, 0, 0}};
  uint32_t ns[4];
  bool afgekapt;
  TEST_ASSERT_EQUAL(0, itemsNaarNs(rx, 1, ns, 4, 500, afgekapt));
  NiveauWacht w;
  uint32_t t = 0;
  int begin = 0, einde = 0;
  for (; t < 45; t += 5) begin += w.stap(true, t) == 1;
  TEST_ASSERT_EQUAL(0, begin); // 45 ms: nog geen aanwezigheid (negatieve proef: een korte flikkering telt niet)
  for (; t < 1000; t += 5) begin += w.stap(true, t) == 1;
  TEST_ASSERT_EQUAL(1, begin); // één keer, ook als het lang duurt
  TEST_ASSERT_TRUE(w.bezet);
  einde += w.stap(false, t) == -1;
  TEST_ASSERT_EQUAL(1, einde);
  TEST_ASSERT_FALSE(w.bezet);
  // even laag, even hoog: telt opnieuw vanaf 0
  w.stap(true, 2000);
  w.stap(false, 2030);
  TEST_ASSERT_EQUAL(0, w.stap(true, 2040));
  TEST_ASSERT_EQUAL(0, w.stap(true, 2085));
  TEST_ASSERT_EQUAL(1, w.stap(true, 2090));
}

// E4: de gemeten draaggolf in tienden van een kHz
void test_draaggolf_in_tienden() {
  std::vector<uint16_t> p = pulsen(nec(0x7E, 0x5A));
  Leerresultaat r;
  std::vector<uint32_t> ns = draaggolf(p, 38.0);
  TEST_ASSERT_TRUE(leerUitDraaggolf(ns.data(), (int)ns.size(), r));
  TEST_ASSERT_INT_WITHIN(3, 380, r.khzTiende);
  ns = draaggolf(p, 36.4);
  leerUitDraaggolf(ns.data(), (int)ns.size(), r);
  TEST_ASSERT_INT_WITHIN(3, 364, r.khzTiende);
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
  RUN_TEST(test_nec_hoge_adresbyte_nul);
  RUN_TEST(test_raw_te_lang_met_herhalingen);
  RUN_TEST(test_rmt_items_heen_en_terug);
  RUN_TEST(test_lang_niveau_geeft_geen_frame_maar_wel_niveau);
  RUN_TEST(test_draaggolf_in_tienden);
  return UNITY_END();
}
