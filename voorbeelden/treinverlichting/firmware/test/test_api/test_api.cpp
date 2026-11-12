// Tests van de JSON-API (include/api.h) op de pc:  python -m platformio test -e native
// Elk eindpunt met geldige en foute verzoeken, zoals het dashboard ze stuurt.
#include <unity.h>

#include <string>

#include "api.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {

Antwoord groep(Baan &b, const std::string &j, uint32_t nu = 0) { return apiGroep(b, j.data(), j.size(), nu); }
Antwoord scene(Baan &b, const std::string &j, uint32_t nu = 0) { return apiScene(b, j.data(), j.size(), nu); }
Antwoord functie(Baan &b, const std::string &j, uint32_t nu = 0) { return apiFunctie(b, j.data(), j.size(), nu); }
Antwoord ingang(Baan &b, const std::string &j) { return apiIngang(b, j.data(), j.size(), 0); }
Antwoord inst(Baan &b, const std::string &j) { return apiInstellingen(b, j.data(), j.size(), 0); }
Antwoord dagnacht(Baan &b, const std::string &j) { return apiDagnacht(b, j.data(), j.size(), 0); }

} // namespace

void test_groep_zetten() {
  Baan b;
  Antwoord a = groep(b, R"({"nr":3,"aan":true,"helderheid":40})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true}", a.json.c_str());
  TEST_ASSERT_TRUE(b.lampen.stand[2].aan);
  TEST_ASSERT_EQUAL(40, b.lampen.stand[2].helderheid);
  // effect zonder instellingen: de standaardwaarden
  groep(b, R"({"nr":3,"effect":"vuur"})");
  TEST_ASSERT_EQUAL(FX_VUUR, b.lampen.stand[2].effect);
  TEST_ASSERT_EQUAL(effectInfo(FX_VUUR).p1Std, b.lampen.stand[2].p1);
  groep(b, R"({"nr":3,"p2":9})");
  TEST_ASSERT_EQUAL(9, b.lampen.stand[2].p2);
  TEST_ASSERT_EQUAL(FX_VUUR, b.lampen.stand[2].effect);
  // meer groepen tegelijk
  groep(b, R"({"nr":[1,2,16],"aan":true})");
  TEST_ASSERT_TRUE(b.lampen.stand[0].aan && b.lampen.stand[1].aan && b.lampen.stand[15].aan);
  // te fel: begrensd
  groep(b, R"({"nr":1,"helderheid":900})");
  TEST_ASSERT_EQUAL(100, b.lampen.stand[0].helderheid);
  // overweg met een tweede groep
  groep(b, R"({"nr":5,"aan":true,"effect":"overweg","p2":6})");
  TEST_ASSERT_EQUAL(FX_OVERWEG, b.lampen.stand[5].effect);
  TEST_ASSERT_EQUAL(1, b.lampen.stand[5].fase);
  TEST_ASSERT_EQUAL(5, b.lampen.stand[5].p2);
}

void test_groep_fouten() {
  Baan b;
  uint32_t rev = b.cfgRev;
  const std::string buiten = "{\"nr\":" + std::to_string(N_GROEPEN + 1) + ",\"aan\":true}";
  const std::string fout_[] = {R"({"nr":0,"aan":true})",   buiten, R"({"aan":true})",
                         R"({"nr":[1,99]})",         R"({"nr":2,"effect":"disco"})",
                         R"({"nr":2,"naam":""})",    "geen json",               "[1]",
                         ""};
  for (const std::string &f : fout_) {
    Antwoord a = groep(b, f);
    TEST_ASSERT_EQUAL_MESSAGE(400, a.code, f.c_str());
    TEST_ASSERT_TRUE(a.json.find("\"ok\":false") != std::string::npos);
    TEST_ASSERT_TRUE(a.json.find("\"fout\"") != std::string::npos);
  }
  std::string lang = "{\"nr\":1,\"naam\":\"" + std::string(MAX_VERZOEK, 'x') + "\"}";
  TEST_ASSERT_EQUAL(400, groep(b, lang).code);
  TEST_ASSERT_EQUAL_UINT32(rev, b.cfgRev);
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_FALSE(b.lampen.stand[g].aan);
}

