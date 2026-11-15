// Tests van de bushalte (include/halte.h), los en in de Baan:  python -m platformio test -e native -f test_halte
// Aankomst, stopcode herhaald, wachten, verkeer vrij, groen (rijdcode, servo), vertrek (oranje, rood), terug vrij.
#include <unity.h>

#include <string>
#include <vector>

#include "api.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {

struct Nep : HalteUit {
  struct Ir { int code; uint8_t leds; uint32_t t; };
  std::vector<Ir> ir;
  bool licht[N_GROEPEN] = {false};
  int servo = -1;
  bool servoB = false;
  int vertrekBus = -9;
  uint32_t vertrekOm = 0;
  void halteIr(int code, uint8_t leds, uint32_t t) override { ir.push_back({code, leds, t}); }
  void halteLicht(int g, bool aan, uint32_t) override { licht[g] = aan; }
  void halteServo(int s, bool b, uint32_t) override { servo = s; servoB = b; }
  void halteVertrek(int bus, uint32_t t) override { vertrekBus = bus; vertrekOm = t; }
  int tel(int code) const {
    int n = 0;
    for (auto &x : ir) n += x.code == code;
    return n;
  }
};

struct Proef {
  HalteCfg cfg[MAX_HALTES];
  Haltes h;
  Nep u;
  uint32_t t = 1000;
  IngangMasker actief = 0;
  Proef() {
    HalteCfg &c = cfg[0];
    c.gebruikt = true;
    strcpy(c.naam, "Halte Station 1");
    strcpy(c.aankomstPunt, "P5");
    c.stopLeds = 1u << 4; // IR-led 5
    c.stopCode = 2;       // code 3
    c.rijdCode = 3;       // code 4
    c.wachtS = 12;
    c.vrijIngangen = ingangBit(6); // ingang 7
    c.vrijMinS = 3;
    c.rood = 8;
    c.oranje = 9;
    c.groen = 10;
    c.groenS = 5;
    c.servo = 0;
    h.begin(0, c, u, t);
  }
  void loop(uint32_t ms) {
    for (uint32_t e = t + ms; t < e;) {
      t += 5;
      h.stap(cfg, actief, u, t);
    }
  }
  const char *fase() const { return halteFaseId(h.t[0].fase); }
};

} // namespace

void test_hele_cyclus() {
  Proef p;
  TEST_ASSERT_EQUAL_STRING("vrij", p.fase());
  TEST_ASSERT_TRUE(p.u.licht[8]); // rood bij het begin
  // een melding op een ander punt: niets
  p.h.melding(p.cfg, "P4", 1, p.u, p.t);
  TEST_ASSERT_EQUAL_STRING("vrij", p.fase());
  // aankomst: rood, meteen de stopcode via IR-led 5
  p.h.melding(p.cfg, "P5", 1, p.u, p.t);
  TEST_ASSERT_EQUAL_STRING("aankomst", p.fase());
  TEST_ASSERT_EQUAL(1, p.h.t[0].bus);
  TEST_ASSERT_TRUE(p.h.houdtVast(1));
  TEST_ASSERT_EQUAL(1, p.u.tel(2));
  TEST_ASSERT_EQUAL_HEX8(1u << 4, p.u.ir[0].leds);
  p.loop(500);
  TEST_ASSERT_EQUAL_STRING("stop", p.fase());
  // stop: elke 0,5 s opnieuw, 2 s lang
  p.loop(1990);
  TEST_ASSERT_EQUAL_STRING("stop", p.fase());
  TEST_ASSERT_EQUAL(1 + 4, p.u.tel(2));
  p.loop(10);
  TEST_ASSERT_EQUAL_STRING("wachten", p.fase());
  TEST_ASSERT_EQUAL(12, p.h.resterendS(0, p.cfg[0], p.t));
  // een tweede bus die aankomt terwijl de halte bezig is: niets
  p.h.melding(p.cfg, "P5", 2, p.u, p.t);
  TEST_ASSERT_EQUAL(1, p.h.t[0].bus);
  p.loop(12000);
  TEST_ASSERT_EQUAL_STRING("verkeer", p.fase());
  // verkeer: ingang 7 actief houdt de bus tegen; pas 3 s onafgebroken vrij geeft groen
  p.actief = ingangBit(6);
  p.loop(5000);
  TEST_ASSERT_EQUAL_STRING("verkeer", p.fase());
  TEST_ASSERT_EQUAL(3, p.h.resterendS(0, p.cfg[0], p.t));
  p.actief = 0;
  p.loop(2000);
  p.actief = ingangBit(6); // even weer bezet: opnieuw tellen
  p.loop(10);
  p.actief = ingangBit(3); // een andere ingang telt niet
  p.loop(2990);
  TEST_ASSERT_EQUAL_STRING("verkeer", p.fase());
  p.loop(20);
  TEST_ASSERT_EQUAL_STRING("groen", p.fase());
  TEST_ASSERT_TRUE(p.u.licht[10]);
  TEST_ASSERT_FALSE(p.u.licht[8]);
  TEST_ASSERT_EQUAL(0, p.u.servo);
  TEST_ASSERT_TRUE(p.u.servoB);
  TEST_ASSERT_EQUAL(1, p.u.vertrekBus);
  TEST_ASSERT_FALSE(p.h.houdtVast(1)); // de bus rijdt
  // rijdcode 3 keer om de 0,5 s
  p.loop(1500);
  TEST_ASSERT_EQUAL(3, p.u.tel(3));
  p.loop(3500);
  TEST_ASSERT_EQUAL_STRING("vertrek", p.fase());
  TEST_ASSERT_FALSE(p.u.licht[10]);
  TEST_ASSERT_TRUE(p.u.licht[9]); // oranje
  p.loop(2000);
  TEST_ASSERT_EQUAL_STRING("vrij", p.fase());
  TEST_ASSERT_TRUE(p.u.licht[8]);
  TEST_ASSERT_FALSE(p.u.licht[9]);
  TEST_ASSERT_FALSE(p.u.servoB); // slagboom weer dicht
  TEST_ASSERT_EQUAL(-1, p.h.t[0].bus);
  // en de volgende bus kan komen
  p.h.melding(p.cfg, "P5", 3, p.u, p.t);
  TEST_ASSERT_EQUAL_STRING("aankomst", p.fase());
}

