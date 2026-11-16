// Tests van de JSON-API (include/api.h) op de pc:  python -m platformio test -e native
// Elk eindpunt met geldige en foute verzoeken, zoals het dashboard ze stuurt.
#include <unity.h>

#include <string>
#include <vector>

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
  Antwoord a = groep(b, R"({"nr":3,"aan":true})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true}", a.json.c_str());
  TEST_ASSERT_TRUE(b.lampen.stand[2].aan);
  b.tick(0, 0);
  TEST_ASSERT_TRUE(b.lampen.brandt(2));
  // effect zonder instellingen: de standaardwaarden
  groep(b, R"({"nr":3,"effect":"lasvlam"})");
  TEST_ASSERT_EQUAL(FX_LASVLAM, b.lampen.stand[2].effect);
  TEST_ASSERT_EQUAL(effectInfo(FX_LASVLAM).p1Std, b.lampen.stand[2].p1);
  groep(b, R"({"nr":3,"p2":9})");
  TEST_ASSERT_EQUAL(9, b.lampen.stand[2].p2);
  TEST_ASSERT_EQUAL(FX_LASVLAM, b.lampen.stand[2].effect);
  // meer groepen tegelijk
  groep(b, R"({"nr":[1,2,16],"aan":true})");
  TEST_ASSERT_TRUE(b.lampen.stand[0].aan && b.lampen.stand[1].aan && b.lampen.stand[15].aan);
  // een oud dashboard (1.2) dat nog een helderheid stuurt: die telt niet, aan/uit wel
  TEST_ASSERT_EQUAL(200, groep(b, R"({"nr":1,"aan":false,"helderheid":40})").code);
  TEST_ASSERT_FALSE(b.lampen.stand[0].aan);
  // de effecten met tussenwaarden bestaan niet meer
  TEST_ASSERT_EQUAL(400, groep(b, R"({"nr":1,"effect":"vuur"})").code);
  TEST_ASSERT_EQUAL(400, groep(b, R"({"nr":1,"effect":"ademen"})").code);
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
  groep(b, R"({"nr":2,"naam":"Kerk","max":60,"dagnacht":true})"); // "max" (1.2) telt niet meer
  TEST_ASSERT_EQUAL_STRING("Kerk", b.cfg.groep[1].naam);
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
  groep(b, R"({"nr":4,"aan":true})");
  Antwoord a = scene(b, R"({"actie":"bewaren","naam":"Avond"})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true,\"nr\":3}", a.json.c_str());
  groep(b, R"({"allesUit":true})");
  TEST_ASSERT_EQUAL(200, scene(b, R"({"actie":"oproepen","nr":3})").code);
  TEST_ASSERT_TRUE(b.lampen.stand[3].aan);
  TEST_ASSERT_FALSE(b.lampen.stand[4].aan);
  // per groep kiezen (het dashboard): groep 1 en 16 aan, de rest uit, de naam blijft
  groep(b, R"({"nr":4,"aan":true,"effect":"knipperen"})");
  scene(b, R"({"actie":"bewaren","nr":3})");
  TEST_ASSERT_EQUAL(200, scene(b, R"({"actie":"bewaren","nr":3,"aan":[1,16]})").code);
  TEST_ASSERT_EQUAL_STRING("Avond", b.cfg.scene[2].naam);
  TEST_ASSERT_TRUE(b.cfg.scene[2].groep[0].aan && b.cfg.scene[2].groep[15].aan);
  TEST_ASSERT_FALSE(b.cfg.scene[2].groep[3].aan);
  TEST_ASSERT_EQUAL(FX_KNIPPEREN, b.cfg.scene[2].groep[3].effect); // het effect blijft bewaard
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 0, false));
  TEST_ASSERT_EQUAL(2, (int)d["scenes"][2]["aan"].size());
  TEST_ASSERT_EQUAL(16, d["scenes"][2]["aan"][1].as<int>());
  TEST_ASSERT_EQUAL(N_GROEPEN, (int)d["scenes"][0]["aan"].size()); // "Alles aan"
  TEST_ASSERT_EQUAL(400, scene(b, R"({"actie":"bewaren","nr":3,"aan":[0]})").code);
  TEST_ASSERT_EQUAL(400, scene(b, R"({"actie":"bewaren","nr":3,"aan":5})").code);
  // een nieuwe scène met een keuze per groep: zonder effect
  a = scene(b, R"({"actie":"bewaren","naam":"Perron","aan":[4]})");
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true,\"nr\":4}", a.json.c_str());
  TEST_ASSERT_TRUE(b.cfg.scene[3].groep[3].aan);
  TEST_ASSERT_EQUAL(FX_GEEN, b.cfg.scene[3].groep[3].effect);
  scene(b, R"({"actie":"wissen","nr":4})");
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
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":41,"gedrag":"sensor"})").code);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":1,"gedrag":"lift"})").code);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":1,"functieA":5})").code); // functie 5 bestaat niet
  TEST_ASSERT_EQUAL(SOORT_CONTACT, c.soort);
  TEST_ASSERT_EQUAL(STD_VASTHOUD_MS, c.vasthoudMs);
}

