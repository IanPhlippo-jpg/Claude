// Tests van include/bussen.h (meldingen en bussen):  python -m platformio test -e native -f test_bus
#include <unity.h>

#include <string>

#include "bussen.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {
struct Proef {
  PuntCfg p[MAX_PUNTEN];
  BusCfg b[MAX_BUSSEN];
  Volg v;
  void punt(int i, const char *id, int ingang, int ontvanger, const char *volgende = "") {
    p[i].gebruikt = true;
    strcpy(p[i].id, id);
    p[i].ingang = (int8_t)ingang;
    p[i].ontvanger = (int8_t)ontvanger;
    strcpy(p[i].volgende, volgende);
  }
  void bus(int i, const char *code) {
    b[i].gebruikt = true;
    snprintf(b[i].naam, NAAM_LEN, "Bus %d", i + 1);
    strcpy(b[i].code, code);
  }
};
} // namespace

void test_ringbuffer_sinds() {
  Meldingen m;
  const Melding *u[MAX_MELDINGEN];
  TEST_ASSERT_EQUAL(0, m.sinds(0, u, MAX_MELDINGEN));
  for (int i = 0; i < 10; i++) {
    Melding x;
    x.ms = 100u * i;
    m.voegToe(x);
  }
  TEST_ASSERT_EQUAL_UINT32(10, m.volgnr);
  int n = m.sinds(7, u, MAX_MELDINGEN);
  TEST_ASSERT_EQUAL(3, n);
  TEST_ASSERT_EQUAL_UINT32(8, u[0]->nr);
  TEST_ASSERT_EQUAL_UINT32(700, u[0]->ms);
  TEST_ASSERT_EQUAL(0, m.sinds(10, u, MAX_MELDINGEN));
  // overgelopen: alleen de laatste 64
  for (int i = 0; i < 100; i++) m.voegToe(Melding());
  n = m.sinds(0, u, MAX_MELDINGEN);
  TEST_ASSERT_EQUAL(MAX_MELDINGEN, n);
  TEST_ASSERT_EQUAL_UINT32(110 - 63, u[0]->nr);
  TEST_ASSERT_EQUAL_UINT32(110, u[n - 1]->nr);
  // een volgnummer van voor een herstart (groter dan wat de doos heeft): alles
  TEST_ASSERT_EQUAL(MAX_MELDINGEN, m.sinds(5000, u, MAX_MELDINGEN));
}

void test_bus_gezien_via_code() {
  Proef t;
  t.punt(0, "P3", -1, 1);
  t.bus(0, "nec:00FF12ED");
  t.bus(1, "nec:00FF13EC");
  const Melding *m = t.v.ontvangen(1, "nec:00FF13EC", t.p, t.b, 1000);
  TEST_ASSERT_NOT_NULL(m);
  TEST_ASSERT_EQUAL(MELD_IR, m->soort);
  TEST_ASSERT_EQUAL_STRING("P3", m->punt);
  TEST_ASSERT_EQUAL(1, m->bus);
  TEST_ASSERT_EQUAL(1, m->ontvanger);
  TEST_ASSERT_TRUE(t.v.bus[1].gezien);
  TEST_ASSERT_EQUAL_STRING("P3", t.v.bus[1].van);
  // dezelfde doorkomst: geen nieuwe melding; na 1,5 s stilte wel
  TEST_ASSERT_NULL(t.v.ontvangen(1, "nec:00FF13EC", t.p, t.b, 1500));
  TEST_ASSERT_NULL(t.v.ontvangen(1, "nec:00FF13EC", t.p, t.b, 2900));
  TEST_ASSERT_NOT_NULL(t.v.ontvangen(1, "nec:00FF13EC", t.p, t.b, 4500));
  // een onbekende code: melding zonder bus; in irLaatst
  m = t.v.ontvangen(1, "rc5:0510", t.p, t.b, 5000);
  TEST_ASSERT_EQUAL(-1, m->bus);
  TEST_ASSERT_EQUAL_STRING("rc5:0510", t.v.irLaatst[t.v.nIrLaatst - 1].code);
  // een ontvanger zonder punt: geen melding, wel in irLaatst (hoogstens 8)
  for (int i = 0; i < 12; i++) {
    char c[IR_TEKST_LEN];
    snprintf(c, sizeof c, "nec:0000%04X", i);
    TEST_ASSERT_NULL(t.v.ontvangen(3, c, t.p, t.b, 6000 + i));
  }
  TEST_ASSERT_EQUAL(IR_LAATST, t.v.nIrLaatst);
}

