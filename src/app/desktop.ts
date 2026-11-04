/**
 * The desktop shell (Electron) exposes window controls and native file dialogs on
 * window.phlippoDesktop; in the browser these are absent and the app falls back to
 * full screen and download / file-input dialogs.
 */
export interface DesktopFile {
  name: string;
  /** an opaque handle the shell gave for this file; Save passes it back. The renderer never sees the path. */
  handle: string;
  data: ArrayBuffer;
  /** the shell could not read the file (too large, unreadable) */
  error?: string;
}

export interface DesktopSaveResult {
  name: string;
  /** opaque handle of the written file (see DesktopFile) */
  handle: string;
  /** the file was written but the backup (.bak) could not be made or the write could not be flushed */
  warning?: string;
  /** the shell could not write the file; the previous file is untouched */
  error?: string;
}

/** an auto-recover copy: its file name in the folder, the document name and when it was written */
export interface RecoverEntry {
  name: string;
  label: string;
  time: number;
}

export interface RecoverFolder {
  folder: string;
  /** chosen in the folder dialog (else the default folder in the profile) */
  custom: boolean;
}

export interface DesktopApi {
  version: string;
  /** the shell was started with PHLIPPO_E2E=1: the test hooks exist */
  testHooks?: boolean;
  minimize(): Promise<void>;
  toggleMaximize(): Promise<boolean>;
  isMaximized(): Promise<boolean>;
  /** force: close although the document has unsaved changes (the app asked already) */
  close(force?: boolean): Promise<void>;
  onWindowState(cb: (state: { maximized: boolean }) => void): () => void;
  /** the window's close button / Alt+F4 while the document has unsaved changes */
  onCloseRequested?(cb: () => void): () => void;
  /** a .kcad opened from the file manager (file association) */
  onOpenFile?(cb: (file: DesktopFile) => void): () => void;
  /** the shell was started with --self-test (QA F97): run it and hand back the result */
  onSelfTest?(cb: () => void): () => void;
  selfTestDone?(result: import('./selfTest').SelfTestResult): void;
  /** tell the shell whether the document has unsaved changes (closing then asks first) */
  setDirty?(value: boolean): void;
  openFile(filters: { name: string; extensions: string[] }[]): Promise<DesktopFile | null>;
  saveFile(opts: { defaultPath: string; filters: { name: string; extensions: string[] }[]; data: ArrayBuffer; handle?: string; /** Options ▸ Backup/Recover */ backup?: { copies: number; removeDays: number } }): Promise<DesktopSaveResult | null>;
  saveFileAs(opts: { defaultPath: string; filters: { name: string; extensions: string[] }[]; data: ArrayBuffer }): Promise<DesktopSaveResult | null>;
  /**
   * Auto-Recover (Options ▸ Backup/Recover): copies of the open documents in the auto-recover folder. The shell decides
   * the folder (QA F156); a copy is kept per document id and, with `handle`, per file of that document (QA F153).
   */
  writeRecover?(opts: { id: string; name: string; handle?: string | null; data: ArrayBuffer }): Promise<{ name?: string; error?: string } | null>;
  listRecover?(): Promise<RecoverEntry[]>;
  readRecover?(name: string): Promise<ArrayBuffer | null>;
  /** the copies of document `id`: the one without a file and the ones at the files of `handles` */
  removeRecover?(opts: { id: string; handles?: (string | null)[] }): Promise<void>;
  recoverFolder?(): Promise<RecoverFolder | null>;
  /** the folder dialog of the shell; null when cancelled */
  chooseRecoverFolder?(): Promise<RecoverFolder | null>;
  resetRecoverFolder?(): Promise<RecoverFolder | null>;
  /** software OpenGL (SwiftShader): this run's state (and what turned it on) and the choice for the next start */
  gpuStatus?(): Promise<{ software: boolean; source?: 'argument' | 'environment' | 'options' | null; next: boolean } | null>;
  setSoftwareGL?(on: boolean): Promise<boolean>;
  restartApp?(): Promise<void>;
}

export function desktop(): DesktopApi | null {
  return (window as unknown as { phlippoDesktop?: DesktopApi }).phlippoDesktop ?? null;
}

export const isDesktop = () => desktop() !== null;

/** handle of the document on disk (desktop only), kept per session so Save writes without asking again */
let currentHandle: string | null = null;
export const getDocumentHandle = () => currentHandle;
export const setDocumentHandle = (h: string | null) => {
  currentHandle = h;
};
