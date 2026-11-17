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

// de cyclus zonder "herhalen" (zoals firmware 2.0.0): de stopcode alleen in aankomst en stop
void test_hele_cyclus() {
  Proef p;
  p.cfg[0].herhalen = false;
  TEST_ASSERT_EQUAL_STRING("vrij", p.fase());
  TEST_ASSERT_TRUE(p.u.licht[8]); // rood bij het begin
  TEST_ASSERT_EQUAL(1, p.u.tel(3)); // F2: na het opstarten één keer de rijdcode
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
  // dezelfde bus nog eens gemeld (of een onbekende): niets
  p.h.melding(p.cfg, "P5", 1, p.u, p.t);
  p.h.melding(p.cfg, "P5", -1, p.u, p.t);
  TEST_ASSERT_EQUAL(1, p.h.t[0].bus);
  TEST_ASSERT_FALSE(p.h.t[0].heeftWachtend);
  TEST_ASSERT_EQUAL(1 + 4, p.u.tel(2));
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
  // rijdcode 3 keer om de 0,5 s (en 1 keer na het opstarten)
  p.loop(1500);
  TEST_ASSERT_EQUAL(1 + 3, p.u.tel(3));
  TEST_ASSERT_EQUAL(1 + 4, p.u.tel(2)); // zonder herhalen: geen stopcode meer na "stop"
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
  TEST_ASSERT_TRUE(b.haalIrZend(z)); // F2: na het bewaren van de halte eerst één keer de rijdcode
  TEST_ASSERT_EQUAL(3, z.code);
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

// F2: met "herhalen" (standaard) de stopcode elke 400 ms van aankomst tot het einde van verkeer, ook in "wachten"
void test_herhalen_tot_groen() {
  Proef p;
  TEST_ASSERT_TRUE(p.cfg[0].herhalen);
  p.cfg[0].vrijIngangen = 0;
  p.h.melding(p.cfg, "P5", 1, p.u, p.t);
  TEST_ASSERT_EQUAL(1, p.u.tel(2));
  p.loop(2500); // aankomst + stop: om de 400 ms
  TEST_ASSERT_EQUAL_STRING("wachten", p.fase());
  TEST_ASSERT_EQUAL(1 + 6, p.u.tel(2));
  p.loop(10000); // ook tijdens wachten (dat deed 2.0.0 niet: een bus die alleen bij IR stopt, reed weg)
  TEST_ASSERT_EQUAL_STRING("wachten", p.fase());
  TEST_ASSERT_EQUAL(1 + 6 + 25, p.u.tel(2));
  p.loop(2010);
  TEST_ASSERT_EQUAL_STRING("groen", p.fase());
  int stops = p.u.tel(2);
  p.loop(3000);
  TEST_ASSERT_EQUAL(stops, p.u.tel(2)); // in groen geen stopcode meer
}

// F2: de doos herstart terwijl een bus aan de halte wacht: begin() zendt meteen één keer de rijdcode
void test_herstart_tijdens_wachten() {
  Proef p;
  p.h.melding(p.cfg, "P5", 1, p.u, p.t);
  p.loop(4000);
  TEST_ASSERT_EQUAL_STRING("wachten", p.fase());
  Nep na; // na de herstart: een nieuwe Haltes, alles vrij
  Haltes h;
  h.begin(0, p.cfg[0], na, 0);
  TEST_ASSERT_EQUAL(FASE_VRIJ, h.t[0].fase);
  TEST_ASSERT_EQUAL(1, (int)na.ir.size());
  TEST_ASSERT_EQUAL(3, na.ir[0].code); // de rijdcode
  TEST_ASSERT_EQUAL_HEX8(1u << 4, na.ir[0].leds);
  // negatieve proef: zonder rijdcode valt er niets te zenden
  Nep leeg;
  HalteCfg c = p.cfg[0];
  c.rijdCode = -1;
  h.begin(0, c, leeg, 0);
  TEST_ASSERT_EQUAL(0, (int)leeg.ir.size());
}

// F3 + FN1: een tweede bus tijdens groen wordt onthouden en krijgt meteen de stopcode, maar via de wachtled (IR-led 4);
// de eerste bus krijgt zijn rijdcode via de stopled (IR-led 5) gewoon 3 keer. De halte begint met de wachtende zodra
// ze vrij is.
void test_tweede_bus_tijdens_groen() {
  Proef p;
  p.cfg[0].vrijIngangen = 0;
  p.cfg[0].wachtS = 1;
  p.cfg[0].wachtLeds = 1u << 3; // IR-led 4
  p.h.melding(p.cfg, "P5", 1, p.u, p.t);
  p.loop(3510);
  TEST_ASSERT_EQUAL_STRING("groen", p.fase());
  int stops = p.u.tel(2), rijd = p.u.tel(3);
  p.h.melding(p.cfg, "P5", 2, p.u, p.t);
  TEST_ASSERT_TRUE(p.h.t[0].heeftWachtend);
  TEST_ASSERT_EQUAL(2, p.h.t[0].wachtendBus);
  TEST_ASSERT_EQUAL(stops + 1, p.u.tel(2)); // meteen de stopcode
  TEST_ASSERT_EQUAL_HEX8(1u << 3, p.u.ir.back().leds); // via de wachtled
  TEST_ASSERT_TRUE(p.h.houdt(0));
  TEST_ASSERT_FALSE(p.h.houdtStop(0));
  p.h.melding(p.cfg, "P5", 3, p.u, p.t);   // een derde: niet (hoogstens één wachtende)
  TEST_ASSERT_EQUAL(2, p.h.t[0].wachtendBus);
  p.loop(1000);
  TEST_ASSERT_EQUAL(rijd + 2, p.u.tel(3));   // FN1: de rijdcode loopt door (3 keer in groen)
  TEST_ASSERT_TRUE(p.u.tel(2) >= stops + 3); // de stopcode herhaald
  for (auto &x : p.u.ir)
    if (x.t > p.t - 1000) TEST_ASSERT_EQUAL_HEX8(x.code == 2 ? 1u << 3 : 1u << 4, x.leds); // stop: led 4, rijd: led 5
  p.loop(4000 + 2000);
  TEST_ASSERT_EQUAL_STRING("aankomst", p.fase()); // na vertrek meteen de wachtende bus
  TEST_ASSERT_EQUAL(2, p.h.t[0].bus);
  TEST_ASSERT_FALSE(p.h.t[0].heeftWachtend);
  // in de staat: "wachtend"
  Baan b;
  b.cfg.halte[0] = p.cfg[0];
  b.haltes.t[0] = p.h.t[0];
  b.haltes.t[0].heeftWachtend = true;
  b.haltes.t[0].wachtendBus = -1;
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, true));
  TEST_ASSERT_EQUAL(0, d["haltes"][0]["wachtend"].as<int>()); // een onbekende bus wacht
  b.haltes.t[0].heeftWachtend = false;
  deserializeJson(d, apiStaat(b, 0, true));
  TEST_ASSERT_EQUAL(-1, d["haltes"][0]["wachtend"].as<int>());
}

