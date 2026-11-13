// Zet de configurator klaar als map om te publiceren: index.html en js/ met alle modules van de balustrades en de
// modules van de taatsdeuren die ze (onrechtstreeks) gebruiken, in js/taatsdeuren/. De imports '../taatsdeuren/'
// worden './taatsdeuren/'. Gebruik: node bibliotheek/balustrades/maak-web.mjs <doelmap>
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url)), TD = join(HERE, '../taatsdeuren');
const doel = process.argv[2] ?? join(HERE, 'web/uit');
mkdirSync(join(doel, 'js/taatsdeuren'), { recursive: true });
const imports = (tekst) => [...tekst.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]);
const eigen = readdirSync(HERE).filter((f) => f.endsWith('.mjs') && !f.startsWith('maak-'));
const nodig = new Set(['verbinding3d.mjs']);
for (const f of eigen) {
  const t = readFileSync(join(HERE, f), 'utf8');
  for (const i of imports(t)) if (i.startsWith('../taatsdeuren/')) nodig.add(i.slice('../taatsdeuren/'.length));
  writeFileSync(join(doel, 'js', f), t.replaceAll("'../taatsdeuren/", "'./taatsdeuren/"));
}
// de taatsdeuren-modules en hun eigen imports (alleen binnen de map)
const rij = [...nodig];
while (rij.length) {
  const f = rij.pop(), t = readFileSync(join(TD, f), 'utf8');
  for (const i of imports(t)) if (i.startsWith('./') && !nodig.has(i.slice(2))) { nodig.add(i.slice(2)); rij.push(i.slice(2)); }
}
for (const f of nodig) writeFileSync(join(doel, 'js/taatsdeuren', f), readFileSync(join(TD, f), 'utf8'));
writeFileSync(join(doel, 'index.html'), readFileSync(join(HERE, 'web/index.html'), 'utf8'));
console.log(`index.html + ${eigen.length} modules + ${nodig.size} taatsdeuren-modules -> ${doel}`);
