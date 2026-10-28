/** Property Panels of the plastic part features (QA v0.5.1 F121): Dome, Indent, Mounting Boss, Snap Hook, Lip/Groove. */
import { type ReactNode } from 'react';
import { NumberField, Section } from '../../../ui/components';
import { Icon } from '../../../ui/icons';
import { domeOptions, faceLoops, pickedFaceOn } from '../../../core/features/plastics';
import type { PickedFace } from '../../../core/document/plasticsTypes';
import { Header } from './shared';
import { NEXT, type PMContext } from './context';

type St = PMContext['st'];

function Errors({ st, id }: { st: St; id: string }) {
  const err = st.rebuild.errors[id];
  return err ? (
    <Section title="Rebuild Errors">
      <p className="k-pm-message" style={{ background: '#ffe3e3', borderColor: '#e0a0a0' }}>{err}</p>
    </Section>
  ) : null;
}

/** a labelled value row with a dimension field */
function Row({ st, tip, value, set, angle, min = 0, testid }: { st: St; tip: string; value: number; set: (v: number) => void; angle?: boolean; min?: number; testid?: string }) {
  return (
    <div className="k-pm-valuerow k-tip" data-tip={tip} data-testid={testid}>
      {angle ? <Icon.Draft size={14} /> : <Icon.Dimension size={14} />}
      <NumberField value={value} onChange={(v) => set(Math.max(min, v))} unit={angle ? undefined : st.doc.units} step={angle ? 0.5 : 1} />
      {angle && <span className="k-muted">deg</span>}
    </div>
  );
}

const faceBox = (face: PickedFace | null, empty: string, testid: string, focus?: boolean, onClick?: () => void) => (
  <div className={`k-selbox${focus ? ' focus' : ''}`} style={{ minHeight: 24 }} data-testid={testid} onClick={onClick}>
    {face ? <div className="k-selbox-row"><Icon.Plane size={12} /> {face.label}</div> : <span className="k-muted">{empty}</span>}
  </div>
);

