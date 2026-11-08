// Tests van het lichthart (include/licht.h) en de dag/nacht-cyclus (include/baan.h) op de pc:
//   python -m platformio test -e native
// Gamma, zachte overgangen, maximum, elk effect (begrensd 0..4095, deterministisch met vaste startwaarde,
// onafhankelijk van hoe vaak er gerekend wordt), overweg om beurten, tl-buis, ademen, dag/nacht-volgorde.
#include <stdlib.h>
#include <unity.h>

#include "baan.h"

using namespace trein;

void setUp() {}
void tearDown() {}

namespace {

GroepStand aanMet(int effect = FX_GEEN, int32_t p1 = -1, int32_t p2 = -1, int helderheid = 100) {
  GroepStand s;
  s.aan = true;
  s.helderheid = (uint8_t)helderheid;
  s.effect = (uint8_t)effect;
  s.p1 = p1 < 0 ? effectInfo(effect).p1Std : p1;
  s.p2 = p2 < 0 ? effectInfo(effect).p2Std : p2;
  return s;
}

} // namespace

void test_gamma_grenzen_en_monotoon() {
  TEST_ASSERT_EQUAL_UINT16(0, gammaUit(0));
  TEST_ASSERT_EQUAL_UINT16(0, gammaUit(-0.5f));
  TEST_ASSERT_EQUAL_UINT16(0, gammaUit(NAN));
  TEST_ASSERT_EQUAL_UINT16(4095, gammaUit(1));
  TEST_ASSERT_EQUAL_UINT16(4095, gammaUit(3));
  uint16_t vorig = 0;
  for (int i = 1; i <= 1000; i++) {
    uint16_t u = gammaUit(i / 1000.f);
    TEST_ASSERT_TRUE(u >= 1);    // alles boven 0 brandt een beetje
    TEST_ASSERT_TRUE(u >= vorig); // nooit terug
    vorig = u;
  }
  // 50 % op de schuif = 4095 x 0,5^2,2 = 891 (half zo fel voor het oog)
  TEST_ASSERT_INT_WITHIN(2, 891, gammaUit(0.5f));
  TEST_ASSERT_INT_WITHIN(2, 4095 * 0.0631f, gammaUit(0.2847f)); // 0,2847^2,2 = 0,0631
}

void test_zachte_overgang_aan_en_uit() {
  Lampen L;
  L.faduurMs = 500;
  L.stap(0);
  L.zet(0, aanMet(), 0);
  float vorig = 0;
  for (uint32_t t = 0; t <= 500; t += 10) {
    L.stap(t);
    TEST_ASSERT_TRUE(L.lamp[0] >= vorig);
    vorig = L.lamp[0];
    if (t == 250) TEST_ASSERT_FLOAT_WITHIN(0.03f, 0.5f, L.lamp[0]);
  }
  TEST_ASSERT_EQUAL_FLOAT(1.f, L.lamp[0]);
  TEST_ASSERT_EQUAL_UINT16(4095, L.uitgang[0]);
  // uit: even zacht naar beneden
  GroepStand s = L.stand[0];
  s.aan = false;
  L.zet(0, s, 500);
  for (uint32_t t = 510; t <= 1000; t += 10) {
    L.stap(t);
    TEST_ASSERT_TRUE(L.lamp[0] <= vorig);
    vorig = L.lamp[0];
    if (t == 750) TEST_ASSERT_FLOAT_WITHIN(0.03f, 0.5f, L.lamp[0]);
  }
  TEST_ASSERT_EQUAL_UINT16(0, L.uitgang[0]);
  // een kleinere stap duurt navenant korter: 0 -> 40 % in 200 ms
  L.zet(0, aanMet(FX_GEEN, -1, -1, 40), 1000);
  L.stap(1100);
  TEST_ASSERT_FLOAT_WITHIN(0.02f, 0.2f, L.lamp[0]);
  L.stap(1200);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.4f, L.lamp[0]);
  L.stap(1300);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.4f, L.lamp[0]);
  TEST_ASSERT_EQUAL_UINT16(gammaUit(0.4f), L.uitgang[0]);
}