void test_groep_naam_maximum_dagnacht() {
  Baan b;
  uint32_t rev = b.cfgRev;
  groep(b, R"({"nr":2,"naam":"Kerk","max":60,"dagnacht":true})");
  TEST_ASSERT_EQUAL_STRING("Kerk", b.cfg.groep[1].naam);
  TEST_ASSERT_EQUAL(60, b.cfg.groep[1].max);
  TEST_ASSERT_EQUAL(60, b.lampen.maxPct[1]);
  TEST_ASSERT_TRUE(b.cfg.groep[1].dagnacht);
  TEST_ASSERT_TRUE(b.cfgRev > rev);
  // alleen de stand veranderen telt niet als instellingenwijziging
  rev = b.cfgRev;
  groep(b, R"({"nr":2,"aan":true})");
  TEST_ASSERT_EQUAL_UINT32(rev, b.cfgRev);
}

void test_alles_uit() {
  Baan b;
  b.functieStart(0, 0);
  b.cfg.groep[0].dagnacht = true;
  dagnacht(b, R"({"loopt":true,"vanaf":"nacht"})");
  groep(b, R"({"nr":[7,8],"aan":true})");
  TEST_ASSERT_EQUAL(200, groep(b, R"({"allesUit":true})").code);
  TEST_ASSERT_FALSE(b.seq.loopt(0));
  TEST_ASSERT_FALSE(b.dn.loopt);
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_FALSE(b.lampen.stand[g].aan);
}

void test_scenes() {
  Baan b;
  groep(b, R"({"nr":4,"aan":true,"helderheid":30})");
  Antwoord a = scene(b, R"({"actie":"bewaren","naam":"Avond"})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true,\"nr\":3}", a.json.c_str());
  groep(b, R"({"allesUit":true})");
  TEST_ASSERT_EQUAL(200, scene(b, R"({"actie":"oproepen","nr":3})").code);
  TEST_ASSERT_TRUE(b.lampen.stand[3].aan);
  TEST_ASSERT_EQUAL(30, b.lampen.stand[3].helderheid);
  TEST_ASSERT_EQUAL(200, scene(b, R"({"actie":"hernoemen","nr":3,"naam":"Late avond"})").code);
  TEST_ASSERT_EQUAL_STRING("Late avond", b.cfg.scene[2].naam);
  TEST_ASSERT_EQUAL(400, scene(b, R"({"actie":"hernoemen","nr":3,"naam":"  "})").code);
  TEST_ASSERT_EQUAL(200, scene(b, R"({"actie":"wissen","nr":3})").code);
  TEST_ASSERT_EQUAL(400, scene(b, R"({"actie":"oproepen","nr":3})").code);
  TEST_ASSERT_EQUAL(400, scene(b, R"({"actie":"wissen","nr":3})").code);
  TEST_ASSERT_EQUAL(400, scene(b, R"({"actie":"dansen","nr":1})").code);
  TEST_ASSERT_EQUAL(400, scene(b, R"({"actie":"bewaren","nr":40,"naam":"x"})").code);
  for (int i = 0; i < 10; i++) scene(b, R"({"actie":"bewaren","naam":"x"})");
  a = scene(b, R"({"actie":"bewaren","naam":"te veel"})");
  TEST_ASSERT_EQUAL(400, a.code);
  TEST_ASSERT_TRUE(a.json.find("12") != std::string::npos);
}

