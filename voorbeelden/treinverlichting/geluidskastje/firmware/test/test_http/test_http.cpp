// Tests van de kleine HTTP-server (include/http.h) op de pc:  python -m platformio test -e native
// Verzoekregel met query (URL-gecodeerd), kopregels (hoofdletters, Content-Length, multipart-grens, Expect), de
// antwoordkop met CORS, en een upload in multipart/form-data die in willekeurige stukken binnenkomt.
#include <unity.h>

#include <string.h>

#include <string>
#include <vector>

#include "http.h"

using namespace gk;

void setUp() {}
void tearDown() {}

void test_verzoekregel_met_query() {
  Verzoek v;
  TEST_ASSERT_TRUE(leesVerzoekRegel("POST /geluid?naam=klok.wav HTTP/1.1", v));
  TEST_ASSERT_EQUAL_STRING("POST", v.methode.c_str());
  TEST_ASSERT_EQUAL_STRING("/geluid", v.pad.c_str());
  TEST_ASSERT_EQUAL_STRING("klok.wav", v.arg("naam").c_str());
  TEST_ASSERT_TRUE(v.heeft("naam"));
  TEST_ASSERT_FALSE(v.heeft("x"));
  Verzoek w;
  TEST_ASSERT_TRUE(leesVerzoekRegel("DELETE /geluid?naam=station%20aankondiging.wav&x=1+2&leeg HTTP/1.1", w));
  TEST_ASSERT_EQUAL_STRING("station aankondiging.wav", w.arg("naam").c_str());
  TEST_ASSERT_EQUAL_STRING("1 2", w.arg("x").c_str());
  TEST_ASSERT_TRUE(w.heeft("leeg"));
  Verzoek z;
  TEST_ASSERT_TRUE(leesVerzoekRegel("GET /info HTTP/1.0", z));
  TEST_ASSERT_EQUAL_STRING("/info", z.pad.c_str());
  TEST_ASSERT_EQUAL(0, (int)z.args.size());
}

void test_geen_http() {
  const char *slecht[] = {"", "GET", "GET /info", "GET info HTTP/1.1", " /info HTTP/1.1", "GET /info FTP/1.0", "\x16\x03\x01"};
  for (const char *s : slecht) { Verzoek v; TEST_ASSERT_FALSE_MESSAGE(leesVerzoekRegel(s, v), s); }
}

void test_url_decode() {
  TEST_ASSERT_EQUAL_STRING("a b/c", urlDecode("a+b%2Fc").c_str());
  TEST_ASSERT_EQUAL_STRING("100%", urlDecode("100%").c_str());
  TEST_ASSERT_EQUAL_STRING("%zz", urlDecode("%zz").c_str());
  TEST_ASSERT_EQUAL_STRING("caf\xC3\xA9", urlDecode("caf%C3%A9").c_str());
}

void test_kopregels() {
  Verzoek v;
  TEST_ASSERT_TRUE(leesKopRegel("content-length: 123456", v));
  TEST_ASSERT_TRUE(v.heeftLengte);
  TEST_ASSERT_EQUAL(123456, (int)v.lengte);
  TEST_ASSERT_TRUE(leesKopRegel("Content-Type: audio/wav", v));
  TEST_ASSERT_EQUAL_STRING("audio/wav", v.type.c_str());
  TEST_ASSERT_EQUAL_STRING("", v.grens.c_str());
  TEST_ASSERT_TRUE(leesKopRegel("Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryAbC123", v));
  TEST_ASSERT_EQUAL_STRING("----WebKitFormBoundaryAbC123", v.grens.c_str());
  Verzoek q;
  TEST_ASSERT_TRUE(leesKopRegel("Content-Type: multipart/form-data; boundary=\"abc\"; charset=x", q));
  TEST_ASSERT_EQUAL_STRING("abc", q.grens.c_str());
  TEST_ASSERT_TRUE(leesKopRegel("Expect: 100-continue", q));
  TEST_ASSERT_TRUE(q.doorgaan);
  TEST_ASSERT_TRUE(leesKopRegel("X-Iets: 1", q));
  TEST_ASSERT_TRUE(leesKopRegel("geen dubbele punt", q));
  Verzoek r;
  TEST_ASSERT_FALSE(leesKopRegel("Content-Length: -5", r));
  TEST_ASSERT_FALSE(leesKopRegel("Content-Length: 12a", r));
  TEST_ASSERT_FALSE(leesKopRegel("Content-Length: 99999999999", r));
}

