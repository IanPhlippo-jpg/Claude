import { bridge } from './viewport/bridge';
import { useEffect, useState } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../ui/components';
import { Icon } from '../ui/icons';
import { addComment, downloadText, mirrorComponents, packAndGoFiles } from './assemblyCommands';
import { withoutCustomerData } from '../fab/privacy';
import { serializeDocument } from '../core/document/persistence';
import { desktop } from './desktop';

function Frame({ title, testid, children, actions, width = 420 }: { title: string; testid: string; children: React.ReactNode; actions: React.ReactNode; width?: number }) {
  const st = useStore(useShallow((s) => ({ setDialog: s.setDialog })));
  return (
    <div className="k-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && st.setDialog(null)} onKeyDown={(e) => { if (e.key === 'Escape') st.setDialog(null); e.stopPropagation(); }}>
      <div className="k-dialog" style={{ width }} role="dialog" aria-label={title} data-testid={testid}>
        <div className="k-dialog-title">{title}</div>
        <div className="k-dialog-body">{children}</div>
        <div className="k-dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

/** Mirror Components: the mirror plane and the components to mirror (Copy). */
export function MirrorComponentsDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, selectedFeatureId: s.selectedFeatureId, setDialog: s.setDialog, pushMessage: s.pushMessage })));
  const comps = st.doc.components ?? [];
  const [plane, setPlane] = useState('right');
  const [pick, setPick] = useState<string[]>(st.selectedFeatureId && comps.some((c) => c.id === st.selectedFeatureId) ? [st.selectedFeatureId] : []);
  const [hand, setHand] = useState(false);
  const planes = [{ id: 'front', name: 'Front Plane' }, { id: 'top', name: 'Top Plane' }, { id: 'right', name: 'Right Plane' }, ...Object.values(st.doc.planes).filter((p) => p.kind === 'reference')];
  return (
    <Frame title="Mirror Components" testid="mirror-comps" actions={<>
      <Button variant="primary" data-testid="mirror-ok" disabled={!pick.length} onClick={() => { const n = mirrorComponents(plane, pick, hand); st.setDialog(null); st.pushMessage(`${n} component${n === 1 ? '' : 's'} mirrored.`); }}>OK</Button>
      <Button onClick={() => st.setDialog(null)}>Cancel</Button>
    </>}>
      <div className="k-field"><label>Mirror plane</label>
        <select className="k-input" data-testid="mirror-plane" value={plane} onChange={(e) => setPlane(e.target.value)}>{planes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <div className="k-pm-sub">Components to Mirror</div>
      <div className="k-selbox" style={{ maxHeight: 180, overflow: 'auto' }}>
        {comps.map((c) => <label key={c.id} className="k-check"><input type="checkbox" checked={pick.includes(c.id)} onChange={(e) => setPick(e.target.checked ? [...pick, c.id] : pick.filter((x) => x !== c.id))} /> {c.name}</label>)}
      </div>
      <div className="k-pm-radios" style={{ marginTop: 6 }}>
        <label className="k-check"><input type="radio" name="mirrortype" checked={!hand} onChange={() => setHand(false)} /> Copy (the part keeps its shape)</label>
        <label className="k-check"><input type="radio" name="mirrortype" data-testid="mirror-hand" checked={hand} onChange={() => setHand(true)} /> Create opposite hand version</label>
      </div>
    </Frame>
  );
}

