import { useEffect, useMemo, useRef, useState } from 'react';
import { lazyNamed } from '../lazy';
const AppearancesPane = lazyNamed(() => import('./AppearancesPane'), 'AppearancesPane', true);
const StandardPartsFolder = lazyNamed(() => import('./StandardPartsPane'), 'StandardPartsFolder');
import { useActiveSketch, useActiveSolve, useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../../ui/components';
import { Icon, RelationGlyph } from '../../ui/icons';
import { relationLabel } from '../../core/sketch/relations';
import { round, Kbd } from '../../ui/components';
import { SHORTCUTS } from '../shortcuts';
import { openFileDialog, withUnsavedCheck } from '../MenuBar';
import { listAutosaves, loadAutosaveEntry, parseDocument } from '../../core/document/persistence';
import { listDiskRecovery, readDiskRecovery } from '../autoRecover';
import { setDocumentHandle, type RecoverEntry } from '../desktop';
import { explorerRecent, recentDocuments } from '../prefsEffects';

/**
 * Display/Delete Relations, by design: the filter (All in this sketch, Dangling, Overdefining/Not Solved, External,
 * Defined in context, Locked, Broken, Selected entities), the relation list with Delete / Delete All, and the Entities
 * of the chosen relation.
 */
function RelationsPane() {
  const st = useStore(useShallow((s) => ({ selection: s.selection, selectedConstraint: s.selectedConstraint, selectConstraint: s.selectConstraint, removeRelation: s.removeRelation })));
  const sketch = useActiveSketch();
  const solve = useActiveSolve();
  const [filter, setFilter] = useState('All in this sketch');
  const list = useMemo(() => {
    if (!sketch) return [];
    return sketch.constraintOrder.filter((id) => {
      const k = sketch.constraints[id];
      const status = solve?.constraintStatus[id] ?? 'ok';
      switch (filter) {
        case 'Dangling': return k.refs.some((r) => !sketch.points[r] && !sketch.entities[r]);
        case 'Overdefining/Not Solved': return status !== 'ok';
        case 'External': return !!k.pierce;
        case 'Defined in context': return !!k.pierce;
        case 'Locked': return k.kind === 'fix';
        case 'Broken': return k.refs.some((r) => !sketch.points[r] && !sketch.entities[r]);
        case 'Selected entities': return st.selection.some((s) => k.refs.includes(s.id));
        default: return true;
      }
    });
  }, [sketch, solve, filter, st.selection]);
  if (!sketch) return <p className="k-muted" style={{ padding: 10 }}>No active sketch.</p>;
  const sel = st.selectedConstraint ? sketch.constraints[st.selectedConstraint] : null;
  const entityName = (id: string) => {
    const e = sketch.entities[id];
    if (e) { const i = sketch.entityOrder.indexOf(id) + 1; return `${e.kind[0].toUpperCase()}${e.kind.slice(1)}${i}`; }
    if (sketch.points[id]) return `Point${Object.keys(sketch.points).indexOf(id) + 1}`;
    return id;
  };
  return (
    <div data-testid="relations-pane" style={{ padding: 4 }}>
      <div className="k-pm-label" style={{ padding: '0 4px' }}>Relations</div>
      <select className="k-input" data-testid="relations-filter" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ margin: '0 4px 4px', width: 'calc(100% - 8px)' }}>
        {['All in this sketch', 'Dangling', 'Overdefining/Not Solved', 'External', 'Defined in context', 'Locked', 'Broken', 'Selected entities'].map((f) => <option key={f}>{f}</option>)}
      </select>
      <ul className="k-list">
        {list.map((id) => {
          const k = sketch.constraints[id];
          const G = RelationGlyph[k.kind];
          const status = solve?.constraintStatus[id] ?? 'ok';
          return (
            <li key={id} className={st.selectedConstraint === id ? 'selected' : ''} onClick={() => st.selectConstraint(id)}>
              {G ? <G size={14} /> : <Icon.Dimension size={14} />}
              <span>{relationLabel(k.kind)}</span>
              {k.value !== undefined && <span className="k-muted">{round(k.value)}</span>}
              <span className="tail">
                <span className={`status ${status}`}>{status === 'ok' ? 'Satisfied' : status}</span>
                <button className="k-btn ghost icon" onClick={(e) => { e.stopPropagation(); st.removeRelation(id); }} title="Delete">
                  <Icon.Trash size={12} />
                </button>
              </span>
            </li>
          );
        })}
        {list.length === 0 && <li className="k-muted">{sketch.constraintOrder.length ? 'No relations match the filter.' : 'No relations yet.'}</li>}
      </ul>
      <div className="k-pm-stylerow" style={{ padding: 4, gap: 6 }}>
        <Button disabled={!sel} onClick={() => sel && st.removeRelation(sel.id)}>Delete</Button>
        <Button data-testid="relations-deleteall" disabled={!list.length} onClick={() => { for (const id of list) st.removeRelation(id); }}>Delete All</Button>
        <label className="k-check"><input type="checkbox" disabled /> Suppressed</label>
      </div>
      <div className="k-pm-label" style={{ padding: '4px 4px 0' }}>Entities</div>
      <div className="k-selbox" style={{ margin: '0 4px', minHeight: 40 }} data-testid="relations-entities">
        {sel ? sel.refs.map((r) => <div key={r} className="k-selbox-row"><Icon.Line size={12} /> {entityName(r)} <span className="k-muted">· {sketch.points[r] ? 'Point' : sketch.entities[r]?.kind ?? 'missing'} · Fully Defined · {sketch.name}</span></div>) : <span className="k-muted">Select a relation to list its entities.</span>}
      </div>
    </div>
  );
}

