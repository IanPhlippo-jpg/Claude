// Tests van ui/tv-logica.js (firmware 2.2.0) met de ingebouwde testloper van node (niets te installeren):
//   node --test ui/test/*.test.mjs        (vanuit de map firmware)
// VN1 (Fable 5.2, tweede ronde): een melding zonder buscode op een gedeelde strook. Rijdt er een bus over het punt, dan
// alleen tellen; anders een nieuwe auto. In 2.1.0 gold een vaste grens van 4 m rond de GETEKENDE bus; die staat tussen
// 2 meetpunten op een schatting en zit er makkelijk 100 tot 200 mm (op de baan, 1:87: 9 tot 17 m) naast.
import test from 'node:test';
import assert from 'node:assert';
import '../tv-logica.js'; // zet globalThis.TvLogica (zoals in de browser)
const { busOverPunt, busGrensPx, MIN_M } = globalThis.TvLogica;

const PXM = 5; // het plan: 5 px per m

/** de regel van 2.1.0 (busOver in tv-live.js): alleen binnen 4 m van de getekende bus */
const oud = (bussen, pxm) => bussen.some(b => (b.voor != null && b.voor < 4 * pxm) || (b.na != null && b.na < 4 * pxm));

test('de grens: de helft van de afstand tot het vorige meetpunt, minimum 4 m', () => {
  assert.strictEqual(MIN_M, 4);
  assert.strictEqual(busGrensPx(null, PXM), 20);
  assert.strictEqual(busGrensPx(10, PXM), 20);   // dicht bij het vorige meetpunt: 4 m
  assert.strictEqual(busGrensPx(200, PXM), 100); // 40 m verder: 20 m onzekerheid
});

test('de getekende bus hinkt 12 m achter (de echte reed al over het punt): geen spookauto', () => {
  // de bus werd 40 m voor dit punt gemeten; getekend staat hij nog 60 px (12 m) voor het punt
  const bussen = [{ voor: 60, na: null, vorig: 200, doosHier: false }];
  assert.strictEqual(busOverPunt(bussen, PXM), true);
  // negatieve proef: met de vaste grens van 4 m (2.1.0) wordt dit een nieuwe auto achter de bus
  assert.strictEqual(oud(bussen, PXM), false);
});

test('de getekende bus loopt 9 m voor (de echte komt nu pas over het punt): geen spookauto', () => {
  const bussen = [{ voor: null, na: 45, vorig: 160, doosHier: false }];
  assert.strictEqual(busOverPunt(bussen, PXM), true);
  assert.strictEqual(oud(bussen, PXM), false);
});

test('volgens de doos is de bus dit punt nog niet voorbij: alleen tellen, ook buiten de grens', () => {
  const bussen = [{ voor: 150, na: null, vorig: 160, doosHier: true }];
  assert.strictEqual(busOverPunt(bussen, PXM), true);
  assert.strictEqual(oud(bussen, PXM), false);
  assert.strictEqual(busOverPunt([Object.assign({}, bussen[0], { doosHier: false })], PXM), false);
});

test('een echte auto: geen bus in de buurt, wel een nieuwe auto', () => {
  assert.strictEqual(busOverPunt([], PXM), false);
  assert.strictEqual(busOverPunt([{ voor: 300, na: null, vorig: 200, doosHier: false }], PXM), false); // 60 m ervoor
  assert.strictEqual(busOverPunt([{ voor: null, na: 150, vorig: 200, doosHier: false }], PXM), false); // al 30 m voorbij
  assert.strictEqual(busOverPunt([{ voor: null, na: null, vorig: null, doosHier: false }], PXM), false); // andere baan
});

test('het minimum van 4 m blijft (dicht bij het vorige meetpunt, of onbekend)', () => {
  assert.strictEqual(busOverPunt([{ voor: 15, na: null, vorig: 10 }], PXM), true);
  assert.strictEqual(busOverPunt([{ voor: 25, na: null, vorig: 10 }], PXM), false);
  assert.strictEqual(busOverPunt([{ voor: 19, na: null, vorig: null }], PXM), true);
});

test('meerdere bussen: één die over het punt rijdt is genoeg', () => {
  const bussen = [{ voor: 400, na: null, vorig: 100 }, { voor: null, na: 30, vorig: 120 }];
  assert.strictEqual(busOverPunt(bussen, PXM), true);
});
