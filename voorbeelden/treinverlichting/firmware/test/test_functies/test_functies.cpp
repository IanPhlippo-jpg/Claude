// Tests van scènes en de functie-sequencer (include/functies.h, include/baan.h) op de pc:
//   python -m platformio test -e native
// Scènes bewaren en toepassen, wachttijden (exact, zonder verloop), stoppen (met en zonder licht uit), herstarten,
// herhalen, de voorbeeldfunctie "Overweg", stappen met een scène of dag/nacht, twee functies tegelijk.
#include <unity.h>

#include <vector>

#include "baan.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {

/** nep-uitvoerder: onthoudt wanneer welke stap kwam */
struct Logboek : Uitvoerder {
  struct Regel { int32_t waarde; uint32_t t; };
  std::vector<Regel> stappen;
  std::vector<GroepMasker> uit;
  void voerUit(const Stap &s, uint32_t nu) override { stappen.push_back({s.waarde, nu}); }
  void groepenUit(GroepMasker g, uint32_t) override { uit.push_back(g); }
};

Functie maak(std::initializer_list<uint32_t> wacht, bool herhalen = false, bool stopUit = true) {
  Functie f;
  f.gebruikt = true;
  strcpy(f.naam, "Test");
  f.herhalen = herhalen;
  f.stopUit = stopUit;
  int i = 0;
  for (uint32_t w : wacht) {
    f.stap[i].actie = ACT_AAN;
    f.stap[i].groepen = groepBit(i);
    f.stap[i].waarde = i + 1; // om de stap te herkennen
    f.stap[i].wachtMs = w;
    i++;
  }
  f.nStappen = (uint8_t)i;
  return f;
}

void loop(Sequencer &s, const Functie *fs, Logboek &l, uint32_t van, uint32_t tot, uint32_t dt = 10) {
  for (uint32_t t = van; t < tot; t += dt) s.stap(fs, l, t);
}

GroepStand aan() {
  GroepStand s;
  s.aan = true;
  return s;
}

} // namespace

void test_wachttijden_exact() {
  Functie fs[MAX_FUNCTIES];
  fs[0] = maak({1000, 2000, 0});
  Sequencer s;
  Logboek l;
  s.start(fs, 0, l, 0);
  loop(s, fs, l, 0, 5000);
  TEST_ASSERT_EQUAL(3, (int)l.stappen.size());
  TEST_ASSERT_EQUAL_UINT32(0, l.stappen[0].t);
  TEST_ASSERT_EQUAL_UINT32(1000, l.stappen[1].t);
  TEST_ASSERT_EQUAL_UINT32(3000, l.stappen[2].t);
  TEST_ASSERT_FALSE(s.loopt(0));
}

void test_loopt_tot_de_laatste_wachttijd_voorbij_is() {
  Functie fs[MAX_FUNCTIES];
  fs[0] = maak({500, 4000});
  Sequencer s;
  Logboek l;
  s.start(fs, 0, l, 0);
  loop(s, fs, l, 0, 4490);
  TEST_ASSERT_TRUE(s.loopt(0)); // de laatste stap is gedaan, maar zijn 4 s lopen nog
  loop(s, fs, l, 4490, 4510);
  TEST_ASSERT_FALSE(s.loopt(0));
  TEST_ASSERT_EQUAL(2, (int)l.stappen.size());
}

void test_stoppen_met_en_zonder_licht_uit() {
  Functie fs[MAX_FUNCTIES];
  fs[0] = maak({1000, 2000, 0});
  fs[1] = maak({1000, 2000, 0}, false, false);
  Sequencer s;
  Logboek l;
  s.start(fs, 0, l, 0);
  loop(s, fs, l, 0, 1500);
  s.stop(fs, 0, l, 1500);
  loop(s, fs, l, 1500, 6000);
  TEST_ASSERT_EQUAL(2, (int)l.stappen.size()); // stap 3 komt niet meer
  TEST_ASSERT_EQUAL(1, (int)l.uit.size());
  TEST_ASSERT_EQUAL_HEX16(0x0007, l.uit[0]);    // de groepen uit de drie stappen
  // zonder "bij stoppen uit"
  l = Logboek();
  s.start(fs, 1, l, 6000);
  s.stop(fs, 1, l, 6100);
  TEST_ASSERT_EQUAL(0, (int)l.uit.size());
  // een gestopte functie nog eens stoppen doet niets
  s.stop(fs, 1, l, 6200);
  TEST_ASSERT_EQUAL(0, (int)l.uit.size());
}

