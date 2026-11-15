// Tests van het lezen van een WAV-kop en van het volume (include/kastje.h) op de pc:  python -m platformio test -e native
// Gewone kop, Audacity-kop met LIST-blok, extensible-formaat, stereo, 8-bit, float, te lage of te hoge frequentie,
// gestreamde lengte (0 of 0xFFFFFFFF), afgeknot bestand, oneven blok met opvulbyte, kapotte bestanden (nooit crashen).
#include <unity.h>

#include <string.h>

#include <vector>

#include "kastje.h"

using namespace gk;

void setUp() {}
void tearDown() {}

namespace {
std::vector<uint8_t> metData(std::vector<uint8_t> k, size_t bytes) { k.resize(k.size() + bytes, 0x11); return k; }
/** een blok (id, inhoud) achteraan */
void blok(std::vector<uint8_t> &b, const char *id, size_t len) {
  size_t p = b.size();
  b.resize(p + 8 + len + (len & 1), 0);
  memcpy(&b[p], id, 4);
  for (int j = 0; j < 4; j++) b[p + 4 + j] = (uint8_t)(len >> (8 * j));
}
} // namespace

void test_gewone_kop_16khz() {
  auto b = metData(wavKop(16000, 16000), 32000);
  Wav w = leesWav(b.data(), b.size(), (uint32_t)b.size());
  TEST_ASSERT_TRUE_MESSAGE(w.ok, w.fout);
  TEST_ASSERT_EQUAL_UINT32(16000, w.hz);
  TEST_ASSERT_EQUAL_UINT32(44, w.dataStart);
  TEST_ASSERT_EQUAL_UINT32(32000, w.dataBytes);
  TEST_ASSERT_DOUBLE_WITHIN(1e-9, 1.0, w.seconden());
}

void test_alleen_de_kop_volstaat() {
  auto b = wavKop(22050, 22050 * 3);
  Wav w = leesWav(b.data(), b.size(), 0); // totaal onbekend: de lengte uit de kop
  TEST_ASSERT_TRUE(w.ok);
  TEST_ASSERT_DOUBLE_WITHIN(1e-6, 3.0, w.seconden());
}

void test_audacity_met_list_blok_voor_data() {
  // RIFF, fmt (16), LIST (oneven lengte 27 + opvulbyte), data
  std::vector<uint8_t> b(12);
  memcpy(&b[0], "RIFF", 4); memcpy(&b[8], "WAVE", 4);
  auto k = wavKop(16000, 100);
  b.insert(b.end(), k.begin() + 12, k.begin() + 36); // het fmt-blok
  blok(b, "LIST", 27);
  size_t dataPos = b.size();
  b.insert(b.end(), k.begin() + 36, k.end());
  b.resize(b.size() + 200, 0);
  Wav w = leesWav(b.data(), b.size(), (uint32_t)b.size());
  TEST_ASSERT_TRUE_MESSAGE(w.ok, w.fout);
  TEST_ASSERT_EQUAL_UINT32(dataPos + 8, w.dataStart);
  TEST_ASSERT_EQUAL_UINT32(200, w.dataBytes);
}

void test_extensible_met_pcm_is_goed() {
  std::vector<uint8_t> b(12);
  memcpy(&b[0], "RIFF", 4); memcpy(&b[8], "WAVE", 4);
  size_t p = b.size();
  blok(b, "fmt ", 40);
  uint8_t *f = &b[p + 8];
  f[0] = 0xFE; f[1] = 0xFF; f[2] = 1;           // WAVE_FORMAT_EXTENSIBLE, mono
  f[4] = 0x80; f[5] = 0x3E;                     // 16000 Hz
  f[14] = 16;                                   // 16 bit
  f[24] = 1; f[25] = 0;                         // subformaat PCM
  blok(b, "data", 64);
  Wav w = leesWav(b.data(), b.size(), (uint32_t)b.size());
  TEST_ASSERT_TRUE_MESSAGE(w.ok, w.fout);
  TEST_ASSERT_EQUAL_UINT16(1, w.formaat);
  b[p + 8 + 24] = 3; // float (f is na het groeien van b niet meer geldig)
  TEST_ASSERT_FALSE(leesWav(b.data(), b.size(), (uint32_t)b.size()).ok);
}

void test_stereo_8bit_float_en_frequentie_worden_geweigerd() {
  auto st = metData(wavKop(16000, 10, 2), 40);
  Wav w = leesWav(st.data(), st.size(), (uint32_t)st.size());
  TEST_ASSERT_FALSE(w.ok);
  TEST_ASSERT_NOT_NULL(strstr(w.fout, "mono"));
  auto b8 = metData(wavKop(16000, 10, 1, 8), 10);
  TEST_ASSERT_FALSE(leesWav(b8.data(), b8.size(), (uint32_t)b8.size()).ok);
  auto fl = metData(wavKop(16000, 10, 1, 16, 3), 20);
  TEST_ASSERT_FALSE(leesWav(fl.data(), fl.size(), (uint32_t)fl.size()).ok);
  for (uint32_t hz : {7999u, 22051u, 44100u, 48000u}) {
    auto h = metData(wavKop(hz, 10), 20);
    TEST_ASSERT_FALSE(leesWav(h.data(), h.size(), (uint32_t)h.size()).ok);
  }
  for (uint32_t hz : {8000u, 11025u, 16000u, 22050u}) {
    auto h = metData(wavKop(hz, 10), 20);
    TEST_ASSERT_TRUE(leesWav(h.data(), h.size(), (uint32_t)h.size()).ok);
  }
}

