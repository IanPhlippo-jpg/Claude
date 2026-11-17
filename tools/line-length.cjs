// Line length and character budget (QA 0.5.14 P2-14): the line budget (tools/line-budget.cjs) counts lines, so a
// module could stay under its cap by packing more code on each line. Two checks close that:
//   long lines   a source line longer than LIMIT characters is frozen per module at the count of the baseline
//                (tools/line-length-baseline.json): a module may lose long lines, never gain them; a module that is not
//                in the baseline (a new file) may have none
//   characters   a module may hold at most CHARS_PER_LINE characters per line of its line cap (1000 lines -> 75,000
//                characters; the capped modules get their cap x CHARS_PER_LINE)
// and, for information only, it lists the longest functions (over FUNCTION_LINES lines) as candidates for a split.
// Tests are not counted (as in the line budget).
//
// Usage: node tools/line-length.cjs                    check (exit 1 when a module is over a budget)
//        node tools/line-length.cjs --update-baseline  write today's long-line counts into the baseline (at a release,
//                                                      after review: a raised count in the diff needs a reason)
//        node tools/line-length.cjs --functions        the full list of long functions
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT, CAPS } = require('./line-budget.cjs');

const LIMIT = 200;
const CHARS_PER_LINE = 75;
const FUNCTION_LINES = 150;
const root = path.join(__dirname, '..');
const baselineFile = path.join(__dirname, 'line-length-baseline.json');
const args = process.argv.slice(2);

/** every non-test TypeScript module below src/, as [relative path, text] */
function modules() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push([path.relative(root, p).split(path.sep).join('/'), fs.readFileSync(p, 'utf8')]);
    }
  };
  walk(path.join(root, 'src'));
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

const lines = (text) => text.split('\n').map((l) => l.replace(/\r$/, ''));
const longLines = (text) => lines(text).filter((l) => l.length > LIMIT).length;
const charCap = (rel) => (CAPS[rel] ?? DEFAULT) * CHARS_PER_LINE;

/** functions longer than FUNCTION_LINES lines (TypeScript's parser; information only, never fails the check) */
function longFunctions(mods) {
  let ts;
  try { ts = require('typescript'); } catch { return null; }
  const found = [];
  for (const [rel, text] of mods) {
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isFunctionLike(node) && node.body) {
        const a = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
        const b = sf.getLineAndCharacterOfPosition(node.end).line;
        if (b - a + 1 > FUNCTION_LINES) {
          const owner = node.name ?? (ts.isVariableDeclaration(node.parent) ? node.parent.name : undefined);
          found.push({ where: `${rel}:${a + 1}`, name: owner ? owner.getText(sf) : '(anonymous)', lines: b - a + 1 });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found.sort((x, y) => y.lines - x.lines);
}

const mods = modules();
if (args.includes('--update-baseline')) {
  const files = {};
  for (const [rel, text] of mods) {
    const n = longLines(text);
    if (n) files[rel] = n;
  }
  const total = Object.values(files).reduce((a, b) => a + b, 0);
  fs.writeFileSync(baselineFile, JSON.stringify({ limit: LIMIT, total, files }, null, 2) + '\n');
  console.log(`baseline written: ${total} lines over ${LIMIT} characters in ${Object.keys(files).length} modules (${path.relative(root, baselineFile)})`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
if (baseline.limit !== LIMIT) {
  console.log(`the baseline was made for a limit of ${baseline.limit} characters, this check uses ${LIMIT}: run node tools/line-length.cjs --update-baseline`);
  process.exit(1);
}
const over = [];
let total = 0;
let shrunk = 0;
for (const [rel, text] of mods) {
  const n = longLines(text);
  total += n;
  const allowed = baseline.files[rel] ?? 0;
  if (n > allowed) over.push(`${rel}: ${n} lines over ${LIMIT} characters (baseline ${allowed}${rel in baseline.files ? '' : ', a new module may have none'})`);
  else if (n < allowed) shrunk++;
  const cap = charCap(rel);
  if (text.length > cap) over.push(`${rel}: ${text.length} characters (budget ${cap} = ${CAPS[rel] ?? DEFAULT} lines x ${CHARS_PER_LINE})`);
}
if (over.length) {
  console.log('Over the line-length or character budget:\n  ' + over.join('\n  '));
  console.log(`Split the long lines (or the module); the baseline only goes down. After a review at a release:\n  node tools/line-length.cjs --update-baseline`);
  process.exit(1);
}
console.log(`line length ok: ${total} lines over ${LIMIT} characters (baseline ${baseline.total})${shrunk ? `, ${shrunk} modules below their baseline (--update-baseline lowers it)` : ''}`);
const fns = longFunctions(mods);
if (fns) {
  const shown = args.includes('--functions') ? fns : fns.slice(0, 10);
  console.log(`functions over ${FUNCTION_LINES} lines: ${fns.length} (information, the longest first)`);
  for (const f of shown) console.log(`  ${f.lines} lines  ${f.name}  ${f.where}`);
}
