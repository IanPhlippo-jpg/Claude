// @vitest-environment jsdom
// docs/36 L2.8 and P4.8: the Cut List and the Bend Table on a drawing sheet hold the same rows as the saw list PDF and
// the bend sheet PDF (one source: the fab analysis), and they are saved with the drawing and drawn again.
import { describe, expect, it } from 'vitest';
import { setRebuildBudget } from '../../core/features/rebuild';
import { createDocument, type Document, type DrawingSheet } from '../../core/document/types';
import { parseDocument, serializeDocument } from '../../core/document/persistence';
import { tableGrid } from '../../core/drawing/tables';
import { analyze } from '../../fab/analyze';
import { defaultSettings } from '../../fab/settings';
import { chainSheet, lf1, pp2 } from '../../fab/fixtures';
import { bendSheetPdf, sawListPdf } from '../../fab/sheets';
import { pdfText } from '../../fab/pdf';
import { bendTableCells, cutListCells, BEND_TABLE_HEAD, CUT_LIST_HEAD } from './fabTables';
import { insertFabTable } from './fabTableCommand';
import { useStore } from '../store';

setRebuildBudget(Infinity);
const HAT = [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 40 }, { x: 75, y: 40 }, { x: 75, y: 0 }, { x: 90, y: 0 }];
const P = defaultSettings().machines.plooien;
const n = (s: string) => Number(s.replace('°', '').replace(' mm', '').replace(/\./g, '').replace(',', '.'));
const st = () => useStore.getState();

/** a new drawing with one view of `model` */
function drawingWith(model: Document) {
  st().openDocument(createDocument('Drawing1', 'drawing'));
  st().startModelView();
  st().setModelViewSource(model);
  st().setDrawingEdit({ orientation: 'front' });
  st().placeView([150, 120]);
  st().cancelDrawingEdit();
  return st().doc.sheets![0];
}

describe('L2.8 Cut List on a drawing sheet', { timeout: 120000 }, () => {
  it('LF1: the rows are the saw list of the analysis (position, quantity, profile, length, angles), as on the saw list PDF', () => {
    const a = analyze(lf1(), defaultSettings());
    const t = cutListCells(lf1())!;
    expect(t.cells[0]).toEqual(CUT_LIST_HEAD);
    const rows = t.cells.slice(1);
    expect(rows.length).toBe(a.saw.length);
    expect(a.saw.length).toBeGreaterThanOrEqual(2);
    rows.forEach((r, i) => {
      const l = a.saw[i];
      expect(Number(r[0])).toBe(l.pos);
      expect(Number(r[1])).toBe(l.n);
      expect(r[2]).toBe(l.profiel);
      expect(n(r[3])).toBeCloseTo(l.zaaglengte, 1);
      expect(n(r[4])).toBeCloseTo(l.hoek1, 1);
      expect(n(r[5])).toBeCloseTo(l.hoek2, 1);
    });
    // LF1: four mitred pieces (2 x 1000, 2 x 600 at 45 degrees) and the square post
    expect(rows.reduce((s, r) => s + Number(r[1]), 0)).toBe(5);
    expect(rows.filter((r) => r[4] === '45°' && r[5] === '45°').map((r) => [r[3], r[1]])).toEqual([['1000', '2'], ['600', '2']]);
    // every row of the table stands on the saw list PDF: the same cells in the same order (one text per line)
    const pdf = pdfText(sawListPdf(a.saw, a.plans, { titel: 'LF1', model: 'LF1', hash: a.hash }, 3));
    for (const r of rows) expect(pdf).toContain(['', r[0], r[1], r[2], a.saw[Number(r[0]) - 1].kwaliteit, r[3], r[4], r[5], ''].join('\n'));
  });

  it('the command writes the table into the sheet; it is drawn from its cells, saved and opened again', async () => {
    drawingWith(lf1());
    await insertFabTable('cutList');
    const sheet = st().doc.sheets![0];
    const t = (sheet.tables ?? []).find((x) => x.kind === 'cutList')!;
    expect(t.viewId).toBe(sheet.views[0].id);
    expect(t.cells).toEqual(cutListCells(lf1())!.cells);
    expect(st().drawingTool).toEqual({ kind: 'placeTable', id: t.id });
    expect(tableGrid(sheet, t)!.rows).toEqual(t.cells);
    const back = parseDocument(serializeDocument(st().doc)).sheets![0];
    const t2 = back.tables!.find((x) => x.id === t.id)!;
    expect(t2.kind).toBe('cutList');
    expect(tableGrid(back, t2)!.rows).toEqual(t.cells);
    // inserted again on the same view: refreshed in place, not a second table
    await insertFabTable('cutList');
    expect((st().doc.sheets![0].tables ?? []).filter((x) => x.kind === 'cutList').length).toBe(1);
  });
});

