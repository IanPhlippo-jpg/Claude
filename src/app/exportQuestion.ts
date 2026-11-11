// the export confirmation's text (QA 0.5.13, F204), apart from the store so it can be tested without a window
/** the question to ask before writing `what`, or null when the model rebuilt cleanly (or the warning is switched off) */
export function exportQuestion(name: string, errors: Record<string, unknown>, what: string, warn: boolean): string | null {
  const n = Object.keys(errors).length;
  if (!n || !warn) return null;
  return `${name} has ${n} feature${n === 1 ? '' : 's'} that could not be rebuilt (What's Wrong). The ${what} would show the incomplete model. Export it anyway?`;
}