void test_herstarten_begint_van_voren_af_aan() {
  Functie fs[MAX_FUNCTIES];
  fs[0] = maak({1000, 2000, 0});
  Sequencer s;
  Logboek l;
  s.start(fs, 0, l, 0);
  loop(s, fs, l, 0, 1500);
  s.start(fs, 0, l, 1500);
  loop(s, fs, l, 1500, 8000);
  // 0 (stap 1), 1000 (stap 2), 1500 (stap 1 opnieuw), 2500 (stap 2), 4500 (stap 3)
  TEST_ASSERT_EQUAL(5, (int)l.stappen.size());
  const uint32_t t[] = {0, 1000, 1500, 2500, 4500};
  const int32_t w[] = {1, 2, 1, 2, 3};
  for (int i = 0; i < 5; i++) {
    TEST_ASSERT_EQUAL_UINT32(t[i], l.stappen[i].t);
    TEST_ASSERT_EQUAL(w[i], l.stappen[i].waarde);
  }
}

void test_herhalen_zonder_verloop() {
  Functie fs[MAX_FUNCTIES];
  fs[0] = maak({300, 700}, true);
  Sequencer s;
  Logboek l;
  s.start(fs, 0, l, 0);
  // onregelmatig rekenen (elke 7 ms): de stappen blijven op het raster van 1 s
  loop(s, fs, l, 0, 10010, 7);
  TEST_ASSERT_EQUAL(21, (int)l.stappen.size()); // 0, 300, 1000, 1300, ... 10000
  for (size_t i = 0; i < l.stappen.size(); i++) {
    uint32_t gepland = (uint32_t)(i / 2) * 1000 + (i % 2 ? 300 : 0);
    TEST_ASSERT_TRUE(l.stappen[i].t >= gepland && l.stappen[i].t < gepland + 7);
  }
  TEST_ASSERT_TRUE(s.loopt(0));
}

void test_lege_of_gewiste_functie_start_niet() {
  Functie fs[MAX_FUNCTIES];
  Sequencer s;
  Logboek l;
  s.start(fs, 0, l, 0); // niet gebruikt
  TEST_ASSERT_FALSE(s.loopt(0));
  fs[1].gebruikt = true; // gebruikt, maar zonder stappen
  s.start(fs, 1, l, 0);
  TEST_ASSERT_FALSE(s.loopt(1));
  s.start(fs, 99, l, 0); // bestaat niet
  s.start(fs, -1, l, 0);
  TEST_ASSERT_EQUAL(0, (int)l.stappen.size());
}

void test_voorbeeld_overweg_30_s() {
  Baan b; // de standaardinstellingen hebben functie 1 "Overweg": groepen 3 en 4 om beurten, na 30 s uit
  b.functieStart(0, 0);
  for (uint32_t t = 0; t < 30000; t += 10) {
    b.tick(t, 0);
    TEST_ASSERT_TRUE(b.lampen.brandt(2) != b.lampen.brandt(3));
    TEST_ASSERT_TRUE(b.seq.loopt(0));
  }
  b.tick(30000, 0);
  TEST_ASSERT_FALSE(b.lampen.stand[2].aan);
  TEST_ASSERT_FALSE(b.lampen.stand[3].aan);
  TEST_ASSERT_FALSE(b.lampen.brandt(2));
  TEST_ASSERT_FALSE(b.seq.loopt(0));
}

void test_overweg_stoppen_zet_de_lampen_uit() {
  Baan b;
  b.functieStart(0, 0);
  b.tick(0, 0);
  TEST_ASSERT_TRUE(b.lampen.stand[2].aan);
  b.functieStop(0, 5000);
  TEST_ASSERT_FALSE(b.lampen.stand[2].aan);
  TEST_ASSERT_FALSE(b.lampen.stand[3].aan);
}

