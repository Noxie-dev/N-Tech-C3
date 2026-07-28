import { useState } from 'react';
import { useListStories, useCreateStory } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/shared';
import { BookOpen, Plus, Search, Filter } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { formatShortDate } from '@/lib/utils';
import type { StoryInput } from '@workspace/api-client-react';

export function Stories() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: stories, isLoading, refetch } = useListStories({ search: search || undefined, status: statusFilter || undefined });
  const createStory = useCreateStory();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const status = formData.get('status') as StoryInput['status'];
    const priority = formData.get('priority') as StoryInput['priority'];

    if (!title) return;

    createStory.mutate({ data: { title, status, priority } }, {
      onSuccess: (newStory) => {
        setIsCreateOpen(false);
        setLocation(`/stories/${newStory.id}`);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
      Published: "success",
      Approved: "info",
      Review: "warning",
      Draft: "default",
      Idea: "secondary",
      Research: "outline",
      Archived: "secondary"
    };
    return <Badge variant={map[status] || "outline"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority?: string | null) => {
    if (!priority) return null;
    const map: Record<string, "default" | "secondary" | "destructive" | "outline" | "warning"> = {
      Critical: "destructive",
      High: "warning",
      Medium: "secondary",
      Low: "outline"
    };
    return <Badge variant={map[priority] || "outline"} className="text-[10px] px-1.5">{priority}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">Stories</h1>
            <p className="text-sm text-muted-foreground">Manage narrative content and engineering updates.</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4" /> Initialize Story
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider text-primary">Initialize New Story</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Title</label>
                <Input name="title" placeholder="e.g. Migration to Rust Microservices" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Initial Status</label>
                  <Select name="status" defaultValue="Idea">
                    <option value="Idea">Idea</option>
                    <option value="Research">Research</option>
                    <option value="Draft">Draft</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Priority</label>
                  <Select name="priority" defaultValue="Medium">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </Select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Abort</Button>
                <Button type="submit" disabled={createStory.isPending}>
                  {createStory.isPending ? 'Initializing...' : 'Initialize'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-4 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Query stories..." 
                className="pl-9 font-mono text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select 
                className="w-full sm:w-[140px] font-mono text-xs"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">ALL STATUSES</option>
                <option value="Idea">IDEA</option>
                <option value="Research">RESEARCH</option>
                <option value="Draft">DRAFT</option>
                <option value="Review">REVIEW</option>
                <option value="Approved">APPROVED</option>
                <option value="Published">PUBLISHED</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border font-mono tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Priority</th>
                  <th className="px-6 py-3 font-medium">Updated</th>
                  <th className="px-6 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground font-mono text-xs">Querying database...</td></tr>
                ) : stories?.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground font-mono text-xs">No records found.</td></tr>
                ) : (
                  stories?.map((story) => (
                    <tr key={story.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground group-hover:text-primary transition-colors">{story.title}</div>
                        {story.summary && <div className="text-xs text-muted-foreground mt-1 truncate max-w-md">{story.summary}</div>}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(story.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(story.priority)}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                        {formatShortDate(story.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/stories/${story.id}`}>
                          <Button variant="ghost" size="sm" className="font-mono text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                            Access
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
