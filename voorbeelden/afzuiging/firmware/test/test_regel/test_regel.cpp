// Tests van het regelhart (include/regel.h) op de pc: python -m platformio test -e native
// Foutinjectie zonder hardware: sensoruitval, CRC-fouten, verouderde metingen, ijken zonder of met foute metingen,
// stilstand op elke stand, UIT tijdens het ijken, boost zonder knop, herhaalde boost (tegoed), verbindingsverlies,
// stroomherstel, twee sets, overschrijven van een koppeling, vroegere sessies, zachte start bij elke regelstap,
// stabiliseren na een standwissel, lage standen, meetbereik en de toerentalregeling.
// Eindverslag v4: toerentalvolging (V4-04), filter ontbreekt of lekt en ijken als bevestigde onderhoudsstap (V4-13),
// ijking laden (V4-14), herstart en onbevestigde UIT (V4-12), koppelen per module (V4-11), boosttegoed na een start
// (V4-10).
// Versie 7.2 (advies Fable 5.2): "filter vervangen" op het minimum over 5 min met hysterese (hand op het rooster,
// luchtdichtheid en toerentalband geven geen valse melding), ander merk filter (eerste ijking wissen), ijking zonder filter
// geweigerd, stop na 3 s zonder filter of luchtstroom op elke stand, stop na 10 min zonder knop en na 4 uur zonder
// bediening, de knop toont de stop, tacho met ontdendering en periodemeting, koppelbewijs.
#include <unity.h>

#include "bediening.h"
#include "regel.h"

using namespace afzuiging;

namespace {

// startId 1 = dat van een Regelaar zonder opgave
Opdracht cmd(bool aan, int pct, uint8_t ijk = 0, uint8_t boost = 0, uint16_t sessie = 7, uint32_t volgnr = 1, uint32_t startId = 1) {
  Opdracht o;
  o.startId = startId;
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
bool zonderKnop = false; // 7.2: true = de knop zwijgt (anders leeft hij bij elke meting, zoals in het echt: 4 x per s)
uint16_t fan(const Regelaar &r) { return (uint16_t)(versterking * r.gegeven); }

/** de klok laten lopen in stappen van dt: elke 250 ms een meting (pa of mislukt) en het toerental (rpm < 0: de
 *  gesimuleerde ventilator), elke stap de regeling */
void loop(Regelaar &r, uint32_t &nu, uint32_t tot, float pa, bool ok = true, int rpm = -1, uint32_t dt = 250) {
  for (; nu < tot; nu += dt) {
    if (nu % 250 < dt) {
      if (!zonderKnop) r.knopLeeft(nu);
      r.tacho(rpm < 0 ? fan(r) : (uint16_t)rpm, nu);
      r.meting(ok, pa, nu);
    }
    r.stap(nu);
  }
}

/** een geslaagde ijking: druk stijgt met de stand (20, 50, 80, 110, 140 Pa bij PWM 20..100 %, of vanaf `basis`) */
void ijk(Regelaar &r, uint32_t &nu, float basis = 20, float stap = 30, uint8_t teller = 1) {
  r.opdracht(cmd(true, 60, (uint8_t)(teller - 1), 0, 7, 1), nu);
  loop(r, nu, nu + 1000, basis);
  r.opdracht(cmd(true, 60, teller, 0, 7, 2), nu);
  for (int p = 0; p < 5; p++) loop(r, nu, nu + 8000, basis + stap * p);
  loop(r, nu, nu + 500, basis + stap * 2);
}

} // namespace

void setUp() { versterking = 45; zonderKnop = false; }
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
  // 80 %: schoon 110 Pa, vervangen bij 1,29 x = 142 Pa (7.2: tussen 1,18 op 75 % en 1,40 op 85 %)
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 8000, 135);
  TEST_ASSERT_EQUAL(BEW_OK, r.bewaking);
  TEST_ASSERT_TRUE(r.vol > 0.5f && r.vol < 1.0f);
  loop(r, nu, nu + 8000, 150);
  // 7.2: 8 s boven de grens is nog geen melding (het minimum over 5 min beslist)
  TEST_ASSERT_TRUE(r.vol < 1.0f);
  TEST_ASSERT_FALSE(r.filterVol);
  loop(r, nu, nu + 330000, 150); // 5,5 min boven de grens: nu wel
  TEST_ASSERT_TRUE(r.vol >= 1.0f);
  TEST_ASSERT_TRUE(r.filterVol);
  // 40 %, 70 % en 75 %: halen het minimumdebiet niet zeker: geen oordeel, wel gezegd (80 % is de laagste beschermende)
  r.opdracht(cmd(true, 40, 1, 0, 7, 31), nu);
  loop(r, nu, nu + 8000, 60);
  TEST_ASSERT_EQUAL(BEW_LAGE_STAND, r.bewaking);
  TEST_ASSERT_TRUE(isnan(r.vol));
  r.opdracht(cmd(true, 70, 1, 0, 7, 32), nu);
  loop(r, nu, nu + 8000, 95);
  TEST_ASSERT_EQUAL(BEW_LAGE_STAND, r.bewaking);
  // 75 %: sinds versie 7.2 (opener rooster, grotere verdeelruimte) de laagste beschermende stand
  r.opdracht(cmd(true, 75, 1, 0, 7, 33), nu);
  loop(r, nu, nu + 8000, 102);
  TEST_ASSERT_EQUAL(BEW_OK, r.bewaking);
  TEST_ASSERT_FALSE(isnan(r.vol));
  // 80 %
  r.opdracht(cmd(true, 80, 1, 0, 7, 34), nu);
  loop(r, nu, nu + 8000, 112);
  TEST_ASSERT_EQUAL(BEW_OK, r.bewaking);
  TEST_ASSERT_TRUE(r.vol >= 0.0f && r.vol < 0.5f);
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
  ijk(r, nu, 150, 50); // 150..350 Pa: bij 100 % is 1,44 x 350 = 504 Pa > 450
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
  loop(r, nu, nu + 480000, 20); // V4-10: het tegoed begint op 0; na 480 s is het vol (120 s)
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
  // tegoed begint op 0 (V4-10), terug aan 1/4: na een uur hoogstens 3600 / 5 = 720 s op 100 %
  TEST_ASSERT_TRUE(op100 <= 721000);
  TEST_ASSERT_TRUE(op100 >= 600000); // maar boost werkt wel
  // meteen na een volle boost: geweigerd
  Regelaar q;
  nu = 1000;
  loop(q, nu, nu + 480000, 20); // eerst een vol tegoed
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
  loop(r, nu, nu + 480000, 20); // V4-10: eerst tegoed opbouwen
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

