import { useEffect, useState } from "react";
import {
  getGetCampaignQueryKey,
  getListCampaignMilestonesQueryKey,
  getListCampaignStoriesQueryKey,
  getListCampaignVersionsQueryKey,
  useAddCampaignStory,
  useArchiveCampaign,
  useChangeCampaignPhase,
  useCompleteCampaign,
  useCreateCampaignMilestone,
  useGetCampaign,
  useListCampaignMilestones,
  useListCampaignStories,
  useListCampaignVersions,
  useListStories,
  useRemoveCampaignMilestone,
  useRemoveCampaignStory,
  useReorderCampaignMilestones,
  useReorderCampaignStories,
  useReopenCampaign,
  useRestoreCampaign,
  useTransitionCampaign,
  useUpdateCampaignMilestone,
  useUpdateCampaignStory,
  useUpdateCampaign,
} from "@workspace/api-client-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Textarea,
} from "@/components/shared";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Clock,
  Flag,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { formatShortDate } from "@/lib/utils";
import type {
  Campaign,
  CampaignLifecycleStatus,
  CampaignMilestoneStatus,
  CampaignPhase,
  CampaignStoryRole,
  CampaignSuccessAssessment,
  CampaignType,
} from "@workspace/api-client-react";

const phases: CampaignPhase[] = [
  "Planning",
  "Research",
  "ContentBuilding",
  "Review",
  "Distribution",
  "Monitoring",
];

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

type FormState = {
  title: string;
  objective: string;
  missionStatement: string;
  successDefinition: string;
  owner: string;
  audience: string;
  campaignType: string;
  startAt: string;
  endAt: string;
  targetStoryCount: string;
  targetPublicationCount: string;
};

const toForm = (campaign: Campaign): FormState => ({
  title: campaign.title,
  objective: campaign.objective ?? "",
  missionStatement: campaign.missionStatement ?? "",
  successDefinition: campaign.successDefinition ?? "",
  owner: campaign.owner ?? "",
  audience: campaign.audience ?? "",
  campaignType: campaign.campaignType ?? "",
  startAt: campaign.startAt?.slice(0, 10) ?? "",
  endAt: campaign.endAt?.slice(0, 10) ?? "",
  targetStoryCount: String(campaign.targetStoryCount),
  targetPublicationCount: String(campaign.targetPublicationCount),
});

