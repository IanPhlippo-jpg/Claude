// Tests van het regelhart (include/regel.h) op de pc: python -m platformio test -e native
// Foutinjectie zonder hardware: sensoruitval, CRC-fouten, verouderde metingen, ijken zonder of met foute metingen,
// stilstand op elke stand, UIT tijdens het ijken, boost zonder knop, verbindingsverlies, stroomherstel, twee sets,
// zachte start en de grens van de gewone standen.
#include <unity.h>

#include "regel.h"

using namespace afzuiging;

namespace {

Opdracht cmd(bool aan, int pct, uint8_t ijk = 0, uint8_t boost = 0, uint16_t sessie = 7, uint32_t volgnr = 1) {
  Opdracht o;
  o.aan = aan;
  o.pct = (uint8_t)pct;
  o.ijk = ijk;
  o.boost = boost;
  o.sessie = sessie;
  o.volgnr = volgnr;
  return o;
}

/** de klok laten lopen: elke 250 ms een meting (pa(t) of mislukt), elke stap de regeling; toeren vast */
void loop(Regelaar &r, uint32_t &nu, uint32_t tot, float pa, bool ok = true, uint16_t rpm = 2000) {
  for (; nu < tot; nu += 250) {
    r.tacho(rpm);
    r.meting(ok, pa, nu);
    r.stap(nu);
  }
}

/** een geslaagde ijking: druk stijgt met de stand */
void ijk(Regelaar &r, uint32_t &nu) {
  r.opdracht(cmd(true, 50, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, 20);
  r.opdracht(cmd(true, 50, 1, 0, 7, 2), nu);
  for (int p = 0; p < 5; p++) loop(r, nu, nu + 8000, 20.0f + 30.0f * p);
  loop(r, nu, nu + 500, 50);
}

} // namespace

void setUp() {}
void tearDown() {}

void test_stroomherstel_start_uit() {
  Regelaar r;
  uint32_t nu = 1000;
  loop(r, nu, 5000, 30);
  TEST_ASSERT_FALSE(r.aan);
  TEST_ASSERT_EQUAL(0, r.stap(nu));
}

void test_uit_heeft_voorrang_op_ijken_op_elk_punt() {
  for (int punt = 0; punt < 5; punt++) {
    Regelaar r;
    uint32_t nu = 1000;
    r.opdracht(cmd(true, 50, 0, 0, 7, 1), nu);
    loop(r, nu, nu + 1000, 20);
    r.opdracht(cmd(true, 50, 1, 0, 7, 2), nu);
    loop(r, nu, nu + 8000 * punt + 3000, 20.0f + 30.0f * punt);
    TEST_ASSERT_TRUE(r.ijkStap > 0);
    r.opdracht(cmd(false, 50, 1, 0, 7, 3), nu);
    TEST_ASSERT_EQUAL(0, r.stap(nu)); // in dezelfde regelstap stil
    TEST_ASSERT_EQUAL(0, r.ijkStap);
    TEST_ASSERT_EQUAL(IJK_AFGEBROKEN, r.ijkFout);
    TEST_ASSERT_FALSE(r.geijkt); // geen half ijkresultaat bewaard
  }
}

void test_ijken_zonder_metingen_houdt_oude_ijking() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  TEST_ASSERT_TRUE(r.geijkt);
  float oud[5];
  for (int i = 0; i < 5; i++) oud[i] = r.ijking()[i];
  r.nieuweIjking = false;
  // ijkvraag, daarna valt de meter weg (NACK)
  r.opdracht(cmd(true, 50, 2, 0, 7, 10), nu);
  loop(r, nu, nu + 9000, 0, false);
  TEST_ASSERT_EQUAL(IJK_GEEN_METING, r.ijkFout);
  TEST_ASSERT_FALSE(r.nieuweIjking);
  for (int i = 0; i < 5; i++) TEST_ASSERT_EQUAL_FLOAT(oud[i], r.ijking()[i]);
}