Koppel bevestigVoor(const uint8_t *module, uint32_t uitdaging) {
  Koppel b;
  b.soort = SOORT_KOPPEL_BEVESTIG;
  b.uitdaging = uitdaging;
  memcpy(b.mac, module, 6);
  return b;
}

void test_koppeling_niet_overschrijven_en_sessies() {
  Koppeling k;
  const uint8_t knopA[6] = {1, 2, 3, 4, 5, 6}, knopB[6] = {9, 9, 9, 9, 9, 9}, module[6] = {7, 7, 7, 7, 7, 7};
  memcpy(k.eigen, module, 6);
  Koppel v;
  for (int i = 0; i < 32; i++) v.pub[i] = (uint8_t)i;
  v.uitdaging = 0;
  TEST_ASSERT_FALSE(k.vraag(knopA, v, 5000)); // zonder uitdaging
  v.uitdaging = 0xA1B2C3D4;
  TEST_ASSERT_TRUE(k.vraag(knopA, v, 5000));
  TEST_ASSERT_FALSE(k.gekoppeld); // V4-11: pas na de gerichte bevestiging
  TEST_ASSERT_TRUE(k.bevestig(knopA, bevestigVoor(module, 0xA1B2C3D4), 5200));
  TEST_ASSERT_TRUE(k.gekoppeld);
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
  TEST_ASSERT_TRUE(k.bevestig(knopB, bevestigVoor(module, 0xA1B2C3D4), 5300));
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

// ---------------- eindverslag v4 ----------------

// V4-04 toerentalvolging: doel 80 % van 4500 = 3600 omw/min; schone druk bij 80 % is 110 Pa
void test_toeren_blijft_achter() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 12000, 110, true, 1950); // 6 s stabiliseren + 6 s afwijking: nog geen oordeel
  TEST_ASSERT_NOT_EQUAL(STORING_TOEREN, r.storing);
  loop(r, nu, nu + 20000, 110, true, 1950);
  TEST_ASSERT_EQUAL(BEW_TOEREN, r.bewaking);
  TEST_ASSERT_EQUAL(STORING_TOEREN, r.storing);
  TEST_ASSERT_TRUE(isnan(r.vol)); // geen filtermelding
  Status s;
  r.vulStatus(s, nu);
  TEST_ASSERT_TRUE(isnan(s.vol));
  TEST_ASSERT_EQUAL(95, r.gegeven); // de bijregeling zit op 80 + 15 %
}

void test_toeren_te_hoog() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 30000, 110, true, 3900); // 8 % te hoog
  TEST_ASSERT_EQUAL(BEW_TOEREN, r.bewaking);
  TEST_ASSERT_EQUAL(STORING_TOEREN, r.storing);
}

void test_toeren_verzadigde_pwm() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  versterking = 35; // zwakke ventilator: zelfs 95 % PWM geeft maar 3325 omw/min (8 % te laag)
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 40000, 110);
  TEST_ASSERT_EQUAL(95, r.gegeven);
  TEST_ASSERT_EQUAL(STORING_TOEREN, r.storing);
  TEST_ASSERT_EQUAL(BEW_TOEREN, r.bewaking);
}

void test_toeren_tacho_weg_blijft_stilstand() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 30000, 110, true, 0);
  TEST_ASSERT_EQUAL(STORING_STIL, r.storing);
  TEST_ASSERT_NOT_EQUAL(BEW_TOEREN, r.bewaking);
}

void test_toeren_geen_vals_alarm_bij_opstart() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(false, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 20000, 0, true, 0); // stil laten uitlopen
  r.opdracht(cmd(true, 80, 1, 0, 7, 31), nu);
  // ventilator met traagheid (tijdconstante 2 s), druk met het kwadraat van het toerental
  float n = 0;
  for (const uint32_t t0 = nu; nu < t0 + 60000; nu += 250) {
    n += (45.0f * r.gegeven - n) * 0.125f;
    r.tacho((uint16_t)n, nu);
    r.meting(true, 110.0f * (n / 3600.0f) * (n / 3600.0f), nu);
    r.stap(nu);
    TEST_ASSERT_NOT_EQUAL_MESSAGE(STORING_TOEREN, r.storing, "vals alarm bij de opstart");
    TEST_ASSERT_NOT_EQUAL(BEW_TOEREN, r.bewaking);
  }
  TEST_ASSERT_EQUAL(BEW_OK, r.bewaking);
}

void test_toeren_herstelt_vanzelf() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 30000, 110, true, 1950);
  TEST_ASSERT_EQUAL(STORING_TOEREN, r.storing);
  loop(r, nu, nu + 5000, 110); // de ventilator haalt het weer, maar nog geen 10 s
  TEST_ASSERT_EQUAL(STORING_TOEREN, r.storing);
  loop(r, nu, nu + 30000, 110);
  TEST_ASSERT_EQUAL(STORING_GEEN, r.storing);
  TEST_ASSERT_EQUAL(BEW_OK, r.bewaking);
}

// V4-13 filter ontbreekt of lekt (op 80 %: schoon 110 Pa); 7.2: na 3 s stopt de ventilator, op elke stand
void test_filter_ontbreekt() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 10000, 110);
  TEST_ASSERT_EQUAL(BEW_OK, r.bewaking);
  loop(r, nu, nu + 2000, 0.45f * 110); // het filter gaat eruit terwijl hij draait (de meting volgt na ~1 s)
  TEST_ASSERT_EQUAL(BEW_FILTER_LEK, r.bewaking);
  TEST_ASSERT_TRUE(isnan(r.vol));
  TEST_ASSERT_TRUE(r.gegeven > 0); // nog geen 3 s
  loop(r, nu, nu + 3000, 0.45f * 110);
  TEST_ASSERT_EQUAL(0, r.gegeven); // gestopt
  TEST_ASSERT_FALSE(voedingAan(r.gegeven));
  TEST_ASSERT_EQUAL(STOP_LUCHT, r.uitReden);
  // de knop blijft AAN sturen: niets (eerst UIT); na UIT en een nieuwe AAN draait hij weer
  r.opdracht(cmd(true, 80, 1, 0, 7, 31), nu);
  TEST_ASSERT_EQUAL(0, r.stap(nu));
  r.opdracht(cmd(false, 80, 1, 0, 7, 32), nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 33), nu);
  loop(r, nu, nu + 2000, 110);
  TEST_ASSERT_TRUE(r.gegeven > 0);
  // geen luchtstroom (slang los, 0,20 x): storing en ook stoppen
  loop(r, nu, nu + 10000, 110);
  loop(r, nu, nu + 5000, 0.20f * 110);
  TEST_ASSERT_EQUAL(0, r.gegeven);
  TEST_ASSERT_EQUAL(STOP_LUCHT, r.uitReden);
}

