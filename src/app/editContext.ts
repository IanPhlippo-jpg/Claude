// Edit Component (in-context editing of a part of an assembly): which document a Save writes, and how the edited part
// goes back into its assembly. Kept apart from the store so the save path and its tests do not need the UI.
import type { Document } from '../core/document/types';

export interface EditContext {
  assembly: Document;
  componentName: string;
  /** the component that was opened (the fallback match for parts without an id) */
  componentId?: string;
  /** id of the part document as stored in the assembly; undefined for parts saved by builds older than F153 */
  partId?: string;
  partName: string;
  /** the part as it was when the assembly was last saved during this edit: Return to Assembly then adds no change */
  savedPart?: Document;
  history?: unknown;
}

/**
 * Does component part `p` belong to the part being edited? By the part's id (QA 0.5.14 advice P2-13: two different
 * parts with the same name are not both replaced), with the name only as a fallback for parts without an id.
 */
export function isEditedPart(ctx: Pick<EditContext, 'partId' | 'partName' | 'componentId'>, p: Document, componentId?: string): boolean {
  if (ctx.partId) return p.id === ctx.partId;
  if (componentId && ctx.componentId && componentId === ctx.componentId) return true;
  return !p.id && p.name === ctx.partName;
}

/** the assembly with the edited part in every instance of that part (the edit itself stays open) */
export function assemblyWithEditedPart(ctx: EditContext, part: Document): Document {
  const edited: Document = { ...part, kind: 'part' };
  return {
    ...ctx.assembly,
    components: (ctx.assembly.components ?? []).map((c) => (isEditedPart(ctx, c.part, c.id) ? { ...c, part: edited } : c)),
  };
}

/**
 * The document a Save writes (QA 0.5.14 advice P1-1). During Edit Component the open document is the part, but the file
 * on disk is the assembly: Save writes the assembly with the edited part in it, so the assembly and the part are saved
 * together. Writing the part alone would replace the assembly file with one part.
 */
export function documentToSave(st: { doc: Document; editContext: EditContext | null }): { doc: Document; inContext: boolean } {
  const ctx = st.editContext;
  if (!ctx) return { doc: st.doc, inContext: false };
  return { doc: assemblyWithEditedPart(ctx, st.doc), inContext: true };
}
