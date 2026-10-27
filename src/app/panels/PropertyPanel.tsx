/**
 * The Property Panel: the panel of the command or feature being edited. Each feature family has its own module in
 * pm/ (QA F103); they are tried in the order the single panel used and the first that applies is shown.
 */
import type { ReactNode } from 'react';
import { NEXT, usePMContext } from './pm/context';
import { shellPM, helixPM, draftPM, threadPM, wrapPM, studPM, splitLinePM, moveBodyPM, combinePM, ribPM } from './pm/featurePMs';
import { filletPM, filletPM2 } from './pm/filletPMs';
import { mirrorPM } from './pm/patternPMs';
import { sheetMetalEditPM, baseFlangePM, miterFlangePM, sketchedBendPM, jogPM, unfoldPM, closedCornerPM, ventPM, formToolPM, gussetPM, tabSlotPM, ripPM, sweptFlangePM, crossBreakPM, hemPM, edgeFlangePM } from './pm/sheetMetalPMs';
import { genericPM } from './pm/solidPM';
import { surfacePM, intersectPM, deleteFacePM, deformPM } from './pm/surfacePMs';
import { structuralMemberPM, trimExtendPM, endCapPM, weldGussetPM, weldBeadPM } from './pm/weldmentPMs';
import { sketchPM } from './pm/sketchPM';

const FAMILIES = [shellPM, helixPM, sheetMetalEditPM, baseFlangePM, miterFlangePM, surfacePM, intersectPM, draftPM, sketchedBendPM, jogPM, threadPM, wrapPM, unfoldPM, deleteFacePM, closedCornerPM, ventPM, formToolPM, gussetPM, tabSlotPM, ripPM, sweptFlangePM, deformPM, structuralMemberPM, trimExtendPM, endCapPM, weldGussetPM, weldBeadPM, studPM, splitLinePM, crossBreakPM, hemPM, edgeFlangePM, moveBodyPM, combinePM, ribPM, mirrorPM, filletPM, filletPM2, genericPM];

export function PropertyPanelBody({ editDimensionId, onEditDone }: { editDimensionId: string | null; onEditDone: () => void }) {
  const ctx = usePMContext(editDimensionId, onEditDone);
  for (const pm of FAMILIES) {
    const r: ReactNode | typeof NEXT = pm(ctx);
    if (r !== NEXT) return r;
  }
  return sketchPM(ctx);
}