void test_scene_bewaren_en_toepassen() {
  Baan b;
  b.zetGroep(0, aan(), 0);
  GroepStand las = aan();
  las.effect = FX_LASVLAM;
  las.p1 = 8;
  las.p2 = 3;
  b.zetGroep(5, las, 0);
  int p = b.sceneBewaren(-1, "Avond");
  TEST_ASSERT_EQUAL(2, p); // plaatsen 1 en 2 hebben de standaardscènes
  TEST_ASSERT_EQUAL_STRING("Avond", b.cfg.scene[2].naam);
  b.allesUit(100);
  b.zetGroep(9, aan(), 100);
  for (uint32_t t = 100; t < 1000; t += 10) b.tick(t, 0);
  TEST_ASSERT_TRUE(b.sceneOproepen(2, 1000));
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_TRUE(b.lampen.stand[g] == b.cfg.scene[2].groep[g]);
  TEST_ASSERT_FALSE(b.lampen.stand[9].aan);
  // aan/uit gaat meteen: groep 1 brandt, groep 10 is uit
  b.tick(1000, 0);
  TEST_ASSERT_TRUE(b.lampen.brandt(0));
  TEST_ASSERT_FALSE(b.lampen.brandt(9));
  TEST_ASSERT_EQUAL(FX_LASVLAM, b.lampen.stand[5].effect);
  // overschrijven behoudt de naam als er geen nieuwe gegeven wordt
  TEST_ASSERT_EQUAL(2, b.sceneBewaren(2, ""));
  TEST_ASSERT_EQUAL_STRING("Avond", b.cfg.scene[2].naam);
  // wissen; een gewiste scène oproepen kan niet
  TEST_ASSERT_TRUE(b.sceneWissen(2));
  TEST_ASSERT_FALSE(b.sceneOproepen(2, 2000));
  // vol: alle 12 plaatsen bezet
  for (int i = 0; i < MAX_SCENES; i++) b.sceneBewaren(-1, "x");
  TEST_ASSERT_EQUAL(-1, b.sceneBewaren(-1, "te veel"));
}

void test_standaardscene_alles_aan_en_alles_uit() {
  Baan b;
  b.sceneOproepen(0, 0);
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_TRUE(b.lampen.stand[g].aan);
  b.sceneOproepen(1, 10);
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_FALSE(b.lampen.stand[g].aan);
}

void test_stap_met_scene_en_dagnacht() {
  Baan b;
  b.cfg.groep[0].dagnacht = true;
  Functie f;
  f.gebruikt = true;
  f.nStappen = 3;
  f.stap[0].actie = ACT_SCENE;
  f.stap[0].waarde = 1; // "Alles aan"
  f.stap[0].wachtMs = 1000;
  f.stap[1].actie = ACT_DAGNACHT;
  f.stap[1].waarde = 1;
  f.stap[1].wachtMs = 1000;
  f.stap[2].actie = ACT_SCENE;
  f.stap[2].waarde = 7; // bestaat niet: wordt overgeslagen
  int p = b.functieBewaren(-1, f, 0);
  TEST_ASSERT_EQUAL(2, p); // 1 en 2 zijn bezet ("Overweg", "Alles aan/uit")
  TEST_ASSERT_EQUAL_STRING("Functie 3", b.cfg.functie[2].naam);
  b.functieStart(p, 0);
  b.tick(0, 0);
  TEST_ASSERT_TRUE(b.lampen.stand[7].aan);
  TEST_ASSERT_FALSE(b.dn.loopt);
  b.tick(1000, 0);
  TEST_ASSERT_TRUE(b.dn.loopt);
  b.tick(2000, 0);
  TEST_ASSERT_FALSE(b.seq.loopt(p));
}

void test_effectstap_overweg_op_vier_groepen() {
  Baan b;
  Functie f;
  f.gebruikt = true;
  f.nStappen = 1;
  f.stap[0].actie = ACT_EFFECT;
  f.stap[0].effect = FX_OVERWEG;
  f.stap[0].p1 = 400;
  f.stap[0].groepen = 0x00F0; // groepen 5..8
  b.functieBewaren(5, f, 0);
  b.functieStart(5, 0);
  for (uint32_t t = 0; t < 4000; t += 10) {
    b.tick(t, 0);
    bool g5 = b.lampen.brandt(4), g6 = b.lampen.brandt(5), g7 = b.lampen.brandt(6), g8 = b.lampen.brandt(7);
    TEST_ASSERT_TRUE(g5 == g7 && g6 == g8 && g5 != g6);
  }
}

