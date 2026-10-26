import { useState } from 'react';
import { useStore } from '../store';
import { NumberField, Section } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { refGeometryFrom } from '../../core/features/refgeom';

const TITLE = { axis: 'Axis', point: 'Point', csys: 'Coordinate System' } as const;
const MODES = {
  axis: ['One Line/Edge/Axis', 'Two Planes', 'Two Points/Vertices', 'Cylindrical/Conical Face', 'Point and Face/Plane'],
  point: ['Arc Center', 'Center of Face', 'Intersection', 'Projection', 'On Point', 'Along Curve Distance (50%)'],
  csys: ['Origin', 'X Axis', 'Y Axis', 'Z Axis'],
} as const;

/**
 * Reference Geometry ▸ Axis / Point / Coordinate System, by design: a Selections box with the picked
 * edges, faces and planes, the definition the selection gives (highlighted), and the name.
 */
export function RefGeomPM() {
  const st = useStore();
  const re = st.refEdit;
  if (!re) return null;
  const sel = st.refSelection();
  const preview = refGeometryFrom(re.kind, sel, 'preview', re.name);
  const items = [
    ...st.selectedEdges.map((_, i) => `Edge<${i + 1}>`),
    ...(st.selectedFaces.length ? st.selectedFaces : st.selectedFace ? [st.selectedFace] : []).map((_, i) => `Face<${i + 1}>`),
    ...sel.planes.map((p) => p.name),
  ];
  const Ic = re.kind === 'axis' ? Icon.Line : re.kind === 'point' ? Icon.Point : Icon.Origin;
  return (
    <div className="k-pm" data-testid="refgeom-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Ic /> <b>{TITLE[re.kind]}</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="refgeom-ok" disabled={!preview} onClick={st.commitRefGeom}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={st.cancelRefGeom}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Message">
        <p className="k-pm-message">{preview ? `Fully defined (${preview.how})` : re.kind === 'axis' ? 'Select a straight edge, a circular edge or cylindrical face, or two planes (tree).' : re.kind === 'point' ? 'Select a circular edge, a face or an edge.' : 'Select the origin (circular edge or face) and an edge for the X direction.'}</p>
      </Section>
      <Section title="Selections">
        <div className="k-selbox" data-testid="refgeom-sel" style={{ minHeight: 56 }}>
          {items.length ? items.map((t, i) => <div key={i} className="k-selbox-item">{t}</div>) : <span className="k-muted">Select edges, faces or planes</span>}
        </div>
        <div className="k-pm-stylerow" style={{ flexWrap: 'wrap', marginTop: 6 }}>
          {MODES[re.kind].map((m) => (
            <span key={m} className={`k-chip ${preview?.how === m ? 'active' : ''}`} title={m}>{m}</span>
          ))}
        </div>
      </Section>
      <Section title="Name">
        <input className="k-input" value={re.name} onChange={(e) => useStore.setState({ refEdit: { ...re, name: e.target.value } })} onKeyDown={(e) => e.stopPropagation()} />
      </Section>
    </div>
  );
}

/** Offset On Surface, by design: the faces (or edges) to offset, the distance and Reverse. */
export function OffsetOnSurfacePM() {
  const st = useStore();
  const e = st.offsetSurfEdit;
  if (!e) return null;
  const faces = st.selectedFaces.length ? st.selectedFaces : st.selectedFace ? [st.selectedFace] : [];
  return (
    <div className="k-pm" data-testid="offsetsurf-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Icon.Offset /> <b>Offset On Surface</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="offsetsurf-ok" disabled={!faces.length} onClick={st.commitOffsetOnSurface}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={() => st.setOffsetSurfEdit(null)}><Icon.Close /></button>
        </div>
      </div>
      <Section title="Parameters">
        <div className="k-pm-valuerow"><Icon.Dimension size={14} /><NumberField value={e.distance} onChange={(v) => st.setOffsetSurfEdit({ ...e, distance: Math.max(0.01, v) })} unit={st.doc.units} step={1} autoFocus /></div>
        <label className="k-check"><input type="checkbox" checked={e.reverse} onChange={(x) => st.setOffsetSurfEdit({ ...e, reverse: x.target.checked })} /> Reverse</label>
        <div className="k-selbox" style={{ minHeight: 40 }}>{faces.length ? faces.map((_, i) => <div key={i} className="k-selbox-item">Face&lt;{i + 1}&gt;</div>) : <span className="k-muted">Select a planar face</span>}</div>
      </Section>
    </div>
  );
}

