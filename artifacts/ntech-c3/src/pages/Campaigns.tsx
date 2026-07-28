import { useState } from 'react';
import { useListCampaigns, useCreateCampaign } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, Skeleton } from '@/components/shared';
import { Layers, Plus, Target, Calendar, BookOpen } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { formatShortDate } from '@/lib/utils';
import type { CampaignInput } from '@workspace/api-client-react';

export function Campaigns() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: campaigns, isLoading } = useListCampaigns();
  const createCampaign = useCreateCampaign();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const objective = formData.get('objective') as string;
    const status = formData.get('status') as CampaignInput['status'];

    if (!title) return;

    createCampaign.mutate({ data: { title, objective, status } }, {
      onSuccess: (newCamp) => {
        setIsCreateOpen(false);
        setLocation(`/campaigns/${newCamp.id}`);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
      Active: "success",
      Planning: "warning",
      Paused: "secondary",
      Completed: "default",
      Archived: "outline"
    };
    return <Badge variant={map[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono">Campaigns</h1>
            <p className="text-sm text-muted-foreground">Strategic engineering content initiatives.</p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono uppercase tracking-wider text-xs">
              <Plus className="w-4 h-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider text-primary">Initialize Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Title</label>
                <Input name="title" placeholder="e.g. Q3 Scalability Push" required autoFocus />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Objective</label>
                <Input name="objective" placeholder="Primary goal..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Status</label>
                <Select name="status" defaultValue="Planning">
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                </Select>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Abort</Button>
                <Button type="submit" disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? 'Initializing...' : 'Initialize'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="min-h-[200px] flex items-center justify-center">
              <div className="w-full p-6 space-y-4"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div>
            </Card>
          ))
        ) : campaigns?.length === 0 ? (
          <div className="col-span-full p-12 text-center border border-dashed border-border rounded-lg bg-card/50">
            <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-mono text-sm">NO ACTIVE CAMPAIGNS DETECTED</p>
          </div>
        ) : (
          campaigns?.map((camp) => (
            <Link key={camp.id} href={`/campaigns/${camp.id}`} className="block group">
              <Card className="h-full hover:border-primary/50 transition-colors bg-card/50 backdrop-blur relative overflow-hidden group-hover:shadow-[0_0_20px_rgba(0,229,255,0.05)]">
                {camp.status === 'Active' && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary"></div>
                )}
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    {getStatusBadge(camp.status)}
                    <span className="text-xs font-mono text-muted-foreground">ID: {camp.id}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{camp.title}</h3>
                  {camp.objective && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                      <Target className="w-3 h-3 inline mr-1 text-primary/70" />
                      {camp.objective}
                    </p>
                  )}
                  <div className="pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-mono mt-auto">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {camp.storyCount || 0} Stories
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatShortDate(camp.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
