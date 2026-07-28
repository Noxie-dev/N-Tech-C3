import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation, useParams } from 'wouter';
import { Shell } from '@/components/Shell';
import { Spinner } from '@/components/shared';

function lazyPage<T extends Record<string, React.ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T,
) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

const Dashboard = lazyPage(() => import('@/pages/Dashboard'), 'Dashboard');
const Stories = lazyPage(() => import('@/pages/Stories'), 'Stories');
const StoryDetail = lazyPage(() => import('@/pages/StoryDetail'), 'StoryDetail');
const Campaigns = lazyPage(() => import('@/pages/Campaigns'), 'Campaigns');
const CampaignDetail = lazyPage(() => import('@/pages/CampaignDetail'), 'CampaignDetail');
const Evidence = lazyPage(() => import('@/pages/Evidence'), 'Evidence');
const Knowledge = lazyPage(() => import('@/pages/Knowledge'), 'Knowledge');
const KnowledgeDetail = lazyPage(() => import('@/pages/KnowledgeDetail'), 'KnowledgeDetail');
const Assets = lazyPage(() => import('@/pages/Assets'), 'Assets');
const Templates = lazyPage(() => import('@/pages/Templates'), 'Templates');
const Workspaces = lazyPage(() => import('@/pages/Workspaces'), 'Workspaces');
const WorkspaceDetail = lazyPage(() => import('@/pages/WorkspaceDetail'), 'WorkspaceDetail');
const WorkspaceSettings = lazyPage(() => import('@/pages/WorkspaceSettings'), 'WorkspaceSettings');
const Settings = lazyPage(() => import('@/pages/Settings'), 'Settings');
const Search = lazyPage(() => import('@/pages/Search'), 'Search');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function HomeRedirect() {
  if (typeof window !== 'undefined') {
    window.location.replace('/dashboard');
  }
  return null;
}

function ProjectsRedirect() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id?: string }>();
  queueMicrotask(() => navigate(id ? `/workspaces/${id}` : '/workspaces', { replace: true }));
  return null;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <h1 className="text-6xl font-bold font-mono text-primary">404</h1>
      <p className="text-xl text-muted-foreground font-mono">SECTOR_NOT_FOUND</p>
      <a href="/dashboard" className="text-primary hover:underline font-mono text-sm">RETURN_TO_BASE</a>
    </div>
  );
}

function Router() {
  return (
    <Shell>
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>}>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/search" component={Search} />
          <Route path="/stories" component={Stories} />
          <Route path="/stories/:id" component={StoryDetail} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/campaigns/:id" component={CampaignDetail} />
          <Route path="/evidence" component={Evidence} />
          <Route path="/knowledge" component={Knowledge} />
          <Route path="/knowledge/:id" component={KnowledgeDetail} />
          <Route path="/assets" component={Assets} />
          <Route path="/templates" component={Templates} />
          <Route path="/workspaces" component={Workspaces} />
          <Route path="/workspaces/:id/settings" component={WorkspaceSettings} />
          <Route path="/workspaces/:id" component={WorkspaceDetail} />
          <Route path="/projects/:id" component={ProjectsRedirect} />
          <Route path="/projects" component={ProjectsRedirect} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
