// Zet de configurator "Taatsdeuren op maat" klaar als map om te publiceren: index.html en js/ met alle modules van de
// taatsdeuren en js/werkplaats/werkdoc.mjs (de tabbladen van de werkplaats en het prijsdocument). Ook klant.html: dezelfde
// pagina zonder werkplaats, instellingen en kostprijs. Sinds 2026-11-28 zit de configurator ook in de werkplaats-app
// (bibliotheek/werkplaats/maak-werkplaats.mjs). Gebruik: node bibliotheek/taatsdeuren/maak-web.mjs <doelmap>
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const doel = process.argv[2] ?? join(HERE, 'web/uit');
mkdirSync(join(doel, 'js/werkplaats'), { recursive: true });
const eigen = readdirSync(HERE).filter((f) => f.endsWith('.mjs') && !f.startsWith('maak-'));
for (const f of eigen) writeFileSync(join(doel, 'js', f), readFileSync(join(HERE, f), 'utf8'));
writeFileSync(join(doel, 'js/werkplaats/werkdoc.mjs'), readFileSync(join(HERE, '../werkplaats/werkdoc.mjs'), 'utf8'));
const html = readFileSync(join(HERE, 'web/index.html'), 'utf8');
writeFileSync(join(doel, 'index.html'), html);
writeFileSync(join(doel, 'klant.html'), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><script>document.documentElement.dataset.klant = '1';</script></head><body style="margin:0">\n${html}\n</body></html>`);
console.log(`index.html + klant.html + ${eigen.length} modules + werkplaats/werkdoc.mjs -> ${doel}`);