void test_ingang_hallsensor_en_teller() {
  Baan b;
  // ingang 5 als hallsensor (puls), 0,5 s vasthouden, drukknop op "Overweg"
  Antwoord a = ingang(b, R"({"nr":5,"naam":"Hall overweg","soort":"puls","vasthouden":0.5,"gedrag":"drukknop","functieA":1})");
  TEST_ASSERT_EQUAL(200, a.code);
  const IngangCfg &c = b.cfg.ingang[4];
  TEST_ASSERT_EQUAL(SOORT_PULS, c.soort);
  TEST_ASSERT_EQUAL(500, c.vasthoudMs);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":5,"soort":"magneet"})").code);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":5,"vasthouden":11})").code);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":5,"vasthouden":-1})").code);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":5,"vasthouden":"lang"})").code);
  TEST_ASSERT_EQUAL(500, c.vasthoudMs);
  // drie pulsen (alleen de flankvlag: korter dan 5 ms), elke 2 s
  for (uint32_t t = 0; t < 6000; t += 5) b.tick(t, 0, (t % 2000 == 1000) ? 0x0010 : 0);
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 6000, true));
  TEST_ASSERT_EQUAL(3, d["ingangen"][4]["teller"].as<int>());
  TEST_ASSERT_FALSE(d["ingangen"][4]["actief"].as<bool>());
  TEST_ASSERT_EQUAL(0, d["ingangen"][3]["teller"].as<int>());
  deserializeJson(d, apiStaat(b, 6000, false));
  TEST_ASSERT_EQUAL_STRING("puls", d["ingangen"][4]["soort"]);
  TEST_ASSERT_EQUAL(0.5, d["ingangen"][4]["vasthouden"].as<double>());
  // vlak na een puls: actief (vastgehouden)
  b.tick(6000, 0, 0x0010);
  b.tick(6200, 0, 0);
  deserializeJson(d, apiStaat(b, 6200, true));
  TEST_ASSERT_TRUE(d["ingangen"][4]["actief"].as<bool>());
  TEST_ASSERT_EQUAL(4, d["ingangen"][4]["teller"].as<int>());
  // de teller wissen (zonder dat de instellingen veranderen), en alle tellers
  uint32_t rev = b.cfgRev;
  TEST_ASSERT_EQUAL(200, ingang(b, R"({"nr":5,"tellerNul":true})").code);
  TEST_ASSERT_EQUAL_UINT32(0, b.ingangen.t[4].teller);
  TEST_ASSERT_EQUAL_UINT32(rev, b.cfgRev);
  b.ingangen.t[0].teller = 7;
  TEST_ASSERT_EQUAL(200, ingang(b, R"({"tellersNul":true})").code);
  TEST_ASSERT_EQUAL_UINT32(0, b.ingangen.t[0].teller);
  TEST_ASSERT_EQUAL_UINT32(rev, b.cfgRev);
}

void test_instellingen_en_wachtwoord() {
  Baan b;
  Antwoord a = inst(b, R"({"faduur":1.5,"dagnachtMin":30,"opstart":"uit"})"); // "faduur" (1.2) telt niet meer
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_FALSE(a.hotspotOpnieuw);
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
  TEST_ASSERT_EQUAL(N_INGANGEN, (int)d["ingangen"].size());
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
  TEST_ASSERT_TRUE(d["instellingen"]["faduur"].isNull());
  TEST_ASSERT_TRUE(d["groepen"][0]["helderheid"].isNull());
  TEST_ASSERT_TRUE(d["groepen"][0]["max"].isNull());
  TEST_ASSERT_EQUAL_STRING("contact", d["ingangen"][0]["soort"]);
  TEST_ASSERT_TRUE(d["instellingen"]["wachtwoord"].isNull());
  // kort: geen namen, wel de live stand en "rev"
  JsonDocument k;
  TEST_ASSERT_FALSE(deserializeJson(k, kort));
  TEST_ASSERT_TRUE(kort.size() < vol.size() / 2);
  TEST_ASSERT_TRUE(k["groepen"][0]["naam"].isNull());
  TEST_ASSERT_TRUE(k["scenes"].isNull());
  TEST_ASSERT_EQUAL(b.cfgRev, k["rev"].as<uint32_t>());
  TEST_ASSERT_TRUE(k["groepen"][0]["brandt"].as<bool>());
  TEST_ASSERT_FALSE(k["groepen"][1]["brandt"].as<bool>());
  TEST_ASSERT_TRUE(k["groepen"][0]["lamp"].isNull());
  TEST_ASSERT_TRUE(k["ingangen"][0]["teller"].is<int>());
}


// ---------------------------------------------------------------------- Fable-advies (2026-11-12)
Antwoord test(Baan &b, const std::string &j, uint32_t nu = 0) { return apiTest(b, j.data(), j.size(), nu); }