// 7.2: ook op een lage stand (40 %: schoon 50 Pa) stopt hij zonder filter
void test_filter_ontbreekt_op_lage_stand_stopt() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 40, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 10000, 50);
  TEST_ASSERT_EQUAL(BEW_LAGE_STAND, r.bewaking);
  TEST_ASSERT_TRUE(r.gegeven > 0);
  loop(r, nu, nu + 6000, 0.40f * 50);
  TEST_ASSERT_EQUAL(0, r.gegeven);
  TEST_ASSERT_EQUAL(STOP_LUCHT, r.uitReden);
}

// 7.2: tijdens de zachte start (de druk loopt achter) geen valse stop
void test_geen_stop_tijdens_het_oplopen() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(false, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 20000, 0, true, 0);
  r.opdracht(cmd(true, 80, 1, 0, 7, 31), nu);
  float n = 0, dp = 0;
  for (const uint32_t t0 = nu; nu < t0 + 30000; nu += 250) {
    n += (45.0f * r.gegeven - n) * 0.125f;              // traagheid van de waaier
    dp += (110.0f * (n / 3600.0f) * (n / 3600.0f) - dp) * 0.3f; // de druk loopt nog wat achter
    r.tacho((uint16_t)n, nu);
    r.meting(true, dp, nu);
    r.stap(nu);
    TEST_ASSERT_EQUAL_MESSAGE(STOP_GEEN, r.uitReden, "valse stop bij de opstart");
  }
  TEST_ASSERT_TRUE(r.gegeven > 0);
}

void test_filter_omloop() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 10000, 0.75f * 110); // boven 0,70 x: gewoon (en het filter is "schoon")
  TEST_ASSERT_EQUAL(BEW_OK, r.bewaking);
  TEST_ASSERT_EQUAL_FLOAT(0.0f, r.vol);
  loop(r, nu, nu + 2000, 0.65f * 110); // een kier: eerst de melding, dan stop
  TEST_ASSERT_EQUAL(BEW_FILTER_LEK, r.bewaking);
  TEST_ASSERT_TRUE(isnan(r.vol));
  loop(r, nu, nu + 3000, 0.65f * 110);
  TEST_ASSERT_EQUAL(STOP_LUCHT, r.uitReden);
}

// 7.2: hand op het rooster, luchtdichtheid en toerentalband geven geen valse melding; een vol filter wel, en die blijft
void test_hand_op_rooster_en_schommelingen_geen_valse_melding() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  r.opdracht(cmd(true, 80, 1, 0, 7, 30), nu);
  loop(r, nu, nu + 60000, 110);
  // een hand op het rooster: 1 minuut 160 Pa (1,45 x), dan weer weg; 6 min lang
  for (int k = 0; k < 6; k++) {
    loop(r, nu, nu + 50000, 160);
    loop(r, nu, nu + 10000, 110);
  }
  TEST_ASSERT_FALSE(r.filterVol);
  TEST_ASSERT_TRUE(r.vol < 1.0f);
  // luchtdichtheid +5 % en toerental +3 % (druk +6 %) samen, 10 min lang: 1,11 x < 1,29 x (de grens op 80 %)
  loop(r, nu, nu + 600000, 110 * 1.05f * 1.06f);
  TEST_ASSERT_FALSE(r.filterVol);
  // een hand die telkens 4 van de 5 minuten op het rooster ligt: de vrije minuut beslist
  for (int k = 0; k < 3; k++) {
    loop(r, nu, nu + 240000, 170);
    loop(r, nu, nu + 60000, 112);
  }
  TEST_ASSERT_FALSE(r.filterVol);
  // het filter is echt vol: 1,45 x, 5,5 min: melding, en ze blijft staan als de druk even zakt (hysterese)
  loop(r, nu, nu + 330000, 160);
  TEST_ASSERT_TRUE(r.filterVol);
  TEST_ASSERT_TRUE(r.nieuweVolMelding);
  loop(r, nu, nu + 60000, 112);
  TEST_ASSERT_TRUE(r.filterVol);
  Status s;
  r.vulStatus(s, nu);
  TEST_ASSERT_EQUAL(1, s.filterVol);
  // een nieuwe ijking (nieuw filter) wist de melding
  r.nieuweVolMelding = false;
  ijk(r, nu, 20, 30, 2);
  TEST_ASSERT_EQUAL(IJK_OK, r.ijkFout);
  TEST_ASSERT_FALSE(r.filterVol);
  TEST_ASSERT_TRUE(r.nieuweVolMelding);
}

// 7.2: ander merk filter: eerst geweigerd (te hoog), na "ander merk" (refWis) aanvaard als nieuwe referentie
void test_ander_merk_filter() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu); // eerste: ongeveer 20..140 Pa
  ijk(r, nu, 26, 39, 2); // ander merk, 30 % hoger
  TEST_ASSERT_EQUAL(IJK_TE_HOOG, r.ijkFout);
  // "ander merk filter" op de knop: refWis en ijk samen in dezelfde sessie
  Opdracht o = cmd(true, 60, 2, 0, 7, 50);
  r.opdracht(o, nu);
  loop(r, nu, nu + 1000, 26);
  o = cmd(true, 60, 3, 0, 7, 51);
  o.refWis = 1;
  r.opdracht(o, nu);
  TEST_ASSERT_TRUE(r.eersteGewist);
  TEST_ASSERT_FALSE(r.heeftEerste);
  for (int p = 0; p < 5; p++) loop(r, nu, nu + 8000, 26 + 39 * p);
  loop(r, nu, nu + 500, 104);
  TEST_ASSERT_EQUAL(IJK_OK, r.ijkFout);
  TEST_ASSERT_TRUE(r.heeftEerste);
  TEST_ASSERT_TRUE(r.nieuweEerste);
  TEST_ASSERT_TRUE(r.eersteIjking()[4] > 170);
  // een herstart van de knop (nieuwe sessie, refWis-teller weer 0) wist niets
  r.eersteGewist = false;
  r.opdracht(cmd(true, 60, 0, 0, 8, 1), nu);
  TEST_ASSERT_FALSE(r.eersteGewist);
  TEST_ASSERT_TRUE(r.heeftEerste);
}