void test_faduur_nul_is_meteen() {
  Lampen L;
  L.faduurMs = 0;
  L.stap(0);
  L.zet(3, aanMet(FX_GEEN, -1, -1, 70), 0);
  L.stap(10);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.7f, L.lamp[3]);
}

void test_maximum_per_groep() {
  Lampen L;
  L.faduurMs = 0;
  L.maxPct[5] = 50;
  L.zet(5, aanMet(), 0);
  L.stap(0);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.5f, L.lamp[5]);
  TEST_ASSERT_EQUAL_UINT16(gammaUit(0.5f), L.uitgang[5]);
  // ook bovenop een effect: ademen komt nooit boven het maximum
  L.zet(5, aanMet(FX_ADEMEN, 2, 0), 0);
  uint16_t hoogste = 0;
  for (uint32_t t = 0; t < 4000; t += 10) {
    L.stap(t);
    if (L.uitgang[5] > hoogste) hoogste = L.uitgang[5];
  }
  TEST_ASSERT_TRUE(hoogste <= gammaUit(0.5f));
  TEST_ASSERT_TRUE(hoogste >= gammaUit(0.49f));
}

void test_elk_effect_begrensd_en_deterministisch() {
  // elk effect met standaard-, kleinste en grootste instellingen, op onregelmatige tijden, 2 minuten lang
  for (int e = 1; e < N_EFFECTEN; e++) {
    const EffectInfo &i = effectInfo(e);
    const int32_t keuzes[3][2] = {{i.p1Std, i.p2Std}, {i.p1Min, i.p2Min}, {i.p1Max, i.p2Max}};
    for (auto &k : keuzes) {
      Lampen a(77), b(77);
      Toeval tik;
      tik.zaai(5);
      uint16_t laag = 4095, hoog = 0;
      uint32_t t = 0;
      for (int g = 0; g < N_GROEPEN; g++) {
        a.zet(g, aanMet(e, k[0], k[1], 30 + g * 4), 0);
        b.zet(g, aanMet(e, k[0], k[1], 30 + g * 4), 0);
      }
      while (t < 120000) {
        a.stap(t);
        b.stap(t);
        for (int g = 0; g < N_GROEPEN; g++) {
          TEST_ASSERT_TRUE(a.uitgang[g] <= 4095);
          TEST_ASSERT_EQUAL_UINT16(a.uitgang[g], b.uitgang[g]);
          TEST_ASSERT_TRUE(a.lamp[g] >= 0.f && a.lamp[g] <= 1.f);
        }
        if (t > 1000 && a.uitgang[15] < laag) laag = a.uitgang[15];
        if (t > 1000 && a.uitgang[15] > hoog) hoog = a.uitgang[15];
        t += 1 + tik.onder(25);
      }
      if (e != FX_TL) TEST_ASSERT_TRUE_MESSAGE(laag < hoog, effectInfo(e).id); // het effect beweegt echt (na 1 s)
    }
  }
}

void test_andere_startwaarde_ander_patroon() {
  Lampen a(1), b(2);
  a.faduurMs = b.faduurMs = 0;
  a.zet(0, aanMet(FX_VUUR), 0);
  b.zet(0, aanMet(FX_VUUR), 0);
  int verschil = 0;
  for (uint32_t t = 0; t < 5000; t += 10) {
    a.stap(t);
    b.stap(t);
    if (a.uitgang[0] != b.uitgang[0]) verschil++;
  }
  TEST_ASSERT_TRUE(verschil > 100);
}

