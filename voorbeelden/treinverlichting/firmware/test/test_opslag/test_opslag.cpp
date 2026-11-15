// Tests van de opslag (include/opslag.h) op de pc:  python -m platformio test -e native
// Heen en terug, kapot bestand, te groot, onbekende versie, verkeerd soort onderdeel, waarden buiten het bereik,
// te lange namen (UTF-8), onbekende effecten en groepen, wachtwoord, de laatste stand, 3000 willekeurig
// beschadigde bestanden (nooit crashen, alles altijd binnen de grenzen), en de omzetting van versie 1 (firmware 1.2,
// met helderheden) naar versie 2 (firmware 1.3.0, alleen aan/uit).
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
  TEST_ASSERT_TRUE(x.inst.dagnachtMin >= MIN_DAGNACHT_MIN && x.inst.dagnachtMin <= MAX_DAGNACHT_MIN);
  TEST_ASSERT_TRUE(wachtwoordGeldig(x.inst.wachtwoord));
  for (int g = 0; g < N_GROEPEN; g++) {
    TEST_ASSERT_TRUE(strlen(x.groep[g].naam) > 0 && strlen(x.groep[g].naam) < (size_t)NAAM_LEN);
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
    TEST_ASSERT_TRUE(x.ingang[i].soort < N_SOORTEN);
    TEST_ASSERT_TRUE(x.ingang[i].vasthoudMs <= MAX_VASTHOUD_MS);
  }
}

} // namespace

void test_heen_en_terug() {
  Config a;
  standaard(a);
  strcpy(a.groep[3].naam, "Café 't Spoor");
  a.groep[3].dagnacht = true;
  a.inst.opstartLaatste = false;
  a.scene[5].gebruikt = true;
  strcpy(a.scene[5].naam, "Nacht");
  a.scene[5].groep[2].aan = true;
  a.scene[5].groep[2].effect = FX_LASVLAM;
  a.scene[5].groep[2].p1 = 8;
  a.scene[5].groep[2].p2 = 7;
  a.ingang[1].gedrag = GEDRAG_SENSOR;
  a.ingang[1].functieA = 0;
  a.ingang[1].naloopS = 25;
  a.ingang[6].soort = SOORT_PULS;
  a.ingang[6].vasthoudMs = 750;
  std::string j = configNaarJson(a);
  std::string m;
  TEST_ASSERT_EQUAL(Laad::OK, laad(j, m));
  TEST_ASSERT_EQUAL_STRING("", m.c_str());
  TEST_ASSERT_EQUAL_STRING(j.c_str(), configNaarJson(c).c_str());
  TEST_ASSERT_EQUAL_STRING("Café 't Spoor", c.groep[3].naam);
  TEST_ASSERT_FALSE(c.scene[4].gebruikt);
  TEST_ASSERT_EQUAL(FX_LASVLAM, c.scene[5].groep[2].effect);
  TEST_ASSERT_EQUAL(30000u, c.functie[0].stap[0].wachtMs);
  TEST_ASSERT_EQUAL(SOORT_PULS, c.ingang[6].soort);
  TEST_ASSERT_EQUAL(750, c.ingang[6].vasthoudMs);
  TEST_ASSERT_TRUE(j.find("\"versie\":2") != std::string::npos);
  TEST_ASSERT_TRUE(j.find("helderheid") == std::string::npos);
}

