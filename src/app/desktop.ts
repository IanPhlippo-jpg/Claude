/**
 * The desktop shell (Electron) exposes window controls and native file dialogs on
 * window.phlippoDesktop; in the browser these are absent and the app falls back to
 * full screen and download / file-input dialogs.
 */
export interface DesktopFile {
  name: string;
  path: string;
  data: ArrayBuffer;
  /** the shell could not read the file (too large, unreadable) */
  error?: string;
}

export interface DesktopSaveResult {
  name: string;
  path: string;
  /** the shell could not write the file; the previous file is untouched */
  error?: string;
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
  /** tell the shell whether the document has unsaved changes (closing then asks first) */
  setDirty?(value: boolean): void;
  openFile(filters: { name: string; extensions: string[] }[]): Promise<DesktopFile | null>;
  saveFile(opts: { defaultPath: string; filters: { name: string; extensions: string[] }[]; data: ArrayBuffer; path?: string }): Promise<DesktopSaveResult | null>;
  saveFileAs(opts: { defaultPath: string; filters: { name: string; extensions: string[] }[]; data: ArrayBuffer }): Promise<DesktopSaveResult | null>;
}

export function desktop(): DesktopApi | null {
  return (window as unknown as { phlippoDesktop?: DesktopApi }).phlippoDesktop ?? null;
}

export const isDesktop = () => desktop() !== null;

/** path of the document on disk (desktop only), kept per session so Save writes without asking again */
let currentPath: string | null = null;
export const getDocumentPath = () => currentPath;
export const setDocumentPath = (p: string | null) => {
  currentPath = p;
};
