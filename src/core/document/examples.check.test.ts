import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument, validateDocument } from './persistence';

// every example and fixture document in the repository still opens under the stricter validation (QA v0.3.3 F70);
// hidden folders (a firmware build in voorbeelden/afzuiging/firmware/.pio) and build output (app/uit, gitignored) are skipped
const walk = (d: string): string[] => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e: import("node:fs").Dirent) => (e.isDirectory() ? (e.name.startsWith('.') || e.name === 'uit' ? [] : walk(join(d, e.name))) : /\.(kcad|json)$/i.test(e.name) ? [join(d, e.name)] : [])) : []);
const files = ['voorbeelden', 'e2e/fixtures'].flatMap(walk);
describe('example documents', () => {
  it.each(files.length ? files : ['(none)'])('%s opens', (f) => {
    if (f === '(none)') return;
    const text = readFileSync(f, 'utf8');
    const raw = JSON.parse(text);
    // data files next to the examples (material lists, template overviews) are not documents
    if (raw.format !== 'phlippo-cad' && (Array.isArray(raw) || !['features', 'sketches', 'components'].some((k) => k in raw))) return;
    if (raw.format === 'phlippo-cad') expect(() => parseDocument(text)).not.toThrow();
    else expect(() => validateDocument({ planes: {}, variables: {}, equations: [], ...raw })).not.toThrow();
  });
});
