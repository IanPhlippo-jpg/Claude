// Line budget (QA F103): no source module grows into a monolith again. A module may have at most 1000 lines; the few
// that are larger have a cap of their own (a little above their size when the budget came in), to be split before
// they reach it. Tests are not counted.
// Usage: node tools/line-budget.cjs   (exit 1 when a module is over its budget)
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT = 1000;
const CAPS = {
  'src/core/features/rebuild.ts': 3500,
  'src/app/viewport/Viewport.tsx': 1700,
  'src/app/viewport/tools.ts': 1650,
  'src/app/slices/features.ts': 1600,
  'src/core/document/types.ts': 1600,
  'src/app/store.ts': 1450,
  'src/app/drawing/DrawingSheetView.tsx': 1300,
  'src/ui/icons.tsx': 1100,
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
