import { useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import {
  getGetEvidenceQueryKey,
  useArchiveEvidence,
  useCreateEvidenceSourceLocator,
  useDeleteEvidenceSourceLocator,
  useGetEvidence,
  useGetEvidenceIntegrity,
  useListEvidenceSourceLocators,
  useListEvidenceSources,
  useListEvidenceStoryLinks,
  useListRecoverableEvidenceIngests,
  useRestoreEvidence,
  useUnlinkEvidenceFromStory,
  useVerifyEvidenceIntegrity,
} from '@workspace/api-client-react';
import type { EvidenceLocatorKind, EvidenceSource } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Archive, FileSearch, FolderOpen, Link2Off, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Spinner, Textarea } from '@/components/shared';
import { formatShortDate } from '@/lib/utils';

const locatorExamples: Record<string, Record<string, unknown>> = {
  WholeArtifact: {},
  TextRange: { startLine: 1, endLine: 2 },
  Page: { page: 1 },
  Timestamp: { startMs: 0, endMs: 1000 },
  ImageRegion: { x: 0, y: 0, width: 1, height: 1 },
  RepositoryPath: { path: 'src/index.ts', revision: 'commit-sha' },
  JsonPointer: { pointer: '/path/to/value' },
};

function SourcePanel({ evidenceId, source, readOnly }: { evidenceId: number; source: EvidenceSource; readOnly: boolean }) {
  const [kind, setKind] = useState('WholeArtifact');
  const [coordinates, setCoordinates] = useState('{}');
  const [message, setMessage] = useState('');
  const { data: locators = [], refetch } = useListEvidenceSourceLocators(evidenceId, source.id);
  const createLocator = useCreateEvidenceSourceLocator();
  const deleteLocator = useDeleteEvidenceSourceLocator();

  const changeKind = (next: string) => {
    setKind(next);
    setCoordinates(JSON.stringify(locatorExamples[next], null, 2));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    try {
      const data = new FormData(event.currentTarget);
      await createLocator.mutateAsync({
        id: evidenceId,
        sourceId: source.id,
        data: {
          kind: kind as EvidenceLocatorKind,
          coordinates: JSON.parse(coordinates) as Record<string, unknown>,
          label: String(data.get('label') || '') || null,
        },
      });
      await refetch();
      setMessage('Locator added.');
    } catch {
      setMessage('Locator could not be added. Check its required coordinates.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>Source version {source.version}</span>
          <Badge variant="outline">{source.sourceKind}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-2 md:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Original name</dt><dd>{source.originalName || '—'}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Media type</dt><dd>{source.mediaType || '—'}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Bytes</dt><dd>{source.byteSize?.toLocaleString() || '—'}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Capture method</dt><dd>{source.captureMethod}</dd></div>
        </dl>
        {source.sha256 && <p className="break-all rounded bg-background p-2 font-mono text-xs">SHA-256: {source.sha256}</p>}
        {(source.vaultPath || source.originUri) && <p className="break-all text-xs">{source.vaultPath || source.originUri}</p>}
        <div>
          <h3 className="mb-2 font-mono text-xs uppercase text-muted-foreground">Precise locators</h3>
          {locators.length === 0 ? <p className="text-xs text-muted-foreground">No locators recorded.</p> : (
            <ul className="space-y-2">
              {locators.map((locator) => (
                <li key={locator.id} className="flex items-start justify-between gap-3 rounded border p-2">
                  <span><strong>{locator.label || locator.kind}</strong><code className="ml-2 text-xs">{JSON.stringify(locator.coordinates)}</code></span>
                  {!readOnly && <Button size="icon" variant="ghost" aria-label={`Delete ${locator.label || locator.kind}`} onClick={async () => {
                    await deleteLocator.mutateAsync({ id: evidenceId, sourceId: source.id, locatorId: locator.id });
                    await refetch();
                  }}><Trash2 className="h-4 w-4" /></Button>}
                </li>
              ))}
            </ul>
          )}
        </div>
        {!readOnly && (
          <form onSubmit={submit} className="space-y-3 border-t pt-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs">Kind<Select value={kind} onChange={(event) => changeKind(event.target.value)}>
                {Object.keys(locatorExamples).map((item) => <option key={item}>{item}</option>)}
              </Select></label>
              <label className="text-xs">Label<Input name="label" placeholder="Optional citation label" /></label>
            </div>
            <label className="text-xs">Coordinates JSON<Textarea value={coordinates} onChange={(event) => setCoordinates(event.target.value)} className="mt-1 min-h-24" /></label>
            <Button type="submit" size="sm" disabled={createLocator.isPending}>Add locator</Button>
            {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function EvidenceDetail() {
  const { id } = useParams<{ id: string }>();
  const evidenceId = Number(id);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: evidence, isLoading } = useGetEvidence(evidenceId);
  const { data: sources = [] } = useListEvidenceSources(evidenceId);
  const { data: links = [], refetch: refetchLinks } = useListEvidenceStoryLinks(evidenceId);
  const { data: ingests = [] } = useListRecoverableEvidenceIngests();
  const { data: integrity, refetch: refetchIntegrity } = useGetEvidenceIntegrity(evidenceId);
  const archive = useArchiveEvidence();
  const restore = useRestoreEvidence();
  const unlink = useUnlinkEvidenceFromStory();
  const verify = useVerifyEvidenceIntegrity();

  if (isLoading) return <div className="flex min-h-72 items-center justify-center"><Spinner /></div>;
  if (!evidence) return <div role="alert">Evidence not found.</div>;
  const archived = evidence.lifecycleStatus === 'Archived';
  const relatedIngests = ingests.filter((ingest) => ingest.evidenceId === evidence.id);
  const previewSource = sources.find((source) => source.sourceKind === 'ManagedFile' && source.mediaType);
  const previewUrl = previewSource
    ? `/api/evidence/${evidence.id}/sources/${previewSource.id}/content`
    : undefined;

  const refresh = async () => queryClient.invalidateQueries({ queryKey: getGetEvidenceQueryKey(evidence.id) });
  const toggleArchive = async () => {
    if (archived) await restore.mutateAsync({ id: evidence.id, data: { expectedVersion: evidence.version } });
    else await archive.mutateAsync({ id: evidence.id, data: { expectedVersion: evidence.version } });
    await refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/evidence" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Evidence Vault</Link>
          <h1 className="text-2xl font-bold">{evidence.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{evidence.type}</Badge>
            <Badge variant={archived ? 'warning' : 'success'}>{evidence.lifecycleStatus}</Badge>
            <Badge variant="secondary">{evidence.classification}</Badge>
            <Badge variant="secondary">{evidence.reviewStatus}</Badge>
            <Badge variant="outline">v{evidence.version}</Badge>
          </div>
        </div>
        <Button variant={archived ? 'outline' : 'destructive'} onClick={toggleArchive} disabled={archive.isPending || restore.isPending}>
          {archived ? <RotateCcw className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
          {archived ? 'Restore Evidence' : 'Archive Evidence'}
        </Button>
      </div>

      {archived && <p role="status" className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">Archived Evidence is read-only. Restore it to change relationships or locators.</p>}
      {relatedIngests.map((ingest) => <p key={ingest.id} role="status" className="rounded border p-3 text-sm">Recovery state: <strong>{ingest.state}</strong>{ingest.errorCategory ? ` — ${ingest.errorCategory}` : ''}</p>)}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Artifact</CardTitle></CardHeader><CardContent className="space-y-3">
            <p className="whitespace-pre-wrap">{evidence.content || evidence.notes || 'No inline content.'}</p>
            {previewUrl && previewSource?.mediaType?.startsWith('image/') && <img src={previewUrl} alt={evidence.title} className="max-h-[520px] w-full rounded border object-contain" />}
            {previewUrl && previewSource?.mediaType === 'application/pdf' && <iframe title={evidence.title} src={previewUrl} className="h-[520px] w-full rounded border" />}
            {previewUrl && previewSource?.mediaType?.startsWith('video/') && <video src={previewUrl} controls preload="metadata" className="max-h-[520px] w-full rounded border" />}
            {previewUrl && previewSource?.mediaType?.startsWith('audio/') && <audio src={previewUrl} controls preload="metadata" className="w-full" />}
            {evidence.source && <p className="break-all rounded bg-background p-2 font-mono text-xs">{evidence.source}</p>}
            {evidence.source && window.ntc3Vault && <Button variant="outline" onClick={() => void window.ntc3Vault?.revealFile(evidence.source!)}><FolderOpen className="mr-2 h-4 w-4" />Reveal managed file</Button>}
          </CardContent></Card>
          <section aria-labelledby="sources-heading" className="space-y-4">
            <h2 id="sources-heading" className="flex items-center gap-2 text-lg font-semibold"><FileSearch className="h-5 w-5" />Sources and provenance</h2>
            {sources.length ? sources.map((source) => <SourcePanel key={source.id} evidenceId={evidence.id} source={source} readOnly={archived} />) : <p className="text-sm text-muted-foreground">No structured source version is available.</p>}
          </section>
        </div>
        <aside className="space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Evidence Integrity</CardTitle></CardHeader><CardContent className="space-y-3">
            {integrity ? <>
              <Badge variant={integrity.state === 'Valid' ? 'success' : integrity.state === 'Modified' || integrity.state === 'Missing' ? 'destructive' : 'warning'}>{integrity.state}</Badge>
              <p className="text-sm">{integrity.explanation}</p>
              <ul className="space-y-2 text-xs">{integrity.components.map((component) => <li key={component.key} className="rounded border p-2"><strong>{component.status}</strong> — {component.explanation}</li>)}</ul>
              {integrity.repairGuidance.length > 0 && <div><h3 className="text-xs font-semibold uppercase">Repair guidance</h3><ul className="list-disc pl-5 text-xs">{integrity.repairGuidance.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              <p className="text-[10px] text-muted-foreground">{integrity.capabilityId}@{integrity.capabilityVersion} · {formatShortDate(integrity.calculatedAt)}</p>
            </> : <p className="text-sm text-muted-foreground">No current verification result. Results become stale when authoritative Evidence changes.</p>}
            <Button variant="outline" disabled={verify.isPending} onClick={async () => {
              await verify.mutateAsync({ id: evidence.id });
              await refetchIntegrity();
            }}>{verify.isPending ? 'Verifying…' : 'Verify Evidence'}</Button>
            {verify.error && <p role="alert" className="text-xs text-destructive">Verification failed. Inspect the source and try again.</p>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Story relationships</CardTitle></CardHeader><CardContent>
            {links.length === 0 ? <p className="text-sm text-muted-foreground">No linked Stories.</p> : <ul className="space-y-2">{links.map((link) => (
              <li key={link.storyId} className="flex items-center justify-between rounded border p-2 text-sm">
                <span><Link href={`/stories/${link.storyId}`} className="hover:text-primary">{link.storyTitle}</Link><small className="block text-muted-foreground">{link.role} · {link.relevance}%</small></span>
                {!archived && <Button size="icon" variant="ghost" aria-label={`Unlink ${link.storyTitle}`} onClick={async () => {
                  await unlink.mutateAsync({ id: evidence.id, storyId: link.storyId });
                  await refetchLinks();
                }}><Link2Off className="h-4 w-4" /></Button>}
              </li>
            ))}</ul>}
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Record</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
            <p>Workspace #{evidence.workspaceId}</p>
            <p>Created {formatShortDate(evidence.createdAt)}</p>
            <p>Updated {formatShortDate(evidence.updatedAt)}</p>
          </CardContent></Card>
          <Button variant="ghost" onClick={() => navigate('/evidence')}>Back to catalogue</Button>
        </aside>
      </div>
    </div>
  );
}
