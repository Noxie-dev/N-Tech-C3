import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useListEvidence, useCreateEvidence, useLinkEvidenceToStory, useListWorkspaces, useListStories, getListEvidenceQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/shared';
import { Archive, FolderOpen, Plus, Search, Terminal, UploadCloud } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import type { Evidence as EvidenceRecord, EvidenceInput } from '@workspace/api-client-react';
import { evidenceTypeForMimeType } from '@/lib/capture-utils';

export function Evidence() {
  const initialWorkspaceId = typeof window === 'undefined'
    ? undefined
    : Number(new URLSearchParams(window.location.search).get('workspaceId')) || undefined;
  const [workspaceId, setWorkspaceId] = useState<number | undefined>(initialWorkspaceId);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRecord | null>(null);
  const [binaryPreview, setBinaryPreview] = useState<{ mimeType: string; dataUrl: string } | null>(null);
  const [previewMessage, setPreviewMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: evidence, isLoading, refetch } = useListEvidence({
    search: search || undefined,
    type: typeFilter || undefined,
    workspaceId,
  });
  const createEvidence = useCreateEvidence();
  const linkEvidence = useLinkEvidenceToStory();
  const { data: workspaces = [] } = useListWorkspaces();
  const { data: stories = [] } = useListStories();

  useEffect(() => {
    if (workspaceId == null && workspaces[0]) setWorkspaceId(workspaces[0].id);
  }, [workspaceId, workspaces]);

  const saveLinks = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEvidence) return;
    const data = new FormData(event.currentTarget);
    const storyId = Number(data.get('storyId'));
    if (!storyId) return;
    await linkEvidence.mutateAsync({
      id: selectedEvidence.id,
      data: {
        storyId,
        role: 'Supporting',
        relevance: 100,
      },
    });
    await refetch();
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const type = formData.get('type') as EvidenceInput['type'];
    const source = formData.get('source') as string;

    if (!title || workspaceId == null) return;

    createEvidence.mutate({ data: { title, type, source, workspaceId } }, {
      onSuccess: () => {
        setIsCreateOpen(false);
        refetch();
      }
    });
  };

  const evidenceTypes = [
    'Screenshot', 'TerminalOutput', 'GitLog', 'Benchmark', 'Diagram', 
    'MeetingNotes', 'ResearchPDF', 'CodeSnippet', 'IssueReport', 'BuildLog'
  ];

  const handleFiles = async (files: FileList) => {
    if (workspaceId == null) {
      setImportMessage('Select a Workspace before importing Evidence.');
      return;
    }
    setImportMessage(`Importing ${files.length} file${files.length === 1 ? '' : 's'}…`);
    let imported = 0;
    for (const file of Array.from(files)) {
      try {
        const type = evidenceTypeForMimeType(file.type);
        if (window.ntc3Vault) {
          await window.ntc3Vault.importFile({
            file,
            workspaceId,
            title: file.name,
            type,
            classification: 'FactualRecord',
            idempotencyKey: crypto.randomUUID(),
          });
        } else {
          await createEvidence.mutateAsync({
            data: {
              title: file.name,
              type,
              source: file.name,
              classification: 'ExternalReference',
              workspaceId,
            },
          });
        }
        imported += 1;
      } catch {
        setImportMessage(`Imported ${imported}; failed on ${file.name}.`);
        return;
      }
    }
    queryClient.invalidateQueries({ queryKey: getListEvidenceQueryKey() });
    setImportMessage(`${imported} file${imported === 1 ? '' : 's'} captured.`);
  };

  const openEvidence = async (item: EvidenceRecord) => {
    setSelectedEvidence(item);
    setBinaryPreview(null);
    setPreviewMessage('');
    if (!item.source || !window.ntc3Vault) return;
    try {
      const preview = await window.ntc3Vault.previewFile(item.source);
      setBinaryPreview(preview);
      if (!preview) setPreviewMessage('This file type has no inline preview.');
    } catch {
      setPreviewMessage('Preview unavailable. Large or missing files can still be revealed in the vault.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
            <Archive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">Evidence Vault</h1>
            <p className="text-sm text-muted-foreground">Raw engineering artifacts and proofs.</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4" /> Log Evidence
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider text-primary">Log New Evidence</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Title</label>
                <Input name="title" placeholder="e.g. Memory Leak Heap Dump" required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Type</label>
                  <Select name="type" defaultValue="TerminalOutput">
                    {evidenceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase">Source (URL/Path)</label>
                  <Input name="source" placeholder="Optional..." />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Abort</Button>
                <Button type="submit" disabled={createEvidence.isPending}>
                  {createEvidence.isPending ? 'Logging...' : 'Log Evidence'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search vault..." 
            className="pl-9 font-mono text-sm bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select 
          className="w-full sm:w-[200px] font-mono text-sm bg-card"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">ALL TYPES</option>
          {evidenceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select
          aria-label="Evidence Workspace"
          className="w-full sm:w-[220px] font-mono text-sm bg-card"
          value={workspaceId ?? ''}
          onChange={(event) => setWorkspaceId(Number(event.target.value) || undefined)}
        >
          <option value="" disabled>SELECT WORKSPACE</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
          ))}
        </Select>
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-4 font-mono text-xs hover:bg-accent">
          <UploadCloud className="h-4 w-4" /> IMPORT FILES
          <input
            aria-label="Import evidence files"
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => { if (event.target.files?.length) void handleFiles(event.target.files); }}
          />
        </label>
      </div>

      <div
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (event.dataTransfer.files.length) void handleFiles(event.dataTransfer.files);
        }}
        className={`relative grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3 ${isDragging ? 'outline outline-2 outline-primary' : ''}`}
      >
        {isDragging && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/90 backdrop-blur">
            <div className="text-center font-mono text-primary">
              <UploadCloud className="mx-auto mb-3 h-10 w-10" />
              DROP TO CAPTURE
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-muted-foreground font-mono">Accessing vault...</div>
        ) : evidence?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed border-border rounded-lg bg-card/50">
            <Terminal className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">VAULT EMPTY. LOG EVIDENCE TO BEGIN.</p>
          </div>
        ) : (
          evidence?.map((item) => (
            <Card key={item.id} className="cursor-pointer hover:border-primary/40 transition-colors bg-card/80" onClick={() => void openEvidence(item)}>
              <CardHeader className="p-4 pb-2 border-b border-border/30">
                <div className="flex justify-between items-start">
                  <Badge variant="outline" className="font-mono text-[10px] bg-background">{item.type}</Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{formatShortDate(item.createdAt)}</span>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <h3 className="font-bold text-sm mb-2">{item.title}</h3>
                {item.source && (
                  <div className="text-xs text-muted-foreground font-mono truncate bg-background p-1.5 rounded">
                    src: {item.source}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {importMessage && (
        <p role="status" className="font-mono text-xs text-muted-foreground">{importMessage}</p>
      )}
      <Dialog open={Boolean(selectedEvidence)} onOpenChange={(open) => { if (!open) setSelectedEvidence(null); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvidence?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedEvidence.type}</Badge>
                <Badge variant="secondary">{formatShortDate(selectedEvidence.createdAt)}</Badge>
              </div>
              {selectedEvidence.source && <p className="break-all rounded bg-background p-3 font-mono text-xs">src: {selectedEvidence.source}</p>}
              <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded border bg-background p-4 font-mono text-sm">
                {selectedEvidence.content || selectedEvidence.notes || 'No inline preview is available for this artifact.'}
              </div>
              {binaryPreview?.mimeType.startsWith('image/') && (
                <img src={binaryPreview.dataUrl} alt={selectedEvidence.title} className="max-h-[420px] w-full rounded border object-contain" />
              )}
              {binaryPreview?.mimeType === 'application/pdf' && (
                <iframe title={selectedEvidence.title} src={binaryPreview.dataUrl} className="h-[420px] w-full rounded border" />
              )}
              {binaryPreview?.mimeType.startsWith('video/') && <video src={binaryPreview.dataUrl} controls className="max-h-[420px] w-full rounded border" />}
              {binaryPreview?.mimeType.startsWith('audio/') && <audio src={binaryPreview.dataUrl} controls className="w-full" />}
              {previewMessage && <p className="text-xs text-muted-foreground">{previewMessage}</p>}
              {selectedEvidence.source && window.ntc3Vault && (
                <Button variant="outline" className="gap-2" onClick={() => void window.ntc3Vault?.revealFile(selectedEvidence.source!)}>
                  <FolderOpen className="h-4 w-4" /> Reveal in vault
                </Button>
              )}
              <form onSubmit={saveLinks} className="space-y-4 border-t pt-4">
                <h3 className="font-mono text-sm font-semibold uppercase">Graph links</h3>
                <div className="grid gap-4">
                  <label className="space-y-2 text-xs font-mono uppercase text-muted-foreground">
                    Story
                    <Select name="storyId" defaultValue={selectedEvidence.storyId ?? ''}>
                      <option value="">Select a Story</option>
                      {stories.filter((story) => story.workspaceId === selectedEvidence.workspaceId)
                        .map((story) => <option key={story.id} value={story.id}>{story.title}</option>)}
                    </Select>
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={linkEvidence.isPending}>
                    {linkEvidence.isPending ? 'Saving…' : 'Add Story link'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
