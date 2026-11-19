/**
 * The views of the fabrication tabs in the graphics area (docs/36 3.2, 4.2, 6.2): tables at the bottom of the window
 * (saw list with the saw plan, plate list, weld table, recognition, the Cost Manager tree), and full views for the
 * nested sheets, the bend sheet and the quote preview (the PDF pages themselves). The Fabrication Settings dialog opens
 * from here as well.
 */
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store';
import { bendInfo, draftQuote, isStale, moveNestPiece, recompute, useFab } from './fabStore';
import { FabSettingsDialog } from './FabSettings';
import { profileById } from '../../fab/catalog';
import { euro, mm, num } from '../../fab/format';
import { angleText } from '../../fab/sawList';
import { arcPoints, type FlatPart, type Loop } from '../../fab/flat';
import { placeFn, placeLoop, type Nest } from '../../fab/nest';
import { foldStates } from '../../fab/bendStates';
import { din6935K, type BendLine } from '../../fab/bend';
import { COST_GROUPS } from '../../fab/cost';
import { weldPlanInput } from '../../fab/analyze';
import { quoteDoc } from '../../fab/quotePdf';
import { pageSvg } from '../../fab/pdfSvg';
import { weldText } from '../../fab/weld';
import { plateChecks } from '../../fab/checks';
import './fab.css';

const pts = (l: Loop) => l.flatMap((s, i) => (s.bulge ? arcPoints(s.a, l[(i + 1) % l.length].a, s.bulge, 12).slice(0, -1) : [s.a]));
const d = (p: { x: number; y: number }[]) => `M${p.map((q) => `${q.x.toFixed(2)} ${(-q.y).toFixed(2)}`).join('L')}Z`;

function FlatSvg({ f, label }: { f: FlatPart; label?: string }) {
  const pad = 10;
  return (
    <svg className="k-fab-flat" viewBox={`${-pad} ${-f.bbox.b - pad} ${f.bbox.l + 2 * pad} ${f.bbox.b + 2 * pad}`} preserveAspectRatio="xMidYMid meet">
      <path d={[pts(f.buiten), ...f.binnen.map(pts)].map(d).join('')} fill="#f3c33f55" stroke="#333" strokeWidth={Math.max(f.bbox.l, f.bbox.b) / 400} fillRule="evenodd" />
      {f.gaten.map((g, i) => <circle key={i} cx={g.c.x} cy={-g.c.y} r={g.r} fill="#fff" stroke="#333" strokeWidth={Math.max(f.bbox.l, f.bbox.b) / 400} />)}
      {f.plooien.map((b, i) => <g key={i}><line x1={b.a.x} y1={-b.a.y} x2={b.b.x} y2={-b.b.y} stroke={b.richting === 'op' ? '#2e9d4a' : '#d9363e'} strokeDasharray="6 3"
        strokeWidth={Math.max(f.bbox.l, f.bbox.b) / 300} /><text x={b.a.x + 2} y={-b.a.y - 2} fontSize={Math.max(f.bbox.l, f.bbox.b) / 25}>{i + 1}</text></g>)}
      {label && <text x={f.bbox.l / 2} y={-f.bbox.b / 2} fontSize={Math.min(f.bbox.l, f.bbox.b) / 5} textAnchor="middle">{label}</text>}
    </svg>
  );
}