export function CampaignDetail() {
  const id = Number(useParams().id);
  const queryClient = useQueryClient();
  const { data: campaign, isLoading, error } = useGetCampaign(id);
  const { data: versions } = useListCampaignVersions(id);
  const { data: portfolio = [] } = useListCampaignStories(id);
  const { data: milestones = [] } = useListCampaignMilestones(id);
  const { data: workspaceStories = [] } = useListStories({
    workspaceId: campaign?.workspaceId,
  });
  const updateCampaign = useUpdateCampaign();
  const transitionCampaign = useTransitionCampaign();
  const phaseCampaign = useChangeCampaignPhase();
  const completeCampaign = useCompleteCampaign();
  const reopenCampaign = useReopenCampaign();
  const archiveCampaign = useArchiveCampaign();
  const restoreCampaign = useRestoreCampaign();
  const addStory = useAddCampaignStory();
  const updateStory = useUpdateCampaignStory();
  const removeStory = useRemoveCampaignStory();
  const reorderStories = useReorderCampaignStories();
  const createMilestone = useCreateCampaignMilestone();
  const updateMilestone = useUpdateCampaignMilestone();
  const removeMilestone = useRemoveCampaignMilestone();
  const reorderMilestones = useReorderCampaignMilestones();
  const [form, setForm] = useState<FormState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [reason, setReason] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [assessment, setAssessment] =
    useState<CampaignSuccessAssessment>("PartiallyAchieved");

  useEffect(() => {
    if (campaign) {
      setForm(toForm(campaign));
      setDirty(false);
    }
  }, [campaign]);

  const synchronize = (next: Campaign) => {
    queryClient.setQueryData(getGetCampaignQueryKey(id), next);
    queryClient.invalidateQueries({
      queryKey: getListCampaignVersionsQueryKey(id),
    });
    setReason("");
    setCompletionNote("");
  };

  const refreshPass2 = () => {
    void queryClient.invalidateQueries({
      queryKey: getGetCampaignQueryKey(id),
    });
    void queryClient.invalidateQueries({
      queryKey: getListCampaignStoriesQueryKey(id),
    });
    void queryClient.invalidateQueries({
      queryKey: getListCampaignMilestonesQueryKey(id),
    });
    void queryClient.invalidateQueries({
      queryKey: getListCampaignVersionsQueryKey(id),
    });
  };

  const mutateError =
    updateCampaign.error ??
    transitionCampaign.error ??
    phaseCampaign.error ??
    completeCampaign.error ??
    reopenCampaign.error ??
    archiveCampaign.error ??
    restoreCampaign.error ??
    addStory.error ??
    updateStory.error ??
    removeStory.error ??
    reorderStories.error ??
    createMilestone.error ??
    updateMilestone.error ??
    removeMilestone.error ??
    reorderMilestones.error;
  const pending = [
    updateCampaign,
    transitionCampaign,
    phaseCampaign,
    completeCampaign,
    reopenCampaign,
    archiveCampaign,
    restoreCampaign,
    addStory,
    updateStory,
    removeStory,
    reorderStories,
    createMilestone,
    updateMilestone,
    removeMilestone,
    reorderMilestones,
  ].some((mutation) => mutation.isPending);

  if (isLoading) {
    return (
      <div className="p-8 text-center font-mono text-muted-foreground">
        Loading Campaign…
      </div>
    );
  }
  if (!campaign || !form) {
    return (
      <div className="p-8 text-center font-mono text-muted-foreground">
        {error?.message || "Campaign not found."}
      </div>
    );
  }

  const archived = campaign.lifecycleStatus === "Archived";
  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
    setDirty(true);
  };
  const save = () =>
    updateCampaign.mutate(
      {
        id,
        data: {
          expectedVersion: campaign.version,
          title: form.title,
          objective: form.objective || null,
          missionStatement: form.missionStatement || null,
          successDefinition: form.successDefinition || null,
          owner: form.owner || null,
          audience: form.audience || null,
          campaignType: (form.campaignType as CampaignType) || null,
          startAt: form.startAt || null,
          endAt: form.endAt || null,
          targetStoryCount: Number(form.targetStoryCount || 0),
          targetPublicationCount: Number(form.targetPublicationCount || 0),
          changeSummary: "Campaign mission edited in governed detail view",
        },
      },
      { onSuccess: synchronize },
    );
  const transition = (lifecycleStatus: CampaignLifecycleStatus) =>
    transitionCampaign.mutate(
      {
        id,
        data: {
          expectedVersion: campaign.version,
          lifecycleStatus,
          reason: reason || undefined,
        },
      },
      { onSuccess: synchronize },
    );
  const availableStories = workspaceStories.filter(
    (story) =>
      story.status !== "Archived" &&
      !portfolio.some((membership) => membership.storyId === story.id),
  );
  const moveStory = (storyId: number, direction: -1 | 1) => {
    const currentIndex = portfolio.findIndex(
      (membership) => membership.storyId === storyId,
    );
    const targetIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= portfolio.length
    ) {
      return;
    }
    const storyIds = portfolio.map((membership) => membership.storyId);
    [storyIds[currentIndex], storyIds[targetIndex]] = [
      storyIds[targetIndex],
      storyIds[currentIndex],
    ];
    reorderStories.mutate(
      { id, data: { expectedVersion: campaign.version, storyIds } },
      { onSuccess: refreshPass2 },
    );
  };
  const moveMilestone = (milestoneId: number, direction: -1 | 1) => {
    const currentIndex = milestones.findIndex(
      (milestone) => milestone.id === milestoneId,
    );
    const targetIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= milestones.length
    ) {
      return;
    }
    const milestoneIds = milestones.map((milestone) => milestone.id);
    [milestoneIds[currentIndex], milestoneIds[targetIndex]] = [
      milestoneIds[targetIndex],
      milestoneIds[currentIndex],
    ];
    reorderMilestones.mutate(
      { id, data: { expectedVersion: campaign.version, milestoneIds } },
      { onSuccess: refreshPass2 },
    );
  };
  const setMilestoneStatus = (
    milestoneId: number,
    milestoneVersion: number,
    status: CampaignMilestoneStatus,
  ) => {
    const completionNote = ["Completed", "Skipped"].includes(status)
      ? window.prompt(`Record why this milestone is ${status.toLowerCase()}:`)
      : null;
    if (["Completed", "Skipped"].includes(status) && !completionNote?.trim()) {
      return;
    }
    updateMilestone.mutate(
      {
        id,
        milestoneId,
        data: {
          expectedCampaignVersion: campaign.version,
          expectedMilestoneVersion: milestoneVersion,
          status,
          completionNote: completionNote || undefined,
        },
      },
      { onSuccess: refreshPass2 },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 font-mono text-sm text-muted-foreground">
        <Link
          href="/campaigns"
          className="flex items-center gap-1 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Campaigns
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{campaign.title}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <Badge>{campaign.lifecycleStatus}</Badge>
            {campaign.phase && (
              <Badge variant="outline">{campaign.phase}</Badge>
            )}
            <span className="font-mono text-xs text-muted-foreground">
              v{campaign.version}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Workspace {campaign.workspaceId} · {campaign.storyCount} linked
            Stories
          </p>
        </div>
        <Button
          onClick={save}
          disabled={!dirty || pending || archived}
          className="gap-2"
        >
          <Save className="h-4 w-4" />{" "}
          {dirty ? "Save checkpoint" : "Synchronized"}
        </Button>
      </div>

      {mutateError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {mutateError.message}
        </div>
      )}

      <fieldset
        disabled={archived}
        className="grid gap-6 lg:grid-cols-3 disabled:opacity-70"
      >
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm uppercase">
                Mission contract
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                aria-label="Campaign title"
              />
              <Textarea
                value={form.missionStatement}
                onChange={(e) => setField("missionStatement", e.target.value)}
                placeholder="Mission statement"
                className="min-h-24"
              />
              <Textarea
                value={form.successDefinition}
                onChange={(e) => setField("successDefinition", e.target.value)}
                placeholder="Success definition"
                className="min-h-24"
              />
              <Textarea
                value={form.objective}
                onChange={(e) => setField("objective", e.target.value)}
                placeholder="Legacy objective / supporting context"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  value={form.owner}
                  onChange={(e) => setField("owner", e.target.value)}
                  placeholder="Accountable owner"
                />
                <Input
                  value={form.audience}
                  onChange={(e) => setField("audience", e.target.value)}
                  placeholder="Audience"
                />
                <Select
                  value={form.campaignType}
                  onChange={(e) => setField("campaignType", e.target.value)}
                >
                  <option value="">Unclassified type</option>
                  {campaignTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={form.startAt}
                  onChange={(e) => setField("startAt", e.target.value)}
                  aria-label="Start date"
                />
                <Input
                  type="date"
                  value={form.endAt}
                  onChange={(e) => setField("endAt", e.target.value)}
                  aria-label="End date"
                />
                <Input
                  type="number"
                  min="0"
                  value={form.targetStoryCount}
                  onChange={(e) => setField("targetStoryCount", e.target.value)}
                  aria-label="Target Story count"
                />
                <Input
                  type="number"
                  min="0"
                  value={form.targetPublicationCount}
                  onChange={(e) =>
                    setField("targetPublicationCount", e.target.value)
                  }
                  aria-label="Target Publication count"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase">
                <BookOpen className="h-4 w-4" /> Story portfolio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="grid gap-2 md:grid-cols-[1fr_10rem_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const storyId = Number(data.get("storyId"));
                  if (!storyId) return;
                  addStory.mutate(
                    {
                      id,
                      data: {
                        expectedVersion: campaign.version,
                        storyId,
                        role: String(data.get("role")) as CampaignStoryRole,
                        contributionNote:
                          String(data.get("contributionNote") ?? "").trim() ||
                          undefined,
                      },
                    },
                    {
                      onSuccess: () => {
                        form.reset();
                        refreshPass2();
                      },
                    },
                  );
                }}
              >
                <Select
                  name="storyId"
                  aria-label="Story to add"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select Workspace Story
                  </option>
                  {availableStories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.title}
                    </option>
                  ))}
                </Select>
                <Select
                  name="role"
                  aria-label="Story role"
                  defaultValue="Supporting"
                >
                  <option value="Anchor">Anchor</option>
                  <option value="Supporting">Supporting</option>
                  <option value="FollowUp">Follow-up</option>
                  <option value="Reference">Reference</option>
                </Select>
                <Input
                  name="contributionNote"
                  placeholder="Contribution note"
                />
                <Button
                  disabled={pending || archived || !availableStories.length}
                >
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </form>
              {portfolio.length ? (
                portfolio.map((membership, index) => (
                  <div
                    key={membership.storyId}
                    className="grid gap-3 rounded-lg border border-border/70 p-3 md:grid-cols-[1fr_9rem_auto]"
                  >
                    <div>
                      <Link
                        href={`/stories/${membership.storyId}`}
                        className="font-medium hover:text-primary"
                      >
                        {membership.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{membership.status}</span>
                        {membership.isPrimary && (
                          <Badge variant="outline">Primary</Badge>
                        )}
                        {membership.contributionNote && (
                          <span>{membership.contributionNote}</span>
                        )}
                      </div>
                    </div>
                    <Select
                      aria-label={`Role for ${membership.title}`}
                      value={membership.role}
                      disabled={pending || archived}
                      onChange={(event) =>
                        updateStory.mutate(
                          {
                            id,
                            storyId: membership.storyId,
                            data: {
                              expectedCampaignVersion: campaign.version,
                              expectedMembershipVersion: membership.version,
                              role: event.target.value as CampaignStoryRole,
                            },
                          },
                          { onSuccess: refreshPass2 },
                        )
                      }
                    >
                      <option value="Anchor">Anchor</option>
                      <option value="Supporting">Supporting</option>
                      <option value="FollowUp">Follow-up</option>
                      <option value="Reference">Reference</option>
                    </Select>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Move ${membership.title} up`}
                        disabled={pending || archived || index === 0}
                        onClick={() => moveStory(membership.storyId, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Move ${membership.title} down`}
                        disabled={
                          pending || archived || index === portfolio.length - 1
                        }
                        onClick={() => moveStory(membership.storyId, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={membership.isPrimary ? "secondary" : "outline"}
                        disabled={pending || archived}
                        onClick={() =>
                          updateStory.mutate(
                            {
                              id,
                              storyId: membership.storyId,
                              data: {
                                expectedCampaignVersion: campaign.version,
                                expectedMembershipVersion: membership.version,
                                isPrimary: !membership.isPrimary,
                              },
                            },
                            { onSuccess: refreshPass2 },
                          )
                        }
                      >
                        {membership.isPrimary ? "Primary" : "Set primary"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Remove ${membership.title}`}
                        disabled={pending || archived}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Remove ${membership.title} from this Campaign? The Story will not be deleted.`,
                            )
                          ) {
                            return;
                          }
                          removeStory.mutate(
                            {
                              id,
                              storyId: membership.storyId,
                              data: { expectedVersion: campaign.version },
                            },
                            { onSuccess: refreshPass2 },
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No Stories are coordinated by this Campaign yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase">
                <Flag className="h-4 w-4" /> Milestone plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="grid gap-2 md:grid-cols-[1fr_10rem_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const title = String(data.get("title") ?? "").trim();
                  if (!title) return;
                  createMilestone.mutate(
                    {
                      id,
                      data: {
                        expectedVersion: campaign.version,
                        title,
                        targetDate:
                          String(data.get("targetDate") ?? "") || undefined,
                      },
                    },
                    {
                      onSuccess: () => {
                        form.reset();
                        refreshPass2();
                      },
                    },
                  );
                }}
              >
                <Input name="title" placeholder="Milestone title" required />
                <Input
                  name="targetDate"
                  type="date"
                  aria-label="Milestone target date"
                />
                <Button disabled={pending || archived}>
                  <Plus className="mr-1 h-4 w-4" /> Add milestone
                </Button>
              </form>
              {milestones.length ? (
                milestones.map((milestone, index) => (
                  <div
                    key={milestone.id}
                    className="grid gap-3 rounded-lg border border-border/70 p-3 md:grid-cols-[1fr_10rem_auto]"
                  >
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {milestone.targetDate || "No target date"}
                        {milestone.completionNote
                          ? ` · ${milestone.completionNote}`
                          : ""}
                      </p>
                    </div>
                    <Select
                      aria-label={`Status for ${milestone.title}`}
                      value={milestone.status}
                      disabled={
                        pending ||
                        archived ||
                        ["Completed", "Skipped"].includes(milestone.status)
                      }
                      onChange={(event) =>
                        setMilestoneStatus(
                          milestone.id,
                          milestone.version,
                          event.target.value as CampaignMilestoneStatus,
                        )
                      }
                    >
                      <option value="Planned">Planned</option>
                      <option value="InProgress">In progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Skipped">Skipped</option>
                    </Select>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Move ${milestone.title} up`}
                        disabled={pending || archived || index === 0}
                        onClick={() => moveMilestone(milestone.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Move ${milestone.title} down`}
                        disabled={
                          pending || archived || index === milestones.length - 1
                        }
                        onClick={() => moveMilestone(milestone.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Remove ${milestone.title}`}
                        disabled={pending || archived}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Remove milestone ${milestone.title}?`,
                            )
                          ) {
                            return;
                          }
                          removeMilestone.mutate(
                            {
                              id,
                              milestoneId: milestone.id,
                              data: { expectedVersion: campaign.version },
                            },
                            { onSuccess: refreshPass2 },
                          );
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No Campaign milestones have been defined.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm uppercase">
                Version trail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {versions?.map((version) => (
                <div
                  key={version.id}
                  className="flex justify-between gap-4 border-b border-border/50 pb-3 text-sm last:border-0"
                >
                  <div>
                    <strong>v{version.version}</strong> ·{" "}
                    {version.changeSummary || "Checkpoint"}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatShortDate(version.createdAt)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm uppercase">
                Governed commands
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Phase
                <Select
                  value={campaign.phase ?? "Planning"}
                  onChange={(e) =>
                    phaseCampaign.mutate(
                      {
                        id,
                        data: {
                          expectedVersion: campaign.version,
                          phase: e.target.value as CampaignPhase,
                        },
                      },
                      { onSuccess: synchronize },
                    )
                  }
                  disabled={pending}
                >
                  {phases.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </Select>
              </label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for pause or reopen"
              />
              {campaign.lifecycleStatus === "Planning" && (
                <Button
                  className="w-full"
                  disabled={pending || dirty}
                  onClick={() => transition("Active")}
                >
                  Activate
                </Button>
              )}
              {campaign.lifecycleStatus === "Active" && (
                <Button
                  className="w-full"
                  variant="secondary"
                  disabled={pending || !reason}
                  onClick={() => transition("Paused")}
                >
                  Pause
                </Button>
              )}
              {campaign.lifecycleStatus === "Paused" && (
                <Button
                  className="w-full"
                  disabled={pending}
                  onClick={() => transition("Active")}
                >
                  Resume
                </Button>
              )}
              {(campaign.lifecycleStatus === "Active" ||
                campaign.lifecycleStatus === "Paused") && (
                <>
                  <Textarea
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    placeholder="Completion note"
                  />
                  <Select
                    value={assessment}
                    onChange={(e) =>
                      setAssessment(e.target.value as CampaignSuccessAssessment)
                    }
                  >
                    <option value="Achieved">Achieved</option>
                    <option value="PartiallyAchieved">
                      Partially achieved
                    </option>
                    <option value="NotAchieved">Not achieved</option>
                  </Select>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={pending || !completionNote}
                    onClick={() =>
                      completeCampaign.mutate(
                        {
                          id,
                          data: {
                            expectedVersion: campaign.version,
                            completionNote,
                            successAssessment: assessment,
                          },
                        },
                        { onSuccess: synchronize },
                      )
                    }
                  >
                    Complete
                  </Button>
                </>
              )}
              {campaign.lifecycleStatus === "Completed" && (
                <Button
                  className="w-full"
                  disabled={pending || !reason}
                  onClick={() =>
                    reopenCampaign.mutate(
                      {
                        id,
                        data: { expectedVersion: campaign.version, reason },
                      },
                      { onSuccess: synchronize },
                    )
                  }
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reopen
                </Button>
              )}
              {!archived && (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={pending || dirty}
                  onClick={() =>
                    archiveCampaign.mutate(
                      { id, data: { expectedVersion: campaign.version } },
                      { onSuccess: synchronize },
                    )
                  }
                >
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2 p-4 font-mono text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" /> Created{" "}
                {formatShortDate(campaign.createdAt)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" /> Updated{" "}
                {formatShortDate(campaign.updatedAt)}
              </div>
            </CardContent>
          </Card>
        </div>
      </fieldset>

      {archived && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm text-muted-foreground">
              Archived Campaigns are read-only until restored.
            </p>
            <Button
              disabled={pending}
              onClick={() =>
                restoreCampaign.mutate(
                  { id, data: { expectedVersion: campaign.version } },
                  { onSuccess: synchronize },
                )
              }
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Restore
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
