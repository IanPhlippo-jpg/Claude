import { useState } from 'react';
import { insertModelInView, sheetModels } from './DrawingExtras';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import type { DrawingViewType } from '../../core/document/types';
import { openFileDialog } from '../MenuBar';
import { getPref, loadPrefs, savePrefs } from '../prefs';
import { configurations } from '../../core/document/configurations';
import { documentForConfiguration } from '../../core/document/configurations';
import type { Document } from '../../core/document/types';

/** a pref check box kept between sessions (default on unless given) */
function PrefCheck({ k, label, def = true, testid }: { k: string; label: string; def?: boolean; testid?: string }) {
  const [on, setOn] = useState(() => (getPref(k) === undefined ? def : getPref(k) !== false));
  return <label className="k-check"><input type="checkbox" data-testid={testid} checked={on} onChange={(e) => { setOn(e.target.checked); savePrefs({ ...loadPrefs(), [k]: e.target.checked }); }} /> {label}</label>;
}

/** Reference Configuration: the configurations of the model */
function ConfigSelect({ model, value, onChange }: { model: Document; value?: string; onChange: (name: string) => void }) {
  const list = configurations(model).map((c) => c.name);
  return (
    <select className="k-input" data-testid="dv-config" value={value ?? list[0]} disabled={list.length < 2} onChange={(e) => onChange(e.target.value)}>
      {list.map((n) => <option key={n} value={n}>{n}</option>)}
    </select>
  );
}

function Header({ title, icon, onOk, onCancel }: { title: string; icon: React.ReactNode; onOk?: () => void; onCancel: () => void }) {
  return (
    <div className="k-pm-head">
      <div className="k-pm-title">
        {icon} <b>{title}</b>
        <span className="grow" />
        <span className="k-pm-help" title="Help">?</span>
      </div>
      <div className="k-pm-buttons">
        {onOk && <button className="k-pm-ok k-tip" data-tip="OK" onClick={onOk}><Icon.Check /></button>}
        <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={onCancel}><Icon.Close /></button>
      </div>
    </div>
  );
}

const ORIENTATIONS: { type: DrawingViewType; label: string }[] = [
  { type: 'front', label: 'Front' },
  { type: 'back', label: 'Back' },
  { type: 'left', label: 'Left' },
  { type: 'right', label: 'Right' },
  { type: 'top', label: 'Top' },
  { type: 'bottom', label: 'Bottom' },
  { type: 'isometric', label: 'Isometric' },
  { type: 'trimetric', label: 'Trimetric' },
  { type: 'dimetric', label: 'Dimetric' },
];

const STYLES: { id: 'wireframe' | 'hiddenVisible' | 'hiddenRemoved' | 'shadedEdges' | 'shaded'; label: string; icon: React.ReactNode }[] = [
  { id: 'wireframe', label: 'Wireframe', icon: <Icon.StyleWireframe size={20} /> },
  { id: 'hiddenVisible', label: 'Hidden Lines Visible', icon: <Icon.StyleHiddenVisible size={20} /> },
  { id: 'hiddenRemoved', label: 'Hidden Lines Removed', icon: <Icon.StyleHiddenRemoved size={20} /> },
  { id: 'shadedEdges', label: 'Shaded With Edges', icon: <Icon.StyleShadedEdges size={20} /> },
  { id: 'shaded', label: 'Shaded', icon: <Icon.StyleShaded size={20} /> },
];