/** one nested sheet; a piece is dragged to another place (P3.9), overlaps turn red */
function NestSheet({ n, ni, bi, flats, bad }: { n: Nest; ni: number; bi: number; flats: FlatPart[]; bad: string[] }) {
  const b = n.bladen[bi];
  const [drag, setDrag] = useState<{ k: number; x0: number; y0: number; dx: number; dy: number } | null>(null);
  const at = (e: React.PointerEvent) => {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement ?? (e.currentTarget as SVGSVGElement);
    const m = svg.getScreenCTM?.();
    if (!m) return { x: e.clientX, y: e.clientY };
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: q.x, y: -q.y };
  };
  return (
    <div className="k-fab-sheet">
      <div className="k-fab-sheettitle">{n.materiaal} {num(n.t, n.t % 1 ? 1 : 0)} mm · sheet {bi + 1} of {n.bladen.length} · {b.l} x {b.b} · use {num(b.benutting * 100, 0)} %
        {n.status === 'handmatig' ? ' · moved by hand' : ''}</div>
      <svg viewBox={`0 ${-b.b} ${b.l} ${b.b}`} className="k-fab-sheetsvg" data-testid="fab-nest-sheet">
        <rect x={0} y={-b.b} width={b.l} height={b.b} fill="#f6f6f6" stroke="#555" strokeWidth={3} />
        {b.stukken.map((p, k) => {
          const f = flats[p.pos - 1], c = placeFn(p)({ x: f.bbox.l / 2, y: f.bbox.b / 2 }), red = bad.includes(`${bi}:${k}`);
          const off = drag?.k === k ? `translate(${drag.dx} ${-drag.dy})` : undefined;
          return <g key={k} transform={off} className="k-fab-piece" data-testid={red ? 'fab-nest-piece-bad' : 'fab-nest-piece'}
            onPointerDown={(e) => { const q = at(e); (e.currentTarget as Element).setPointerCapture?.(e.pointerId); setDrag({ k, x0: q.x, y0: q.y, dx: 0, dy: 0 }); }}
            onPointerMove={(e) => { if (drag?.k === k) { const q = at(e); setDrag({ ...drag, dx: q.x - drag.x0, dy: q.y - drag.y0 }); } }}
            onPointerUp={() => { if (drag?.k === k && (drag.dx || drag.dy)) moveNestPiece(ni, bi, k, drag.dx, drag.dy); setDrag(null); }}>
            <path d={d(placeLoop(f.buiten, p))} fill={red ? '#e5484d' : `hsl(${(p.pos * 47) % 360} 60% 72%)`} stroke={red ? '#a00' : '#333'} strokeWidth={2} />
            <text x={c.x} y={-c.y} fontSize={Math.min(60, Math.min(p.l, p.b) / 3)} textAnchor="middle" dominantBaseline="middle">P{p.pos}</text></g>;
        })}
      </svg>
    </div>
  );
}