/** Package Files: the assembly and all its parts as separate files. */
export function PackAndGoDialog() {
  const st = useStore(useShallow((s) => ({ setDialog: s.setDialog, pushMessage: s.pushMessage })));
  const [prefix, setPrefix] = useState('');
  const [withCustomer, setWithCustomer] = useState(false);
  const files = packAndGoFiles(withCustomer);
  const save = async () => {
    // the desktop app writes every file into one folder the user picks (P3-1); the browser downloads them
    const api = desktop();
    if (api?.savePackage) {
      const r = await api.savePackage(files.map((f) => ({ name: prefix + f.name, data: new TextEncoder().encode(f.text).buffer as ArrayBuffer })));
      if (!r) return;
      st.setDialog(null);
      st.pushMessage(`Package Files: ${r.count} files saved in ${r.folder}.${r.skipped.length ? ` Not saved: ${r.skipped.join(', ')}.` : ''}`, r.skipped.length ? 'warn' : 'info');
      return;
    }
    for (const f of files) downloadText(prefix + f.name, f.text);
    st.setDialog(null);
    st.pushMessage(`Package Files: ${files.length} files saved.`);
  };
  return (
    <Frame title="Package Files" testid="packandgo" width={520} actions={<><Button variant="primary" data-testid="pack-save" onClick={save}>Save</Button><Button onClick={() => st.setDialog(null)}>Cancel</Button></>}>
      <table className="k-pm-table" data-testid="pack-files"><thead><tr><th>Name</th><th>Save To Name</th><th>Size</th></tr></thead>
        <tbody>{files.map((f) => <tr key={f.name}><td>{f.name}</td><td>{prefix + f.name}</td><td>{(f.text.length / 1024).toFixed(1)} KB</td></tr>)}</tbody>
      </table>
      <div className="k-field"><label>Add prefix</label><input className="k-input" value={prefix} onChange={(e) => setPrefix(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
      <label className="k-check">
        <input type="checkbox" data-testid="pack-customer" checked={withCustomer} onChange={(e) => setWithCustomer(e.target.checked)} /> Include quotes, customer data and prices
      </label>
    </Frame>
  );
}

/** Share: a copy of the model, a picture of the view, or the picture on the clipboard. */
export function ShareDialog() {
  const st = useStore(useShallow((s) => ({ setDialog: s.setDialog, doc: s.doc, pushMessage: s.pushMessage })));
  const snap = () => bridge.snapshot?.() ?? null;
  return (
    <Frame title="Share" testid="share" actions={<Button onClick={() => st.setDialog(null)}>Close</Button>}>
      <div className="k-share-list">
        <button className="k-btn" data-testid="share-copy" onClick={() => { downloadText(`${st.doc.name} (copy).kcad`, serializeDocument(withoutCustomerData(st.doc))); st.pushMessage('A copy of the model is saved.'); }}><Icon.Save size={14} /> Save a copy of the model (.kcad)</button>
        <button className="k-btn" onClick={() => { const u = snap(); if (!u) return; const a = document.createElement('a'); a.href = u; a.download = `${st.doc.name}.jpg`; a.click(); }}><Icon.Appearance size={14} /> Save a picture of the view</button>
        <button className="k-btn" onClick={async () => { const u = snap(); if (!u) return; try { const blob = await (await fetch(u)).blob(); await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]); st.pushMessage('The picture is on the clipboard.'); } catch { st.pushMessage('The clipboard is not available here.', 'warn'); } }}><Icon.Open size={14} /> Copy the picture to the clipboard</button>
      </div>
    </Frame>
  );
}

/** Comments: notes on the model or on the selected feature/component. */
export function CommentsDialog() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, selectedFeatureId: s.selectedFeatureId, setDialog: s.setDialog })));
  const [text, setText] = useState('');
  const list = st.doc.comments ?? [];
  const target = st.selectedFeatureId ? (st.doc.features.find((f) => f.id === st.selectedFeatureId)?.name ?? (st.doc.components ?? []).find((c) => c.id === st.selectedFeatureId)?.name) : null;
  return (
    <Frame title="Comments" testid="comments" width={460} actions={<Button onClick={() => st.setDialog(null)}>Close</Button>}>
      <div className="k-comments" data-testid="comment-list">
        {list.length ? list.map((c) => (
          <div key={c.id} className="k-comment"><b>{c.author}</b> <span className="k-muted">{c.date}{c.featureId ? ` · ${st.doc.features.find((f) => f.id === c.featureId)?.name ?? (st.doc.components ?? []).find((x) => x.id === c.featureId)?.name ?? ''}` : ''}</span><div>{c.text}</div></div>
        )) : <span className="k-muted">No comments yet.</span>}
      </div>
      <div className="k-pm-sub">New comment{target ? ` on ${target}` : ' on the model'}</div>
      <textarea className="k-input" rows={3} data-testid="comment-text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
      <Button data-testid="comment-add" onClick={() => { addComment(text); setText(''); }}>Add Comment</Button>
    </Frame>
  );
}

/** Component Preview Window: the selected component on its own, in a separate window. */
export function ComponentPreview() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, selectedFeatureId: s.selectedFeatureId, rebuild: s.rebuild, setDialog: s.setDialog })));
  const comp = (st.doc.components ?? []).find((c) => c.id === st.selectedFeatureId);
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    const snap = bridge.snapshot;
    setImg(comp && snap ? snap(comp.id) : null);
  }, [comp, st.rebuild]);
  return (
    <div className="k-preview-window" data-testid="component-preview">
      <div className="k-preview-title"><span>Component Preview — {comp?.name ?? 'select a component'}</span><span className="grow" /><button className="k-btn ghost icon" onClick={() => st.setDialog(null)}><Icon.Close size={13} /></button></div>
      <div className="k-preview-body">{img ? <img src={img} alt="component" /> : <span className="k-muted">Select a component in the tree.</span>}</div>
    </div>
  );
}
