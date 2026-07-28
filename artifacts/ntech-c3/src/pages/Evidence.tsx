import { useState } from 'react';
import { useListEvidence, useCreateEvidence } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/shared';
import { Archive, Plus, Search, Terminal } from 'lucide-react';
import { formatShortDate } from '@/lib/utils';
import type { EvidenceInput } from '@workspace/api-client-react';

export function Evidence() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: evidence, isLoading, refetch } = useListEvidence({ search: search || undefined, type: typeFilter || undefined });
  const createEvidence = useCreateEvidence();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const type = formData.get('type') as EvidenceInput['type'];
    const source = formData.get('source') as string;

    if (!title) return;

    createEvidence.mutate({ data: { title, type, source } }, {
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-muted-foreground font-mono">Accessing vault...</div>
        ) : evidence?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed border-border rounded-lg bg-card/50">
            <Terminal className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">VAULT EMPTY. LOG EVIDENCE TO BEGIN.</p>
          </div>
        ) : (
          evidence?.map((item) => (
            <Card key={item.id} className="hover:border-primary/40 transition-colors bg-card/80">
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
    </div>
  );
}
