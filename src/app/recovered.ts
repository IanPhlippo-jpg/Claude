/**
 * A document opened from Document Recovery (QA F154): it is not the saved file, so it opens with unsaved changes and
 * " (Recovered)" after its name, by design; saving it asks for a file name.
 */
export const RECOVERED_SUFFIX = ' (Recovered)';

/** "Part1" -> "Part1 (Recovered)"; a name that already ends so stays as it is */
export function recoveredName(name: string): string {
  const base = (name || 'Document').trim();
  return base.endsWith(RECOVERED_SUFFIX) ? base : base + RECOVERED_SUFFIX;
}