/** Model View Property Panel: Part/Assembly to Insert, then Orientation, Display Style and Scale (by design). */
export function ModelViewPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, doc: s.doc, cancelDrawingEdit: s.cancelDrawingEdit, setModelViewSource: s.setModelViewSource, setDrawingEdit: s.setDrawingEdit })));
  const de = st.drawingEdit;
  if (!de) return null;
  const models = [...new Map((st.doc.sheets?.[0]?.views ?? []).map((v) => [v.model.name, v.model])).values()];
  if (!de.model) {
    return (
      <div className="k-pm">
        <Header title="Model View" icon={<Icon.ModelView />} onCancel={st.cancelDrawingEdit} />
        <Section title="Message">
          <p className="k-pm-message">Select a part or assembly from which to create the view, then click Next.</p>
        </Section>
        <Section title="Part/Assembly to Insert">
          <div className="k-field"><label>Open documents:</label></div>
          <div className="k-selbox" style={{ minHeight: 60 }}>
            {models.length ? models.map((m) => (
              <div key={m.name} className="k-selbox-row" onDoubleClick={() => st.setModelViewSource(m)}><Icon.Part size={12} /> {m.name}</div>
            )) : <span className="k-muted">No open documents.</span>}
          </div>
          <button className="k-btn" style={{ marginTop: 6 }} onClick={() => openFileDialog()}>Browse...</button>
        </Section>
        <Section title="Thumbnail Preview" defaultOpen={false}><div className="k-muted">No preview.</div></Section>
        <Section title="Options">
          <PrefCheck k="drawing.startModelView" label="Start command when creating new drawing" />
          <PrefCheck k="drawing.autoProjected" label="Auto-start projected view" testid="mv-autoprojected" />
        </Section>
        <Section title="Cosmetic Thread Display" defaultOpen={false}>
          <label className="k-check"><input type="radio" name="ct" checked={!de.threadDraft} onChange={() => st.setDrawingEdit({ threadDraft: false })} /> High quality</label>
          <label className="k-check"><input type="radio" name="ct" checked={!!de.threadDraft} onChange={() => st.setDrawingEdit({ threadDraft: true })} /> Draft quality</label>
        </Section>
      </div>
    );
  }
  return (
    <div className="k-pm">
      <Header title="Model View" icon={<Icon.ModelView />} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">Select an orientation, then click in the sheet to place the view. Projected views follow from the placed view.</p>
      </Section>
      <Section title="Reference Configuration">
        <ConfigSelect model={de.model} value={de.configuration} onChange={(n) => st.setDrawingEdit({ configuration: n })} />
      </Section>
      <Section title="Orientation">
        <div className="k-pm-radios">
          <label className="k-check"><input type="checkbox" checked={de.multiple} onChange={(e) => st.setDrawingEdit({ multiple: e.target.checked })} /> Create multiple views</label>
        </div>
        <div className="k-field"><label>Standard views:</label></div>
        <div className="k-orient-grid">
          {ORIENTATIONS.map((o) => (
            <button key={o.type} className={`k-pm-typebtn ${de.orientation === o.type ? 'active' : ''}`} title={o.label} onClick={() => st.setDrawingEdit({ orientation: o.type })}>
              <Icon.ViewCube size={22} />
              <span>{o.label}</span>
            </button>
          ))}
        </div>
        <label className="k-check" style={{ marginTop: 4 }}><input type="checkbox" data-testid="mv-preview" checked={de.preview !== false} onChange={(e) => st.setDrawingEdit({ preview: e.target.checked })} /> Preview</label>
      </Section>
      <Section title="Import Options" defaultOpen={!!de.importAnnotations}>
        <label className="k-check"><input type="checkbox" data-testid="mv-import" checked={!!de.importAnnotations} onChange={(e) => st.setDrawingEdit({ importAnnotations: e.target.checked })} /> Import annotations</label>
        <label className="k-check" style={{ marginLeft: 18 }}><input type="checkbox" disabled={!de.importAnnotations} checked={!!de.importAnnotations} onChange={(e) => st.setDrawingEdit({ importAnnotations: e.target.checked })} /> Design annotations</label>
      </Section>
      <Section title="Display State" defaultOpen={false}>
        <div className="k-selbox" style={{ minHeight: 22 }}><div className="k-selbox-row">{`<${de.configuration ?? configurations(de.model)[0].name}>_Display State 1`}</div></div>
      </Section>
      <Section title="Display Style">
        <div className="k-pm-typegrid k-pm-stylegrid">
          {STYLES.map((s) => (
            <button key={s.id} className={`k-pm-typebtn ${de.displayStyle === s.id ? 'active' : ''}`} title={s.label} onClick={() => st.setDrawingEdit({ displayStyle: s.id })}>{s.icon}</button>
          ))}
        </div>
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="mvq" checked={!de.draftQuality} onChange={() => st.setDrawingEdit({ draftQuality: false })} /> High quality</label>
          <label className="k-check"><input type="radio" name="mvq" checked={!!de.draftQuality} onChange={() => st.setDrawingEdit({ draftQuality: true })} /> Draft quality</label>
        </div>
      </Section>
      {de.model.features.some((f: { type: string }) => f.type === 'flatPattern') && (
        <Section title="Flat Pattern Display" defaultOpen={!!de.model.features.some((f: { type: string; suppressed: boolean }) => f.type === 'flatPattern' && !f.suppressed)}>
          <label className="k-check"><input type="checkbox" data-testid="mv-bendlines" checked={de.bendLines !== false} onChange={(e) => st.setDrawingEdit({ bendLines: e.target.checked })} /> Bend lines</label>
          <label className="k-check" style={{ marginLeft: 18 }}><input type="checkbox" data-testid="mv-bendnotes" disabled={de.bendLines === false} checked={de.bendLines !== false && !!de.bendNotes} onChange={(e) => st.setDrawingEdit({ bendNotes: e.target.checked })} /> Bend notes</label>
          <p className="k-muted">Bend lines show when the model's Flat-Pattern is unsuppressed; the note gives the bend direction, angle and radius.</p>
        </Section>
      )}
      <Section title="Scale">
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="mvscale" checked={!de.useCustomScale} onChange={() => st.setDrawingEdit({ useCustomScale: false })} /> Use sheet scale</label>
          <label className="k-check"><input type="radio" name="mvscale" checked={de.useCustomScale} onChange={() => st.setDrawingEdit({ useCustomScale: true })} /> Use custom scale</label>
        </div>
        {de.useCustomScale && (
          <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
            <select className="k-input" value={`${de.scale[0]}:${de.scale[1]}`} onChange={(e) => { const [n, d] = e.target.value.split(':').map(Number); st.setDrawingEdit({ scale: [n, d] }); }}>
              {['1:1', '1:2', '1:4', '1:5', '1:10', '2:1', '4:1', '5:1', '10:1'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
      </Section>
      <Section title="Dimension Type" defaultOpen={false}>
        <label className="k-check"><input type="radio" name="dt" checked={!de.trueDims} onChange={() => st.setDrawingEdit({ trueDims: false })} /> Projected</label>
        <label className="k-check"><input type="radio" name="dt" checked={!!de.trueDims} onChange={() => st.setDrawingEdit({ trueDims: true })} /> True</label>
      </Section>
    </div>
  );
}

/** Projected View Property Panel. */
export function ProjectedViewPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, doc: s.doc, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit })));
  const de = st.drawingEdit;
  if (!de) return null;
  const parent = st.doc.sheets?.[0]?.views.find((v) => v.id === de.parentId);
  return (
    <div className="k-pm">
      <Header title="Projected View" icon={<Icon.ProjectedView />} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">Move the cursor above, below, left or right of the selected view and click to place the projection. Press Esc when done.</p>
      </Section>
      <Section title="Reference Configuration">{parent ? <ConfigSelect model={parent.model} value={de.configuration ?? parent.configuration} onChange={(n) => st.setDrawingEdit({ configuration: n })} /> : null}</Section>
      <Section title="Arrow"><label className="k-check"><input type="checkbox" data-testid="pv-arrow" checked={!!de.projArrow} onChange={(e) => st.setDrawingEdit({ projArrow: e.target.checked })} /> Arrow</label></Section>
      <Section title="Display State" defaultOpen={false}><div className="k-selbox" style={{ minHeight: 22 }}><div className="k-selbox-row">{`<${de.configuration ?? parent?.configuration ?? 'Default'}>_Display State 1`}</div></div></Section>
      <Section title="Display Style">
        <div className="k-pm-typegrid k-pm-stylegrid">
          {STYLES.map((s) => (
            <button key={s.id} className={`k-pm-typebtn ${(de.useParentStyle !== false ? parent?.displayStyle : de.displayStyle) === s.id ? 'active' : ''}`} title={s.label} disabled={de.useParentStyle !== false} onClick={() => st.setDrawingEdit({ displayStyle: s.id })}>{s.icon}</button>
          ))}
        </div>
        <label className="k-check"><input type="checkbox" data-testid="pv-parentstyle" checked={de.useParentStyle !== false} onChange={(e) => st.setDrawingEdit({ useParentStyle: e.target.checked, displayStyle: parent?.displayStyle ?? de.displayStyle })} /> Use parent style</label>
      </Section>
      <Section title="Scale">
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="pvscale" checked={(de.scaleMode ?? 'parent') === 'parent'} onChange={() => st.setDrawingEdit({ scaleMode: 'parent' })} /> Use parent scale</label>
          <label className="k-check"><input type="radio" name="pvscale" checked={de.scaleMode === 'sheet'} onChange={() => st.setDrawingEdit({ scaleMode: 'sheet' })} /> Use sheet scale</label>
          <label className="k-check"><input type="radio" name="pvscale" data-testid="pv-custom" checked={de.scaleMode === 'custom'} onChange={() => st.setDrawingEdit({ scaleMode: 'custom' })} /> Use custom scale</label>
        </div>
        {de.scaleMode === 'custom' && (
          <select className="k-input" value={`${de.scale[0]}:${de.scale[1]}`} onChange={(e) => { const [a, b] = e.target.value.split(':').map(Number); st.setDrawingEdit({ scale: [a, b] }); }}>
            {['1:1', '1:2', '1:4', '1:5', '1:10', '2:1', '4:1', '5:1', '10:1'].map((x) => <option key={x}>{x}</option>)}
          </select>
        )}
      </Section>
    </div>
  );
}