export function domePM({ st }: PMContext): ReactNode | typeof NEXT {
  if (st.featureEdit?.draft.type !== 'dome') return NEXT;
  const d = st.featureEdit.draft;
  // which options the face offers: Elliptical dome on a round face, Continuous dome on a polygon (not four-sided)
  let opts = { round: false, continuous: false };
  if (d.face) for (const b of st.rebuild.bodies) {
    const face = pickedFaceOn(b.geometry, b.id, d.face);
    const fl = face && faceLoops(b.geometry, face);
    if (fl) { opts = domeOptions(fl.loops[0]); break; }
  }
  return (
    <>
      <Header title="Dome" icon={<Icon.Dome />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
      <Section title="Parameters">
        {faceBox(d.face, 'Select a planar face to dome.', 'dome-face', true)}
        <div className="k-pm-valuerow">
          <button className={`k-iconbtn${d.reverse ? ' active' : ''}`} title="Reverse Direction" data-testid="dome-reverse" onClick={() => st.updateFeatureDraft({ reverse: !d.reverse })}><Icon.Flip size={14} /></button>
          <span className="k-tip" data-tip="Distance" data-testid="dome-distance" style={{ flex: 1 }}><NumberField value={d.distance} onChange={(v) => st.updateFeatureDraft({ distance: Math.max(0, v) })} unit={st.doc.units} step={1} autoFocus /></span>
        </div>
        <div className="k-muted" style={{ fontSize: 11 }}>{opts.round ? 'A distance of 0 makes a half sphere.' : ''}</div>
        <label className={`k-check${opts.round ? '' : ' disabled'}`}><input type="checkbox" data-testid="dome-elliptical" disabled={!opts.round} checked={!!d.elliptical} onChange={(e) => st.updateFeatureDraft({ elliptical: e.target.checked })} /> Elliptical dome</label>
        <label className={`k-check${opts.continuous ? '' : ' disabled'}`}><input type="checkbox" data-testid="dome-continuous" disabled={!opts.continuous} checked={!!d.continuous} onChange={(e) => st.updateFeatureDraft({ continuous: e.target.checked })} /> Continuous dome</label>
      </Section>
      <Errors st={st} id={d.id} />
    </>
  );
}

export function indentPM({ st }: PMContext): ReactNode | typeof NEXT {
  if (st.featureEdit?.draft.type !== 'indent') return NEXT;
  const d = st.featureEdit.draft;
  const name = (id: string | null) => {
    const b = st.rebuild.bodies.find((x) => x.id === id);
    const fid = b?.featureIds.filter((x) => x !== d.id).pop();
    return st.doc.features.find((f) => f.id === fid)?.name ?? id ?? '';
  };
  const box = (which: 'target' | 'tool', id: string | null, empty: string) => (
    <div className={`k-selbox${st.plasticsFocus === which ? ' focus' : ''}`} style={{ minHeight: 24 }} data-testid={`indent-${which}`} onClick={() => st.setPlasticsFocus(which)}>
      {id ? <div className="k-selbox-row"><Icon.Part size={12} /> {name(id)}</div> : <span className="k-muted">{empty}</span>}
    </div>
  );
  return (
    <>
      <Header title="Indent" icon={<Icon.Indent />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
      <Section title="Selections">
        <div className="k-pm-label">Target body:</div>
        {box('target', d.target, 'Select the body to indent (click a face of it).')}
        <div className="k-pm-label">Tool body:</div>
        {box('tool', d.tool, 'Select the tool body.')}
        <label className="k-check"><input type="checkbox" data-testid="indent-cut" checked={d.cut} onChange={(e) => st.updateFeatureDraft({ cut: e.target.checked })} /> Cut</label>
      </Section>
      <Section title="Parameters">
        {!d.cut && <Row st={st} tip="Thickness" value={d.thickness} set={(v) => st.updateFeatureDraft({ thickness: v })} min={0.01} testid="indent-thickness" />}
        <Row st={st} tip="Clearance" value={d.clearance} set={(v) => st.updateFeatureDraft({ clearance: v })} testid="indent-clearance" />
      </Section>
      <Errors st={st} id={d.id} />
    </>
  );
}

export function mountingBossPM({ st }: PMContext): ReactNode | typeof NEXT {
  if (st.featureEdit?.draft.type !== 'mountingBoss') return NEXT;
  const d = st.featureEdit.draft;
  const up = st.updateFeatureDraft;
  const holeWord = d.bossType === 'pin' && d.pin === 'pin' ? 'pin' : 'hole';
  return (
    <>
      <Header title="Mounting Boss" icon={<Icon.MountingBoss />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
      <Section title="Position">
        {faceBox({ normal: [0, 0, 1], point: [0, 0, 0], label: d.label }, '', 'mb-face')}
        <div className="k-pm-sub">Position on the face</div>
        <div className="k-pm-xyrow">
          <span className="k-pm-xy">x</span><NumberField value={d.point.x} onChange={(v) => up({ point: { ...d.point, x: v } })} step={1} />
          <span className="k-pm-xy">y</span><NumberField value={d.point.y} onChange={(v) => up({ point: { ...d.point, y: v } })} step={1} />
        </div>
      </Section>
      <Section title="Boss Type">
        <div className="k-pm-radios">
          <label className="k-check"><input type="radio" name="mbtype" checked={d.bossType === 'hardware'} onChange={() => up({ bossType: 'hardware' })} /> Hardware boss</label>
          <label className="k-check"><input type="radio" name="mbtype" data-testid="mb-pinboss" checked={d.bossType === 'pin'} onChange={() => up({ bossType: 'pin' })} /> Pin boss</label>
        </div>
        {d.bossType === 'hardware' ? (
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="mbhw" data-testid="mb-head" checked={d.hardware === 'head'} onChange={() => up({ hardware: 'head' })} /> Head (screw passes through)</label>
            <label className="k-check"><input type="radio" name="mbhw" checked={d.hardware === 'thread'} onChange={() => up({ hardware: 'thread' })} /> Thread (screw holds here)</label>
          </div>
        ) : (
          <div className="k-pm-radios">
            <label className="k-check"><input type="radio" name="mbpin" data-testid="mb-pin" checked={d.pin === 'pin'} onChange={() => up({ pin: 'pin' })} /> Pin</label>
            <label className="k-check"><input type="radio" name="mbpin" checked={d.pin === 'hole'} onChange={() => up({ pin: 'hole' })} /> Hole</label>
          </div>
        )}
      </Section>
      <Section title="Boss">
        <Row st={st} tip="Boss height" value={d.height} set={(v) => up({ height: v })} min={0.1} testid="mb-height" />
        <Row st={st} tip="Boss diameter" value={d.diameter} set={(v) => up({ diameter: v })} min={0.1} testid="mb-diameter" />
        <Row st={st} tip="Boss draft angle" value={d.draft} set={(v) => up({ draft: Math.min(30, v) })} angle />
        <Row st={st} tip={`Diameter of the ${holeWord}`} value={d.holeDiameter} set={(v) => up({ holeDiameter: v })} testid="mb-hole" />
        <Row st={st} tip={holeWord === 'pin' ? 'Height of the pin' : 'Depth of the hole'} value={d.holeDepth} set={(v) => up({ holeDepth: v })} />
        <Row st={st} tip={`Draft angle of the ${holeWord}`} value={d.holeDraft} set={(v) => up({ holeDraft: Math.min(30, v) })} angle />
      </Section>
      <Section title="Fins">
        <div className="k-pm-valuerow k-tip" data-tip="Number of fins (0: no fins)" data-testid="mb-fins"><Icon.CircularPattern size={14} /><NumberField value={d.fins} onChange={(v) => up({ fins: Math.max(0, Math.min(16, Math.round(v))) })} step={1} /></div>
        {d.fins > 0 && (
          <>
            <Row st={st} tip="Direction of the first fin" value={d.finAngle} set={(v) => up({ finAngle: v })} angle min={-360} />
            <Row st={st} tip="Fin height (at the boss)" value={d.finHeight} set={(v) => up({ finHeight: v })} />
            <Row st={st} tip="Fin length (from the boss)" value={d.finLength} set={(v) => up({ finLength: v })} />
            <Row st={st} tip="Fin width" value={d.finWidth} set={(v) => up({ finWidth: v })} />
          </>
        )}
      </Section>
      <Errors st={st} id={d.id} />
    </>
  );
}

export function snapHookPM({ st }: PMContext): ReactNode | typeof NEXT {
  if (st.featureEdit?.draft.type !== 'snapHook') return NEXT;
  const d = st.featureEdit.draft;
  const up = st.updateFeatureDraft;
  return (
    <>
      <Header title="Snap Hook" icon={<Icon.SnapHook />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
      <Section title="Selections">
        {faceBox({ normal: [0, 0, 1], point: [0, 0, 0], label: d.label }, '', 'sh-face')}
        <div className="k-pm-sub">Position on the face</div>
        <div className="k-pm-xyrow">
          <span className="k-pm-xy">x</span><NumberField value={d.point.x} onChange={(v) => up({ point: { ...d.point, x: v } })} step={1} />
          <span className="k-pm-xy">y</span><NumberField value={d.point.y} onChange={(v) => up({ point: { ...d.point, y: v } })} step={1} />
        </div>
        <Row st={st} tip="Direction of the hook" value={d.angle} set={(v) => up({ angle: v })} angle min={-360} />
      </Section>
      <Section title="Hook Data">
        <Row st={st} tip="Hook height (from the face)" value={d.height} set={(v) => up({ height: v })} min={0.1} testid="sh-height" />
        <Row st={st} tip="Hook lip height" value={d.lipHeight} set={(v) => up({ lipHeight: v })} min={0.1} />
        <Row st={st} tip="Hook overhang" value={d.overhang} set={(v) => up({ overhang: v })} min={0.1} testid="sh-overhang" />
        <Row st={st} tip="Hook thickness" value={d.thickness} set={(v) => up({ thickness: v })} min={0.1} />
        <Row st={st} tip="Hook width" value={d.width} set={(v) => up({ width: v })} min={0.1} />
      </Section>
      <Errors st={st} id={d.id} />
    </>
  );
}

export function lipGroovePM({ st }: PMContext): ReactNode | typeof NEXT {
  if (st.featureEdit?.draft.type !== 'lipGroove') return NEXT;
  const d = st.featureEdit.draft;
  const up = st.updateFeatureDraft;
  return (
    <>
      <Header title="Lip/Groove" icon={<Icon.LipGroove />} onOk={st.commitFeature} onCancel={st.cancelFeature} />
      <Section title="Body/Part Selection">
        <div className="k-pm-label">Groove (rim face):</div>
        {faceBox(d.grooveFace, 'Select the rim face of the body that gets the groove.', 'lg-groove', st.plasticsFocus === 'groove', () => st.setPlasticsFocus('groove'))}
        <div className="k-pm-label">Lip (rim face):</div>
        {faceBox(d.lipFace, 'Select the rim face of the body that gets the lip.', 'lg-lip', st.plasticsFocus === 'lip', () => st.setPlasticsFocus('lip'))}
      </Section>
      <Section title="Parameters">
        <Row st={st} tip="Lip width" value={d.width} set={(v) => up({ width: v })} min={0.05} testid="lg-width" />
        <Row st={st} tip="Lip height" value={d.height} set={(v) => up({ height: v })} min={0.05} />
        <Row st={st} tip="Gap between the lip and the groove" value={d.clearance} set={(v) => up({ clearance: v })} />
      </Section>
      <Errors st={st} id={d.id} />
    </>
  );
}
