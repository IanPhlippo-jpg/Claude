// Tests van IR zenden in stappen (include/irzend.h), de IR-zelftest (E4), het niveau van de ontvangers (E2) en de
// IR-API van firmware 2.1.0:  python -m platformio test -e native -f test_irzend
#include <unity.h>

#include <string>
#include <vector>

#include "api.h"
#include "irzend.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {

/** nep-hardware: houdt bij wat er wanneer gebeurde (tick = 5 ms) */
struct NepIr : IrZendHw {
  struct Gebeurt {
    int tick;
    char wat; // 'L' leds, 'Z' zenden, 'C' continu aan, 'c' continu uit
    int waarde;
  };
  std::vector<Gebeurt> log;
  int tick = 0;
  int bezigTot = -1;  // de RMT is klaar vanaf deze tick
  bool zendOk = true;
  uint8_t leds = 0;
  bool continuAan = false;
  bool kiesOk = true; // FN7: false = de MCP23017 antwoordt niet
  bool kiesLeds(uint8_t l) override {
    if (!kiesOk) return false;
    leds = l;
    log.push_back({tick, 'L', l});
    return true;
  }
  bool zend(const IrCode &c) override {
    if (!zendOk) return false;
    log.push_back({tick, 'Z', c.commando});
    bezigTot = tick + 14; // ± 70 ms (NEC)
    return true;
  }
  bool klaar() override { return tick >= bezigTot; }
  void continu(bool aan) override {
    continuAan = aan;
    log.push_back({tick, aan ? 'C' : 'c', 0});
  }
  int eerste(char wat) const {
    for (auto &g : log)
      if (g.wat == wat) return g.tick;
    return -1;
  }
};

struct Rij {
  std::vector<std::pair<IrZend, IrCode>> r;
  bool operator()(IrZend &z, IrCode &c) {
    if (r.empty()) return false;
    z = r.front().first;
    c = r.front().second;
    r.erase(r.begin());
    return true;
  }
};

IrCode nec(uint16_t cmd) {
  IrCode c;
  c.gebruikt = true;
  c.commando = cmd;
  return c;
}

/** het frame dat -B1 (TSMP58000) van een code doorgeeft: per periode van de draaggolf een korte aan-puls (ns) */
std::vector<uint32_t> draaggolf(const IrCode &c, double khz) {
  static uint32_t us[MAX_IR_PULSEN];
  int n = irPulsen(c, us, MAX_IR_PULSEN);
  std::vector<uint32_t> ns;
  double periode = 1e6 / khz;
  uint32_t aan = (uint32_t)(periode * 0.33), uit = (uint32_t)(periode - aan);
  for (int i = 0; i < n; i++) {
    if (i % 2 == 0) {
      int p = (int)(us[i] * 1000.0 / periode + 0.5);
      for (int k = 0; k < p; k++) {
        ns.push_back(aan);
        if (k + 1 < p) ns.push_back(uit);
      }
    } else {
      ns.push_back(uit + us[i] * 1000u);
    }
  }
  return ns;
}

Antwoord ir(Baan &b, const std::string &j, uint32_t nu = 0) { return apiIr(b, j.data(), j.size(), nu); }

} // namespace

// F4: leds kiezen, 2 ticks wachten, zenden; klaar, 2 ticks wachten, leds uit
void test_leds_kiezen_wachten_zenden() {
  NepIr hw;
  IrZender z;
  Rij rij;
  rij.r.push_back({IrZend{3, 0x10}, nec(7)});
  for (hw.tick = 0; hw.tick < 30; hw.tick++) z.stap(hw, rij, 0);
  TEST_ASSERT_EQUAL(0, hw.eerste('L'));
  TEST_ASSERT_EQUAL(0x10, hw.log[0].waarde);
  TEST_ASSERT_EQUAL(2, hw.eerste('Z'));         // 2 ticks (10 ms) na het kiezen, niet in dezelfde tick
  TEST_ASSERT_TRUE(hw.eerste('Z') > hw.eerste('L'));
  // na het zenden (klaar bij tick 16) nog 2 ticks, dan de leds uit
  TEST_ASSERT_EQUAL('L', hw.log.back().wat);
  TEST_ASSERT_EQUAL(0, hw.log.back().waarde);
  TEST_ASSERT_EQUAL(16 + 2, hw.log.back().tick);
  TEST_ASSERT_FALSE(z.bezig());
  TEST_ASSERT_EQUAL_UINT32(0, z.nietVerzonden);
}

