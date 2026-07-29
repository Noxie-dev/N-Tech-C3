/// <reference types="vite/client" />

type VaultImportResult = {
  source: string;
  checksum: string;
  evidenceId: number;
  ingestId: string;
};

interface Window {
  ntc3Vault?: {
    importFile(input: {
      file: File;
      workspaceId: number;
      title: string;
      type: string;
      classification?: 'FactualRecord' | 'Observation' | 'Testimony' | 'DerivedAnalysis' | 'ExternalReference';
      idempotencyKey?: string;
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