/** Section View Property Panel (Section View Assist): Section / Half Section, Cutting Line, then the view options. */
export function SectionViewDrawingPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit, doc: s.doc })));
  const de = st.drawingEdit;
  if (!de) return null;
  const placed = de.sectionAt !== undefined;
  return (
    <div className="k-pm" data-testid="section-view-pm">
      <Header title="Section View" icon={<Icon.SectionView />} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">{placed ? 'Click in the sheet to place the section view. Flip Direction turns the view around.' : 'Select a cutting line and click in a drawing view to place it.'}</p>
      </Section>
      <div className="k-pm-tabs"><button className={de.sectionHalf ? '' : 'active'} disabled={placed} onClick={() => st.setDrawingEdit({ sectionHalf: undefined })}>Section</button><button className={de.sectionHalf ? 'active' : ''} data-testid="sv-half" disabled={placed} onClick={() => st.setDrawingEdit({ sectionHalf: 'top' })}>Half Section</button></div>
      {de.sectionHalf && (
        <Section title="Half Section">
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${de.sectionHalf === 'top' ? 'active' : ''}`} data-tip="Top Side" onClick={() => st.setDrawingEdit({ sectionHalf: 'top' })}>⌐</button>
            <button className={`k-pm-stylebtn k-tip ${de.sectionHalf === 'bottom' ? 'active' : ''}`} data-tip="Bottom Side" onClick={() => st.setDrawingEdit({ sectionHalf: 'bottom' })}>L</button>
          </div>
        </Section>
      )}
      <Section title="Cutting Line">
        <div className="k-pm-stylerow">
          <button className={`k-pm-stylebtn k-tip ${de.sectionAxis === 'v' ? 'active' : ''}`} data-tip="Vertical" disabled={placed} onClick={() => st.setDrawingEdit({ sectionAxis: 'v' })}>|</button>
          <button className={`k-pm-stylebtn k-tip ${de.sectionAxis === 'h' ? 'active' : ''}`} data-tip="Horizontal" disabled={placed} onClick={() => st.setDrawingEdit({ sectionAxis: 'h' })}>—</button>

        </div>
        <PrefCheck k="drawing.autoStartSection" label="Auto-start section view" testid="sv-autostart" />
        {de.sectionHold && <button className="k-btn" data-testid="sv-place" style={{ marginTop: 4 }} onClick={() => st.setDrawingEdit({ sectionHold: false })}>Place section view</button>}
      </Section>
      <Section title="Section Line">
        <label className="k-check"><input type="checkbox" checked={!!de.sectionFlip} onChange={(e) => st.setDrawingEdit({ sectionFlip: e.target.checked })} /> Flip Direction</label>
        <div className="k-field"><label>Label</label><span>{st.doc.sheets?.[0] ? nextLabel(st.doc.sheets[0]) : 'A'}</span></div>
      </Section>
      <Section title="Section View" defaultOpen={false}>
        <label className="k-check"><input type="checkbox" data-testid="sv-partial" checked={!!de.sectionDepth} onChange={(e) => st.setDrawingEdit({ sectionDepth: e.target.checked ? 10 : undefined })} /> Partial section</label>
        {!!de.sectionDepth && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 40 }}>Depth</span><NumberField value={de.sectionDepth} onChange={(v) => st.setDrawingEdit({ sectionDepth: Math.max(0.1, v) })} unit="mm" step={1} /></div>}
        <label className="k-check"><input type="checkbox" data-testid="sv-slice" checked={!!de.sectionSlice} onChange={(e) => st.setDrawingEdit({ sectionSlice: e.target.checked })} /> Slice section</label>
        <label className="k-check"><input type="checkbox" data-testid="sv-autohatch" checked={!!de.sectionAutoHatch} onChange={(e) => st.setDrawingEdit({ sectionAutoHatch: e.target.checked })} /> Auto hatching</label>
      </Section>
      <Section title="Scale" defaultOpen={false}>
        <div className="k-pm-radios"><label className="k-check"><input type="radio" name="svscale" checked={!de.useCustomScale} onChange={() => st.setDrawingEdit({ useCustomScale: false })} /> Use parent scale</label><label className="k-check"><input type="radio" name="svscale" data-testid="sv-customscale" checked={de.useCustomScale} onChange={() => st.setDrawingEdit({ useCustomScale: true, scale: de.scale ?? [1, 1] })} /> Use custom scale</label></div>
        {de.useCustomScale && (
          <select className="k-input" data-testid="sv-scale" value={`${de.scale[0]}:${de.scale[1]}`} onChange={(e) => { const [a, b] = e.target.value.split(':').map(Number); st.setDrawingEdit({ scale: [a, b] }); }}>
            {['1:1', '1:2', '1:5', '1:10', '2:1', '5:1'].map((x) => <option key={x} value={x}>{x.replace(':', ' : ')}</option>)}
          </select>
        )}
      </Section>
    </div>
  );
}

/** Detail View Property Panel: Detail Circle (style, label), Detail View (outline), Scale. */
export function DetailViewPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit, doc: s.doc })));
  const de = st.drawingEdit;
  if (!de) return null;
  return (
    <div className="k-pm" data-testid="detail-view-pm">
      <Header title="Detail View" icon={<Icon.DetailView />} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">{!de.detailCenter ? (de.detailProfile ? 'Click the centre of the detail profile (a rectangle) in a drawing view.' : 'Click the centre of the detail circle in a drawing view.') : !de.detailRadius ? (de.detailProfile ? 'Click a corner of the rectangle.' : 'Click to set the radius.') : 'Click in the sheet to place the detail view.'}</p>
      </Section>
      <Section title="Detail Circle">
        <select className="k-input" data-testid="dv-style" value={de.detailStyle ?? 'perStandard'} onChange={(e) => st.setDrawingEdit({ detailStyle: e.target.value as 'perStandard' })}><option value="perStandard">Per Standard</option><option value="broken">Broken Circle</option><option value="leader">With Leader</option><option value="noLeader">No Leader</option><option value="connected">Connected</option></select>
        <div className="k-pm-radios"><label className="k-check"><input type="radio" name="dcshape" checked={!de.detailProfile} disabled={!!de.detailCenter} onChange={() => st.setDrawingEdit({ detailProfile: false })} /> Circle</label><label className="k-check"><input type="radio" name="dcshape" data-testid="dv-profile" checked={!!de.detailProfile} disabled={!!de.detailCenter} onChange={() => st.setDrawingEdit({ detailProfile: true })} /> Profile</label></div>
        <div className="k-field"><label>Label</label><span>{st.doc.sheets?.[0] ? nextLabel(st.doc.sheets[0]) : 'B'}</span></div>
      </Section>
      <Section title="Detail View" defaultOpen={false}>
        <label className="k-check"><input type="checkbox" checked={(de.detailOutline ?? 'none') === 'none'} onChange={() => st.setDrawingEdit({ detailOutline: 'none' })} /> No outline</label>
        <label className="k-check"><input type="checkbox" data-testid="dv-full" checked={de.detailOutline === 'full'} onChange={(e) => st.setDrawingEdit({ detailOutline: e.target.checked ? 'full' : 'none' })} /> Full outline</label>
        <label className="k-check"><input type="checkbox" data-testid="dv-jagged" checked={de.detailOutline === 'jagged'} onChange={(e) => st.setDrawingEdit({ detailOutline: e.target.checked ? 'jagged' : 'none' })} /> Jagged outline</label>
        <label className="k-check"><input type="checkbox" data-testid="dv-pin" checked={de.detailPinned !== false} onChange={(e) => st.setDrawingEdit({ detailPinned: e.target.checked })} /> Pin position</label>
      </Section>
      <Section title="Scale">
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="dvscale" checked={!de.useCustomScale} onChange={() => st.setDrawingEdit({ useCustomScale: false })} /> Use sheet scale × 2</label>
          <label className="k-check"><input type="radio" name="dvscale" checked={de.useCustomScale} onChange={() => st.setDrawingEdit({ useCustomScale: true })} /> Use custom scale</label>
        </div>
        {de.useCustomScale && (
          <select className="k-input" value={`${de.scale[0]}:${de.scale[1]}`} onChange={(e) => { const [a, b] = e.target.value.split(':').map(Number); st.setDrawingEdit({ scale: [a, b] }); }}>
            {['2:1', '4:1', '5:1', '10:1', '1:1'].map((x) => <option key={x} value={x}>{x.replace(':', ' : ')}</option>)}
          </select>
        )}
      </Section>
    </div>
  );
}

function nextLabel(sheet: import('../../core/document/types').DrawingSheet): string {
  const used = new Set(sheet.views.map((v) => v.section?.label ?? v.detail?.label).filter(Boolean) as string[]);
  for (const ch of 'ABCDEFGHJKLMNPRSTUVWXYZ') if (!used.has(ch)) return ch;
  return 'Z';
}

/** Dimension Property Panel of a drawing (Value / Leaders / Other tabs by design, reduced). */
export function DrawingDimensionPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, doc: s.doc, selectedDrawingDimensionId: s.selectedDrawingDimensionId, updateDrawingDimension: s.updateDrawingDimension, selectDrawingDimension: s.selectDrawingDimension, cancelDrawingEdit: s.cancelDrawingEdit, prefs: s.prefs, setPrefs: s.setPrefs })));
  const de = st.drawingEdit;
  const sheet = st.doc.sheets?.[0];
  const sel = sheet?.dimensions.find((d) => d.id === st.selectedDrawingDimensionId);
  const [tab, setTab] = useState<'value' | 'leaders' | 'other'>('value');
  const up = (patch: Partial<NonNullable<typeof sel>>, undoable = true) => sel && st.updateDrawingDimension(sel.id, patch, undoable);
  return (
    <div className="k-pm">
      <Header title="Dimension" icon={<Icon.Dimension />} onOk={sel && !de ? () => st.selectDrawingDimension(null) : undefined} onCancel={() => { st.cancelDrawingEdit(); st.selectDrawingDimension(null); }} />
      <div className="k-pm-tabs">
        {(['value', 'leaders', 'other'] as const).map((t) => <button key={t} className={tab === t ? 'active' : ''} data-testid={`dim-tab-${t}`} onClick={() => setTab(t)}>{t === 'value' ? 'Value' : t === 'leaders' ? 'Leaders' : 'Other'}</button>)}
      </div>
      <Section title="Message">
        <p className="k-pm-message">{sel ? 'Change the selected dimension; drag its text on the sheet to move it.' : de?.dimStart ? 'Click to place the dimension.' : 'Select an edge or a circle of a drawing view to dimension it.'}</p>
      </Section>
      {tab === 'value' && (
        <>
          <Section title="Tolerance/Precision">
            <div className="k-field"><label>Tolerance type:</label><select className="k-input" data-testid="dim-tol" disabled={!sel} value={sel?.tol?.type ?? 'none'} onChange={(e) => sel && up({ tol: { plus: sel.tol?.plus ?? 0.1, minus: sel.tol?.minus ?? 0.1, type: e.target.value as 'none' } })}>{[['none', 'None'], ['basic', 'Basic'], ['bilateral', 'Bilateral'], ['limit', 'Limit'], ['symmetric', 'Symmetric'], ['min', 'MIN'], ['max', 'MAX']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            {sel?.tol && (sel.tol.type === 'bilateral' || sel.tol.type === 'limit' || sel.tol.type === 'symmetric') && (
              <>
                <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>+</span><NumberField value={sel.tol.plus} onChange={(v) => up({ tol: { ...sel.tol!, plus: Math.abs(v) } })} unit={st.doc.units} step={0.01} /></div>
                {sel.tol.type !== 'symmetric' && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 18 }}>−</span><NumberField value={sel.tol.minus} onChange={(v) => up({ tol: { ...sel.tol!, minus: Math.abs(v) } })} unit={st.doc.units} step={0.01} /></div>}
              </>
            )}
            <div className="k-field"><label>Unit precision:</label>{sel ? (
              <select className="k-input" data-testid="dim-precision" value={String(sel.precision ?? -1)} onChange={(e) => up({ precision: Number(e.target.value) < 0 ? undefined : Number(e.target.value) })}><option value="-1">(Document)</option>{['None', '.1', '.12', '.123', '.1234'].map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
            ) : (
              <select className="k-input" value={String(st.prefs['doc.lengthDecimals'])} onChange={(e) => st.setPrefs({ ...st.prefs, 'doc.lengthDecimals': e.target.value })}>{['None', '.1', '.12', '.123', '.1234'].map((d) => <option key={d}>{d}</option>)}</select>
            )}</div>
          </Section>
          <Section title="Primary Value">
            {sel ? (
              <div className="k-pm-valuerow k-tip" data-tip="A reference dimension: it follows the model"><NumberField value={sel.value} onChange={(v) => v} unit={st.doc.units} disabled /></div>
            ) : <span className="k-muted">No dimension selected.</span>}
            <label className="k-check"><input type="checkbox" data-testid="dim-override" disabled={!sel} checked={sel?.override !== undefined} onChange={(e) => sel && up({ override: e.target.checked ? sel.value.toFixed(2) : undefined })} /> Override value</label>
            {sel?.override !== undefined && <input className="k-input" data-testid="dim-override-text" value={sel.override} onChange={(e) => up({ override: e.target.value }, false)} onBlur={() => up({}, true)} onKeyDown={(e) => e.stopPropagation()} />}
          </Section>
          <Section title="Dimension Text" defaultOpen={!!sel?.prefix || !!sel?.suffix}>
            <div className="k-pm-xyrow"><input className="k-input" placeholder="prefix" data-testid="dim-prefix" disabled={!sel} value={sel?.prefix ?? ''} onChange={(e) => up({ prefix: e.target.value || undefined }, false)} onKeyDown={(e) => e.stopPropagation()} /><span className="k-muted">{'<DIM>'}</span><input className="k-input" placeholder="suffix" disabled={!sel} value={sel?.suffix ?? ''} onChange={(e) => up({ suffix: e.target.value || undefined }, false)} onKeyDown={(e) => e.stopPropagation()} /></div>
          </Section>
          <Section title="Dual Dimension" defaultOpen={!!sel?.dual}><label className="k-check"><input type="checkbox" data-testid="dim-dual" disabled={!sel} checked={!!sel?.dual} onChange={(e) => up({ dual: e.target.checked })} /> Dual dimension</label></Section>
        </>
      )}
      {tab === 'leaders' && (
        <Section title="Witness/Leader Display">
          <div className="k-pm-radios">
            {([['outside', 'Outside'], ['inside', 'Inside'], ['smart', 'Smart']] as const).map(([k, l]) => <label key={k} className="k-check"><input type="radio" name="dimarrows" data-testid={`dim-arrows-${k}`} disabled={!sel} checked={(sel?.arrows ?? 'smart') === k} onChange={() => up({ arrows: k })} /> {l}</label>)}
          </div>
          <label className="k-check"><input type="checkbox" data-testid="dim-docarrow" disabled={!sel} checked={!sel?.secondArrow} onChange={(e) => up({ secondArrow: e.target.checked ? undefined : 'open' })} /> Use document second arrow</label>
          {sel?.secondArrow && <select className="k-input" data-testid="dim-secondarrow" value={sel.secondArrow} onChange={(e) => up({ secondArrow: e.target.value as 'open' })}><option value="closed">Closed filled</option><option value="open">Open</option><option value="dot">Dot</option><option value="slash">Slash</option></select>}
        </Section>
      )}
      {tab === 'other' && (
        <Section title="Text Fonts">
          <label className="k-check"><input type="checkbox" checked={sel?.fontSize === undefined} disabled={!sel} onChange={(e) => up({ fontSize: e.target.checked ? undefined : 5 })} /> Use document font</label>
          {sel?.fontSize !== undefined && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 40 }}>Height</span><NumberField value={sel.fontSize} onChange={(v) => up({ fontSize: Math.max(1, v) })} unit="mm" step={0.5} /></div>}
        </Section>
      )}
    </div>
  );
}

/** Note Property Panel (text entered here, placed with a click). */
export function NotePM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit, pushMessage: s.pushMessage })));
  const de = st.drawingEdit;
  // Style: saved note formats (favourites), kept between sessions
  const [noteStyles, setNoteStyles] = useState<Record<string, Partial<NonNullable<typeof de>>>>(() => { try { return JSON.parse(String(getPref('drawing.noteStyles') || '{}')); } catch { return {}; } });
  if (!de) return null;
  return (
    <div className="k-pm">
      <Header title="Note" icon={<Icon.Note />} onCancel={st.cancelDrawingEdit} />
      <div className="k-pm-message"><b>Message</b><p>{de.noteLeader === 'leader' ? (de.noteAnchor ? 'Click to place the note text.' : 'Click the point the leader points to.') : 'Type the note text, then click in the sheet to place it.'}</p></div>
      <Section title="Style">
        <div className="k-pm-valuerow">
          <select className="k-input" data-testid="note-style" value="" onChange={(e) => { const s = noteStyles[e.target.value]; if (s) st.setDrawingEdit(s); }}>
            <option value="">{'<NONE>'}</option>
            {Object.keys(noteStyles).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button className="k-btn ghost icon k-tip" data-tip="Add or Update a Style" data-testid="note-style-add" onClick={() => { const name = `Style${Object.keys(noteStyles).length + 1}`; const list = { ...noteStyles, [name]: { noteAlign: de.noteAlign, noteFont: de.noteFont, noteLeader: de.noteLeader, noteBorder: de.noteBorder } }; savePrefs({ ...loadPrefs(), 'drawing.noteStyles': JSON.stringify(list) }); setNoteStyles(list); st.pushMessage(`${name} saved.`); }}>+</button>
        </div>
      </Section>
      <Section title="Text Format">
        <textarea className="k-input" rows={3} value={de.noteText ?? ''} onChange={(e) => st.setDrawingEdit({ noteText: e.target.value })} onKeyDown={(e) => e.stopPropagation()} placeholder="NOTE TEXT" />
        <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
          {(['left', 'center', 'right'] as const).map((a) => <button key={a} data-testid={'note-align-' + a} className={`k-btn ghost icon k-tip${(de.noteAlign ?? 'left') === a ? ' active' : ''}`} data-tip={a[0].toUpperCase() + a.slice(1)} onClick={() => st.setDrawingEdit({ noteAlign: a })}>{a === 'left' ? <Icon.AlignLeft size={13} /> : a === 'center' ? <Icon.AlignCenter size={13} /> : <Icon.AlignRight size={13} />}</button>)}
          <label className="k-check" style={{ marginLeft: 8 }}><input type="checkbox" checked={!de.noteFont} onChange={(e) => st.setDrawingEdit({ noteFont: e.target.checked ? undefined : 5 })} /> Use document font</label>
        </div>
        {!!de.noteFont && <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 40 }}>Height</span><NumberField value={de.noteFont} onChange={(v) => st.setDrawingEdit({ noteFont: Math.max(1, v) })} unit="mm" step={0.5} /></div>}
      </Section>
      <Section title="Leader">
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="leader" data-testid="note-leader" checked={de.noteLeader === 'leader'} onChange={() => st.setDrawingEdit({ noteLeader: 'leader', noteAnchor: undefined })} /> Leader</label>
          <label className="k-check"><input type="radio" name="leader" checked={(de.noteLeader ?? 'none') === 'none'} onChange={() => st.setDrawingEdit({ noteLeader: 'none', noteAnchor: undefined })} /> No Leader</label>
          <label className="k-check"><input type="radio" name="leader" checked={de.noteLeader === 'auto'} onChange={() => st.setDrawingEdit({ noteLeader: 'auto', noteAnchor: undefined })} /> Auto Leader</label>
        </div>
      </Section>
      <Section title="Border" defaultOpen={!!de.noteBorder && de.noteBorder !== 'none'}><select className="k-input" data-testid="note-border" value={de.noteBorder ?? 'none'} onChange={(e) => st.setDrawingEdit({ noteBorder: e.target.value as 'none' })}><option value="none">None</option><option value="circular">Circular</option><option value="triangle">Triangle</option><option value="box">Box</option></select></Section>
    </div>
  );
}


/** Annotation Property Panels for the symbols: Balloon, Surface Finish, Geometric Tolerance, Datum Feature, Hole Callout, Centerline. */
export function SymbolPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit, doc: s.doc, addRevision: s.addRevision })));
  const de = st.drawingEdit;
  if (!de || de.mode !== 'symbol') return null;
  const titles: Record<string, string> = { balloon: 'Balloon', autoBalloon: 'Auto Balloon', surfaceFinish: 'Surface Finish', gtol: 'Geometric Tolerance', datum: 'Datum Feature', holeCallout: 'Hole Callout', centerline: 'Centerline', revision: 'Revision Symbol', cloud: 'Revision Cloud', weld: 'Weld Symbol', datumTarget: 'Datum Target', areaHatch: 'Area Hatch/Fill' };
  const SYMS = [['⏥', 'Flatness'], ['⏤', 'Straightness'], ['○', 'Circularity'], ['⌭', 'Cylindricity'], ['⊥', 'Perpendicularity'], ['∥', 'Parallelism'], ['∠', 'Angularity'], ['⌖', 'Position'], ['◎', 'Concentricity'], ['⌯', 'Symmetry'], ['↗', 'Circular Runout'], ['⌒', 'Profile of a Line']];
  return (
    <div className="k-pm" data-testid="symbol-pm">
      <Header title={titles[de.symbolKind ?? 'balloon']} icon={de.symbolKind === 'surfaceFinish' ? <Icon.SurfaceFinish /> : de.symbolKind?.includes('alloon') ? <Icon.Balloon /> : <Icon.Note />} onOk={st.cancelDrawingEdit} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">{de.symbolKind === 'areaHatch' ? 'Click a face in a drawing view to hatch it (ANSI31, scale 1).' : de.symbolKind === 'revision' ? 'Click to place the revision symbol of the current revision.' : de.symbolKind === 'cloud' ? 'Click two opposite corners of the revision cloud.' : de.symbolKind === 'centerline' ? 'Select two parallel edges for a centerline between them.' : de.symbolKind === 'autoBalloon' ? 'Click in a drawing view: every part gets a balloon with its item number.' : 'Click the geometry the leader points to, then click to place the annotation.'}</p>
      </Section>
      {de.symbolKind === 'autoBalloon' && (
        <Section title="Balloon Layout">
          <div className="k-pm-typegrid" data-testid="balloon-layout">
            {([['square', 'Layout Balloons to Square'], ['circular', 'Layout Balloons to Circular'], ['top', 'Layout Balloons to Top'], ['bottom', 'Layout Balloons to Bottom'], ['left', 'Layout Balloons to Left'], ['right', 'Layout Balloons to Right']] as const).map(([k, t]) => (
              <button key={k} className={`k-pm-typebtn${(de.balloonLayout ?? 'square') === k ? ' active' : ''}`} title={t} data-testid={`balloon-layout-${k}`} onClick={() => st.setDrawingEdit({ balloonLayout: k })}><BalloonLayoutIcon kind={k} /></button>
            ))}
          </div>
          <label className="k-check"><input type="checkbox" checked={de.ignoreMultiple !== false} onChange={(e) => st.setDrawingEdit({ ignoreMultiple: e.target.checked })} /> Ignore multiple instances</label>
          <label className="k-check"><input type="checkbox" data-testid="balloon-magnetic" checked={de.insertMagnetic !== false} onChange={(e) => st.setDrawingEdit({ insertMagnetic: e.target.checked })} /> Insert magnetic line(s)</label>
          <div className="k-pm-sub">Leader attachment</div>
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="balattach" checked={(de.balloonAttach ?? 'faces') === 'faces'} onChange={() => st.setDrawingEdit({ balloonAttach: 'faces' })} /> Faces</label>
            <label className="k-check"><input type="radio" name="balattach" data-testid="balloon-edges" checked={de.balloonAttach === 'edges'} onChange={() => st.setDrawingEdit({ balloonAttach: 'edges' })} /> Edges</label>
          </div>
        </Section>
      )}
      {(de.symbolKind === 'balloon' || de.symbolKind === 'autoBalloon') && (
        <Section title="Balloon Settings">
          <div className="k-field"><label>Style</label><select className="k-input" data-testid="balloon-shape" value={de.balloonShape ?? 'circular'} onChange={(e) => st.setDrawingEdit({ balloonShape: e.target.value as 'circular' })}><option value="circular">Circular</option><option value="triangle">Triangle</option><option value="box">Box</option></select></div>
          <div className="k-field"><label>Size</label><select className="k-input" value={de.balloonSize ?? '2'} onChange={(e) => st.setDrawingEdit({ balloonSize: e.target.value as '2' })}><option value="tight">Tight Fit</option><option value="1">1 Character</option><option value="2">2 Characters</option></select></div>
          <div className="k-field"><label>Balloon text</label><select className="k-input" data-testid="balloon-text" value={de.balloonText ?? 'item'} onChange={(e) => st.setDrawingEdit({ balloonText: e.target.value as 'item' })}><option value="item">Item Number</option><option value="quantity">Quantity</option><option value="custom">Custom</option></select></div>
          {de.balloonText === 'custom' && <input className="k-input" data-testid="balloon-custom" value={de.symbolText ?? ''} onChange={(e) => st.setDrawingEdit({ symbolText: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />}
        </Section>
      )}
      {de.symbolKind === 'surfaceFinish' && (
        <Section title="Symbol Layout">
          <div className="k-pm-label">Roughness Ra (µm):</div>
          <select className="k-input" value={de.finish ?? '3.2'} onChange={(e) => st.setDrawingEdit({ finish: e.target.value })} data-testid="finish-ra">
            {['0.4', '0.8', '1.6', '3.2', '6.3', '12.5', '25'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Section>
      )}
      {de.symbolKind === 'gtol' && (
        <Section title="Properties">
          <div className="k-pm-label">Symbol:</div>
          <select className="k-input" value={de.gtolSymbol ?? '⏥'} onChange={(e) => st.setDrawingEdit({ gtolSymbol: e.target.value })} data-testid="gtol-symbol">
            {SYMS.map(([c, l]) => <option key={c} value={c}>{c}  {l}</option>)}
          </select>
          <div className="k-pm-label">Tolerance 1:</div>
          <input className="k-input" value={de.gtolTol ?? ''} onChange={(e) => st.setDrawingEdit({ gtolTol: e.target.value })} data-testid="gtol-tol" />
          <div className="k-pm-label">Primary datum:</div>
          <input className="k-input" value={de.gtolDatum ?? ''} onChange={(e) => st.setDrawingEdit({ gtolDatum: e.target.value.toUpperCase() })} data-testid="gtol-datum" />
        </Section>
      )}
      {(de.symbolKind === 'weld' || de.symbolKind === 'datumTarget') && (
        <Section title={de.symbolKind === 'weld' ? 'Weld Symbol' : 'Settings'}>
          {de.symbolKind === 'weld' && <div className="k-field"><label>Contour</label><select className="k-input" data-testid="weld-contour" value={de.weldContour ?? 'fillet'} onChange={(e) => st.setDrawingEdit({ weldContour: e.target.value as 'fillet' })}><option value="fillet">Fillet</option><option value="square">Square</option><option value="vgroove">V-groove</option></select></div>}
          <div className="k-pm-label">{de.symbolKind === 'weld' ? 'Weld size (mm):' : 'Datum reference:'}</div>
          <input className="k-input" value={de.symbolText ?? (de.symbolKind === 'weld' ? '5' : 'A1')} onChange={(e) => st.setDrawingEdit({ symbolText: e.target.value })} data-testid="symbol-text" />
        </Section>
      )}
      {de.symbolKind === 'revision' && (
        <Section title="Revision">
          <div className="k-muted">Current revision: {(st.doc.sheets?.[0]?.revisions ?? []).slice(-1)[0]?.rev ?? '(none — A is started)'}</div>
          <button className="k-btn" style={{ marginTop: 4 }} data-testid="add-revision" onClick={() => st.addRevision('')}>Add Revision</button>
        </Section>
      )}
      {de.symbolKind === 'datum' && (
        <Section title="Label Settings">
          <div className="k-pm-label">Label:</div>
          <input className="k-input" value={de.symbolText ?? 'A'} onChange={(e) => st.setDrawingEdit({ symbolText: e.target.value.toUpperCase().slice(0, 2) })} />
        </Section>
      )}
    </div>
  );
}


/** Crop View / Break Property Panels */
export function ViewToolPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit, setViewBreak: s.setViewBreak, setViewCrop: s.setViewCrop })));
  const de = st.drawingEdit;
  if (!de || (de.mode !== 'crop' && de.mode !== 'break') || !de.viewTool) return null;
  const isBreak = de.mode === 'break';
  return (
    <div className="k-pm" data-testid="viewtool-pm">
      <Header title={isBreak ? 'Broken View' : 'Crop View'} icon={<Icon.Trim />} onOk={st.cancelDrawingEdit} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">{isBreak ? 'Click two places in the view: the part between them is taken out.' : 'Click two opposite corners: the view is cropped to that rectangle.'}</p>
      </Section>
      {isBreak && (
        <Section title="Broken View Settings">
          <div className="k-pm-stylerow">
            <button className={`k-pm-stylebtn k-tip ${de.viewTool.axis !== 'y' ? 'active' : ''}`} data-tip="Add vertical break line" onClick={() => st.setDrawingEdit({ viewTool: { ...de.viewTool!, axis: 'x' } })}>|</button>
            <button className={`k-pm-stylebtn k-tip ${de.viewTool.axis === 'y' ? 'active' : ''}`} data-tip="Add horizontal break line" onClick={() => st.setDrawingEdit({ viewTool: { ...de.viewTool!, axis: 'y' } })}>—</button>
          </div>
          <div className="k-field"><label>Gap size</label><NumberField value={de.breakGap ?? 6} onChange={(v) => st.setDrawingEdit({ breakGap: Math.max(1, v) })} unit="mm" step={1} /></div>
          <div className="k-field"><label>Break line style</label><select className="k-input" data-testid="break-style" value={de.breakStyle ?? 'zigzag'} onChange={(e) => st.setDrawingEdit({ breakStyle: e.target.value as 'zigzag' })}><option value="straight">Straight Cut</option><option value="curve">Curve Cut</option><option value="zigzag">Zig Zag Cut</option><option value="smallZigzag">Small Zig Zag Cut</option></select></div>
        </Section>
      )}
      <Section title="Remove">
        <button className="k-btn" onClick={() => (isBreak ? st.setViewBreak(de.viewTool!.viewId, undefined) : st.setViewCrop(de.viewTool!.viewId, undefined))}>{isBreak ? 'Un-Break View' : 'Remove Crop'}</button>
      </Section>
    </div>
  );
}


/** Auxiliary View Property Panel */
export function AuxViewPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit })));
  const de = st.drawingEdit;
  if (!de || de.mode !== 'aux') return null;
  return (
    <div className="k-pm" data-testid="aux-pm">
      <Header title="Auxiliary View" icon={<Icon.ProjectedView />} onOk={st.cancelDrawingEdit} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">{de.auxEdge ? 'Move the cursor to the side the view looks from and click to place it.' : 'Select a reference edge to continue. The view looks perpendicular to that edge.'}</p>
      </Section>
      <Section title="Arrow">
        <label className="k-check"><input type="checkbox" data-testid="aux-arrow" checked={de.auxArrow !== false} onChange={(e) => st.setDrawingEdit({ auxArrow: e.target.checked })} /> Arrow</label>
        <label className="k-check"><input type="checkbox" checked={de.auxLabel !== false} onChange={(e) => st.setDrawingEdit({ auxLabel: e.target.checked })} /> Label</label>
      </Section>
    </div>
  );
}


/** Model Items Property Panel (Source/Destination, Dimensions, Options), by design. */
export function ModelItemsPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, setDrawingEdit: s.setDrawingEdit, insertModelItems: s.insertModelItems, cancelDrawingEdit: s.cancelDrawingEdit })));
  const de = st.drawingEdit;
  if (!de || de.mode !== 'modelItems' || !de.modelItems) return null;
  const mi = de.modelItems;
  const set = (p: Partial<typeof mi>) => st.setDrawingEdit({ modelItems: { ...mi, ...p } });
  return (
    <div className="k-pm" data-testid="modelitems-pm">
      <Header title="Model Items" icon={<Icon.Dimension />} onOk={st.insertModelItems} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">Select the source and the annotations to import into the drawing views.</p>
      </Section>
      <Section title="Source/Destination">
        <div className="k-field"><label>Source</label>
          <select className="k-input" value={mi.source} onChange={(e) => set({ source: e.target.value as 'entire' | 'selected' })} data-testid="mi-source">
            <option value="entire">Entire model</option>
            <option value="selected">Selected view</option>
          </select>
        </div>
        <label className="k-check"><input type="checkbox" checked={mi.source === 'entire'} onChange={(e) => set({ source: e.target.checked ? 'entire' : 'selected' })} /> Import items into all views</label>
      </Section>
      <Section title="Dimensions">
        <div className="k-pm-stylerow">
          <button className={`k-pm-stylebtn k-tip ${mi.sketchDims ? 'active' : ''}`} data-tip="Marked for drawing" onClick={() => set({ sketchDims: !mi.sketchDims })} data-testid="mi-sketch"><Icon.Dimension size={16} /></button>
          <button className={`k-pm-stylebtn k-tip ${mi.featureDims ? 'active' : ''}`} data-tip="Not marked for drawing" onClick={() => set({ featureDims: !mi.featureDims })} data-testid="mi-feature"><Icon.Extrude size={16} /></button>
          <button className={`k-pm-stylebtn k-tip ${mi.holeDims ? 'active' : ''}`} data-tip="Hole Tool Locations" onClick={() => set({ holeDims: !mi.holeDims })} data-testid="mi-hole"><Icon.Hole size={16} /></button>
        </div>
        <label className="k-check"><input type="checkbox" data-testid="mi-dupes" checked={mi.eliminateDuplicates !== false} onChange={(e) => set({ eliminateDuplicates: e.target.checked })} /> Eliminate duplicates</label>
      </Section>
      <Section title="Options">
        <label className="k-check"><input type="checkbox" data-testid="mi-hidden" checked={!!mi.includeHidden} onChange={(e) => set({ includeHidden: e.target.checked })} /> Include items from hidden features</label>
        <label className="k-check"><input type="checkbox" data-testid="mi-placement" checked={mi.sketchPlacement !== false} onChange={(e) => set({ sketchPlacement: e.target.checked })} /> Use dimension placement in sketch</label>
      </Section>
    </div>
  );
}


/** Broken-out Section Property Panel: Depth (from the front of the model), Preview. */
export function BrokenOutPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, applyBrokenOut: s.applyBrokenOut, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit, doc: s.doc })));
  const de = st.drawingEdit;
  if (!de || de.mode !== 'brokenOut' || !de.brokenOut) return null;
  const bo = de.brokenOut;
  return (
    <div className="k-pm" data-testid="brokenout-pm">
      <Header title="Broken-out Section" icon={<Icon.SectionView />} onOk={bo.closed ? st.applyBrokenOut : undefined} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">{bo.closed ? 'Set the depth of the cut and click OK.' : 'Sketch a closed profile in the view: click its points, then click the first point again.'}</p>
      </Section>
      <Section title="Depth">
        <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={bo.depth} onChange={(v) => st.setDrawingEdit({ brokenOut: { ...bo, depth: Math.max(0.01, v) } })} unit={st.doc.units} step={1} min={0.01} /></div>
        <label className="k-check"><input type="checkbox" data-testid="bo-preview" disabled={!bo.closed} checked={!!de.brokenOutPreview} onChange={(e) => st.setDrawingEdit({ brokenOutPreview: e.target.checked })} /> Preview</label>
      </Section>
    </div>
  );
}


/** Property Panel of a placed drawing view (Drawing View1 …), shown when the view is clicked on the sheet, by design. */
export function DrawingViewPM() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, selectedDrawingViewId: s.selectedDrawingViewId, setManagerTab: s.setManagerTab, updateDrawingView: s.updateDrawingView, selectDrawingView: s.selectDrawingView, startModelItems: s.startModelItems, setDrawingEdit: s.setDrawingEdit })));
  const sheet = st.doc.sheets?.[0];
  const v = sheet?.views.find((x) => x.id === st.selectedDrawingViewId);
  if (!sheet || !v) return null;
  const close = () => st.setManagerTab('tree');
  const parentScale = !!(v.section || v.detail || v.aux);
  const custom = !!v.scale;
  const scale = v.scale ?? sheet.scale;
  // Use parent scale: the section / detail / auxiliary view at the scale of the view it comes from
  const parentId = v.section?.parentId ?? v.detail?.parentId ?? v.aux?.parentId;
  const pv = parentId ? sheet.views.find((x) => x.id === parentId) : undefined;
  const parentSc: [number, number] | undefined = pv ? [...(pv.scale ?? sheet.scale)] as [number, number] : undefined;
  const onParent = !!(parentScale && parentSc && !v.detail && scale[0] === parentSc[0] && scale[1] === parentSc[1]);
  return (
    <div className="k-pm" data-testid="drawingview-pm">
      <Header title={v.name} icon={<Icon.ModelView />} onOk={close} onCancel={close} />
      {v.predefined && (
        <Section title="Insert Model">
          <p className="k-pm-message">This predefined view has no model yet.</p>
          {sheetModels(st.doc).length ? sheetModels(st.doc).map((m, i) => <button key={i} className="k-btn" data-testid="insert-model" onClick={() => insertModelInView(v.id, m)}>Insert {m.name}</button>) : <span className="k-muted">Insert a model view first; its model can then fill this view.</span>}
        </Section>
      )}
      <Section title="Reference Configuration" defaultOpen={false}>
        <ConfigSelect model={v.model} value={v.configuration} onChange={(n) => st.updateDrawingView(v.id, { configuration: n, model: documentForConfiguration(v.model, n) })} />
      </Section>
      <Section title="Orientation" defaultOpen={false}>
        <div className="k-muted">{v.section ? 'Section view' : v.detail ? 'Detail view' : v.aux ? 'Auxiliary view' : v.type.charAt(0).toUpperCase() + v.type.slice(1)}</div>
      </Section>
      <Section title="Import options" defaultOpen={false}>
        <button className="k-btn" data-testid="dv-import" onClick={() => { st.selectDrawingView(v.id); st.startModelItems(); const de2 = useStore.getState().drawingEdit; if (de2?.modelItems) st.setDrawingEdit({ modelItems: { ...de2.modelItems, source: 'selected' } }); }}>Import annotations…</button>
      </Section>
      <Section title="Display State" defaultOpen={false}>
        <div className="k-selbox" style={{ minHeight: 22 }}><div className="k-selbox-row">{`<${v.configuration ?? configurations(v.model)[0].name}>_Display State 1`}</div></div>
      </Section>
      <Section title="Display Style">
        <div className="k-pm-typegrid k-pm-stylegrid">
          {STYLES.map((s) => (
            <button key={s.id} className={`k-pm-typebtn k-tip ${v.displayStyle === s.id ? 'active' : ''}`} data-tip={s.label} data-style={s.id} onClick={() => st.updateDrawingView(v.id, { displayStyle: s.id })}>{s.icon}</button>
          ))}
        </div>
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="dvq" checked={!v.draftQuality} onChange={() => st.updateDrawingView(v.id, { draftQuality: undefined })} /> High quality</label>
          <label className="k-check"><input type="radio" name="dvq" data-testid="dv-draft" checked={!!v.draftQuality} onChange={() => st.updateDrawingView(v.id, { draftQuality: true })} /> Draft quality</label>
        </div>
      </Section>
      <Section title="Scale">
        <div className="k-pm-radios">
          {parentScale && <label className="k-check"><input type="radio" name="dvsc" data-testid="dv-parentscale" checked={onParent} onChange={() => st.updateDrawingView(v.id, { scale: parentSc })} /> Use parent scale</label>}
          <label className="k-check"><input type="radio" name="dvsc" checked={!custom && !onParent} onChange={() => st.updateDrawingView(v.id, { scale: undefined })} /> Use sheet scale</label>
          <label className="k-check"><input type="radio" name="dvsc" checked={custom && !onParent} onChange={() => st.updateDrawingView(v.id, { scale: [...sheet.scale] as [number, number] })} /> Use custom scale</label>
        </div>
        {custom && (
          <div className="k-pm-valuerow" style={{ marginTop: 4 }}>
            <select className="k-input" data-testid="dv-scale" value={`${scale[0]}:${scale[1]}`} onChange={(e) => { const [n, d] = e.target.value.split(':').map(Number); st.updateDrawingView(v.id, { scale: [n, d] }); }}>
              {['1:1', '1:2', '1:4', '1:5', '1:10', '2:1', '4:1', '5:1', '10:1'].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        )}
      </Section>
      <Section title="Dimension Type" defaultOpen={false}>
        <label className="k-check"><input type="radio" name="dvdt" checked={!v.trueDims} onChange={() => st.updateDrawingView(v.id, { trueDims: undefined })} /> Projected</label>
        <label className="k-check"><input type="radio" name="dvdt" data-testid="dv-true" checked={!!v.trueDims} onChange={() => st.updateDrawingView(v.id, { trueDims: true })} /> True</label>
      </Section>
      <Section title="Cosmetic Thread Display" defaultOpen={false}>
        <label className="k-check"><input type="radio" name="dvct" checked={!v.threadDraft} onChange={() => st.updateDrawingView(v.id, { threadDraft: undefined })} /> High quality</label>
        <label className="k-check"><input type="radio" name="dvct" data-testid="dv-threaddraft" checked={!!v.threadDraft} onChange={() => st.updateDrawingView(v.id, { threadDraft: true })} /> Draft quality</label>
      </Section>
    </div>
  );
}


/** Sheet Format ▸ Title Block Fields: the fields of the title block (names, date, title, drawing number, company). */
export function TitleBlockPM() {
  const st = useStore(useShallow((s) => ({ doc: s.doc, drawingEdit: s.drawingEdit, setSheet: s.setSheet, cancelDrawingEdit: s.cancelDrawingEdit })));
  const sheet = st.doc.sheets?.[0];
  if (!sheet || st.drawingEdit?.mode !== 'titleBlock') return null;
  const tb = sheet.titleBlock ?? {};
  const set = (k: keyof NonNullable<typeof sheet.titleBlock>, v: string) => st.setSheet({ titleBlock: { ...tb, [k]: v } });
  const fields: [keyof NonNullable<typeof sheet.titleBlock>, string][] = [['company', 'Company'], ['title', 'Title'], ['dwgNo', 'DWG NO.'], ['drawnBy', 'Drawn (name)'], ['drawnDate', 'Drawn (date)'], ['checkedBy', "Chk'd (name)"], ['approvedBy', "Appv'd (name)"]];
  return (
    <div className="k-pm" data-testid="titleblock-pm">
      <Header title={st.drawingEdit?.editFormat ? 'Edit Sheet Format' : 'Title Block Fields'} icon={<Icon.Note />} onOk={st.cancelDrawingEdit} onCancel={st.cancelDrawingEdit} />
      <Section title="Message">
        <p className="k-pm-message">The fields are linked to the sheet; empty fields fall back to the model name and the drawing name.</p>
      </Section>
      {st.drawingEdit?.editFormat && (
        <Section title="Sheet Format">
          <label className="k-check"><input type="checkbox" data-testid="fmt-zones" checked={sheet.format?.zones !== false} onChange={(e) => st.setSheet({ format: { zones: e.target.checked, margin: sheet.format?.margin ?? 10 } })} /> Show zone labels</label>
          <label className="k-check"><input type="checkbox" checked={sheet.showFormat} onChange={(e) => st.setSheet({ showFormat: e.target.checked })} /> Show title block</label>
        </Section>
      )}
      <Section title="Title Block Fields">
        {fields.map(([k, label]) => (
          <div key={k} className="k-field"><label>{label}</label><input className="k-input" data-testid={`tb-${k}`} value={tb[k] ?? ''} onChange={(e) => set(k, e.target.value)} onKeyDown={(e) => e.stopPropagation()} /></div>
        ))}
      </Section>
    </div>
  );
}


/** Alternate Position View Property Panel: a new configuration from the exploded view or the motion study. */
export function AltPositionPM() {
  const st = useStore(useShallow((s) => ({ drawingEdit: s.drawingEdit, doc: s.doc, applyAltPosition: s.applyAltPosition, cancelDrawingEdit: s.cancelDrawingEdit, setDrawingEdit: s.setDrawingEdit })));
  const de = st.drawingEdit;
  if (!de || de.mode !== 'altPosition' || !de.altPosition) return null;
  const ap = de.altPosition;
  const v = st.doc.sheets?.[0]?.views.find((x) => x.id === ap.viewId);
  const study = v?.model.motionStudy;
  return (
    <div className="k-pm" data-testid="altpos-pm">
      <Header title="Alternate Position" icon={<Icon.ModelView />} onOk={st.applyAltPosition} onCancel={st.cancelDrawingEdit} />
      <Section title="Configuration">
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="altcfg" checked={!de.altExisting} onChange={() => st.setDrawingEdit({ altExisting: undefined })} /> New configuration</label>
          <input className="k-input" data-testid="altpos-name" disabled={!!de.altExisting} value={de.altName ?? 'AltPosition_Default_1'} onChange={(e) => st.setDrawingEdit({ altName: e.target.value })} onKeyDown={(e) => e.stopPropagation()} />
          <label className="k-check"><input type="radio" name="altcfg" checked={!!de.altExisting} disabled={!v || configurations(v.model).length < 2} onChange={() => v && st.setDrawingEdit({ altExisting: configurations(v.model).find((c) => c.name !== v.configuration)?.name })} /> Existing configuration</label>
          {de.altExisting && v && <select className="k-input" value={de.altExisting} onChange={(e) => st.setDrawingEdit({ altExisting: e.target.value })}>{configurations(v.model).map((c) => <option key={c.id}>{c.name}</option>)}</select>}
        </div>
      </Section>
      <Section title="Position">
        <select className="k-input" value={ap.source} data-testid="altpos-source" onChange={(e) => st.setDrawingEdit({ altPosition: { ...ap, source: e.target.value as 'exploded' | 'motion' } })}>
          <option value="motion" disabled={!study?.motors.length}>{study?.name ?? 'Motion Study 1'}</option>
          <option value="exploded" disabled={!(v?.model.explodeSteps ?? []).length}>Exploded view</option>
        </select>
        {ap.source === 'motion' && (
          <div className="k-pm-valuerow"><span className="k-muted" style={{ minWidth: 30 }}>Time</span><NumberField value={ap.time} onChange={(t) => st.setDrawingEdit({ altPosition: { ...ap, time: Math.max(0, Math.min(study?.duration ?? 5, t)) } })} unit=" sec" step={0.25} /></div>
        )}
      </Section>
    </div>
  );
}

/** the small layout pictures of Auto Balloon ▸ Balloon Layout: a view box with balloons around it */
function BalloonLayoutIcon({ kind }: { kind: 'square' | 'circular' | 'top' | 'bottom' | 'left' | 'right' }) {
  const pts: [number, number][] = kind === 'square' ? [[4, 4], [20, 4], [4, 20], [20, 20]] : kind === 'circular' ? [[12, 2.5], [21.5, 12], [12, 21.5], [2.5, 12]] : kind === 'top' ? [[5, 3.5], [12, 3.5], [19, 3.5]] : kind === 'bottom' ? [[5, 20.5], [12, 20.5], [19, 20.5]] : kind === 'left' ? [[3.5, 5], [3.5, 12], [3.5, 19]] : [[20.5, 5], [20.5, 12], [20.5, 19]];
  return (
    <svg width={22} height={22} viewBox="0 0 24 24">
      <rect x={8} y={8} width={8} height={8} fill="#cfd8e3" stroke="#5a6b80" strokeWidth={0.8} />
      {pts.map(([x, y], i) => <g key={i}><line x1={x} y1={y} x2={12} y2={12} stroke="#5a6b80" strokeWidth={0.6} /><circle cx={x} cy={y} r={2.4} fill="#fff" stroke="#1e6fd9" strokeWidth={0.9} /></g>)}
    </svg>
  );
}
