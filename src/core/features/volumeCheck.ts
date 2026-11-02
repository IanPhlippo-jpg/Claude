/**
 * The cross-check between the two kernels (QA report 0.5.10, F159): the mesh kernel and the B-rep kernel build the
 * same part, so their volumes agree up to the tessellation's margin. A larger difference means one of them applied a
 * feature wrongly (an extra edge rounded, a boolean that missed): the user is told instead of shown a silent number.
 */

/** the relative difference above which the volumes are said to disagree (the tessellation stays well under it) */
export const VOLUME_MISMATCH = 0.005;

/** the warning text when the exact and the faceted volume disagree, else null */
export function volumeMismatch(meshVolume: number, exactVolume: number, limit = VOLUME_MISMATCH): string | null {
  const ref = Math.max(Math.abs(meshVolume), Math.abs(exactVolume));
  if (!(ref > 1e-9) || !Number.isFinite(meshVolume) || !Number.isFinite(exactVolume)) return null;
  const rel = Math.abs(exactVolume - meshVolume) / ref;
  if (rel <= limit) return null;
  return `Warning: the exact volume (${exactVolume.toFixed(2)} mm³) and the faceted volume (${meshVolume.toFixed(2)} mm³) of this body differ by ${(rel * 100).toFixed(1)} %: one of the kernels built this feature wrongly. Check the geometry before trusting mass properties or STEP.`;
}
