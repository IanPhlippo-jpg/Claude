// Tests van de opslag (include/opslag.h) op de pc:  python -m platformio test -e native
// Heen en terug, kapot bestand, te groot, onbekende versie, verkeerd soort onderdeel, waarden buiten het bereik,
// te lange namen (UTF-8), onbekende effecten en groepen, wachtwoord, de laatste stand, en 3000 willekeurig
// beschadigde bestanden (nooit crashen, alles altijd binnen de grenzen).
#include <unity.h>

#include <string>

#include "baan.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {

Config c; // 10 kB: niet op de stapel

Laad laad(const std::string &t, std::string &melding) { return configVanJson(t.data(), t.size(), c, melding); }

bool isStandaard(const Config &x) {
  Config s;
  standaard(s);
  return configNaarJson(x) == configNaarJson(s);
}

/** alles binnen de grenzen? (wat de rest van de firmware veronderstelt) */
void kijkGrenzen(const Config &x) {
  TEST_ASSERT_TRUE(x.inst.faduurMs <= MAX_FADUUR_MS);
  TEST_ASSERT_TRUE(x.inst.dagnachtMin >= MIN_DAGNACHT_MIN && x.inst.dagnachtMin <= MAX_DAGNACHT_MIN);
  TEST_ASSERT_TRUE(wachtwoordGeldig(x.inst.wachtwoord));
  for (int g = 0; g < N_GROEPEN; g++) {
    TEST_ASSERT_TRUE(strlen(x.groep[g].naam) > 0 && strlen(x.groep[g].naam) < (size_t)NAAM_LEN);
    TEST_ASSERT_TRUE(x.groep[g].max >= 1 && x.groep[g].max <= 100);
  }
  for (int i = 0; i < MAX_SCENES; i++)
    for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_TRUE(geldig(x.scene[i].groep[g]) == x.scene[i].groep[g]);
  for (int f = 0; f < MAX_FUNCTIES; f++) {
    const Functie &fn = x.functie[f];
    TEST_ASSERT_TRUE(fn.nStappen <= MAX_STAPPEN);
    if (fn.herhalen) TEST_ASSERT_TRUE(fn.totaleWacht() >= MIN_HERHAAL_MS);
    for (int s = 0; s < fn.nStappen; s++) {
      TEST_ASSERT_TRUE(fn.stap[s].actie < N_ACTIES);
      TEST_ASSERT_TRUE(fn.stap[s].effect < N_EFFECTEN);
      TEST_ASSERT_TRUE(fn.stap[s].wachtMs <= MAX_WACHT_MS);
    }
  }
  for (int i = 0; i < N_INGANGEN; i++) {
    TEST_ASSERT_TRUE(x.ingang[i].gedrag < N_GEDRAG);
    TEST_ASSERT_TRUE(x.ingang[i].functieA >= -1 && x.ingang[i].functieA < MAX_FUNCTIES);
    TEST_ASSERT_TRUE(x.ingang[i].functieB >= -1 && x.ingang[i].functieB < MAX_FUNCTIES);
    TEST_ASSERT_TRUE(x.ingang[i].naloopS <= MAX_NALOOP_S);
  }
}

} // namespace

void test_heen_en_terug() {
  Config a;
  standaard(a);
  strcpy(a.groep[3].naam, "Café 't Spoor");
  a.groep[3].max = 70;
  a.groep[3].dagnacht = true;
  a.inst.faduurMs = 1200;
  a.inst.opstartLaatste = false;
  a.scene[5].gebruikt = true;
  strcpy(a.scene[5].naam, "Nacht");
  a.scene[5].groep[2].aan = true;
  a.scene[5].groep[2].effect = FX_TV;
  a.scene[5].groep[2].p1 = 30;
  a.scene[5].groep[2].p2 = 7;
  a.ingang[1].gedrag = GEDRAG_SENSOR;
  a.ingang[1].functieA = 0;
  a.ingang[1].naloopS = 25;
  std::string j = configNaarJson(a);
  std::string m;
  TEST_ASSERT_EQUAL(Laad::OK, laad(j, m));
  TEST_ASSERT_EQUAL_STRING("", m.c_str());
  TEST_ASSERT_EQUAL_STRING(j.c_str(), configNaarJson(c).c_str());
  TEST_ASSERT_EQUAL_STRING("Café 't Spoor", c.groep[3].naam);
  TEST_ASSERT_FALSE(c.scene[4].gebruikt);
  TEST_ASSERT_EQUAL(FX_TV, c.scene[5].groep[2].effect);
  TEST_ASSERT_EQUAL(30000u, c.functie[0].stap[0].wachtMs);
}

