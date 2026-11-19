// The fabrication folders of the FeatureManager tree (docs/37 ch. 9): Weld Joints in their order (dragging a joint
// reorders the weld sequence, L3.5) and the frozen Quotes. Read from doc.fab only, so no fabrication code joins the
// main chunk; a double-click opens the view of the extension (loaded on demand).
import type { TreeNode } from '../../ui/components';
import { Icon } from '../../ui/icons';
import type { Document } from '../../core/document/types';
import { moveStep } from '../../fab/weldOrder';

const openFab = (view: 'welds' | 'quote', command: 'welds' | 'quote') =>
  void import('../fab/fabStore').then((m) => m.open(view, command));

export function fabFolders(doc: Document, apply: (label: string, d: Document) => void): TreeNode[] {
  const fab = doc.fab;
  if (!fab) return [];
  const out: TreeNode[] = [];
  const welds = [...(fab.welds ?? [])].filter((w) => w.status !== 'vervallen').sort((a, b) => a.stap - b.stap);
  if (welds.length) {
    out.push({
      id: 'fab-welds', icon: <Icon.TreeFolder glyph="bodies" />, label: <span>Weld Joints({welds.length})</span>, onDoubleClick: () => openFab('welds', 'welds'),
      children: welds.map((w) => ({
        id: 'fabweld-' + w.id,
        icon: <Icon.TreeFolder glyph="annotation" />,
        label: <span>{w.stap}. {w.id} {w.maat.letter}{w.maat.mm}{w.bevestigd ? '' : ' (proposal)'}</span>,
        onDoubleClick: () => openFab('welds', 'welds'),
        drag: {
          canDrop: (src: string) => src.startsWith('fabweld-') && src !== 'fabweld-' + w.id,
          onDrop: (src: string) => {
            const next = moveStep(fab.welds ?? [], src.slice('fabweld-'.length), w.id);
            if (!next) return;
            apply('Weld Sequence', { ...doc, fab: { ...fab, lasvolgordeHandmatig: true, welds: next } });
            void import('../fab/fabStore').then((m) => { if (m.useFab.getState().result) m.recompute(); });
          },
        },
      })),
    });
  }
  const quotes = fab.quotes ?? [];
  if (quotes.length) {
    out.push({
      id: 'fab-quotes', icon: <Icon.TreeFolder glyph="annotation" />, label: <span>Quotes({quotes.length})</span>, onDoubleClick: () => openFab('quote', 'quote'),
      children: quotes.map((q, i) => ({ id: `fabquote-${i}`, icon: <Icon.TreeFolder glyph="history" />,
        label: <span>Offerte {q.nummer}{q.revisie && q.revisie !== 'A' ? ` rev. ${q.revisie}` : ''}</span>,
        onDoubleClick: () => openFab('quote', 'quote') })),
    });
  }
  return out;
}
