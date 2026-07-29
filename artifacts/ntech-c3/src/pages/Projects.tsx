import { useListProjects, useCreateProject, useCreateEvidence, useListEvidence } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/shared';
import { FolderKanban, Plus, ScanSearch } from 'lucide-react';
import { useState } from 'react';
import { formatShortDate } from '@/lib/utils';
import { Link } from 'wouter';

export function Projects() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const { data: projects, isLoading, refetch } = useListProjects();
  const { data: repositorySnapshots, refetch: refetchSnapshots } = useListEvidence({ type: 'RepositoryAudit' });
  const createProject = useCreateProject();
  const createEvidence = useCreateEvidence();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const color = formData.get('color') as string;

    if (!name) return;

    createProject.mutate({ data: { name, description, color } }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        refetch();
      }
    });
  };

  const handleRepositoryScan = async (projectId?: number) => {
    if (projectId == null) {
      setScanStatus('Choose a Workspace before capturing a repository snapshot.');
      return;
    }
    if (!window.ntc3Vault) {
      setScanStatus('Repository scanning is available in the desktop app.');
      return;
    }
    setScanStatus('Analyzing repository…');
    try {
      const snapshot = await window.ntc3Vault.analyzeRepository();
      if (!snapshot) {
        setScanStatus('');
        return;
      }
      const previous = repositorySnapshots?.find(
        (item) => item.repository === snapshot.name && (projectId == null || item.projectId === projectId),
      );
      let previousMetrics: typeof snapshot.metrics | undefined;
      if (previous?.notes?.startsWith('NTC3_REPOSITORY_SNAPSHOT ')) {
        try {
          previousMetrics = JSON.parse(previous.notes.slice('NTC3_REPOSITORY_SNAPSHOT '.length)).metrics;
        } catch {
          previousMetrics = undefined;
        }
      }
      const deltas = previousMetrics ? {
        dependencies: snapshot.metrics.dependencyCount - previousMetrics.dependencyCount,
        files: snapshot.metrics.fileCount - previousMetrics.fileCount,
        todos: snapshot.metrics.todoCount - previousMetrics.todoCount,
        readiness: snapshot.metrics.readinessScore - previousMetrics.readinessScore,
      } : null;
      const comparison = deltas
        ? `\n## Change since previous snapshot\n\n- Dependencies: ${deltas.dependencies >= 0 ? '+' : ''}${deltas.dependencies}\n- Source files: ${deltas.files >= 0 ? '+' : ''}${deltas.files}\n- TODO markers: ${deltas.todos >= 0 ? '+' : ''}${deltas.todos}\n- Readiness: ${deltas.readiness >= 0 ? '+' : ''}${deltas.readiness} points\n`
        : '\n## Change since previous snapshot\n\n_First snapshot for this repository and project._\n';
      await createEvidence.mutateAsync({
        data: {
          title: `Repository Snapshot — ${snapshot.name}`,
          type: 'RepositoryAudit',
          workspaceId: projectId,
          repository: snapshot.name,
          content: `${snapshot.content}${comparison}`,
          notes: `NTC3_REPOSITORY_SNAPSHOT ${JSON.stringify({
            fingerprint: snapshot.fingerprint,
            metrics: snapshot.metrics,
          })}`,
        },
      });
      await refetchSnapshots();
      setScanStatus(`Snapshot captured for ${snapshot.name}.`);
    } catch {
      setScanStatus('Repository analysis failed. No evidence was created.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">Projects</h1>
            <p className="text-sm text-muted-foreground">Engineering initiatives and systems.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 font-mono text-xs uppercase tracking-wider"
            onClick={() => void handleRepositoryScan()}
            disabled={createEvidence.isPending}
          >
            <ScanSearch className="h-4 w-4" />
            Analyze Repository
          </Button>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4" /> Add Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider text-primary">New Project Profile</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Name</label>
                <Input name="name" placeholder="e.g. Core Service API" required autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Description</label>
                <Input name="description" placeholder="Short description..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Hex Color</label>
                <Input name="color" placeholder="#00E5FF" defaultValue="#00E5FF" />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Abort</Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? 'Saving...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      {scanStatus && <p role="status" className="font-mono text-xs text-muted-foreground">{scanStatus}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-muted-foreground font-mono">Loading projects...</div>
        ) : projects?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed border-border rounded-lg bg-card/50">
            <FolderKanban className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">NO PROJECTS REGISTERED</p>
          </div>
        ) : (
          projects?.map((project) => (
            <Card key={project.id} className="hover:border-primary/50 transition-colors bg-card/50 backdrop-blur group border-l-4" style={{ borderLeftColor: project.color || 'var(--primary)' }}>
              <CardContent className="p-6">
                <Link href={`/projects/${project.id}`} className="font-bold text-lg mb-2 block hover:text-primary">{project.name}</Link>
                <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{project.description || 'No description provided.'}</p>
                <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground font-mono">
                  Updated: {formatShortDate(project.updatedAt)}
                </div>
                <Button
                  variant="outline"
                  className="mt-4 w-full gap-2 font-mono text-xs uppercase"
                  onClick={() => void handleRepositoryScan(project.id)}
                  disabled={createEvidence.isPending}
                >
                  <ScanSearch className="h-4 w-4" />
                  Capture linked snapshot
                </Button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {repositorySnapshots?.filter((item) => item.projectId === project.id).length ?? 0} snapshot(s)
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
