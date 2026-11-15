// Tests van de namen, de instellingen en de JSON van de API (include/kastje.h) op de pc:  python -m platformio test -e native
// Het aanmelden bij de doos en /info volgen het contract van versie 6 (veldnamen en soorten); de verzoeken /speel,
// /naam, /volume en /wifi; namen van geluiden (klein, .wav, geen /), kastjesnamen (UTF-8), /kastje.json heen en terug,
// kapotte instellingen worden de standaard, de lijst van geluiden blijft op naam gesorteerd.
#include <unity.h>

#include <string.h>

#include <string>
#include <vector>

#include "kastje.h"

using namespace gk;

void setUp() {}
void tearDown() {}

namespace {
std::string naamOf(const std::string &in) { std::string f; return geluidNaam(in, f); }
JsonDocument lees(const std::string &s) {
  JsonDocument d;
  TEST_ASSERT_FALSE(deserializeJson(d, s));
  return d;
}
} // namespace

void test_geluidnaam() {
  TEST_ASSERT_EQUAL_STRING("klok.wav", naamOf("klok.wav").c_str());
  TEST_ASSERT_EQUAL_STRING("klok.wav", naamOf(" Klok.WAV ").c_str());
  TEST_ASSERT_EQUAL_STRING("klok.wav", naamOf("klok").c_str());
  TEST_ASSERT_EQUAL_STRING("station-aankondiging_2.wav", naamOf("Station aankondiging_2.wav").c_str());
  const char *slecht[] = {"", "   ", "../x.wav", "/klok.wav", "a/b.wav", "klok.mp3", ".wav", ".verborgen.wav", "kerk\xC3\xA9.wav", "a..b.wav", "klok\".wav"};
  for (const char *s : slecht) TEST_ASSERT_EQUAL_STRING_MESSAGE("", naamOf(s).c_str(), s);
  std::string lang(36, 'a');
  TEST_ASSERT_EQUAL_STRING((lang + ".wav").c_str(), naamOf(lang).c_str()); // 40 tekens: net goed
  TEST_ASSERT_EQUAL_STRING("", naamOf(lang + "b").c_str());
}

void test_kastjenaam() {
  std::string f;
  TEST_ASSERT_EQUAL_STRING("Kerk", kastjeNaam("  Kerk ", f).c_str());
  TEST_ASSERT_EQUAL_STRING("Caf\xC3\xA9 Op de Hoek", kastjeNaam("Caf\xC3\xA9 Op de Hoek", f).c_str());
  TEST_ASSERT_EQUAL_STRING("", kastjeNaam("", f).c_str());
  TEST_ASSERT_EQUAL_STRING("", kastjeNaam("a\x01" "b", f).c_str());
  TEST_ASSERT_EQUAL_STRING("", kastjeNaam(std::string(33, 'x'), f).c_str());
  TEST_ASSERT_EQUAL(32, (int)kastjeNaam(std::string(32, 'x'), f).size());
}

void test_id_uit_mac() {
  uint8_t mac[6] = {0x24, 0x58, 0x7c, 0xa1, 0xb2, 0x0c};
  TEST_ASSERT_EQUAL_STRING("a1b20c", kastjeId(mac).c_str());
}

void test_ip() {
  const char *goed[] = {"192.168.4.1", "10.0.0.255", "0.0.0.0"};
  for (const char *g : goed) TEST_ASSERT_TRUE_MESSAGE(geldigIp(g), g);
  const char *slecht[] = {"", "192.168.4", "192.168.4.256", "192.168..1", "a.b.c.d", "192.168.4.1.", "1.2.3.4.5"};
  for (const char *s : slecht) TEST_ASSERT_FALSE_MESSAGE(geldigIp(s), s);
}

void test_config_heen_en_terug() {
  Config c;
  c.naam = "Kerk"; c.volume = 35; c.ssid = "Thuis"; c.wachtwoord = "geheim123"; c.doos = "192.168.1.50";
  std::string j = configNaarJson(c);
  Config t;
  TEST_ASSERT_TRUE(configVanJson(j.data(), j.size(), t));
  TEST_ASSERT_EQUAL_STRING(j.c_str(), configNaarJson(t).c_str());
}

void test_config_kapot_of_buiten_bereik_wordt_standaard() {
  Config t;
  std::string kapot = "{\"naam\":\"Kerk\"";
  TEST_ASSERT_FALSE(configVanJson(kapot.data(), kapot.size(), t));
  TEST_ASSERT_EQUAL_STRING(STD_SSID, t.ssid.c_str());
  std::string raar = "{\"naam\":\"\",\"volume\":250,\"ssid\":\"\",\"wachtwoord\":\"kort\",\"doos\":\"x\"}";
  TEST_ASSERT_TRUE(configVanJson(raar.data(), raar.size(), t));
  TEST_ASSERT_EQUAL_STRING("", t.naam.c_str());
  TEST_ASSERT_EQUAL(100, t.volume);
  TEST_ASSERT_EQUAL_STRING(STD_SSID, t.ssid.c_str());
  TEST_ASSERT_EQUAL_STRING(STD_WACHTWOORD, t.wachtwoord.c_str());
  TEST_ASSERT_EQUAL_STRING(STD_DOOS, t.doos.c_str());
  std::string lijst = "[1,2]";
  TEST_ASSERT_FALSE(configVanJson(lijst.data(), lijst.size(), t));
}