void test_functies() {
  Baan b;
  Antwoord a = functie(b, R"({"actie":"bewaren","functie":{"naam":"Kermis","herhalen":true,"stappen":[
      {"groepen":[9],"actie":"aan","wacht":0.5},{"groepen":[9],"actie":"uit","wacht":0.5}]}})");
  TEST_ASSERT_EQUAL(200, a.code);
  // plaats 1 en 2 zijn bezet in de standaardinstellingen ("Overweg" en "Alles aan/uit"): de eerste vrije is 3
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true,\"nr\":3}", a.json.c_str());
  TEST_ASSERT_EQUAL_STRING("Kermis", b.cfg.functie[2].naam);
  TEST_ASSERT_EQUAL(500u, b.cfg.functie[2].stap[0].wachtMs);
  TEST_ASSERT_EQUAL(200, functie(b, R"({"actie":"start","nr":3})").code);
  TEST_ASSERT_TRUE(b.seq.loopt(2));
  TEST_ASSERT_TRUE(b.lampen.stand[8].aan);
  functie(b, R"({"actie":"wissel","nr":3})");
  TEST_ASSERT_FALSE(b.seq.loopt(2));
  functie(b, R"({"actie":"wissel","nr":3})");
  TEST_ASSERT_TRUE(b.seq.loopt(2));
  functie(b, R"({"actie":"stop","nr":3})");
  TEST_ASSERT_FALSE(b.seq.loopt(2));
  // overschrijven
  functie(b, R"({"actie":"bewaren","nr":2,"functie":{"naam":"Kermis 2","stappen":[]}})");
  TEST_ASSERT_EQUAL_STRING("Kermis 2", b.cfg.functie[1].naam);
  TEST_ASSERT_EQUAL(0, b.cfg.functie[1].nStappen);
  // fouten
  TEST_ASSERT_EQUAL(400, functie(b, R"({"actie":"start","nr":9})").code);
  TEST_ASSERT_EQUAL(400, functie(b, R"({"actie":"bewaren","nr":2})").code);
  TEST_ASSERT_EQUAL(400, functie(b, R"({"actie":"bewaren","nr":99,"functie":{}})").code);
  TEST_ASSERT_EQUAL(400, functie(b, R"({"actie":"vliegen","nr":1})").code);
  // wissen haalt de koppeling bij de ingangen weg
  ingang(b, R"({"nr":1,"gedrag":"drukknop","functieA":2})");
  TEST_ASSERT_EQUAL(1, b.cfg.ingang[0].functieA);
  TEST_ASSERT_EQUAL(200, functie(b, R"({"actie":"wissen","nr":2})").code);
  TEST_ASSERT_EQUAL(-1, b.cfg.ingang[0].functieA);
  TEST_ASSERT_FALSE(b.cfg.functie[1].gebruikt);
}

void test_ingangen() {
  Baan b;
  Antwoord a = ingang(b, R"({"nr":4,"naam":"Sensor tunnel","gedrag":"sensor","functieA":1,"functieB":0,"nalopen":12})");
  TEST_ASSERT_EQUAL(200, a.code);
  const IngangCfg &c = b.cfg.ingang[3];
  TEST_ASSERT_EQUAL_STRING("Sensor tunnel", c.naam);
  TEST_ASSERT_EQUAL(GEDRAG_SENSOR, c.gedrag);
  TEST_ASSERT_EQUAL(0, c.functieA);
  TEST_ASSERT_EQUAL(-1, c.functieB);
  TEST_ASSERT_EQUAL(12, c.naloopS);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":17,"gedrag":"sensor"})").code);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":1,"gedrag":"lift"})").code);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":1,"functieA":5})").code); // functie 5 bestaat niet
}

