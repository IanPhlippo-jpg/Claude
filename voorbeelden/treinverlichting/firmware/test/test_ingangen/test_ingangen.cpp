// Tests van de ingangen (include/ingangen.h, include/baan.h) op de pc:  python -m platformio test -e native
// Ontdendering (stuiteren, te korte pulsen), drukknop met en zonder wisselen, schakelaar, sensor met nalooptijd,
// rusttoestand bij het opstarten, koppeling met de functies in de Baan.
#include <unity.h>

#include <vector>

#include "baan.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {

struct Proef {
  Ingangen in;
  IngangCfg cfg[N_INGANGEN];
  std::vector<Opdracht> op;
  std::vector<uint32_t> wanneer;
  uint32_t t = 0;
  uint16_t ruw = 0;

  /** dt ms laten lopen met een lezing elke 10 ms (zoals main.cpp) */
  void loop(uint32_t dt, uint32_t elke = 10) {
    for (uint32_t e = t + dt; t < e; t += elke) stap();
  }
  void stap() {
    Opdracht o[N_INGANGEN];
    int n = in.stap(ruw, t, cfg, o, N_INGANGEN);
    for (int i = 0; i < n; i++) {
      op.push_back(o[i]);
      wanneer.push_back(t);
    }
  }
  void zet(int i, bool actief) {
    if (actief) ruw |= (uint16_t)(1u << i);
    else ruw &= (uint16_t)~(1u << i);
  }
};

} // namespace

void test_stuiterende_knop_geeft_een_druk() {
  Proef p;
  p.cfg[0].gedrag = GEDRAG_DRUKKNOP;
  p.cfg[0].functieA = 2;
  p.loop(100);
  // 25 ms stuiteren (elke ms wisselen, gelezen elke ms), daarna stil ingedrukt
  for (int i = 0; i < 25; i++) {
    p.zet(0, i % 2 == 0);
    p.loop(1, 1);
  }
  p.zet(0, true);
  uint32_t stil = p.t;
  p.loop(200, 1);
  TEST_ASSERT_EQUAL(1, (int)p.op.size());
  TEST_ASSERT_EQUAL(2, p.op[0].functie);
  TEST_ASSERT_EQUAL(OPDR_START, p.op[0].soort);
  TEST_ASSERT_EQUAL(0, p.op[0].ingang);
  TEST_ASSERT_TRUE(p.wanneer[0] >= stil + ONTDENDER_MS - 1 && p.wanneer[0] <= stil + ONTDENDER_MS + 1);
  // loslaten (ook stuiterend) geeft niets
  for (int i = 0; i < 10; i++) {
    p.zet(0, i % 2 == 1);
    p.loop(1, 1);
  }
  p.zet(0, false);
  p.loop(200, 1);
  TEST_ASSERT_EQUAL(1, (int)p.op.size());
  TEST_ASSERT_FALSE(p.in.t[0].actief);
}

void test_ontdendering_bij_lezen_elke_5_ms() {
  // zoals main.cpp: elke 5 ms lezen; een druk telt 30 tot 35 ms na de laatste wissel, een puls van 25 ms niet
  Proef p;
  p.cfg[15].gedrag = GEDRAG_DRUKKNOP;
  p.cfg[15].functieA = 1;
  p.loop(50, 5);
  p.zet(15, true);
  p.loop(25, 5);
  p.zet(15, false);
  p.loop(100, 5);
  TEST_ASSERT_EQUAL(0, (int)p.op.size());
  p.zet(15, true);
  uint32_t aan = p.t;
  p.loop(100, 5);
  TEST_ASSERT_EQUAL(1, (int)p.op.size());
  TEST_ASSERT_EQUAL(15, p.op[0].ingang);
  TEST_ASSERT_TRUE(p.wanneer[0] - aan >= ONTDENDER_MS && p.wanneer[0] - aan <= ONTDENDER_MS + 5);
}

void test_te_korte_puls_telt_niet() {
  Proef p;
  p.cfg[1].gedrag = GEDRAG_DRUKKNOP;
  p.cfg[1].functieA = 0;
  p.loop(50);
  p.zet(1, true);
  p.loop(20); // 20 ms < 30 ms
  p.zet(1, false);
  p.loop(200);
  TEST_ASSERT_EQUAL(0, (int)p.op.size());
  p.zet(1, true);
  p.loop(40); // 40 ms: wel
  TEST_ASSERT_EQUAL(1, (int)p.op.size());
}

void test_drukknop_met_en_zonder_wisselen() {
  Proef p;
  p.cfg[3].gedrag = GEDRAG_DRUKKNOP;
  p.cfg[3].functieA = 5;
  p.loop(50);
  for (int k = 0; k < 2; k++) {
    p.zet(3, true);
    p.loop(100);
    p.zet(3, false);
    p.loop(100);
  }
  TEST_ASSERT_EQUAL(2, (int)p.op.size());
  TEST_ASSERT_EQUAL(OPDR_START, p.op[1].soort);
  p.cfg[3].wisselen = true;
  p.zet(3, true);
  p.loop(100);
  TEST_ASSERT_EQUAL(3, (int)p.op.size());
  TEST_ASSERT_EQUAL(OPDR_WISSEL, p.op[2].soort);
  // zonder gekoppelde functie: niets
  p.cfg[3].functieA = -1;
  p.zet(3, false);
  p.loop(100);
  p.zet(3, true);
  p.loop(100);
  TEST_ASSERT_EQUAL(3, (int)p.op.size());
}