namespace {
/** QN2: een nep-bus van het Car System: staat boven één IR-led, stopt op de stopcode en rijdt op de rijdcode (een bus
 *  die de stopcode onthoudt). Hij leest alleen wat via zijn eigen led gaat (leds 0 = alle leds). */
struct NepBus {
  uint8_t led;
  bool rijdt = true;
  void zie(const Nep::Ir &x, int stop, int rijd) {
    uint8_t leds = x.leds ? x.leds : 0xFF;
    if (!(leds & led)) return;
    if (x.code == stop) rijdt = false;
    if (x.code == rijd) rijdt = true;
  }
};
/** wat elke led in elke fase zond: bit 0 = stopcode, bit 1 = rijdcode */
struct Gezien {
  uint8_t led[N_FASEN][8] = {{0}};
  void zie(int fase, const Nep::Ir &x, int stop, int rijd) {
    uint8_t leds = x.leds ? x.leds : 0xFF;
    for (int k = 0; k < 8; k++)
      if (leds >> k & 1) led[fase][k] |= (uint8_t)((x.code == stop ? 1 : 0) | (x.code == rijd ? 2 : 0));
  }
};
} // namespace

// QN2 + FN1, vanuit de bussen: bus 1 staat aan de stopled (IR-led 5), bus 2 komt aan terwijl de halte bezet is en
// staat aan de wachtled (IR-led 4). Bus 1 moet in groen vertrekken terwijl bus 2 blijft wachten; daarna rijdt bus 2 naar
// de stopled en stopt daar. Per fase: wat zag elke led? (2.1.0: in groen kreeg led 5 de stopcode voor bus 2 en geen
// rijdcode: bus 1 bleef staan.)
void test_twee_bussen_vanuit_de_bus() {
  Proef p;
  p.cfg[0].vrijIngangen = 0;
  p.cfg[0].wachtS = 4;
  p.cfg[0].groenS = 5;
  p.cfg[0].wachtLeds = 1u << 3;
  const uint8_t STOPLED = 1u << 4, WACHTLED = 1u << 3;
  NepBus bus1{STOPLED}, bus2{WACHTLED};
  Gezien g;
  size_t gelezen = p.u.ir.size();
  bool bus1ReedInGroen = false, bus2StondInGroen = true, bus2StondInVertrek = true;
  auto loop = [&](uint32_t ms) {
    for (uint32_t e = p.t + ms; p.t < e;) {
      p.t += 5;
      p.h.stap(p.cfg, p.actief, p.u, p.t);
      for (; gelezen < p.u.ir.size(); gelezen++) {
        const Nep::Ir &x = p.u.ir[gelezen];
        bus1.zie(x, 2, 3);
        bus2.zie(x, 2, 3);
        g.zie(p.h.t[0].fase, x, 2, 3);
      }
      if (p.h.t[0].fase == FASE_GROEN && p.h.t[0].bus == 1) {
        bus1ReedInGroen = bus1ReedInGroen || bus1.rijdt;
        bus2StondInGroen = bus2StondInGroen && !bus2.rijdt;
        if (bus1.rijdt) bus1.led = 0; // hij rijdt weg: boven geen led van de halte meer
      }
      if (p.h.t[0].fase == FASE_VERTREK && p.h.t[0].bus == 1) bus2StondInVertrek = bus2StondInVertrek && !bus2.rijdt;
    }
  };
  auto melding = [&](int bus) {
    p.h.melding(p.cfg, "P5", bus, p.u, p.t);
    for (; gelezen < p.u.ir.size(); gelezen++) {
      bus1.zie(p.u.ir[gelezen], 2, 3);
      bus2.zie(p.u.ir[gelezen], 2, 3);
      g.zie(p.h.t[0].fase, p.u.ir[gelezen], 2, 3);
    }
  };
  melding(1);
  TEST_ASSERT_FALSE(bus1.rijdt); // bus 1 stopt aan de halte
  loop(1000);
  melding(2); // bus 2 komt aan tijdens "stop"
  TEST_ASSERT_TRUE(p.h.t[0].heeftWachtend);
  TEST_ASSERT_FALSE(bus2.rijdt); // en wacht aan de wachtled
  loop(1500 + 4000 + 10);
  TEST_ASSERT_EQUAL_STRING("groen", p.fase());
  loop(5000 + 2000);
  // bus 1 vertrok in groen, bus 2 bleef wachten tot de halte vrij was
  TEST_ASSERT_TRUE_MESSAGE(bus1ReedInGroen, "bus 1 moet in groen vertrekken");
  TEST_ASSERT_TRUE_MESSAGE(bus2StondInGroen, "bus 2 moet in groen blijven wachten");
  TEST_ASSERT_TRUE(bus2StondInVertrek);
  TEST_ASSERT_TRUE(bus1.rijdt);
  // per led en fase (eerste cyclus, bus 1)
  TEST_ASSERT_EQUAL_HEX8(1, g.led[FASE_AANKOMST][4]); // stopled: stop
  TEST_ASSERT_EQUAL_HEX8(1, g.led[FASE_WACHTEN][4]);
  TEST_ASSERT_EQUAL_HEX8(1, g.led[FASE_WACHTEN][3]); // wachtled: stop (voor bus 2)
  TEST_ASSERT_EQUAL_HEX8(2, g.led[FASE_GROEN][4]);   // stopled: alleen rijd
  TEST_ASSERT_EQUAL_HEX8(1, g.led[FASE_GROEN][3]);   // wachtled: alleen stop
  TEST_ASSERT_EQUAL_HEX8(0, g.led[FASE_VERTREK][4]); // stopled: niets
  TEST_ASSERT_EQUAL_HEX8(1, g.led[FASE_VERTREK][3]); // wachtled: nog altijd stop
  for (int k : {0, 1, 2, 5, 6, 7})
    for (int f = 0; f < N_FASEN; f++) TEST_ASSERT_EQUAL_HEX8(0, g.led[f][k] & 1); // de andere leds: nooit een stopcode
  // de halte begint met bus 2: hij krijgt de rijdcode aan de wachtled en rijdt
  TEST_ASSERT_EQUAL(2, p.h.t[0].bus);
  TEST_ASSERT_TRUE(bus2.rijdt);
  loop(300);
  bus2.led = STOPLED; // na 0,3 s staat hij boven de stopled
  loop(500);
  TEST_ASSERT_FALSE(bus2.rijdt); // en stopt daar (stopcode elke 400 ms)
  TEST_ASSERT_TRUE(bus1.rijdt);  // bus 1 is al weg en ziet niets meer van de halte
  loop(2000 + 4000 + 10);
  TEST_ASSERT_EQUAL_STRING("groen", p.fase());
  loop(100);
  TEST_ASSERT_TRUE(bus2.rijdt);
}