void test_kapot_bestand_geeft_standaard() {
  const char *kapot[] = {"{", "", "nul", "[1,2,3]", "\"tekst\"", "{\"versie\":1,",
                         "\xff\xfe{}"};
  for (const char *k : kapot) {
    std::string m;
    c.groep[0].max = 3; // iets anders dan de standaard
    TEST_ASSERT_EQUAL_MESSAGE(Laad::ONGELDIG, laad(k, m), k);
    TEST_ASSERT_TRUE(isStandaard(c));
    TEST_ASSERT_TRUE(m.find("standaardinstellingen") != std::string::npos);
  }
}

void test_te_groot_bestand() {
  std::string t = "{\"versie\":1,\"x\":\"" + std::string(MAX_BESTAND, 'a') + "\"}";
  std::string m;
  TEST_ASSERT_EQUAL(Laad::ONGELDIG, laad(t, m));
  TEST_ASSERT_TRUE(m.find("te groot") != std::string::npos);
  TEST_ASSERT_TRUE(isStandaard(c));
  // te diep genest: ook ongeldig, geen crash
  std::string diep = "{\"versie\":1,\"groepen\":" + std::string(500, '[') + std::string(500, ']') + "}";
  TEST_ASSERT_EQUAL(Laad::ONGELDIG, laad(diep, m));
}

void test_onbekende_versie() {
  const char *v[] = {"{\"versie\":2}", "{\"versie\":0}", "{\"versie\":\"1\"}", "{\"versie\":1.5}",
                     "{\"groepen\":[]}"};
  for (const char *k : v) {
    std::string m;
    TEST_ASSERT_EQUAL_MESSAGE(Laad::ONGELDIG, laad(k, m), k);
    TEST_ASSERT_TRUE(m.find("versie") != std::string::npos);
    TEST_ASSERT_TRUE(isStandaard(c));
  }
}

void test_onderdeel_van_het_verkeerde_soort() {
  const char *v[] = {"{\"versie\":1,\"groepen\":5}", "{\"versie\":1,\"scenes\":{}}",
                     "{\"versie\":1,\"functies\":\"x\"}", "{\"versie\":1,\"ingangen\":true}",
                     "{\"versie\":1,\"instellingen\":[]}"};
  for (const char *k : v) {
    std::string m;
    TEST_ASSERT_EQUAL_MESSAGE(Laad::ONGELDIG, laad(k, m), k);
    TEST_ASSERT_TRUE(isStandaard(c));
  }
}

void test_alleen_versie_is_standaard() {
  std::string m;
  TEST_ASSERT_EQUAL(Laad::OK, laad("{\"versie\":1}", m));
  TEST_ASSERT_TRUE(isStandaard(c));
}

