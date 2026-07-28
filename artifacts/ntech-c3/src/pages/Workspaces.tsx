import {
  useCreateWorkspace, useDuplicateWorkspace, useListWorkspaces, useUpdateWorkspace,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Archive, Boxes, Copy, Download, Heart, Plus, Search, Star,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
import {
  Badge, Button, Card, CardContent, Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, Input, Spinner,
} from '@/components/shared';
import { formatShortDate } from '@/lib/utils';

type View = 'Active' | 'Archived' | 'Favorites' | 'Pinned';

export function Workspaces() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('Active');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const params = {
    search: search || undefined,
    status: view === 'Archived' ? 'Archived' as const : undefined,
    favorite: view === 'Favorites' ? true : undefined,
    pinned: view === 'Pinned' ? true : undefined,
  };
  const { data: workspaces = [], isLoading, isError } = useListWorkspaces(params);
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const duplicateWorkspace = useDuplicateWorkspace();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['/api/workspaces'] });

  const create = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createWorkspace.mutate({
      data: {
        name: String(form.get('name')),
        description: String(form.get('description') || ''),
        purpose: String(form.get('purpose') || 'Other') as 'Product' | 'Marketing' | 'Research' | 'Internal' | 'Personal' | 'Other',
        color: String(form.get('color') || '#2f80ff'),
        tags: String(form.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean),
      },
    }, { onSuccess: () => { setIsCreateOpen(false); void refresh(); } });
  };

  const changeStatus = (workspaceId: number, status: 'Active' | 'Archived') => {
    updateWorkspace.mutate({ workspaceId, data: { status } }, { onSuccess: () => void refresh() });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Boxes className="h-7 w-7 text-primary" />
            <h1 className="font-mono text-2xl font-bold">Workspaces</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Choose the operating context for an initiative.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Workspace</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Workspace</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4 pt-3">
              <Input name="name" placeholder="Workspace name" required autoFocus />
              <Input name="description" placeholder="What is this initiative?" />
              <select name="purpose" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                {['Product', 'Marketing', 'Research', 'Internal', 'Personal', 'Other'].map((purpose) => <option key={purpose}>{purpose}</option>)}
              </select>
              <Input name="tags" placeholder="Tags, comma separated" />
              <Input name="color" type="color" defaultValue="#2f80ff" className="p-1" />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button disabled={createWorkspace.isPending}>Create Workspace</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['Active', 'Favorites', 'Pinned', 'Archived'] as View[]).map((item) => (
          <Button key={item} variant={view === item ? 'default' : 'outline'} size="sm" onClick={() => setView(item)}>{item}</Button>
        ))}
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search workspaces" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, description, or tags" className="pl-9" />
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : isError ? (
        <div role="alert" className="rounded-lg border border-destructive/50 p-8 text-center">Workspaces could not be loaded. Check the local API and retry.</div>
      ) : workspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <Boxes className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">{view === 'Active' ? 'Start your first engineering workspace.' : `No ${view.toLowerCase()} workspaces.`}</h2>
          {view === 'Active' && <Button className="mt-5" onClick={() => setIsCreateOpen(true)}>New Workspace</Button>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card key={workspace.id} className="border-l-4 bg-card/70" style={{ borderLeftColor: workspace.color || '#2f80ff' }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/workspaces/${workspace.id}`} className="block truncate text-lg font-semibold hover:text-primary">{workspace.name}</Link>
                    <p className="text-xs text-muted-foreground">{workspace.purpose} · Updated {formatShortDate(workspace.updatedAt)}</p>
                  </div>
                  <Badge variant={workspace.status === 'Active' ? 'success' : 'secondary'}>{workspace.status}</Badge>
                </div>
                <p className="mt-3 min-h-10 text-sm text-muted-foreground">{workspace.description || 'No description yet.'}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/40 p-2"><strong>{workspace.metrics.stories}</strong><p className="text-[10px] text-muted-foreground">Stories</p></div>
                  <div className="rounded-md bg-muted/40 p-2"><strong>{workspace.metrics.evidence}</strong><p className="text-[10px] text-muted-foreground">Evidence</p></div>
                  <div className="rounded-md bg-muted/40 p-2"><strong>{workspace.health.score}%</strong><p className="text-[10px] text-muted-foreground">Health</p></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1 border-t pt-3">
                  <Link href={`/workspaces/${workspace.id}`} className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Open</Link>
                  <Button size="icon" variant="ghost" title="Duplicate" onClick={() => duplicateWorkspace.mutate({ workspaceId: workspace.id }, { onSuccess: () => void refresh() })}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title={workspace.isFavorite ? 'Favorite' : 'Not favorite'} onClick={() => updateWorkspace.mutate({ workspaceId: workspace.id, data: { isFavorite: !workspace.isFavorite } }, { onSuccess: () => void refresh() })}>{workspace.isFavorite ? <Heart className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}</Button>
                  <Button size="icon" variant="ghost" title={workspace.isPinned ? 'Pinned' : 'Not pinned'} onClick={() => updateWorkspace.mutate({ workspaceId: workspace.id, data: { isPinned: !workspace.isPinned } }, { onSuccess: () => void refresh() })}><Star className={workspace.isPinned ? 'h-4 w-4 fill-current' : 'h-4 w-4'} /></Button>
                  <a href={`/api/workspaces/${workspace.id}/export`} download title="Export manifest" className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"><Download className="h-4 w-4" /></a>
                  <Button size="icon" variant="ghost" title={workspace.status === 'Archived' ? 'Restore' : 'Archive'} onClick={() => changeStatus(workspace.id, workspace.status === 'Archived' ? 'Active' : 'Archived')}><Archive className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
