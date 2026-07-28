import { useGetWorkspace } from '@workspace/api-client-react';
import {
  Activity, ArrowLeft, BookOpen, Boxes, FileArchive, Image, Library,
  Megaphone, Plus, Settings, ShieldCheck,
} from 'lucide-react';
import { Link, useParams } from 'wouter';
import { Badge, Button, Card, CardContent, Spinner } from '@/components/shared';
import { formatShortDate } from '@/lib/utils';

export function WorkspaceDetail() {
  const { id } = useParams<{ id: string }>();
  const workspaceId = Number(id);
  const { data: workspace, isLoading, isError } = useGetWorkspace(workspaceId);
  if (isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
  if (isError || !workspace) return <div role="alert">Workspace not found.</div>;

  const metrics = [
    ['Stories', workspace.metrics.stories, BookOpen, `/stories?workspaceId=${workspace.id}`],
    ['Evidence', workspace.metrics.evidence, FileArchive, `/evidence?workspaceId=${workspace.id}`],
    ['Knowledge', workspace.metrics.knowledge, Library, `/knowledge?workspaceId=${workspace.id}`],
    ['Campaigns', workspace.metrics.campaigns, Megaphone, `/campaigns?workspaceId=${workspace.id}`],
    ['Assets', workspace.metrics.assets, Image, `/assets?workspaceId=${workspace.id}`],
    ['Exports', workspace.metrics.exports, Boxes, `/workspaces/${workspace.id}/settings`],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/workspaces" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Workspaces</Link>
        <Link href={`/workspaces/${workspace.id}/settings`} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-accent"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
      </div>
      {workspace.status !== 'Active' && <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">{workspace.status === 'Archived' ? 'This Workspace is archived and read-only.' : 'This Workspace needs an integrity review.'}</div>}
      <header className="rounded-xl border border-border bg-card/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3"><span className="h-5 w-5 rounded" style={{ backgroundColor: workspace.color || '#2f80ff' }} /><h1 className="text-3xl font-bold">{workspace.name}</h1></div>
            <p className="mt-2 max-w-2xl text-muted-foreground">{workspace.description || 'No description yet.'}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge>{workspace.purpose}</Badge><Badge variant="outline">{workspace.owner}</Badge>{workspace.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
          </div>
          <div className="text-center"><div className="text-4xl font-bold text-primary">{workspace.health.score}%</div><p className="text-xs text-muted-foreground">Workspace health</p></div>
        </div>
        {workspace.currentGoal && <div className="mt-5 border-t pt-4"><p className="text-xs uppercase text-muted-foreground">Current goal</p><p className="mt-1 font-medium">{workspace.currentGoal}</p></div>}
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {metrics.map(([label, value, Icon, href]) => <Link href={href} key={label} className="rounded-lg border border-border bg-card/60 p-4 hover:border-primary/50"><Icon className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></Link>)}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-5"><h2 className="flex items-center gap-2 font-semibold"><BookOpen className="h-5 w-5 text-primary" /> Continue Working</h2>{workspace.continueWorking ? <Link href={`/stories/${workspace.continueWorking.id}`} className="mt-4 block rounded-lg border p-4 hover:border-primary"><p className="font-medium">{workspace.continueWorking.title}</p><p className="text-xs text-muted-foreground">{workspace.continueWorking.status}</p></Link> : <p className="mt-4 text-sm text-muted-foreground">Create the first Story in this Workspace.</p>}</CardContent></Card>
        <Card><CardContent className="p-5"><h2 className="flex items-center gap-2 font-semibold"><Activity className="h-5 w-5 text-primary" /> Recent Activity</h2><div className="mt-3 space-y-2">{workspace.recentActivity.length ? workspace.recentActivity.map((item) => <div key={item.id} className="flex justify-between gap-3 rounded-md bg-muted/30 p-2 text-sm"><span className="truncate">{item.action} {item.entityTitle}</span><span className="shrink-0 text-xs text-muted-foreground">{formatShortDate(item.createdAt)}</span></div>) : <p className="text-sm text-muted-foreground">Activity appears after your first action.</p>}</div></CardContent></Card>
      </div>

      <Card><CardContent className="p-5"><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Health Breakdown</h2><div className="mt-4 grid gap-2 md:grid-cols-5">{workspace.health.components.map((component) => <div key={component.key} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{component.label}</p><p className="mt-1 text-xl font-semibold">{component.applicable ? `${component.score}%` : 'N/A'}</p><p className="mt-2 text-[11px] text-muted-foreground">{component.explanation}</p></div>)}</div></CardContent></Card>

      <div className="sticky bottom-3 flex flex-wrap justify-center gap-2 rounded-xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur">
        {[['Story', '/stories'], ['Evidence', '/evidence'], ['Campaign', '/campaigns'], ['Knowledge', '/knowledge']].map(([label, path]) => <Link key={label} href={`${path}?workspaceId=${workspace.id}&create=1`} className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><Plus className="mr-1 h-4 w-4" /> {label}</Link>)}
      </div>
    </div>
  );
}
