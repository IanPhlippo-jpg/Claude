// Tests van het regelhart (include/regel.h) op de pc: python -m platformio test -e native
// Foutinjectie zonder hardware: sensoruitval, CRC-fouten, verouderde metingen, ijken zonder of met foute metingen,
// stilstand op elke stand, UIT tijdens het ijken, boost zonder knop, herhaalde boost (tegoed), verbindingsverlies,
// stroomherstel, twee sets, overschrijven van een koppeling, vroegere sessies, zachte start bij elke regelstap,
// stabiliseren na een standwissel, lage standen, meetbereik en de toerentalregeling.
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

// gesimuleerde ventilator: toerental evenredig met de PWM (45 omw/min per %, 4500 bij 100 %)
float versterking = 45;
uint16_t fan(const Regelaar &r) { return (uint16_t)(versterking * r.gegeven); }

/** de klok laten lopen in stappen van dt: elke 250 ms een meting (pa of mislukt) en het toerental (rpm < 0: de
 *  gesimuleerde ventilator), elke stap de regeling */
void loop(Regelaar &r, uint32_t &nu, uint32_t tot, float pa, bool ok = true, int rpm = -1, uint32_t dt = 250) {
  for (; nu < tot; nu += dt) {
    if (nu % 250 < dt) {
      r.tacho(rpm < 0 ? fan(r) : (uint16_t)rpm, nu);
      r.meting(ok, pa, nu);
    }
    r.stap(nu);
  }
}

/** een geslaagde ijking: druk stijgt met de stand (20, 50, 80, 110, 140 Pa bij PWM 20..100 %, of vanaf `basis`) */
void ijk(Regelaar &r, uint32_t &nu, float basis = 20, float stap = 30) {
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, basis);
  r.opdracht(cmd(true, 60, 1, 0, 7, 2), nu);
  for (int p = 0; p < 5; p++) loop(r, nu, nu + 8000, basis + stap * p);
  loop(r, nu, nu + 500, basis + stap * 2);
}

} // namespace

void setUp() { versterking = 45; }
void tearDown() {}

void test_stroomherstel_start_uit() {
  Regelaar r;
  uint32_t nu = 1000;
  loop(r, nu, 5000, 30);
  TEST_ASSERT_FALSE(r.aan);
  TEST_ASSERT_EQUAL(0, r.stap(nu));
  TEST_ASSERT_EQUAL(BEW_UIT, r.bewaking);
}

void test_uit_heeft_voorrang_op_ijken_op_elk_punt() {
  for (int punt = 0; punt < 5; punt++) {
    Regelaar r;
    uint32_t nu = 1000;
    r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
    loop(r, nu, nu + 1000, 20);
    r.opdracht(cmd(true, 60, 1, 0, 7, 2), nu);
    loop(r, nu, nu + 8000 * punt + 3000, 20.0f + 30.0f * punt);
    TEST_ASSERT_TRUE(r.ijkStap > 0);
    r.opdracht(cmd(false, 60, 1, 0, 7, 3), nu);
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
  r.opdracht(cmd(true, 60, 2, 0, 7, 10), nu); // ijkvraag, daarna valt de meter weg (NACK)
  loop(r, nu, nu + 9000, 0, false);
  TEST_ASSERT_EQUAL(IJK_GEEN_METING, r.ijkFout);
  TEST_ASSERT_FALSE(r.nieuweIjking);
  for (int i = 0; i < 5; i++) TEST_ASSERT_EQUAL_FLOAT(oud[i], r.ijking()[i]);
}

void test_ijken_slang_verkeerd_om_of_los() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, -15);
  r.opdracht(cmd(true, 60, 1, 0, 7, 2), nu);
  loop(r, nu, nu + 9000, -15); // negatieve druk: slang verkeerd om
  TEST_ASSERT_EQUAL(IJK_ONPLAUSIBEL, r.ijkFout);
  TEST_ASSERT_FALSE(r.geijkt);
}