void test_ijken_slang_verkeerd_om_of_los() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 50, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, -15);
  r.opdracht(cmd(true, 50, 1, 0, 7, 2), nu);
  loop(r, nu, nu + 9000, -15); // negatieve druk: slang verkeerd om
  TEST_ASSERT_EQUAL(IJK_ONPLAUSIBEL, r.ijkFout);
  TEST_ASSERT_FALSE(r.geijkt);
}

void test_ijken_buiten_bereik() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 50, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, 100);
  r.opdracht(cmd(true, 50, 1, 0, 7, 2), nu);
  loop(r, nu, nu + 9000, 480); // boven 450 Pa: niet te vertrouwen
  TEST_ASSERT_NOT_EQUAL(IJK_OK, r.ijkFout);
  TEST_ASSERT_FALSE(r.geijkt);
}

void test_ijken_zonder_toeren() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 50, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, 20, true, 0);
  r.opdracht(cmd(true, 50, 1, 0, 7, 2), nu);
  loop(r, nu, nu + 9000, 20, true, 0);
  TEST_ASSERT_EQUAL(IJK_GEEN_TOEREN, r.ijkFout);
  TEST_ASSERT_FALSE(r.geijkt);
}

void test_ongeldige_opslag_niet_laden() {
  Regelaar r;
  const float nul[5] = {0, 0, 0, 0, 0};
  r.laadIjking(nul, 5);
  TEST_ASSERT_FALSE(r.geijkt);
  const float goed[5] = {10, 20, 30, 40, 50};
  r.laadIjking(goed, 5);
  TEST_ASSERT_TRUE(r.geijkt);
}

void test_oude_meting_wordt_ongeldig() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 60, 1, 0, 7, 20), nu);
  loop(r, nu, nu + 8000, 60);
  Status s;
  r.vulStatus(s, nu);
  TEST_ASSERT_TRUE(s.meetVers);
  TEST_ASSERT_FALSE(isnan(s.dp));
  // de meter valt weg (CRC-fouten): na 1 s is niets meer vers, dp en vol zijn NAN, de verbinding blijft
  loop(r, nu, nu + 1500, 60, false);
  r.vulStatus(s, nu);
  TEST_ASSERT_FALSE(s.meetVers);
  TEST_ASSERT_TRUE(isnan(s.dp));
  TEST_ASSERT_TRUE(isnan(s.vol));
  TEST_ASSERT_FALSE(s.meter);
  // de meter komt terug: weer vers
  r.meterHersteld();
  loop(r, nu, nu + 1000, 60);
  r.vulStatus(s, nu);
  TEST_ASSERT_TRUE(s.meetVers);
}

void test_stilstand_op_elke_stand() {
  for (int pct = 20; pct <= 80; pct += 5) {
    Regelaar r;
    uint32_t nu = 1000;
    r.opdracht(cmd(true, pct, 0, 0, 7, 1), nu);
    loop(r, nu, nu + 7000, 20, true, 0); // tacho geeft niets
    TEST_ASSERT_EQUAL_MESSAGE(STORING_STIL, r.storing, "stilstand niet gemeld");
  }
}

void test_filter_vol_en_niet_te_bewaken_stand() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu); // 20, 50, 80, 110, 140 Pa bij 20..100 %
  r.opdracht(cmd(true, 40, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 8000, 100); // het dubbele van 50
  TEST_ASSERT_TRUE(r.vol >= 1.0f);
  r.opdracht(cmd(true, 80, 1, 0, 7, 31), nu);
  loop(r, nu, nu + 8000, 300); // 2 x 110 = 220 < 450: nog te bewaken
  TEST_ASSERT_FALSE(isnan(r.vol));
}

void test_boost_vervalt_in_de_module_zonder_knop() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 40, 0, 0, 7, 1), nu);
  r.opdracht(cmd(true, 40, 0, 1, 7, 2), nu);
  loop(r, nu, nu + 2000, 20); // zachte start
  TEST_ASSERT_EQUAL(100, r.stap(nu));
  loop(r, nu, nu + 117000, 20); // geen opdrachten meer (radio weg)
  TEST_ASSERT_EQUAL(100, r.stap(nu));
  loop(r, nu, nu + 1250, 20);
  TEST_ASSERT_EQUAL(40, r.stap(nu)); // terug naar de gewone stand, niet uit
}