// 7.2: een ijking zonder filter (onder 0,70 x de eerste) wordt geweigerd
void test_ijking_zonder_filter_geweigerd() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu);
  float voor[5];
  for (int k = 0; k < 5; k++) voor[k] = r.ijking()[k];
  ijk(r, nu, 9, 14, 2); // ongeveer 0,45 x
  TEST_ASSERT_EQUAL(IJK_TE_LAAG, r.ijkFout);
  for (int k = 0; k < 5; k++) TEST_ASSERT_EQUAL_FLOAT(voor[k], r.ijking()[k]); // de vorige ijking blijft
}

// 7.2: zonder knop stopt de module na 10 min; met levenstekens niet
void test_stop_zonder_knop_na_10_min() {
  Regelaar r;
  uint32_t nu = 1000;
  r.stap(nu);
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  for (const uint32_t t0 = nu; nu < t0 + 1800000; nu += 1000) { r.knopLeeft(nu); r.stap(nu); }
  TEST_ASSERT_TRUE(r.gegeven > 0); // 30 min met levenstekens: draait
  zonderKnop = true;
  loop(r, nu, nu + 590000, 20, true, -1, 1000);
  TEST_ASSERT_TRUE(r.gegeven > 0); // 9 min 50 s stil: draait nog
  loop(r, nu, nu + 20000, 20, true, -1, 1000);
  TEST_ASSERT_EQUAL(0, r.gegeven);
  TEST_ASSERT_EQUAL(STOP_GEEN_KNOP, r.uitReden);
}

// 7.2: automatisch uit na 4 uur zonder bediening (de knop leeft en stuurt telkens dezelfde wens)
void test_automatisch_uit_na_4_uur() {
  Regelaar r;
  uint32_t nu = 1000, volgnr = 1;
  r.stap(nu);
  r.opdracht(cmd(true, 60, 0, 0, 7, volgnr++), nu);
  for (const uint32_t t0 = nu; nu < t0 + 3 * 3600000; nu += 1000) { r.opdracht(cmd(true, 60, 0, 0, 7, volgnr++), nu); r.stap(nu); }
  TEST_ASSERT_TRUE(r.gegeven > 0);
  r.opdracht(cmd(true, 65, 0, 0, 7, volgnr++), nu); // een handeling: de klok begint opnieuw
  for (const uint32_t t0 = nu; nu < t0 + 3 * 3600000; nu += 1000) { r.opdracht(cmd(true, 65, 0, 0, 7, volgnr++), nu); r.stap(nu); }
  TEST_ASSERT_TRUE(r.gegeven > 0);
  for (const uint32_t t0 = nu; nu < t0 + 3600000 + 2000; nu += 1000) { r.opdracht(cmd(true, 65, 0, 0, 7, volgnr++), nu); r.stap(nu); }
  TEST_ASSERT_EQUAL(0, r.gegeven);
  TEST_ASSERT_EQUAL(STOP_AUTO, r.uitReden);
}

// 7.2: tacho met ontdendering en periodemeting
void test_tacho_ontdendering_en_periode() {
  TEST_ASSERT_FALSE(tachoPulsGeldig(1000, 1040));  // een stoorpuls 40 us na de vorige (PWM 25 kHz)
  TEST_ASSERT_FALSE(tachoPulsGeldig(1000, 2499));
  TEST_ASSERT_TRUE(tachoPulsGeldig(1000, 2500));
  TEST_ASSERT_TRUE(tachoPulsGeldig(0xFFFFFF00u, 0x00000700u)); // over de overloop van micros()
  TEST_ASSERT_EQUAL(0, toerenUitPeriode(0, 1000000, 2));
  // 900 min-1 = 30 pulsen per seconde: 29 intervallen in 966 667 us
  TEST_ASSERT_UINT16_WITHIN(1, 900, toerenUitPeriode(29, 966667, 2));
  // de oude telling (pulsen per seconde) springt tussen 870 en 900 (3 %); de periodemeting niet
  TEST_ASSERT_UINT16_WITHIN(1, 870, toerenUitPeriode(29, 1000000, 2));
  TEST_ASSERT_UINT16_WITHIN(1, 3900, toerenUitPeriode(129, 992308, 2));
}

// 7.2: koppelen met een publieke sleutel: zonder geldig bewijs geen koppeling
void test_koppelen_zonder_bewijs_geweigerd() {
  const uint8_t knop[6] = {1, 2, 3, 4, 5, 6}, mod[6] = {0xD, 0, 0, 0, 0, 4};
  Koppeling m;
  memcpy(m.eigen, mod, 6);
  Koppel v;
  v.uitdaging = 99;
  for (int i = 0; i < 32; i++) v.pub[i] = (uint8_t)(200 - i);
  TEST_ASSERT_TRUE(m.vraag(knop, v, 1000));
  TEST_ASSERT_EQUAL_UINT8_ARRAY(v.pub, m.kandidaatPub(), 32);
  const uint8_t s16[16] = {7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7};
  m.kandidaatSleutel(s16);
  TEST_ASSERT_FALSE(m.bevestig(knop, bevestigVoor(mod, 99), 1200, false)); // bewijs klopt niet
  TEST_ASSERT_FALSE(m.gekoppeld);
  TEST_ASSERT_TRUE(m.bevestig(knop, bevestigVoor(mod, 99), 1300, true));
  TEST_ASSERT_TRUE(m.gekoppeld);
  TEST_ASSERT_EQUAL_UINT8_ARRAY(s16, m.sleutel, 16);
  // een levensteken telt mee in de volgorde
  Leven l;
  l.sessie = 3;
  l.volgnr = 5;
  TEST_ASSERT_TRUE(m.aanvaard(knop, l));
  TEST_ASSERT_FALSE(m.aanvaard(knop, l)); // herhaald
  TEST_ASSERT_FALSE(m.aanvaard(knop, cmd(true, 60, 0, 0, 3, 4))); // ouder dan het levensteken
}

