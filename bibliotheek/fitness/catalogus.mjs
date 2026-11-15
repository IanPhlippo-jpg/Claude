// De catalogus: alle toestellen van de vier soorten, en toestel(id, versie) dat het model bouwt (met cache).
// Node en browser.
import { VERSIE } from './onderdelen.mjs';
import { bouwer, afwerken } from './model.mjs';
import { REKKEN } from './rekken.mjs';
import { BANKEN } from './banken.mjs';
import { KABEL } from './kabel.mjs';
import { PLATE } from './plate.mjs';

export const TOESTELLEN = [...REKKEN, ...BANKEN, ...KABEL, ...PLATE];
export const PER_ID = Object.fromEntries(TOESTELLEN.map((t) => [t.id, t]));
const cache = new Map();
/** het model van een toestel in een versie ('thuis' of 'pro') */
export function toestel(id, versie = 'thuis') {
  const key = `${id}|${versie}`;
  if (cache.has(key)) return cache.get(key);
  const def = PER_ID[id];
  if (!def) throw new Error(`onbekend toestel ${id}`);
  const V = VERSIE[versie], b = bouwer(V);
  def.bouw.call(def, b, V);
  const o = afwerken(b.o);
  o.def = def; o.id = id; o.versie = versie; o.naam = def.naam; o.maxLast = def.maxLast?.[versie] ?? 0;
  cache.set(key, o);
  return o;
}
export const leegCache = () => cache.clear();
