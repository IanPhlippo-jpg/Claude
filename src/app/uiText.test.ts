import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every string literal in the app and UI code (labels, tooltips, messages) is checked for program-specific names,
// doubled words and "a" before a vowel (QA v0.3.4 F50, F77). Identifiers and comments are not text the user sees.
const files = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) ? [p] : []; });
const literals = (src: string): string[] => {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
  return [...code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`|>([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g)].map((m) => m[1] ?? m[2] ?? m[3] ?? m[4] ?? '');
};
const NAMES = /\b(?:FeatureManager|PropertyManager|CommandManager|ConfigurationManager|DisplayManager|MotionManager|DimXpert|TolAnalyst|SimulationXpress|FeatureXpert|DraftXpert|Instant3D|RealView|SpeedPak|eDrawings|Hole Wizard|Toolbox|Design Library|Lifecycle and Collaboration|Smart Fasteners?|SOLIDWORKS)\b/;
// import paths and lower-case keys (prefs, ids, test ids) are code, not text
const isText = (t: string) => !/^\.{1,2}\//.test(t) && !/^[a-z][\w.:-]*$/.test(t);
const all = ['src/app', 'src/ui'].flatMap(files).map((f) => ({ f, texts: literals(readFileSync(f, 'utf8')).filter(isText) }));

describe('visible UI text', () => {
  it('names no program-specific product (except the legal notice)', () => {
    const hits = all.flatMap(({ f, texts }) => (f.endsWith('legal.ts') ? [] : texts.filter((t) => NAMES.test(t)).map((t) => `${f}: ${t.slice(0, 80)}`)));
    expect(hits).toEqual([]);
  });
  it('has no doubled words and no "a" before a capitalised vowel word', () => {
    const hits = all.flatMap(({ f, texts }) => texts.filter((t) => t !== 'Face Face' /* the chamfer type */ && /\b([A-Za-z]{3,}) \1(?![-\w])/i.test(t) || /\ba [AEIOU][a-z]/.test(t)).map((t) => `${f}: ${t.slice(0, 80)}`));
    expect(hits).toEqual([]);
  });
});
