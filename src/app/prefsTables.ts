/**
 * The options behind the tables of a drawing and the cut list of a frame part (QA v0.5.11 F112): General ▸ Custom
 * property used as component description, Document Properties ▸ Frames ▸ Collect identical bodies and Sort cut list
 * by. A module of its own so the light option helpers (prefsEffects.ts) do not pull in the table and frame code.
 */
import { getPref } from './prefs';
import { tableGrid } from '../core/drawing/tables';
import { cutList } from '../core/features/weldments';
import type { DrawingSheet } from '../core/document/types';

/** General ▸ Custom property used as component description: the DESCRIPTION column of a Bill of Materials */
export const bomTableGrid = (sheet: DrawingSheet, t: NonNullable<DrawingSheet['tables']>[number]) => tableGrid(sheet, t, String(getPref('general.componentDescription') || 'Description'));

/** Document Properties ▸ Frames ▸ Collect identical bodies and Sort cut list by: the cut list of a frame part */
export function frameCutList(bodies: Parameters<typeof cutList>[0]): ReturnType<typeof cutList> {
  let items = getPref('doc.weldCollectIdentical') !== false ? cutList(bodies) : bodies.flatMap((b) => cutList([b]).map((it) => ({ ...it, id: `${it.id}#${b.id}` })));
  const sort = String(getPref('doc.weldSort'));
  if (sort === 'Description') items = [...items].sort((a, b) => a.description.localeCompare(b.description));
  else if (sort === 'Length') items = [...items].sort((a, b) => b.length - a.length);
  return items.map((it, i) => ({ ...it, name: `Cut-List-Item${i + 1}` }));
}

/** Document Properties ▸ Frames ▸ Create cut lists automatically: the bodies of a frame part grouped in the tree */
export const cutListsOn = (): boolean => getPref('doc.weldCreateCutLists') !== false;
