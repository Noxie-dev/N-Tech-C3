import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getGetStoryQueryKey, useArchiveStory, useCreateStoryOutput, useGetStory,
  useGetStoryHealth, useGetStoryLinks, useGetStoryOutline, useGetStoryOutputs,
  useGetStoryTimeline, useLinkStoryEntity, useListAssets, useListCampaigns,
  useListEvidence, useListKnowledge, useListStories, useListStoryCampaignBacklinks, useReplaceStoryOutline,
  useTransitionStory, useUpdateStory,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity, Archive, ArrowDown, ArrowLeft, ArrowUp, BookOpen, Boxes,
  FileArchive, FileOutput, GitBranch, Image, LayoutList, Library, Link2,
  Plus, Save, ShieldCheck,
} from 'lucide-react';
import { Link, useParams } from 'wouter';
import type {
  StoryLinkedEntity, StoryLinkInputEntityType, StoryOutlineItemInput, StoryStatus,
} from '@workspace/api-client-react';
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Select,
  Skeleton, Textarea,
} from '@/components/shared';
import { RichTextEditor } from '@/components/RichTextEditor';
import { formatShortDate } from '@/lib/utils';

type Section = 'overview' | 'outline' | 'editor' | 'evidence' | 'assets' | 'references' | 'outputs' | 'timeline';
const SECTIONS: Array<{ key: Section; label: string; icon: typeof BookOpen }> = [
  { key: 'overview', label: 'Overview', icon: BookOpen },
  { key: 'outline', label: 'Outline', icon: LayoutList },
  { key: 'editor', label: 'Editor', icon: BookOpen },
  { key: 'evidence', label: 'Evidence', icon: FileArchive },
  { key: 'assets', label: 'Assets', icon: Image },
  { key: 'references', label: 'References', icon: Link2 },
  { key: 'outputs', label: 'Outputs', icon: FileOutput },
  { key: 'timeline', label: 'Timeline', icon: Activity },
];
const LIFECYCLE: StoryStatus[] = ['Idea', 'Research', 'EvidenceGathering', 'Outline', 'Draft', 'Review', 'Approved', 'Published', 'Archived'];