void test_effecten_hangen_niet_af_van_hoe_vaak_er_gerekend_wordt() {
  // vuur, tv en lasvlam: elke ms of elke 10 ms rekenen geeft op dezelfde tijden dezelfde waarde
  const int fx[] = {FX_VUUR, FX_TV, FX_LASVLAM, FX_TL, FX_KNIPPEREN, FX_ADEMEN};
  for (int e : fx) {
    Lampen a(9), b(9);
    a.faduurMs = b.faduurMs = 0;
    a.zet(2, aanMet(e), 0);
    b.zet(2, aanMet(e), 0);
    for (uint32_t t = 0; t <= 60000; t++) {
      a.stap(t);
      if (t % 10 == 0) {
        b.stap(t);
        TEST_ASSERT_EQUAL_UINT16_MESSAGE(a.uitgang[2], b.uitgang[2], effectInfo(e).id);
      }
    }
  }
}

void test_knipperen_aan_en_uit_tijd() {
  Lampen L;
  L.faduurMs = 0;
  L.zet(0, aanMet(FX_KNIPPEREN, 300, 700), 1000);
  for (uint32_t t = 1000; t < 6000; t += 10) {
    L.stap(t);
    bool aan = ((t - 1000) % 1000) < 300;
    TEST_ASSERT_EQUAL_UINT16(aan ? 4095 : 0, L.uitgang[0]);
  }
}

void test_overweg_om_beurten() {
  Baan b;
  b.cfg.inst.faduurMs = 0;
  b.toepassen(0);
  // groep 3 om beurten met groep 4 (zoals het dashboard het zet)
  b.zetGroep(2, aanMet(FX_OVERWEG, 500, 4), 0);
  TEST_ASSERT_EQUAL(FX_OVERWEG, b.lampen.stand[3].effect);
  TEST_ASSERT_EQUAL(3, b.lampen.stand[3].p2);
  TEST_ASSERT_TRUE(b.lampen.stand[3].aan);
  int wissels = 0;
  bool vorig = false;
  for (uint32_t t = 0; t < 10000; t += 10) {
    b.tick(t, 0);
    bool a = b.lampen.uitgang[2] > 0, c = b.lampen.uitgang[3] > 0;
    TEST_ASSERT_TRUE(a != c); // altijd precies één van de twee
    if (t > 0 && a != vorig) wissels++;
    vorig = a;
  }
  TEST_ASSERT_EQUAL(19, wissels); // elke 500 ms
  // uitzetten neemt de tweede groep mee
  GroepStand s = b.lampen.stand[2];
  s.aan = false;
  b.zetGroep(2, s, 10000);
  TEST_ASSERT_FALSE(b.lampen.stand[3].aan);
}

void test_tl_buis_springt_aan_en_blijft_branden() {
  Lampen L;
  L.faduurMs = 0;
  L.zet(0, aanMet(FX_TL, 5, 2000), 0);
  int flikkers = 0;
  bool vorig = false;
  for (uint32_t t = 0; t < 2000; t += 5) {
    L.stap(t);
    bool fel = L.lamp[0] > 0.45f;
    if (fel && !vorig) flikkers++;
    vorig = fel;
  }
  TEST_ASSERT_TRUE(flikkers >= 2);
  TEST_ASSERT_TRUE(flikkers <= 6); // 5 flikkers, de laatste gaat over in branden
  for (uint32_t t = 2000; t < 8000; t += 10) {
    L.stap(t);
    TEST_ASSERT_EQUAL_UINT16(4095, L.uitgang[0]);
  }
  // opnieuw aanzetten = opnieuw aanspringen
  GroepStand s = L.stand[0];
  s.aan = false;
  L.zet(0, s, 8000);
  L.stap(8000);
  s.aan = true;
  L.zet(0, s, 8010);
  L.stap(8010);
  TEST_ASSERT_TRUE(L.uitgang[0] < 4095);
}

