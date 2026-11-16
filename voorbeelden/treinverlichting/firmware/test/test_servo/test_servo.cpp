// Tests van include/servo.h:  python -m platformio test -e native -f test_servo
// Tellen bij 50 Hz, snelheid (µs/s), meteen (snelheid 0), hoogstens 4 tegelijk met een wachtrij, nieuw doel onderweg.
#include <unity.h>

#include <vector>

#include "api.h"
#include "servo.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {
struct Proef {
  ServoCfg cfg[MAX_SERVOS];
  Servos s;
  uint32_t t = 0;
  Proef() {
    for (int i = 0; i < MAX_SERVOS; i++) {
      cfg[i].gebruikt = true;
      cfg[i].kanaal = (uint8_t)i;
      cfg[i].a = 1000;
      cfg[i].b = 2000;
      cfg[i].snelheid = 1000; // 1000 µs per s: van A naar B in 1 s
    }
  }
  void loop(uint32_t ms) {
    for (uint32_t i = 0; i < ms; i += 5) {
      t += 5;
      s.stap(cfg, t);
    }
  }
};
} // namespace

void test_tellen_50hz() {
  TEST_ASSERT_EQUAL(307, servoTellen(1500));
  TEST_ASSERT_EQUAL(102, servoTellen(500));
  TEST_ASSERT_EQUAL(512, servoTellen(2500));
  // de puls past ruim in de periode van 20 ms (4096 tellen)
  TEST_ASSERT_TRUE(servoTellen(SERVO_MAX_US) < 4096);
  Servos s;
  TEST_ASSERT_EQUAL(0, s.tellen(0)); // nog geen stand: geen puls
  s.zetMeteen(0, 1500, STAND_A);
  TEST_ASSERT_EQUAL(307, s.tellen(0));
}

void test_snelheid() {
  Proef p;
  p.s.zetMeteen(0, 1000, STAND_A);
  p.s.naar(0, 2000, STAND_B, p.cfg[0], p.t);
  TEST_ASSERT_EQUAL_STRING("onderweg", p.s.standTekst(0));
  p.loop(500);
  TEST_ASSERT_INT_WITHIN(10, 1500, p.s.us(0));
  p.loop(500);
  TEST_ASSERT_EQUAL(2000, p.s.us(0));
  p.s.stap(p.cfg, p.t);
  TEST_ASSERT_EQUAL_STRING("b", p.s.standTekst(0));
  // terug met een andere snelheid: 4000 µs/s = 0,25 s
  p.cfg[0].snelheid = 4000;
  p.s.naar(0, 1000, STAND_A, p.cfg[0], p.t);
  p.loop(255);
  TEST_ASSERT_EQUAL(1000, p.s.us(0));
  TEST_ASSERT_EQUAL_STRING("a", p.s.standTekst(0));
  // grenzen 500..2500
  p.s.naar(0, 9000, STAND_B, p.cfg[0], p.t);
  p.loop(2000);
  TEST_ASSERT_EQUAL(SERVO_MAX_US, p.s.us(0));
}

void test_meteen_houdt_plaats_bezet() {
  Proef p;
  p.cfg[0].snelheid = 0;
  p.s.zetMeteen(0, 1000, STAND_A);
  p.s.naar(0, 2000, STAND_B, p.cfg[0], p.t);
  TEST_ASSERT_EQUAL(2000, p.s.us(0));
  TEST_ASSERT_EQUAL(1, p.s.bewegend());
  p.loop(200);
  TEST_ASSERT_EQUAL(1, p.s.bewegend());
  p.loop(150);
  TEST_ASSERT_EQUAL(0, p.s.bewegend());
  TEST_ASSERT_EQUAL_STRING("b", p.s.standTekst(0));
}