void test_speel() {
  Speel s;
  std::string fout;
  std::string a = "{\"geluid\":\"klok.wav\",\"volume\":80}";
  TEST_ASSERT_TRUE(leesSpeel(a.data(), a.size(), s, fout));
  TEST_ASSERT_EQUAL_STRING("klok.wav", s.geluid.c_str());
  TEST_ASSERT_EQUAL(80, s.volume);
  std::string b = "{\"geluid\":\"Klok\"}";
  TEST_ASSERT_TRUE(leesSpeel(b.data(), b.size(), s, fout));
  TEST_ASSERT_EQUAL_STRING("klok.wav", s.geluid.c_str());
  TEST_ASSERT_EQUAL(100, s.volume);
  std::string c = "{\"geluid\":\"klok.wav\",\"volume\":79.6}";
  TEST_ASSERT_TRUE(leesSpeel(c.data(), c.size(), s, fout));
  TEST_ASSERT_EQUAL(80, s.volume);
  const char *slecht[] = {"", "{}", "{\"geluid\":5}", "{\"geluid\":\"x.mp3\"}", "{\"geluid\":\"klok.wav\",\"volume\":101}",
                          "{\"geluid\":\"klok.wav\",\"volume\":-1}", "{\"geluid\":\"klok.wav\",\"volume\":\"hard\"}", "[]", "nee"};
  for (const char *x : slecht) {
    fout.clear();
    TEST_ASSERT_FALSE_MESSAGE(leesSpeel(x, strlen(x), s, fout), x);
    TEST_ASSERT_TRUE(fout.size() > 0);
  }
}

void test_naam_volume_wifi() {
  std::string n, fout;
  std::string a = "{\"naam\":\" Kerk \"}";
  TEST_ASSERT_TRUE(leesNaam(a.data(), a.size(), n, fout));
  TEST_ASSERT_EQUAL_STRING("Kerk", n.c_str());
  std::string b = "{\"naam\":\"\"}";
  TEST_ASSERT_FALSE(leesNaam(b.data(), b.size(), n, fout));
  int v = -1;
  std::string c = "{\"volume\":0}";
  TEST_ASSERT_TRUE(leesVolume(c.data(), c.size(), v, fout));
  TEST_ASSERT_EQUAL(0, v);
  std::string d = "{}";
  TEST_ASSERT_FALSE(leesVolume(d.data(), d.size(), v, fout));
  Config k;
  std::string e = "{\"ssid\":\"Thuis\",\"wachtwoord\":\"abcdefgh\"}";
  TEST_ASSERT_TRUE(leesWifi(e.data(), e.size(), k, fout));
  TEST_ASSERT_EQUAL_STRING("Thuis", k.ssid.c_str());
  TEST_ASSERT_EQUAL_STRING(STD_DOOS, k.doos.c_str());
  std::string f = "{\"ssid\":\"Thuis\",\"wachtwoord\":\"\",\"doos\":\"192.168.1.20\"}";
  TEST_ASSERT_TRUE(leesWifi(f.data(), f.size(), k, fout));
  TEST_ASSERT_EQUAL_STRING("192.168.1.20", k.doos.c_str());
  Config voor = k;
  const char *slecht[] = {"{\"ssid\":\"\"}", "{\"ssid\":\"x\",\"wachtwoord\":\"kort\"}", "{\"ssid\":\"x\",\"doos\":\"1.2.3\"}", "{\"wachtwoord\":\"abcdefgh\"}"};
  for (const char *x : slecht) {
    TEST_ASSERT_FALSE_MESSAGE(leesWifi(x, strlen(x), k, fout), x);
    TEST_ASSERT_EQUAL_STRING(configNaarJson(voor).c_str(), configNaarJson(k).c_str()); // niets half veranderd
  }
}

