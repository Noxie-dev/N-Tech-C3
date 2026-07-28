import { useGetProject, useListEvidence } from '@workspace/api-client-react';
import { ArrowLeft, GitCompareArrows, History } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { Badge, Card, CardContent, Spinner } from '@/components/shared';
import { formatShortDate } from '@/lib/utils';

type SnapshotMetrics = {
  branch: string;
  commit: string;
  dependencyCount: number;
  fileCount: number;
  todoCount: number;
  readinessScore: number;
};

function metricsFromNotes(notes?: string | null): SnapshotMetrics | null {
  const prefix = 'NTC3_REPOSITORY_SNAPSHOT ';
  if (!notes?.startsWith(prefix)) return null;
  try {
    return JSON.parse(notes.slice(prefix.length)).metrics ?? null;
  } catch {
    return null;
  }
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data: project, isLoading: projectLoading } = useGetProject(projectId);
  const { data: snapshots = [], isLoading: snapshotsLoading } = useListEvidence({
    type: 'RepositoryAudit',
    projectId,
  });

  if (projectLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
  if (!project) return <p role="alert">Project not found.</p>;

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>
      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: project.color || '#00e5ff' }} />
          <h1 className="font-mono text-2xl font-bold">{project.name}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{project.description || 'No description provided.'}</p>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-mono text-lg font-semibold">Repository snapshot timeline</h2>
        </div>
        {snapshotsLoading ? <Spinner /> : snapshots.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No linked snapshots yet. Capture one from the Projects page.
          </div>
        ) : (
          <div className="space-y-4">
            {snapshots.map((snapshot, index) => {
              const current = metricsFromNotes(snapshot.notes);
              const previous = metricsFromNotes(snapshots[index + 1]?.notes);
              return (
                <Card key={snapshot.id}>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{snapshot.title}</h3>
                        <p className="font-mono text-xs text-muted-foreground">{formatShortDate(snapshot.createdAt)}</p>
                      </div>
                      {current && <Badge variant={current.readinessScore >= 80 ? 'success' : 'warning'}>{current.readinessScore}% ready</Badge>}
                    </div>
                    {current && (
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <div><span className="text-muted-foreground">Files</span><p className="font-mono">{current.fileCount}</p></div>
                        <div><span className="text-muted-foreground">Dependencies</span><p className="font-mono">{current.dependencyCount}</p></div>
                        <div><span className="text-muted-foreground">TODOs</span><p className="font-mono">{current.todoCount}</p></div>
                        <div><span className="text-muted-foreground">Commit</span><p className="truncate font-mono">{current.commit || 'unknown'}</p></div>
                      </div>
                    )}
                    {current && previous && (
                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                        <GitCompareArrows className="h-4 w-4 text-primary" />
                        <span>Files {current.fileCount - previous.fileCount >= 0 ? '+' : ''}{current.fileCount - previous.fileCount}</span>
                        <span>Dependencies {current.dependencyCount - previous.dependencyCount >= 0 ? '+' : ''}{current.dependencyCount - previous.dependencyCount}</span>
                        <span>TODOs {current.todoCount - previous.todoCount >= 0 ? '+' : ''}{current.todoCount - previous.todoCount}</span>
                        <span>Readiness {current.readinessScore - previous.readinessScore >= 0 ? '+' : ''}{current.readinessScore - previous.readinessScore}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
