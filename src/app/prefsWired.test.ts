import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { WIRED_PREFS } from './prefsWired';

// QA v0.5.1 F112: an option the program does not read is greyed out in Tools ▸ Options. The list of options that do
// something is checked against the source: an option counts as read when its key appears in the code outside the
// Options schema (prefsSchema.ts), the defaults (prefs.ts up to getPref) and the tests.
const prefs = fs.readFileSync('src/app/prefs.ts', 'utf8');
const schemaEnd = prefs.indexOf('export function getPref');
const keys = new Set([...fs.readFileSync('src/app/prefsSchema.ts', 'utf8').matchAll(/key: '([^']+)'|textAfter: '([^']+)'/g)].map((m) => m[1] ?? m[2]));

function sourceText(): string {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && f !== 'prefsWired.ts' && f !== 'prefs.ts' && f !== 'prefsSchema.ts') files.push(p);
    }
  };
  walk('src');
  return prefs.slice(schemaEnd) + files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
}

describe('Options that do nothing are greyed out (QA v0.5.1 F112)', () => {
  it('WIRED_PREFS lists exactly the options the code reads', () => {
    const text = sourceText();
    const read = [...keys].filter((k) => ["'", '"', '`'].some((q) => text.includes(q + k + q))).sort();
    expect([...WIRED_PREFS].sort()).toEqual(read);
  });
});