void test_testmodus_looplicht_en_vast() {
  Baan b;
  groep(b, R"({"nr":2,"aan":true})");
  TEST_ASSERT_EQUAL(200, test(b, R"({"actie":"looplicht","stapS":0.5})", 1000).code);
  // groep 1, 2, 3 ... om de beurt aan, de rest uit, ook groep 2 die aan stond
  for (int k = 0; k < 2 * N_GROEPEN; k++) {
    uint32_t t = 1000 + (uint32_t)k * 500 + 250;
    b.tick(t, 0);
    TEST_ASSERT_EQUAL_HEX32(groepBit(k % N_GROEPEN), b.lampen.uitgang);
  }
  JsonDocument d;
  deserializeJson(d, apiStaat(b, 1000 + 2 * 500 + 10, true));
  TEST_ASSERT_EQUAL_STRING("looplicht", d["test"]["soort"]);
  TEST_ASSERT_EQUAL(3, d["test"]["groep"].as<int>());
  // vast: één groep; de stand van de groepen blijft ongemoeid
  TEST_ASSERT_EQUAL(200, test(b, R"({"actie":"vast","groep":5})").code);
  b.tick(50000, 0);
  TEST_ASSERT_EQUAL_HEX32(groepBit(4), b.lampen.uitgang);
  TEST_ASSERT_TRUE(b.lampen.stand[1].aan);
  // stop: de gewone stand komt terug
  TEST_ASSERT_EQUAL(200, test(b, R"({"actie":"stop"})").code);
  b.tick(50010, 0);
  b.tick(52000, 0);
  TEST_ASSERT_EQUAL_HEX32(groepBit(1), b.lampen.uitgang);
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

// ------------------------------------------------------------------------------- firmware 2.0.0: nieuwe eindpunten
namespace {
using Eind = Antwoord (*)(Baan &, const char *, size_t, uint32_t);
Antwoord roep(Eind f, Baan &b, const std::string &j, uint32_t nu = 0) { return f(b, j.data(), j.size(), nu); }
JsonDocument lees(const std::string &t) {
  JsonDocument d;
  deserializeJson(d, t);
  return d;
}
/** een frame zoals de RMT het geeft (ns), van een code */
std::vector<uint32_t> frame(const IrCode &c) {
  std::vector<uint32_t> v(MAX_IR_PULSEN);
  int n = irPulsen(c, v.data(), MAX_IR_PULSEN);
  v.resize(n);
  for (auto &x : v) x *= 1000;
  return v;
}
} // namespace

void test_ir_bewaren_zenden_wissen() {
  Baan b;
  Antwoord a = roep(apiIr, b, R"({"actie":"bewaren","code":{"naam":"Stop bus","soort":"nec","khz":38,"adres":0,"commando":18}})");
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true,\"nr\":1}", a.json.c_str());
  TEST_ASSERT_EQUAL(18, b.cfg.ir[0].commando);
  a = roep(apiIr, b, R"({"actie":"bewaren","nr":3,"code":{"soort":"raw","khz":40,"raw":[2400,600,1200,600,600]}})");
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_EQUAL(5, b.cfg.ir[2].nRaw);
  TEST_ASSERT_EQUAL_STRING("Code 3", b.cfg.ir[2].naam);
  // fouten
  const char *fouten[] = {
      R"({"actie":"bewaren","code":{"soort":"sony"}})",
      R"({"actie":"bewaren","code":{"soort":"nec","khz":60}})",
      R"({"actie":"bewaren","code":{"soort":"rc5","adres":32}})",
      R"({"actie":"bewaren","code":{"soort":"raw","raw":[100]}})",
      R"({"actie":"bewaren","code":{"soort":"raw","raw":[100,0]}})",
      R"({"actie":"bewaren","nr":33,"code":{"soort":"nec"}})",
      R"({"actie":"bewaren"})",
      R"({"actie":"zenden","nr":2})",
      R"({"actie":"zenden","nr":1,"leds":[9]})",
      R"({"actie":"leren","ontvanger":5})",
      R"({"actie":"wissen","nr":2})",
      R"({"actie":"hernoemen","nr":1,"naam":""})",
      R"({"actie":"dansen"})"};
  for (const char *f : fouten) TEST_ASSERT_EQUAL_MESSAGE(400, roep(apiIr, b, f).code, f);
  // zenden: via led 5 en 6; zonder leds: alle
  TEST_ASSERT_EQUAL(200, roep(apiIr, b, R"({"actie":"zenden","nr":1,"leds":[5,6]})").code);
  TEST_ASSERT_EQUAL(200, roep(apiIr, b, R"({"actie":"zenden","nr":3})").code);
  IrZend z;
  TEST_ASSERT_TRUE(b.haalIrZend(z));
  TEST_ASSERT_EQUAL(0, z.code);
  TEST_ASSERT_EQUAL_HEX8(0x30, z.leds);
  TEST_ASSERT_TRUE(b.haalIrZend(z));
  TEST_ASSERT_EQUAL_HEX8(0xFF, z.leds);
  // de rij is vol na 8
  for (int i = 0; i < MAX_IR_RIJ; i++) roep(apiIr, b, R"({"actie":"zenden","nr":1})");
  TEST_ASSERT_EQUAL(400, roep(apiIr, b, R"({"actie":"zenden","nr":1})").code);
  // hernoemen, wissen (een halte die de code gebruikt, verliest ze)
  TEST_ASSERT_EQUAL(200, roep(apiIr, b, R"({"actie":"hernoemen","nr":3,"naam":"Rijd"})").code);
  TEST_ASSERT_EQUAL_STRING("Rijd", b.cfg.ir[2].naam);
  TEST_ASSERT_EQUAL(200, roep(apiHalte, b, R"({"nr":1,"stopCode":3})").code);
  TEST_ASSERT_EQUAL(2, b.cfg.halte[0].stopCode);
  TEST_ASSERT_EQUAL(200, roep(apiIr, b, R"({"actie":"wissen","nr":3})").code);
  TEST_ASSERT_FALSE(b.cfg.ir[2].gebruikt);
  TEST_ASSERT_EQUAL(-1, b.cfg.halte[0].stopCode);
  // staat: codes met hun tekst, zonder de tijden
  JsonDocument d = lees(apiStaat(b, 0, false));
  TEST_ASSERT_EQUAL(1, (int)d["ir"]["codes"].size());
  TEST_ASSERT_EQUAL_STRING("nec:00FF12ED", d["ir"]["codes"][0]["tekst"]);
  TEST_ASSERT_TRUE(d["ir"]["codes"][0]["raw"].isNull()); // NEC: geen tijden
  TEST_ASSERT_EQUAL_STRING("nec", d["ir"]["codes"][0]["soort"]);
  TEST_ASSERT_EQUAL(1, d["ir"]["codes"][0]["herhaal"].as<int>());
  TEST_ASSERT_EQUAL(48, d["ir"]["ontvangers"][0]["pin"].as<int>());
}

void test_ir_leren() {
  Baan b;
  TEST_ASSERT_EQUAL(200, roep(apiIr, b, R"({"actie":"leren","naam":"Stop bus","ontvanger":1})", 1000).code);
  JsonDocument d = lees(apiStaat(b, 4000, true));
  TEST_ASSERT_TRUE(d["leren"]["loopt"].as<bool>());
  TEST_ASSERT_EQUAL(1, d["leren"]["ontvanger"].as<int>());
  TEST_ASSERT_EQUAL(7, d["leren"]["resterendS"].as<int>());
  // een stoorpuls telt niet; een frame van een andere ontvanger ook niet
  uint32_t kort[] = {500000};
  b.irFrame(0, kort, 1, 4100);
  IrCode c;
  c.commando = 0x12;
  std::vector<uint32_t> f = frame(c);
  b.irFrame(2, f.data(), (int)f.size(), 4200);
  TEST_ASSERT_TRUE(b.leren.loopt);
  // de afstandsbediening: draaggolf 38 kHz zoals de TSMP58000 ze geeft
  std::vector<uint32_t> ns;
  std::vector<uint32_t> env = frame(c);
  const uint32_t per = 26316, aan = 8700;
  for (size_t i = 0; i < env.size(); i += 2) {
    int k = (int)((env[i] + per / 2) / per);
    for (int p = 0; p < k; p++) {
      ns.push_back(aan);
      if (p + 1 < k) ns.push_back(per - aan);
    }
    if (i + 1 < env.size()) ns.push_back(per - aan + env[i + 1]);
  }
  b.irFrame(0, ns.data(), (int)ns.size(), 5000);
  TEST_ASSERT_FALSE(b.leren.loopt);
  d = lees(apiStaat(b, 5100, true));
  TEST_ASSERT_FALSE(d["leren"]["loopt"].as<bool>());
  TEST_ASSERT_EQUAL(1, d["leren"]["nr"].as<int>());
  TEST_ASSERT_EQUAL_STRING("Stop bus", b.cfg.ir[0].naam);
  TEST_ASSERT_EQUAL(IR_NEC, b.cfg.ir[0].soort);
  TEST_ASSERT_EQUAL(38, b.cfg.ir[0].khz);
  // leren zonder code: na 10 s gestopt met een fout
  roep(apiIr, b, R"({"actie":"leren"})", 6000);
  b.tick(15999, 0);
  TEST_ASSERT_TRUE(b.leren.loopt);
  b.tick(16000, 0);
  TEST_ASSERT_FALSE(b.leren.loopt);
  d = lees(apiStaat(b, 16000, true));
  TEST_ASSERT_TRUE(d["leren"]["nr"].isNull());
  TEST_ASSERT_TRUE(strlen(d["leren"]["fout"] | "") > 0);
}