// F5: een code die niet past of die de RMT weigert: niet verzonden, geteld, met de reden
void test_niet_verzonden_wordt_geteld() {
  NepIr hw;
  IrZender z;
  Rij rij;
  IrCode lang;
  lang.gebruikt = true;
  lang.soort = IR_RAW;
  lang.nRaw = 255;
  for (int i = 0; i < 255; i++) lang.raw[i] = 500;
  lang.herhaal = 5;
  rij.r.push_back({IrZend{1, 1}, lang});
  for (hw.tick = 0; hw.tick < 10; hw.tick++) z.stap(hw, rij, 0);
  TEST_ASSERT_EQUAL(-1, hw.eerste('Z'));
  TEST_ASSERT_EQUAL_UINT32(1, z.nietVerzonden);
  TEST_ASSERT_TRUE(strstr(z.laatsteFout, "te lang") != nullptr);
  hw.zendOk = false;
  rij.r.push_back({IrZend{1, 1}, nec(1)});
  for (; hw.tick < 20; hw.tick++) z.stap(hw, rij, 0);
  TEST_ASSERT_EQUAL_UINT32(2, z.nietVerzonden);
  TEST_ASSERT_EQUAL(0, hw.leds); // de leds gaan toch weer uit
}

// F1: continu-leds branden zonder draaggolf; een gewone code gaat voor en daarna komen ze terug
void test_continu_en_een_code_ertussen() {
  NepIr hw;
  IrZender z;
  Rij rij;
  for (hw.tick = 0; hw.tick < 5; hw.tick++) z.stap(hw, rij, 0x20);
  TEST_ASSERT_EQUAL(0x20, hw.leds);
  TEST_ASSERT_TRUE(hw.continuAan);
  TEST_ASSERT_EQUAL(2, hw.eerste('C')); // ook hier eerst de leds, 2 ticks later de pin
  rij.r.push_back({IrZend{2, 0x01}, nec(9)});
  z.stap(hw, rij, 0x20);
  TEST_ASSERT_FALSE(hw.continuAan);
  TEST_ASSERT_EQUAL(0x01, hw.leds);
  for (hw.tick = 6; hw.tick < 40; hw.tick++) z.stap(hw, rij, 0x20);
  TEST_ASSERT_TRUE(hw.continuAan);
  TEST_ASSERT_EQUAL(0x20, hw.leds);
  // de halte laat los: uit
  for (; hw.tick < 45; hw.tick++) z.stap(hw, rij, 0);
  TEST_ASSERT_FALSE(hw.continuAan);
  TEST_ASSERT_EQUAL(0, hw.leds);
}

