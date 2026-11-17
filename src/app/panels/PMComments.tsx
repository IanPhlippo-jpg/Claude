import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { commentsForPropertyPanel } from '../prefsUi';
import { Section } from '../../ui/components';

/**
 * Feature Tree ▸ Show Comments in Property Panel: the comments of the feature being edited, at the bottom of its
 * Property Panel (Insert Comment from the tree adds them).
 */
export function PMComments() {
  const st = useStore(useShallow((s) => ({ comments: s.doc.comments, featureId: s.featureEdit?.featureId ?? null, prefs: s.prefs })));
  const list = commentsForPropertyPanel(st.comments, st.featureId);
  if (!list.length) return null;
  return (
    <div data-testid="pm-comments">
      <Section title="Comments">
        {list.map((c) => (
          <div key={c.id} className="k-pm-comment">
            <div className="k-muted" style={{ fontSize: 11 }}>{[c.author, c.date].filter(Boolean).join(' · ')}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div>
          </div>
        ))}
      </Section>
    </div>
  );
}