void test_bus_en_punt() {
  Baan b;
  TEST_ASSERT_EQUAL(200, roep(apiBus, b, R"({"nr":1,"naam":"Bus 1","kleur":"#d23","code":"nec:00FF12ED"})").code);
  TEST_ASSERT_EQUAL(200, roep(apiBus, b, R"({"naam":"Bus 2","code":"nec:00FF13EC"})").code);
  TEST_ASSERT_TRUE(b.cfg.bus[1].gebruikt);
  const char *fouten[] = {R"({"nr":9})", R"({"nr":1,"kleur":"rood"})", R"({"nr":1,"code":"sony:12"})",
                          R"({"actie":"gezien","bus":3,"punt":"P1"})", R"({"actie":"gezien","bus":1,"punt":"a b"})",
                          R"({"actie":"wissen","nr":5})", R"({"actie":"rijden"})"};
  for (const char *f : fouten) TEST_ASSERT_EQUAL_MESSAGE(400, roep(apiBus, b, f).code, f);
  // punten
  TEST_ASSERT_EQUAL(200, roep(apiPunt, b, R"({"id":"P3","ingang":5,"volgende":"P4","alleenBus":true})").code);
  TEST_ASSERT_EQUAL(200, roep(apiPunt, b, R"({"id":"P4","ontvanger":2,"volgende":"P3"})").code);
  TEST_ASSERT_EQUAL(200, roep(apiPunt, b, R"({"id":"P4","soort":"ftr"})").code); // bijwerken: bron blijft
  TEST_ASSERT_EQUAL(1, b.cfg.punt[1].ontvanger);
  TEST_ASSERT_EQUAL(MELD_FTR, b.cfg.punt[1].soort);
  // loskoppelen zoals het dashboard: ingang 0
  TEST_ASSERT_EQUAL(200, roep(apiPunt, b, R"({"id":"P7","ingang":3})").code);
  TEST_ASSERT_EQUAL(200, roep(apiPunt, b, R"({"id":"P7","ingang":0})").code);
  TEST_ASSERT_EQUAL(-1, b.cfg.punt[b.volg.puntIndex(b.cfg.punt, "P7")].ingang);
  TEST_ASSERT_EQUAL(200, roep(apiPunt, b, R"({"actie":"wissen","id":"P7"})").code);
  const char *pfouten[] = {R"({"ingang":5})", R"({"id":"P9"})", R"({"id":"P9","ingang":41})",
                           R"({"id":"P9","ontvanger":5})", R"({"id":"P9","ingang":1,"ontvanger":1})",
                           R"({"id":"P9","ingang":1,"soort":"laser"})", R"({"actie":"wissen","id":"P9"})"};
  for (const char *f : pfouten) TEST_ASSERT_EQUAL_MESSAGE(400, roep(apiPunt, b, f).code, f);
  // met de hand gezien, dan de hallsensor op P3 (ingang 5): de verwachte bus
  TEST_ASSERT_EQUAL(200, roep(apiBus, b, R"({"actie":"gezien","bus":2,"punt":"P4"})", 1000).code);
  b.cfg.ingang[4].soort = SOORT_PULS;
  for (uint32_t t = 1000; t < 1100; t += 5) b.tick(t, 0);
  b.tick(1100, 0, ingangBit(4));
  JsonDocument d = lees(apiMeldingen(b, 0, 1200));
  TEST_ASSERT_EQUAL(2, d["volgnr"].as<int>());
  TEST_ASSERT_EQUAL(1200, d["msNu"].as<int>());
  TEST_ASSERT_EQUAL(2, (int)d["meldingen"].size());
  TEST_ASSERT_EQUAL_STRING("P3", d["meldingen"][1]["punt"]);
  TEST_ASSERT_EQUAL_STRING("hall", d["meldingen"][1]["soort"]);
  TEST_ASSERT_EQUAL(5, d["meldingen"][1]["ingang"].as<int>());
  TEST_ASSERT_EQUAL(2, d["meldingen"][1]["bus"].as<int>());
  TEST_ASSERT_TRUE(d["meldingen"][1]["code"].isNull());
  TEST_ASSERT_EQUAL(1100, d["meldingen"][1]["ms"].as<int>());
  d = lees(apiMeldingen(b, 2, 1200));
  TEST_ASSERT_EQUAL(0, (int)d["meldingen"].size());
  // een IR-code op ontvanger 2 (P4, soort ftr: toch met code -> blijft ftr zoals ingesteld)
  IrCode c;
  c.commando = 0x12;
  std::vector<uint32_t> f = frame(c);
  b.irFrame(1, f.data(), (int)f.size(), 9000);
  d = lees(apiMeldingen(b, 2, 9000));
  TEST_ASSERT_EQUAL(1, d["meldingen"][0]["bus"].as<int>());
  TEST_ASSERT_EQUAL_STRING("nec:00FF12ED", d["meldingen"][0]["code"]);
  TEST_ASSERT_EQUAL(2, d["meldingen"][0]["ontvanger"].as<int>());
  // staat kort: bussen met van/naar/fractie, irLaatst, msNu
  d = lees(apiStaat(b, 9000 + 2000, true));
  TEST_ASSERT_EQUAL(11000, d["msNu"].as<int>());
  TEST_ASSERT_EQUAL(2, (int)d["bussen"].size());
  TEST_ASSERT_EQUAL_STRING("P4", d["bussen"][0]["van"]);
  TEST_ASSERT_EQUAL_STRING("P3", d["bussen"][0]["naar"]);
  TEST_ASSERT_FLOAT_WITHIN(0.001, 0.2, d["bussen"][0]["fractie"].as<double>()); // 2 s van 10 s
  TEST_ASSERT_EQUAL_STRING("rijdt", d["bussen"][0]["staat"]);
  TEST_ASSERT_EQUAL(9000, d["bussen"][0]["gezienMs"].as<int>());
  TEST_ASSERT_TRUE(d["bussen"][0]["naam"].isNull()); // kort: zonder namen
  TEST_ASSERT_EQUAL_STRING("nec:00FF12ED", d["irLaatst"][0]["code"]);
  TEST_ASSERT_EQUAL(2, d["irLaatst"][0]["ontvanger"].as<int>());
  d = lees(apiStaat(b, 11000, false));
  TEST_ASSERT_EQUAL_STRING("Bus 1", d["bussen"][0]["naam"]);
  TEST_ASSERT_EQUAL_STRING("P3", d["punten"][0]["id"]);
  TEST_ASSERT_EQUAL(5, d["punten"][0]["ingang"].as<int>());
  // wissen
  TEST_ASSERT_EQUAL(200, roep(apiPunt, b, R"({"actie":"wissen","id":"P3"})").code);
  TEST_ASSERT_EQUAL(-1, b.volg.puntIndex(b.cfg.punt, "P3"));
  TEST_ASSERT_EQUAL(200, roep(apiBus, b, R"({"actie":"wissen","nr":1})").code);
  TEST_ASSERT_FALSE(b.volg.bus[0].gezien);
}

void test_servo_api() {
  Baan b;
  TEST_ASSERT_EQUAL(200, roep(apiServo, b, R"({"nr":1,"naam":"Wissel 1","kanaal":1,"a":1100,"b":1900,"snelheid":400,"soort":"wissel"})").code);
  JsonDocument d = lees(apiStaat(b, 0, true));
  TEST_ASSERT_EQUAL(1, (int)d["servos"].size());
  TEST_ASSERT_EQUAL(0, d["servos"][0]["us"].as<int>()); // nog geen stand: geen puls
  TEST_ASSERT_EQUAL(200, roep(apiServo, b, R"({"nr":1,"naar":"a"})").code);
  TEST_ASSERT_EQUAL(1100, b.servos.us(0));
  TEST_ASSERT_EQUAL(200, roep(apiServo, b, R"({"nr":1,"naar":"wissel"})", 0).code);
  for (uint32_t t = 5; t <= 1000; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL_STRING("onderweg", b.servos.standTekst(0)); // 800 µs aan 400 µs/s = 2 s
  for (uint32_t t = 1005; t <= 2100; t += 5) b.tick(t, 0);
  d = lees(apiStaat(b, 2100, true));
  TEST_ASSERT_EQUAL(1900, d["servos"][0]["us"].as<int>());
  TEST_ASSERT_EQUAL_STRING("b", d["servos"][0]["stand"]);
  // proef: de eindstand zoeken
  TEST_ASSERT_EQUAL(200, roep(apiServo, b, R"({"nr":1,"proef":1500})", 2100).code);
  for (uint32_t t = 2105; t <= 3200; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL(1500, b.servos.us(0));
  // een andere eindstand B bewaren terwijl hij op B staat: hij gaat erheen
  roep(apiServo, b, R"({"nr":1,"naar":"b"})", 3200);
  for (uint32_t t = 3205; t <= 5000; t += 5) b.tick(t, 0);
  TEST_ASSERT_EQUAL(200, roep(apiServo, b, R"({"nr":1,"b":2000,"snelheid":0})", 5000).code);
  TEST_ASSERT_EQUAL(2000, b.servos.us(0));
  // stand bewaard voor na een stroomonderbreking
  Stand s = b.bewaarStand(5000);
  TEST_ASSERT_EQUAL_HEX16(1, s.servosB);
  // proef zoals het dashboard ze stuurt, ook voor een servo die nog niet bewaard is
  TEST_ASSERT_EQUAL(200, roep(apiServo, b, R"({"nr":4,"kanaal":7,"proef":1200})", 6000).code);
  TEST_ASSERT_TRUE(b.cfg.servo[3].gebruikt);
  TEST_ASSERT_EQUAL(6, b.cfg.servo[3].kanaal);
  TEST_ASSERT_EQUAL(1200, b.servos.us(3));
  TEST_ASSERT_EQUAL(400, roep(apiServo, b, R"({"nr":4,"kanaal":17,"proef":1200})").code);
  const char *fouten[] = {R"({"nr":17})", R"({"naam":"x"})", R"({"nr":1,"kanaal":17})", R"({"nr":1,"a":400})",
                          R"({"nr":1,"snelheid":30000})", R"({"nr":1,"soort":"kraan"})", R"({"nr":1,"naar":"c"})",
                          R"({"nr":1,"proef":3000})", R"({"nr":2,"naar":"a"})", R"({"actie":"wissen","nr":2})"};
  for (const char *f : fouten) TEST_ASSERT_EQUAL_MESSAGE(400, roep(apiServo, b, f).code, f);
  TEST_ASSERT_EQUAL(200, roep(apiServo, b, R"({"actie":"wissen","nr":1})").code);
  TEST_ASSERT_EQUAL(0, b.servos.tellen(0));
}

void test_halte_api_fouten() {
  Baan b;
  roep(apiIr, b, R"({"actie":"bewaren","code":{"soort":"nec"}})");
  TEST_ASSERT_EQUAL(200, roep(apiHalte, b, R"({"nr":1,"naam":"Halte Station 1","aankomstPunt":"P5","stopLeds":[5],
    "stopCode":1,"rijdCode":0,"wachtS":12,"vrijIngangen":[7,40],"vrijMinS":3,"licht":{"rood":9,"oranje":10,"groen":11},
    "groenS":5,"servo":0})").code);
  TEST_ASSERT_EQUAL_HEX64(ingangBit(6) | ingangBit(39), b.cfg.halte[0].vrijIngangen);
  const char *fouten[] = {R"({"nr":9})", R"({"nr":1,"aankomstPunt":"a b"})", R"({"nr":1,"stopLeds":[9]})",
                          R"({"nr":1,"stopCode":2})", R"({"nr":1,"servo":1})", R"({"nr":1,"wachtS":-1})",
                          R"({"nr":1,"licht":{"rood":99}})", R"({"nr":1,"licht":5})", R"({"nr":1,"vrijIngangen":[41]})",
                          R"({"actie":"wissen","nr":2})"};
  for (const char *f : fouten) TEST_ASSERT_EQUAL_MESSAGE(400, roep(apiHalte, b, f).code, f);
  JsonDocument d = lees(apiStaat(b, 0, false));
  TEST_ASSERT_EQUAL_STRING("vrij", d["haltes"][0]["fase"]);
  TEST_ASSERT_EQUAL(0, d["haltes"][0]["bus"].as<int>());
  TEST_ASSERT_EQUAL(9, d["haltes"][0]["licht"]["rood"].as<int>());
  TEST_ASSERT_EQUAL(0, d["haltes"][0]["rijdCode"].as<int>());
  TEST_ASSERT_EQUAL(200, roep(apiHalte, b, R"({"actie":"wissen","nr":1})").code);
  TEST_ASSERT_FALSE(b.cfg.halte[0].gebruikt);
}

void test_kastjes() {
  Baan b;
  Antwoord a = roep(apiKastje, b, R"({"actie":"aanmelden","id":"a1b2c3","naam":"Kerk","ip":"192.168.4.23",
    "geluiden":[{"naam":"klok.wav","s":4.2},{"naam":"../slecht.wav","s":1}],"versie":"1.0.0"})", 1000);
  TEST_ASSERT_EQUAL(200, a.code);
  TEST_ASSERT_EQUAL(1, b.kastjes.k[0].nGeluiden);
  TEST_ASSERT_EQUAL(42, b.kastjes.k[0].geluid[0].ds);
  TEST_ASSERT_EQUAL(200, roep(apiKastje, b, R"({"actie":"spelen","kastje":"kerk","geluid":"klok.wav","volume":80})", 2000).code);
  HttpOpdracht o;
  TEST_ASSERT_TRUE(b.kastjes.haal(o));
  TEST_ASSERT_EQUAL_STRING("/speel", o.pad);
  TEST_ASSERT_EQUAL_STRING("{\"geluid\":\"klok.wav\",\"volume\":80}", o.body);
  TEST_ASSERT_EQUAL(200, roep(apiKastje, b, R"({"actie":"stop","kastje":"Kerk"})", 2000).code);
  TEST_ASSERT_TRUE(b.kastjes.haal(o));
  TEST_ASSERT_EQUAL_STRING("/stop", o.pad);
  TEST_ASSERT_EQUAL(200, roep(apiKastje, b, R"({"actie":"hernoemen","id":"a1b2c3","naam":"Kapel"})", 2000).code);
  TEST_ASSERT_TRUE(b.kastjes.haal(o));
  TEST_ASSERT_EQUAL_STRING("/naam", o.pad);
  TEST_ASSERT_EQUAL_STRING("{\"naam\":\"Kapel\"}", o.body);
  TEST_ASSERT_EQUAL_STRING("Kapel", b.kastjes.k[0].naam);
  // opnieuw aanmelden (elke 30 s) met dezelfde id: bijgewerkt, geen tweede kastje
  roep(apiKastje, b, R"({"actie":"aanmelden","id":"a1b2c3","naam":"Kapel","ip":"192.168.4.24","geluiden":[]})", 30000);
  TEST_ASSERT_FALSE(b.kastjes.k[1].gebruikt);
  TEST_ASSERT_EQUAL_STRING("192.168.4.24", b.kastjes.k[0].ip);
  const char *fouten[] = {R"({"actie":"aanmelden","id":"","ip":"192.168.4.2"})",
                          R"({"actie":"aanmelden","id":"x1","ip":"192.168.4"})",
                          R"({"actie":"aanmelden","id":"x/1","ip":"192.168.4.2"})",
                          R"({"actie":"spelen","kastje":"Toren","geluid":"klok.wav"})",
                          R"({"actie":"spelen","kastje":"Kapel","geluid":"a/b.wav"})",
                          R"({"actie":"spelen","kastje":"Kapel","geluid":"klok.wav","volume":101})",
                          R"({"actie":"hernoemen","id":"a1b2c3","naam":""})", R"({"actie":"zingen"})"};
  for (const char *f : fouten) TEST_ASSERT_EQUAL_MESSAGE(400, roep(apiKastje, b, f, 31000).code, f);
  JsonDocument d = lees(apiStaat(b, 31000, false));
  TEST_ASSERT_EQUAL_STRING("Kapel", d["kastjes"][0]["naam"]);
  TEST_ASSERT_TRUE(d["kastjes"][0]["online"].as<bool>());
  // 90 s niets gehoord: offline, spelen gaat niet
  TEST_ASSERT_EQUAL(400, roep(apiKastje, b, R"({"actie":"spelen","kastje":"Kapel","geluid":"klok.wav"})", 30000 + 90000).code);
  d = lees(apiStaat(b, 30000 + 90000, false));
  TEST_ASSERT_FALSE(d["kastjes"][0]["online"].as<bool>());
}

void test_ingang_polariteit_api() {
  Baan b;
  // E3, negatieve proef: standaard is elke print "vcc" (gemeenschappelijke VCC): pnp kan daar niet
  Antwoord a = ingang(b, R"({"nr":5,"polariteit":"pnp"})");
  TEST_ASSERT_EQUAL(400, a.code);
  TEST_ASSERT_TRUE(a.json.find("PNP kan niet") != std::string::npos);
  TEST_ASSERT_EQUAL(POL_NPN, b.cfg.ingang[4].polariteit);
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"groep":3,"polariteit":"pnp"})").code);
  // print 1 "gnd", print 3 "apart": dan wel
  TEST_ASSERT_EQUAL(200, inst(b, R"({"printSoort":["gnd","vcc","apart"]})").code);
  TEST_ASSERT_EQUAL(200, ingang(b, R"({"nr":5,"polariteit":"pnp"})").code);
  TEST_ASSERT_EQUAL(POL_PNP, b.cfg.ingang[4].polariteit);
  TEST_ASSERT_EQUAL(200, ingang(b, R"({"groep":3,"polariteit":"pnp"})").code); // print 3 = ingang 17..23
  for (int i = 16; i < 23; i++) TEST_ASSERT_EQUAL(POL_PNP, b.cfg.ingang[i].polariteit);
  TEST_ASSERT_EQUAL(POL_NPN, b.cfg.ingang[23].polariteit); // ingang 24 bestaat niet (E7)
  TEST_ASSERT_EQUAL(400, ingang(b, R"({"nr":12,"polariteit":"pnp"})").code); // print 2 bleef "vcc"
  // print 1 terug naar "vcc" terwijl ingang 5 pnp is: geweigerd, met de ingang in de uitleg
  a = inst(b, R"({"printSoort":["vcc"]})");
  TEST_ASSERT_EQUAL(400, a.code);
  TEST_ASSERT_TRUE(a.json.find("ingang 5") != std::string::npos);
  TEST_ASSERT_EQUAL(PRINT_GND, b.cfg.inst.printSoort[0]);
  // de tweede MCP23017: print 4 = 25..31, print 5 = 32..38
  TEST_ASSERT_EQUAL(200, inst(b, R"({"printSoort":["gnd","vcc","apart","vcc","gnd"]})").code);
  TEST_ASSERT_EQUAL(200, ingang(b, R"({"groep":5,"polariteit":"pnp"})").code);
  TEST_ASSERT_EQUAL(POL_PNP, b.cfg.ingang[31].polariteit);
  TEST_ASSERT_EQUAL(POL_PNP, b.cfg.ingang[37].polariteit);
  TEST_ASSERT_EQUAL(POL_NPN, b.cfg.ingang[30].polariteit);
  TEST_ASSERT_EQUAL(POL_NPN, b.cfg.ingang[38].polariteit);
  TEST_ASSERT_EQUAL(200, ingang(b, R"({"nr":38,"naam":"Reflex 4","soort":"puls"})").code);
  const char *fouten[] = {R"({"nr":5,"polariteit":"PNP"})", R"({"groep":6,"polariteit":"pnp"})",
                          R"({"groep":1})", R"({"nr":5,"polariteit":1})"};
  for (const char *f : fouten) TEST_ASSERT_EQUAL_MESSAGE(400, ingang(b, f).code, f);
  const char *ifouten[] = {R"({"printSoort":"gnd"})", R"({"printSoort":[]})", R"({"printSoort":["GND"]})",
                           R"({"printSoort":["vcc","vcc","vcc","vcc","vcc","vcc"]})", R"({"irDuty":40})",
                           R"({"irDuty":"50"})", R"({"irLedActiefLaag":1})"};
  for (const char *f : ifouten) TEST_ASSERT_EQUAL_MESSAGE(400, inst(b, f).code, f);
  TEST_ASSERT_EQUAL(200, inst(b, R"({"irDuty":50,"irLedActiefLaag":false})").code);
  JsonDocument d = lees(apiStaat(b, 0, false));
  TEST_ASSERT_EQUAL_STRING("pnp", d["ingangen"][4]["polariteit"]);
  TEST_ASSERT_EQUAL_STRING("npn", d["ingangen"][0]["polariteit"]);
  TEST_ASSERT_TRUE(d["ingangen"][16]["aanwezig"].as<bool>());
  TEST_ASSERT_TRUE(d["ingangen"][22]["aanwezig"].as<bool>());
  TEST_ASSERT_FALSE(d["ingangen"][23]["aanwezig"].as<bool>()); // ingang 24 (GPB7) bestaat niet
  TEST_ASSERT_FALSE(d["ingangen"][30]["aanwezig"].as<bool>()); // geen tweede MCP23017
  TEST_ASSERT_EQUAL_STRING("Reflex 4", d["ingangen"][37]["naam"]);
  TEST_ASSERT_EQUAL_STRING("gnd", d["instellingen"]["printSoort"][0]);
  TEST_ASSERT_EQUAL_STRING("apart", d["instellingen"]["printSoort"][2]);
  TEST_ASSERT_EQUAL(5, (int)d["instellingen"]["printSoort"].size());
  TEST_ASSERT_EQUAL(50, d["instellingen"]["irDuty"].as<int>());
  TEST_ASSERT_FALSE(d["instellingen"]["irLedActiefLaag"].as<bool>());
  TEST_ASSERT_TRUE(d["pnpOmkeren"].isNull());
}

// E3: print "gnd" met een npn-sensor (pull-up naar S12): in rust geleidt de optocoupler (pin laag) = NIET actief;
// de sensor trekt IN naar 0 V, de optocoupler spert (pin hoog) = actief. Negatieve proef: dezelfde lezing op een print
// "vcc" geeft het omgekeerde.
void test_printsoort_keert_npn_om_op_gnd() {
  Baan b;
  b.cfg.ingang[2].soort = SOORT_CONTACT;
  // print "vcc": pin laag = actief
  for (uint32_t t = 0; t <= 100; t += 5) b.tick(t, 0);
  for (uint32_t t = 105; t <= 200; t += 5) b.tick(t, ingangBit(2));
  TEST_ASSERT_TRUE(b.ingangen.t[2].actief);
  // naar "gnd": de ingang begint opnieuw (de huidige lezing is rust), dan keert de Baan hem om
  TEST_ASSERT_EQUAL(200, inst(b, R"({"printSoort":["gnd"]})").code);
  TEST_ASSERT_TRUE(b.omkeerMasker() & ingangBit(2));
  for (uint32_t t = 205; t <= 300; t += 5) b.tick(t, ingangBit(2)); // in rust: optocoupler geleidt
  TEST_ASSERT_FALSE(b.ingangen.t[2].actief);
  for (uint32_t t = 305; t <= 400; t += 5) b.tick(t, 0);            // de sensor schakelt
  TEST_ASSERT_TRUE(b.ingangen.t[2].actief);
  // pnp op "gnd" of "apart": niets omkeren
  TEST_ASSERT_EQUAL(200, ingang(b, R"({"nr":3,"polariteit":"pnp"})").code);
  TEST_ASSERT_FALSE(b.omkeerMasker() & ingangBit(2));
  TEST_ASSERT_EQUAL(200, inst(b, R"({"printSoort":["apart"]})").code);
  TEST_ASSERT_EQUAL(200, ingang(b, R"({"nr":3,"polariteit":"npn"})").code);
  TEST_ASSERT_EQUAL(0, (int)(b.omkeerMasker() & 0xFF));
}

// F6: toegang voor wijzigingen
void test_toegang_f6() {
  const char *ww = "treinbaan";
  TEST_ASSERT_EQUAL(0, toegang("192.168.4.23", "", "", "192.168.4.1", "", ww));          // hotspot
  TEST_ASSERT_EQUAL(0, toegang("192.168.4.23", "", "http://192.168.4.1", "192.168.4.1", "", ww));
  TEST_ASSERT_EQUAL(401, toegang("192.168.1.30", "", "", "treinbaan.local", "192.168.1.50", ww)); // thuisnet
  TEST_ASSERT_EQUAL(401, toegang("192.168.1.30", "fout", "", "treinbaan.local", "192.168.1.50", ww));
  TEST_ASSERT_EQUAL(0, toegang("192.168.1.30", ww, "http://treinbaan.local", "treinbaan.local", "192.168.1.50", ww));
  TEST_ASSERT_EQUAL(0, toegang("192.168.1.30", ww, "http://192.168.1.50", "192.168.1.50", "192.168.1.50", ww));
  // een andere webpagina (CSRF): ook vanaf de hotspot en ook met het wachtwoord geweigerd
  TEST_ASSERT_EQUAL(403, toegang("192.168.4.23", "", "http://kwaad.example", "192.168.4.1", "", ww));
  TEST_ASSERT_EQUAL(403, toegang("192.168.1.30", ww, "null", "treinbaan.local", "192.168.1.50", ww));
  TEST_ASSERT_EQUAL(403, toegang("192.168.1.30", ww, "https://treinbaan.local.example", "treinbaan.local", "", ww));
  TEST_ASSERT_EQUAL(401, geweigerd(401).code);
  TEST_ASSERT_EQUAL(403, geweigerd(403).code);
}

// Q1: de JSON van GET /api/zelftest
void test_zelftest_json() {
  ZelftestHw z;
  z.i2c[0] = z.i2c[2] = z.i2c[4] = true;
  z.pcaTerug = z.mcp1 = z.servo = z.fs = true;
  z.pcaGeschreven = z.pcaGelezen = 0x0005;
  z.stapelLicht = 3120;
  z.wifiClients = 2;
  JsonDocument d = lees(apiZelftest(z));
  TEST_ASSERT_TRUE(d["ok"].as<bool>());
  TEST_ASSERT_EQUAL(5, (int)d["i2c"].size());
  TEST_ASSERT_EQUAL_STRING("0x42", d["i2c"][4]["adres"]);
  TEST_ASSERT_FALSE(d["i2c"][1]["gevonden"].as<bool>());
  TEST_ASSERT_EQUAL(3120, d["stapelVrij"]["licht"].as<int>());
  TEST_ASSERT_EQUAL(2, d["wifiClients"].as<int>());
  z.pcaTerug = false;
  d = lees(apiZelftest(z));
  TEST_ASSERT_FALSE(d["ok"].as<bool>());
}

void test_plan_en_hulp() {
  TEST_ASSERT_EQUAL(200, planNakijken("{\"versie\":2,\"rijbanen\":[]}", 26).code);
  TEST_ASSERT_EQUAL(400, planNakijken("[1,2]", 5).code);
  TEST_ASSERT_EQUAL(400, planNakijken("{\"versie\":", 11).code);
  TEST_ASSERT_EQUAL(400, planNakijken("", 0).code);
  std::string groot = "{\"x\":\"" + std::string(MAX_PLAN, 'a') + "\"}";
  TEST_ASSERT_EQUAL(400, planNakijken(groot.data(), groot.size()).code);
  TEST_ASSERT_TRUE(tvNaamGeldig("achtergrond.jpg"));
  TEST_ASSERT_TRUE(tvNaamGeldig("plan.json"));
  TEST_ASSERT_FALSE(tvNaamGeldig("../x.jpg"));
  TEST_ASSERT_FALSE(tvNaamGeldig("geenpunt"));
  TEST_ASSERT_FALSE(tvNaamGeldig(".verborgen"));
  TEST_ASSERT_EQUAL_STRING("image/jpeg", inhoudSoort("a.jpg"));
  TEST_ASSERT_EQUAL_STRING("application/json", inhoudSoort("plan.json"));
  TEST_ASSERT_EQUAL_UINT32(812, sindsVan("812"));
  TEST_ASSERT_EQUAL_UINT32(0, sindsVan("x"));
  TEST_ASSERT_EQUAL_UINT32(0, sindsVan(nullptr));
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
  RUN_TEST(test_ingang_hallsensor_en_teller);
  RUN_TEST(test_instellingen_en_wachtwoord);
  RUN_TEST(test_dagnacht);
  RUN_TEST(test_staat_volledig_en_kort);
  RUN_TEST(test_testmodus_looplicht_en_vast);
  RUN_TEST(test_testmodus_alles_uit_stopt_en_fouten);
  RUN_TEST(test_thuisnet_instellen);
  RUN_TEST(test_knop_alles_aan_uit_standaard);
  RUN_TEST(test_ir_bewaren_zenden_wissen);
  RUN_TEST(test_ir_leren);
  RUN_TEST(test_bus_en_punt);
  RUN_TEST(test_servo_api);
  RUN_TEST(test_halte_api_fouten);
  RUN_TEST(test_kastjes);
  RUN_TEST(test_ingang_polariteit_api);
  RUN_TEST(test_printsoort_keert_npn_om_op_gnd);
  RUN_TEST(test_toegang_f6);
  RUN_TEST(test_zelftest_json);
  RUN_TEST(test_plan_en_hulp);
  return UNITY_END();
}