void test_twee_functies_tegelijk_en_alles_uit() {
  Baan b;
  b.functieBewaren(3, maak({500, 500}, true), 0);
  b.functieStart(0, 0);
  b.functieStart(3, 0);
  b.dagnachtStart(0, DAG);
  for (uint32_t t = 0; t < 2000; t += 10) b.tick(t, 0);
  TEST_ASSERT_TRUE(b.seq.loopt(0));
  TEST_ASSERT_TRUE(b.seq.loopt(3));
  b.allesUit(2000);
  TEST_ASSERT_FALSE(b.seq.loopt(0));
  TEST_ASSERT_FALSE(b.seq.loopt(3));
  TEST_ASSERT_FALSE(b.dn.loopt);
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_FALSE(b.lampen.stand[g].aan);
  for (uint32_t t = 2000; t < 4000; t += 10) b.tick(t, 0);
  TEST_ASSERT_EQUAL_UINT32(0, b.lampen.uitgang);
}

void test_functie_wijzigen_of_wissen_terwijl_ze_loopt() {
  Baan b;
  b.cfg.ingang[2].gedrag = GEDRAG_DRUKKNOP;
  b.cfg.ingang[2].functieA = 0;
  b.cfg.ingang[4].gedrag = GEDRAG_SCHAKELAAR;
  b.cfg.ingang[4].functieB = 0;
  b.functieStart(0, 0);
  TEST_ASSERT_TRUE(b.seq.loopt(0));
  b.functieBewaren(0, maak({1000}), 100); // bewaren stopt de oude versie
  TEST_ASSERT_FALSE(b.seq.loopt(0));
  b.functieStart(0, 200);
  TEST_ASSERT_TRUE(b.functieWissen(0, 300));
  TEST_ASSERT_FALSE(b.seq.loopt(0));
  TEST_ASSERT_EQUAL(-1, b.cfg.ingang[2].functieA); // de koppelingen zijn mee weg
  TEST_ASSERT_EQUAL(-1, b.cfg.ingang[4].functieB);
  TEST_ASSERT_FALSE(b.functieWissen(0, 400));
}

void test_stand_na_stroomonderbreking() {
  Baan a;
  a.cfg.groep[2].dagnacht = true;
  a.zetGroep(0, aan(), 0);
  a.functieBewaren(4, maak({500, 500}, true), 0);
  a.functieStart(4, 0);
  a.functieStart(0, 0); // niet herhalend: komt niet terug
  a.dagnachtStart(0, NACHT);
  for (uint32_t t = 0; t < 3000; t += 10) a.tick(t, 0);
  Stand s = a.bewaarStand(3000);
  TEST_ASSERT_TRUE(s.dagnachtLoopt);
  TEST_ASSERT_EQUAL_HEX16(1u << 4, s.functies);
  // nieuwe doos (zelfde instellingen), andere klok
  Baan b;
  b.cfg = a.cfg;
  b.toepassen(50);
  b.herstelStand(s, 50);
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_TRUE(b.lampen.stand[g] == s.groep[g]);
  TEST_ASSERT_TRUE(b.dn.loopt);
  TEST_ASSERT_EQUAL_UINT32(a.dn.positieMs(3000), b.dn.positieMs(50));
  TEST_ASSERT_TRUE(b.seq.loopt(4));
  TEST_ASSERT_FALSE(b.seq.loopt(0));
}


void test_stap_wissel() {
  Baan b;
  Functie f;
  f.gebruikt = true;
  f.nStappen = 1;
  f.stap[0].actie = ACT_WISSEL;
  f.stap[0].groepen = groepBit(2) | groepBit(5);
  int p = b.functieBewaren(-1, f, 0);
  b.functieStart(p, 0);
  TEST_ASSERT_TRUE(b.lampen.stand[2].aan && b.lampen.stand[5].aan);
  TEST_ASSERT_FALSE(b.lampen.stand[3].aan);
  b.functieStart(p, 10);
  TEST_ASSERT_FALSE(b.lampen.stand[2].aan || b.lampen.stand[5].aan);
  // één van de twee aan: allebei uit (niet omdraaien per groep)
  GroepStand s = b.lampen.stand[5];
  s.aan = true;
  b.zetGroep(5, s, 20);
  b.functieStart(p, 30);
  TEST_ASSERT_FALSE(b.lampen.stand[2].aan || b.lampen.stand[5].aan);
  // de laatste groep (N_GROEPEN) werkt ook (32 groepen: bit 31)
  f.stap[0].groepen = groepBit(N_GROEPEN - 1);
  b.functieBewaren(p, f, 40);
  b.functieStart(p, 50);
  TEST_ASSERT_TRUE(b.lampen.stand[N_GROEPEN - 1].aan);
  TEST_ASSERT_EQUAL_STRING("wissel", actieId(ACT_WISSEL));
  TEST_ASSERT_EQUAL(ACT_WISSEL, actieVanId("wissel"));
}