void test_vuile_ijking_geweigerd_schone_aanvaard() {
  Regelaar r;
  uint32_t nu = 1000;
  ijk(r, nu); // de eerste ijking: ongeveer 20, 50, 80, 110, 140 Pa
  TEST_ASSERT_TRUE(r.heeftEerste);
  TEST_ASSERT_TRUE(r.nieuweEerste);
  float eerste[5];
  for (int k = 0; k < 5; k++) eerste[k] = r.ijking()[k];
  r.nieuweEerste = r.nieuweIjking = false;
  ijk(r, nu, 30, 33, 2); // vuil filter: ongeveer 30 Pa, meer dan 1,15 x de eerste
  TEST_ASSERT_EQUAL(IJK_TE_HOOG, r.ijkFout);
  TEST_ASSERT_FALSE(r.nieuweIjking);
  for (int k = 0; k < 5; k++) TEST_ASSERT_EQUAL_FLOAT(eerste[k], r.ijking()[k]); // de vorige ijking blijft
  ijk(r, nu, 22, 31, 3); // nieuw filter, iets anders: ongeveer 22..146 Pa (binnen 15 %)
  TEST_ASSERT_EQUAL(IJK_OK, r.ijkFout);
  TEST_ASSERT_TRUE(r.nieuweIjking);
  TEST_ASSERT_FALSE(r.nieuweEerste); // de eerste referentie blijft
  TEST_ASSERT_TRUE(r.ijking()[0] > eerste[0]);
  for (int k = 0; k < 5; k++) TEST_ASSERT_EQUAL_FLOAT(eerste[k], r.eersteIjking()[k]);
  // na een herstart (eerste ijking uit het NVS): ook geweigerd
  Regelaar q;
  const float w[5] = {20, 50, 80, 110, 140}, t[5] = {900, 1800, 2700, 3600, 4500};
  TEST_ASSERT_TRUE(q.laadIjking(w, t, 5));
  TEST_ASSERT_TRUE(q.laadEerste(w, 5));
  nu = 1000;
  ijk(q, nu, 20, 40); // ongeveer 25, 60, 100, 140, 180 Pa: boven 1,15 x 20, 50, 80, 110, 140
  TEST_ASSERT_EQUAL(IJK_TE_HOOG, q.ijkFout);
  TEST_ASSERT_EQUAL_FLOAT(50, q.ijking()[1]);
}

// V4-13 knop: "Nieuw filter geplaatst?" en de grenzen 1, 5 en 10 s
void druk(Bediening &b, uint32_t &nu, uint32_t duur) {
  b.knop(true, nu);
  for (uint32_t t = 50; t < duur; t += 50) b.knop(true, nu + t);
  nu += duur;
  b.knop(false, nu);
  nu += 100;
  b.knop(false, nu);
}

void test_knop_grenzen_1_5_10_s() {
  Bediening b;
  uint32_t nu = 1000;
  druk(b, nu, 990);
  TEST_ASSERT_TRUE(b.aan); // kort: aan/uit
  TEST_ASSERT_EQUAL(0, b.boost);
  druk(b, nu, 1000);
  TEST_ASSERT_EQUAL(1, b.boost); // 1 s: boost
  druk(b, nu, 4990);
  TEST_ASSERT_EQUAL(2, b.boost);
  TEST_ASSERT_FALSE(b.nieuwFilter);
  druk(b, nu, 5000); // 5 s: eerst de vraag, nog geen ijking
  TEST_ASSERT_TRUE(b.nieuwFilter);
  TEST_ASSERT_EQUAL(0, b.ijk);
  TEST_ASSERT_EQUAL(2, b.boost);
  TEST_ASSERT_EQUAL(SCH_NIEUW_FILTER, b.scherm(nu, true));
  b.draai(1, nu); // annuleren
  druk(b, nu, 9990);
  TEST_ASSERT_TRUE(b.nieuwFilter);
  b.draai(-1, nu);
  // 10 s vasthouden: koppelen, nog tijdens het vasthouden
  b.knop(true, nu);
  for (uint32_t t = 50; t < 10000; t += 50) b.knop(true, nu + t);
  TEST_ASSERT_FALSE(b.koppelVraag);
  b.knop(true, nu + 10000);
  TEST_ASSERT_TRUE(b.koppelVraag);
  b.knop(false, nu + 10500);
  TEST_ASSERT_FALSE(b.nieuwFilter);
  TEST_ASSERT_EQUAL(0, b.ijk);
}

void test_nieuw_filter_bevestigen_of_annuleren() {
  Bediening b;
  uint32_t nu = 1000;
  // bevestigen: kort drukken
  druk(b, nu, 6000);
  TEST_ASSERT_TRUE(b.nieuwFilter);
  druk(b, nu, 200);
  TEST_ASSERT_FALSE(b.nieuwFilter);
  TEST_ASSERT_EQUAL(1, b.ijk);
  TEST_ASSERT_TRUE(b.aan);
  // annuleren door draaien: geen ijkvraag en de stand blijft
  const int pct = b.pct;
  druk(b, nu, 6000);
  b.draai(2, nu);
  TEST_ASSERT_FALSE(b.nieuwFilter);
  TEST_ASSERT_EQUAL(1, b.ijk);
  TEST_ASSERT_EQUAL(pct, b.pct);
  // annuleren door 10 s niets te doen
  druk(b, nu, 6000);
  const uint32_t t0 = nu - 100;
  b.knop(false, t0 + 9900);
  TEST_ASSERT_TRUE(b.nieuwFilter);
  b.knop(false, t0 + 10000);
  TEST_ASSERT_FALSE(b.nieuwFilter);
  TEST_ASSERT_EQUAL(1, b.ijk);
  // lang drukken op de vraag: ook annuleren (geen boost, geen ijking)
  nu = t0 + 11000;
  druk(b, nu, 6000);
  druk(b, nu, 2000);
  TEST_ASSERT_FALSE(b.nieuwFilter);
  TEST_ASSERT_EQUAL(1, b.ijk);
  TEST_ASSERT_EQUAL(0, b.boost);
}

