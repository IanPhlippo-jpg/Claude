// Renames trademarked SOLIDWORKS product names in user-visible text: string literals, template text and JSX text.
// Comments, identifiers and import paths stay. Usage: node tools/rename-trademarks.cjs [--apply]
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const APPLY = process.argv.includes('--apply');
const MAP = [
  ['FeatureManager design tree', 'Feature Tree'], ['FeatureManager Design Tree', 'Feature Tree'], ['DimXpertManager', 'Tolerance Tree'],
  ['FeatureManager', 'Feature Tree'], ['PropertyManager', 'Property Panel'], ['CommandManager', 'Command Ribbon'],
  ['ConfigurationManager', 'Configurations'], ['DisplayManager', 'Display Panel'], ['MotionManager', 'Motion Timeline'],
  ['TolAnalyst', 'Tolerance Stack-up'], ['SimulationXpress', 'Quick Beam Estimate'], ['FeatureXpert', 'Auto-Fix Fillets'],
  ['DraftXpert', 'Auto-Fix Draft'], ['DimXpert', 'Auto Tolerancing'], ['Instant3D', 'Drag Handles'], ['Instant2D', 'Drag Dimensions'],
  ['RealView Graphics', 'Realistic Shading'], ['RealView', 'Realistic Shading'], ['SpeedPak', 'Lightweight Subassembly'], ['eDrawings', 'Phlippo Viewer'],
  // QA v0.3.4 F50: the remaining program-specific names
  ['Hole Wizard', 'Hole Tool'], ['Stud Wizard', 'Stud Tool'], ['Smart Fasteners', 'Auto Fasteners'], ['Smart Fastener', 'Auto Fastener'], ['Design Library', 'Part Library'],
  ['Lifecycle and Collaboration', 'Share'], ['Toolbox', 'Standard Parts'],
  // QA v0.3.4 F77: phrases the first rename left broken
  ['Feature Tree Tree Area', 'Feature Tree Area'], ['Feature Tree tree area', 'Feature Tree area'], ['Feature Tree tree', 'Feature Tree'],
  ['a Auto Tolerancing', 'an Auto Tolerancing'], ['A Auto Tolerancing', 'An Auto Tolerancing'],
];
const RE = new RegExp(MAP.map(([a]) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
const TO = Object.fromEntries(MAP);
const ROOT = path.join(__dirname, '..');
let total = 0;
function edits(text, start, end) {
  const out = [];
  RE.lastIndex = 0;
  const seg = text.slice(start, end);
  let m;
  while ((m = RE.exec(seg))) {
    const s = start + m.index, e = s + m[0].length;
    if (/[A-Za-z0-9_]/.test(text[s - 1] ?? '') || /[A-Za-z0-9_]/.test(text[e] ?? '')) continue;
    out.push([s, e, m[0]]);
  }
  return out;
}
function processFile(file, whole) {
  const text = fs.readFileSync(file, 'utf8');
  let list = [];
  if (whole) list = edits(text, 0, text.length);
  else {
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      const k = node.kind;
      const isImport = node.parent && (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent) || (ts.isCallExpression(node.parent) && node.parent.expression.kind === ts.SyntaxKind.ImportKeyword));
      if (!isImport && (k === ts.SyntaxKind.StringLiteral || k === ts.SyntaxKind.NoSubstitutionTemplateLiteral || k === ts.SyntaxKind.TemplateHead || k === ts.SyntaxKind.TemplateMiddle || k === ts.SyntaxKind.TemplateTail || k === ts.SyntaxKind.JsxText)) {
        list.push(...edits(text, node.getStart(sf), node.getEnd()));
      }
      ts.forEachChild(node, visit);
      if (ts.isTemplateExpression(node)) {
        list.push(...edits(text, node.head.getStart(sf), node.head.getEnd()));
        for (const sp of node.templateSpans) list.push(...edits(text, sp.literal.getStart(sf), sp.literal.getEnd()));
      }
    };
    visit(sf);
  }
  const seen = new Set();
  list = list.filter(([s]) => (seen.has(s) ? false : (seen.add(s), true))).sort((a, b) => b[0] - a[0]);
  if (!list.length) return;
  total += list.length;
  const rel = path.relative(ROOT, file);
  if (APPLY) {
    let t = text;
    for (const [s, e, w] of list) t = t.slice(0, s) + TO[w] + t.slice(e);
    fs.writeFileSync(file, t);
    console.log(rel, list.length);
  } else for (const [s, e, w] of list.slice().reverse()) console.log(`${rel}:${text.slice(0, s).split('\n').length}: ${w} | ${text.slice(Math.max(0, s - 40), e + 25).replace(/\n/g, ' ')}`);
}
function walk(dir, whole) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, whole);
    // qa3.mjs holds the names on purpose: it checks that none of them is visible
    else if (/\.(tsx?|mjs)$/.test(f) && !/\.test\.ts$/.test(f) && f !== 'qa3.mjs') processFile(p, whole);
  }
}
walk(path.join(ROOT, 'src'), false);
walk(path.join(ROOT, 'e2e'), true);
console.log('total', total, APPLY ? 'applied' : 'dry run');
// --check (CI): any hit is a failure
if (process.argv.includes('--check') && total > 0) process.exit(1);