void test_herstart_van_de_knop_is_geen_boost_of_ijkvraag() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 40, 3, 5, 7, 1), nu);
  r.opdracht(cmd(true, 40, 0, 0, 99, 1), nu); // nieuwe sessie met andere tellers
  loop(r, nu, nu + 1000, 20);
  TEST_ASSERT_EQUAL(40, r.stap(nu));
  TEST_ASSERT_EQUAL(0, r.ijkStap);
}

void test_verbindingsverlies_houdt_de_stand() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 600000, 20); // 10 minuten niets van de knop
  TEST_ASSERT_EQUAL(60, r.stap(nu));
}

void test_zachte_start_en_meteen_uit() {
  Regelaar r;
  uint32_t nu = 1000;
  r.stap(nu);
  r.opdracht(cmd(true, 80, 0, 0, 7, 1), nu);
  nu += 250;
  TEST_ASSERT_TRUE(r.stap(nu) <= 13); // 50 %/s: na 0,25 s hooguit 13 %
  loop(r, nu, nu + 2000, 20);
  TEST_ASSERT_EQUAL(80, r.stap(nu));
  r.opdracht(cmd(false, 80, 0, 0, 7, 2), nu);
  TEST_ASSERT_EQUAL(0, r.stap(nu)); // UIT meteen
}

void test_gewone_stand_hooguit_80_boost_100() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 100, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 3000, 20);
  TEST_ASSERT_EQUAL(80, r.stap(nu));
  r.opdracht(cmd(true, 80, 0, 1, 7, 2), nu);
  loop(r, nu, nu + 3000, 20);
  TEST_ASSERT_EQUAL(100, r.stap(nu));
}

void test_twee_sets_en_herhaalde_berichten() {
  Koppeling k;
  const uint8_t knopA[6] = {1, 2, 3, 4, 5, 6}, knopB[6] = {9, 9, 9, 9, 9, 9};
  Koppel v;
  for (int i = 0; i < 16; i++) v.sleutel[i] = (uint8_t)i;
  TEST_ASSERT_TRUE(k.vraag(knopA, v, 5000));
  TEST_ASSERT_FALSE(k.vraag(knopB, v, 70000)); // na het koppelvenster
  TEST_ASSERT_TRUE(k.aanvaard(knopA, cmd(true, 50, 0, 0, 7, 1)));
  TEST_ASSERT_FALSE(k.aanvaard(knopB, cmd(true, 100, 0, 0, 7, 2))); // andere set
  TEST_ASSERT_FALSE(k.aanvaard(knopA, cmd(true, 50, 0, 0, 7, 1)));  // herhaald volgnummer
  TEST_ASSERT_TRUE(k.aanvaard(knopA, cmd(true, 50, 0, 0, 7, 2)));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_stroomherstel_start_uit);
  RUN_TEST(test_uit_heeft_voorrang_op_ijken_op_elk_punt);
  RUN_TEST(test_ijken_zonder_metingen_houdt_oude_ijking);
  RUN_TEST(test_ijken_slang_verkeerd_om_of_los);
  RUN_TEST(test_ijken_buiten_bereik);
  RUN_TEST(test_ijken_zonder_toeren);
  RUN_TEST(test_ongeldige_opslag_niet_laden);
  RUN_TEST(test_oude_meting_wordt_ongeldig);
  RUN_TEST(test_stilstand_op_elke_stand);
  RUN_TEST(test_filter_vol_en_niet_te_bewaken_stand);
  RUN_TEST(test_boost_vervalt_in_de_module_zonder_knop);
  RUN_TEST(test_herstart_van_de_knop_is_geen_boost_of_ijkvraag);
  RUN_TEST(test_verbindingsverlies_houdt_de_stand);
  RUN_TEST(test_zachte_start_en_meteen_uit);
  RUN_TEST(test_gewone_stand_hooguit_80_boost_100);
  RUN_TEST(test_twee_sets_en_herhaalde_berichten);
  return UNITY_END();
}
