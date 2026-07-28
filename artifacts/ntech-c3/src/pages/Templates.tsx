import { useListTemplates, useCreateTemplate } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, Textarea } from '@/components/shared';
import { FileText, Plus } from 'lucide-react';
import { useState } from 'react';
import type { TemplateInput } from '@workspace/api-client-react';

export function Templates() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: templates, isLoading, refetch } = useListTemplates();
  const createTemplate = useCreateTemplate();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const type = formData.get('type') as TemplateInput['type'];
    const description = formData.get('description') as string;

    if (!title) return;

    createTemplate.mutate({ data: { title, type, description } }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        refetch();
      }
    });
  };

  const types = ['LinkedIn', 'Blog', 'XThread', 'Facebook', 'ReleaseNotes', 'CaseStudy', 'EngineeringJournal', 'RepositoryAudit', 'ArchitectureReview', 'SprintReview', 'Retrospective', 'Other'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">Templates</h1>
            <p className="text-sm text-muted-foreground">Reusable structure blueprints.</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4" /> Add Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider text-primary">New Template Blueprint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Title</label>
                <Input name="title" placeholder="e.g. Standard Release Notes" required autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Type</label>
                <Select name="type" defaultValue="ReleaseNotes">
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Description</label>
                <Textarea name="description" placeholder="Short description..." className="min-h-[60px]" />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Abort</Button>
                <Button type="submit" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? 'Saving...' : 'Create Template'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-muted-foreground font-mono">Loading blueprints...</div>
        ) : templates?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed border-border rounded-lg bg-card/50">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">NO TEMPLATES DEFINED</p>
          </div>
        ) : (
          templates?.map((template) => (
            <Card key={template.id} className="hover:border-primary/50 transition-colors bg-card/50 backdrop-blur group">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="font-mono text-[10px]">{template.type}</Badge>
                </div>
                <CardTitle className="mt-2 text-lg group-hover:text-primary transition-colors">{template.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{template.description || 'No description provided.'}</p>
                <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                  <Button variant="ghost" size="sm" className="font-mono text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit Blueprint
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
