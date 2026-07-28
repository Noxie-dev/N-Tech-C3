/// <reference types="vite/client" />

type VaultImportResult = {
  source: string;
  checksum: string;
};

interface Window {
  ntc3Vault?: {
    importFile(input: {
      name: string;
      mimeType: string;
      bytes: ArrayBuffer;
    }): Promise<VaultImportResult>;
    getInfo(): Promise<{ root: string; database: string }>;
    previewFile(source: string): Promise<{ mimeType: string; dataUrl: string } | null>;
    revealFile(source: string): Promise<boolean>;
    exportVault(): Promise<{ jsonPath: string; markdownPath: string } | null>;
    backupVault(): Promise<{ path: string } | null>;
    restoreVault(): Promise<{ recovery: string } | null>;
    analyzeRepository(): Promise<{
      name: string;
      branch: string;
      commit: string;
      readinessScore: number;
      fingerprint: string;
      metrics: {
        branch: string;
        commit: string;
        dependencyCount: number;
        fileCount: number;
        todoCount: number;
        readinessScore: number;
      };
      content: string;
    } | null>;
  };
}
