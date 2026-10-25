import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Icon } from '../ui/icons';

/**
 * Render Tools ▸ Preview Window, as the original: a separate window that keeps showing the rendered model
 * while you work (refreshed after every change and every two seconds), with Pause and Save Image.
 */
export function PreviewWindow() {
  const st = useStore();
  const [img, setImg] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const snap = () => setImg((window as unknown as { __phlippoSnapshot?: () => string | null }).__phlippoSnapshot?.() ?? null);
    const t0 = setTimeout(snap, 50);
    const t = setInterval(snap, 2000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [paused, st.doc, st.rebuild, st.show.realView]);
  const save = () => {
    if (!img) return;
    const a = document.createElement('a');
    a.href = img;
    a.download = `${st.doc.name}-preview.jpg`;
    a.click();
  };
  return (
    <div className="k-preview-window" data-testid="preview-window">
      <div className="k-preview-title">
        <span>Phlippo Render Preview — {st.doc.name}</span>
        <span className="grow" />
        <button className="k-btn ghost icon k-tip" data-tip={paused ? 'Resume' : 'Pause'} onClick={() => setPaused(!paused)}>{paused ? '▶' : '❚❚'}</button>
        <button className="k-btn ghost icon k-tip" data-tip="Save Image" onClick={save}><Icon.Save size={13} /></button>
        <button className="k-btn ghost icon k-tip" data-tip="Close" onClick={() => st.setDialog(null)}><Icon.Close size={13} /></button>
      </div>
      <div className="k-preview-body">{img ? <img src={img} alt="Render preview" data-testid="preview-img" /> : <span className="k-muted">Rendering…</span>}</div>
      <div className="k-preview-status">{paused ? 'Paused' : 'Updating'} · {st.show.realView ? 'RealView' : 'Shaded'}</div>
    </div>
  );
}