void test_antwoordkop_met_cors() {
  std::string k = antwoordKop(400, "application/json", 42);
  TEST_ASSERT_EQUAL(0, (int)k.find("HTTP/1.1 400 Bad Request\r\n"));
  TEST_ASSERT_TRUE(k.find("Access-Control-Allow-Origin: *\r\n") != std::string::npos);
  TEST_ASSERT_TRUE(k.find("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\n") != std::string::npos);
  TEST_ASSERT_TRUE(k.find("Content-Length: 42\r\n") != std::string::npos);
  TEST_ASSERT_EQUAL(k.size() - 4, k.find("\r\n\r\n"));
}

namespace {
/** een FormData zoals een browser hem stuurt, in stukken van willekeurige grootte door de filter */
std::string doorFilter(const std::string &grens, const std::string &body, uint32_t zaad, std::string &naam, bool &ok) {
  MultipartFilter f(grens, body.size());
  std::string uit;
  size_t p = 0;
  uint32_t r = zaad;
  ok = true;
  while (p < body.size()) {
    r = r * 1103515245u + 12345u;
    size_t n = 1 + (r >> 8) % 700;
    if (p + n > body.size()) n = body.size() - p;
    size_t b, l;
    if (!f.voeg((const uint8_t *)body.data() + p, n, b, l)) { ok = false; return uit; }
    uit.append(body, p + b, l);
    p += n;
  }
  naam = f.bestandsnaam();
  return uit;
}
} // namespace

void test_multipart_upload_in_stukken() {
  std::string grens = "----WebKitFormBoundaryQ1w2E3r4", inhoud;
  for (int i = 0; i < 5000; i++) inhoud += (char)(i * 7 + (i >> 3)); // binair, met nulbytes en \r\n erin
  inhoud += "\r\n--" + grens; // lijkt op het einde, maar is inhoud
  std::string body = "--" + grens + "\r\nContent-Disposition: form-data; name=\"bestand\"; filename=\"klok.wav\"\r\nContent-Type: audio/wav\r\n\r\n" + inhoud + "\r\n--" + grens + "--\r\n";
  for (uint32_t z = 1; z < 60; z++) {
    std::string naam;
    bool ok;
    std::string uit = doorFilter(grens, body, z, naam, ok);
    TEST_ASSERT_TRUE(ok);
    TEST_ASSERT_EQUAL(inhoud.size(), uit.size());
    TEST_ASSERT_TRUE(uit == inhoud);
    TEST_ASSERT_EQUAL_STRING("klok.wav", naam.c_str());
  }
}

void test_multipart_kapotte_kop() {
  std::string naam;
  bool ok;
  doorFilter("abc", "--xyz\r\n\r\ninhoud\r\n--abc--\r\n", 7, naam, ok);
  TEST_ASSERT_FALSE(ok); // andere grens
  doorFilter("abc", std::string(5000, 'x'), 7, naam, ok);
  TEST_ASSERT_FALSE(ok); // nooit een lege regel
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_verzoekregel_met_query);
  RUN_TEST(test_geen_http);
  RUN_TEST(test_url_decode);
  RUN_TEST(test_kopregels);
  RUN_TEST(test_antwoordkop_met_cors);
  RUN_TEST(test_multipart_upload_in_stukken);
  RUN_TEST(test_multipart_kapotte_kop);
  return UNITY_END();
}