export function StoryDetail() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const queryClient = useQueryClient();
  const [section, setSection] = useState<Section>('overview');
  const { data: story, isLoading } = useGetStory(id);
  const { data: health } = useGetStoryHealth(id);
  const { data: outline = [] } = useGetStoryOutline(id);
  const { data: links } = useGetStoryLinks(id);
  const { data: outputs = [] } = useGetStoryOutputs(id);
  const { data: timeline = [] } = useGetStoryTimeline(id);
  const { data: campaignBacklinks = [] } = useListStoryCampaignBacklinks(id);
  const { data: evidence = [] } = useListEvidence({ workspaceId: story?.workspaceId ?? undefined });
  const { data: knowledge = [] } = useListKnowledge();
  const { data: assets = [] } = useListAssets();
  const { data: campaigns = [] } = useListCampaigns({});
  const { data: stories = [] } = useListStories({ workspaceId: story?.workspaceId ?? undefined });
  const updateStory = useUpdateStory();
  const transitionStory = useTransitionStory();
  const archiveStory = useArchiveStory();
  const replaceOutline = useReplaceStoryOutline();
  const linkEntity = useLinkStoryEntity();
  const createOutput = useCreateStoryOutput();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [objective, setObjective] = useState('');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [outlineDraft, setOutlineDraft] = useState<StoryOutlineItemInput[]>([]);
  const initializedStory = useRef<number | undefined>(undefined);

  const refreshStoryEngine = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [`/api/stories/${id}`] });
  }, [id, queryClient]);

  useEffect(() => {
    if (!story || initializedStory.current === story.id) return;
    initializedStory.current = story.id;
    setTitle(story.title);
    setSummary(story.summary || '');
    setObjective(story.objective || '');
    setContent(story.content || '');
  }, [story]);

  useEffect(() => {
    setOutlineDraft(outline.map((item) => ({
      title: item.title, notes: item.notes, completionStatus: item.completionStatus,
    })));
  }, [outline]);

  const save = useCallback(() => {
    if (!story || !isDirty) return;
    updateStory.mutate({
      id,
      data: { title, summary, objective, content, expectedVersion: story.version },
    }, {
      onSuccess: (updated) => {
        setIsDirty(false);
        queryClient.setQueryData(getGetStoryQueryKey(id), updated);
        refreshStoryEngine();
      },
    });
  }, [content, id, isDirty, objective, queryClient, refreshStoryEngine, story, summary, title, updateStory]);

  const candidates = useMemo(() => ({
    evidence: evidence.map((item) => ({ id: item.id, title: item.title })),
    knowledge: knowledge.map((item) => ({ id: item.id, title: item.title })),
    asset: assets.filter((item) => !story?.workspaceId || item.projectId === story.workspaceId).map((item) => ({ id: item.id, title: item.title })),
    campaign: campaigns.map((item) => ({ id: item.id, title: item.title })),
    story: stories.filter((item) => item.id !== id).map((item) => ({ id: item.id, title: item.title })),
  }), [assets, campaigns, evidence, id, knowledge, stories, story?.workspaceId]);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-[500px]" /></div>;
  if (!story) return <div role="alert">Story not found or corrupted.</div>;
  const archived = story.status === 'Archived';

  const linkPanel = (entityType: StoryLinkInputEntityType, items: StoryLinkedEntity[]) => {
    const available = candidates[entityType];
    return <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(event) => {
        event.preventDefault();
        const entityId = Number(new FormData(event.currentTarget).get('entityId'));
        if (!entityId) return;
        linkEntity.mutate({ id, data: { entityType, entityId } }, { onSuccess: refreshStoryEngine });
      }}>
        <Select name="entityId" aria-label={`Link ${entityType}`} defaultValue="">
          <option value="" disabled>Select {entityType}</option>
          {available.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </Select>
        <Button disabled={archived || linkEntity.isPending}><Plus className="mr-1 h-4 w-4" /> Link</Button>
      </form>
      {items.length ? items.map((item) => <div key={item.id} className="rounded-lg border p-3"><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.relationshipType || entityType}</p></div>) : <p className="text-sm text-muted-foreground">No linked {entityType} records.</p>}
    </div>;
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={story.workspaceId ? `/workspaces/${story.workspaceId}/stories` : '/stories'} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Stories</Link>
      <div className="flex items-center gap-2">
        <Badge variant={archived ? 'secondary' : 'default'}>{story.status}</Badge>
        <Button variant="outline" size="sm" onClick={() => archiveStory.mutate({ id, data: { archived: !archived } }, { onSuccess: refreshStoryEngine })}><Archive className="mr-2 h-4 w-4" />{archived ? 'Restore' : 'Archive'}</Button>
      </div>
    </div>

    {archived && <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">This Story is archived and read-only. Restore it to continue editing.</div>}

    <header className="rounded-xl border bg-card/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <Input value={title} disabled={archived} onChange={(event) => { setTitle(event.target.value); setIsDirty(true); }} className="h-auto border-transparent bg-transparent px-0 text-3xl font-bold shadow-none" />
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{story.storyType || 'Other'}</span><span>•</span><span>{story.wordCount || 0} words</span><span>•</span><span>{story.estimatedReadMinutes || 0} min read</span><span>•</span><span>Version {story.version || 1}</span>
          </div>
        </div>
        <div className="text-center"><p className="text-4xl font-bold text-primary">{health?.score ?? 0}%</p><p className="text-xs text-muted-foreground">Story Health</p></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
        <Select value={story.status} disabled={archived} onChange={(event) => transitionStory.mutate({ id, data: { status: event.target.value as StoryStatus } }, { onSuccess: refreshStoryEngine })} className="w-48">
          {LIFECYCLE.map((status) => <option key={status}>{status}</option>)}
        </Select>
        <Button onClick={save} disabled={archived || !isDirty || updateStory.isPending}><Save className="mr-2 h-4 w-4" />{updateStory.isPending ? 'Syncing…' : isDirty ? 'Sync Changes' : 'Synced'}</Button>
      </div>
    </header>

    <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)_260px]">
      <nav aria-label="Story sections" className="h-fit rounded-xl border bg-card/60 p-2">
        {SECTIONS.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setSection(key)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${section === key ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'}`}><Icon className="h-4 w-4" />{label}</button>)}
      </nav>

      <main className="min-w-0">
        {section === 'overview' && <div className="space-y-4">
          <Card><CardHeader><CardTitle>Story Overview</CardTitle></CardHeader><CardContent className="space-y-4"><label className="text-sm">Executive summary<Textarea value={summary} disabled={archived} onChange={(event) => { setSummary(event.target.value); setIsDirty(true); }} className="mt-1 min-h-28" /></label><label className="text-sm">Objective<Textarea value={objective} disabled={archived} onChange={(event) => { setObjective(event.target.value); setIsDirty(true); }} className="mt-1 min-h-24" /></label></CardContent></Card>
        </div>}
        {section === 'outline' && <Card><CardHeader><CardTitle>Ordered Outline</CardTitle></CardHeader><CardContent className="space-y-3">
          {outlineDraft.map((item, index) => <div key={index} className="flex gap-2"><Input value={item.title} disabled={archived} onChange={(event) => setOutlineDraft((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, title: event.target.value } : value))} /><Select value={item.completionStatus} disabled={archived} onChange={(event) => setOutlineDraft((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, completionStatus: event.target.value as StoryOutlineItemInput['completionStatus'] } : value))}><option>Planned</option><option>InProgress</option><option>Complete</option></Select><Button size="icon" variant="outline" disabled={index === 0 || archived} onClick={() => setOutlineDraft((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="outline" disabled={index === outlineDraft.length - 1 || archived} onClick={() => setOutlineDraft((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })}><ArrowDown className="h-4 w-4" /></Button></div>)}
          <div className="flex gap-2"><Button variant="outline" disabled={archived} onClick={() => setOutlineDraft((current) => [...current, { title: '', completionStatus: 'Planned' }])}><Plus className="mr-2 h-4 w-4" /> Add Section</Button><Button disabled={archived || replaceOutline.isPending} onClick={() => replaceOutline.mutate({ id, data: outlineDraft.filter((item) => item.title.trim()) }, { onSuccess: refreshStoryEngine })}>Save Outline</Button></div>
        </CardContent></Card>}
        {section === 'editor' && <Card className="min-h-[560px] overflow-hidden"><RichTextEditor value={content} onChange={(html) => { setContent(html); setIsDirty(true); }} placeholder="Develop the engineering narrative…" /></Card>}
        {section === 'evidence' && <Card><CardHeader><CardTitle>Evidence</CardTitle></CardHeader><CardContent>{linkPanel('evidence', links?.evidence || [])}</CardContent></Card>}
        {section === 'assets' && <Card><CardHeader><CardTitle>Assets</CardTitle></CardHeader><CardContent>{linkPanel('asset', links?.assets || [])}</CardContent></Card>}
        {section === 'references' && <div className="space-y-4"><Card><CardHeader><CardTitle>Knowledge References</CardTitle></CardHeader><CardContent>{linkPanel('knowledge', links?.knowledge || [])}</CardContent></Card><Card><CardHeader><CardTitle>Campaign backlinks</CardTitle></CardHeader><CardContent className="space-y-3">{campaignBacklinks.length ? campaignBacklinks.map((backlink) => <Link key={backlink.campaignId} href={`/campaigns/${backlink.campaignId}`} className="block rounded-lg border p-3 hover:border-primary/50"><div className="flex items-center justify-between gap-2"><p className="font-medium">{backlink.title}</p>{backlink.isPrimary && <Badge variant="outline">Primary</Badge>}</div><p className="text-xs text-muted-foreground">{backlink.role} · {backlink.lifecycleStatus}{backlink.contributionNote ? ` · ${backlink.contributionNote}` : ''}</p></Link>) : <p className="text-sm text-muted-foreground">No Campaign memberships. Add this Story from Campaign Mission Control.</p>}</CardContent></Card><Card><CardHeader><CardTitle>Related Stories</CardTitle></CardHeader><CardContent>{linkPanel('story', links?.stories || [])}</CardContent></Card></div>}
        {section === 'outputs' && <Card><CardHeader><CardTitle>Story Outputs</CardTitle></CardHeader><CardContent className="space-y-3"><form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); createOutput.mutate({ id, data: { title: String(form.get('title')), type: String(form.get('type')) } }, { onSuccess: refreshStoryEngine }); }}><Input name="title" placeholder="Output title" required /><Select name="type"><option>Blog</option><option>LinkedIn</option><option>PDF</option><option>Markdown</option><option>Presentation</option></Select><Button disabled={archived}><Plus className="mr-1 h-4 w-4" /> Output</Button></form>{outputs.map((output) => <div key={output.id} className="flex justify-between rounded-lg border p-3"><div><p className="font-medium">{output.title}</p><p className="text-xs text-muted-foreground">{output.type}</p></div><Badge>{output.status}</Badge></div>)}</CardContent></Card>}
        {section === 'timeline' && <Card><CardHeader><CardTitle>Story Timeline</CardTitle></CardHeader><CardContent className="space-y-2">{timeline.map((event) => <div key={event.id} className="flex justify-between gap-3 rounded-lg border p-3 text-sm"><div><p className="font-medium">{event.eventType.replaceAll('_', ' ')}</p><p className="text-xs text-muted-foreground">{event.actor}</p></div><span className="text-xs text-muted-foreground">{formatShortDate(event.createdAt)}</span></div>)}</CardContent></Card>}
      </main>

      <aside className="h-fit space-y-3 rounded-xl border bg-card/60 p-4">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Inspector</h2>
        {health?.components.map((component) => <div key={component.key}><div className="flex justify-between text-xs"><span>{component.label}</span><span>{component.applicable ? `${component.score}%` : 'N/A'}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${component.applicable ? component.score : 0}%` }} /></div></div>)}
        {health?.blockers.length ? <div className="border-t pt-3"><p className="text-xs font-semibold text-amber-400">Readiness blockers</p><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{health.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}</ul></div> : <p className="text-xs text-emerald-400">No readiness blockers.</p>}
        <div className="border-t pt-3 text-xs text-muted-foreground"><p className="flex items-center gap-2"><GitBranch className="h-3 w-3" /> Version {story.version || 1}</p><p className="mt-2 flex items-center gap-2"><Boxes className="h-3 w-3" /> Workspace {story.workspaceId || 'Unassigned'}</p></div>
      </aside>
    </div>
  </div>;
}
