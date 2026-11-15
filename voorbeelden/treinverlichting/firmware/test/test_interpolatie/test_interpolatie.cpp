// Tests van de rijtijd en de fractie (include/bussen.h):  python -m platformio test -e native -f test_interpolatie
#include <unity.h>

#include "bussen.h"

using namespace trein;

void setUp() {}
void tearDown() {}

void test_voortschrijdend_gemiddelde() {
  Traject t;
  TEST_ASSERT_EQUAL_UINT32(RIJTIJD_START_MS, t.ms); // zonder metingen: 10 s
  TEST_ASSERT_TRUE(rijtijdErbij(t, 6000, 1));
  TEST_ASSERT_EQUAL_UINT32(6000, t.ms); // de eerste telt helemaal
  rijtijdErbij(t, 8000, 2);
  TEST_ASSERT_EQUAL_UINT32(7000, t.ms); // gemiddelde van 2
  rijtijdErbij(t, 10000, 3);
  TEST_ASSERT_EQUAL_UINT32(8000, t.ms); // van 3
  rijtijdErbij(t, 12000, 4);
  TEST_ASSERT_EQUAL_UINT32(9000, t.ms); // vanaf de vierde: een kwart
  for (int i = 0; i < 40; i++) rijtijdErbij(t, 5000, 5 + i);
  TEST_ASSERT_UINT32_WITHIN(20, 5000, t.ms); // volgt een nieuwe rijtijd
}

void test_uitschieters_tellen_niet() {
  Traject t;
  rijtijdErbij(t, 6000, 1);
  rijtijdErbij(t, 6000, 2);
  TEST_ASSERT_FALSE(rijtijdErbij(t, 100, 3));     // stoorpuls
  TEST_ASSERT_FALSE(rijtijdErbij(t, 30000, 4));   // stond stil (> 3 x)
  TEST_ASSERT_EQUAL_UINT32(6000, t.ms);
  TEST_ASSERT_EQUAL_UINT32(4, t.laatst);          // wel gereden
  TEST_ASSERT_TRUE(rijtijdErbij(t, 15000, 5));    // trager, maar geen uitschieter
  // de eerste metingen mogen wel ver van de startwaarde liggen
  Traject u;
  TEST_ASSERT_TRUE(rijtijdErbij(u, 45000, 1));
  TEST_ASSERT_EQUAL_UINT32(45000, u.ms);
}

void test_fractie() {
  TEST_ASSERT_EQUAL_FLOAT(0.0f, fractieVan(0, 10000));
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.42f, fractieVan(4200, 10000));
  TEST_ASSERT_EQUAL_FLOAT(FRACTIE_MAX, fractieVan(9900, 10000)); // nooit voorbij het volgende punt
  TEST_ASSERT_EQUAL_FLOAT(FRACTIE_MAX, fractieVan(60000, 10000));
  TEST_ASSERT_EQUAL_FLOAT(0.0f, fractieVan(500, 0));
}

void test_fractie_van_een_bus_met_klok_die_rondloopt() {
  PuntCfg p[MAX_PUNTEN];
  BusCfg b[MAX_BUSSEN];
  p[0].gebruikt = p[1].gebruikt = true;
  strcpy(p[0].id, "A");
  strcpy(p[0].volgende, "B");
  strcpy(p[1].id, "B");
  strcpy(p[1].volgende, "A");
  b[0].gebruikt = true;
  Volg v;
  uint32_t t0 = 0xFFFFF000u; // millis() loopt na 49 dagen rond
  v.handmatig(0, "A", p, t0);
  v.handmatig(0, "B", p, t0 + 8000); // A -> B: 8 s (over de nul heen)
  v.handmatig(0, "A", p, t0 + 16000);
  TEST_ASSERT_EQUAL_UINT32(8000, v.rijtijd("B", "A"));
  TEST_ASSERT_EQUAL_UINT32(RIJTIJD_START_MS, v.rijtijd("A", "X")); // nooit gereden: 10 s
  TEST_ASSERT_EQUAL_UINT32(8000, v.rijtijd("A", "B"));
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.5f, v.fractie(0, t0 + 16000 + 4000));
  // de halte gaf groen: vanaf het vertrek opnieuw tellen
  v.vertrek(0, t0 + 30000);
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.25f, v.fractie(0, t0 + 32000));
  // zonder volgend punt: 0
  strcpy(p[0].volgende, "");
  Volg w;
  w.handmatig(0, "A", p, 0);
  TEST_ASSERT_EQUAL_FLOAT(0.0f, w.fractie(0, 5000));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_voortschrijdend_gemiddelde);
  RUN_TEST(test_uitschieters_tellen_niet);
  RUN_TEST(test_fractie);
  RUN_TEST(test_fractie_van_een_bus_met_klok_die_rondloopt);
  return UNITY_END();
}
