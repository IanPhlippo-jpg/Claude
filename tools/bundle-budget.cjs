// Bundle budget (QA v0.5.10 F118): the main script of the build (dist/assets/index-*.js) may not grow past the budget.
// It measures what the last build left in dist/, so run it right after `npm run build` (a build:e2e bundle carries the
// test hooks and is a little larger). Sizes in kB of 1000 bytes, as the build prints them.
// Usage: npm run build && node tools/bundle-budget.cjs   (exit 1 over the budget or without a build)
const fs = require('node:fs');
const path = require('node:path');

const BUDGET_KB = 860; // 0.5.10: 849.4 kB; the goal is not to grow
const dir = path.join(__dirname, '..', 'dist', 'assets');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^index-[\w-]+\.js$/.test(f)) : [];
if (!files.length) {
  console.log('bundle budget: no dist/assets/index-*.js; run `npm run build` first');
  process.exit(1);
}
let over = false;
for (const f of files) {
  const kb = fs.statSync(path.join(dir, f)).size / 1000;
  const ok = kb <= BUDGET_KB;
  if (!ok) over = true;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${f}: ${kb.toFixed(2)} kB (budget ${BUDGET_KB} kB, ${(BUDGET_KB - kb).toFixed(2)} kB left)`);
}
process.exit(over ? 1 : 0);
