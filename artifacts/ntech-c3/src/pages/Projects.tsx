import { useListProjects, useCreateProject } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/shared';
import { FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatShortDate } from '@/lib/utils';

export function Projects() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: projects, isLoading, refetch } = useListProjects();
  const createProject = useCreateProject();

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
                <h3 className="font-bold text-lg mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">{project.description || 'No description provided.'}</p>
                <div className="pt-4 border-t border-border/50 text-xs text-muted-foreground font-mono">
                  Updated: {formatShortDate(project.updatedAt)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
