import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('ntc3Vault', {
  importFile: ({ file, workspaceId, title, type, classification, idempotencyKey }) =>
    ipcRenderer.invoke('vault:import-file', {
      sourcePath: webUtils.getPathForFile(file),
      name: file.name,
      mimeType: file.type,
      workspaceId,
      title,
      type,
      classification,
      idempotencyKey,
    }),
  getInfo: () => ipcRenderer.invoke('vault:info'),
  revealFile: (source) => ipcRenderer.invoke('vault:reveal', source),
  exportVault: () => ipcRenderer.invoke('vault:export'),
  backupVault: () => ipcRenderer.invoke('vault:backup'),
  restoreVault: () => ipcRenderer.invoke('vault:restore'),
  analyzeRepository: () => ipcRenderer.invoke('repository:analyze'),
});