/** Render Tools ▸ Edit Decal, by design: Image (file), Mapping (face, width, rotation), Name. */
export function DecalPM() {
  const st = useStore();
  const e = st.decalEdit;
  const [tab, setTab] = useState<'image' | 'mapping' | 'illumination'>('image');
  if (!e) return null;
  const pick = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => st.updateDecalEdit({ image: String(r.result) });
    r.readAsDataURL(f);
  };
  return (
    <div className="k-pm" data-testid="decal-pm">
      <div className="k-pm-head">
        <div className="k-pm-title">
          <Icon.Palette /> <b>Decals</b>
          <span className="grow" />
          <span className="k-pm-help" title="Help">?</span>
        </div>
        <div className="k-pm-buttons">
          <button className="k-pm-ok k-tip" data-tip="OK" data-testid="decal-ok" disabled={!e.face} onClick={st.commitDecal}><Icon.Check /></button>
          <button className="k-pm-cancel k-tip" data-tip="Cancel" onClick={() => useStore.setState({ decalEdit: null })}><Icon.Close /></button>
        </div>
      </div>
      <div className="k-pm-tabs">
        {(['image', 'mapping', 'illumination'] as const).map((t) => <button key={t} data-testid={'decal-tab-' + t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>
      {tab === 'image' && (
        <>
          <Section title="Decal Preview">
            <div className="k-decal-preview"><img src={e.image} alt="decal" /></div>
            <label className="k-btn" style={{ marginTop: 4 }}>Browse… <input type="file" accept="image/*" style={{ display: 'none' }} data-testid="decal-file" onChange={(x) => pick(x.target.files?.[0])} /></label>
          </Section>
          <Section title="Name">
            <input className="k-input" value={e.name} onChange={(x) => st.updateDecalEdit({ name: x.target.value })} onKeyDown={(x) => x.stopPropagation()} />
          </Section>
        </>
      )}
      {tab === 'mapping' && (
        <>
          <Section title="Selected Geometry">
            <div className="k-selbox" style={{ minHeight: 24 }} data-testid="decal-face">{e.face ? <div className="k-selbox-row"><Icon.Sheet size={12} /> Face&lt;1&gt;</div> : <span className="k-muted">Select a planar face</span>}</div>
          </Section>
          <Section title="Size/Orientation">
            <div className="k-field"><label>Width</label><NumberField value={e.width} onChange={(v) => st.updateDecalEdit({ width: Math.max(1, v) })} unit={st.doc.units} step={5} /></div>
            {e.height !== undefined && <div className="k-field"><label>Height</label><NumberField value={e.height} onChange={(v) => st.updateDecalEdit({ height: Math.max(1, v) })} unit={st.doc.units} step={5} /></div>}
            <div className="k-field"><label>Rotation</label><NumberField value={e.rotation} onChange={(v) => st.updateDecalEdit({ rotation: v })} unit="°" step={15} /></div>
            <label className="k-check"><input type="checkbox" data-testid="decal-aspect" checked={e.height === undefined} onChange={(x) => st.updateDecalEdit({ height: x.target.checked ? undefined : e.width })} /> Fixed aspect ratio</label>
          </Section>
        </>
      )}
      {tab === 'illumination' && (
        <Section title="Illumination">
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="decallight" checked={(e.lighting ?? 'appearance') === 'appearance'} onChange={() => st.updateDecalEdit({ lighting: 'appearance' })} /> Use underlying appearance</label>
            <label className="k-check"><input type="radio" name="decallight" data-testid="decal-light-custom" checked={e.lighting === 'custom'} onChange={() => st.updateDecalEdit({ lighting: 'custom', brightness: e.brightness ?? 0.5, shininess: e.shininess ?? 0.2 })} /> Custom</label>
          </div>
          {e.lighting === 'custom' && (
            <>
              <div className="k-field"><label>Brightness</label><input type="range" min={0} max={1} step={0.05} data-testid="decal-brightness" value={e.brightness ?? 0.5} onChange={(x) => st.updateDecalEdit({ brightness: Number(x.target.value) })} /></div>
              <div className="k-field"><label>Shininess</label><input type="range" min={0} max={1} step={0.05} value={e.shininess ?? 0.2} onChange={(x) => st.updateDecalEdit({ shininess: Number(x.target.value) })} /></div>
            </>
          )}
        </Section>
      )}
    </div>
  );
}