void test_kapot_bestand_geeft_standaard() {
  const char *kapot[] = {"{", "", "nul", "[1,2,3]", "\"tekst\"", "{\"versie\":1,",
                         "\xff\xfe{}"};
  for (const char *k : kapot) {
    std::string m;
    c.groep[0].dagnacht = true; // iets anders dan de standaard
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
  const char *v[] = {"{\"versie\":3}", "{\"versie\":0}", "{\"versie\":\"1\"}", "{\"versie\":1.5}",
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
  TEST_ASSERT_EQUAL(Laad::OK, laad("{\"versie\":2}", m));
  TEST_ASSERT_TRUE(isStandaard(c));
  TEST_ASSERT_EQUAL(Laad::OMGEZET, laad("{\"versie\":1}", m)); // oud, leeg: ook gewoon de standaard
  TEST_ASSERT_TRUE(isStandaard(c));
  TEST_ASSERT_EQUAL_STRING("", m.c_str());
}

void test_waarden_buiten_bereik_worden_aangepast() {
  std::string t = R"({"versie":2,
    "instellingen":{"faduur":99,"dagnachtMin":1,"opstart":"soms","wachtwoord":"kort"},
    "groepen":[{"naam":"Station","max":250},{"naam":"","max":-4,"dagnacht":"ja"},{"naam":42}],
    "scenes":[{"naam":"Avond","groepen":[{"aan":true,"helderheid":250,"effect":"disco","p1":-9}]}],
    "functies":[{"naam":"Lichtshow_met_een_heel_erg_lange_naam","herhalen":true,
                 "stappen":[{"groepen":[1,99,0,"x"],"actie":"aan"},{"actie":"dansen"},
                            {"groepen":[2],"actie":"effect","effect":"vuur","p1":500,"wacht":-3}]}],
    "ingangen":[{"gedrag":"lift","functieA":40,"nalopen":99999,"soort":"magneet","vasthouden":60}]})";
  std::string m;
  TEST_ASSERT_EQUAL(Laad::HERSTELD, laad(t, m));
  TEST_ASSERT_TRUE(m.find("aangepast") != std::string::npos);
  kijkGrenzen(c);
  TEST_ASSERT_EQUAL(MIN_DAGNACHT_MIN, c.inst.dagnachtMin);
  TEST_ASSERT_TRUE(c.inst.opstartLaatste);
  TEST_ASSERT_EQUAL_STRING(STD_WACHTWOORD, c.inst.wachtwoord);
  TEST_ASSERT_EQUAL_STRING("Station", c.groep[0].naam);
  TEST_ASSERT_EQUAL_STRING("Groep 2", c.groep[1].naam);
  TEST_ASSERT_FALSE(c.groep[1].dagnacht);
  TEST_ASSERT_EQUAL_STRING("Groep 3", c.groep[2].naam);
  TEST_ASSERT_TRUE(c.scene[0].groep[0].aan);
  TEST_ASSERT_EQUAL(FX_GEEN, c.scene[0].groep[0].effect);
  TEST_ASSERT_FALSE(c.scene[1].gebruikt); // de lijst had maar één scène
  const Functie &f = c.functie[0];
  TEST_ASSERT_EQUAL(NAAM_LEN - 1, (int)strlen(f.naam));
  TEST_ASSERT_EQUAL(2, f.nStappen);          // "dansen" bestaat niet
  TEST_ASSERT_EQUAL_HEX16(0x0001, f.stap[0].groepen); // groep 99, 0 en "x" weg
  TEST_ASSERT_EQUAL(ACT_AAN, f.stap[1].actie); // effect "vuur" (firmware 1.2): gewoon aan
  TEST_ASSERT_EQUAL(0u, f.stap[1].wachtMs);
  TEST_ASSERT_FALSE(f.herhalen);             // herhalen zonder wachttijd = eindeloos snel: uit
  TEST_ASSERT_FALSE(c.functie[1].gebruikt);
  TEST_ASSERT_EQUAL(GEDRAG_DRUKKNOP, c.ingang[0].gedrag); // "lift" bestaat niet: de standaard (knop alles aan/uit) blijft
  TEST_ASSERT_EQUAL(-1, c.ingang[0].functieA); // functie 40 bestaat niet: geen
  TEST_ASSERT_EQUAL(MAX_NALOOP_S, c.ingang[0].naloopS);
  TEST_ASSERT_EQUAL(SOORT_CONTACT, c.ingang[0].soort);       // "magneet" bestaat niet
  TEST_ASSERT_EQUAL(MAX_VASTHOUD_MS, c.ingang[0].vasthoudMs); // 60 s: begrensd op 10 s
}