void test_schakelaar_a_bij_aan_b_bij_uit() {
  Proef p;
  p.cfg[7].gedrag = GEDRAG_SCHAKELAAR;
  p.cfg[7].functieA = 1;
  p.cfg[7].functieB = 4;
  p.loop(50);
  p.zet(7, true);
  p.loop(100);
  p.zet(7, false);
  p.loop(100);
  TEST_ASSERT_EQUAL(2, (int)p.op.size());
  TEST_ASSERT_EQUAL(1, p.op[0].functie);
  TEST_ASSERT_EQUAL(4, p.op[1].functie);
  TEST_ASSERT_EQUAL_STRING("uit", p.in.toestandTekst(7, p.cfg[7]));
  // geen functie B: uitzetten doet niets
  p.cfg[7].functieB = -1;
  p.zet(7, true);
  p.loop(100);
  TEST_ASSERT_EQUAL_STRING("aan", p.in.toestandTekst(7, p.cfg[7]));
  p.zet(7, false);
  p.loop(100);
  TEST_ASSERT_EQUAL(3, (int)p.op.size());
}

void test_sensor_met_nalooptijd() {
  Proef p;
  p.cfg[9].gedrag = GEDRAG_SENSOR;
  p.cfg[9].functieA = 2;
  p.cfg[9].functieB = 3;
  p.cfg[9].naloopS = 5;
  p.loop(50);
  // trein komt: bezet -> A
  p.zet(9, true);
  p.loop(1000);
  TEST_ASSERT_EQUAL(1, (int)p.op.size());
  TEST_ASSERT_EQUAL(2, p.op[0].functie);
  // tussen twee wagons 2 s vrij, dan weer bezet: geen B, geen tweede A
  p.zet(9, false);
  p.loop(2000);
  TEST_ASSERT_EQUAL_STRING("nalopen", p.in.toestandTekst(9, p.cfg[9]));
  TEST_ASSERT_EQUAL(4, p.in.vrijOver(9, p.cfg[9], p.t)); // nog 3,03 s -> 4 (naar boven)
  p.zet(9, true);
  p.loop(1000);
  TEST_ASSERT_EQUAL(1, (int)p.op.size());
  TEST_ASSERT_EQUAL(-1, p.in.vrijOver(9, p.cfg[9], p.t));
  // trein weg: B pas na 5 s onafgebroken vrij
  p.zet(9, false);
  uint32_t weg = p.t;
  p.loop(4900);
  TEST_ASSERT_EQUAL(1, (int)p.op.size());
  p.loop(200);
  TEST_ASSERT_EQUAL(2, (int)p.op.size());
  TEST_ASSERT_EQUAL(3, p.op[1].functie);
  uint32_t na = p.wanneer[1] - weg;
  TEST_ASSERT_TRUE(na >= 5000 + ONTDENDER_MS && na <= 5000 + ONTDENDER_MS + 20);
  TEST_ASSERT_EQUAL_STRING("vrij", p.in.toestandTekst(9, p.cfg[9]));
  p.loop(10000);
  TEST_ASSERT_EQUAL(2, (int)p.op.size());
}

void test_sensor_zonder_nalopen() {
  Proef p;
  p.cfg[0].gedrag = GEDRAG_SENSOR;
  p.cfg[0].functieA = 0;
  p.cfg[0].functieB = 1;
  p.cfg[0].naloopS = 0;
  p.loop(50);
  p.zet(0, true);
  p.loop(100);
  p.zet(0, false);
  p.loop(100);
  TEST_ASSERT_EQUAL(2, (int)p.op.size());
}

void test_opstarten_geeft_geen_opdrachten() {
  Proef p;
  for (int i = 0; i < N_INGANGEN; i++) {
    p.cfg[i].gedrag = (uint8_t)(1 + i % 3);
    p.cfg[i].functieA = 0;
    p.cfg[i].functieB = 1;
  }
  p.ruw = 0xFFFF; // alles al actief bij het opstarten
  p.loop(10000);
  TEST_ASSERT_EQUAL(0, (int)p.op.size());
  for (int i = 0; i < N_INGANGEN; i++) TEST_ASSERT_TRUE(p.in.t[i].actief);
}

void test_baan_drukknop_wisselt_functie() {
  Baan b;
  b.cfg.ingang[0].gedrag = GEDRAG_DRUKKNOP;
  b.cfg.ingang[0].functieA = 0; // "Overweg"
  b.cfg.ingang[0].wisselen = true;
  uint32_t t = 0;
  auto loop = [&](uint16_t ruw, uint32_t dt) {
    for (uint32_t e = t + dt; t < e; t += 10) b.tick(t, ruw);
  };
  loop(0, 100);
  loop(1, 100);
  TEST_ASSERT_TRUE(b.seq.loopt(0));
  TEST_ASSERT_TRUE(b.lampen.stand[2].aan);
  loop(0, 100);
  loop(1, 100); // nog eens: stoppen
  TEST_ASSERT_FALSE(b.seq.loopt(0));
  TEST_ASSERT_FALSE(b.lampen.stand[2].aan);
  TEST_ASSERT_EQUAL(1, b.ingangRuw);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_stuiterende_knop_geeft_een_druk);
  RUN_TEST(test_ontdendering_bij_lezen_elke_5_ms);
  RUN_TEST(test_te_korte_puls_telt_niet);
  RUN_TEST(test_drukknop_met_en_zonder_wisselen);
  RUN_TEST(test_schakelaar_a_bij_aan_b_bij_uit);
  RUN_TEST(test_sensor_met_nalooptijd);
  RUN_TEST(test_sensor_zonder_nalopen);
  RUN_TEST(test_opstarten_geeft_geen_opdrachten);
  RUN_TEST(test_baan_drukknop_wisselt_functie);
  return UNITY_END();
}