void test_bus_gezien_via_ingang_volgens_volgorde() {
  Proef t;
  t.punt(0, "P1", 0, -1, "P3");  // hallsensor op ingang 1, daarna P3
  t.punt(1, "P3", 4, -1, "P5");  // ingang 5
  t.punt(2, "P5", -1, 2, "P1");  // ontvanger 3 (IR)
  t.bus(0, "nec:00FF12ED");
  t.bus(1, "nec:00FF13EC");
  // nog niemand op weg naar P1: melding zonder bus
  const Melding *m = t.v.ingangActief(0, t.p, t.b, 100);
  TEST_ASSERT_EQUAL(MELD_HALL, m->soort);
  TEST_ASSERT_EQUAL(-1, m->bus);
  TEST_ASSERT_EQUAL(0, m->ingang);
  // bus 1 en 2 gezien bij P5 (code): beide op weg naar P1; bus 1 eerst
  t.v.ontvangen(2, "nec:00FF12ED", t.p, t.b, 1000);
  t.v.ontvangen(2, "nec:00FF13EC", t.p, t.b, 3000);
  TEST_ASSERT_EQUAL_STRING("P1", t.v.bus[0].naar);
  m = t.v.ingangActief(0, t.p, t.b, 9000);
  TEST_ASSERT_EQUAL(0, m->bus); // de langst onderweg zijnde
  TEST_ASSERT_EQUAL_STRING("P3", t.v.bus[0].naar);
  m = t.v.ingangActief(0, t.p, t.b, 11000);
  TEST_ASSERT_EQUAL(1, m->bus);
  // rijtijd P5 -> P1 gemeten: eerste meting 8 s, daarna gemiddelde van 2 (8 en 8)
  TEST_ASSERT_EQUAL_UINT32(8000, t.v.rijtijd("P5", "P1"));
  // een ingang zonder punt: niets
  TEST_ASSERT_NULL(t.v.ingangActief(9, t.p, t.b, 12000));
  // met de hand
  m = t.v.handmatig(1, "P3", t.p, 15000);
  TEST_ASSERT_EQUAL(1, m->bus);
  TEST_ASSERT_EQUAL_STRING("P3", m->punt);
  TEST_ASSERT_EQUAL_STRING("P5", t.v.bus[1].naar);
}

void test_volgende_punt_geleerd() {
  Proef t;
  t.punt(0, "A", 0, -1);
  t.punt(1, "B", 1, -1);
  t.punt(2, "C", 2, -1);
  t.bus(0, "nec:00FF12ED");
  t.v.handmatig(0, "A", t.p, 0);
  TEST_ASSERT_EQUAL_STRING("", t.v.bus[0].naar); // nog niets geleerd
  TEST_ASSERT_EQUAL_STRING("wacht", t.v.staat(0, 100, false));
  t.v.handmatig(0, "B", t.p, 5000);
  t.v.handmatig(0, "C", t.p, 9000);
  t.v.handmatig(0, "A", t.p, 20000);
  TEST_ASSERT_EQUAL_STRING("B", t.v.bus[0].naar); // A -> B geleerd
  t.v.handmatig(0, "C", t.p, 26000);              // nu eens A -> C (wissel om)
  t.v.handmatig(0, "A", t.p, 40000);
  TEST_ASSERT_EQUAL_STRING("C", t.v.bus[0].naar); // het laatst gereden traject
  // een punt wissen vergeet zijn trajecten
  t.v.vergeetPunt("C");
  TEST_ASSERT_EQUAL_UINT32(RIJTIJD_START_MS, t.v.rijtijd("A", "C"));
  TEST_ASSERT_EQUAL_UINT32(5000, t.v.rijtijd("A", "B"));
}

