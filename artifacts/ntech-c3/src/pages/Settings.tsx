import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/shared';
import { Settings as SettingsIcon, Shield, Server, Palette, Archive, Download, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function Settings() {
  const [vaultStatus, setVaultStatus] = useState('');

  const runVaultAction = async (
    label: string,
    action: 'exportVault' | 'backupVault' | 'restoreVault',
  ) => {
    if (!window.ntc3Vault) {
      setVaultStatus(`${label} is available in the desktop app.`);
      return;
    }
    setVaultStatus(`${label} in progress…`);
    try {
      const result = await window.ntc3Vault[action]();
      setVaultStatus(result ? `${label} completed.` : `${label} cancelled.`);
    } catch {
      setVaultStatus(`${label} failed. The existing vault was preserved.`);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono">Settings</h1>
          <p className="text-sm text-muted-foreground">System configuration parameters.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-2">
          <Button variant="secondary" className="w-full justify-start font-mono text-sm" size="lg">
            <Server className="w-4 h-4 mr-3" /> Core Config
          </Button>
          <Button variant="ghost" className="w-full justify-start font-mono text-sm text-muted-foreground" size="lg">
            <Shield className="w-4 h-4 mr-3" /> Security
          </Button>
          <Button variant="ghost" className="w-full justify-start font-mono text-sm text-muted-foreground" size="lg">
            <Palette className="w-4 h-4 mr-3" /> Interface
          </Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle className="font-mono text-sm uppercase tracking-wider text-muted-foreground">System Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">System Name</label>
                <Input defaultValue="N-Tech C³" disabled className="max-w-md bg-muted/30" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Version</label>
                <div className="text-sm font-mono p-2 bg-muted/30 border border-border rounded-md inline-block max-w-md w-full">v0.1.0-alpha.99</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle className="font-mono text-sm uppercase tracking-wider text-muted-foreground">Vault portability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground">
                Export human-readable Markdown and JSON, create a complete compressed backup, or restore a trusted backup.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="gap-2" onClick={() => void runVaultAction('Export', 'exportVault')}>
                  <Download className="h-4 w-4" /> Export Markdown + JSON
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => void runVaultAction('Backup', 'backupVault')}>
                  <Archive className="h-4 w-4" /> Back up vault
                </Button>
                <Button variant="outline" className="gap-2 border-amber-500/50 text-amber-400" onClick={() => void runVaultAction('Restore', 'restoreVault')}>
                  <RotateCcw className="h-4 w-4" /> Restore backup
                </Button>
              </div>
              {vaultStatus && <p role="status" className="font-mono text-xs text-muted-foreground">{vaultStatus}</p>}
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader className="border-b border-border/50 bg-destructive/5">
              <CardTitle className="font-mono text-sm uppercase tracking-wider text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Purge Cache</h4>
                  <p className="text-xs text-muted-foreground">Clear all local storage and session data.</p>
                </div>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground font-mono text-xs">Purge</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