// V4-14 ijking laden
void test_ijking_laden_volledig_nagekeken() {
  const float w[5] = {10, 20, 30, 40, 50}, t[5] = {900, 1800, 2700, 3600, 4500};
  Regelaar r;
  TEST_ASSERT_TRUE(r.laadIjking(w, t, 5));
  const float nan_w[5] = {10, NAN, 30, 40, 50}, inf_t[5] = {900, 1800, 2700, 3600, INFINITY};
  const float hoog_t[5] = {900, 1800, 2700, 3600, 25000}, daal_w[5] = {10, 20, 15, 40, 50}, daal_t[5] = {900, 1800, 1700, 3600, 4500};
  const float w2[5] = {11, 21, 31, 41, 51};
  TEST_ASSERT_FALSE(r.laadIjking(nan_w, t, 5));
  TEST_ASSERT_FALSE(r.laadIjking(w2, inf_t, 5));
  TEST_ASSERT_FALSE(r.laadIjking(w2, hoog_t, 5));
  TEST_ASSERT_FALSE(r.laadIjking(daal_w, t, 5));
  TEST_ASSERT_FALSE(r.laadIjking(w2, daal_t, 5));
  TEST_ASSERT_FALSE(r.laadIjking(w2, t, 4)); // onvolledige set
  TEST_ASSERT_FALSE(r.laadIjking(w2, nullptr, 5));
  // de bestaande geldige set blijft staan
  TEST_ASSERT_TRUE(r.geijkt);
  for (int k = 0; k < 5; k++) {
    TEST_ASSERT_EQUAL_FLOAT(w[k], r.ijking()[k]);
    TEST_ASSERT_EQUAL_FLOAT(t[k], r.ijkToeren()[k]);
  }
  Regelaar leeg;
  TEST_ASSERT_FALSE(leeg.laadIjking(w, inf_t, 5));
  TEST_ASSERT_FALSE(leeg.geijkt);
  TEST_ASSERT_FALSE(leeg.laadEerste(nan_w, 5));
}

// V4-12 herstart en onbevestigde UIT: de knop (Bediening) en de module (Regelaar) via opdracht en status
void zend(Bediening &b, Regelaar &r, uint32_t nu, uint16_t sessie = 7) {
  if (!b.zenden) return; // niets tot de gebruiker iets doet
  Opdracht o;
  o.sessie = sessie;
  if (b.basis) {
    b.vulBasis(o);
    r.opdracht(o, nu);
    b.basis = false;
  }
  b.vulOpdracht(o);
  r.opdracht(o, nu);
  b.gewijzigd = false;
}
void meld(Regelaar &r, Bediening &b, uint32_t nu) {
  r.stap(nu);
  Status s;
  r.vulStatus(s, nu);
  b.status(s, nu);
}

void test_selectieve_modulereset_blijft_uit() {
  Regelaar r;
  r.startId = 0x1111;
  Bediening b;
  uint32_t nu = 1000;
  meld(r, b, nu);
  druk(b, nu, 200); // aan
  zend(b, r, nu);
  TEST_ASSERT_TRUE(r.aan);
  // alleen de module herstart: nieuw startId, en de knop zendt nog even zijn oude AAN
  Regelaar r2;
  r2.startId = 0x2222;
  for (int i = 0; i < 8; i++) zend(b, r2, nu += 250);
  TEST_ASSERT_FALSE(r2.aan);
  TEST_ASSERT_TRUE(r2.aanGeweigerd);
  TEST_ASSERT_EQUAL(0, r2.stap(nu));
  // de knop ziet het nieuwe startId: wens UIT, melding herstart
  meld(r2, b, nu);
  TEST_ASSERT_FALSE(b.aan);
  TEST_ASSERT_TRUE(b.herstart);
  TEST_ASSERT_EQUAL(SCH_HERSTART, b.scherm(nu, true));
  zend(b, r2, nu += 250);
  TEST_ASSERT_FALSE(r2.aan);
  // een nieuwe handeling met het juiste startId: AAN
  druk(b, nu, 200);
  zend(b, r2, nu);
  TEST_ASSERT_TRUE(r2.aan);
  TEST_ASSERT_FALSE(b.herstart);
}

void test_gezamenlijke_spanningsuitval_beide_uit() {
  Regelaar r;
  r.startId = 0x3333;
  Bediening b;
  uint32_t nu = 1000;
  for (int i = 0; i < 8; i++) {
    meld(r, b, nu += 250);
    zend(b, r, nu);
  }
  TEST_ASSERT_FALSE(b.aan);
  TEST_ASSERT_FALSE(b.zenden);
  TEST_ASSERT_FALSE(r.aan);
  TEST_ASSERT_EQUAL(SCH_UIT, b.scherm(nu, true));
}

void test_knop_herstart_neemt_de_stand_over() {
  Regelaar r;
  r.startId = 0x4444;
  uint32_t nu = 1000;
  loop(r, nu, nu + 480000, 20); // tegoed voor een boost
  r.opdracht(cmd(true, 60, 0, 0, 7, 1, 0x4444), nu);
  loop(r, nu, nu + 3000, 20);
  Bediening b; // de knop herstart (nieuwe sessie 8)
  meld(r, b, nu);
  TEST_ASSERT_TRUE(b.aan);
  TEST_ASSERT_EQUAL(60, b.pct);
  TEST_ASSERT_FALSE(b.zenden); // geen opdracht tot de gebruiker iets doet
  TEST_ASSERT_EQUAL(SCH_AAN, b.scherm(nu, true));
  // de eerste handeling is een boost: die werkt (eerst de basis, dan de vraag)
  druk(b, nu, 1500);
  zend(b, r, nu, 8);
  TEST_ASSERT_TRUE(r.boostTot != 0);
  TEST_ASSERT_TRUE(r.aan);
}

void test_oude_opdracht_na_reset_geweigerd() {
  const uint8_t knop[6] = {1, 2, 3, 4, 5, 6}, sleutel[16] = {0};
  const Opdracht oud = cmd(true, 80, 0, 0, 7, 50, 0x5555); // opgenomen voor de herstart
  // na de herstart: koppeling uit het NVS, de sessie is nog niet gekend, dus de koppeling zelf laat hem door ...
  Koppeling k;
  k.laad(knop, sleutel);
  TEST_ASSERT_TRUE(k.aanvaard(knop, oud));
  // ... maar het startnummer is nieuw: geen AAN
  Regelaar r;
  r.startId = 0x6666;
  r.opdracht(oud, 1000);
  TEST_ASSERT_FALSE(r.aan);
  r.opdracht(cmd(true, 80, 0, 0, 7, 51, 0), 1000); // zonder startId: alleen UIT
  TEST_ASSERT_FALSE(r.aan);
  r.opdracht(cmd(false, 80, 0, 0, 7, 52, 0), 1000); // UIT mag altijd
  TEST_ASSERT_FALSE(r.aan);
}