// E4: de IR-zelftest. -B1 leest de testcode met draaggolf 38 kHz terug: ok. Negatieve proeven: geen antwoord (fout na
// 3 s), een flank zonder draaggolf (ongemoduleerd), een andere code. TN3 (2.2.0): -B1 (TSMP58000, 20-60 kHz) ziet licht
// zonder draaggolf nooit; de teksten zeggen dat nu, en beweren niet meer dat "de led brandt maar niet moduleert".
void test_zelftest_via_b1() {
  Baan b;
  TEST_ASSERT_EQUAL(200, ir(b, R"({"actie":"zelftest","led":5})").code);
  IrZend z;
  TEST_ASSERT_TRUE(b.haalIrZend(z));
  TEST_ASSERT_EQUAL(IR_ZELFTEST, z.code);
  TEST_ASSERT_EQUAL_HEX8(0x10, z.leds);
  IrCode c;
  TEST_ASSERT_TRUE(b.irCodeVoor(z, c));
  std::vector<uint32_t> f = draaggolf(c, 38.0);
  b.irFrame(0, f.data(), (int)f.size(), 100);
  TEST_ASSERT_FALSE(b.zelftest.loopt);
  TEST_ASSERT_TRUE(b.zelftest.ok);
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 200, true));
  TEST_ASSERT_TRUE(d["zelftest"]["ok"].as<bool>());
  TEST_ASSERT_FLOAT_WITHIN(0.15, 38.0, d["zelftest"]["khz"].as<double>());
  TEST_ASSERT_EQUAL_STRING("nec:7E815AA5", d["zelftest"]["code"]);
  TEST_ASSERT_EQUAL(5, d["zelftest"]["led"].as<int>());
  TEST_ASSERT_EQUAL_UINT32(0, b.volg.meldingen.volgnr); // geen melding van een meetpunt
  // geen antwoord van -B1
  TEST_ASSERT_EQUAL(200, ir(b, R"({"actie":"zelftest","led":1})", 1000).code);
  for (uint32_t t = 1000; t <= 1000 + ZELFTEST_MS; t += 5) b.tick(t, 0);
  TEST_ASSERT_FALSE(b.zelftest.loopt);
  TEST_ASSERT_FALSE(b.zelftest.ok);
  TEST_ASSERT_TRUE(strstr(b.zelftest.fout, "zag niets") != nullptr);
  TEST_ASSERT_TRUE(strstr(b.zelftest.fout, "20-60 kHz") != nullptr); // TN3
  // licht zonder draaggolf (een gedemoduleerd signaal: de tijden zelf)
  TEST_ASSERT_EQUAL(200, ir(b, R"({"actie":"zelftest","led":1})", 5000).code);
  std::vector<uint32_t> plat = {9000000, 4500000, 560000, 560000, 560000, 1690000, 560000};
  b.irFrame(0, plat.data(), (int)plat.size(), 5100);
  TEST_ASSERT_TRUE(b.zelftest.ongemoduleerd);
  for (uint32_t t = 5000; t <= 5000 + ZELFTEST_MS; t += 5) b.tick(t, 0);
  TEST_ASSERT_FALSE(b.zelftest.ok);
  TEST_ASSERT_TRUE(strstr(b.zelftest.fout, "zonder herkenbare draaggolf") != nullptr);
  TEST_ASSERT_TRUE(strstr(b.zelftest.fout, "de IR-led brandt") == nullptr); // TN3: dat kan -B1 niet weten
  deserializeJson(d, apiStaat(b, 9000, true));
  TEST_ASSERT_TRUE(d["zelftest"]["ongemoduleerd"].as<bool>());
  // een andere code, of een draaggolf die meer dan 1 kHz afwijkt
  TEST_ASSERT_EQUAL(200, ir(b, R"({"actie":"zelftest","led":2})", 10000).code);
  f = draaggolf(nec(3), 38.0);
  b.irFrame(0, f.data(), (int)f.size(), 10100);
  TEST_ASSERT_FALSE(b.zelftest.ok);
  TEST_ASSERT_EQUAL(200, ir(b, R"({"actie":"zelftest","led":2})", 11000).code);
  f = draaggolf(c, 36.0);
  b.irFrame(0, f.data(), (int)f.size(), 11100);
  TEST_ASSERT_FALSE(b.zelftest.ok);
  TEST_ASSERT_TRUE(strstr(b.zelftest.fout, "1 kHz") != nullptr);
  // fouten
  TEST_ASSERT_EQUAL(400, ir(b, R"({"actie":"zelftest","led":9})").code);
  TEST_ASSERT_EQUAL(400, ir(b, R"({"actie":"zelftest"})").code);
  b.lerenStart(0, "", 12000);
  TEST_ASSERT_EQUAL(400, ir(b, R"({"actie":"zelftest","led":1})", 12000).code);
}

// E2: een lang laag niveau op ontvangerpin 2..4 (lichtsluis, reflexsensor) geeft een ftr-melding op het punt van die
// ontvanger. Negatieve proef: 45 ms laag geeft niets, en zonder het niveau (alleen frames) ook niets.
void test_lang_niveau_op_ontvanger_geeft_melding() {
  Baan b;
  PuntCfg &p = b.cfg.punt[0];
  p.gebruikt = true;
  strcpy(p.id, "INV1");
  p.ontvanger = 2;
  uint32_t t = 0;
  for (; t < 45; t += 5) b.ontvangerNiveau(2, true, t);
  b.ontvangerNiveau(2, false, t);
  TEST_ASSERT_EQUAL_UINT32(0, b.volg.meldingen.volgnr);
  // een frame met alleen een lang niveau (de RMT gaf 0 tijden): irFrame doet niets
  uint32_t leeg[1] = {0};
  b.irFrame(2, leeg, 0, 100);
  TEST_ASSERT_EQUAL_UINT32(0, b.volg.meldingen.volgnr);
  for (t = 200; t < 2000; t += 5) b.ontvangerNiveau(2, true, t);
  TEST_ASSERT_EQUAL_UINT32(1, b.volg.meldingen.volgnr);
  const Melding *m[2];
  b.volg.meldingen.sinds(0, m, 2);
  TEST_ASSERT_EQUAL(MELD_FTR, m[0]->soort);
  TEST_ASSERT_EQUAL_STRING("INV1", m[0]->punt);
  TEST_ASSERT_EQUAL(2, m[0]->ontvanger);
  TEST_ASSERT_EQUAL_UINT32(250, m[0]->ms);
  JsonDocument d;
  deserializeJson(d, apiStaat(b, t, true));
  TEST_ASSERT_TRUE(d["ontvangerBezet"][2].as<bool>());
  b.ontvangerNiveau(2, false, t);
  TEST_ASSERT_FALSE(b.niveau[2].bezet);
}