void test_ijken_buiten_bereik() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, 100);
  r.opdracht(cmd(true, 60, 1, 0, 7, 2), nu);
  loop(r, nu, nu + 9000, 480); // boven 450 Pa: niet te vertrouwen
  TEST_ASSERT_NOT_EQUAL(IJK_OK, r.ijkFout);
  TEST_ASSERT_FALSE(r.geijkt);
}

void test_ijken_zonder_toeren() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, 20, true, 0);
  r.opdracht(cmd(true, 60, 1, 0, 7, 2), nu);
  loop(r, nu, nu + 9000, 20, true, 0);
  TEST_ASSERT_EQUAL(IJK_GEEN_TOEREN, r.ijkFout);
  TEST_ASSERT_FALSE(r.geijkt);
}

void test_ongeldige_opslag_niet_laden() {
  Regelaar r;
  const float nul[5] = {0, 0, 0, 0, 0}, t[5] = {900, 1800, 2700, 3600, 4500};
  r.laadIjking(nul, t, 5);
  TEST_ASSERT_FALSE(r.geijkt);
  const float goed[5] = {10, 20, 30, 40, 50}, vlak[5] = {2000, 2000, 2000, 2000, 2000};
  r.laadIjking(goed, vlak, 5); // toerental stijgt niet: ongeldig
  TEST_ASSERT_FALSE(r.geijkt);
  r.laadIjking(goed, t, 5);
  TEST_ASSERT_TRUE(r.geijkt);
}

void test_oude_meting_wordt_ongeldig() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 60, 1, 0, 7, 20), nu);
  loop(r, nu, nu + 8000, 80);
  Status s;
  r.vulStatus(s, nu);
  TEST_ASSERT_TRUE(s.meetVers);
  TEST_ASSERT_FALSE(isnan(s.dp));
  // de meter valt weg (CRC-fouten): na 1 s is niets meer vers, dp en vol zijn NAN, de verbinding blijft
  loop(r, nu, nu + 1500, 80, false);
  r.vulStatus(s, nu);
  TEST_ASSERT_FALSE(s.meetVers);
  TEST_ASSERT_TRUE(isnan(s.dp));
  TEST_ASSERT_TRUE(isnan(s.vol));
  TEST_ASSERT_FALSE(s.meter);
  TEST_ASSERT_EQUAL(BEW_GEEN_METING, s.bewaking);
  r.meterHersteld();
  loop(r, nu, nu + 1000, 80);
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

void test_filter_vervangen_per_stand_en_lage_stand() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu); // 20, 50, 80, 110, 140 Pa bij 900..4500 omw/min
  // 80 %: schoon 110 Pa, vervangen bij 1,58 x = 174 Pa
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 8000, 150);
  TEST_ASSERT_EQUAL(BEW_OK, r.bewaking);
  TEST_ASSERT_TRUE(r.vol > 0.5f && r.vol < 1.0f);
  loop(r, nu, nu + 8000, 185);
  TEST_ASSERT_TRUE(r.vol >= 1.0f);
  // 40 %: haalt het minimumdebiet niet: geen oordeel, wel gezegd
  r.opdracht(cmd(true, 40, 1, 0, 7, 31), nu);
  loop(r, nu, nu + 8000, 60);
  TEST_ASSERT_EQUAL(BEW_LAGE_STAND, r.bewaking);
  TEST_ASSERT_TRUE(isnan(r.vol));
}

void test_geen_oude_melding_tijdens_stabiliseren() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 8000, 190);
  TEST_ASSERT_TRUE(r.vol >= 1.0f);
  r.opdracht(cmd(true, 60, 1, 0, 7, 31), nu);
  r.stap(nu);
  TEST_ASSERT_EQUAL(BEW_STABILISEREN, r.bewaking);
  TEST_ASSERT_TRUE(isnan(r.vol)); // de melding van 80 % hoort niet bij 60 %
  Status s;
  r.vulStatus(s, nu);
  TEST_ASSERT_TRUE(isnan(s.vol));
}

