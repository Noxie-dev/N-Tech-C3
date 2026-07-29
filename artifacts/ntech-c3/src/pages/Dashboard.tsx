import {
  useGetDashboardStats, useGetRecentActivity, useListStories, useListWorkspaces,
} from '@workspace/api-client-react';
import {
  ArrowUpRight, BookOpen, Box, CalendarDays, CheckCircle2, Circle, CloudUpload,
  Crosshair, FilePlus2, Flag, FolderOpen, Layers3, Lightbulb, Megaphone,
  Orbit, Search, ShieldCheck, Sparkles, Target, UploadCloud,
} from 'lucide-react';
import { Link } from 'wouter';
import { formatDate } from '@/lib/utils';

const PRINCIPLES = [
  { text: 'Evidence before assumptions.', icon: Sparkles, color: '#2f80ff' },
  { text: 'Knowledge before action.', icon: Orbit, color: '#885cf6' },
  { text: 'Quality before speed.', icon: ShieldCheck, color: '#2f80ff' },
  { text: 'Built for engineers. By engineers.', icon: Target, color: '#a974ff' },
  { text: '100% Local. 100% Yours.', icon: CheckCircle2, color: '#16c784' },
];

const START_CARDS = [
  { title: 'Create Content', description: 'Start a new story, note or piece of engineering content.', action: 'Create New', href: '/stories', icon: FilePlus2, color: '#2f80ff' },
  { title: 'New Workspace', description: 'Create a new operating context for an initiative.', action: 'New Workspace', href: '/workspaces', icon: Layers3, color: '#16c784' },
  { title: 'See Scheduled Content', description: 'View your content calendar and publishing schedule.', action: 'Open Calendar', href: '/campaigns', icon: CalendarDays, color: '#885cf6' },
  { title: 'Start Campaign', description: 'Define a new campaign and align stories and assets.', action: 'Start Campaign', href: '/campaigns', icon: Crosshair, color: '#f5a524' },
  { title: 'Upload Knowledge', description: 'Import files, documents or research into your vault.', action: 'Upload Now', href: '/evidence', icon: CloudUpload, color: '#27c2ff' },
  { title: 'View Running Campaigns', description: 'Monitor active campaigns and their progress.', action: 'View Campaigns', href: '/campaigns', icon: Flag, color: '#2f80ff' },
];