void test_ademen_laagste_en_hoogste() {
  Lampen L;
  L.faduurMs = 0;
  L.zet(0, aanMet(FX_ADEMEN, 4, 20), 0);
  float laag = 1, hoog = 0;
  for (uint32_t t = 0; t < 8000; t += 10) {
    L.stap(t);
    if (L.lamp[0] < laag) laag = L.lamp[0];
    if (L.lamp[0] > hoog) hoog = L.lamp[0];
  }
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.2f, laag);
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 1.0f, hoog);
}

void test_lasvlam_flitst_in_reeksen_met_pauzes() {
  Lampen L;
  L.faduurMs = 0;
  L.zet(0, aanMet(FX_LASVLAM, 10, 3), 0);
  uint32_t langsteDonker = 0, donkerSinds = 0;
  int flitsen = 0;
  bool vorig = false;
  for (uint32_t t = 0; t < 60000; t += 5) {
    L.stap(t);
    bool aan = L.uitgang[0] > 0;
    if (aan && !vorig) flitsen++;
    if (!aan && vorig) donkerSinds = t;
    if (!aan && t - donkerSinds > langsteDonker) langsteDonker = t - donkerSinds;
    vorig = aan;
  }
  TEST_ASSERT_TRUE(flitsen > 20);
  TEST_ASSERT_TRUE(langsteDonker >= 1500); // pauzes van 0,5 tot 1,5 x 3 s
}

// ------------------------------------------------------------------------------------------------- dag/nacht
namespace {
int aantalAan(const Baan &b, uint16_t m) {
  int n = 0;
  for (int g = 0; g < N_GROEPEN; g++)
    if ((m >> g & 1) && b.lampen.stand[g].aan) n++;
  return n;
}
} // namespace

void test_dagnacht_een_voor_een_aan_en_uit() {
  Baan b;
  b.cfg.inst.dagnachtMin = 2; // 120 s per dag
  const int doen[] = {0, 2, 4, 6, 8};
  uint16_t m = 0;
  for (int g : doen) {
    b.cfg.groep[g].dagnacht = true;
    m |= (uint16_t)(1u << g);
  }
  b.toepassen(0);
  b.zetGroep(1, aanMet(), 0); // groep 2 doet niet mee en blijft aan
  b.dagnachtStart(0, DAG);
  int vorig = 0, aanVolgorde[5], uitVolgorde[5], na = 0, nUit = 0;
  bool was[N_GROEPEN] = {false};
  for (uint32_t t = 0; t < 120000; t += 50) {
    b.tick(t, 0);
    int n = aantalAan(b, m);
    int fase = b.dn.fase(t);
    TEST_ASSERT_TRUE(abs(n - vorig) <= 1); // nooit twee tegelijk
    if (fase == DAG) TEST_ASSERT_EQUAL(0, n);
    if (fase == NACHT) TEST_ASSERT_EQUAL(5, n);
    if (fase == AVOND) TEST_ASSERT_TRUE(n >= vorig);
    if (fase == OCHTEND) TEST_ASSERT_TRUE(n <= vorig);
    for (int g : doen) {
      bool a = b.lampen.stand[g].aan;
      if (a && !was[g] && na < 5) aanVolgorde[na++] = g;
      if (!a && was[g] && nUit < 5) uitVolgorde[nUit++] = g;
      was[g] = a;
    }
    TEST_ASSERT_TRUE(b.lampen.stand[1].aan);
    vorig = n;
  }
  TEST_ASSERT_EQUAL(5, na);
  TEST_ASSERT_EQUAL(5, nUit);
  for (int i = 0; i < 5; i++) TEST_ASSERT_EQUAL(aanVolgorde[i], uitVolgorde[i]); // eerst aan = eerst uit
  // de avond en de ochtend nemen het juiste deel van de cyclus in
  TEST_ASSERT_EQUAL(DAG, b.dn.fase(47000));
  TEST_ASSERT_EQUAL(AVOND, b.dn.fase(49000));
  TEST_ASSERT_EQUAL(NACHT, b.dn.fase(67000));
  TEST_ASSERT_EQUAL(OCHTEND, b.dn.fase(103000));
  TEST_ASSERT_EQUAL(DAG, b.dn.fase(117000));
}