void test_oude_config_met_helderheid_wordt_omgezet() {
  // een bestand zoals firmware 1.2.0 het bewaarde (versie 1, met helderheid, maximum, faduur en de effecten met
  // tussenwaarden): laadt zonder fouten en zonder melding, alles wordt aan/uit
  std::string t = R"({"versie":1,
    "instellingen":{"faduur":0.5,"dagnachtMin":20,"opstart":"laatste","wachtwoord":"stoomtrein",
                    "thuisnet":{"ssid":"","wachtwoord":""}},
    "groepen":[{"naam":"Station","max":80,"dagnacht":true},{"naam":"Kerk","max":100,"dagnacht":false}],
    "scenes":[{"naam":"Avond","groepen":[
        {"aan":true,"helderheid":60,"effect":"geen","p1":0,"p2":0,"fase":0},
        {"aan":true,"helderheid":40,"effect":"vuur","p1":60,"p2":5,"fase":0},
        {"aan":false,"helderheid":100,"effect":"ademen","p1":4,"p2":10,"fase":0},
        {"aan":true,"helderheid":100,"effect":"knipperen","p1":300,"p2":700,"fase":0},
        {"aan":true,"helderheid":25,"effect":"tv","p1":50,"p2":3,"fase":0}]}],
    "functies":[{"naam":"Dimmen","herhalen":false,"stopUit":true,"stappen":[
        {"groepen":[1],"actie":"helderheid","waarde":60,"wacht":1},
        {"groepen":[2],"actie":"helderheid","waarde":0,"wacht":1},
        {"groepen":[3],"actie":"effect","effect":"ademen","p1":4,"p2":10,"wacht":2},
        {"groepen":[4],"actie":"effect","effect":"tl","p1":4,"p2":1500,"wacht":0}]}],
    "ingangen":[{"naam":"Knop","gedrag":"drukknop","functieA":1,"functieB":0,"wisselen":true,"nalopen":10}]})";
  std::string m;
  TEST_ASSERT_EQUAL(Laad::OMGEZET, laad(t, m));
  TEST_ASSERT_EQUAL_STRING("", m.c_str());
  kijkGrenzen(c);
  TEST_ASSERT_EQUAL_STRING("stoomtrein", c.inst.wachtwoord);
  TEST_ASSERT_EQUAL_STRING("Station", c.groep[0].naam);
  TEST_ASSERT_TRUE(c.groep[0].dagnacht);
  const Scene &s = c.scene[0];
  TEST_ASSERT_TRUE(s.gebruikt);
  TEST_ASSERT_TRUE(s.groep[0].aan);                          // helderheid 60 -> aan
  TEST_ASSERT_TRUE(s.groep[1].aan);                          // vuur -> aan zonder effect
  TEST_ASSERT_EQUAL(FX_GEEN, s.groep[1].effect);
  TEST_ASSERT_FALSE(s.groep[2].aan);                         // stond uit: blijft uit
  TEST_ASSERT_EQUAL(FX_GEEN, s.groep[2].effect);
  TEST_ASSERT_EQUAL(FX_KNIPPEREN, s.groep[3].effect);        // knipperen blijft
  TEST_ASSERT_EQUAL(300, s.groep[3].p1);
  TEST_ASSERT_TRUE(s.groep[4].aan && s.groep[4].effect == FX_GEEN); // tv -> aan
  const Functie &f = c.functie[0];
  TEST_ASSERT_EQUAL(4, f.nStappen);
  TEST_ASSERT_EQUAL(ACT_AAN, f.stap[0].actie);                // helderheid 60 -> aan
  TEST_ASSERT_EQUAL(ACT_UIT, f.stap[1].actie);                // helderheid 0 -> uit
  TEST_ASSERT_EQUAL(ACT_AAN, f.stap[2].actie);                // effect ademen -> aan
  TEST_ASSERT_EQUAL_HEX32(groepBit(2), f.stap[2].groepen);
  TEST_ASSERT_EQUAL(2000u, f.stap[2].wachtMs);
  TEST_ASSERT_EQUAL(ACT_EFFECT, f.stap[3].actie);             // tl blijft
  TEST_ASSERT_EQUAL(FX_TL, f.stap[3].effect);
  TEST_ASSERT_EQUAL(GEDRAG_DRUKKNOP, c.ingang[0].gedrag);
  TEST_ASSERT_EQUAL(SOORT_CONTACT, c.ingang[0].soort);       // oude ingangen: contact (30 ms ontdenderd)
  TEST_ASSERT_EQUAL(STD_VASTHOUD_MS, c.ingang[0].vasthoudMs);
  // opnieuw bewaard (zoals main.cpp doet): versie 2 zonder helderheid, en dat laadt gewoon OK
  std::string nieuw = configNaarJson(c);
  TEST_ASSERT_TRUE(nieuw.find("\"versie\":2") != std::string::npos);
  TEST_ASSERT_TRUE(nieuw.find("helderheid") == std::string::npos);
  TEST_ASSERT_TRUE(nieuw.find("faduur") == std::string::npos);
  TEST_ASSERT_TRUE(nieuw.find("\"max\"") == std::string::npos);
  TEST_ASSERT_EQUAL(Laad::OK, laad(nieuw, m));
  TEST_ASSERT_EQUAL_STRING(nieuw.c_str(), configNaarJson(c).c_str());
  // de oude laatste stand (versie 1, met helderheid en vuur) laadt ook: aan blijft aan
  const char *stand = R"({"versie":1,"groepen":[{"aan":true,"helderheid":35,"effect":"vuur","p1":60,"p2":5,"fase":0},
      {"aan":false,"helderheid":100,"effect":"geen","p1":0,"p2":0,"fase":0}],"dagnacht":{"loopt":false,"pos":0},"functies":[]})";
  Stand st;
  TEST_ASSERT_TRUE(standVanJson(stand, strlen(stand), st));
  TEST_ASSERT_TRUE(st.groep[0].aan);
  TEST_ASSERT_EQUAL(FX_GEEN, st.groep[0].effect);
  TEST_ASSERT_FALSE(st.groep[1].aan);
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
    if (l == Laad::ONGELDIG || l == Laad::HERSTELD) TEST_ASSERT_FALSE(m.empty());
    kijkGrenzen(c);
  }
  TEST_ASSERT_TRUE(ongeldig > 100);
  TEST_ASSERT_TRUE(hersteld > 10);
}