// F1 en F5 in de API: soort continu bewaren; een code die met haar herhalingen te lang wordt, geweigerd met uitleg
void test_ir_api_continu_en_te_lang() {
  Baan b;
  TEST_ASSERT_EQUAL(200, ir(b, R"({"actie":"bewaren","nr":1,"code":{"naam":"Stop","soort":"continu"}})").code);
  TEST_ASSERT_EQUAL(IR_CONTINU, b.cfg.ir[0].soort);
  std::string raw = "[";
  for (int i = 0; i < 255; i++) raw += (i ? ",500" : "500");
  raw += "]";
  Antwoord a = ir(b, R"({"actie":"bewaren","nr":2,"code":{"soort":"raw","herhaal":5,"raw":)" + raw + "}}");
  TEST_ASSERT_EQUAL(400, a.code);
  TEST_ASSERT_TRUE(a.json.find("hoogstens 4 keer") != std::string::npos);
  TEST_ASSERT_FALSE(b.cfg.ir[1].gebruikt);
  TEST_ASSERT_EQUAL(200, ir(b, R"({"actie":"bewaren","nr":2,"code":{"soort":"raw","herhaal":4,"raw":)" + raw + "}}").code);
  // NEC met adres16 (F13)
  TEST_ASSERT_EQUAL(200, ir(b, R"({"actie":"bewaren","nr":3,"code":{"soort":"nec","adres":18,"adres16":true,"commando":52}})").code);
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, false));
  TEST_ASSERT_EQUAL_STRING("nec:120034CB", d["ir"]["codes"][2]["tekst"]);
  TEST_ASSERT_EQUAL_STRING("continu", d["ir"]["codes"][0]["tekst"]);
  TEST_ASSERT_EQUAL(400, ir(b, R"({"actie":"bewaren","nr":3,"code":{"soort":"nec","adres16":1}})").code);
  // F5: de teller in de staat (kort)
  b.irNietVerzonden = 2;
  b.irLaatsteFout = "De RMT zond de code niet.";
  deserializeJson(d, apiStaat(b, 0, true));
  TEST_ASSERT_EQUAL(2, d["ir"]["nietVerzonden"].as<int>());
  TEST_ASSERT_EQUAL_STRING("De RMT zond de code niet.", d["ir"]["laatsteFout"]);
}

// F17: een geleerde code die langer is dan de buffer: niet stil half bewaren, maar "te lang"
void test_leren_te_lang() {
  Baan b;
  b.lerenStart(0, "Lang", 0);
  std::vector<uint32_t> f = draaggolf(nec(1), 38.0);
  b.irFrame(0, f.data(), (int)f.size(), 100, true);
  TEST_ASSERT_FALSE(b.leren.loopt);
  TEST_ASSERT_TRUE(strstr(b.leren.fout, "te lang") != nullptr);
  TEST_ASSERT_FALSE(b.cfg.ir[0].gebruikt);
}

// TN3: het niveau van de ontvangerpinnen is zichtbaar in /api/staat ("ontvangerLaag"): een fototransistor of
// TCRT5000 op GPIO11 (ontvanger 2) toont zo IR-licht, ook zonder draaggolf
void test_ontvanger_niveau_zichtbaar() {
  Baan b;
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, true));
  TEST_ASSERT_EQUAL(4, (int)d["ontvangerLaag"].size());
  TEST_ASSERT_FALSE(d["ontvangerLaag"][1].as<bool>());
  b.ontvangerNiveau(1, true, 5);
  deserializeJson(d, apiStaat(b, 5, true));
  TEST_ASSERT_TRUE(d["ontvangerLaag"][1].as<bool>());
  TEST_ASSERT_FALSE(d["ontvangerBezet"][1].as<bool>()); // nog geen 50 ms
  b.ontvangerNiveau(1, false, 10);
  deserializeJson(d, apiStaat(b, 10, true));
  TEST_ASSERT_FALSE(d["ontvangerLaag"][1].as<bool>());
}

