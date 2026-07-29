import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateEvidence, getListEvidenceQueryKey, useListWorkspaces } from '@workspace/api-client-react';
import { Archive, Command, Paperclip } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Textarea,
} from '@/components/shared';
import { isEditableTarget } from '@/lib/capture-utils';

const evidenceTypes = [
  'TerminalOutput',
  'Screenshot',
  'GitLog',
  'Benchmark',
  'Diagram',
  'MeetingNotes',
  'ResearchPDF',
  'Image',
  'Video',
  'VoiceRecording',
  'CodeSnippet',
  'IssueReport',
  'BuildLog',
  'RepositoryAudit',
  'Other',
] as const;

export function QuickCapture({ hideTrigger = false }: { hideTrigger?: boolean }) {
  const queryClient = useQueryClient();
  const createEvidence = useCreateEvidence();
  const { data: workspaces = [] } = useListWorkspaces();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<(typeof evidenceTypes)[number]>('TerminalOutput');
  const [content, setContent] = useState('');
  const [workspaceId, setWorkspaceId] = useState<number | undefined>();

  useEffect(() => {
    if (workspaceId == null && workspaces[0]) setWorkspaceId(workspaces[0].id);
  }, [workspaceId, workspaces]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setOpen(true);
      }
    };
    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const text = event.clipboardData?.getData('text/plain').trim();
      if (!text) return;
      event.preventDefault();
      setType('TerminalOutput');
      setTitle(`Terminal capture ${new Date().toLocaleString()}`);
      setContent(text);
      setOpen(true);
    };
    const handleQuickCapture = (event: Event) => {
      const requestedType = (event as CustomEvent<{ type?: (typeof evidenceTypes)[number] }>).detail?.type;
      if (requestedType && evidenceTypes.includes(requestedType)) setType(requestedType);
      setOpen(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('ntc3:quick-capture', handleQuickCapture);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('ntc3:quick-capture', handleQuickCapture);
    };
  }, []);

  const reset = () => {
    setTitle('');
    setType('TerminalOutput');
    setContent('');
  };

  const capture = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || workspaceId == null) return;
    createEvidence.mutate(
      { data: { title: title.trim(), type, content, workspaceId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEvidenceQueryKey() });
          setOpen(false);
          reset();
        },
      },
    );
  };

  return (
    <>
      {!hideTrigger && <button
        type="button"
        aria-label="Quick capture"
        title="Quick capture (Cmd/Ctrl+/)"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full border border-primary/40 bg-primary px-4 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_30px_rgba(0,229,255,0.25)] transition-transform hover:scale-105"
      >
        <Archive className="h-4 w-4" />
        Capture
        <span className="hidden rounded border border-primary-foreground/30 px-1.5 py-0.5 text-[9px] sm:inline">
          ⌘K
        </span>
      </button>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono uppercase tracking-wider text-primary">
              <Command className="h-4 w-4" /> Quick Capture
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={capture} className="space-y-4 pt-3">
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase text-muted-foreground">Title</label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What did you capture?"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase text-muted-foreground">Workspace</label>
              <Select
                value={workspaceId ?? ''}
                onChange={(event) => setWorkspaceId(Number(event.target.value) || undefined)}
                required
              >
                <option value="" disabled>Select a Workspace</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase text-muted-foreground">Evidence type</label>
              <Select value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                {evidenceTypes.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase text-muted-foreground">Captured content</label>
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Paste terminal output, notes, or a code fragment…"
                className="min-h-52 font-mono text-xs"
              />
            </div>
            {createEvidence.error && (
              <p role="alert" className="text-sm text-destructive">
                Capture failed. Your content remains in this form.
              </p>
            )}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Paperclip className="h-3 w-3" /> Drop files on the Evidence Vault
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createEvidence.isPending || workspaceId == null}>
                  {createEvidence.isPending ? 'Capturing…' : 'Capture evidence'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
