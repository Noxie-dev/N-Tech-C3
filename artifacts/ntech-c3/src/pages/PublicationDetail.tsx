import { useEffect, useState } from "react";
import {
  getGetPublicationQueryKey,
  useArchivePublication,
  useGetPublication,
  useListChannels,
  useListPublicationVersions,
  useRestorePublication,
  useTransitionPublication,
  useUpdatePublication,
  type PublicationLifecycleStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  History,
  RotateCcw,
  Save,
  Send,
  Undo2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Spinner,
  Textarea,
} from "@/components/shared";
import { RichTextEditor } from "@/components/RichTextEditor";
import { formatShortDate } from "@/lib/utils";

export function PublicationDetail() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = Number(rawId);
  const queryClient = useQueryClient();
  const { data: publication, isLoading } = useGetPublication(id);
  const { data: versions = [] } = useListPublicationVersions(id);
  const { data: channels = [] } = useListChannels();
  const update = useUpdatePublication();
  const transition = useTransitionPublication();
  const archive = useArchivePublication();
  const restore = useRestorePublication();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [loadedVersion, setLoadedVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (publication && publication.version !== loadedVersion) {
      setTitle(publication.title);
      setSummary(publication.summary ?? "");
      setContent(publication.content ?? "");
      setLoadedVersion(publication.version);
      setDirty(false);
    }
  }, [loadedVersion, publication]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: getGetPublicationQueryKey(id),
      }),
      queryClient.invalidateQueries({ queryKey: ["/api/publications"] }),
      queryClient.invalidateQueries({
        queryKey: [`/api/publications/${id}/versions`],
      }),
    ]);
  };

  const execute = (
    action: (callbacks: { onSuccess: () => void; onError: () => void }) => void,
  ) => {
    setError("");
    action({
      onSuccess: () => void refresh(),
      onError: () =>
        setError(
          "The Publication changed or this action is not allowed. Reload and review the current lifecycle.",
        ),
    });
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  if (!publication)
    return (
      <p role="alert" className="p-8 text-center">
        Publication not found.
      </p>
    );

  const archived = publication.lifecycleStatus === "Archived";
  const approved = publication.lifecycleStatus === "Approved";
  const editable = !archived && !approved;
  const pending =
    update.isPending ||
    transition.isPending ||
    archive.isPending ||
    restore.isPending;

  const lifecycleAction = (lifecycleStatus: PublicationLifecycleStatus) =>
    execute((callbacks) =>
      transition.mutate(
        {
          id,
          data: {
            expectedVersion: publication.version,
            lifecycleStatus,
            changeSummary: `Studio transition to ${lifecycleStatus}`,
          },
        },
        callbacks,
      ),
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <Link
          href="/publications"
          className="flex items-center gap-1 font-mono text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Publications
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="min-w-0 flex-1 truncate font-mono text-sm">
          {publication.title}
        </span>
        <Badge
          variant={approved ? "success" : archived ? "destructive" : "outline"}
        >
          {publication.lifecycleStatus} · v{publication.version}
        </Badge>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <Input
                aria-label="Publication title"
                value={title}
                disabled={!editable}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setDirty(true);
                }}
                className="h-11 text-lg font-semibold"
              />
              <Textarea
                aria-label="Publication summary"
                value={summary}
                disabled={!editable}
                onChange={(event) => {
                  setSummary(event.target.value);
                  setDirty(true);
                }}
                placeholder="Editorial intent and scope…"
              />
              <RichTextEditor
                value={content}
                disabled={!editable}
                onChange={(value) => {
                  setContent(value);
                  setDirty(true);
                }}
                ariaLabel="Publication content"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="font-mono text-[10px] text-muted-foreground">
                  {editable
                    ? dirty
                      ? "UNSAVED EDITORIAL CHANGES"
                      : "CHECKPOINT SYNCHRONIZED"
                    : approved
                      ? "APPROVED — RETURN TO DRAFT TO EDIT"
                      : "ARCHIVED — READ ONLY"}
                </p>
                <Button
                  disabled={!dirty || !editable || pending || !title.trim()}
                  onClick={() =>
                    execute((callbacks) =>
                      update.mutate(
                        {
                          id,
                          data: {
                            expectedVersion: publication.version,
                            title: title.trim(),
                            summary: summary || null,
                            content,
                            changeSummary: "Publication Studio save",
                          },
                        },
                        callbacks,
                      ),
                    )
                  }
                >
                  <Save className="mr-2 h-4 w-4" /> Save checkpoint
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider">
                Provenance
              </h2>
              <Link
                href={`/stories/${publication.primaryStoryId}`}
                className="flex items-center gap-2 rounded border p-3 text-sm hover:border-primary/60 hover:text-primary"
              >
                <BookOpen className="h-4 w-4" />
                <span className="truncate">
                  {publication.primaryStoryTitle}
                </span>
              </Link>
              <p className="text-xs text-muted-foreground">
                Workspace #{publication.workspaceId} · Created by{" "}
                {publication.createdBy}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider">
                Lifecycle
              </h2>
              {publication.lifecycleStatus === "Draft" && (
                <Button
                  className="w-full"
                  disabled={pending || dirty}
                  onClick={() => lifecycleAction("InReview")}
                >
                  <Send className="mr-2 h-4 w-4" /> Send to review
                </Button>
              )}
              {publication.lifecycleStatus === "InReview" && (
                <>
                  <Button
                    className="w-full"
                    disabled={pending || dirty}
                    onClick={() => lifecycleAction("Approved")}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={pending || dirty}
                    onClick={() => lifecycleAction("Draft")}
                  >
                    <Undo2 className="mr-2 h-4 w-4" /> Return to Draft
                  </Button>
                </>
              )}
              {approved && (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={pending}
                  onClick={() => lifecycleAction("Draft")}
                >
                  <Undo2 className="mr-2 h-4 w-4" /> Reopen Draft
                </Button>
              )}
              {archived ? (
                <Button
                  className="w-full"
                  disabled={pending}
                  onClick={() =>
                    execute((callbacks) =>
                      restore.mutate(
                        { id, data: { expectedVersion: publication.version } },
                        callbacks,
                      ),
                    )
                  }
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Restore
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="destructive"
                  disabled={pending || dirty}
                  onClick={() => {
                    if (!window.confirm("Archive this Publication?")) return;
                    execute((callbacks) =>
                      archive.mutate(
                        {
                          id,
                          data: {
                            expectedVersion: publication.version,
                            reason: "Archived from Publication Studio",
                          },
                        },
                        callbacks,
                      ),
                    );
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider">
                <History className="h-4 w-4" /> Checkpoints
              </h2>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {versions.map((version) => (
                  <div key={version.id} className="rounded border p-2 text-xs">
                    <div className="flex justify-between font-mono">
                      <span>
                        v{version.version} · {version.lifecycleStatus}
                      </span>
                      <span className="text-muted-foreground">
                        {formatShortDate(version.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {version.changeSummary}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider">
                Defined Channels
              </h2>
              <div className="flex flex-wrap gap-2">
                {channels.map((channel) => (
                  <Badge key={channel.id} variant="outline">
                    {channel.name}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Definitions only. Connections and delivery remain disabled.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
