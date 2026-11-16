// IR en de RMT (firmware 2.1.0), zonder hardware: de tijden naar RMT-items omzetten (zenden) en de items van een
// ontvanger terug naar tijden (ontvangen). src/irhw.h geeft alleen nog de items door aan de driver van ESP-IDF.
// Testen: test/test_ir (Fable 5.2, Q1).
//
// Een RMT-item heeft 2 helften (duur 15 bit in tellen, niveau 1 bit), zoals rmt_item32_t van ESP-IDF 4.4 (irhw.h kijkt
// na dat beide even groot zijn). Zenden: tel = 1 µs, een tijd langer dan 32767 µs wordt over meer helften verdeeld.
// Ontvangen: tel = 0,5 µs; een helft met duur 0 is het einde van het frame (de RMT schrijft zo'n eindmarkering als het
// signaal idle_threshold lang niet meer verandert). AANNAME (ESP-IDF 4.4 zegt alleen "The receiver will ignore pulses
// longer than this setting"): het lange niveau zelf staat niet in het frame. Een frame met alleen een lang niveau
// geeft dus 0 tijden; de aanwezigheid wordt dan gezien via het niveau van de pin (NiveauWacht in ir.h, main.cpp).
#pragma once
#include <stddef.h>
#include <stdint.h>

#include "ir.h"

namespace trein {

struct RmtItem {
  uint32_t duration0 : 15;
  uint32_t level0 : 1;
  uint32_t duration1 : 15;
  uint32_t level1 : 1;
};
static_assert(sizeof(RmtItem) == 4, "RmtItem moet 32 bit zijn zoals rmt_item32_t");

/** tijden in µs (aan/uit om beurten, begint met aan; aan = niveau 1) naar items. Geeft het aantal items, of -1 als ze
 *  niet allemaal passen (dan wordt er NIETS gezonden: een half frame is erger dan geen, F5). */
inline int irNaarItems(const uint32_t *us, int n, RmtItem *items, int max) {
  int k = 0;
  RmtItem it = {0, 0, 0, 0};
  bool helft = false; // false: duration0 is aan de beurt
  for (int i = 0; i < n; i++) {
    uint32_t rest = us[i];
    uint32_t niveau = (i % 2 == 0) ? 1 : 0;
    while (rest > 0) {
      uint32_t d = rest > 32767 ? 32767 : rest;
      rest -= d;
      if (!helft) {
        it.duration0 = d;
        it.level0 = niveau;
        helft = true;
      } else {
        if (k >= max) return -1;
        it.duration1 = d;
        it.level1 = niveau;
        items[k++] = it;
        it = RmtItem{0, 0, 0, 0};
        helft = false;
      }
    }
  }
  if (helft) {
    if (k >= max) return -1;
    it.duration1 = 0;
    it.level1 = 0;
    items[k++] = it;
  }
  return k;
}

/** de items van een ontvanger naar duren in ns, aan/uit om beurten, beginnend met aan (actief laag: niveau 0 = licht).
 *  telNs: de duur van één tel. afgekapt = er waren meer dan max tijden (F17). Geeft het aantal tijden (0 = niets, bv.
 *  een frame met alleen een lang niveau, E2). */
inline int itemsNaarNs(const RmtItem *it, size_t aantal, uint32_t *uit, int max, uint32_t telNs, bool &afgekapt) {
  afgekapt = false;
  int n = 0;
  int vorig = -1;
  for (size_t i = 0; i < aantal; i++) {
    for (int h = 0; h < 2; h++) {
      uint32_t d = h ? it[i].duration1 : it[i].duration0;
      int niveau = h ? it[i].level1 : it[i].level0;
      if (d == 0) return n; // eindmarkering
      int aan = niveau == 0;
      if (n == 0 && !aan) continue; // beginnen met aan
      if (aan == vorig && n > 0) {
        uit[n - 1] += d * telNs;
        continue;
      }
      if (n >= max) {
        afgekapt = true;
        return n;
      }
      uit[n++] = d * telNs;
      vorig = aan;
    }
  }
  return n;
}

} // namespace trein