/**
 * Task Pane: vertical icon strip on the right (Part Library, Relations,
 * Custom Properties, Resources) with a fly-out panel.
 */
export function TaskPane() {
  const st = useStore(useShallow((s) => ({ taskPane: s.taskPane, setTaskPane: s.setTaskPane, doc: s.doc, renameDocument: s.renameDocument, unitSystem: s.unitSystem })));
  // the strip in its intended order: Resources, Marketplace, Part Library, Forum, File Explorer,
  // View Palette, Appearances/Scenes/Decals, Custom Properties, Platform, Document Recovery
  const tabs: { id: Exclude<typeof st.taskPane, null>; icon: React.ReactNode; tip: string; online?: boolean; hidden?: boolean }[] = [
    { id: 'resources', icon: <Icon.Resources />, tip: 'Phlippo CAD Resources' },
    { id: 'marketplace', icon: <Icon.TPMarketplace />, tip: 'Marketplace', online: true },
    { id: 'library', icon: <Icon.Library />, tip: 'Part Library' },
    { id: 'forum', icon: <Icon.TPForum />, tip: 'Forum', online: true },
    { id: 'explorer', icon: <Icon.TPExplorer />, tip: 'File Explorer' },
    { id: 'palette', icon: <Icon.TPPalette />, tip: 'View Palette' },
    { id: 'appearances', icon: <Icon.TPAppearances />, tip: 'Appearances, Scenes, and Decals' },
    { id: 'properties', icon: <Icon.Properties />, tip: 'Custom Properties' },
    { id: 'platform', icon: <Icon.TPPlatform />, tip: 'Platform', online: true },
    { id: 'recovery', icon: <Icon.TPRecovery />, tip: 'Document Recovery' },
    { id: 'relations', icon: <Icon.Lock />, tip: 'Display/Delete Relations', hidden: true },
  ];
  return (
    <div className="k-taskpane">
      {st.taskPane && (
        <div className="k-taskpane-panel">
          <div className="k-panel-header">
            <button className="k-btn ghost icon k-tip" data-tip="Collapse" data-testid="taskpane-close" onClick={() => st.setTaskPane(null)}>«</button>
            <span className="k-tp-title">{tabs.find((t) => t.id === st.taskPane)?.tip}</span>
            <span style={{ width: 22 }} />
          </div>
          <div className="k-panel-body">
            {st.taskPane === 'library' && <DesignLibrary />}
            {(st.taskPane === 'marketplace' || st.taskPane === 'forum' || st.taskPane === 'platform') && (
              <p className="k-muted" style={{ padding: 10 }}>This online service is not available in Phlippo CAD (offline application).</p>
            )}
            {st.taskPane === 'explorer' && <FileExplorer />}
            {st.taskPane === 'palette' && <ViewPalette />}
            {st.taskPane === 'appearances' && <AppearancesPane />}
            {st.taskPane === 'recovery' && <RecoveryPane />}
            {st.taskPane === 'relations' && <RelationsPane />}
            {st.taskPane === 'properties' && (
              <div style={{ padding: 10 }}>
                <div className="k-field"><label>Name</label><input className="k-input" value={st.doc.name} onChange={(e) => st.renameDocument(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
                <div className="k-field"><label>Units</label><span>{st.unitSystem}</span></div>
                <div className="k-field"><label>Features</label><span>{st.doc.features.length}</span></div>
                <div className="k-field"><label>Material</label><span className={st.doc.material ? '' : 'k-muted'}>{st.doc.material?.name ?? '<not specified>'}</span></div>
                <div className="k-field"><label>Configuration</label><span>{st.doc.activeConfiguration ? (st.doc.configurations ?? []).find((c) => c.id === st.doc.activeConfiguration)?.name : 'Default'}</span></div>
              </div>
            )}
            {st.taskPane === 'resources' && (
              <div style={{ padding: 10 }}>
                <p><b>Getting Started</b></p>
                <ol style={{ paddingLeft: 18, margin: '4px 0 10px' }}>
                  <li>Click <b>Sketch</b> and select a plane.</li>
                  <li>Draw with <Kbd>L</Kbd>, <Kbd>R</Kbd>, <Kbd>C</Kbd>, <Kbd>A</Kbd>.</li>
                  <li>Dimension with <b>Smart Dimension</b> (<Kbd>M</Kbd>).</li>
                  <li>Exit the sketch with the Confirmation Corner (top right).</li>
                </ol>
                <p><b>Keyboard shortcuts</b></p>
                <table className="k-shortcuts">
                  <tbody>
                    {SHORTCUTS.map((s, i) => (
                      <tr key={i}><td><Kbd>{s.keys}</Kbd></td><td>{s.label}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="k-taskpane-strip">
        {tabs.filter((t) => !t.hidden).map((t) => (
          <button key={t.id} className={`k-taskpane-btn k-tip ${st.taskPane === t.id ? 'active' : ''}`} data-tip={t.tip} data-pane={t.id} onClick={() => st.setTaskPane(st.taskPane === t.id ? null : t.id)}>
            {t.icon}
          </button>
        ))}
      </div>
    </div>
  );
}


/**
 * Part Library: user-created libraries (folders) with sketch blocks.
 * Add the current selection (or whole sketch), insert into the active sketch,
 * export/import libraries as .kcadlib JSON files.
 */
function DesignLibrary() {
  const st = useStore(useShallow((s) => ({ libraries: s.libraries, selection: s.selection, exportLibrary: s.exportLibrary, createLibrary: s.createLibrary, importLibrary: s.importLibrary, setAsk: s.setAsk, renameLibrary: s.renameLibrary, deleteLibrary: s.deleteLibrary, startPlacing: s.startPlacing, activeSketchId: s.activeSketchId, deleteLibraryItem: s.deleteLibraryItem, addLibraryItem: s.addLibraryItem })));
  const [open, setOpen] = useState<string | null>(st.libraries[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [itemName, setItemName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const lib = st.libraries.find((l) => l.id === open) ?? null;
  const selCount = st.selection.filter((s) => s.kind === 'entity').length;
  const exportLib = (id: string) => {
    const json = st.exportLibrary(id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${st.libraries.find((l) => l.id === id)?.name ?? 'library'}.kcadlib`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="k-library">
      <div className="k-library-toolbar">
        <input className="k-input" placeholder="New library name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' && newName.trim()) { setOpen(st.createLibrary(newName.trim())); setNewName(''); } }} />
        <Button icon={<Icon.Folder />} onClick={() => { if (newName.trim()) { setOpen(st.createLibrary(newName.trim())); setNewName(''); } }} tip="Create library">New</Button>
        <Button icon={<Icon.Open />} onClick={() => fileRef.current?.click()} tip="Import a .kcadlib file">Import</Button>
        <input ref={fileRef} type="file" accept=".kcadlib,.json" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) st.importLibrary(await f.text()); e.target.value = ''; }} />
      </div>
      <div className="k-library-folders">
        <StandardPartsFolder />
        {st.libraries.length === 0 && <p className="k-muted" style={{ padding: '6px 10px' }}>No libraries yet. Create one above, then add sketch blocks to it.</p>}
        {st.libraries.map((l) => (
          <div key={l.id} className={`k-library-folder ${open === l.id ? 'open' : ''}`}>
            <div className="k-library-folder-row" onClick={() => setOpen(open === l.id ? null : l.id)}>
              {open === l.id ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} />}
              <Icon.Folder />
              <span className="grow">{l.name} <span className="k-muted">({l.items.length})</span></span>
              <button className="k-btn ghost icon k-tip" data-tip="Export library" onClick={(e) => { e.stopPropagation(); exportLib(l.id); }}><Icon.Save size={13} /></button>
              <button className="k-btn ghost icon k-tip" data-tip="Rename" onClick={(e) => { e.stopPropagation(); st.setAsk({ title: 'Rename', text: 'Library name', input: l.name, yes: (n) => n && st.renameLibrary(l.id, n) }); }}><Icon.Text size={13} /></button>
              <button className="k-btn ghost icon k-tip" data-tip="Delete library" onClick={(e) => { e.stopPropagation(); st.setAsk({ title: 'Part Library', text: `Delete library "${l.name}"?`, yes: () => st.deleteLibrary(l.id) }); }}><Icon.Trash size={13} /></button>
            </div>
            {open === l.id && (
              <div className="k-library-items">
                {l.items.length === 0 && <p className="k-muted">Empty. Select entities in a sketch and click "Add to library".</p>}
                {l.items.map((it) => (
                  <div key={it.id} className="k-library-item">
                    <BlockThumb block={it.block} />
                    <span className="grow">{it.name}<br /><span className="k-muted">{it.block.entities.length} entities · {it.block.constraints.length} relations</span></span>
                    <Button variant="primary" onClick={() => st.startPlacing(l.id, it.id)} disabled={!st.activeSketchId} tip="Insert into the active sketch (click to place)">Insert</Button>
                    <button className="k-btn ghost icon k-tip" data-tip="Delete item" onClick={() => st.deleteLibraryItem(l.id, it.id)}><Icon.Trash size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {lib && (
        <div className="k-library-add">
          <input className="k-input" placeholder="Block name" value={itemName} onChange={(e) => setItemName(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
          <Button icon={<Icon.Sketch />} disabled={!st.activeSketchId} onClick={() => { if (st.addLibraryItem(lib.id, itemName.trim() || `Block ${lib.items.length + 1}`)) setItemName(''); }}>
            {selCount ? `Add selection (${selCount}) to library` : 'Add sketch to library'}
          </Button>
        </div>
      )}
    </div>
  );
}

/** tiny preview of a block */
function BlockThumb({ block }: { block: import('../../core/sketch/blocks').Block }) {
  const pts = Object.values(block.points);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  for (const e of block.entities) if (e.kind === 'circle') { const c = block.points[e.center], r = block.scalars[e.r]; minX = Math.min(minX, c.x - r); maxX = Math.max(maxX, c.x + r); minY = Math.min(minY, c.y - r); maxY = Math.max(maxY, c.y + r); }
  const w = Math.max(maxX - minX, 1e-6), h = Math.max(maxY - minY, 1e-6);
  const s = 36 / Math.max(w, h);
  const X = (x: number) => 4 + (x - minX) * s + (36 - w * s) / 2, Y = (y: number) => 4 + (maxY - y) * s + (36 - h * s) / 2;
  return (
    <svg width={44} height={44} className="k-library-thumb">
      {block.entities.map((e) => {
        if (e.kind === 'line') { const a = block.points[e.p1], b = block.points[e.p2]; return <line key={e.id} x1={X(a.x)} y1={Y(a.y)} x2={X(b.x)} y2={Y(b.y)} stroke="#2b5fb3" strokeWidth={1} strokeDasharray={e.construction ? '2 2' : undefined} />; }
        if (e.kind === 'circle') { const c = block.points[e.center]; return <circle key={e.id} cx={X(c.x)} cy={Y(c.y)} r={block.scalars[e.r] * s} fill="none" stroke="#2b5fb3" strokeWidth={1} />; }
        if (e.kind === 'arc') { const c = block.points[e.center], a = block.points[e.start], b = block.points[e.end]; const r = block.scalars[e.r] * s; return <path key={e.id} d={`M${X(a.x)},${Y(a.y)} A${r},${r} 0 0 ${e.ccw ? 0 : 1} ${X(b.x)},${Y(b.y)}`} fill="none" stroke="#2b5fb3" strokeWidth={1} />; void c; }
        if (e.kind === 'spline') { const ps = e.points.map((p) => block.points[p]); return <polyline key={e.id} points={ps.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} fill="none" stroke="#2b5fb3" strokeWidth={1} />; }
        if (e.kind !== 'point') return null;
        const p = block.points[e.p]; return <rect key={e.id} x={X(p.x) - 1.5} y={Y(p.y) - 1.5} width={3} height={3} fill="#2b5fb3" />;
      })}
    </svg>
  );
}

/** File Explorer ▸ Recent Documents (as many as General ▸ Maximum recent documents allows) */
function RecentInExplorer() {
  const list = recentDocuments(listAutosaves());
  const open = (key: string) => withUnsavedCheck(() => {
    const d = loadAutosaveEntry(key);
    if (d) useStore.getState().openDocument(d);
    else useStore.getState().pushMessage('The document could not be read.', 'error');
  });
  return (
    <>
      <p style={{ margin: '10px 0 4px' }}><b>Recent Documents</b></p>
      {list.length ? <ul className="k-list" data-testid="explorer-recent">{list.map((r) => <li key={r.key} onClick={() => open(r.key)}><Icon.Part size={14} /> <span>{r.name}</span></li>)}</ul> : <p className="k-muted">No recent documents.</p>}
    </>
  );
}

/** File Explorer: the open document and opening files from disk */
function FileExplorer() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, dirty: s.dirty })));
  return (
    <div style={{ padding: 8 }}>
      <p style={{ margin: '0 0 4px' }}><b>Open in Phlippo CAD</b></p>
      <ul className="k-list">
        <li className="selected"><Icon.Part size={14} /> <span>{st.doc.name}{st.doc.kind === 'assembly' ? '.kasm' : st.doc.kind === 'drawing' ? '.kdrw' : '.kcad'}</span>{st.dirty && <span className="k-muted">*</span>}</li>
      </ul>
      {/* Options ▸ File Explorer ▸ Recent Documents: the documents of earlier sessions */}
      {explorerRecent() && <RecentInExplorer />}
      <p style={{ margin: '10px 0 4px' }}><b>This PC</b></p>
      <Button onClick={() => openFileDialog()}>Open…</Button>
    </div>
  );
}

/** View Palette: drag-free version — the standard views of the drawing's model, placed with one click */
function ViewPalette() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, startStandardThreeViews: s.startStandardThreeViews })));
  if (st.doc.kind !== 'drawing') return <p className="k-muted" style={{ padding: 10 }}>Open or create a drawing to use the View Palette.</p>;
  const model = st.doc.sheets?.[0]?.views[0]?.model;
  return (
    <div style={{ padding: 8 }}>
      <p className="k-muted" style={{ margin: '0 0 6px' }}>{model ? `Views of ${model.name}` : 'Insert a Model View first; the palette then shows its standard views.'}</p>
      {model && (
        <div className="k-palette-grid">
          {(['front', 'top', 'right', 'back', 'bottom', 'left', 'isometric'] as const).map((v) => (
            <button key={v} className="k-btn" onClick={() => st.startStandardThreeViews()}>*{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Document Recovery: the recovery copies of earlier sessions. A recovered document opens with unsaved changes and
 * "(Recovered)" after its name, without a file: Save asks where it goes (QA F154).
 */
function RecoveryPane() {
  const st = useStore(useShallow((s) => ({ hasDocument: s.hasDocument, doc: s.doc, dirty: s.dirty })));
  const list = listAutosaves();
  const recover = (d: import('../../core/document/types').Document) => {
    const seq = useStore.getState().openSeq;
    useStore.getState().openDocument(d, { recovered: true });
    if (useStore.getState().openSeq !== seq) setDocumentHandle(null);
  };
  const open = (key: string) => withUnsavedCheck(() => {
    const d = loadAutosaveEntry(key);
    if (!d) return useStore.getState().pushMessage('The recovered document could not be read.', 'error');
    recover(d);
  });
  // the desktop app: the copies in the auto-recover folder (Options ▸ Backup/Recover)
  const [disk, setDisk] = useState<RecoverEntry[]>([]);
  useEffect(() => { void listDiskRecovery().then(setDisk); }, []);
  const openDisk = (name: string) => withUnsavedCheck(() => {
    void readDiskRecovery(name).then((text) => {
      try {
        if (!text) throw new Error('empty');
        recover(parseDocument(text));
      } catch {
        useStore.getState().pushMessage('The recovered document could not be read.', 'error');
      }
    });
  });
  return (
    <div style={{ padding: 8 }}>
      <p className="k-muted" style={{ margin: '0 0 6px' }}>Phlippo CAD keeps an auto-recover copy of every document after each change (the last {5}).</p>
      {list.length ? (
        <ul className="k-list" data-testid="recovery-list">
          {list.map((r) => (
            <li key={r.key} onClick={() => open(r.key)} title="Open the recovered document"><Icon.TPRecovery size={14} /> <span>{r.name}.kcad</span> <span className="k-muted" style={{ marginLeft: 'auto' }}>{new Date(r.time).toLocaleString()}</span></li>
          ))}
        </ul>
      ) : <p className="k-muted">No recovered documents.</p>}
      {disk.length > 0 && (
        <>
          <p className="k-muted" style={{ margin: '8px 0 6px' }}>Auto-recover folder:</p>
          <ul className="k-list" data-testid="recovery-disk">
            {disk.map((r) => (
              <li key={r.name} onClick={() => openDisk(r.name)} title="Open the auto-recover copy"><Icon.TPRecovery size={14} /> <span>{r.label}.kcad</span> <span className="k-muted" style={{ marginLeft: 'auto' }}>{new Date(r.time).toLocaleString()}</span></li>
            ))}
          </ul>
        </>
      )}
      {st.hasDocument && <p className="k-muted" style={{ marginTop: 8 }}>Open: {st.doc.name}{st.dirty ? ' (unsaved changes)' : ''}</p>}
    </div>
  );
}
