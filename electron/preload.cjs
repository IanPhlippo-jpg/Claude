// Bridge between the app and the desktop shell: window buttons and native file dialogs.
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const h = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, h);
  return () => ipcRenderer.removeListener(channel, h);
};

contextBridge.exposeInMainWorld('phlippoDesktop', {
  version: process.versions.electron,
  /** the test hooks (window.__phlippoStore …) exist only when the shell was started with PHLIPPO_E2E=1 */
  testHooks: process.argv.includes('--phlippo-e2e'),
  minimize: () => ipcRenderer.invoke('win:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('win:toggleMaximize'),
  isMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  /** force: close although the document has unsaved changes (the app asked already) */
  close: (force) => ipcRenderer.invoke('win:close', !!force),
  onWindowState: on('win:state'),
  /** the window's close button / Alt+F4 with unsaved changes: the app asks and closes with force */
  onCloseRequested: on('win:closeRequested'),
  /** a .kcad opened from the Explorer (file association), also while the app runs */
  onOpenFile: on('file:opened'),
  setDirty: (value) => ipcRenderer.send('doc:dirty', !!value),
  /** --self-test of the installed program (QA F97): the shell asks, the app answers with its result */
  onSelfTest: on('self-test:run'),
  selfTestDone: (result) => ipcRenderer.send('self-test:done', result),
  openFile: (filters) => ipcRenderer.invoke('file:open', filters),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
  saveFileAs: (opts) => ipcRenderer.invoke('file:saveAs', opts),
  /** Auto-Recover: copies of the open document in the auto-recover folder */
  writeRecover: (opts) => ipcRenderer.invoke('recover:write', opts),
  listRecover: (folder) => ipcRenderer.invoke('recover:list', folder),
  readRecover: (opts) => ipcRenderer.invoke('recover:read', opts),
  removeRecover: (opts) => ipcRenderer.invoke('recover:remove', opts),
  /** software OpenGL (SwiftShader): this run's state, the choice for the next start, a restart to apply it */
  gpuStatus: () => ipcRenderer.invoke('gpu:status'),
  setSoftwareGL: (on) => ipcRenderer.invoke('gpu:setSoftware', !!on),
  restartApp: () => ipcRenderer.invoke('gpu:restart'),
});
