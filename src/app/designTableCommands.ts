import { useStore, solveAll } from './store';
import { desktop } from './desktop';
import { exportDesignTable, importDesignTable, type DesignTableResult } from '../core/document/designTable';
import { exportDesignTableXlsx, importDesignTableFile, type DesignTableFormat } from '../core/document/designTableFile';

/**
 * Design Table commands of the Configurations panel (loaded on first use): Export Design Table… saves the
 * configurations as an Excel workbook (.xlsx) or a CSV table; Insert Design Table… reads either and creates / updates
 * the configurations. The desktop app uses its own file dialogs, the browser a download and a file input.
 */
const FORMATS: Record<DesignTableFormat, { filter: { name: string; extensions: string[] }; mime: string }> = {
  xlsx: { filter: { name: 'Excel Workbook', extensions: ['xlsx'] }, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  csv: { filter: { name: 'CSV (semicolon separated)', extensions: ['csv'] }, mime: 'text/csv' },
};

export async function exportDesignTableFile(format: DesignTableFormat = 'xlsx'): Promise<void> {
  const st = useStore.getState();
  const name = `${st.doc.name} - Design Table.${format}`;
  // the CSV starts with a BOM so that Excel reads it as UTF-8
  const data = format === 'xlsx' ? exportDesignTableXlsx(st.doc) : new TextEncoder().encode('﻿' + exportDesignTable(st.doc));
  const api = desktop();
  if (api) {
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const r = await api.saveFileAs({ defaultPath: name, filters: [FORMATS[format].filter], data: buf });
    if (r?.error) st.pushMessage(`Design Table not saved: ${r.error}`, 'error');
    else if (r) st.pushMessage(`Design Table exported to ${r.name}.`);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([data as BlobPart], { type: FORMATS[format].mime }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  st.pushMessage('Design Table exported.');
}

/** apply a read design table to the open document as one undoable step; returns the messages shown */
function applyDesignTable(r: DesignTableResult, fileName: string): string[] {
  const st = useStore.getState();
  if (r.errors.length) {
    const more = r.errors.length > 1 ? ` (${r.errors.length - 1} more problem${r.errors.length > 2 ? 's' : ''})` : '';
    st.pushMessage(`Design Table not applied: ${r.errors[0]}${more}`, 'error');
    for (const e of r.errors.slice(1, 4)) st.pushMessage(e, 'warn');
    return r.errors;
  }
  const solved = solveAll(r.doc, st.solve);
  st.applyDocument('Insert Design Table', solved.doc);
  useStore.setState({ solve: solved.solve });
  const added = r.configurations.filter((c) => c.added).length;
  const msg = `Design Table read from ${fileName}: ${r.configurations.length} configuration${r.configurations.length === 1 ? '' : 's'} (${added} added).`;
  st.pushMessage(msg);
  return [msg];
}

/** apply design table text (CSV) to the open document */
export function applyDesignTableText(text: string, fileName = 'the design table'): string[] {
  return applyDesignTable(importDesignTable(useStore.getState().doc, text), fileName);
}

/** apply a design table file (.xlsx or CSV, told apart by the content) to the open document */
export async function applyDesignTableBytes(bytes: Uint8Array, fileName: string): Promise<string[]> {
  return applyDesignTable(await importDesignTableFile(useStore.getState().doc, bytes), fileName);
}

export function insertDesignTableFile(): void {
  const api = desktop();
  if (api) {
    void api.openFile([{ name: 'Design Table (Excel, CSV)', extensions: ['xlsx', 'csv', 'txt'] }, FORMATS.xlsx.filter, FORMATS.csv.filter]).then((f) => {
      if (!f) return;
      if (f.error) useStore.getState().pushMessage(`${f.name} could not be read: ${f.error}`, 'error');
      else void applyDesignTableBytes(new Uint8Array(f.data), f.name);
    });
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = `.xlsx,.csv,.txt,${FORMATS.xlsx.mime},text/csv,text/plain`;
  input.onchange = () => {
    const f = input.files?.[0];
    if (f) void f.arrayBuffer().then((b) => applyDesignTableBytes(new Uint8Array(b), f.name));
  };
  input.click();
}
