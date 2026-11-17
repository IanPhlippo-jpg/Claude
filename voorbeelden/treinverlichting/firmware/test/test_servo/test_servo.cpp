// Tests van include/servo.h:  python -m platformio test -e native -f test_servo
// Tellen bij 50 Hz, snelheid (µs/s), meteen (snelheid 0), hoogstens 4 (standaard 2, EN3) tegelijk met een wachtrij,
// nieuw doel onderweg; de rem bij veel lampen (FN3: standaard uit, dan één tegelijk, melding na 5 s).
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
  p.s.maxBewegend = 4; // de grens van de instelling
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
  // wachtend vergeten: weg uit de rij, geen puls (4 tegelijk: de vijfde wacht)
  p.s.maxBewegend = 4;
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

// EN3: standaard bewegen hoogstens 2 servo's tegelijk (2 x 1,2 A binnen de 3 A van de XL4015); instelbaar 1..4
void test_standaard_twee_tegelijk() {
  Proef p;
  TEST_ASSERT_EQUAL(2, p.s.maxBewegend);
  for (int i = 0; i < 4; i++) p.s.zetMeteen(i, 1000, STAND_A);
  for (int i = 0; i < 4; i++) p.s.naar(i, 2000, STAND_B, p.cfg[i], p.t);
  TEST_ASSERT_EQUAL(2, p.s.bewegend());
  TEST_ASSERT_EQUAL(2, p.s.wachtend());
  for (int k = 0; k < 400; k++) {
    p.loop(5);
    TEST_ASSERT_TRUE(p.s.bewegend() <= 2);
  }
  TEST_ASSERT_EQUAL(2000, p.s.us(3));
  // in de Baan: de instelling servoMaxBewegend
  Baan b;
  TEST_ASSERT_EQUAL(2, b.cfg.inst.servoMaxBewegend);
  for (int i = 0; i < 4; i++) {
    b.cfg.servo[i].gebruikt = true;
    b.servos.zetMeteen(i, b.cfg.servo[i].a, STAND_A);
  }
  b.cfg.inst.servoMaxBewegend = 3;
  b.tick(0, 0);
  for (int i = 0; i < 4; i++) b.servoNaar(i, STAND_B, 0);
  TEST_ASSERT_EQUAL(3, b.servos.bewegend());
  // via de API: 1..4, anders 400
  auto inst = [&](const char *j) { return apiInstellingen(b, j, strlen(j), 0).code; };
  TEST_ASSERT_EQUAL(200, inst(R"({"servoMaxBewegend":1})"));
  TEST_ASSERT_EQUAL(1, b.cfg.inst.servoMaxBewegend);
  TEST_ASSERT_EQUAL(400, inst(R"({"servoMaxBewegend":5})"));
  TEST_ASSERT_EQUAL(400, inst(R"({"servoMaxBewegend":0})"));
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, false));
  TEST_ASSERT_EQUAL(1, d["instellingen"]["servoMaxBewegend"].as<int>());
}