void test_radioverlies_tijdens_uit() {
  Regelaar r;
  r.startId = 0x7777;
  Bediening b;
  uint32_t nu = 1000;
  meld(r, b, nu);
  TEST_ASSERT_EQUAL(SCH_UIT, b.scherm(nu + 1900, true));
  TEST_ASSERT_EQUAL(SCH_UIT_ONBEVESTIGD, b.scherm(nu + 2000, true)); // "UIT?": niets meer bevestigd
  nu += 3000;
  druk(b, nu, 200); // AAN gevraagd zonder radio
  TEST_ASSERT_EQUAL(SCH_AAN_ONBEVESTIGD, b.scherm(nu, true));
  loop(r, nu, nu + 5000, 20);
  TEST_ASSERT_FALSE(r.aan); // de module kreeg niets: blijft UIT
}

// V4-11 koppelen per module
void test_twee_modules_een_knop() {
  const uint8_t knop[6] = {1, 2, 3, 4, 5, 6}, macA[6] = {0xA, 0, 0, 0, 0, 1}, macB[6] = {0xB, 0, 0, 0, 0, 2};
  Koppeling a, bm;
  memcpy(a.eigen, macA, 6);
  memcpy(bm.eigen, macB, 6);
  KnopKoppeling kk;
  kk.nieuw(0xABCD1234);
  Koppel v;
  v.uitdaging = kk.uitdaging;
  for (int i = 0; i < 32; i++) v.pub[i] = (uint8_t)(i + 1);
  TEST_ASSERT_TRUE(a.vraag(knop, v, 1000)); // beide hoorden dezelfde broadcast
  TEST_ASSERT_TRUE(bm.vraag(knop, v, 1000));
  Koppel okA, okB;
  okA.soort = okB.soort = SOORT_KOPPEL_OK;
  okA.uitdaging = okB.uitdaging = v.uitdaging;
  memcpy(okA.mac, macA, 6);
  memcpy(okB.mac, macB, 6);
  TEST_ASSERT_FALSE(kk.antwoord(macA, okB, 1050)); // het MAC in het bericht moet de afzender zijn
  TEST_ASSERT_TRUE(kk.antwoord(macB, okB, 1100));  // B was eerst
  TEST_ASSERT_FALSE(kk.antwoord(macA, okA, 1120)); // A telt niet meer
  const Koppel bev = kk.bevestiging();
  TEST_ASSERT_FALSE(a.bevestig(knop, bev, 1200)); // gericht aan B: A weigert (ook als ze het zou horen)
  TEST_ASSERT_TRUE(bm.bevestig(knop, bev, 1200));
  a.tik(6300);
  TEST_ASSERT_TRUE(bm.gekoppeld);
  TEST_ASSERT_FALSE(a.gekoppeld);
  TEST_ASSERT_FALSE(a.wachtOpBevestiging()); // A vergat de vraag
  TEST_ASSERT_TRUE(bm.aanvaard(knop, cmd(true, 60)));
  TEST_ASSERT_FALSE(a.aanvaard(knop, cmd(true, 60)));
}

void test_bevestiging_verkeerde_uitdaging_of_te_laat() {
  const uint8_t knop[6] = {1, 2, 3, 4, 5, 6}, mod[6] = {0xC, 0, 0, 0, 0, 3}, ander[6] = {9, 9, 9, 9, 9, 9};
  Koppeling m;
  memcpy(m.eigen, mod, 6);
  Koppel v;
  v.uitdaging = 77;
  TEST_ASSERT_TRUE(m.vraag(knop, v, 1000));
  TEST_ASSERT_FALSE(m.bevestig(knop, bevestigVoor(mod, 78), 1500));  // verkeerde uitdaging
  TEST_ASSERT_FALSE(m.bevestig(ander, bevestigVoor(mod, 77), 1500)); // andere afzender
  TEST_ASSERT_FALSE(m.gekoppeld);
  TEST_ASSERT_FALSE(m.bevestig(knop, bevestigVoor(mod, 77), 6001)); // na 5 s: vergeten
  TEST_ASSERT_FALSE(m.gekoppeld);
  TEST_ASSERT_FALSE(m.wachtOpBevestiging());
  // de knop begint dan opnieuw
  KnopKoppeling kk;
  kk.nieuw(77);
  Koppel ok;
  ok.soort = SOORT_KOPPEL_OK;
  ok.uitdaging = 77;
  memcpy(ok.mac, mod, 6);
  TEST_ASSERT_TRUE(kk.antwoord(mod, ok, 1000));
  TEST_ASSERT_FALSE(kk.verlopen(6000));
  TEST_ASSERT_TRUE(kk.verlopen(6001));
}

// V4-10 boosttegoed na een start
void test_boosttegoed_begint_leeg() {
  Regelaar r;
  uint32_t nu = 1000;
  r.stap(nu);
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  r.opdracht(cmd(true, 60, 0, 1, 7, 2), nu);
  TEST_ASSERT_TRUE(r.boostGeweigerd); // na de start geen tegoed
  loop(r, nu, nu + 40250, 20); // de laatste regelstap valt 40 s na de start
  r.opdracht(cmd(true, 60, 0, 2, 7, 3), nu);
  TEST_ASSERT_FALSE(r.boostGeweigerd); // na 40 s: 10 s boost
  TEST_ASSERT_TRUE(r.boostTot - nu <= 10100);
}