/** P4.7: the section of the part after each step (folded on its neutral fibre, the area of the flat in each) */
function FoldStrip({ bends, width, t, r, order }: { bends: BendLine[]; width: number; t: number; r: number; order: number[] }) {
  const states = useMemo(() => foldStates(bends, width, t, r, din6935K(r, t), order), [bends, width, t, r, order]);
  const a0 = states[0]?.oppervlak ?? 1;
  return (
    <div className="k-fab-folds">
      {states.map((s) => {
        const xs = s.poly.map((p) => p.x), ys = s.poly.map((p) => p.y), pad = 4 + t;
        const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - x0 + pad, h = Math.max(...ys) - y0 + pad;
        return (
          <figure key={s.stap} className="k-fab-fold" data-testid="fab-bend-state">
            <svg viewBox={`${x0} ${-(y0 + h)} ${w} ${h}`}><path d={d(s.poly)} fill="#9ab" stroke="#234" strokeWidth={Math.max(w, h) / 200} /></svg>
            <figcaption>{s.stap ? `after step ${s.stap}` : 'flat'} · {num((100 * (s.oppervlak - a0)) / a0, 2)} % volume</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

export function FabView() {
  const st = useFab(useShallow((s) => ({ view: s.view, r: s.result, stale: isStale(s), nests: s.nests, nestBad: s.nestBad,
    settingsOpen: s.settingsOpen, bendIndex: s.bendIndex, grouping: s.grouping, settings: s.settings })));
  const doc = useStore((s) => s.doc);
  const r = st.r;
  const close = () => useFab.setState({ view: 'none' });
  const quotePages = useMemo(() => {
    if (st.view !== 'quote' || !r) return [];
    const q = draftQuote();
    if (!q) return [];
    const s = st.settings;
    return quoteDoc({ ...q, nummer: '' }, { company: s.company, verlegdTekst: s.quote.verlegdTekst, vrijgesteldTekst: s.quote.vrijgesteldTekst }).pages.map(pageSvg);
    // the preview follows the model, the customer, the grouping and the settings
  }, [st.view, r, doc.fab, st.grouping, st.settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const head = (title: string, extra?: React.ReactNode) => (
    <div className="k-fab-viewhead">
      <b>{title}</b>{st.stale && <span className="k-fab-stalebadge" data-testid="fab-view-stale">out of date <button className="k-btn" onClick={recompute}>Recalculate</button></span>}
      {extra}<span className="grow" /><button className="k-btn ghost" data-testid="fab-view-close" onClick={close}>×</button>
    </div>
  );
  const settings = st.settingsOpen ? <FabSettingsDialog /> : null;
  if (!r || st.view === 'none') return settings;
  // bodies by their position on the saw list or plate list, as on the weld plan (docs/37 B-14)
  const posName = weldPlanInput(r).naam;
  const recName = { get: (k: string) => posName(k) };
  if (st.view === 'saw') {
    return (
      <>{settings}<div className="k-fab-view k-fab-bottom" data-testid="fab-view-saw">
        {head(`Saw List (${r.saw.length} positions)`, <span className="k-fab-muted"> status: still to be sawn</span>)}
        <div className="k-fab-scroll">
          <table className="k-fab-table"><thead><tr>{['Pos', 'Qty', 'Profile', 'Grade', 'Saw length', 'Angle 1', 'Angle 2', 'Cut', 'Holes', 'kg/pc', 'kg total', 'Note'].map((h) => <th
            key={h}>{h}</th>)}</tr></thead>
            <tbody>{r.saw.map((l) => <tr key={l.pos}><td>{l.pos}</td><td className="n">{l.n}</td><td>{l.profiel}</td><td>{l.kwaliteit}</td><td className="n">{mm(l.zaaglengte)}</td><td
              className="n">{num(l.hoek1, 0)}°</td><td className="n">{num(l.hoek2, 0)}°</td><td>{angleText(l.hoek1, l.hoek2)}</td><td className="n">{l.gaten}</td><td
                className="n">{num(l.kgStuk, 2)}</td><td className="n">{num(l.kgTotaal, 2)}</td><td title={l.namen.join(', ')}>{l.opm}</td></tr>)}</tbody>
          </table>
          <div className="k-fab-bars">
            {r.plans.map((p) => (
              <div key={p.profielId} className="k-fab-barplan">
                <div><b>{profileById(p.profielId)?.naam}</b>: {p.staven.length} bars, {p.teBestellen} to order, use {num(p.benutting * 100, 0)} %, lower bound {p.ondergrens}</div>
                {p.staven.map((b, i) => (
                  <div key={i} className="k-fab-bar" title={`${b.bron} ${b.lengte} mm`}>
                    <span className="k-fab-barlabel">{mm(b.lengte)} {b.bron === 'restant' ? 'remnant' : b.bron === 'voorraad' ? 'stock' : 'new'}</span>
                    <div className="k-fab-bartrack">{b.stukken.map((s, k) => <div key={k} className="k-fab-piece" style={{ width: `${(100 * s.l) / b.lengte}%` }}>{s.pos}: {mm(s.l)}</div>)}<span
                      className="k-fab-rest">rest {mm(b.rest)}</span></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div></>
    );
  }
  if (st.view === 'recognize') {
    return (<>{settings}<div className="k-fab-view k-fab-bottom" data-testid="fab-view-recognize">{head(`Recognized Bodies (${r.recs.length})`)}<div className="k-fab-scroll">
      <table className="k-fab-table"><thead><tr>{['Body', 'Part', 'Qty', 'Kind', 'From', 'Size', 'Reason'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{r.recs.map((x) => <tr key={x.key} className={x.soort === 'onbekend' ? 'k-fab-unknown' : ''}><td>{x.naam}</td><td>{x.bron.part}</td><td className="n">{x.aantal}</td>
          <td>{x.soort}</td><td>{x.herkomst}</td><td>{x.soort === 'profiel' ? `${profileById(x.profielId)?.naam} x ${mm(x.lengte ?? 0)}` : x.t ? `${num(x.t, 1)} mm` : ''}</td>
            <td>{x.reden}{x.warning ? ` · ${x.warning}` : ''}</td></tr>)}</tbody></table>
    </div></div></>);
  }
  if (st.view === 'welds') {
    return (<>{settings}<div className="k-fab-view k-fab-bottom" data-testid="fab-view-welds">{head(`Weld Table (${r.joints.length})`)}<div className="k-fab-scroll">
      <table className="k-fab-table"><thead><tr>{['Weld', 'Step', 'Between', 'Type', 'Size', 'Length', 'Process', 'Position', 'Level', 'Designation'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{[...r.joints].sort((a, b) => a.stap - b.stap).map((j) => <tr key={j.id}><td>{j.id}</td><td className="n">{j.stap}</td>
          <td>{recName.get(j.bodies[0])} / {recName.get(j.bodies[1])}</td><td>{j.soort}</td><td>{j.maat.letter}{num(j.maat.mm, j.maat.mm % 1 ? 1 : 0)}</td><td className="n">{mm(j.lengte)}</td>
            <td>{j.proces}</td><td>{j.positie}</td><td>{j.niveau}</td><td>{weldText(j)}{j.bevestigd ? '' : ' · proposal'}</td></tr>)}</tbody></table>
    </div></div></>);
  }
  if (st.view === 'plates') {
    return (<>{settings}<div className="k-fab-view k-fab-bottom" data-testid="fab-view-plates">{head(`Flat Patterns (${r.flats.length} positions)`, <span
      className="k-fab-muted"> status: still to be opened by the laser cutter</span>)}<div className="k-fab-scroll k-fab-split">
      <table className="k-fab-table"><thead><tr>{['Pos', 'Qty', 'Name', 'Material', 't', 'L x W', 'Area m²', 'Cut m', 'Pierces', 'Bends', 'kg/pc', 'Check'].map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{r.flats.map((f, i) => <tr key={f.key} className={f.betrouwbaar === 'geen' ? 'k-fab-unknown' : ''}><td>P{i + 1}</td><td className="n">{f.n}</td><td>{f.naam}</td>
          <td>{f.materiaal}</td><td className="n">{num(f.t, f.t % 1 ? 1 : 0)}</td><td className="n">{mm(f.bbox.l)} x {mm(f.bbox.b)}</td><td className="n">{num(f.oppervlak / 1e6, 4)}</td><td
            className="n">{num((f.snijlengte.buiten + f.snijlengte.binnen) / 1000, 3)}</td><td className="n">{f.insteken}</td><td className="n">{f.plooien.length}</td><td
              className="n">{num(f.kg, 2)}</td><td>{f.betrouwbaar === 'geen' ? `no DXF: ${f.fout}` : plateChecks(f).map((c) => c.soort).join(', ') || 'ok'}</td></tr>)}</tbody></table>
      <div className="k-fab-thumbs">{r.flats.filter((f) => f.betrouwbaar !== 'geen').slice(0, 8).map((f) => <div key={f.key} className="k-fab-thumb"><FlatSvg f={f}
        label={`P${r.flats.indexOf(f) + 1}`} /></div>)}</div>
    </div></div></>);
  }
  if (st.view === 'nest') {
    return (<>{settings}<div className="k-fab-view k-fab-full" data-testid="fab-view-nest">{head('Nested Sheets', <span
      className="k-fab-muted"> {st.nests.some((n) => n.status === 'vorm') ? 'shape nesting (pairs)' : 'rectangle nesting'} · status: still to be opened by the laser cutter</span>)}
      <div className="k-fab-scroll k-fab-sheets">
      {st.nests.flatMap((n, ni) => n.bladen.map((_b, i) => <NestSheet key={`${n.materiaal}${n.t}${i}`} n={n} ni={ni} bi={i} flats={r.flats} bad={st.nestBad[ni] ?? []} />))}
      {st.nestBad.some((x) => x.length) && <p className="k-fab-error" data-testid="fab-nest-bad">Red pieces overlap or lie over the border: the export is blocked until they are moved.</p>}
      {!st.nests.length && <p>No plates to nest.</p>}
    </div></div></>);
  }
  if (st.view === 'bend') {
    const bent = r.flats.map((f, i) => ({ f, i })).filter((x) => x.f.plooien.length);
    const cur = bent.find((x) => x.i === st.bendIndex) ?? bent[0];
    const info = cur ? bendInfo(r, cur.i) : null;
    return (<>{settings}<div className="k-fab-view k-fab-full" data-testid="fab-view-bend">{head(`Bend Sheet${cur ? ` P${cur.i + 1} ${cur.f.naam}` : ''}`, <span
      className="k-fab-muted"> status: still to be bent</span>)}<div className="k-fab-scroll k-fab-split">
      {cur ? <div className="k-fab-bendflat"><FlatSvg f={cur.f} /></div> : <p>No bent plate.</p>}
      {info && <table className="k-fab-table"><thead><tr>{['Step', 'Bend', 'Direction', 'Angle', 'Radius', 'V die', 'Stop', 'Side', 'Force'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{info.seq.steps.map((s) => { const b = info.bends.find((x) => x.id === s.plooi)!; return <tr key={s.stap}><td>{s.stap}</td><td>{s.plooi}</td>
          <td>{b.richting === 'op' ? 'up' : 'down'}{s.omkeren ? ' (turn over)' : ''}</td><td className="n">{num(b.hoek, 0)}°</td><td className="n">{num(cur!.f.plooien[0]?.r ?? 0, 1)}</td><td
            className="n">{num(s.vOpening, 0)}</td><td className="n">{num(s.aanslag, 1)}</td><td>{s.aanslagKant}</td><td className="n">{num(s.perskracht, 1)} kN</td></tr>; })}</tbody></table>}
      {info && info.prismatic && <FoldStrip bends={info.bends} width={info.width} t={cur!.f.t} r={cur!.f.plooien[0]?.r ?? cur!.f.t} order={info.seq.steps.map((x) => x.plooi)} />}
      {info && <div className="k-fab-notes">{cur!.f.kBron && <div>Flat with {cur!.f.kBron}</div>}{!info.seq.gecontroleerd && <div>Sequence not checked for collisions.</div>}
        {info.checks.map((c, i) => <div key={i} className="k-fab-error">{c}</div>)}</div>}
    </div></div></>);
  }
  if (st.view === 'cost') {
    const m = r.cost;
    return (<>{settings}<div className="k-fab-view k-fab-bottom" data-testid="fab-view-cost">{head(`Cost (${doc.name})  ${euro(m.totaalCent)}`, <span
      className={m.aannames ? 'k-fab-aanname' : ''}> ⚠ {m.aannames} assumptions{m.onvolledig ? ' · incomplete' : ''}</span>)}<div className="k-fab-scroll">
      <table className="k-fab-table k-fab-costtree"><tbody>
        {COST_GROUPS.map((g) => { const ls = m.regels.filter((l) => g.cats.includes(l.categorie)); if (!ls.length) return null; return [
          <tr key={g.naam} className="k-fab-group"><td>{g.naam}</td><td className="n">{euro(ls.reduce((t, l) => t + l.bedragCent, 0))}</td><td /><td /></tr>,
          ...ls.map((l) => <tr key={l.id}><td className="k-fab-indent">{l.omschrijving}{l.override ? ` (override: ${l.override.reden})` : ''}</td><td
            className="n">{l.geenPrijs ? 'no price' : euro(l.bedragCent)}</td><td>{l.aanname && <span className="k-fab-aanname">AANNAME</span>}</td><td
              className="k-fab-src">{l.bron}{l.prijsDatum ? ` (${l.prijsDatum})` : ''}</td></tr>),
        ]; })}
        {m.regels.filter((l) => l.categorie === 'vrij' && !l.geenPrijs).map((l) => <tr key={l.id}><td>{l.omschrijving}</td><td className="n">{euro(l.bedragCent)}</td><td /><td
          className="k-fab-src">{l.bron}</td></tr>)}
        <tr className="k-fab-group"><td>No cost assigned ({m.geenKost.length})</td><td /><td /><td /></tr>
        {m.geenKost.map((x) => <tr key={x.key} className="k-fab-unknown"><td className="k-fab-indent">{x.naam} ({x.bron.part}){x.aantal > 1 ? ` x ${x.aantal}` : ''}</td><td
          className="n">no price</td><td /><td className="k-fab-src">{x.reden}</td></tr>)}
      </tbody></table>
    </div></div></>);
  }
  if (st.view === 'quote') {
    return (<>{settings}<div className="k-fab-view k-fab-full" data-testid="fab-view-quote">{head('Quote Preview', <span
      className="k-fab-muted"> what you see is the PDF · nothing is sent</span>)}<div className="k-fab-scroll k-fab-pages">
      {quotePages.map((svg, i) => <img key={i} className="k-fab-page" alt={`page ${i + 1}`} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} />)}
    </div></div></>);
  }
  return settings;
}
