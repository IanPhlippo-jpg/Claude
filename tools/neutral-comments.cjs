// Rewrites wording that names the reference program ("as the original", "as the 2026 original", video frame numbers)
// into neutral descriptions of the intended behaviour (QA v0.3.4 F92). Uses of "original" that mean "the earlier state"
// (the original solid, the original endpoints) are left alone. Usage: node tools/neutral-comments.cjs [--apply]
const fs = require('fs');
const path = require('path');
const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const VERBS = 'shows|draws|refuses|lists|keeps|greys|grays|does|warns|reports|proposes|names|labels|adds|extends|uses|has|puts|places|opens|asks|gives|sets|starts|offers|makes|lets|hides|accepts|takes|marks|displays|stops|closes|returns|selects|reads|writes|treats|counts|measures|sorts|switches|leaves|colours|colors|fills|moves|limits|rounds|snaps|allows|creates|picks|turns|calls|follows|applies|computes|ends|is|was|sit|sits|cannot|can|does not|would|will|always|only|also|never|then|too|itself';
const RULES = [
  [/as the 2026 original \(reference frame f_\d+\)/g, 'by design'],
  [/as the (?:\(original\) )?2026 original|as the original 2026/g, 'by design'],
  [/\(reference frame f_\d+\)/g, ''],
  [/,? ?\((?:video|fr\.|frame) [^)]*\)/g, ''],
  [/\bas in the original\b/g, 'by design'],
  [/\bthe original's\b/g, 'the intended'],
  [/\bThe original's\b/g, 'The intended'],
  [/\bas the original\b/g, 'by design'],
  [/\bAs the original\b/g, 'By design'],
  [/\blike the original\b/g, 'by design'],
  [/\bmirrors the original\b/g, 'follows the intended design'],
  [/\bof the original\b(?! (?:solid|surface|sketch|body|geometry|value|length|endpoints|vertices|top|position|edges?|faces?|shape|profile|feature|points?))/g, 'of the intended design'],
  [/\bin the original\b(?! (?:solid|surface|sketch|body|geometry|value|length|endpoints|vertices|top|position|edges?|faces?|shape|profile|feature|points?))/g, 'in the intended design'],
  [new RegExp(`\\b([Tt])he original (${VERBS})\\b`, 'g'), '$1he intended design $2'],
  [/\(the original, /g, '('],
  [/measured on the original: /g, 'measured: '],
  // video frame tags such as (57/0028) and wording that points at the reference videos (QA v0.5.1 F136)
  [/,? ?\(\d{2}\/\d{4}(?:[,/ ]+\d{2,4})*\)/g, ''],
  [/ ?\((?:measured|seen) (?:in|on) the reference (?:videos?|frames?)\)/g, ''],
  [/(?:in|from|as in) the reference (?:videos?|frames?|program)/g, 'by design'],
  [/,? as the intended status bar(?: words it)?/g, ''],
];
let total = 0;
const changed = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css|cjs)$/.test(f)) {
      const text = fs.readFileSync(p, 'utf8');
      let t = text, n = 0;
      for (const [re, to] of RULES) t = t.replace(re, (...m) => { n++; return typeof to === 'string' ? to.replace(/\$(\d)/g, (_, i) => m[+i]) : to; });
      if (n) { total += n; changed.push(`${path.relative(ROOT, p)} ${n}`); if (APPLY) fs.writeFileSync(p, t); }
    }
  }
}
walk(path.join(ROOT, 'src'));
walk(path.join(ROOT, 'electron'));
console.log(changed.join('\n'));
console.log('total', total, APPLY ? 'applied' : 'dry run');
// --check (CI): any hit is a failure
if (process.argv.includes('--check') && total > 0) process.exit(1);
// what is left of "original" in the sense of the reference program is reported for a manual look
if (APPLY) {
  const left = [];
  const scan = (dir) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (fs.statSync(p).isDirectory()) scan(p); else if (/\.(tsx?|css)$/.test(f)) fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (/\bthe original\b|\boriginal's\b|2026/.test(l)) left.push(`${path.relative(ROOT, p)}:${i + 1}: ${l.trim().slice(0, 140)}`); }); } };
  scan(path.join(ROOT, 'src'));
  console.log('\nleft for review:\n' + left.join('\n'));
}