describe('P4.8 Bend Table on a drawing sheet', { timeout: 120000 }, () => {
  it('hat profile: four bends, the tags of the bend sheet (positions 12.12 / 49.37 / 109.61 / 146.85), direction, angle, radius', () => {
    const d = chainSheet('Hoed', HAT, 300);
    const t = bendTableCells(d, P)!;
    expect(t.cells[0]).toEqual(BEND_TABLE_HEAD);
    const rows = t.cells.slice(1);
    expect(rows.map((r) => r[0])).toEqual(['1', '2', '3', '4']);
    // the tag is the number of the bend line on the flat and on the bend sheet
    const f = analyze(chainSheet('Hoed', HAT, 300), defaultSettings()).flats.find((x) => x.plooien.length)!;
    expect(f.plooien.map((b, i) => String(b.id ?? i + 1)).sort()).toEqual(['1', '2', '3', '4']);
    const hand = [12.12, 49.37, 109.61, 146.85];
    const pos = rows.map((r) => t.plan.bends.find((b) => b.id === Number(r[0]))!.s);
    pos.sort((a, b) => a - b).forEach((x, i) => expect(Math.abs(x - hand[i])).toBeLessThanOrEqual(0.05));
    for (const r of rows) {
      const b = t.plan.bends.find((x) => x.id === Number(r[0]))!;
      expect(r[1]).toBe(b.richting === 'op' ? 'UP' : 'DOWN');
      expect(n(r[2])).toBe(Math.round(b.hoek));
      expect(n(r[3])).toBe(3);
      expect(Number(r[4])).toBe(t.plan.seq.steps.find((s) => s.plooi === b.id)!.stap);
    }
    // a hat: two bends up, two down, all 90 degrees
    expect(rows.map((r) => r[1]).sort()).toEqual(['DOWN', 'DOWN', 'UP', 'UP']);
    expect(rows.every((r) => r[2] === '90°')).toBe(true);
    // the bend sheet PDF has the same bend per step: its number, direction and angle
    const pdf = pdfText(bendSheetPdf(t.plan.f, t.plan.bends, t.plan.seq.steps, t.plan.checks, t.plan.prismatic, { titel: 'H', model: 'H', hash: 'x' }, t.plan.seq.botsing));
    for (const r of rows) {
      const dir = r[1] === 'UP' ? 'op' : 'neer';
      const plain = pdf.replace(/ \(omkeren\)/g, '');
      expect(plain).toContain(['', r[4], r[0], dir, r[2], '3,0 mm', ''].join('\n'));
    }
  });

  it('PP2 L profile: one bend, tag 1, 90°, R 3', () => {
    const t = bendTableCells(pp2(), P)!;
    expect(t.cells.length).toBe(2);
    expect(t.cells[1].slice(0, 4)).toEqual(['1', t.plan.bends[0].richting === 'op' ? 'UP' : 'DOWN', '90°', '3']);
    expect(t.cells[1][4]).toBe('1');
  });

  it('the command puts the Bend Table on the sheet and the sheet draws it from the saved cells', async () => {
    drawingWith(chainSheet('Hoed', HAT, 300));
    await insertFabTable('bendTable');
    const sheet = st().doc.sheets![0] as DrawingSheet;
    const t = (sheet.tables ?? []).find((x) => x.kind === 'bendTable')!;
    expect(t.cells).toEqual(bendTableCells(chainSheet('Hoed', HAT, 300), P)!.cells);
    const back = parseDocument(serializeDocument(st().doc)).sheets![0];
    expect(tableGrid(back, back.tables!.find((x) => x.id === t.id)!)!.rows).toEqual(t.cells);
  });

  it('a part without bends gives no table and a message', async () => {
    drawingWith(lf1());
    await insertFabTable('bendTable');
    expect((st().doc.sheets![0].tables ?? []).some((x) => x.kind === 'bendTable')).toBe(false);
    expect(bendTableCells(lf1(), P)).toBeNull();
  });
  it('N-15 the cut list follows its model: a member suppressed in the part of the view gives new rows, without inserting again', async () => {
    const { refreshFabTables } = await import('./fabTableCommand');
    drawingWith(lf1());
    await insertFabTable('cutList');
    const before = st().doc.sheets![0].tables!.find((x) => x.kind === 'cutList')!.cells!;
    const sheet = st().doc.sheets![0], v = sheet.views[0];
    const fi = v.model.features.map((f, i) => ({ f, i })).filter((x) => x.f.type !== 'sketch').pop()!.i;
    const model = { ...v.model, features: v.model.features.map((f, i) => (i === fi ? { ...f, suppressed: true } : f)) };
    st().applyDocument('change part', { ...st().doc, sheets: [{ ...sheet, views: sheet.views.map((x) => (x.id === v.id ? { ...x, model } : x)) }] });
    await refreshFabTables();
    for (let i = 0; i < 20 && st().doc.sheets![0].tables!.find((x) => x.kind === 'cutList')!.cells === before; i++) await new Promise((r) => setTimeout(r, 20));
    const after = st().doc.sheets![0].tables!.find((x) => x.kind === 'cutList')!.cells!;
    expect(after).not.toEqual(before);
    expect(after).toEqual(cutListCells(model)!.cells);
  });
});