void test_instellingen_en_wachtwoord() {
  Baan b;
  Antwoord a = inst(b, R"({"faduur":1.5,"dagnachtMin":30,"opstart":"uit"})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_FALSE(a.hotspotOpnieuw);
  TEST_ASSERT_EQUAL(1500u, b.cfg.inst.faduurMs);
  TEST_ASSERT_EQUAL(1500u, b.lampen.faduurMs);
  TEST_ASSERT_EQUAL(30u * 60000u, b.dn.duurMs);
  TEST_ASSERT_FALSE(b.cfg.inst.opstartLaatste);
  TEST_ASSERT_EQUAL(400, inst(b, R"({"wachtwoord":"kort"})").code);
  TEST_ASSERT_EQUAL(400, inst(b, R"({"wachtwoord":"wachtwoordé"})").code);
  TEST_ASSERT_EQUAL(400, inst(b, R"({"opstart":"soms"})").code);
  TEST_ASSERT_EQUAL_STRING(STD_WACHTWOORD, b.cfg.inst.wachtwoord);
  a = inst(b, R"({"wachtwoord":"stoomtrein"})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_TRUE(a.hotspotOpnieuw);
  TEST_ASSERT_EQUAL_STRING("stoomtrein", b.cfg.inst.wachtwoord);
  // het wachtwoord staat nooit in /api/staat
  TEST_ASSERT_TRUE(apiStaat(b, 0, false).find("stoomtrein") == std::string::npos);
  // fabrieksinstellingen: alles terug, ook het wachtwoord
  groep(b, R"({"nr":1,"naam":"Molen","aan":true})");
  a = inst(b, R"({"fabrieksinstellingen":true})");
  TEST_ASSERT_TRUE(a.hotspotOpnieuw);
  TEST_ASSERT_EQUAL_STRING("Groep 1", b.cfg.groep[0].naam);
  TEST_ASSERT_EQUAL_STRING(STD_WACHTWOORD, b.cfg.inst.wachtwoord);
  TEST_ASSERT_FALSE(b.lampen.stand[0].aan);
}

void test_dagnacht() {
  Baan b;
  TEST_ASSERT_EQUAL(400, dagnacht(b, R"({"loopt":true})").code); // nog geen deelnemers
  b.cfg.groep[2].dagnacht = true;
  TEST_ASSERT_EQUAL(400, dagnacht(b, R"({"loopt":true,"vanaf":"middag"})").code);
  TEST_ASSERT_EQUAL(400, dagnacht(b, R"({"vanaf":"avond"})").code);
  TEST_ASSERT_EQUAL(200, dagnacht(b, R"({"loopt":true,"vanaf":"nacht"})").code);
  TEST_ASSERT_TRUE(b.dn.loopt);
  TEST_ASSERT_EQUAL(NACHT, b.dn.fase(0));
  TEST_ASSERT_TRUE(b.lampen.stand[2].aan);
  TEST_ASSERT_EQUAL(200, dagnacht(b, R"({"loopt":false})").code);
  TEST_ASSERT_FALSE(b.dn.loopt);
}

void test_staat_volledig_en_kort() {
  Baan b;
  b.melding = "Testmelding";
  groep(b, R"({"nr":1,"aan":true})");
  b.tick(0, 0x0005);
  b.tick(100, 0x0005);
  std::string vol = apiStaat(b, 100, false), kort = apiStaat(b, 100, true);
  JsonDocument d;
  TEST_ASSERT_FALSE(deserializeJson(d, vol));
  TEST_ASSERT_EQUAL(N_GROEPEN, (int)d["groepen"].size());
  TEST_ASSERT_EQUAL(16, (int)d["ingangen"].size());
  TEST_ASSERT_EQUAL(12, (int)d["scenes"].size());
  TEST_ASSERT_EQUAL(16, (int)d["functies"].size());
  TEST_ASSERT_EQUAL(16, (int)d["lopend"].size());
  TEST_ASSERT_EQUAL_STRING("Groep 1", d["groepen"][0]["naam"]);
  TEST_ASSERT_EQUAL_STRING("Alles aan", d["scenes"][0]["naam"]);
  TEST_ASSERT_TRUE(d["scenes"][2].isNull());
  TEST_ASSERT_EQUAL_STRING("Overweg", d["functies"][0]["naam"]);
  TEST_ASSERT_EQUAL_STRING(FW_VERSIE, d["versie"]);
  TEST_ASSERT_EQUAL_STRING("Testmelding", d["melding"]);
  TEST_ASSERT_TRUE(d["groepen"][0]["aan"].as<bool>());
  TEST_ASSERT_TRUE(d["ingangen"][0]["actief"].as<bool>());
  TEST_ASSERT_FALSE(d["ingangen"][1]["actief"].as<bool>());
  TEST_ASSERT_TRUE(d["ingangen"][2]["actief"].as<bool>());
  TEST_ASSERT_EQUAL(0.5, d["instellingen"]["faduur"].as<double>());
  TEST_ASSERT_TRUE(d["instellingen"]["wachtwoord"].isNull());
  // kort: geen namen, wel de live stand en "rev"
  JsonDocument k;
  TEST_ASSERT_FALSE(deserializeJson(k, kort));
  TEST_ASSERT_TRUE(kort.size() < vol.size() / 2);
  TEST_ASSERT_TRUE(k["groepen"][0]["naam"].isNull());
  TEST_ASSERT_TRUE(k["scenes"].isNull());
  TEST_ASSERT_EQUAL(b.cfgRev, k["rev"].as<uint32_t>());
  TEST_ASSERT_TRUE(k["groepen"][0]["lamp"].as<int>() > 0);
}


// ---------------------------------------------------------------------- Fable-advies (2026-11-12)
Antwoord test(Baan &b, const std::string &j, uint32_t nu = 0) { return apiTest(b, j.data(), j.size(), nu); }

void test_testmodus_looplicht_en_vast() {
  Baan b;
  groep(b, R"({"nr":2,"aan":true,"helderheid":30})");
  TEST_ASSERT_EQUAL(200, test(b, R"({"actie":"looplicht","stapS":0.5})", 1000).code);
  // groep 1, 2, 3 ... om de beurt VOL aan (4095), de rest uit, ook groep 2 die op 30 % stond
  for (int k = 0; k < 2 * N_GROEPEN; k++) {
    uint32_t t = 1000 + (uint32_t)k * 500 + 250;
    b.tick(t, 0);
    for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_EQUAL_UINT16(g == k % N_GROEPEN ? PWM_MAX : 0, b.lampen.uitgang[g]);
  }
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 1000 + 2 * 500 + 10, true));
  TEST_ASSERT_EQUAL_STRING("looplicht", d["test"]["soort"]);
  TEST_ASSERT_EQUAL(3, d["test"]["groep"].as<int>());
  // vast: één groep; de stand van de groepen blijft ongemoeid
  TEST_ASSERT_EQUAL(200, test(b, R"({"actie":"vast","groep":5})").code);
  b.tick(50000, 0);
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_EQUAL_UINT16(g == 4 ? PWM_MAX : 0, b.lampen.uitgang[g]);
  TEST_ASSERT_TRUE(b.lampen.stand[1].aan);
  // stop: de gewone stand komt terug
  TEST_ASSERT_EQUAL(200, test(b, R"({"actie":"stop"})").code);
  b.tick(50010, 0);
  b.tick(52000, 0);
  TEST_ASSERT_EQUAL_UINT16(0, b.lampen.uitgang[4]);
  TEST_ASSERT_EQUAL_UINT16(gammaUit(0.3f), b.lampen.uitgang[1]);
  deserializeJson(d, apiStaat(b, 52000, true));
  TEST_ASSERT_EQUAL_STRING("", d["test"]["soort"]);
  TEST_ASSERT_EQUAL(0, d["test"]["groep"].as<int>());
}