function PanelTitle({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-mono text-[10px] font-semibold tracking-[0.08em] text-[#d5dbe3]">{children}</h2>
      {href && <Link href={href} className="text-[10px] text-[#5fa4ff] hover:text-[#8bc0ff]">View All</Link>}
    </div>
  );
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity = [], isLoading: activityLoading } = useGetRecentActivity();
  const { data: workspaces = [], isLoading: workspacesLoading } = useListWorkspaces();
  const { data: stories = [] } = useListStories();
  const focusStories = stories.filter((story) => !['Published', 'Archived'].includes(story.status)).slice(0, 3);
  const progress = stories.length
    ? Math.round(stories.filter((story) => ['Approved', 'Published'].includes(story.status)).length / stories.length * 100)
    : 0;
  const metrics = [
    ['Stories', stats?.totalStories ?? 0, '/stories'],
    ['Evidence Items', stats?.totalEvidence ?? 0, '/evidence'],
    ['Knowledge Pages', stats?.totalKnowledge ?? 0, '/knowledge'],
    ['Campaigns', stats?.activeCampaigns ?? 0, '/campaigns'],
    ['Assets', stats?.totalAssets ?? 0, '/assets'],
    ['Exports', '—', '/settings'],
  ] as const;

  return (
    <div className="space-y-3">
      <section className="blueprint-grid relative overflow-hidden rounded-2xl border border-[#2f80ff]/20 bg-[#080d15] px-7 py-6 lg:px-12">
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#0869ff]/20 blur-3xl" />
        <div className="relative grid items-center gap-8 xl:grid-cols-[1.45fr_0.9fr]">
          <div className="flex items-center gap-7">
            <img
              src="/NTC3-app-icon.png"
              alt="N-Tech C³ application icon"
              className="hidden h-36 w-36 rounded-[28px] object-cover drop-shadow-[0_0_34px_rgba(47,128,255,0.38)] sm:block lg:h-40 lg:w-40"
            />
            <div>
              <h1 className="text-4xl font-bold tracking-[0.08em] text-white lg:text-5xl">N-TECH <span className="text-[#2f80ff]">C³</span></h1>
              <p className="mt-3 max-w-md text-sm font-medium tracking-[0.22em] text-[#d5dbe3]">ENGINEERING INTELLIGENCE<br />OPERATING SYSTEM</p>
              <p className="mt-5 text-xs text-[#aeb6c2]">Capture reality. Organize knowledge. Produce evidence. Create influence.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {PRINCIPLES.map(({ text, icon: Icon, color }) => (
              <div key={text} className="flex items-center gap-3 rounded-lg border border-[#303b4b] bg-[#111722]/90 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border bg-[#0a0f17]" style={{ borderColor: `${color}70`, color }}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-[11px] text-[#c7ced8]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#30343d] bg-[#0b1017]/80 p-4">
        <PanelTitle>GET STARTED</PanelTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {START_CARDS.map(({ title, description, action, href, icon: Icon, color }) => (
            <article key={title} className="flex min-h-[180px] flex-col items-center rounded-[10px] border border-[#272f3b] bg-[linear-gradient(145deg,#151c26,#101620)] p-4 text-center shadow-[0_8px_32px_rgba(0,0,0,0.16)]">
              <Icon className="mb-3 h-9 w-9" style={{ color }} strokeWidth={1.8} />
              <h3 className="text-[13px] font-semibold text-white">{title}</h3>
              <p className="mt-2 flex-1 text-[10px] leading-5 text-[#aeb6c2]">{description}</p>
              <Link href={href} className="mt-3 w-full rounded-md border px-3 py-1.5 text-[10px] font-medium transition-colors hover:bg-white/5" style={{ borderColor: `${color}80`, color }}>
                {action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.08fr_1.28fr]">
        <section className="rounded-2xl border border-[#30343d] bg-[#0b1017]/80 p-4">
          <PanelTitle href="/workspaces">LAST OPENED WORKSPACES</PanelTitle>
          <div className="space-y-1">
            {workspacesLoading ? <p className="py-8 text-center text-xs text-[#7c8593]">Loading workspaces…</p> : workspaces.length ? workspaces.slice(0, 4).map((workspace, index) => (
              <Link key={workspace.id} href={`/workspaces/${workspace.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#161c24]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2f80ff]/30 bg-[#2f80ff]/10 text-[#5fa4ff]"><Box className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#f5f7fa]">{workspace.name}</p>
                  <p className="truncate text-[9px] text-[#5f9be7]">/Workspaces/{workspace.name.replace(/\s+/g, '')}</p>
                </div>
                <span className="text-right text-[9px] text-[#8b95a3]">{index === 0 ? 'Most recent' : formatDate(workspace.updatedAt)}</span>
              </Link>
            )) : (
              <div className="py-7 text-center"><p className="text-xs text-[#8b95a3]">No workspaces yet.</p><Link href="/workspaces" className="mt-2 inline-block text-[10px] text-[#5fa4ff]">Create a workspace</Link></div>
            )}
          </div>
          <Link href="/workspaces" className="mt-3 flex items-center justify-center gap-2 rounded-md border border-[#303b4b] py-2 text-[10px] text-[#c1c9d4] hover:bg-[#161c24]"><FolderOpen className="h-3.5 w-3.5" /> Open Other Workspace</Link>
        </section>

        <section className="rounded-2xl border border-[#30343d] bg-[#0b1017]/80 p-4">
          <PanelTitle href="/evidence">RECENT ACTIVITY</PanelTitle>
          <div className="space-y-1">
            {activityLoading ? <p className="py-8 text-center text-xs text-[#7c8593]">Loading activity…</p> : activity.length ? activity.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[#161c24]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2f80ff]/25 bg-[#2f80ff]/10 text-[#5fa4ff]"><ArrowUpRight className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#edf1f5]">{item.action} {item.entityType}</p>
                  <p className="truncate text-[9px] text-[#6da6ee]">{item.entityTitle}</p>
                </div>
                <span className="text-[9px] text-[#8b95a3]">{formatDate(item.createdAt)}</span>
              </div>
            )) : <p className="py-8 text-center text-xs text-[#7c8593]">Activity appears after your first capture.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#30343d] bg-[#0b1017]/80 p-4">
          <PanelTitle>AT A GLANCE</PanelTitle>
          <div className="grid grid-cols-3 gap-2">
            {metrics.map(([label, value, href]) => (
              <Link key={label} href={href} className="rounded-lg border border-[#232b36] bg-[#121923] p-3 hover:border-[#2f80ff]/40">
                <p className="text-[9px] text-[#9ba5b3]">{label}</p>
                <p className="mt-1 text-xl font-semibold text-[#f5f7fa]">{statsLoading ? '…' : value}</p>
              </Link>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-4 rounded-lg border border-[#232b36] bg-[#0e141d] p-3">
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-[10px] font-medium text-[#d7dde5]">Today's Focus</p>
              <div className="space-y-1.5">
                {focusStories.length ? focusStories.map((story) => (
                  <Link href={`/stories/${story.id}`} key={story.id} className="flex items-center gap-2 text-[9px] text-[#aeb6c2] hover:text-white"><Circle className="h-3 w-3" /> <span className="truncate">{story.title}</span></Link>
                )) : <p className="text-[9px] text-[#7c8593]">Create a story to establish today's focus.</p>}
              </div>
            </div>
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#2f80ff ${progress * 3.6}deg, #202a37 0)` }}>
              <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-[#0e141d]">
                <span className="text-lg font-semibold">{progress}%</span>
                <span className="text-[7px] text-[#8b95a3]">Daily Progress</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="grid items-center gap-4 rounded-2xl border border-[#30343d] bg-[#0b1017]/80 px-5 py-4 md:grid-cols-[1fr_1.2fr_1fr]">
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-4 w-4 text-[#2f80ff]" />
          <div><p className="text-[10px] font-semibold text-white">Pro Tip</p><p className="mt-1 text-[9px] leading-4 text-[#9da7b4]">Use Quick Capture from the sidebar to instantly capture evidence while you're in the flow.</p></div>
        </div>
        <blockquote className="text-center text-xs leading-5 text-[#58a0fb]">“The best systems don’t just store knowledge.<br />They make it work for you.”</blockquote>
        <div>
          <p className="mb-2 text-[10px] font-semibold text-white">Keyboard Shortcuts</p>
          <div className="grid grid-cols-4 gap-2 text-center text-[8px] text-[#8f99a7]">
            {[[Search, '⌘ K', 'Search'], [FilePlus2, '⌘ N', 'New Story'], [UploadCloud, '⌘ /', 'Quick Capture'], [Megaphone, '⌘ P', 'Command Menu']].map(([Icon, keys, label]) => {
              const ShortcutIcon = Icon as typeof Search;
              return <div key={String(label)}><span className="mx-auto mb-1 flex h-6 items-center justify-center gap-1 rounded border border-[#303b4b] text-[#d3d9e1]"><ShortcutIcon className="h-3 w-3" />{String(keys)}</span>{String(label)}</div>;
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