// E14 + FN3: de rem staat standaard UIT: met 13 lichtgroepen aan (een avondscène) bewegen de servo's gewoon.
// Negatieve proef: met de rem op 12 groepen (zoals 2.1.0 altijd) staan ze in 2.1.0 stil; nu gaat er één tegelijk.
// Een servo die langer dan 5 s wacht: een melding.
void test_wachten_bij_veel_lampen() {
  Baan b;
  for (int i = 0; i < 3; i++) {
    ServoCfg &c = b.cfg.servo[i];
    c.gebruikt = true;
    c.snelheid = 1000; // 0,8 s van A naar B
    snprintf(c.naam, sizeof c.naam, "Wissel %d", i + 1);
    b.servos.zetMeteen(i, c.a, STAND_A);
  }
  const ServoCfg &c = b.cfg.servo[0];
  TEST_ASSERT_EQUAL(0, b.cfg.inst.servoRemGroepen); // standaard uit
  for (int g = 0; g < 13; g++) b.lampen.stand[g].aan = true;
  b.tick(0, 0);
  b.tick(5, 0);
  TEST_ASSERT_FALSE(b.servos.geremd);
  TEST_ASSERT_TRUE(b.servoNaar(0, STAND_B, 5));
  uint32_t t = 10;
  for (; t < 1000; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL(c.b, b.servos.us(0)); // bewogen, ondanks 13 groepen
  // de rem aan op 12 groepen: geremd, maar één servo tegelijk (niet stil)
  b.cfg.inst.servoRemGroepen = 12;
  b.tick(t, 0);
  TEST_ASSERT_TRUE(b.servos.geremd);
  for (int i = 0; i < 3; i++) b.servoNaar(i, i == 0 ? STAND_A : STAND_B, t);
  TEST_ASSERT_EQUAL(1, b.servos.bewegend());
  TEST_ASSERT_EQUAL(2, b.servos.wachtend());
  JsonDocument d;
  deserializeJson(d, apiStaat(b, t, true));
  TEST_ASSERT_TRUE(d["servoWachtLampen"].as<bool>());
  TEST_ASSERT_EQUAL(0, d["servoWachtLang"].as<int>());
  int maxSamen = 0;
  uint32_t t0 = t;
  for (; t < t0 + 3000; t += 5) {
    b.tick(t, 0);
    if (b.servos.bewegend() > maxSamen) maxSamen = b.servos.bewegend();
  }
  TEST_ASSERT_EQUAL(1, maxSamen);
  TEST_ASSERT_EQUAL(c.a, b.servos.us(0));
  TEST_ASSERT_EQUAL(b.cfg.servo[2].b, b.servos.us(2)); // alle drie na elkaar aangekomen
  // melding na 5 s wachten: met een servo die nooit klaar raakt (snelheid 1 µs/s) blijft de rij staan
  b.cfg.servo[0].snelheid = 1;
  b.servoNaar(0, STAND_B, t);
  b.servoNaar(1, STAND_A, t);
  t0 = t;
  for (; t < t0 + 4900; t += 5) b.tick(t, 0);
  TEST_ASSERT_TRUE(b.logicaMelding().empty());
  for (; t < t0 + 5100; t += 5) b.tick(t, 0);
  TEST_ASSERT_TRUE(b.logicaMelding().find("Wissel 2") != std::string::npos);
  TEST_ASSERT_TRUE(b.logicaMelding().find("één voor één") != std::string::npos);
  deserializeJson(d, apiStaat(b, t, true));
  TEST_ASSERT_EQUAL(2, d["servoWachtLang"].as<int>());
  // minder lampen aan: niet meer geremd, servo 2 mag meteen (2 tegelijk)
  b.lampen.stand[12].aan = false;
  for (uint32_t e = t + 1100; t < e; t += 5) b.tick(t, 0);
  TEST_ASSERT_FALSE(b.servos.geremd);
  TEST_ASSERT_EQUAL(b.cfg.servo[1].a, b.servos.us(1));
  TEST_ASSERT_TRUE(b.logicaMelding().empty());
  // de instelling via de API: 0..N_GROEPEN
  auto inst = [&](const char *j) { return apiInstellingen(b, j, strlen(j), 0).code; };
  TEST_ASSERT_EQUAL(200, inst(R"({"servoRemGroepen":0})"));
  TEST_ASSERT_EQUAL(0, b.cfg.inst.servoRemGroepen);
  TEST_ASSERT_EQUAL(400, inst(R"({"servoRemGroepen":-1})"));
  TEST_ASSERT_EQUAL(400, inst(R"({"servoRemGroepen":99})"));
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
  RUN_TEST(test_standaard_twee_tegelijk);
  RUN_TEST(test_nieuw_doel_onderweg_en_vergeten);
  RUN_TEST(test_opstarten_een_voor_een);
  RUN_TEST(test_wachten_bij_veel_lampen);
  RUN_TEST(test_puls_uit_na_aankomst);
  return UNITY_END();
}