void test_grens_boven_het_meetbereik_wordt_gemeld() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu, 100, 50); // 100..300 Pa: bij 100 % is 1,88 x 300 = 564 Pa > 450
  r.opdracht(cmd(true, 80, 1, 1, 7, 30), nu); // boost
  loop(r, nu, nu + 9000, 300);
  TEST_ASSERT_EQUAL(100, r.stand);
  TEST_ASSERT_EQUAL(BEW_BUITEN_BEREIK, r.bewaking);
  TEST_ASSERT_TRUE(isnan(r.vol));
  // een meting boven het bereik: ook buiten bereik, niet "geen meting"
  loop(r, nu, nu + 2000, 470);
  TEST_ASSERT_EQUAL(BEW_BUITEN_BEREIK, r.bewaking);
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

void test_herhaalde_boost_blijft_binnen_het_tegoed() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  uint32_t op100 = 0, volgnr = 2;
  uint8_t boost = 0;
  for (uint32_t t0 = nu; nu < t0 + 3600000;) {
    if ((nu - t0) % 60000 == 0) r.opdracht(cmd(true, 60, 0, ++boost, 7, volgnr++), nu); // elke minuut boost vragen
    nu += 250;
    if (r.stap(nu) == 100) op100 += 250;
  }
  // tegoed 120 s, terug aan 1/4: na een uur hoogstens 120 + 3480 / 5 = 816 s op 100 %
  TEST_ASSERT_TRUE(op100 <= 830000);
  TEST_ASSERT_TRUE(op100 >= 600000); // maar boost werkt wel
  // meteen na een volle boost: geweigerd
  Regelaar q;
  nu = 1000;
  q.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  q.opdracht(cmd(true, 60, 0, 1, 7, 2), nu);
  loop(q, nu, nu + 121000, 20);
  q.opdracht(cmd(true, 60, 0, 2, 7, 3), nu);
  TEST_ASSERT_TRUE(q.boostGeweigerd);
  TEST_ASSERT_EQUAL(0u, q.boostTot);
}

void test_herstart_van_de_knop_is_geen_boost_of_ijkvraag() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 40, 3, 5, 7, 1), nu);
  r.opdracht(cmd(true, 40, 0, 0, 8, 1), nu); // nieuwe sessie met andere tellers
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

void test_zachte_start_bij_elke_regelstap() {
  const uint32_t stappen[] = {1, 5, 10, 20, 250};
  for (uint32_t dt : stappen) {
    Regelaar r;
    uint32_t nu = 1000;
    r.stap(nu);
    r.opdracht(cmd(true, 80, 0, 0, 7, 1), nu);
    uint32_t t80 = 0, n = 0;
    while (nu < 4000) {
      nu += dt + (++n % 3 == 1 ? 1 : 0); // wat jitter
      const int p = r.stap(nu);
      if (nu - 1000 <= 1000) TEST_ASSERT_TRUE_MESSAGE(p <= 51, "te snel"); // 50 %/s
      if (p >= 80 && !t80) t80 = nu - 1000;
    }
    TEST_ASSERT_TRUE_MESSAGE(t80 >= 1590 && t80 <= 1900, "80 % niet na ongeveer 1,6 s");
    r.opdracht(cmd(false, 80, 0, 0, 7, 2), nu);
    TEST_ASSERT_EQUAL(0, r.stap(nu)); // UIT meteen
  }
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

void test_toerentalregeling_volgt_de_stand() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu); // 45 omw/min per % PWM
  versterking = 40; // de ventilator wordt zwakker: zelfde PWM, minder toeren
  r.opdracht(cmd(true, 60, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 60000, 80);
  const float doel = 0.60f * 4500;
  TEST_ASSERT_TRUE_MESSAGE(fabsf(r.toeren - doel) / doel < 0.03f, "toerental niet bijgeregeld");
  TEST_ASSERT_TRUE(r.gegeven > 60); // meer PWM nodig
}

