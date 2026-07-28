import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  Bell, BookOpen, Box, CalendarDays, ChevronDown, CircleHelp, Code2,
  FileArchive, FileText, FolderKanban, Home, Image, Import, Library, Mic,
  Megaphone, PlusCircle, ScrollText, Settings, TerminalSquare,
} from 'lucide-react';
import { QuickCapture } from '@/components/QuickCapture';
import ntechMark from '@/assets/ntech-mark.svg';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/projects', label: 'Workspaces', icon: Box },
  { href: '/stories', label: 'Stories', icon: BookOpen },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/knowledge', label: 'Knowledge Base', icon: Library },
  { href: '/evidence', label: 'Evidence Vault', icon: FileArchive },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, planned: true },
  { href: '/assets', label: 'Assets', icon: Image },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/exports', label: 'Exports', icon: ScrollText, planned: true },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const CAPTURE_ITEMS = [
  { label: 'Screenshot', icon: Image, type: 'Screenshot' },
  { label: 'Terminal Output', icon: TerminalSquare, type: 'TerminalOutput' },
  { label: 'Code Snippet', icon: Code2, type: 'CodeSnippet' },
  { label: 'Voice Note', icon: Mic, type: 'VoiceRecording' },
  { label: 'Import File', icon: Import, href: '/evidence' },
  { label: 'New Quick Note', icon: FileText, type: 'MeetingNotes' },
] as const;

function openCapture(type: string) {
  window.dispatchEvent(new CustomEvent('ntc3:quick-capture', { detail: { type } }));
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[#090b10] text-foreground">
      <header className="flex h-14 shrink-0 items-center border-b border-[#272b34] bg-[#090b10] px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src={ntechMark} alt="" className="h-8 w-8" />
          <span className="text-[15px] font-bold tracking-[0.16em] text-[#f5f7fa]">N-TECH <span className="text-[#2f80ff]">C³</span></span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button aria-label="Notifications" className="rounded-md p-2 text-[#aeb6c2] hover:bg-[#161c24] hover:text-white"><Bell className="h-[18px] w-[18px]" /></button>
          <button aria-label="Help" className="rounded-md p-2 text-[#aeb6c2] hover:bg-[#161c24] hover:text-white"><CircleHelp className="h-[18px] w-[18px]" /></button>
          <Link href="/settings" aria-label="Settings" className="rounded-md p-2 text-[#aeb6c2] hover:bg-[#161c24] hover:text-white"><Settings className="h-[18px] w-[18px]" /></Link>
          <div className="mx-2 h-5 w-px bg-[#30343d]" />
          <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[#161c24]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2f80ff] text-xs font-semibold text-white">N</span>
            <span className="hidden text-xs text-[#f5f7fa] sm:inline">NaniTech</span>
            <ChevronDown className="h-3 w-3 text-[#7c8593]" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[204px] shrink-0 flex-col border-r border-[#272b34] bg-[#090b10] px-3 py-5 md:flex">
          <nav aria-label="Primary navigation" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
              const content = (
                <>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </>
              );
              return item.planned ? (
                <span key={item.href} title={`${item.label} is planned`} aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-xs text-[#687281] opacity-70">
                  {content}
                </span>
              ) : (
                <Link key={item.href} href={item.href} className={cn(
                  'flex items-center gap-3 rounded-md border px-3 py-2 text-xs transition-[background,border-color,color,box-shadow] duration-150',
                  active
                    ? 'border-[#2f80ff]/70 bg-[#2f80ff]/20 text-[#72b1ff] shadow-[0_0_16px_rgba(47,128,255,0.25)]'
                    : 'border-transparent text-[#c3c9d2] hover:bg-[#161c24] hover:text-white',
                )}>
                  {content}
                </Link>
              );
            })}
          </nav>

          <section className="mt-auto rounded-[10px] border border-[#30343d] bg-[#0d1118] p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-mono text-[10px] font-semibold tracking-[0.08em] text-[#cbd2dc]">QUICK CAPTURE</h2>
              <PlusCircle className="h-3.5 w-3.5 text-[#7c8593]" />
            </div>
            <div className="space-y-0.5">
              {CAPTURE_ITEMS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => 'href' in item ? setLocation(item.href) : openCapture(item.type)}
                  className="flex w-full items-center gap-3 rounded-md px-1.5 py-1.5 text-left text-[11px] text-[#c3c9d2] hover:bg-[#161c24] hover:text-white"
                >
                  <item.icon className="h-3.5 w-3.5 text-[#9ea8b6]" />
                  {item.label}
                </button>
              ))}
            </div>
          </section>
          <div className="mt-5 flex items-center gap-2 px-3 text-[10px] text-[#7c8593]">
            <span className="h-1.5 w-1.5 rounded-full border border-[#16c784] bg-[#16c784]/30" />
            v0.1.0 Alpha
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden bg-[#090b10]">
          <div className="checker-bg pointer-events-none absolute inset-0" />
          <div className="relative h-full overflow-y-auto p-4 custom-scrollbar">
            <div className="glass-panel mx-auto min-h-full max-w-[1440px] rounded-2xl p-4 lg:p-6">
              {children}
            </div>
          </div>
        </main>
      </div>
      <QuickCapture hideTrigger />
    </div>
  );
}
