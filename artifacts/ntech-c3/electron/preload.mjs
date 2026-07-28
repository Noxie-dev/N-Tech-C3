import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ntc3Vault', {
  importFile: ({ name, mimeType, bytes }) =>
    ipcRenderer.invoke('vault:import-file', {
      name,
      mimeType,
      bytes: new Uint8Array(bytes),
    }),
  getInfo: () => ipcRenderer.invoke('vault:info'),
  previewFile: (source) => ipcRenderer.invoke('vault:preview', source),
  revealFile: (source) => ipcRenderer.invoke('vault:reveal', source),
  exportVault: () => ipcRenderer.invoke('vault:export'),
  backupVault: () => ipcRenderer.invoke('vault:backup'),
  restoreVault: () => ipcRenderer.invoke('vault:restore'),
  analyzeRepository: () => ipcRenderer.invoke('repository:analyze'),
});