void test_alle_groepen_masker() {
  TEST_ASSERT_EQUAL(N_GROEPEN, __builtin_popcount(ALLE_GROEPEN));
  TEST_ASSERT_TRUE(ALLE_GROEPEN >> (N_GROEPEN - 1) & 1);
  // dag en nacht met de laatste groep als deelnemer
  Baan b;
  b.cfg.groep[N_GROEPEN - 1].dagnacht = true;
  TEST_ASSERT_EQUAL_HEX32(groepBit(N_GROEPEN - 1), b.deelnemers());
}

// ------------------------------------------------------------------- firmware 2.0.0: stappen servo, ir, geluid
void test_stappen_servo_ir_geluid() {
  Baan b;
  ServoCfg &s = b.cfg.servo[0];
  s.gebruikt = true;
  s.a = 1000;
  s.b = 2000;
  s.snelheid = 0;
  b.servosOpStand(0, 0);                // servo 1 op A (door de rij, E8)
  b.servos.stap(b.cfg.servo, 400);      // ... en daar aangekomen
  TEST_ASSERT_EQUAL_STRING("a", b.servos.standTekst(0));
  IrCode &c = b.cfg.ir[2];
  c.gebruikt = true;
  c.commando = 7;
  Kastje k;
  strcpy(k.id, "a1b2c3");
  strcpy(k.naam, "Kerk");
  strcpy(k.ip, "192.168.4.23");
  b.kastjes.aanmelden(k, 0);
  // een functie zoals het dashboard ze bewaart
  const char *j = R"({"naam":"Slagboom","stappen":[
    {"actie":"servo","servo":1,"stand":"b","wacht":2},
    {"actie":"ir","code":3,"leds":[5,6],"wacht":0},
    {"actie":"geluid","kastje":"kerk","geluid":"klok.wav","volume":70,"wacht":1},
    {"actie":"servo","servo":1,"stand":"wissel","wacht":0}]})";
  JsonDocument d;
  deserializeJson(d, j);
  Functie f;
  Lezer l;
  l.functie(d.as<JsonVariantConst>(), f, 4);
  TEST_ASSERT_EQUAL(0, l.hersteld);
  TEST_ASSERT_EQUAL(4, f.nStappen);
  TEST_ASSERT_EQUAL(ACT_SERVO, f.stap[0].actie);
  TEST_ASSERT_EQUAL(1, f.stap[0].stand);
  TEST_ASSERT_EQUAL(0, (int)f.stap[0].groepen);
  TEST_ASSERT_EQUAL_HEX8(0x30, f.stap[1].leds);
  TEST_ASSERT_EQUAL_STRING("kerk", f.stap[2].kastje);
  TEST_ASSERT_EQUAL(70, f.stap[2].volume);
  TEST_ASSERT_EQUAL(2, f.stap[3].stand);
  TEST_ASSERT_EQUAL(0, (int)f.groepenInStappen()); // geen lichtgroepen: stoppen zet niets uit
  b.functieBewaren(4, f, 0);
  b.functieStart(4, 0);
  TEST_ASSERT_EQUAL(2000, b.servos.us(0)); // snelheid 0: meteen
  TEST_ASSERT_EQUAL_STRING("onderweg", b.servos.standTekst(0));
  for (uint32_t t = 5; t < 2000; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL_STRING("b", b.servos.standTekst(0));
  b.tick(2000, 0); // stap 2 en 3
  IrZend z;
  TEST_ASSERT_TRUE(b.haalIrZend(z));
  TEST_ASSERT_EQUAL(2, z.code);
  TEST_ASSERT_EQUAL_HEX8(0x30, z.leds);
  HttpOpdracht o;
  TEST_ASSERT_TRUE(b.kastjes.haal(o));
  TEST_ASSERT_EQUAL_STRING("192.168.4.23", o.ip);
  TEST_ASSERT_EQUAL_STRING("/speel", o.pad);
  TEST_ASSERT_EQUAL_STRING("{\"geluid\":\"klok.wav\",\"volume\":70}", o.body);
  for (uint32_t t = 2005; t < 3500; t += 5) b.tick(t, 0); // stap 4: wisselen -> A
  TEST_ASSERT_EQUAL(1000, b.servos.us(0));
  TEST_ASSERT_EQUAL_STRING("a", b.servos.standTekst(0));
  // heen en terug door JSON
  JsonDocument u;
  schrijfFunctie(u.to<JsonObject>(), b.cfg.functie[4]);
  Functie g;
  Lezer l2;
  l2.functie(u.as<JsonVariantConst>(), g, 4);
  TEST_ASSERT_EQUAL(0, l2.hersteld);
  TEST_ASSERT_EQUAL(0, memcmp(&g.stap[2].geluid, &f.stap[2].geluid, GELUID_LEN));
  TEST_ASSERT_EQUAL(0, (int)u["stappen"][0]["groepen"].size()); // elke stap heeft groepen (leeg)
  TEST_ASSERT_EQUAL(2.0, u["stappen"][0]["wacht"].as<double>());
  TEST_ASSERT_EQUAL_STRING("wissel", u["stappen"][3]["stand"]);
}