void test_zonder_vrije_ingangen_meteen_groen() {
  Proef p;
  p.cfg[0].vrijIngangen = 0;
  p.cfg[0].wachtS = 0;
  p.cfg[0].servo = -1;
  p.h.melding(p.cfg, "P5", -1, p.u, p.t); // een onbekende bus (hallsensor zonder bus)
  p.loop(2500);
  p.loop(10);
  TEST_ASSERT_EQUAL_STRING("groen", p.fase());
  TEST_ASSERT_EQUAL(-1, p.u.servo);
  TEST_ASSERT_EQUAL(-1, p.u.vertrekBus);
}

void test_halte_in_de_baan_met_ir_en_bus() {
  Baan b;
  // IR-codes 3 en 4, bus 1 met code, punt P5 aan ontvanger 2, halte 1
  auto post = [&](Antwoord (*f)(Baan &, const char *, size_t, uint32_t), const std::string &j, uint32_t nu = 0) {
    Antwoord a = f(b, j.data(), j.size(), nu);
    TEST_ASSERT_EQUAL_MESSAGE(200, a.code, a.json.c_str());
  };
  post(apiIr, R"({"actie":"bewaren","nr":3,"code":{"naam":"Stop","soort":"nec","adres":0,"commando":1}})");
  post(apiIr, R"({"actie":"bewaren","nr":4,"code":{"naam":"Rijd","soort":"nec","adres":0,"commando":2}})");
  post(apiBus, R"({"nr":1,"naam":"Bus 1","kleur":"#d23","code":"nec:00FF12ED"})");
  post(apiPunt, R"({"id":"P5","ontvanger":2})");
  post(apiHalte, R"({"nr":1,"naam":"Halte Station 1","aankomstPunt":"P5","stopLeds":[5],"stopCode":3,"rijdCode":4,
    "wachtS":1,"vrijIngangen":[7],"vrijMinS":1,"licht":{"rood":9,"oranje":10,"groen":11},"groenS":1,"servo":0})");
  TEST_ASSERT_TRUE(b.lampen.stand[8].aan); // rood
  // de bus komt voorbij ontvanger 2: zijn code als frame (ns)
  IrCode c;
  c.adres = 0;
  c.commando = 0x12;
  uint32_t us[MAX_IR_PULSEN];
  int n = irPulsen(c, us, MAX_IR_PULSEN);
  for (int i = 0; i < n; i++) us[i] *= 1000;
  b.irFrame(1, us, n, 100);
  TEST_ASSERT_EQUAL(FASE_AANKOMST, b.haltes.t[0].fase);
  TEST_ASSERT_EQUAL(0, b.haltes.t[0].bus);
  IrZend z;
  TEST_ASSERT_TRUE(b.haalIrZend(z));
  TEST_ASSERT_EQUAL(2, z.code);
  TEST_ASSERT_EQUAL_HEX8(1u << 4, z.leds);
  std::string k = apiStaat(b, 200, true);
  JsonDocument d;
  deserializeJson(d, k);
  TEST_ASSERT_EQUAL_STRING("aankomst", d["haltes"][0]["fase"]);
  TEST_ASSERT_EQUAL(1, d["haltes"][0]["bus"].as<int>());
  TEST_ASSERT_EQUAL_STRING("halte", d["bussen"][0]["staat"]);
  TEST_ASSERT_EQUAL_STRING("P5", d["bussen"][0]["van"]);
  // verder: stop 2 s, wachten 1 s, verkeer 1 s, groen 1 s, vertrek 2 s
  uint32_t t = 100;
  for (; t < 100 + 2500 + 1000 + 1000 + 50; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL(FASE_GROEN, b.haltes.t[0].fase);
  TEST_ASSERT_TRUE(b.lampen.stand[10].aan);
  TEST_ASSERT_FALSE(b.lampen.stand[8].aan);
  for (; t < 100 + 2500 + 1000 + 1000 + 1000 + 2000 + 50; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL(FASE_VRIJ, b.haltes.t[0].fase);
  TEST_ASSERT_TRUE(b.lampen.stand[8].aan);
  TEST_ASSERT_FALSE(b.lampen.stand[9].aan);
  TEST_ASSERT_FALSE(b.lampen.stand[10].aan);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_hele_cyclus);
  RUN_TEST(test_zonder_vrije_ingangen_meteen_groen);
  RUN_TEST(test_halte_in_de_baan_met_ir_en_bus);
  return UNITY_END();
}