void test_dagnacht_hand_wint_tot_de_volgende_overgang() {
  Baan b;
  b.cfg.inst.dagnachtMin = 2;
  b.cfg.groep[0].dagnacht = true;
  b.toepassen(0);
  b.dagnachtStart(0, NACHT);
  b.tick(0, 0);
  TEST_ASSERT_TRUE(b.lampen.stand[0].aan);
  GroepStand s = b.lampen.stand[0];
  s.aan = false;
  b.zetGroep(0, s, 1000); // met de hand uit in de nacht
  for (uint32_t t = 1000; t < 35000; t += 50) {
    b.tick(t, 0);
    TEST_ASSERT_FALSE(b.lampen.stand[0].aan);
  }
  // de volgende avond gaat hij weer aan
  bool weerAan = false;
  for (uint32_t t = 35000; t < 140000; t += 50) {
    b.tick(t, 0);
    if (b.lampen.stand[0].aan) weerAan = true;
  }
  TEST_ASSERT_TRUE(weerAan);
}

void test_dagnacht_start_bij_avond_en_andere_duur() {
  Baan b;
  b.cfg.inst.dagnachtMin = 10;
  b.cfg.groep[4].dagnacht = true;
  b.toepassen(0);
  b.dagnachtStart(5000, AVOND);
  TEST_ASSERT_EQUAL(AVOND, b.dn.fase(5000));
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.4f, b.dn.positie(5000));
  // de duur aanpassen terwijl hij loopt: de positie in % blijft
  b.cfg.inst.dagnachtMin = 20;
  b.toepassen(5000);
  TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.4f, b.dn.positie(5000));
  TEST_ASSERT_EQUAL_UINT32(20u * 60000u, b.dn.duurMs);
}

void test_millis_loopt_rond() {
  // na 49 dagen loopt millis() over: overgangen en knipperen werken gewoon verder
  Lampen L;
  L.faduurMs = 500;
  uint32_t t0 = 0xFFFFFF00u;
  L.stap(t0);
  L.zet(0, aanMet(FX_KNIPPEREN, 100, 100), t0);
  int aan = 0;
  for (uint32_t i = 0; i < 2000; i += 10) {
    L.stap(t0 + i);
    if (L.uitgang[0] > 0) aan++;
  }
  TEST_ASSERT_TRUE(aan > 60 && aan < 140);
  TEST_ASSERT_TRUE(voorbij(5u, 0xFFFFFFF0u));
  TEST_ASSERT_FALSE(voorbij(0xFFFFFFF0u, 5u));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_gamma_grenzen_en_monotoon);
  RUN_TEST(test_zachte_overgang_aan_en_uit);
  RUN_TEST(test_faduur_nul_is_meteen);
  RUN_TEST(test_maximum_per_groep);
  RUN_TEST(test_elk_effect_begrensd_en_deterministisch);
  RUN_TEST(test_andere_startwaarde_ander_patroon);
  RUN_TEST(test_effecten_hangen_niet_af_van_hoe_vaak_er_gerekend_wordt);
  RUN_TEST(test_knipperen_aan_en_uit_tijd);
  RUN_TEST(test_overweg_om_beurten);
  RUN_TEST(test_tl_buis_springt_aan_en_blijft_branden);
  RUN_TEST(test_ademen_laagste_en_hoogste);
  RUN_TEST(test_lasvlam_flitst_in_reeksen_met_pauzes);
  RUN_TEST(test_dagnacht_een_voor_een_aan_en_uit);
  RUN_TEST(test_dagnacht_hand_wint_tot_de_volgende_overgang);
  RUN_TEST(test_dagnacht_start_bij_avond_en_andere_duur);
  RUN_TEST(test_millis_loopt_rond);
  return UNITY_END();
}
