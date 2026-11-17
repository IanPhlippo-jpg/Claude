// Pure beslissingen van de tv-pagina (firmware 2.2.0), zonder DOM en zonder plan: globalThis.TvLogica (in de browser
// window.TvLogica; in node ook module.exports als het bestand als CommonJS geladen wordt). Tests vanuit de map firmware,
// niets te installeren:  node --test ui/test/*.test.mjs
// ui/maak-tv.py zet dit bestand in ui/tv.html, vóór ui/tv-live.js.
(function (wereld) {
  'use strict';

  const MIN_M = 4; // de grens van 2.1.0 (4 m op het plan), nu het minimum

  /** VN1: hoe ver (px) een getekende bus van een punt mag staan om er "over" te rijden. De getekende plek is een
   *  schatting tussen 2 meetpunten: hoe verder het vorige meetpunt van die bus, hoe onzekerder. De helft van de
   *  afstand van zijn vorige meetpunt tot dit punt, met een minimum van 4 m. vorigPx null = onbekend: 4 m. */
  function busGrensPx(vorigPx, pxm) {
    return Math.max(MIN_M * pxm, vorigPx != null && vorigPx > 0 ? vorigPx / 2 : 0);
  }

  /** VN1 (Fable 5.2, tweede ronde): komt een melding zonder buscode op een gedeelde strook van een bus? Dan alleen
   *  tellen; anders wordt ze een nieuwe auto (die er niet is: een spookauto). Per live bus:
   *    voor      afstand (px) van de getekende bus vooruit tot het punt (null = het punt ligt niet voor hem)
   *    na        afstand (px) van het punt vooruit tot de getekende bus (null = de bus is het punt niet voorbij)
   *    vorig     afstand (px) van het vorige meetpunt van die bus tot dit punt (null = onbekend)
   *    doosHier  volgens de doos rijdt de bus naar dit punt (naar = punt) en de tekening heeft hem op dezelfde baan
   *              vóór het punt: hij is het punt nog niet voorbij
   *  pxm = px per m van het plan. true = een bus (alleen tellen). */
  function busOverPunt(bussen, pxm) {
    return (bussen || []).some(b => {
      if (b.doosHier) return true;
      const grens = busGrensPx(b.vorig, pxm);
      return (b.voor != null && b.voor < grens) || (b.na != null && b.na < grens);
    });
  }

  const api = { MIN_M, busGrensPx, busOverPunt };
  wereld.TvLogica = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