void test_aanmelden_volgens_het_contract() {
  std::vector<Geluid> g = {{"klok.wav", 4.2149, 134444}, {"trein.wav", 12.06, 385600}};
  std::string tekst = aanmeldJson("a1b2c3", "Kerk", "192.168.4.23", g);
  TEST_ASSERT_TRUE_MESSAGE(tekst.find("\"s\":4.2}") != std::string::npos, tekst.c_str()); // op 0,1 s afgerond
  TEST_ASSERT_TRUE_MESSAGE(tekst.find("\"s\":12.1}") != std::string::npos, tekst.c_str());
  JsonDocument d = lees(tekst);
  TEST_ASSERT_EQUAL_STRING("aanmelden", d["actie"]);
  TEST_ASSERT_EQUAL_STRING("a1b2c3", d["id"]);
  TEST_ASSERT_EQUAL_STRING("Kerk", d["naam"]);
  TEST_ASSERT_EQUAL_STRING("192.168.4.23", d["ip"]);
  TEST_ASSERT_EQUAL_STRING(VERSIE, d["versie"]);
  TEST_ASSERT_EQUAL(2, (int)d["geluiden"].size());
  TEST_ASSERT_EQUAL_STRING("klok.wav", d["geluiden"][0]["naam"]);
  TEST_ASSERT_DOUBLE_WITHIN(1e-5, 4.2, d["geluiden"][0]["s"].as<double>());
  TEST_ASSERT_DOUBLE_WITHIN(1e-5, 12.1, d["geluiden"][1]["s"].as<double>());
  TEST_ASSERT_TRUE(d["geluiden"][0]["bytes"].isNull()); // de doos heeft alleen naam en s nodig
  JsonDocument e = lees(aanmeldJson("a1b2c3", "Kerk", "192.168.4.23", {}));
  TEST_ASSERT_TRUE(e["geluiden"].is<JsonArray>()); // leeg: een lege lijst, geen null
}

void test_info_volgens_het_contract() {
  Status st;
  st.id = "a1b2c3"; st.naam = "Kerk"; st.ip = "192.168.4.23"; st.vrij = 1234567; st.totaal = 2490368; st.ssid = "Treinbaan"; st.verbonden = true;
  std::vector<Geluid> g = {{"klok.wav", 4.2, 134444}};
  JsonDocument d = lees(infoJson(st, g));
  TEST_ASSERT_TRUE(d["ok"]);
  TEST_ASSERT_EQUAL_STRING("a1b2c3", d["id"]);
  TEST_ASSERT_EQUAL_STRING("Kerk", d["naam"]);
  TEST_ASSERT_EQUAL_UINT32(1234567, d["vrij"].as<uint32_t>());
  TEST_ASSERT_EQUAL_STRING(VERSIE, d["versie"]);
  TEST_ASSERT_EQUAL_STRING("klok.wav", d["geluiden"][0]["naam"]);
  TEST_ASSERT_EQUAL_UINT32(134444, d["geluiden"][0]["bytes"].as<uint32_t>());
  TEST_ASSERT_TRUE(d["speelt"].isNull());
  st.speelt = "klok.wav";
  JsonDocument e = lees(infoJson(st, g));
  TEST_ASSERT_EQUAL_STRING("klok.wav", e["speelt"]);
  TEST_ASSERT_TRUE(e["wifi"]["verbonden"]);
}

void test_fout_json_met_aanhalingstekens() {
  JsonDocument d = lees(foutJson("Geluid \"x\" bestaat niet."));
  TEST_ASSERT_FALSE(d["ok"]);
  TEST_ASSERT_EQUAL_STRING("Geluid \"x\" bestaat niet.", d["fout"]);
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true}", okJson().c_str());
}

void test_lijst_gesorteerd() {
  std::vector<Geluid> g;
  zetGeluid(g, {"trein.wav", 1, 1});
  zetGeluid(g, {"bel.wav", 1, 1});
  zetGeluid(g, {"klok.wav", 1, 1});
  zetGeluid(g, {"bel.wav", 2, 2}); // vervangen, niet dubbel
  TEST_ASSERT_EQUAL(3, (int)g.size());
  TEST_ASSERT_EQUAL_STRING("bel.wav", g[0].naam.c_str());
  TEST_ASSERT_EQUAL_DOUBLE(2, g[0].s);
  TEST_ASSERT_EQUAL_STRING("klok.wav", g[1].naam.c_str());
  TEST_ASSERT_TRUE(wisGeluid(g, "klok.wav"));
  TEST_ASSERT_FALSE(wisGeluid(g, "klok.wav"));
  TEST_ASSERT_EQUAL(-1, zoek(g, "klok.wav"));
  TEST_ASSERT_EQUAL(1, zoek(g, "trein.wav"));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_geluidnaam);
  RUN_TEST(test_kastjenaam);
  RUN_TEST(test_id_uit_mac);
  RUN_TEST(test_ip);
  RUN_TEST(test_config_heen_en_terug);
  RUN_TEST(test_config_kapot_of_buiten_bereik_wordt_standaard);
  RUN_TEST(test_speel);
  RUN_TEST(test_naam_volume_wifi);
  RUN_TEST(test_aanmelden_volgens_het_contract);
  RUN_TEST(test_info_volgens_het_contract);
  RUN_TEST(test_fout_json_met_aanhalingstekens);
  RUN_TEST(test_lijst_gesorteerd);
  return UNITY_END();
}