void test_thuisnet_heen_en_terug_en_oud_bestand() {
  Config x;
  standaard(x);
  strcpy(x.inst.thuisSsid, "Thuis");
  strcpy(x.inst.thuisWachtwoord, "geheim123");
  std::string t = configNaarJson(x), m;
  TEST_ASSERT_EQUAL(Laad::OK, laad(t, m));
  TEST_ASSERT_EQUAL_STRING("Thuis", c.inst.thuisSsid);
  TEST_ASSERT_EQUAL_STRING("geheim123", c.inst.thuisWachtwoord);
  // een bestand van firmware 1.0.0 (zonder thuisnet) blijft goed: omgezet, thuisnet uit
  TEST_ASSERT_EQUAL(Laad::OMGEZET, laad(R"({"versie":1,"instellingen":{"faduur":1,"wachtwoord":"treinbaan"}})", m));
  TEST_ASSERT_EQUAL_STRING("", c.inst.thuisSsid);
  // foute waarden: aangepast, nooit buiten de grenzen
  TEST_ASSERT_EQUAL(Laad::HERSTELD, laad(R"({"versie":1,"instellingen":{"thuisnet":{"ssid":42,"wachtwoord":"kort"}}})", m));
  TEST_ASSERT_EQUAL_STRING("", c.inst.thuisSsid);
  TEST_ASSERT_EQUAL_STRING("", c.inst.thuisWachtwoord);
  TEST_ASSERT_EQUAL(Laad::HERSTELD, laad(R"({"versie":1,"instellingen":{"thuisnet":[]}})", m));
  TEST_ASSERT_TRUE(ssidGeldig("") && ssidGeldig("12345678901234567890123456789012"));
  TEST_ASSERT_FALSE(ssidGeldig("123456789012345678901234567890123") || ssidGeldig("a\tb") || ssidGeldig(nullptr));
  TEST_ASSERT_TRUE(thuisWachtwoordGeldig("") && thuisWachtwoordGeldig("12345678"));
  TEST_ASSERT_FALSE(thuisWachtwoordGeldig("1234567"));
}

void test_standaard_knop_alles_aan_uit() {
  Config x;
  standaard(x);
  TEST_ASSERT_EQUAL(GEDRAG_DRUKKNOP, x.ingang[0].gedrag);
  TEST_ASSERT_EQUAL(1, x.ingang[0].functieA);
  TEST_ASSERT_EQUAL(ACT_WISSEL, x.functie[1].stap[0].actie);
  TEST_ASSERT_EQUAL_HEX32(ALLE_GROEPEN, x.functie[1].stap[0].groepen);
  // de knop bewaart en laadt (actie "wissel", alle groepen) zonder herstellen
  std::string m;
  TEST_ASSERT_EQUAL(Laad::OK, laad(configNaarJson(x), m));
  TEST_ASSERT_EQUAL_HEX32(ALLE_GROEPEN, c.functie[1].stap[0].groepen);
  TEST_ASSERT_EQUAL(ACT_WISSEL, c.functie[1].stap[0].actie);
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
  RUN_TEST(test_oude_config_met_helderheid_wordt_omgezet);
  RUN_TEST(test_namen_utf8_en_stuurtekens);
  RUN_TEST(test_wachtwoord);
  RUN_TEST(test_laatste_stand_heen_en_terug);
  RUN_TEST(test_willekeurig_beschadigde_bestanden);
  RUN_TEST(test_thuisnet_heen_en_terug_en_oud_bestand);
  RUN_TEST(test_standaard_knop_alles_aan_uit);
  return UNITY_END();
}