void test_stappen_fout_worden_hersteld() {
  const char *j = R"({"stappen":[
    {"actie":"servo","servo":99,"stand":"half"},
    {"actie":"ir","code":0,"leds":[9]},
    {"actie":"geluid","kastje":"","geluid":"../x.wav","volume":500}]})";
  JsonDocument d;
  deserializeJson(d, j);
  Functie f;
  Lezer l;
  l.functie(d.as<JsonVariantConst>(), f, 0);
  TEST_ASSERT_EQUAL(3, f.nStappen);
  TEST_ASSERT_EQUAL(7, l.hersteld); // servo 99, stand, code 0, led 9, kastje, geluid, volume 500
  TEST_ASSERT_EQUAL(MAX_SERVOS, f.stap[0].waarde);
  TEST_ASSERT_EQUAL(1, f.stap[1].waarde);
  TEST_ASSERT_EQUAL(0, f.stap[1].leds);
  TEST_ASSERT_EQUAL(100, f.stap[2].volume);
  // in de Baan: een servo of code die niet bestaat, een kastje dat offline is: niets, geen crash
  Baan b;
  b.functieBewaren(0, f, 0);
  b.functieStart(0, 0);
  IrZend z;
  TEST_ASSERT_FALSE(b.haalIrZend(z));
  HttpOpdracht o;
  TEST_ASSERT_FALSE(b.kastjes.haal(o));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_wachttijden_exact);
  RUN_TEST(test_loopt_tot_de_laatste_wachttijd_voorbij_is);
  RUN_TEST(test_stoppen_met_en_zonder_licht_uit);
  RUN_TEST(test_herstarten_begint_van_voren_af_aan);
  RUN_TEST(test_herhalen_zonder_verloop);
  RUN_TEST(test_lege_of_gewiste_functie_start_niet);
  RUN_TEST(test_voorbeeld_overweg_30_s);
  RUN_TEST(test_overweg_stoppen_zet_de_lampen_uit);
  RUN_TEST(test_scene_bewaren_en_toepassen);
  RUN_TEST(test_standaardscene_alles_aan_en_alles_uit);
  RUN_TEST(test_stap_met_scene_en_dagnacht);
  RUN_TEST(test_effectstap_overweg_op_vier_groepen);
  RUN_TEST(test_twee_functies_tegelijk_en_alles_uit);
  RUN_TEST(test_functie_wijzigen_of_wissen_terwijl_ze_loopt);
  RUN_TEST(test_stand_na_stroomonderbreking);
  RUN_TEST(test_stap_wissel);
  RUN_TEST(test_alle_groepen_masker);
  RUN_TEST(test_stappen_servo_ir_geluid);
  RUN_TEST(test_stappen_fout_worden_hersteld);
  return UNITY_END();
}