// FN1: zonder wachtled (leeg) wordt de tweede bus niet tegengehouden (zoals 2.0.0): geen stopcode, niet onthouden
void test_zonder_wachtled_niet_tegenhouden() {
  Proef p;
  p.cfg[0].vrijIngangen = 0;
  p.cfg[0].wachtS = 1;
  TEST_ASSERT_EQUAL_HEX8(0, p.cfg[0].wachtLeds);
  p.h.melding(p.cfg, "P5", 1, p.u, p.t);
  p.loop(1000);
  int stops = p.u.tel(2);
  p.h.melding(p.cfg, "P5", 2, p.u, p.t);
  TEST_ASSERT_FALSE(p.h.t[0].heeftWachtend);
  TEST_ASSERT_EQUAL(stops, p.u.tel(2));
  p.loop(2510);
  TEST_ASSERT_EQUAL_STRING("groen", p.fase());
  p.loop(1000);
  TEST_ASSERT_EQUAL(1 + 3, p.u.tel(3)); // opstarten 1 (zonder loop in vrij) + 3 in groen
  p.loop(4000 + 2000);
  TEST_ASSERT_EQUAL_STRING("vrij", p.fase()); // geen wachtende: vrij
}

// FN7: na het opstarten de rijdcode 3 keer (om de 0,5 s) via de stopled en de wachtled; een bus die intussen aankomt,
// stopt de reeks
void test_opstarten_rijdcode_drie_keer() {
  Proef p;
  p.cfg[0].wachtLeds = 1u << 3;
  Nep u;
  Haltes h;
  h.begin(0, p.cfg[0], u, 0);
  for (uint32_t t = 5; t <= 1100; t += 5) h.stap(p.cfg, 0, u, t);
  TEST_ASSERT_EQUAL(3, u.tel(3));
  for (auto &x : u.ir) TEST_ASSERT_EQUAL_HEX8((1u << 4) | (1u << 3), x.leds);
  TEST_ASSERT_EQUAL(500, (int)(u.ir[1].t - u.ir[0].t));
  // een bus komt na 0,2 s aan: geen rijdcodes meer (wel de stopcode)
  Nep v;
  Haltes h2;
  h2.begin(0, p.cfg[0], v, 0);
  h2.melding(p.cfg, "P5", 1, v, 200);
  for (uint32_t t = 205; t <= 20000; t += 5) h2.stap(p.cfg, 0, v, t);
  TEST_ASSERT_EQUAL(1 + 3, v.tel(3)); // 1 bij het opstarten, 3 in groen
}