// FN6: tijdens het bewaren (LittleFS) wacht een lange code (> 144 RMT-items, met bijvullen) in KIEZEN; een korte NEC-code
// gaat gewoon door. Negatieve proef: zonder de vlag start de lange code midden in het bewaren.
void test_lange_code_wacht_op_bewaren() {
  IrCode lang;
  lang.gebruikt = true;
  lang.soort = IR_RAW;
  lang.nRaw = 200;
  for (int i = 0; i < 200; i++) lang.raw[i] = 560;
  lang.herhaal = 2; // 2 x 100 items + pauze: meer dan 144
  TEST_ASSERT_TRUE(irPast(lang));
  TEST_ASSERT_TRUE(irLang(lang));
  TEST_ASSERT_FALSE(irLang(nec(1)));
  for (bool metVlag : {true, false}) {
    NepIr hw;
    IrZender z;
    Rij rij;
    rij.r.push_back({IrZend{0, 1}, lang});
    z.bewaarBezig = metVlag;
    for (; hw.tick < 40; hw.tick++) z.stap(hw, rij, 0);
    if (metVlag) {
      TEST_ASSERT_EQUAL(-1, hw.eerste('Z')); // wacht
      TEST_ASSERT_EQUAL(IrZender::KIEZEN, z.fase);
      TEST_ASSERT_TRUE(z.bezig());
      TEST_ASSERT_TRUE(z.uitgesteld > 0);
      z.bewaarBezig = false;
      z.stap(hw, rij, 0);
      TEST_ASSERT_EQUAL(hw.tick, hw.eerste('Z')); // en zendt meteen na het bewaren
    } else {
      TEST_ASSERT_EQUAL(IR_WACHT_TICKS, hw.eerste('Z')); // negatieve proef: zonder vlag gewoon gezonden
    }
  }
  // een korte code wacht niet op het bewaren
  NepIr hw;
  IrZender z;
  Rij rij;
  rij.r.push_back({IrZend{0, 1}, nec(7)});
  z.bewaarBezig = true;
  for (; hw.tick < 10; hw.tick++) z.stap(hw, rij, 0);
  TEST_ASSERT_EQUAL(IR_WACHT_TICKS, hw.eerste('Z'));
  TEST_ASSERT_EQUAL(0, (int)z.uitgesteld);
}

// FN7: kiesLeds mislukt (MCP23017 weg): de code wordt niet "verzonden" zonder led, nietVerzonden telt (één keer per code;
// voor de continu-leds één keer tot het weer lukt). Een volle rij van de Baan telt in irRijVol.
void test_kiesleds_mislukt_en_volle_rij() {
  NepIr hw;
  hw.kiesOk = false;
  IrZender z;
  Rij rij;
  rij.r.push_back({IrZend{0, 1}, nec(1)});
  rij.r.push_back({IrZend{0, 2}, nec(2)});
  for (; hw.tick < 30; hw.tick++) z.stap(hw, rij, 0);
  TEST_ASSERT_EQUAL(-1, hw.eerste('Z'));
  TEST_ASSERT_EQUAL(2, (int)z.nietVerzonden);
  TEST_ASSERT_TRUE(strstr(z.laatsteFout, "MCP23017") != nullptr);
  for (; hw.tick < 60; hw.tick++) z.stap(hw, rij, 0x10); // continu: één keer geteld
  TEST_ASSERT_EQUAL(3, (int)z.nietVerzonden);
  TEST_ASSERT_FALSE(hw.continuAan);
  hw.kiesOk = true;
  for (; hw.tick < 70; hw.tick++) z.stap(hw, rij, 0x10);
  TEST_ASSERT_TRUE(hw.continuAan);
  TEST_ASSERT_EQUAL(0x10, hw.leds);
  // de Baan: een halte zet een code in een volle rij
  Baan b;
  b.cfg.ir[0] = nec(1);
  for (int i = 0; i < MAX_IR_RIJ; i++) TEST_ASSERT_TRUE(b.irRij(0, 1));
  b.halteIr(0, 1, 0);
  b.halteIr(-1, 1, 0); // geen code: telt niet
  TEST_ASSERT_EQUAL(1, (int)b.irRijVol);
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, true));
  TEST_ASSERT_EQUAL(1, d["ir"]["rijVol"].as<int>());
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_leds_kiezen_wachten_zenden);
  RUN_TEST(test_niet_verzonden_wordt_geteld);
  RUN_TEST(test_continu_en_een_code_ertussen);
  RUN_TEST(test_zelftest_via_b1);
  RUN_TEST(test_ontvanger_niveau_zichtbaar);
  RUN_TEST(test_lange_code_wacht_op_bewaren);
  RUN_TEST(test_kiesleds_mislukt_en_volle_rij);
  RUN_TEST(test_lang_niveau_op_ontvanger_geeft_melding);
  RUN_TEST(test_ir_api_continu_en_te_lang);
  RUN_TEST(test_leren_te_lang);
  return UNITY_END();
}