void test_testmodus_alles_uit_stopt_en_fouten() {
  Baan b;
  test(b, R"({"actie":"vast","groep":1})");
  groep(b, R"({"allesUit":true})");
  TEST_ASSERT_EQUAL(TEST_GEEN, b.testSoort);
  const std::string buiten = "{\"actie\":\"vast\",\"groep\":" + std::to_string(N_GROEPEN + 1) + "}";
  const std::string fout_[] = {R"({"actie":"dansen"})", R"({"actie":"vast"})", R"({"actie":"vast","groep":0})", buiten,
                               R"({"actie":"looplicht","stapS":0.1})", R"({"actie":"looplicht","stapS":9})",
                               R"({"actie":"looplicht","stapS":"snel"})", "geen json"};
  for (const std::string &f : fout_) TEST_ASSERT_EQUAL_MESSAGE(400, test(b, f).code, f.c_str());
  TEST_ASSERT_EQUAL(TEST_GEEN, b.testSoort);
  TEST_ASSERT_EQUAL(200, test(b, R"({"actie":"looplicht"})").code); // zonder stapS: 1 s
  TEST_ASSERT_EQUAL(1000u, b.testStapMs);
}

void test_thuisnet_instellen() {
  Baan b;
  uint32_t rev = b.cfgRev;
  Antwoord a = inst(b, R"({"thuisnet":{"ssid":"Thuis 5G","wachtwoord":"geheim123"}})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_TRUE(a.thuisnetOpnieuw);
  TEST_ASSERT_FALSE(a.hotspotOpnieuw);
  TEST_ASSERT_EQUAL_STRING("Thuis 5G", b.cfg.inst.thuisSsid);
  TEST_ASSERT_TRUE(b.cfgRev > rev);
  // het dashboard ziet het wachtwoord nooit, wel dat er een is
  b.thuisVerbonden = true;
  b.thuisIp = "192.168.1.40";
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, false));
  TEST_ASSERT_EQUAL_STRING("Thuis 5G", d["instellingen"]["thuisnet"]["ssid"]);
  TEST_ASSERT_TRUE(d["instellingen"]["thuisnet"]["wachtwoord"].isNull());
  TEST_ASSERT_TRUE(d["instellingen"]["thuisnet"]["metWachtwoord"].as<bool>());
  TEST_ASSERT_TRUE(d["thuisnet"]["verbonden"].as<bool>());
  TEST_ASSERT_EQUAL_STRING("192.168.1.40", d["thuisnet"]["ip"]);
  TEST_ASSERT_EQUAL(N_GROEPEN, d["aantalGroepen"].as<int>());
  // hetzelfde nog eens: niets veranderd, niet opnieuw verbinden
  TEST_ASSERT_FALSE(inst(b, R"({"thuisnet":{"ssid":"Thuis 5G"}})").thuisnetOpnieuw);
  // fouten: te lang, wachtwoord te kort, geen object
  TEST_ASSERT_EQUAL(400, inst(b, R"({"thuisnet":{"ssid":"123456789012345678901234567890123"}})").code);
  TEST_ASSERT_EQUAL(400, inst(b, R"({"thuisnet":{"ssid":"Thuis","wachtwoord":"kort"}})").code);
  TEST_ASSERT_EQUAL(400, inst(b, R"({"thuisnet":"Thuis"})").code);
  TEST_ASSERT_EQUAL_STRING("Thuis 5G", b.cfg.inst.thuisSsid);
  // uitzetten: ssid leeg wist ook het wachtwoord; een open netwerk (geen wachtwoord) mag
  TEST_ASSERT_EQUAL(200, inst(b, R"({"thuisnet":{"ssid":""}})").code);
  TEST_ASSERT_EQUAL_STRING("", b.cfg.inst.thuisWachtwoord);
  TEST_ASSERT_EQUAL(200, inst(b, R"({"thuisnet":{"ssid":"Open","wachtwoord":""}})").code);
}