// FN1: de API weigert een wachtled die ook stopled is, of een wachtled zonder gekozen stopled (leeg = alle leds)
void test_wachtleds_api() {
  Baan b;
  auto roep = [&](const char *j) { return apiHalte(b, j, strlen(j), 0); };
  TEST_ASSERT_EQUAL(200, roep(R"({"nr":1,"naam":"H","aankomstPunt":"P5","stopLeds":[5],"wachtLeds":[4]})").code);
  TEST_ASSERT_EQUAL_HEX8(1u << 3, b.cfg.halte[0].wachtLeds);
  Antwoord a = roep(R"({"nr":1,"naam":"H","stopLeds":[5],"wachtLeds":[5]})");
  TEST_ASSERT_EQUAL(400, a.code);
  TEST_ASSERT_TRUE(a.json.find("verschillende") != std::string::npos);
  TEST_ASSERT_EQUAL(400, roep(R"({"nr":1,"naam":"H","stopLeds":[],"wachtLeds":[4]})").code);
  TEST_ASSERT_EQUAL(400, roep(R"({"nr":1,"naam":"H","wachtLeds":[5]})").code); // de bewaarde stopled is 5
  TEST_ASSERT_EQUAL(400, roep(R"({"nr":1,"naam":"H","wachtLeds":[9]})").code);
  TEST_ASSERT_EQUAL_HEX8(1u << 3, b.cfg.halte[0].wachtLeds); // niets veranderd
  TEST_ASSERT_EQUAL(200, roep(R"({"nr":1,"naam":"H","wachtLeds":[]})").code);
  TEST_ASSERT_EQUAL_HEX8(0, b.cfg.halte[0].wachtLeds);
  // in de staat (volledig) en terug uit een bestand
  roep(R"({"nr":1,"naam":"H","wachtLeds":[3,4]})");
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, false));
  TEST_ASSERT_EQUAL(2, (int)d["haltes"][0]["wachtLeds"].size());
  TEST_ASSERT_EQUAL(3, d["haltes"][0]["wachtLeds"][0].as<int>());
  Config c;
  std::string json = configNaarJson(b.cfg), mld;
  configVanJson(json.data(), json.size(), c, mld);
  TEST_ASSERT_EQUAL_HEX8((1u << 2) | (1u << 3), c.halte[0].wachtLeds);
}