void test_gestreamde_of_te_lange_datalengte_loopt_tot_het_einde() {
  for (uint32_t len : {0u, 0xFFFFFFFFu, 999999u}) {
    auto b = metData(wavKop(16000, 0), 1001);
    for (int j = 0; j < 4; j++) b[40 + j] = (uint8_t)(len >> (8 * j));
    Wav w = leesWav(b.data(), b.size(), (uint32_t)b.size());
    TEST_ASSERT_TRUE(w.ok);
    TEST_ASSERT_EQUAL_UINT32(1000, w.dataBytes); // even gemaakt
  }
}

void test_leeg_of_geen_wav() {
  auto leeg = wavKop(16000, 0);
  TEST_ASSERT_FALSE(leesWav(leeg.data(), leeg.size(), (uint32_t)leeg.size()).ok);
  const char *mp3 = "ID3\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00";
  TEST_ASSERT_FALSE(leesWav((const uint8_t *)mp3, 14, 14).ok);
  TEST_ASSERT_FALSE(leesWav(nullptr, 0, 0).ok);
  // RIFF/WAVE zonder fmt
  std::vector<uint8_t> b(12);
  memcpy(&b[0], "RIFF", 4); memcpy(&b[8], "WAVE", 4);
  blok(b, "data", 10);
  TEST_ASSERT_FALSE(leesWav(b.data(), b.size(), (uint32_t)b.size()).ok);
}

void test_willekeurig_kapotte_koppen_crashen_nooit() {
  uint32_t r = 12345;
  auto rnd = [&]() { r = r * 1103515245u + 12345u; return r >> 8; };
  auto goed = metData(wavKop(16000, 50), 100);
  for (int i = 0; i < 20000; i++) {
    auto b = goed;
    int n = 1 + (int)(rnd() % 6);
    for (int j = 0; j < n; j++) b[rnd() % b.size()] = (uint8_t)rnd();
    size_t lengte = rnd() % (b.size() + 1);
    Wav w = leesWav(b.data(), lengte, (uint32_t)(rnd() % 2 ? lengte : 0));
    if (w.ok) {
      TEST_ASSERT_TRUE(w.hz >= MIN_HZ && w.hz <= MAX_HZ);
      TEST_ASSERT_EQUAL_UINT16(1, w.kanalen);
      TEST_ASSERT_EQUAL_UINT16(16, w.bits);
      TEST_ASSERT_EQUAL_UINT32(0, w.dataBytes & 1);
    } else {
      TEST_ASSERT_TRUE(strlen(w.fout) > 0);
    }
  }
}

void test_volume_kwadratisch_en_begrensd() {
  TEST_ASSERT_EQUAL_UINT16(0, volumeFactor(0));
  TEST_ASSERT_EQUAL_UINT16(32768, volumeFactor(100));
  TEST_ASSERT_EQUAL_UINT16(8192, volumeFactor(50)); // -12 dB
  TEST_ASSERT_EQUAL_UINT16(32768, volumeFactor(150));
  TEST_ASSERT_EQUAL_UINT16(0, volumeFactor(-5));
  for (int v = 1; v <= 100; v++) TEST_ASSERT_TRUE(volumeFactor(v) >= volumeFactor(v - 1));
  TEST_ASSERT_EQUAL(64, samenVolume(80, 80));
  TEST_ASSERT_EQUAL(80, samenVolume(100, 80));
  TEST_ASSERT_EQUAL(0, samenVolume(80, 0));
  TEST_ASSERT_EQUAL(100, samenVolume(200, 100));
}

void test_schaal_en_stereo() {
  TEST_ASSERT_EQUAL_INT16(32767, schaal(32767, 32768));
  TEST_ASSERT_EQUAL_INT16(-32768, schaal(-32768, 32768));
  TEST_ASSERT_EQUAL_INT16(0, schaal(-32768, 0));
  TEST_ASSERT_EQUAL_INT16(1000, schaal(4000, 8192));
  int16_t in[3] = {100, -200, 32767}, uit[6];
  naarStereo(in, 3, uit, volumeFactor(50));
  int16_t verwacht[6] = {25, 25, -50, -50, 8191, 8191};
  TEST_ASSERT_EQUAL_INT16_ARRAY(verwacht, uit, 6);
  // nooit overloop: elke waarde maal elke factor blijft binnen int16 en wordt niet groter
  for (int s = -32768; s <= 32767; s += 97)
    for (int v = 0; v <= 100; v += 7) {
      int16_t y = schaal((int16_t)s, volumeFactor(v));
      TEST_ASSERT_TRUE(y >= -32768 && y <= 32767 && (s >= 0 ? (y >= 0 && y <= s) : (y <= 0 && y >= s)));
    }
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_gewone_kop_16khz);
  RUN_TEST(test_alleen_de_kop_volstaat);
  RUN_TEST(test_audacity_met_list_blok_voor_data);
  RUN_TEST(test_extensible_met_pcm_is_goed);
  RUN_TEST(test_stereo_8bit_float_en_frequentie_worden_geweigerd);
  RUN_TEST(test_gestreamde_of_te_lange_datalengte_loopt_tot_het_einde);
  RUN_TEST(test_leeg_of_geen_wav);
  RUN_TEST(test_willekeurig_kapotte_koppen_crashen_nooit);
  RUN_TEST(test_volume_kwadratisch_en_begrensd);
  RUN_TEST(test_schaal_en_stereo);
  return UNITY_END();
}