void test_waarden_buiten_bereik_worden_aangepast() {
  std::string t = R"({"versie":1,
    "instellingen":{"faduur":99,"dagnachtMin":1,"opstart":"soms","wachtwoord":"kort"},
    "groepen":[{"naam":"Station","max":250},{"naam":"","max":-4,"dagnacht":"ja"},{"naam":42}],
    "scenes":[{"naam":"Avond","groepen":[{"aan":true,"helderheid":250,"effect":"disco","p1":-9}]}],
    "functies":[{"naam":"Lichtshow_met_een_heel_erg_lange_naam","herhalen":true,
                 "stappen":[{"groepen":[1,17,0,"x"],"actie":"aan"},{"actie":"dansen"},
                            {"groepen":[2],"actie":"effect","effect":"vuur","p1":500,"wacht":-3}]}],
    "ingangen":[{"gedrag":"lift","functieA":40,"nalopen":99999}]})";
  std::string m;
  TEST_ASSERT_EQUAL(Laad::HERSTELD, laad(t, m));
  TEST_ASSERT_TRUE(m.find("aangepast") != std::string::npos);
  kijkGrenzen(c);
  TEST_ASSERT_EQUAL(MAX_FADUUR_MS, c.inst.faduurMs);
  TEST_ASSERT_EQUAL(MIN_DAGNACHT_MIN, c.inst.dagnachtMin);
  TEST_ASSERT_TRUE(c.inst.opstartLaatste);
  TEST_ASSERT_EQUAL_STRING(STD_WACHTWOORD, c.inst.wachtwoord);
  TEST_ASSERT_EQUAL_STRING("Station", c.groep[0].naam);
  TEST_ASSERT_EQUAL(100, c.groep[0].max);
  TEST_ASSERT_EQUAL_STRING("Groep 2", c.groep[1].naam);
  TEST_ASSERT_EQUAL(1, c.groep[1].max);
  TEST_ASSERT_FALSE(c.groep[1].dagnacht);
  TEST_ASSERT_EQUAL_STRING("Groep 3", c.groep[2].naam);
  TEST_ASSERT_EQUAL(100, c.scene[0].groep[0].helderheid);
  TEST_ASSERT_EQUAL(FX_GEEN, c.scene[0].groep[0].effect);
  TEST_ASSERT_FALSE(c.scene[1].gebruikt); // de lijst had maar één scène
  const Functie &f = c.functie[0];
  TEST_ASSERT_EQUAL(NAAM_LEN - 1, (int)strlen(f.naam));
  TEST_ASSERT_EQUAL(2, f.nStappen);          // "dansen" bestaat niet
  TEST_ASSERT_EQUAL_HEX16(0x0001, f.stap[0].groepen); // groep 17, 0 en "x" weg
  TEST_ASSERT_EQUAL(100, f.stap[1].p1);
  TEST_ASSERT_EQUAL(0u, f.stap[1].wachtMs);
  TEST_ASSERT_FALSE(f.herhalen);             // herhalen zonder wachttijd = eindeloos snel: uit
  TEST_ASSERT_FALSE(c.functie[1].gebruikt);
  TEST_ASSERT_EQUAL(GEDRAG_GEEN, c.ingang[0].gedrag);
  TEST_ASSERT_EQUAL(-1, c.ingang[0].functieA); // functie 40 bestaat niet: geen
  TEST_ASSERT_EQUAL(MAX_NALOOP_S, c.ingang[0].naloopS);
}

void test_namen_utf8_en_stuurtekens() {
  char t[NAAM_LEN];
  // 15 x "é" = 30 bytes past; 16 x niet: afgeknipt op een heel teken
  std::string e15, e16;
  for (int i = 0; i < 15; i++) e15 += "é";
  e16 = e15 + "é";
  TEST_ASSERT_FALSE(kopieerNaam(t, e15.c_str()));
  TEST_ASSERT_EQUAL_STRING(e15.c_str(), t);
  TEST_ASSERT_TRUE(kopieerNaam(t, e16.c_str()));
  TEST_ASSERT_EQUAL_STRING(e15.c_str(), t);
  TEST_ASSERT_TRUE(kopieerNaam(t, "a\nb\tc"));
  TEST_ASSERT_EQUAL_STRING("abc", t);
  TEST_ASSERT_TRUE(kopieerNaam(t, "kapot \xC3"));
  TEST_ASSERT_EQUAL_STRING("kapot", t);
  TEST_ASSERT_TRUE(kopieerNaam(t, "x\x80y\xFFz"));
  TEST_ASSERT_EQUAL_STRING("xyz", t);
  kopieerNaam(t, "  Perron 1  ");
  TEST_ASSERT_EQUAL_STRING("Perron 1", t);
  kopieerNaam(t, nullptr);
  TEST_ASSERT_EQUAL_STRING("", t);
}

