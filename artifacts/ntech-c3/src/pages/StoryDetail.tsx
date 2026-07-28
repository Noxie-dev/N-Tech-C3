import { useState, useEffect, useRef, useCallback } from 'react';
import { useGetStory, useUpdateStory, useDeleteStory, getGetStoryQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Select, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared';
import { BookOpen, Save, Trash2, ArrowLeft, Clock, Tag } from 'lucide-react';
import { Link, useParams, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { formatShortDate } from '@/lib/utils';
import type { StoryPatch } from '@workspace/api-client-react';
import { RichTextEditor } from '@/components/RichTextEditor';

export function StoryDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: story, isLoading } = useGetStory(id);
  const updateStory = useUpdateStory();
  const deleteStory = useDeleteStory();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initRef = useRef(false);

  useEffect(() => {
    if (story && !initRef.current) {
      setTitle(story.title);
      setContent(story.content || '');
      setSummary(story.summary || '');
      initRef.current = true;
    }
  }, [story]);

  const handleSave = useCallback(() => {
    if (!isDirty) return;
    updateStory.mutate({ 
      id, 
      data: { title, content, summary } 
    }, {
      onSuccess: (data) => {
        setIsDirty(false);
        queryClient.setQueryData(getGetStoryQueryKey(id), data);
      }
    });
  }, [id, title, content, summary, isDirty, updateStory, queryClient]);

  // Debounced auto-save could go here, but manual save is fine for now
  // We'll use a manual save button for IDE feel

  const handleStatusChange = (status: StoryPatch['status']) => {
    if (!status) return;
    updateStory.mutate({ id, data: { status } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetStoryQueryKey(id), data);
      }
    });
  };

  const handleDelete = () => {
    deleteStory.mutate({ id }, {
      onSuccess: () => {
        setLocation('/stories');
      }
    });
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (!story) {
    return <div className="p-8 text-center text-muted-foreground font-mono">Story core missing or corrupted.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
        <Link href="/stories" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Stories
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{story.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center">
            <Input 
              value={title} 
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
              className="text-2xl font-bold font-mono h-auto py-2 px-0 bg-transparent border-transparent hover:border-input focus:border-input shadow-none rounded-none focus-visible:ring-0 w-full"
            />
            <Button 
              onClick={handleSave} 
              disabled={!isDirty || updateStory.isPending}
              variant={isDirty ? "default" : "secondary"}
              className="gap-2 font-mono text-xs uppercase ml-4 shrink-0"
            >
              <Save className="w-4 h-4" /> {updateStory.isPending ? 'Syncing...' : isDirty ? 'Sync Changes' : 'Synced'}
            </Button>
          </div>

          <Card className="border-border shadow-sm min-h-[500px] flex flex-col overflow-hidden">
            <RichTextEditor
              value={content}
              onChange={(html) => { setContent(html); setIsDirty(true); }}
              placeholder="Initialize narrative content here..."
            />
          </Card>

          <Card>
            <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Summary / Abstract</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Textarea 
                value={summary}
                onChange={(e) => { setSummary(e.target.value); setIsDirty(true); }}
                placeholder="Brief summary..."
                className="min-h-[80px] bg-transparent font-sans text-sm resize-none"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Tag className="w-3 h-3" /> Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Status</label>
                <Select 
                  value={story.status} 
                  onChange={(e) => handleStatusChange(e.target.value as StoryPatch['status'])}
                  className="font-mono text-xs bg-muted/50"
                >
                  <option value="Idea">Idea</option>
                  <option value="Research">Research</option>
                  <option value="Draft">Draft</option>
                  <option value="Review">Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Published">Published</option>
                  <option value="Archived">Archived</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Priority</label>
                <Select 
                  value={story.priority || ''} 
                  onChange={(e) => updateStory.mutate({ id, data: { priority: e.target.value as StoryPatch['priority'] } }, { onSuccess: (d) => queryClient.setQueryData(getGetStoryQueryKey(id), d) })}
                  className="font-mono text-xs bg-muted/50"
                >
                  <option value="">None</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </Select>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Clock className="w-3 h-3" /> Created: {formatShortDate(story.createdAt)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Clock className="w-3 h-3" /> Updated: {formatShortDate(story.updatedAt)}
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive font-mono text-xs uppercase tracking-wider">
                      <Trash2 className="w-3 h-3 mr-2" /> Terminate Story
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-destructive font-mono uppercase">Confirm Termination</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm text-muted-foreground">
                      Are you sure you want to permanently delete this story? This action cannot be undone.
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleDelete} disabled={deleteStory.isPending}>
                        {deleteStory.isPending ? 'Terminating...' : 'Confirm Termination'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
