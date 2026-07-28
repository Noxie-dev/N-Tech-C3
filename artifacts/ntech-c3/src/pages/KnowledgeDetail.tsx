import { useState, useEffect, useRef, useCallback } from 'react';
import { useGetKnowledge, useUpdateKnowledge, useDeleteKnowledge, getGetKnowledgeQueryKey } from '@workspace/api-client-react';
import { Card, Button, Input, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared';
import { Save, Trash2, ArrowLeft, Clock } from 'lucide-react';
import { Link, useParams, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { formatShortDate } from '@/lib/utils';

export function KnowledgeDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useGetKnowledge(id, { query: { enabled: !!id } });
  const updateKnowledge = useUpdateKnowledge();
  const deleteKnowledge = useDeleteKnowledge();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initRef = useRef(false);

  useEffect(() => {
    if (page && !initRef.current) {
      setTitle(page.title);
      setContent(page.content || '');
      initRef.current = true;
    }
  }, [page]);

  const handleSave = useCallback(() => {
    if (!isDirty) return;
    updateKnowledge.mutate({ 
      id, 
      data: { title, content } 
    }, {
      onSuccess: (data) => {
        setIsDirty(false);
        queryClient.setQueryData(getGetKnowledgeQueryKey(id), data);
      }
    });
  }, [id, title, content, isDirty, updateKnowledge, queryClient]);

  const handleDelete = () => {
    deleteKnowledge.mutate({ id }, {
      onSuccess: () => setLocation('/knowledge')
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground font-mono text-center">Loading page...</div>;
  if (!page) return <div className="p-8 text-muted-foreground font-mono text-center">Page not found.</div>;

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground shrink-0">
        <Link href="/knowledge" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Base
        </Link>
        <span>/</span>
        {page.category && (
          <>
            <span className="uppercase">{page.category}</span>
            <span>/</span>
          </>
        )}
        <span className="text-foreground truncate">{page.title}</span>
      </div>

      <div className="flex justify-between items-center shrink-0">
        <Input 
          value={title} 
          onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
          className="text-2xl font-bold font-sans h-auto py-2 px-0 bg-transparent border-transparent hover:border-input focus:border-input shadow-none rounded-none focus-visible:ring-0 w-full"
        />
        <div className="flex gap-2 shrink-0">
          <Button 
            onClick={handleSave} 
            disabled={!isDirty || updateKnowledge.isPending}
            variant={isDirty ? "default" : "secondary"}
            className="gap-2 font-mono text-xs uppercase"
          >
            <Save className="w-4 h-4" /> {updateKnowledge.isPending ? 'Syncing...' : isDirty ? 'Save' : 'Saved'}
          </Button>
          
          <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive font-mono uppercase">Delete Page</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-sm text-muted-foreground">Permanently delete this knowledge page?</div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteKnowledge.isPending}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="flex-1 flex flex-col border-border shadow-sm min-h-0">
        <Textarea 
          value={content}
          onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
          placeholder="Start typing..."
          className="flex-1 resize-none border-0 focus-visible:ring-0 bg-transparent p-6 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/30 h-full rounded-b-lg"
        />
        <div className="bg-muted/20 border-t border-border/50 p-2 px-4 flex justify-between items-center text-[10px] font-mono text-muted-foreground shrink-0 rounded-b-lg">
          <span>{content.length} bytes</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last modified: {formatShortDate(page.updatedAt)}</span>
        </div>
      </Card>
    </div>
  );
}