// F12: een vrij-ingang die actief blijft (magneet boven de sensor, losse draad): na maxVerkeerS toch groen, met melding
void test_verkeer_blijft_bezet() {
  Proef p;
  p.cfg[0].wachtS = 0;
  p.cfg[0].maxVerkeerS = 60;
  p.h.melding(p.cfg, "P5", 1, p.u, p.t);
  p.actief = ingangBit(6);
  p.loop(2510);
  TEST_ASSERT_EQUAL_STRING("verkeer", p.fase());
  p.loop(59000);
  TEST_ASSERT_EQUAL_STRING("verkeer", p.fase());
  p.loop(1010);
  TEST_ASSERT_EQUAL_STRING("groen", p.fase());
  TEST_ASSERT_TRUE(p.h.t[0].teLang);
  Baan b;
  b.cfg.halte[0] = p.cfg[0];
  b.haltes.t[0] = p.h.t[0];
  TEST_ASSERT_TRUE(b.logicaMelding().find("Halte Station 1") != std::string::npos);
  // maxVerkeerS = 0: geen grens (zoals 2.0.0)
  Proef q;
  q.cfg[0].wachtS = 0;
  q.cfg[0].maxVerkeerS = 0;
  q.h.melding(q.cfg, "P5", 1, q.u, q.t);
  q.actief = ingangBit(6);
  q.loop(200000);
  TEST_ASSERT_EQUAL_STRING("verkeer", q.fase());
}

