// Tests van de hotspot, het aanmelden en de BOOT-knop (include/wifiplan.h) op de pc:  python -m platformio test -e native
#include <unity.h>

#include "wifiplan.h"

using namespace gk;

void setUp() {}
void tearDown() {}

namespace {
/** elke 100 ms een stap van t0 tot t1; telt de acties */
struct Teller { int aan = 0, uit = 0; };
Teller loop(WifiKeuze &w, bool verbonden, int klanten, uint32_t t0, uint32_t t1) {
  Teller t;
  for (uint32_t ms = t0; ms < t1; ms += 100) {
    WifiActie a = w.stap(verbonden, klanten, ms);
    if (a == WifiActie::hotspotAan) t.aan++;
    if (a == WifiActie::hotspotUit) t.uit++;
  }
  return t;
}
int meld(Aanmelder &a, bool verbonden, uint32_t t0, uint32_t t1, bool gelukt = true) {
  int n = 0;
  for (uint32_t ms = t0; ms < t1; ms += 100)
    if (a.stap(verbonden, ms)) { n++; a.klaar(gelukt, ms); }
  return n;
}
} // namespace

void test_hotspot_pas_na_60_s_zonder_verbinding() {
  WifiKeuze w;
  w.start(0);
  TEST_ASSERT_EQUAL(0, loop(w, false, 0, 0, 59900).aan);
  TEST_ASSERT_FALSE(w.hotspot());
  TEST_ASSERT_EQUAL(1, loop(w, false, 0, 59900, 200000).aan); // precies één keer
  TEST_ASSERT_TRUE(w.hotspot());
}

void test_verbonden_binnen_60_s_geen_hotspot() {
  WifiKeuze w;
  w.start(0);
  loop(w, false, 0, 0, 20000);
  Teller t = loop(w, true, 0, 20000, 500000);
  TEST_ASSERT_EQUAL(0, t.aan);
  TEST_ASSERT_FALSE(w.hotspot());
}

void test_hotspot_uit_als_verbonden_en_niemand_eraan() {
  WifiKeuze w;
  w.start(0);
  loop(w, false, 0, 0, 70000);
  TEST_ASSERT_TRUE(w.hotspot());
  // verbonden, maar iemand hangt aan de hotspot (Ian stelt de wifi in): blijft aan
  TEST_ASSERT_EQUAL(0, loop(w, true, 1, 70000, 120000).uit);
  TEST_ASSERT_TRUE(w.hotspot());
  // niemand meer: na 10 s verbonden uit (de tijd telt vanaf het verbinden, dus meteen)
  TEST_ASSERT_EQUAL(1, loop(w, true, 0, 120000, 130000).uit);
  TEST_ASSERT_FALSE(w.hotspot());
}

void test_verbinding_kwijt_opnieuw_60_s() {
  WifiKeuze w;
  w.start(0);
  loop(w, true, 0, 0, 100000);
  TEST_ASSERT_EQUAL(0, loop(w, false, 0, 100000, 159900).aan);
  TEST_ASSERT_EQUAL(1, loop(w, false, 0, 159900, 170000).aan);
}

void test_millis_loopt_rond() {
  WifiKeuze w;
  uint32_t t0 = 0xFFFFFFFFu - 30000;
  w.start(t0);
  int aan = 0;
  for (uint32_t i = 0; i < 700; i++) if (w.stap(false, 0, t0 + i * 100) == WifiActie::hotspotAan) aan++;
  TEST_ASSERT_EQUAL(1, aan);
}

void test_aanmelden_elke_30_s() {
  Aanmelder a;
  TEST_ASSERT_EQUAL(0, meld(a, false, 0, 100000));
  // verbonden op 100 s: eerst na 1,5 s, daarna elke 30 s: 101,5 / 131,5 / 161,5 / 191,5 -> 4 keer tot 200 s
  TEST_ASSERT_EQUAL(4, meld(a, true, 100000, 200000));
  TEST_ASSERT_TRUE(a.gelukt());
}

void test_aanmelden_mislukt_na_10_s_opnieuw() {
  Aanmelder a;
  // 1,5 s en dan elke 10 s: 1,5 / 11,5 / 21,5 / 31,5 / 41,5 / 51,5 -> 6 keer tot 60 s
  TEST_ASSERT_EQUAL(6, meld(a, true, 0, 60000, false));
  TEST_ASSERT_FALSE(a.gelukt());
}

void test_aanmelden_snel_na_een_wijziging() {
  Aanmelder a;
  meld(a, true, 0, 5000); // gemeld op 1,5 s; volgende op 31,5 s
  a.snel(5000);
  TEST_ASSERT_EQUAL(1, meld(a, true, 5000, 6100)); // binnen 1 s
  TEST_ASSERT_EQUAL(0, meld(a, true, 6100, 35900)); // daarna weer 30 s rust
  TEST_ASSERT_EQUAL(1, meld(a, true, 35900, 36200));
}

void test_niet_verbonden_snel_doet_niets() {
  Aanmelder a;
  a.snel(0);
  TEST_ASSERT_EQUAL(0, meld(a, false, 0, 10000));
}

void test_boot_knop_5_s() {
  LangeDruk k;
  int n = 0;
  for (uint32_t t = 0; t < 1000; t += 10) n += k.stap(false, t);
  for (uint32_t t = 1000; t < 5990; t += 10) n += k.stap(true, t);
  TEST_ASSERT_EQUAL(0, n);
  for (uint32_t t = 5990; t < 20000; t += 10) n += k.stap(true, t);
  TEST_ASSERT_EQUAL(1, n);
}

void test_boot_knop_ingedrukt_bij_opstarten_telt_niet() {
  LangeDruk k;
  int n = 0;
  for (uint32_t t = 0; t < 10000; t += 10) n += k.stap(true, t);
  TEST_ASSERT_EQUAL(0, n);
  for (uint32_t t = 10000; t < 11000; t += 10) n += k.stap(false, t);
  for (uint32_t t = 11000; t < 17000; t += 10) n += k.stap(true, t);
  TEST_ASSERT_EQUAL(1, n);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_hotspot_pas_na_60_s_zonder_verbinding);
  RUN_TEST(test_verbonden_binnen_60_s_geen_hotspot);
  RUN_TEST(test_hotspot_uit_als_verbonden_en_niemand_eraan);
  RUN_TEST(test_verbinding_kwijt_opnieuw_60_s);
  RUN_TEST(test_millis_loopt_rond);
  RUN_TEST(test_aanmelden_elke_30_s);
  RUN_TEST(test_aanmelden_mislukt_na_10_s_opnieuw);
  RUN_TEST(test_aanmelden_snel_na_een_wijziging);
  RUN_TEST(test_niet_verbonden_snel_doet_niets);
  RUN_TEST(test_boot_knop_5_s);
  RUN_TEST(test_boot_knop_ingedrukt_bij_opstarten_telt_niet);
  return UNITY_END();
}
