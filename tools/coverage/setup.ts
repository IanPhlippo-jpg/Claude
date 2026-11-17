/**
 * Coverage without an extra package (QA 0.5.14 advice P3-10): every test worker starts V8's precise coverage through
 * the built-in inspector and, after its test file, writes the counts of the src/core modules it ran together with
 * their executed source (that source carries vite's inline source map, so tools/coverage/report.mjs can map the
 * counts back to lines of the .ts files). Loaded only by tools/coverage/vitest.config.ts.
 */
import { Session } from 'node:inspector/promises';
import { afterAll } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface Range { startOffset: number; endOffset: number; count: number }
interface ScriptCoverage { scriptId: string; url: string; functions: { ranges: Range[] }[] }

const OUT = process.env.PHLIPPO_COVERAGE_DIR;
const session = new Session();
session.connect();
await session.post('Debugger.enable');
await session.post('Profiler.enable');
await session.post('Profiler.startPreciseCoverage', { callCount: true, detailed: true });

afterAll(async () => {
  if (!OUT) return;
  const { result } = (await session.post('Profiler.takePreciseCoverage')) as { result: ScriptCoverage[] };
  const mine = result.filter((s) => /\/src\/core\//.test(s.url) && !/\.test\.ts$/.test(s.url));
  const out = [];
  for (const s of mine) {
    const { scriptSource } = (await session.post('Debugger.getScriptSource', { scriptId: s.scriptId })) as { scriptSource: string };
    out.push({ url: s.url, source: scriptSource, functions: s.functions.map((f) => f.ranges) });
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `cov-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`), JSON.stringify(out));
});
