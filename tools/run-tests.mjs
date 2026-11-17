// Runs one heavy test group of tools/test-groups.json (QA 0.5.14 P2-11): the files `npm test` leaves out.
//   node tools/run-tests.mjs voorbeelden [vitest args]   the example models (npm run test:voorbeelden)
//   node tools/run-tests.mjs bibliotheek [vitest args]   the door, balustrade and fitness libraries (npm run test:bibliotheek)
// VOORBEELDEN=1 lifts the exclusion in vite.config.ts and switches on the heavy parts inside the files; FITNESS_VOLLEDIG=1
// runs every fitness machine instead of the sample.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const groups = JSON.parse(readFileSync(new URL('./test-groups.json', import.meta.url), 'utf8'));
const names = Object.keys(groups).filter((k) => !k.startsWith('_'));
const [group, ...rest] = process.argv.slice(2);
if (!names.includes(group)) {
  console.error(`usage: node tools/run-tests.mjs <${names.join('|')}> [vitest args]`);
  process.exit(2);
}
const vitest = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));
const r = spawnSync(process.execPath, [vitest, 'run', ...groups[group], ...rest], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, VOORBEELDEN: '1', FITNESS_VOLLEDIG: process.env.FITNESS_VOLLEDIG ?? '1' },
});
process.exit(r.status ?? 1);
