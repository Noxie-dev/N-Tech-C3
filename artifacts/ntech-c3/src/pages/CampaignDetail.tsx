import { useState, useEffect, useRef, useCallback } from 'react';
import { useGetCampaign, useUpdateCampaign, useDeleteCampaign, getGetCampaignQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Select, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shared';
import { Layers, Save, Trash2, ArrowLeft, Clock } from 'lucide-react';
import { Link, useParams, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { formatShortDate } from '@/lib/utils';
import type { CampaignPatch } from '@workspace/api-client-react';

export function CampaignDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading } = useGetCampaign(id);
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initRef = useRef(false);

  useEffect(() => {
    if (campaign && !initRef.current) {
      setTitle(campaign.title);
      setObjective(campaign.objective || '');
      initRef.current = true;
    }
  }, [campaign]);

  const handleSave = useCallback(() => {
    if (!isDirty) return;
    updateCampaign.mutate({ 
      id, 
      data: { title, objective } 
    }, {
      onSuccess: (data) => {
        setIsDirty(false);
        queryClient.setQueryData(getGetCampaignQueryKey(id), data);
      }
    });
  }, [id, title, objective, isDirty, updateCampaign, queryClient]);

  const handleStatusChange = (status: CampaignPatch['status']) => {
    if (!status) return;
    updateCampaign.mutate({ id, data: { status } }, {
      onSuccess: (data) => queryClient.setQueryData(getGetCampaignQueryKey(id), data)
    });
  };

  const handleDelete = () => {
    deleteCampaign.mutate({ id }, {
      onSuccess: () => setLocation('/campaigns')
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground font-mono text-center">Loading campaign data...</div>;
  if (!campaign) return <div className="p-8 text-muted-foreground font-mono text-center">Campaign not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
        <Link href="/campaigns" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Campaigns
        </Link>
        <span>/</span>
        <span className="text-foreground truncate">{campaign.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <Input 
              value={title} 
              onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
              className="text-2xl font-bold font-mono h-auto py-2 px-0 bg-transparent border-transparent hover:border-input focus:border-input shadow-none rounded-none focus-visible:ring-0 w-full"
            />
            <Button 
              onClick={handleSave} 
              disabled={!isDirty || updateCampaign.isPending}
              variant={isDirty ? "default" : "secondary"}
              className="gap-2 font-mono text-xs uppercase ml-4 shrink-0"
            >
              <Save className="w-4 h-4" /> {updateCampaign.isPending ? 'Syncing...' : isDirty ? 'Sync' : 'Synced'}
            </Button>
          </div>

          <Card>
            <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Objective</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Textarea 
                value={objective}
                onChange={(e) => { setObjective(e.target.value); setIsDirty(true); }}
                placeholder="Campaign objective..."
                className="min-h-[120px] bg-transparent font-sans text-sm resize-none"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="py-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Status</label>
                <Select 
                  value={campaign.status} 
                  onChange={(e) => handleStatusChange(e.target.value as CampaignPatch['status'])}
                  className="font-mono text-xs bg-muted/50"
                >
                  <option value="Planning">Planning</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </Select>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Clock className="w-3 h-3" /> Created: {formatShortDate(campaign.createdAt)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Clock className="w-3 h-3" /> Updated: {formatShortDate(campaign.updatedAt)}
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive font-mono text-xs uppercase tracking-wider">
                      <Trash2 className="w-3 h-3 mr-2" /> Terminate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-destructive font-mono uppercase">Confirm Termination</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm text-muted-foreground">
                      Permanently delete campaign?
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleDelete} disabled={deleteCampaign.isPending}>
                        Confirm
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
