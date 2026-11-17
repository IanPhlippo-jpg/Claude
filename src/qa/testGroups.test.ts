/**
 * The heavy test groups have one list (QA 0.5.14 P2-11, P3-11): tools/test-groups.json. `npm test` (vite.config.ts)
 * leaves exactly those files out, `npm run test:voorbeelden` / `test:bibliotheek` run them through tools/run-tests.mjs,
 * CI has a job per group, and a test that imports from bibliotheek/ or voorbeelden/ cannot slip into `npm test`.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const groups = JSON.parse(readFileSync('tools/test-groups.json', 'utf8')) as Record<string, string[] | string>;
const names = Object.keys(groups).filter((k) => !k.startsWith('_'));
const listed = names.flatMap((k) => groups[k] as string[]);
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

/** every src test file whose import statements (static or dynamic) reach into bibliotheek/ or voorbeelden/ */
function importsLibraries(): string[] {
  const files = readdirSync('src', { recursive: true }).map((f) => 'src/' + String(f).split('\\').join('/')).filter((f) => /\.test\.tsx?$/.test(f));
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)['"`][^'"`]*\b(?:bibliotheek|voorbeelden)\//m;
  return files.filter((f) => re.test(readFileSync(f, 'utf8'))).sort();
}

describe('heavy test groups (tools/test-groups.json)', () => {
  it('names the groups voorbeelden and bibliotheek, every file once and existing', () => {
    expect(names.sort()).toEqual(['bibliotheek', 'voorbeelden']);
    expect(new Set(listed).size).toBe(listed.length);
    for (const f of listed) expect(existsSync(f), f).toBe(true);
    for (const f of ['src/qa/qaFitness.test.ts', 'src/qa/qaBalustrades.test.ts', 'src/qa/montageDeuren.test.ts', 'src/qa/qaDeuren.test.ts']) {
      expect(groups.bibliotheek, f).toContain(f);
    }
  });

  it('holds every test that imports from bibliotheek/ or voorbeelden/', () => {
    const found = importsLibraries();
    expect(found.length).toBeGreaterThan(5);
    expect(found.filter((f) => !listed.includes(f))).toEqual([]);
  });

  it('is the only list: vite.config.ts reads it, the scripts and the CI jobs run each group', () => {
    const cfg = readFileSync('vite.config.ts', 'utf8');
    expect(cfg).toContain('tools/test-groups.json');
    expect(cfg).not.toMatch(/['"]src\/qa\/[^'"]+\.test\.ts['"]/);
    const ci = readFileSync('.github/workflows/ci.yml', 'utf8').replace(/\r\n/g, '\n');
    for (const g of names) {
      expect(pkg.scripts[`test:${g}`]).toBe(`node tools/run-tests.mjs ${g}`);
      expect(ci).toMatch(new RegExp(`^  ${g}:\\n[\\s\\S]*?npm run test:${g}\\b`, 'm'));
    }
    // no other script names a heavy file by hand (a second list that can drift)
    for (const [k, v] of Object.entries(pkg.scripts)) {
      if (k === 'test:afz-snel') continue;
      for (const f of listed) expect(v.includes(f), `${k} names ${f}`).toBe(false);
    }
    expect(readFileSync('tools/bewijs.mjs', 'utf8')).toContain('test-groups.json');
  });
});
