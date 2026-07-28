import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Shell } from '@/components/Shell';
import { Dashboard } from '@/pages/Dashboard';
import { Stories } from '@/pages/Stories';
import { StoryDetail } from '@/pages/StoryDetail';
import { Campaigns } from '@/pages/Campaigns';
import { CampaignDetail } from '@/pages/CampaignDetail';
import { Evidence } from '@/pages/Evidence';
import { Knowledge } from '@/pages/Knowledge';
import { KnowledgeDetail } from '@/pages/KnowledgeDetail';
import { Assets } from '@/pages/Assets';
import { Templates } from '@/pages/Templates';
import { Projects } from '@/pages/Projects';
import { Settings } from '@/pages/Settings';

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
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/stories" component={Stories} />
        <Route path="/stories/:id" component={StoryDetail} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/campaigns/:id" component={CampaignDetail} />
        <Route path="/evidence" component={Evidence} />
        <Route path="/knowledge" component={Knowledge} />
        <Route path="/knowledge/:id" component={KnowledgeDetail} />
        <Route path="/assets" component={Assets} />
        <Route path="/templates" component={Templates} />
        <Route path="/projects" component={Projects} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
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