void test_reset_in_een_boostreeks_geeft_geen_extra_tegoed() {
  // 4 keer 5 minuten, telkens een herstart, en elke 10 s boost vragen: hoogstens 1/5 op 100 %
  uint32_t op100 = 0;
  for (int reeks = 0; reeks < 4; reeks++) {
    Regelaar r;
    uint32_t nu = 1000, volgnr = 1;
    uint8_t boost = 0;
    r.stap(nu);
    r.opdracht(cmd(true, 60, 0, 0, 7, volgnr++), nu);
    for (const uint32_t t0 = nu; nu < t0 + 300000;) {
      if ((nu - t0) % 10000 == 0) r.opdracht(cmd(true, 60, 0, ++boost, 7, volgnr++), nu);
      nu += 250;
      if (r.stap(nu) == 100) op100 += 250;
    }
  }
  TEST_ASSERT_TRUE(op100 > 0);
  TEST_ASSERT_TRUE_MESSAGE(op100 <= 1200000 / 5, "meer dan 1/5 op 100 % over de herstarts");
}

// voeding van de ventilator (-Q2/-Q3 op GPIO7): alleen 24 V als de PWM groter dan 0 is
void test_voeding_ventilator_alleen_bij_pwm() {
  TEST_ASSERT_FALSE(voedingAan(0));
  TEST_ASSERT_TRUE(voedingAan(1));
  TEST_ASSERT_TRUE(voedingAan(100));
  Regelaar r;
  uint32_t nu = 1000;
  TEST_ASSERT_FALSE(voedingAan(r.stap(nu))); // na de start: stil en spanningsloos
  r.opdracht(cmd(true, 60, 0, 0, 7, 1), nu);
  loop(r, nu, nu + 2000, 20);
  TEST_ASSERT_TRUE(voedingAan(r.stap(nu)));
  r.opdracht(cmd(false, 60, 0, 0, 7, 2), nu);
  TEST_ASSERT_FALSE(voedingAan(r.stap(nu))); // UIT: in dezelfde stap spanningsloos
}

// 7.2: de knop ziet de stop, toont waarom en zet zijn wens op UIT; een druk zet de afzuiging weer aan
void test_knop_toont_stop_en_start_opnieuw() {
  Regelaar r;
  r.startId = 0x3333;
  Bediening b;
  uint32_t nu = 1000;
  meld(r, b, nu);
  druk(b, nu, 200);
  zend(b, r, nu);
  TEST_ASSERT_TRUE(r.aan);
  // 10 min geen bericht van de knop (radio weg): stop
  zonderKnop = true;
  loop(r, nu, nu + 610000, 20, true, -1, 1000);
  TEST_ASSERT_EQUAL(STOP_GEEN_KNOP, r.uitReden);
  meld(r, b, nu);
  TEST_ASSERT_FALSE(b.aan);
  TEST_ASSERT_EQUAL(STOP_GEEN_KNOP, b.gestopt);
  TEST_ASSERT_EQUAL(SCH_GESTOPT, b.scherm(nu, true));
  zend(b, r, nu += 250); // UIT
  TEST_ASSERT_FALSE(r.wachtOpUit);
  druk(b, nu, 200);      // AAN
  zend(b, r, nu);
  TEST_ASSERT_TRUE(r.aan);
  TEST_ASSERT_TRUE(r.stap(nu += 250) > 0);
  meld(r, b, nu += 250);
  TEST_ASSERT_EQUAL(SCH_AAN, b.scherm(nu, true));
}

// 7.2: "ander merk filter" op de knop: 3 tot 8 s vasthouden op "Nieuw filter?"
void test_knop_ander_merk() {
  Bediening b;
  uint32_t nu = 1000;
  druk(b, nu, 6000);
  TEST_ASSERT_TRUE(b.nieuwFilter);
  druk(b, nu, 4000);
  TEST_ASSERT_FALSE(b.nieuwFilter);
  TEST_ASSERT_EQUAL(1, b.refWis);
  TEST_ASSERT_EQUAL(1, b.ijk);
  Opdracht o;
  b.vulOpdracht(o);
  TEST_ASSERT_EQUAL(1, o.refWis);
  druk(b, nu, 6000);
  druk(b, nu, 9000); // te lang: annuleren
  TEST_ASSERT_EQUAL(1, b.refWis);
  TEST_ASSERT_EQUAL(1, b.ijk);
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
  RUN_TEST(test_toeren_blijft_achter);
  RUN_TEST(test_toeren_te_hoog);
  RUN_TEST(test_toeren_verzadigde_pwm);
  RUN_TEST(test_toeren_tacho_weg_blijft_stilstand);
  RUN_TEST(test_toeren_geen_vals_alarm_bij_opstart);
  RUN_TEST(test_toeren_herstelt_vanzelf);
  RUN_TEST(test_filter_ontbreekt);
  RUN_TEST(test_filter_ontbreekt_op_lage_stand_stopt);
  RUN_TEST(test_geen_stop_tijdens_het_oplopen);
  RUN_TEST(test_filter_omloop);
  RUN_TEST(test_hand_op_rooster_en_schommelingen_geen_valse_melding);
  RUN_TEST(test_ander_merk_filter);
  RUN_TEST(test_ijking_zonder_filter_geweigerd);
  RUN_TEST(test_stop_zonder_knop_na_10_min);
  RUN_TEST(test_automatisch_uit_na_4_uur);
  RUN_TEST(test_tacho_ontdendering_en_periode);
  RUN_TEST(test_koppelen_zonder_bewijs_geweigerd);
  RUN_TEST(test_vuile_ijking_geweigerd_schone_aanvaard);
  RUN_TEST(test_knop_grenzen_1_5_10_s);
  RUN_TEST(test_nieuw_filter_bevestigen_of_annuleren);
  RUN_TEST(test_ijking_laden_volledig_nagekeken);
  RUN_TEST(test_selectieve_modulereset_blijft_uit);
  RUN_TEST(test_gezamenlijke_spanningsuitval_beide_uit);
  RUN_TEST(test_knop_herstart_neemt_de_stand_over);
  RUN_TEST(test_oude_opdracht_na_reset_geweigerd);
  RUN_TEST(test_radioverlies_tijdens_uit);
  RUN_TEST(test_twee_modules_een_knop);
  RUN_TEST(test_bevestiging_verkeerde_uitdaging_of_te_laat);
  RUN_TEST(test_boosttegoed_begint_leeg);
  RUN_TEST(test_reset_in_een_boostreeks_geeft_geen_extra_tegoed);
  RUN_TEST(test_voeding_ventilator_alleen_bij_pwm);
  RUN_TEST(test_knop_toont_stop_en_start_opnieuw);
  RUN_TEST(test_knop_ander_merk);
  return UNITY_END();
}
