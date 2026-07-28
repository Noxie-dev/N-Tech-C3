import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { LayoutDashboard, BookOpen, Layers, Archive, Library, Image, FileText, Settings, FolderKanban } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/stories', label: 'Stories', icon: BookOpen },
  { href: '/campaigns', label: 'Campaigns', icon: Layers },
  { href: '/evidence', label: 'Evidence', icon: Archive },
  { href: '/knowledge', label: 'Knowledge Base', icon: Library },
  { href: '/assets', label: 'Assets', icon: Image },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex w-full bg-background text-foreground">
      <aside className="w-64 border-r border-border bg-card flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.15)]">
              <span className="text-primary font-bold font-mono text-xs">C³</span>
            </div>
            <span className="font-bold tracking-widest text-sm font-mono text-foreground">N-TECH OS</span>
          </Link>
        </div>
        
        <div className="p-4 border-b border-border bg-background/50">
          <div className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider mb-2 flex justify-between">
            <span>System Status</span>
            <span className="text-primary flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>Online</span>
          </div>
          <div className="text-xs font-mono text-muted-foreground/80 space-y-1">
            <div className="flex justify-between"><span>Core Load</span><span className="text-foreground">12%</span></div>
            <div className="flex justify-between"><span>Memory</span><span className="text-foreground">2.4 GB</span></div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3 custom-scrollbar">
          <div className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider px-3 mb-2">Modules</div>
          {NAV_ITEMS.map((item) => {
            const active = location === item.href || (item.href !== '/dashboard' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group relative",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_rgba(0,229,255,0.5)]"></span>
                )}
                <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", active ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border p-3">
          <Link href="/settings" className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 group",
            location.startsWith('/settings') ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}>
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-500" />
            Settings
          </Link>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" style={{ maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 100%)' }}></div>
        <div className="flex-1 overflow-y-auto z-10 custom-scrollbar">
          <div className="container mx-auto p-6 max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