// F1: een halte met een continu-stopcode laat de stopleds branden zolang ze de bus vasthoudt
void test_continu_stopcode() {
  Baan b;
  b.cfg.ir[0].gebruikt = true;
  b.cfg.ir[0].soort = IR_CONTINU;
  HalteCfg &c = b.cfg.halte[0];
  c.gebruikt = true;
  strcpy(c.aankomstPunt, "P5");
  c.stopLeds = 1u << 4;
  c.stopCode = 0;
  c.wachtS = 1;
  c.groenS = 1;
  b.haltesOpnieuw(0);
  TEST_ASSERT_EQUAL_HEX8(0, b.continuLeds(0));
  b.busGezien(-1, "P5", 0);
  b.haltes.melding(b.cfg.halte, "P5", -1, b, 0);
  TEST_ASSERT_EQUAL_HEX8(1u << 4, b.continuLeds(0));
  IrZend z;
  TEST_ASSERT_FALSE(b.haalIrZend(z)); // niets in de rij: continu gaat niet via de RMT
  uint32_t t = 0;
  for (; t < 3600; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL(FASE_GROEN, b.haltes.t[0].fase);
  TEST_ASSERT_EQUAL_HEX8(0, b.continuLeds(t));
  // met de hand zenden: 2 s aan
  TEST_ASSERT_TRUE(b.irZenden(0, 1u << 2));
  TEST_ASSERT_EQUAL_HEX8(1u << 2, b.continuLeds(t));
  b.tick(t + IR_CONTINU_PROEF_MS, 0);
  TEST_ASSERT_EQUAL_HEX8(0, b.continuLeds(t + IR_CONTINU_PROEF_MS));
}

// EN1: een continu-stopled krijgt een tijdsgrens: aankomst + stop + wachtS + maxVerkeerS (0 = 60 s) + 10 s. Met
// maxVerkeerS = 0 en een vrij-ingang die bezet blijft, brandde ze in 2.1.0 zonder einde (0,95 W in 120 Ω). Ook: de
// waarschuwing over 470 Ω in de antwoorden van de API en in /api/staat.
void test_continu_tijdsgrens_en_waarschuwing() {
  Baan b;
  auto post = [&](Antwoord (*f)(Baan &, const char *, size_t, uint32_t), const char *j) { return f(b, j, strlen(j), 0); };
  Antwoord a = post(apiIr, R"({"actie":"bewaren","nr":1,"code":{"naam":"Stop","soort":"continu"}})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_TRUE(a.json.find("470") != std::string::npos);
  TEST_ASSERT_TRUE(post(apiIr, R"({"actie":"bewaren","nr":2,"code":{"naam":"Rijd","soort":"nec"}})").json.find("470") ==
                   std::string::npos);
  a = post(apiIr, R"({"actie":"zenden","nr":1,"leds":[3]})");
  TEST_ASSERT_TRUE(a.json.find("waarschuwing") != std::string::npos);
  a = post(apiHalte, R"({"nr":1,"naam":"Halte","aankomstPunt":"P5","stopLeds":[5],"stopCode":1,"rijdCode":2,"wachtS":1,
    "vrijIngangen":[7],"vrijMinS":1,"maxVerkeerS":0})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_TRUE(a.json.find("470") != std::string::npos);
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, true));
  TEST_ASSERT_TRUE(d["ir"]["continu"].as<bool>());
  TEST_ASSERT_TRUE(std::string(d["ir"]["continuWaarschuwing"].as<const char *>()).find("470") != std::string::npos);
  TEST_ASSERT_TRUE(d["haltes"][0]["continu"].as<bool>());
  // de bus komt, ingang 7 blijft bezet (maxVerkeerS 0 = geen grens): de halte houdt hem eindeloos vast
  const uint32_t grens = HALTE_AANKOMST_MS + HALTE_STOP_MS + 1000 + 60000 + HALTE_CONTINU_MARGE_MS;
  TEST_ASSERT_EQUAL(grens, Haltes::continuGrensMs(b.cfg.halte[0], false));
  b.busGezien(-1, "P5", 10);
  b.haltes.melding(b.cfg.halte, "P5", -1, b, 10);
  uint32_t t = 10;
  IngangMasker zeven = ingangBit(6);
  for (; t < 10 + grens - 100; t += 5) b.tick(t, zeven);
  TEST_ASSERT_EQUAL(FASE_VERKEER, b.haltes.t[0].fase);
  TEST_ASSERT_EQUAL_HEX8(1u << 4, b.continuLeds(t));
  TEST_ASSERT_TRUE(b.logicaMelding().find("continu") == std::string::npos);
  for (; t < 10 + grens + 100; t += 5) b.tick(t, zeven);
  TEST_ASSERT_EQUAL(FASE_VERKEER, b.haltes.t[0].fase); // houdt nog vast ...
  TEST_ASSERT_EQUAL_HEX8(0, b.continuLeds(t));          // ... maar de led is uit
  TEST_ASSERT_TRUE(b.logicaMelding().find("470") != std::string::npos);
  deserializeJson(d, apiStaat(b, t, true));
  TEST_ASSERT_TRUE(d["haltes"][0]["continuTeLang"].as<bool>());
  // een wachtende bus aan de wachtled: ook met een grens
  HalteCfg &c = b.cfg.halte[0];
  c.wachtLeds = 1u << 3;
  c.maxVerkeerS = 60;
  b.haltesOpnieuw(t);
  b.haltes.melding(b.cfg.halte, "P5", -1, b, t);
  b.haltes.melding(b.cfg.halte, "P5", 1, b, t);
  TEST_ASSERT_TRUE(b.haltes.houdtWacht(0));
  TEST_ASSERT_EQUAL_HEX8((1u << 4) | (1u << 3), b.continuLeds(t));
  TEST_ASSERT_EQUAL_HEX8(0, b.continuLeds(t + Haltes::continuGrensMs(c, true)) & (1u << 3));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_continu_tijdsgrens_en_waarschuwing);
  RUN_TEST(test_hele_cyclus);
  RUN_TEST(test_zonder_vrije_ingangen_meteen_groen);
  RUN_TEST(test_halte_in_de_baan_met_ir_en_bus);
  RUN_TEST(test_herhalen_tot_groen);
  RUN_TEST(test_herstart_tijdens_wachten);
  RUN_TEST(test_tweede_bus_tijdens_groen);
  RUN_TEST(test_twee_bussen_vanuit_de_bus);
  RUN_TEST(test_zonder_wachtled_niet_tegenhouden);
  RUN_TEST(test_opstarten_rijdcode_drie_keer);
  RUN_TEST(test_wachtleds_api);
  RUN_TEST(test_verkeer_blijft_bezet);
  RUN_TEST(test_continu_stopcode);
  return UNITY_END();
}
