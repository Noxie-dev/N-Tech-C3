import { useState } from "react";
import {
  useCreatePublication,
  useListPublications,
  useListStories,
  useListWorkspaces,
  type PublicationLifecycleStatus,
} from "@workspace/api-client-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  Spinner,
} from "@/components/shared";
import { BookOpenCheck, FileStack, Plus, Search, Workflow } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatShortDate } from "@/lib/utils";

export function Publications() {
  const [search, setSearch] = useState("");
  const [workspaceId, setWorkspaceId] = useState<number | undefined>();
  const [status, setStatus] = useState<PublicationLifecycleStatus | "">("");
  const [createWorkspaceId, setCreateWorkspaceId] = useState<
    number | undefined
  >();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { data: workspaces = [] } = useListWorkspaces();
  const { data: stories = [] } = useListStories({
    workspaceId: createWorkspaceId,
  });
  const {
    data: publications = [],
    isLoading,
    error,
  } = useListPublications({
    workspaceId,
    lifecycleStatus: status || undefined,
    search: search || undefined,
  });
  const createPublication = useCreatePublication();

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const primaryStoryId = Number(form.get("primaryStoryId"));
    if (!title || !createWorkspaceId || !primaryStoryId) return;
    createPublication.mutate(
      {
        data: {
          workspaceId: createWorkspaceId,
          primaryStoryId,
          title,
          summary: String(form.get("summary") ?? "").trim() || undefined,
        },
      },
      {
        onSuccess: (publication) => {
          setOpen(false);
          navigate(`/publications/${publication.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
            <FileStack className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-bold">
              Publication Library
            </h1>
            <p className="text-sm text-muted-foreground">
              Channel-neutral, Story-backed editorial records.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-mono text-xs uppercase tracking-wider">
              <Plus className="h-4 w-4" /> New Publication
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono">
                Create Publication
              </DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Workspace
                <Select
                  required
                  value={createWorkspaceId ?? ""}
                  onChange={(event) =>
                    setCreateWorkspaceId(
                      Number(event.target.value) || undefined,
                    )
                  }
                >
                  <option value="">Select a Workspace</option>
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Primary Story
                <Select
                  name="primaryStoryId"
                  required
                  disabled={!createWorkspaceId}
                >
                  <option value="">Select provenance</option>
                  {stories.map((story) => (
                    <option key={story.id} value={story.id}>
                      {story.title}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Title
                <Input name="title" required autoFocus />
              </label>
              <label className="block space-y-2 text-xs font-mono uppercase text-muted-foreground">
                Editorial summary
                <Input name="summary" />
              </label>
              {createPublication.error && (
                <p role="alert" className="text-sm text-destructive">
                  Creation failed. Confirm the Story and Workspace are active
                  and aligned.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createPublication.isPending}>
                  {createPublication.isPending ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_190px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Publications…"
            className="pl-9 font-mono"
          />
        </div>
        <Select
          aria-label="Workspace filter"
          value={workspaceId ?? ""}
          onChange={(event) =>
            setWorkspaceId(Number(event.target.value) || undefined)
          }
        >
          <option value="">All Workspaces</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Lifecycle filter"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as PublicationLifecycleStatus | "")
          }
        >
          <option value="">Active Publications</option>
          {["Draft", "InReview", "Approved", "Archived"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded border border-destructive/30 p-4 text-sm text-destructive"
        >
          Publication catalogue unavailable.
        </p>
      ) : isLoading ? (
        <div className="flex justify-center p-12">
          <Spinner />
        </div>
      ) : publications.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <FileStack className="mx-auto mb-3 h-8 w-8" />
          <p className="font-mono text-sm">NO PUBLICATIONS FOUND</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="divide-y divide-border/60">
            {publications.map((publication) => (
              <Link
                key={publication.id}
                href={`/publications/${publication.id}`}
                className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/40"
              >
                <BookOpenCheck className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-medium group-hover:text-primary">
                    {publication.title}
                  </h2>
                  <p className="truncate text-xs text-muted-foreground">
                    Story: {publication.primaryStoryTitle}
                  </p>
                </div>
                <Badge
                  variant={
                    publication.lifecycleStatus === "Approved"
                      ? "success"
                      : "outline"
                  }
                >
                  {publication.lifecycleStatus}
                </Badge>
                <div className="hidden text-right font-mono text-[10px] text-muted-foreground sm:block">
                  <p>v{publication.version}</p>
                  <p>{formatShortDate(publication.updatedAt)}</p>
                </div>
                <Workflow className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