void test_wachtwoord() {
  TEST_ASSERT_TRUE(wachtwoordGeldig("treinbaan"));
  TEST_ASSERT_TRUE(wachtwoordGeldig("12345678"));
  TEST_ASSERT_FALSE(wachtwoordGeldig("1234567"));
  TEST_ASSERT_FALSE(wachtwoordGeldig(std::string(64, 'a').c_str()));
  TEST_ASSERT_TRUE(wachtwoordGeldig(std::string(63, 'a').c_str()));
  TEST_ASSERT_FALSE(wachtwoordGeldig("wachtwoordé"));
  TEST_ASSERT_FALSE(wachtwoordGeldig(nullptr));
}

void test_laatste_stand_heen_en_terug() {
  Stand s;
  s.groep[0].aan = true;
  s.groep[0].helderheid = 35;
  s.groep[4].aan = true;
  s.groep[4].effect = FX_OVERWEG;
  s.groep[4].p1 = 700;
  s.groep[4].p2 = 6;
  s.groep[4].fase = 1;
  s.dagnachtLoopt = true;
  s.dagnachtPosMs = 123456;
  s.functies = 0x0009;
  std::string j = standNaarJson(s);
  Stand t;
  TEST_ASSERT_TRUE(standVanJson(j.data(), j.size(), t));
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_TRUE(t.groep[g] == s.groep[g]);
  TEST_ASSERT_TRUE(t.dagnachtLoopt);
  TEST_ASSERT_EQUAL_UINT32(123456, t.dagnachtPosMs);
  TEST_ASSERT_EQUAL_HEX16(0x0009, t.functies);
  // ongeldig: false, alles uit
  const char *kapot[] = {"", "{", "{\"versie\":9,\"groepen\":[]}", "{\"versie\":1}"};
  for (const char *k : kapot) {
    TEST_ASSERT_FALSE(standVanJson(k, strlen(k), t));
    for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_FALSE(t.groep[g].aan);
  }
}

void test_willekeurig_beschadigde_bestanden() {
  Config a;
  standaard(a);
  a.ingang[2].gedrag = GEDRAG_SCHAKELAAR;
  a.ingang[2].functieA = 0;
  a.scene[3].gebruikt = true;
  strcpy(a.scene[3].naam, "Test");
  const std::string goed = configNaarJson(a);
  Toeval r;
  r.zaai(2026);
  int ongeldig = 0, hersteld = 0;
  for (int k = 0; k < 3000; k++) {
    std::string t = goed;
    int n = 1 + (int)r.onder(6);
    for (int i = 0; i < n; i++) {
      size_t p = r.onder((uint32_t)t.size());
      switch (r.onder(4)) {
        case 0: t[p] = (char)r.onder(256); break;                   // een byte veranderen
        case 1: t.erase(p, 1 + r.onder(20)); break;                 // een stuk weg
        case 2: t.insert(p, 1, "0123456789-.e\"{}[],:"[r.onder(20)]); break;
        default: t.resize(p); break;                                // afgebroken (stroom weg)
      }
    }
    std::string m;
    Laad l = laad(t, m);
    if (l == Laad::ONGELDIG) {
      ongeldig++;
      TEST_ASSERT_TRUE(isStandaard(c));
    }
    if (l == Laad::HERSTELD) hersteld++;
    if (l != Laad::OK) TEST_ASSERT_FALSE(m.empty());
    kijkGrenzen(c);
  }
  TEST_ASSERT_TRUE(ongeldig > 100);
  TEST_ASSERT_TRUE(hersteld > 10);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_heen_en_terug);
  RUN_TEST(test_kapot_bestand_geeft_standaard);
  RUN_TEST(test_te_groot_bestand);
  RUN_TEST(test_onbekende_versie);
  RUN_TEST(test_onderdeel_van_het_verkeerde_soort);
  RUN_TEST(test_alleen_versie_is_standaard);
  RUN_TEST(test_waarden_buiten_bereik_worden_aangepast);
  RUN_TEST(test_namen_utf8_en_stuurtekens);
  RUN_TEST(test_wachtwoord);
  RUN_TEST(test_laatste_stand_heen_en_terug);
  RUN_TEST(test_willekeurig_beschadigde_bestanden);
  return UNITY_END();
}
