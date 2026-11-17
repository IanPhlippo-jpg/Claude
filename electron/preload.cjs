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
  onCloseRequested: (cb) => {
    // the receipt goes back at once: a renderer that does not answer within seconds is hung (QA 0.5.14 advice P2-3)
    const h = () => { ipcRenderer.send('win:closeAck'); cb(); };
    ipcRenderer.on('win:closeRequested', h);
    return () => ipcRenderer.removeListener('win:closeRequested', h);
  },
  /** a .kcad opened from the Explorer (file association), also while the app runs */
  onOpenFile: on('file:opened'),
  setDirty: (value) => ipcRenderer.send('doc:dirty', !!value),
  /** --self-test of the installed program (QA F97): the shell asks, the app answers with its result */
  onSelfTest: on('self-test:run'),
  selfTestDone: (result) => ipcRenderer.send('self-test:done', result),
  openFile: (filters) => ipcRenderer.invoke('file:open', filters),
  saveFile: (opts) => ipcRenderer.invoke('file:save', opts),
  saveFileAs: (opts) => ipcRenderer.invoke('file:saveAs', opts),
  /** Auto-Recover: copies of the open documents in the auto-recover folder; the shell decides the folder */
  writeRecover: (opts) => ipcRenderer.invoke('recover:write', opts),
  listRecover: () => ipcRenderer.invoke('recover:list'),
  readRecover: (name) => ipcRenderer.invoke('recover:read', name),
  removeRecover: (opts) => ipcRenderer.invoke('recover:remove', opts),
  recoverFolder: () => ipcRenderer.invoke('recover:folder'),
  /** Package Files: the files go into one folder the user picks */
  savePackage: (files) => ipcRenderer.invoke('pack:save', files),
  chooseRecoverFolder: () => ipcRenderer.invoke('recover:chooseFolder'),
  resetRecoverFolder: () => ipcRenderer.invoke('recover:resetFolder'),
  /** software OpenGL (SwiftShader): this run's state, the choice for the next start, a restart to apply it */
  gpuStatus: () => ipcRenderer.invoke('gpu:status'),
  setSoftwareGL: (on) => ipcRenderer.invoke('gpu:setSoftware', !!on),
  restartApp: (opts) => ipcRenderer.invoke('gpu:restart', { force: !!(opts && opts.force) }),
});
