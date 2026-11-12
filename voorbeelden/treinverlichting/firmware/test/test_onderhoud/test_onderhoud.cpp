// Tests van de onderhoudshulpjes (include/onderhoud.h) op de pc:  python -m platformio test -e native
// De BOOT-knop (5 s vasthouden), het opnieuw starten van de hotspot en de controle van een nieuwe firmware.
#include <unity.h>

#include <vector>

#include "onderhoud.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {
/** de knop elke 10 ms lezen van t0 tot t1 (ms) met dezelfde stand; geeft hoe vaak er gemeld werd */
int houd(LangeDruk &k, bool in, uint32_t t0, uint32_t t1) {
  int n = 0;
  for (uint32_t t = t0; t < t1; t += 10) n += k.stap(in, t) ? 1 : 0;
  return n;
}
} // namespace

void test_lange_druk_meldt_na_5_s_precies_een_keer() {
  LangeDruk k;
  TEST_ASSERT_EQUAL(0, houd(k, false, 0, 1000));
  TEST_ASSERT_EQUAL(0, houd(k, true, 1000, 5990)); // 4,99 s: nog niet
  TEST_ASSERT_EQUAL(1, houd(k, true, 5990, 6100)); // net na 5 s
  TEST_ASSERT_EQUAL(0, houd(k, true, 6100, 20000)); // blijven vasthouden: geen tweede keer
  TEST_ASSERT_EQUAL(0, houd(k, false, 20000, 21000));
  TEST_ASSERT_EQUAL(1, houd(k, true, 21000, 27000)); // opnieuw: weer één keer
}

void test_lange_druk_kort_drukken_telt_niet() {
  LangeDruk k;
  houd(k, false, 0, 100);
  for (int i = 0; i < 20; i++) {
    TEST_ASSERT_EQUAL(0, houd(k, true, 100 + i * 1000, 100 + i * 1000 + 900)); // 0,9 s drukken
    TEST_ASSERT_EQUAL(0, houd(k, false, 100 + i * 1000 + 900, 100 + (i + 1) * 1000));
  }
}

void test_lange_druk_dendert_niet() {
  // een knop die stuitert (elke 20 ms los) begint telkens opnieuw te tellen: geen melding
  LangeDruk k;
  houd(k, false, 0, 100);
  int n = 0;
  for (uint32_t t = 100; t < 8000; t += 10) n += k.stap((t / 10) % 2 == 0, t) ? 1 : 0;
  TEST_ASSERT_EQUAL(0, n);
  // een korte onderbreking van 30 ms (onder de ontdendertijd) laat het tellen opnieuw beginnen, niet melden
  LangeDruk k2;
  houd(k2, false, 0, 100);
  TEST_ASSERT_EQUAL(0, houd(k2, true, 100, 3000));
  TEST_ASSERT_EQUAL(0, houd(k2, false, 3000, 3030));
  TEST_ASSERT_EQUAL(0, houd(k2, true, 3030, 8000)); // 4,97 s na de onderbreking
  TEST_ASSERT_EQUAL(1, houd(k2, true, 8000, 8200));
}

void test_lange_druk_niet_bij_opstarten_al_ingedrukt() {
  // de BOOT-knop bij het aanzetten ingedrukt (flashmodus): pas tellen na loslaten
  LangeDruk k;
  TEST_ASSERT_EQUAL(0, houd(k, true, 0, 20000));
  TEST_ASSERT_EQUAL(0u, k.vast(20000));
  TEST_ASSERT_EQUAL(0, houd(k, false, 20000, 20500));
  TEST_ASSERT_EQUAL(1, houd(k, true, 20500, 26000));
}

void test_lange_druk_millis_loopt_rond() {
  LangeDruk k;
  uint32_t t0 = 0xFFFFF000u;
  houd(k, false, t0, t0 + 100);
  int n = 0;
  for (uint32_t i = 0; i < 600; i++) n += k.stap(true, t0 + 100 + i * 10) ? 1 : 0;
  TEST_ASSERT_EQUAL(1, n);
}

