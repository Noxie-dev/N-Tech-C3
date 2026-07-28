import { useGetDashboardStats, useGetRecentActivity } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@/components/shared';
import { BookOpen, Layers, Archive, Image, Library, Activity, ArrowUpRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Link } from 'wouter';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-mono">Command Center</h1>
        <p className="text-muted-foreground">Engineering intelligence system overview and recent signals.</p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Stories" value={stats?.totalStories} icon={BookOpen} loading={statsLoading} href="/stories" />
        <MetricCard title="Active Campaigns" value={stats?.activeCampaigns} icon={Layers} loading={statsLoading} href="/campaigns" highlight />
        <MetricCard title="Evidence Vault" value={stats?.totalEvidence} icon={Archive} loading={statsLoading} href="/evidence" />
        <MetricCard title="Knowledge Base" value={stats?.totalKnowledge} icon={Library} loading={statsLoading} href="/knowledge" />
        <MetricCard title="Assets" value={stats?.totalAssets} icon={Image} loading={statsLoading} href="/assets" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 shadow-[0_0_30px_rgba(0,229,255,0.05)] bg-background/50 backdrop-blur">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground">
                <Activity className="w-4 h-4 text-primary" /> Signal Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activityLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {activity.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary/50 shadow-[0_0_5px_rgba(0,229,255,0.5)]" />
                        <div>
                          <p className="text-sm font-medium">
                            <span className="text-muted-foreground">{item.action}</span>{' '}
                            <span className="text-foreground">{item.entityTitle}</span>
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {item.entityType.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {formatDate(item.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm font-mono">No recent activity detected.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                Pipeline Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {statsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.storiesByStatus?.map((statusCount) => {
                    const statusColors: Record<string, string> = {
                      Published: 'bg-emerald-500',
                      Approved: 'bg-blue-500',
                      Review: 'bg-amber-500',
                      Draft: 'bg-primary',
                      Idea: 'bg-purple-500',
                      Research: 'bg-pink-500'
                    };
                    const color = statusColors[statusCount.status] || 'bg-muted-foreground';
                    const percentage = stats.totalStories > 0 ? (statusCount.count / stats.totalStories) * 100 : 0;
                    
                    return (
                      <div key={statusCount.status} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-foreground">{statusCount.status}</span>
                          <span className="text-muted-foreground">{statusCount.count}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, loading, highlight = false, href }: any) {
  return (
    <Link href={href} className="block group">
      <Card className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${highlight ? 'border-primary/50 shadow-[0_0_15px_rgba(0,229,255,0.1)]' : 'hover:border-muted-foreground/30'}`}>
        <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{title}</span>
            <Icon className={`w-4 h-4 ${highlight ? 'text-primary drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]' : 'text-muted-foreground group-hover:text-primary transition-colors'}`} />
          </div>
          <div className="mt-4 flex items-end justify-between">
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <span className={`text-3xl font-bold font-mono tracking-tight ${highlight ? 'text-primary' : 'text-foreground'}`}>
                {value || 0}
              </span>
            )}
            <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
