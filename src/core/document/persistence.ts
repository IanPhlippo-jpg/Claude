import type { Document } from './types';

export const FILE_EXTENSION = '.kcad';
const AUTOSAVE_KEY = 'phlippo.autosave';

/** Own file format: versioned JSON. */
export function serializeDocument(doc: Document): string {
  return JSON.stringify({ format: 'phlippo-cad', ...doc }, null, 2);
}

export function parseDocument(text: string): Document {
  const raw = JSON.parse(text) as Partial<Document> & { format?: string };
  if (raw.format !== 'phlippo-cad' || raw.version !== 1) throw new Error('Onbekend bestandsformaat');
  const { format: _f, ...doc } = raw;
  void _f;
  return doc as Document;
}

export function autosave(doc: Document): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, serializeDocument(doc));
  } catch {
    /* storage may be unavailable */
  }
}

export function loadAutosave(): Document | null {
  try {
    const t = localStorage.getItem(AUTOSAVE_KEY);
    return t ? parseDocument(t) : null;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    /* ignore */
  }
}