void test_hotspot_goed_niets_doen() {
  HotspotWacht w;
  for (uint32_t t = 0; t < 600000; t += 100) TEST_ASSERT_FALSE(w.kijk(true, t));
  TEST_ASSERT_EQUAL(0u, w.herstarts);
}

void test_hotspot_weg_opnieuw_starten_met_wachttijd() {
  HotspotWacht w;
  std::vector<uint32_t> momenten;
  for (uint32_t t = 0; t < 300000; t += 100)
    if (w.kijk(false, t)) momenten.push_back(t);
  // eerste keer na 10 s, dan 10, 20, 40 s, en daarna nooit vaker dan elke 60 s
  TEST_ASSERT_TRUE(momenten.size() >= 5);
  TEST_ASSERT_EQUAL(10000u, momenten[0]);
  TEST_ASSERT_EQUAL(20000u, momenten[1]);
  TEST_ASSERT_EQUAL(40000u, momenten[2]);
  TEST_ASSERT_EQUAL(80000u, momenten[3]);
  for (size_t i = 4; i < momenten.size(); i++) TEST_ASSERT_EQUAL(60000u, momenten[i] - momenten[i - 1]);
  // terug goed: de wachttijd begint weer bij 10 s
  uint32_t t = momenten.back() + 60000;
  TEST_ASSERT_FALSE(w.kijk(true, t));
  TEST_ASSERT_EQUAL(HOTSPOT_KIJK_MS, w.wacht());
}

void test_update_goede_firmware() {
  UpdateControle c;
  TEST_ASSERT_NULL(c.begin(1200000, 6553600));
  std::vector<uint8_t> blok(4096, 0x55);
  blok[0] = 0xE9;
  TEST_ASSERT_NULL(c.stuk(blok.data(), blok.size()));
  blok[0] = 0x00; // alleen de eerste byte telt
  for (int i = 0; i < 200; i++) TEST_ASSERT_NULL(c.stuk(blok.data(), blok.size()));
  TEST_ASSERT_NULL(c.einde());
  TEST_ASSERT_EQUAL(201u * 4096u, c.ontvangen());
}

void test_update_fout_bestand() {
  UpdateControle c;
  TEST_ASSERT_NULL(c.begin(0, 6553600)); // grootte onbekend (multipart)
  const uint8_t elf[4] = {0x7F, 'E', 'L', 'F'};
  TEST_ASSERT_NOT_NULL(c.stuk(elf, 4));
  // te groot: vooraf en tijdens het ontvangen
  UpdateControle d;
  TEST_ASSERT_NOT_NULL(d.begin(7000000, 6553600));
  UpdateControle e;
  TEST_ASSERT_NULL(e.begin(0, 8192));
  std::vector<uint8_t> blok(4096, 0);
  blok[0] = 0xE9;
  TEST_ASSERT_NULL(e.stuk(blok.data(), blok.size()));
  TEST_ASSERT_NULL(e.stuk(blok.data(), blok.size()));
  TEST_ASSERT_NOT_NULL(e.stuk(blok.data(), 1));
  // geen vrij slot, leeg bestand
  UpdateControle f;
  TEST_ASSERT_NOT_NULL(f.begin(100, 0));
  UpdateControle g;
  TEST_ASSERT_NULL(g.begin(0, 8192));
  TEST_ASSERT_NOT_NULL(g.einde());
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_lange_druk_meldt_na_5_s_precies_een_keer);
  RUN_TEST(test_lange_druk_kort_drukken_telt_niet);
  RUN_TEST(test_lange_druk_dendert_niet);
  RUN_TEST(test_lange_druk_niet_bij_opstarten_al_ingedrukt);
  RUN_TEST(test_lange_druk_millis_loopt_rond);
  RUN_TEST(test_hotspot_goed_niets_doen);
  RUN_TEST(test_hotspot_weg_opnieuw_starten_met_wachttijd);
  RUN_TEST(test_update_goede_firmware);
  RUN_TEST(test_update_fout_bestand);
  return UNITY_END();
}
