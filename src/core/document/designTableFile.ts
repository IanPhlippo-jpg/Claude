/**
 * Design table files: an Excel workbook (.xlsx, the first worksheet) or CSV text, told apart by their content (a ZIP
 * archive is a workbook), read into the same rows as the CSV path (designTable.ts). An Excel 97-2003 workbook (.xls,
 * an OLE compound file) is not read; the message asks for .xlsx or CSV.
 */
import type { Document } from './types';
import { designTableRows, importDesignTable, importDesignTableRows, type DesignTableExportOptions, type DesignTableResult } from './designTable';
import { readXlsx, writeXlsx, type Cell } from './xlsx';
import { isZip } from './zip';

export type DesignTableFormat = 'xlsx' | 'csv';

/** the design table as an Excel workbook: the rows of designTableRows on Sheet1, the values as numbers */
export function exportDesignTableXlsx(doc: Document, opts: Pick<DesignTableExportOptions, 'states'> = {}): Uint8Array {
  return writeXlsx(designTableRows(doc, opts), 'Sheet1');
}

const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/** an OLE compound file (Excel 97-2003 .xls) */
export const isOleFile = (b: Uint8Array): boolean => b.length >= 8 && OLE.every((x, i) => b[i] === x);

/** a worksheet cell as the text the CSV path reads (a number with a decimal point, TRUE / FALSE) */
export function cellText(c: Cell): string {
  if (c === null) return '';
  if (typeof c === 'boolean') return c ? 'TRUE' : 'FALSE';
  return String(c);
}

/** Insert Design Table from the bytes of a file: an .xlsx workbook or CSV / text */
export async function importDesignTableFile(doc: Document, bytes: Uint8Array): Promise<DesignTableResult> {
  const fail = (e: string): DesignTableResult => ({ doc, errors: [e], configurations: [] });
  if (isZip(bytes)) {
    let rows: Cell[][];
    try {
      rows = (await readXlsx(bytes)).rows;
    } catch (e) {
      return fail(`The workbook could not be read: ${e instanceof Error ? e.message : String(e)}`);
    }
    return importDesignTableRows(doc, rows.map((r) => Array.from(r, (c) => cellText(c ?? null))));
  }
  if (isOleFile(bytes)) return fail('This is an Excel 97-2003 workbook (.xls), which is not read: save it as an Excel Workbook (.xlsx) or as CSV.');
  return importDesignTable(doc, new TextDecoder('utf-8').decode(bytes));
}