void test_hoogstens_vier_tegelijk() {
  Proef p;
  for (int i = 0; i < 6; i++) p.s.zetMeteen(i, 1000, STAND_A);
  for (int i = 0; i < 6; i++) p.s.naar(i, 2000, STAND_B, p.cfg[i], p.t);
  TEST_ASSERT_EQUAL(4, p.s.bewegend());
  TEST_ASSERT_EQUAL(2, p.s.wachtend());
  TEST_ASSERT_EQUAL(1000, p.s.us(4)); // wacht: beweegt nog niet
  TEST_ASSERT_EQUAL_STRING("onderweg", p.s.standTekst(4));
  for (int k = 0; k < 200; k++) {
    p.loop(5);
    TEST_ASSERT_TRUE(p.s.bewegend() <= SERVO_MAX_BEWEGEND);
  }
  // na 1 s zijn de eerste 4 er; 5 en 6 beginnen pas dan (in volgorde)
  TEST_ASSERT_EQUAL(2000, p.s.us(0));
  TEST_ASSERT_EQUAL(2, p.s.bewegend());
  TEST_ASSERT_EQUAL(0, p.s.wachtend());
  p.loop(1010);
  TEST_ASSERT_EQUAL(2000, p.s.us(5));
  TEST_ASSERT_EQUAL(0, p.s.bewegend());
}

void test_nieuw_doel_onderweg_en_vergeten() {
  Proef p;
  p.s.zetMeteen(0, 1000, STAND_A);
  p.s.naar(0, 2000, STAND_B, p.cfg[0], p.t);
  p.loop(300);
  p.s.naar(0, 1000, STAND_A, p.cfg[0], p.t); // halverwege terug
  TEST_ASSERT_EQUAL(1, p.s.bewegend());
  p.loop(305);
  TEST_ASSERT_EQUAL(1000, p.s.us(0));
  TEST_ASSERT_EQUAL_STRING("a", p.s.standTekst(0));
  // een servo zonder stand die een doel krijgt: springt (de echte stand is onbekend)
  p.s.naar(7, 1800, STAND_B, p.cfg[7], p.t);
  TEST_ASSERT_EQUAL(1800, p.s.us(7));
  p.loop(10);
  TEST_ASSERT_EQUAL(0, p.s.bewegend());
  // wachtend vergeten: weg uit de rij, geen puls
  for (int i = 0; i < 5; i++) p.s.zetMeteen(i, 1000, STAND_A);
  for (int i = 0; i < 5; i++) p.s.naar(i, 2000, STAND_B, p.cfg[i], p.t);
  p.s.vergeet(4);
  TEST_ASSERT_EQUAL(0, p.s.wachtend());
  TEST_ASSERT_EQUAL(0, p.s.tellen(4));
}

// E8: na het opstarten met 16 servo's krijgen ze hun eerste puls één voor één, om de 300 ms: nooit meer dan 1 (en dus
// zeker nooit meer dan 4) nieuwe pulsen binnen 300 ms. Ook servosOpStand in de Baan en de eerste opdracht naar().
void test_opstarten_een_voor_een() {
  Baan b;
  for (int i = 0; i < MAX_SERVOS; i++) {
    ServoCfg &c = b.cfg.servo[i];
    c.gebruikt = true;
    c.kanaal = (uint8_t)i;
    c.a = 1000;
    c.b = 2000;
  }
  b.servosOpStand(0x00FF, 0); // 1..8 op B, 9..16 op A
  std::vector<uint32_t> eerste;
  bool had[16] = {false};
  for (uint32_t t = 0; t <= 6000; t += 5) {
    if (t) b.tick(t, 0);
    uint16_t tel[16];
    b.servoTellen(tel);
    for (int k = 0; k < 16; k++)
      if (tel[k] && !had[k]) { had[k] = true; eerste.push_back(t); }
  }
  TEST_ASSERT_EQUAL(16, (int)eerste.size());
  for (size_t i = 0; i + 1 < eerste.size(); i++) TEST_ASSERT_TRUE(eerste[i + 1] - eerste[i] >= SERVO_SPRONG_MS);
  for (size_t i = 0; i + 4 < eerste.size(); i++) TEST_ASSERT_TRUE(eerste[i + 4] - eerste[i] >= SERVO_SPRONG_MS);
  TEST_ASSERT_EQUAL(servoTellen(2000), b.servos.tellen(0));
  TEST_ASSERT_EQUAL(servoTellen(1000), b.servos.tellen(15));
  // negatieve proef: zetMeteen (zoals 2.0.0 opstartte) geeft alle 16 meteen een puls
  Servos s;
  for (int i = 0; i < MAX_SERVOS; i++) s.zetMeteen(i, 1500, STAND_A);
  int meteen = 0;
  for (int i = 0; i < MAX_SERVOS; i++) meteen += s.tellen(i) != 0;
  TEST_ASSERT_EQUAL(16, meteen);
  // de eerste opdracht van servo's zonder stand: ook door de rij (2.0.0: puls meteen, ook als hij "wachtte")
  Proef p;
  for (int i = 0; i < 6; i++) p.s.naar(i, 2000, STAND_B, p.cfg[i], p.t);
  int metPuls = 0;
  for (int i = 0; i < 6; i++) metPuls += p.s.tellen(i) != 0;
  TEST_ASSERT_EQUAL(1, metPuls);
  TEST_ASSERT_EQUAL(5, p.s.wachtend());
  p.loop(1600);
  metPuls = 0;
  for (int i = 0; i < 6; i++) metPuls += p.s.tellen(i) != 0;
  TEST_ASSERT_EQUAL(6, metPuls);
}

