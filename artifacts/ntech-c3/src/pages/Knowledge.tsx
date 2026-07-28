import { useState } from 'react';
import { useListKnowledge, useCreateKnowledge } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/shared';
import { Library, Plus, Search, FileText } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { formatShortDate } from '@/lib/utils';

export function Knowledge() {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: pages, isLoading } = useListKnowledge({ search: search || undefined });
  const createKnowledge = useCreateKnowledge();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;

    if (!title) return;

    createKnowledge.mutate({ data: { title, category } }, {
      onSuccess: (newPage) => {
        setIsCreateOpen(false);
        setLocation(`/knowledge/${newPage.id}`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
            <Library className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Permanent engineering documentation.</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4" /> New Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider text-primary">Create Knowledge Page</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Title</label>
                <Input name="title" placeholder="e.g. Authentication Architecture" required autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Category</label>
                <Input name="category" placeholder="e.g. Architecture" />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Abort</Button>
                <Button type="submit" disabled={createKnowledge.isPending}>
                  {createKnowledge.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search knowledge..." 
          className="pl-9 font-mono text-sm bg-card"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 border border-border rounded-lg bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground font-mono">Reading archives...</div>
        ) : pages?.length === 0 ? (
          <div className="p-12 text-center">
            <Library className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">NO PAGES FOUND.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {pages?.map((page) => (
              <Link key={page.id} href={`/knowledge/${page.id}`} className="flex items-center p-4 hover:bg-muted/50 transition-colors group">
                <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary mr-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium group-hover:text-primary transition-colors truncate">{page.title}</h3>
                  {page.category && <p className="text-[10px] font-mono text-muted-foreground uppercase">{page.category}</p>}
                </div>
                <div className="text-xs text-muted-foreground font-mono shrink-0 ml-4">
                  {formatShortDate(page.updatedAt)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
