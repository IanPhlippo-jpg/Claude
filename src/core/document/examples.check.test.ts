import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument, validateDocument } from './persistence';

// every example and fixture document in the repository still opens under the stricter validation (QA v0.3.3 F70);
// hidden folders (a firmware build in voorbeelden/afzuiging/firmware/.pio) and build output (app/uit, gitignored) are skipped
const walk = (d: string): string[] => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e: import("node:fs").Dirent) => (e.isDirectory() ? (e.name.startsWith('.') || e.name === 'uit' ? [] : walk(join(d, e.name))) : /\.(kcad|json)$/i.test(e.name) ? [join(d, e.name)] : [])) : []);
const files = ['voorbeelden', 'e2e/fixtures'].flatMap(walk);

/**
 * Whether a file is a CAD document (QA 0.5.13, F203): every .kcad is, and so is a .json that says format phlippo-cad
 * or carries a part's or an assembly's lists; a material list or a template overview next to an example is data and
 * not a document. A .kcad is never skipped, so the validation of real documents is not loosened.
 */
export const isCadDocument = (file: string, raw: unknown): boolean => {
  if (/\.kcad$/i.test(file)) return true;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return o.format === 'phlippo-cad' || ['features', 'sketches', 'components'].some((k) => k in o);
};

describe('example documents', () => {
  it.each(files.length ? files : ['(none)'])('%s opens', (f) => {
    if (f === '(none)') return;
    const text = readFileSync(f, 'utf8');
    const raw = JSON.parse(text);
    if (!isCadDocument(f, raw)) return;
    if (raw.format === 'phlippo-cad') expect(() => parseDocument(text)).not.toThrow();
    else expect(() => validateDocument({ planes: {}, variables: {}, equations: [], ...raw })).not.toThrow();
  });

  it('tells the data files of the lastafel apart from documents, and still rejects a document without a name', () => {
    const data = files.filter((f) => /\.json$/i.test(f) && !isCadDocument(f, JSON.parse(readFileSync(f, 'utf8')))).map((f) => f.split('\\').join('/'));
    expect(data).toEqual(expect.arrayContaining(['voorbeelden/lastafel/docs/materiaal.json', 'voorbeelden/lastafel/mallen/overzicht.json']));
    // a .kcad is a document whatever it holds, and a document without a name does not open (F70 stays strict)
    expect(isCadDocument('x.kcad', [])).toBe(true);
    expect(() => validateDocument({ planes: {}, variables: {}, equations: [], features: [], sketches: {} })).toThrow(/no name/);
  });
});
