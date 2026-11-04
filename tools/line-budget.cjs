// Line budget (QA F103): no source module grows into a monolith again. A module may have at most 1000 lines; the few
// that are larger have a cap of their own (a little above their size when the budget came in), to be split before
// they reach it. Tests are not counted.
// Usage: node tools/line-budget.cjs   (exit 1 when a module is over its budget)
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT = 1000;
// the caps are frozen at the size of each module (QA v0.5.1 F134): a module may shrink, never grow, and a cap is
// lowered whenever code moves out (rebuild.ts 3500 -> 3441 in 0.5.4: the fastening features went to
// fasteningBuild.ts; 3398 -> 2280 in 0.5.12: sheet metal, weldments and surfaces went to sheetMetalBuild.ts,
// frameBuild.ts and surfaceBuild.ts, QA 0.5.11 F134). The goal for every module is DEFAULT; the run lists how far each
// one is from it.
const CAPS = {
  'src/core/features/rebuild.ts': 2280,
  'src/app/viewport/Viewport.tsx': 1700,
  'src/app/viewport/tools.ts': 1621,
  'src/app/slices/features.ts': 1597,
  'src/core/document/types.ts': 1591,
  'src/app/store.ts': 1449,
  'src/app/drawing/DrawingSheetView.tsx': 1277,
  'src/ui/icons.tsx': 1022,
};

const root = path.join(__dirname, '..');
const over = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
      const rel = path.relative(root, p).split(path.sep).join('/');
      const lines = fs.readFileSync(p, 'utf8').split('\n').length;
      const cap = CAPS[rel] ?? DEFAULT;
      if (lines > cap) over.push(`${rel}: ${lines} lines (budget ${cap})`);
    }
  }
};
walk(path.join(root, 'src'));
if (over.length) {
  console.log('Over the line budget:\n  ' + over.join('\n  '));
  process.exit(1);
}
console.log('line budget ok');
console.log('above the goal of ' + DEFAULT + ' lines: ' + Object.keys(CAPS).map((f) => `${path.basename(f)} ${fs.readFileSync(path.join(root, f), 'utf8').split('\n').length - DEFAULT}`).join(', '));
