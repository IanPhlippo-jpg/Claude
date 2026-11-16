// Zet de catalogus klaar als map om te publiceren: index.html en js/ met alle modules van de fitnesstoestellen en de
// modules van de balustrades en de taatsdeuren die ze (onrechtstreeks) gebruiken, in js/balustrades/ en js/taatsdeuren/.
// De imports '../balustrades/' en '../taatsdeuren/' worden './balustrades/' en './taatsdeuren/'.
// Gebruik: node bibliotheek/fitness/maak-web.mjs <doelmap>
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), BIB = join(HERE, '..');
const doel = process.argv[2] ?? join(HERE, 'web/uit');
const imports = (tekst) => [...tekst.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]).filter((i) => i.startsWith('.'));
const eigen = readdirSync(HERE).filter((f) => f.endsWith('.mjs') && !f.startsWith('maak-'));
// rij van te kopiëren bestanden: pad relatief tot bibliotheek/ ('fitness/x.mjs', 'balustrades/y.mjs', 'taatsdeuren/z.mjs')
const rij = [...eigen.map((f) => `fitness/${f}`), 'taatsdeuren/verbinding3d.mjs'], gezien = new Set(rij);
let bytes = 0;
mkdirSync(join(doel, 'js'), { recursive: true });
while (rij.length) {
  const rel = rij.pop(), t = readFileSync(join(BIB, rel), 'utf8');
  for (const i of imports(t)) { const r = posix.normalize(posix.join(posix.dirname(rel), i)); if (!gezien.has(r)) { gezien.add(r); rij.push(r); } }
  const uit = rel.startsWith('fitness/') ? join(doel, 'js', rel.slice(8)) : join(doel, 'js', rel);
  mkdirSync(dirname(uit), { recursive: true });
  const inhoud = rel.startsWith('fitness/') ? t.replaceAll("'../balustrades/", "'./balustrades/").replaceAll("'../taatsdeuren/", "'./taatsdeuren/") : t;
  writeFileSync(uit, inhoud); bytes += Buffer.byteLength(inhoud);
}
const html = readFileSync(join(HERE, 'web/index.html'), 'utf8');
writeFileSync(join(doel, 'index.html'), html); bytes += Buffer.byteLength(html);
// klantversie (P2-26 v6): dezelfde pagina zonder werkplaats, instellingen, kostprijs en marktband
const klant = `<script>document.documentElement.dataset.klant = '1';</script>\n${html}`;
writeFileSync(join(doel, 'klant.html'), klant); bytes += Buffer.byteLength(klant);
const per = [...gezien].reduce((m, r) => { const k = r.split('/')[0]; m[k] = (m[k] ?? 0) + 1; return m; }, {});
console.log(`index.html + ${Object.entries(per).map(([k, n]) => `${n} ${k}`).join(' + ')} modules, ${Math.round(bytes / 1024)} kB -> ${doel}`);
void statSync;
