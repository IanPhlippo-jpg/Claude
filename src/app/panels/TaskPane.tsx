import { useRef, useState } from 'react';
import { useActiveSketch, useActiveSolve, useStore } from '../store';
import { Button } from '../../ui/components';
import { Icon, RelationGlyph } from '../../ui/icons';
import { relationLabel } from '../../core/sketch/relations';
import { round, Kbd } from '../../ui/components';
import { SHORTCUTS } from '../shortcuts';

/**
 * Task Pane: vertical icon strip on the right (Design Library, Relations,
 * Custom Properties, Resources) with a fly-out panel.
 */
export function TaskPane() {
  const st = useStore();
  const sketch = useActiveSketch();
  const solve = useActiveSolve();
  const tabs = [
    { id: 'resources' as const, icon: <Icon.Resources />, tip: 'Phlippo CAD Resources' },
    { id: 'library' as const, icon: <Icon.Library />, tip: 'Design Library' },
    { id: 'relations' as const, icon: <Icon.Lock />, tip: 'Display/Delete Relations' },
    { id: 'properties' as const, icon: <Icon.Properties />, tip: 'Custom Properties' },
  ];
  return (
    <div className="k-taskpane">
      {st.taskPane && (
        <div className="k-taskpane-panel">
          <div className="k-panel-header">
            <span>{tabs.find((t) => t.id === st.taskPane)?.tip}</span>
            <span className="grow" />
            <button className="k-btn ghost icon" onClick={() => st.setTaskPane(null)}><Icon.Close size={12} /></button>
          </div>
          <div className="k-panel-body">
            {st.taskPane === 'library' && <DesignLibrary />}
            {st.taskPane === 'relations' &&
              (!sketch ? (
                <p className="k-muted" style={{ padding: 10 }}>No active sketch.</p>
              ) : (
                <ul className="k-list" style={{ padding: 4 }}>
                  {sketch.constraintOrder.map((id) => {
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
                  {sketch.constraintOrder.length === 0 && <li className="k-muted">No relations yet.</li>}
                </ul>
              ))}
            {st.taskPane === 'properties' && (
              <div style={{ padding: 10 }}>
                <div className="k-field"><label>Name</label><input className="k-input" value={st.doc.name} onChange={(e) => st.renameDocument(e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
                <div className="k-field"><label>Units</label><span>{st.unitSystem}</span></div>
                <div className="k-field"><label>Features</label><span>{st.doc.features.length}</span></div>
                <div className="k-field"><label>Material</label><span className="k-muted">not specified (phase 7)</span></div>
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
        {tabs.map((t) => (
          <button key={t.id} className={`k-taskpane-btn k-tip ${st.taskPane === t.id ? 'active' : ''}`} data-tip={t.tip} onClick={() => st.setTaskPane(t.id)}>
            {t.icon}
          </button>
        ))}
      </div>
    </div>
  );
}


/**
 * Design Library: user-created libraries (folders) with sketch blocks.
 * Add the current selection (or whole sketch), insert into the active sketch,
 * export/import libraries as .kcadlib JSON files.
 */
function DesignLibrary() {
  const st = useStore();
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
        {st.libraries.length === 0 && <p className="k-muted" style={{ padding: '6px 10px' }}>No libraries yet. Create one above, then add sketch blocks to it.</p>}
        {st.libraries.map((l) => (
          <div key={l.id} className={`k-library-folder ${open === l.id ? 'open' : ''}`}>
            <div className="k-library-folder-row" onClick={() => setOpen(open === l.id ? null : l.id)}>
              {open === l.id ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} />}
              <Icon.Folder />
              <span className="grow">{l.name} <span className="k-muted">({l.items.length})</span></span>
              <button className="k-btn ghost icon k-tip" data-tip="Export library" onClick={(e) => { e.stopPropagation(); exportLib(l.id); }}><Icon.Save size={13} /></button>
              <button className="k-btn ghost icon k-tip" data-tip="Rename" onClick={(e) => { e.stopPropagation(); const n = prompt('Library name', l.name); if (n) st.renameLibrary(l.id, n); }}><Icon.Text size={13} /></button>
              <button className="k-btn ghost icon k-tip" data-tip="Delete library" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete library "${l.name}"?`)) st.deleteLibrary(l.id); }}><Icon.Trash size={13} /></button>
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
        const p = block.points[e.p]; return <rect key={e.id} x={X(p.x) - 1.5} y={Y(p.y) - 1.5} width={3} height={3} fill="#2b5fb3" />;
      })}
    </svg>
  );
}