// E14: meer dan 12 lichtgroepen aan: geen nieuwe beweging, de rij wacht tot er minder aan staan
void test_wachten_bij_veel_lampen() {
  Baan b;
  ServoCfg &c = b.cfg.servo[0];
  c.gebruikt = true;
  c.snelheid = 1000;
  b.servos.zetMeteen(0, c.a, STAND_A);
  for (int g = 0; g < 13; g++) b.lampen.stand[g].aan = true;
  b.tick(0, 0);
  b.tick(5, 0);
  TEST_ASSERT_TRUE(b.servos.geremd);
  TEST_ASSERT_TRUE(b.servoNaar(0, STAND_B, 5));
  for (uint32_t t = 10; t < 1000; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL(c.a, b.servos.us(0)); // wacht
  TEST_ASSERT_EQUAL_STRING("onderweg", b.servos.standTekst(0));
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 1000, true));
  TEST_ASSERT_TRUE(d["servoWachtLampen"].as<bool>());
  b.lampen.stand[12].aan = false; // 12 aan: mag weer
  for (uint32_t t = 1000; t < 2000; t += 5) b.tick(t, 0);
  TEST_ASSERT_FALSE(b.servos.geremd);
  TEST_ASSERT_EQUAL(c.b, b.servos.us(0));
}

// E19: pulsUitS: zoveel s na aankomst geen puls meer; de volgende opdracht zet hem weer aan. 0 = altijd puls.
void test_puls_uit_na_aankomst() {
  Proef p;
  p.cfg[0].pulsUitS = 1;
  p.s.zetMeteen(0, 1000, STAND_A);
  p.s.naar(0, 2000, STAND_B, p.cfg[0], p.t);
  p.loop(1000); // aangekomen
  p.loop(10);
  TEST_ASSERT_TRUE(p.s.tellen(0) != 0);
  p.loop(1000);
  TEST_ASSERT_EQUAL(0, p.s.tellen(0));
  TEST_ASSERT_EQUAL_STRING("b", p.s.standTekst(0));
  p.s.naar(0, 1000, STAND_A, p.cfg[0], p.t);
  TEST_ASSERT_TRUE(p.s.tellen(0) != 0);
  // pulsUitS 0: de puls blijft
  p.cfg[1].pulsUitS = 0;
  p.s.zetMeteen(1, 1500, STAND_A);
  p.loop(20000);
  TEST_ASSERT_TRUE(p.s.tellen(1) != 0);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_tellen_50hz);
  RUN_TEST(test_snelheid);
  RUN_TEST(test_meteen_houdt_plaats_bezet);
  RUN_TEST(test_hoogstens_vier_tegelijk);
  RUN_TEST(test_nieuw_doel_onderweg_en_vergeten);
  RUN_TEST(test_opstarten_een_voor_een);
  RUN_TEST(test_wachten_bij_veel_lampen);
  RUN_TEST(test_puls_uit_na_aankomst);
  return UNITY_END();
}