void test_koppeling_niet_overschrijven_en_sessies() {
  Koppeling k;
  const uint8_t knopA[6] = {1, 2, 3, 4, 5, 6}, knopB[6] = {9, 9, 9, 9, 9, 9};
  Koppel v;
  for (int i = 0; i < 16; i++) v.sleutel[i] = (uint8_t)i;
  v.uitdaging = 0;
  TEST_ASSERT_FALSE(k.vraag(knopA, v, 5000)); // zonder uitdaging
  v.uitdaging = 0xA1B2C3D4;
  TEST_ASSERT_TRUE(k.vraag(knopA, v, 5000));
  TEST_ASSERT_FALSE(k.vraag(knopB, v, 6000));  // binnen het venster, maar al gekoppeld: niet overschrijven
  TEST_ASSERT_FALSE(k.vraag(knopB, v, 70000)); // na het venster
  TEST_ASSERT_TRUE(k.aanvaard(knopA, cmd(true, 60, 0, 0, 7, 1)));
  TEST_ASSERT_FALSE(k.aanvaard(knopB, cmd(true, 80, 0, 0, 7, 2))); // andere set
  TEST_ASSERT_FALSE(k.aanvaard(knopA, cmd(true, 60, 0, 0, 7, 1)));  // herhaald volgnummer
  TEST_ASSERT_TRUE(k.aanvaard(knopA, cmd(true, 60, 0, 0, 7, 2)));
  TEST_ASSERT_TRUE(k.aanvaard(knopA, cmd(true, 60, 0, 0, 8, 1)));   // nieuwe sessie (knop herstart)
  TEST_ASSERT_FALSE(k.aanvaard(knopA, cmd(true, 60, 0, 0, 7, 99))); // een vroegere sessie
  // bewuste handeling: nu mag knop B koppelen, één keer
  TEST_ASSERT_TRUE(herkoppelHandeling(3));
  TEST_ASSERT_FALSE(herkoppelHandeling(2));
  k.herkoppelen = true;
  TEST_ASSERT_TRUE(k.vraag(knopB, v, 5000));
  TEST_ASSERT_FALSE(k.vraag(knopA, v, 5000));
  TEST_ASSERT_FALSE(k.aanvaard(knopA, cmd(true, 60, 0, 0, 9, 1)));
}

void test_knop_aanvaardt_alleen_de_eigen_uitdaging() {
  Koppel ok;
  ok.soort = SOORT_KOPPEL_OK;
  ok.uitdaging = 42;
  TEST_ASSERT_TRUE(koppelOkGeldig(ok, 42));
  TEST_ASSERT_FALSE(koppelOkGeldig(ok, 43));
  TEST_ASSERT_FALSE(koppelOkGeldig(ok, 0));
  ok.soort = SOORT_KOPPEL;
  TEST_ASSERT_FALSE(koppelOkGeldig(ok, 42));
}

void test_ijkvoortgang_loopt_op() {
  Regelaar r;
  uint32_t nu = 1000;
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 1000, 20);
  r.opdracht(cmd(true, 60, 1, 0, 7, 2), nu);
  const uint32_t start = nu;
  for (int p = 0; p < 2; p++) loop(r, nu, start + 8000 * (p + 1), 20.0f + 30.0f * p);
  loop(r, nu, start + 20000, 80);
  Status s;
  r.vulStatus(s, nu);
  TEST_ASSERT_EQUAL(BEW_IJKEN, s.bewaking);
  TEST_ASSERT_EQUAL(50, s.ijkVoortgang); // 20 van 40 s
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
  RUN_TEST(test_filter_vervangen_per_stand_en_lage_stand);
  RUN_TEST(test_geen_oude_melding_tijdens_stabiliseren);
  RUN_TEST(test_grens_boven_het_meetbereik_wordt_gemeld);
  RUN_TEST(test_boost_vervalt_in_de_module_zonder_knop);
  RUN_TEST(test_herhaalde_boost_blijft_binnen_het_tegoed);
  RUN_TEST(test_herstart_van_de_knop_is_geen_boost_of_ijkvraag);
  RUN_TEST(test_verbindingsverlies_houdt_de_stand);
  RUN_TEST(test_zachte_start_bij_elke_regelstap);
  RUN_TEST(test_gewone_stand_hooguit_80_boost_100);
  RUN_TEST(test_toerentalregeling_volgt_de_stand);
  RUN_TEST(test_koppeling_niet_overschrijven_en_sessies);
  RUN_TEST(test_knop_aanvaardt_alleen_de_eigen_uitdaging);
  RUN_TEST(test_ijkvoortgang_loopt_op);
  return UNITY_END();
}