void test_knop_alles_aan_uit_standaard() {
  // standaard: ingang 1 is een drukknop die functie 2 "Alles aan/uit" start (stap "wissel" op alle groepen)
  Baan b;
  TEST_ASSERT_EQUAL(GEDRAG_DRUKKNOP, b.cfg.ingang[0].gedrag);
  TEST_ASSERT_EQUAL(1, b.cfg.ingang[0].functieA);
  TEST_ASSERT_EQUAL_STRING("Alles aan/uit", b.cfg.functie[1].naam);
  uint32_t t = 0;
  auto druk = [&]() {
    for (int i = 0; i < 20; i++, t += 5) b.tick(t, 0x0001);
    for (int i = 0; i < 20; i++, t += 5) b.tick(t, 0);
  };
  for (int i = 0; i < 10; i++, t += 5) b.tick(t, 0); // rust
  druk();
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_TRUE(b.lampen.stand[g].aan);
  druk();
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_FALSE(b.lampen.stand[g].aan);
  // één groep aan: de knop zet eerst alles uit
  groep(b, R"({"nr":4,"aan":true})");
  druk();
  for (int g = 0; g < N_GROEPEN; g++) TEST_ASSERT_FALSE(b.lampen.stand[g].aan);
  // de functie is meteen klaar: ze blijft niet "lopen"
  TEST_ASSERT_FALSE(b.seq.loopt(1));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_groep_zetten);
  RUN_TEST(test_groep_fouten);
  RUN_TEST(test_groep_naam_maximum_dagnacht);
  RUN_TEST(test_alles_uit);
  RUN_TEST(test_scenes);
  RUN_TEST(test_functies);
  RUN_TEST(test_ingangen);
  RUN_TEST(test_instellingen_en_wachtwoord);
  RUN_TEST(test_dagnacht);
  RUN_TEST(test_staat_volledig_en_kort);
  RUN_TEST(test_testmodus_looplicht_en_vast);
  RUN_TEST(test_testmodus_alles_uit_stopt_en_fouten);
  RUN_TEST(test_thuisnet_instellen);
  RUN_TEST(test_knop_alles_aan_uit_standaard);
  return UNITY_END();
}