void test_ftr_lichtsluis() {
  Proef t;
  t.punt(0, "P1", -1, 0, "P2");
  t.punt(1, "P2", -1, 3);
  t.p[1].soort = MELD_FTR;
  t.bus(0, "nec:00FF12ED");
  t.v.ontvangen(0, "nec:00FF12ED", t.p, t.b, 0); // bus 1 bij P1, op weg naar P2
  // lichtsluis zonder code: de verwachte bus
  const Melding *m = t.v.ontvangen(3, "", t.p, t.b, 4000);
  TEST_ASSERT_NOT_NULL(m);
  TEST_ASSERT_EQUAL(MELD_FTR, m->soort);
  TEST_ASSERT_EQUAL(0, m->bus);
  TEST_ASSERT_EQUAL_STRING("", m->code);
  // binnen 1 s: niets nieuws
  TEST_ASSERT_NULL(t.v.ontvangen(3, "", t.p, t.b, 4500));
  TEST_ASSERT_NOT_NULL(t.v.ontvangen(3, "", t.p, t.b, 5200));
}

void test_staat_van_een_bus() {
  Proef t;
  t.punt(0, "A", 0, -1, "B");
  t.punt(1, "B", 1, -1, "A");
  t.bus(0, "x");
  TEST_ASSERT_EQUAL_STRING("onbekend", t.v.staat(0, 0, false));
  t.v.handmatig(0, "A", t.p, 1000);
  TEST_ASSERT_EQUAL_STRING("rijdt", t.v.staat(0, 2000, false));
  TEST_ASSERT_EQUAL_STRING("halte", t.v.staat(0, 2000, true));
  TEST_ASSERT_EQUAL_STRING("wacht", t.v.staat(0, 1000 + 16000, false)); // langer dan 1,5 x de rijtijd (10 s)
  TEST_ASSERT_EQUAL_STRING("onbekend", t.v.staat(0, 1000 + BUS_KWIJT_MS + 1, false));
  t.v.vergeetBus(0);
  TEST_ASSERT_FALSE(t.v.bus[0].gezien);
}

void test_hulp_geldig() {
  TEST_ASSERT_TRUE(puntIdGeldig("STOP_lijnbus3"));
  TEST_ASSERT_TRUE(puntIdGeldig("P3"));
  TEST_ASSERT_FALSE(puntIdGeldig(""));
  TEST_ASSERT_FALSE(puntIdGeldig("met spatie"));
  TEST_ASSERT_FALSE(puntIdGeldig("abcdefghijklmnopqrstuvwxyz"));
  TEST_ASSERT_TRUE(kleurGeldig("#d23"));
  TEST_ASSERT_TRUE(kleurGeldig("#DD2233"));
  TEST_ASSERT_FALSE(kleurGeldig("rood"));
  TEST_ASSERT_FALSE(kleurGeldig("#12345"));
  TEST_ASSERT_EQUAL(MELD_FTR, meldSoortVanId("ftr"));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_ringbuffer_sinds);
  RUN_TEST(test_bus_gezien_via_code);
  RUN_TEST(test_bus_gezien_via_ingang_volgens_volgorde);
  RUN_TEST(test_volgende_punt_geleerd);
  RUN_TEST(test_ftr_lichtsluis);
  RUN_TEST(test_staat_van_een_bus);
  RUN_TEST(test_hulp_geldig);
  return UNITY_END();
}
