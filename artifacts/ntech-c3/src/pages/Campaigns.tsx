import { useState } from "react";
import {
  useCreateCampaign,
  useListCampaigns,
  useListWorkspaces,
} from "@workspace/api-client-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  Skeleton,
} from "@/components/shared";
import { BookOpen, Calendar, Layers, Plus, Search, Target } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatShortDate } from "@/lib/utils";
import type {
  CampaignLifecycleStatus,
  CampaignType,
} from "@workspace/api-client-react";

const lifecycleBadges: Record<
  CampaignLifecycleStatus,
  "default" | "secondary" | "outline" | "success" | "warning"
> = {
  Planning: "warning",
  Active: "success",
  Paused: "secondary",
  Completed: "default",
  Archived: "outline",
};

const campaignTypes: CampaignType[] = [
  "EngineeringPhilosophy",
  "ProductDevelopment",
  "Launch",
  "Research",
  "Education",
  "ThoughtLeadership",
  "Community",
  "CaseStudy",
  "Recruitment",
  "BehindTheScenes",
  "Conference",
  "ReleaseNotes",
  "DeveloperDiary",
];

export function Campaigns() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState("");
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { data: workspaces } = useListWorkspaces();
  const { data: campaigns, isLoading } = useListCampaigns({
    workspaceId: workspaceId ? Number(workspaceId) : undefined,
    lifecycleStatus: lifecycleStatus
      ? (lifecycleStatus as CampaignLifecycleStatus)
      : undefined,
    search: search || undefined,
  });
  const createCampaign = useCreateCampaign();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const selectedWorkspace = Number(form.get("workspaceId"));
    if (!title || !selectedWorkspace) return;
    createCampaign.mutate(
      {
        data: {
          title,
          workspaceId: selectedWorkspace,
          missionStatement:
            String(form.get("missionStatement") ?? "").trim() || undefined,
          owner: String(form.get("owner") ?? "").trim() || undefined,
          campaignType:
            (String(form.get("campaignType") ?? "") as CampaignType) ||
            undefined,
          targetStoryCount: Number(form.get("targetStoryCount") ?? 0),
        },
      },
      {
        onSuccess: (campaign) => {
          setIsCreateOpen(false);
          setLocation(`/campaigns/${campaign.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold">Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Governed engineering communication missions.
            </p>
          </div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono text-xs uppercase tracking-wider">
              <Plus className="h-4 w-4" /> New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider text-primary">
                Initialize Campaign
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Workspace
                <Select name="workspaceId" required defaultValue="">
                  <option value="" disabled>
                    Select Workspace
                  </option>
                  {workspaces
                    ?.filter((workspace) => workspace.status !== "Archived")
                    .map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </option>
                    ))}
                </Select>
              </label>
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Title
                <Input
                  name="title"
                  required
                  autoFocus
                  placeholder="Q3 reliability narrative"
                />
              </label>
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Mission statement
                <Input
                  name="missionStatement"
                  placeholder="What this mission changes"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-2 text-xs font-mono uppercase text-muted-foreground">
                  Owner
                  <Input name="owner" placeholder="Accountable owner" />
                </label>
                <label className="space-y-2 text-xs font-mono uppercase text-muted-foreground">
                  Target Stories
                  <Input
                    name="targetStoryCount"
                    type="number"
                    min="0"
                    defaultValue="0"
                  />
                </label>
              </div>
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Campaign type
                <Select name="campaignType" defaultValue="">
                  <option value="">Unclassified</option>
                  {campaignTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </label>
              {createCampaign.error && (
                <p className="text-sm text-destructive">
                  {createCampaign.error.message}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createCampaign.isPending}>
                  {createCampaign.isPending ? "Initializing…" : "Initialize"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card/40 p-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns"
            className="pl-9"
          />
        </div>
        <Select
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
        >
          <option value="">All Workspaces</option>
          {workspaces?.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </Select>
        <Select
          value={lifecycleStatus}
          onChange={(event) => setLifecycleStatus(event.target.value)}
        >
          <option value="">Active records</option>
          {Object.keys(lifecycleBadges).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="min-h-52 p-6">
              <Skeleton className="mb-4 h-6 w-3/4" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))
        ) : campaigns?.length ? (
          campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaigns/${campaign.id}`}
              className="group block"
            >
              <Card className="relative h-full overflow-hidden bg-card/50 transition-colors hover:border-primary/50">
                {campaign.lifecycleStatus === "Active" && (
                  <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
                )}
                <CardContent className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex gap-2">
                      <Badge
                        variant={lifecycleBadges[campaign.lifecycleStatus]}
                      >
                        {campaign.lifecycleStatus}
                      </Badge>
                      {campaign.phase && (
                        <Badge variant="outline">{campaign.phase}</Badge>
                      )}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      v{campaign.version}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold transition-colors group-hover:text-primary">
                    {campaign.title}
                  </h3>
                  <p className="mb-4 line-clamp-3 flex-1 text-sm text-muted-foreground">
                    <Target className="mr-1 inline h-3 w-3 text-primary/70" />
                    {campaign.missionStatement ||
                      "Mission statement not yet defined."}
                  </p>
                  <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4 font-mono text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {campaign.storyCount}/{campaign.targetStoryCount} Stories
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatShortDate(campaign.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <div className="col-span-full rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
            <Layers className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-mono text-sm text-muted-foreground">
              NO CAMPAIGNS MATCH THE FILTER
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
