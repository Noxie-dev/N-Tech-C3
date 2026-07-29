import { useCallback, useEffect, useRef, useState } from "react";
import {
  useGetKnowledge,
  useUpdateKnowledge,
  getGetKnowledgeQueryKey,
  useListKnowledgeClaims,
  useListKnowledgeRelationships,
  useListKnowledgeVersions,
  useListKnowledge,
  useListEvidence,
  listEvidenceSources,
  createKnowledgeClaim,
  updateKnowledgeClaim,
  createKnowledgeClaimCitation,
  deleteKnowledgeClaimCitation,
  createKnowledgeRelationship,
  deleteKnowledgeRelationship,
  archiveKnowledge,
  restoreKnowledge,
  transitionKnowledge,
} from "@workspace/api-client-react";
import type { KnowledgeLifecycleStatus } from "@workspace/api-client-react";
import { Card, Button, Input, Select, Textarea } from "@/components/shared";
import {
  Save,
  ArrowLeft,
  Clock,
  Archive,
  RotateCcw,
  Plus,
  Link2,
  ShieldCheck,
  History,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { formatShortDate } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";

export function KnowledgeDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { data: page, isLoading } = useGetKnowledge(id);
  const { data: claims = [] } = useListKnowledgeClaims(id);
  const { data: relationships = [] } = useListKnowledgeRelationships(id);
  const { data: versions = [] } = useListKnowledgeVersions(id);
  const { data: knowledge = [] } = useListKnowledge({
    workspaceId: page?.workspaceId,
  });
  const { data: evidence = [] } = useListEvidence({
    workspaceId: page?.workspaceId,
  });
  const updateKnowledge = useUpdateKnowledge();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [owner, setOwner] = useState("");
  const [content, setContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initVersion = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetKnowledgeQueryKey(id) }),
      queryClient.invalidateQueries({
        queryKey: [`/api/knowledge/${id}/claims`],
      }),
      queryClient.invalidateQueries({
        queryKey: [`/api/knowledge/${id}/relationships`],
      }),
      queryClient.invalidateQueries({
        queryKey: [`/api/knowledge/${id}/versions`],
      }),
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge"] }),
    ]);
  }, [id, queryClient]);

  useEffect(() => {
    if (page && initVersion.current !== page.version) {
      setTitle(page.title);
      setSummary(page.summary || "");
      setOwner(page.owner || "");
      setContent(page.content || "");
      initVersion.current = page.version;
    }
  }, [page]);

  const handleSave = useCallback(() => {
    if (!page || !isDirty) return;
    setError("");
    updateKnowledge.mutate(
      {
        id,
        data: {
          title,
          summary: summary || null,
          owner: owner || null,
          content,
          expectedVersion: page.version,
          changeSummary: "Studio save",
        },
      },
      {
        onSuccess: async (data) => {
          setIsDirty(false);
          queryClient.setQueryData(getGetKnowledgeQueryKey(id), data);
          await refresh();
        },
        onError: () =>
          setError(
            "Save failed because the page changed or is read-only. Reload and review the latest version.",
          ),
      },
    );
  }, [
    content,
    id,
    isDirty,
    owner,
    page,
    queryClient,
    refresh,
    summary,
    title,
    updateKnowledge,
  ]);

  const perform = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await operation();
      await refresh();
    } catch {
      setError(
        "The operation could not be completed. Check lifecycle, ownership, and version requirements.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-8 text-center font-mono text-muted-foreground">
        Loading Knowledge…
      </div>
    );
  if (!page)
    return (
      <div
        role="alert"
        className="p-8 text-center font-mono text-muted-foreground"
      >
        Knowledge page not found.
      </div>
    );
  const archived = page.lifecycleStatus === "Archived";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground">
        <Link
          href="/knowledge"
          className="flex items-center gap-1 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Knowledge
        </Link>
        <span>/</span>
        <span className="truncate text-foreground">{page.title}</span>
        <span className="ml-auto rounded border px-2 py-1 text-[10px]">
          {page.lifecycleStatus} · v{page.version}
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <div className="flex gap-2">
              <Input
                value={title}
                disabled={archived}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setIsDirty(true);
                }}
                className="text-xl font-bold"
              />
              <Button
                onClick={handleSave}
                disabled={archived || !isDirty || updateKnowledge.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateKnowledge.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
            <Input
              value={summary}
              disabled={archived}
              onChange={(event) => {
                setSummary(event.target.value);
                setIsDirty(true);
              }}
              placeholder="Concise reusable summary"
            />
            <Input
              value={owner}
              disabled={archived}
              onChange={(event) => {
                setOwner(event.target.value);
                setIsDirty(true);
              }}
              placeholder="Knowledge owner"
            />
            <div
              className={`min-h-[360px] overflow-hidden rounded border ${archived ? "pointer-events-none opacity-60" : ""}`}
            >
              <RichTextEditor
                value={content}
                onChange={(html) => {
                  if (!archived) {
                    setContent(html);
                    setIsDirty(true);
                  }
                }}
                placeholder="Distill reviewed understanding…"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{content.length} bytes</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatShortDate(page.updatedAt)}
              </span>
            </div>
          </Card>

          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Claims and Evidence citations</h2>
              <span className="text-xs text-muted-foreground">
                {claims.length} claim(s)
              </span>
            </div>
            {!archived && (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formElement = event.currentTarget;
                  const form = new FormData(formElement);
                  const statement = String(form.get("statement") || "").trim();
                  if (statement)
                    void perform(async () => {
                      await createKnowledgeClaim(id, { statement });
                      formElement.reset();
                    });
                }}
              >
                <Input
                  name="statement"
                  required
                  placeholder="Add a discrete, reviewable claim"
                />
                <Button disabled={busy}>
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            )}
            {claims.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No claims yet. Verified Knowledge requires at least one
                human-verified cited claim.
              </p>
            )}
            {claims.map((claim) => (
              <article key={claim.id} className="space-y-3 rounded border p-3">
                <p className="text-sm">{claim.statement}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-muted px-2 py-1">
                    {claim.claimKind}
                  </span>
                  <span className="rounded bg-muted px-2 py-1">
                    {claim.supportStatus}
                  </span>
                  <span className="rounded bg-muted px-2 py-1">
                    {claim.reviewStatus}
                  </span>
                </div>
                {!archived && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void perform(() =>
                          updateKnowledgeClaim(id, claim.id, {
                            expectedVersion: claim.version,
                            supportStatus:
                              claim.citations.length > 1
                                ? "Corroborated"
                                : claim.citations.length
                                  ? "Supported"
                                  : "Unsupported",
                            reviewStatus: "HumanVerified",
                            reviewer: "Local Owner",
                          }),
                        )
                      }
                    >
                      <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      Verify claim
                    </Button>
                    <form
                      className="flex min-w-[280px] flex-1 gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const evidenceId = Number(
                          new FormData(event.currentTarget).get("evidenceId"),
                        );
                        if (!evidenceId) return;
                        void perform(async () => {
                          const sources = await listEvidenceSources(evidenceId);
                          if (!sources[0]) throw new Error("No source");
                          await createKnowledgeClaimCitation(id, claim.id, {
                            evidenceId,
                            sourceId: sources[0].id,
                          });
                        });
                      }}
                    >
                      <Select name="evidenceId" required defaultValue="">
                        <option value="" disabled>
                          Cite Evidence…
                        </option>
                        {evidence.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </Select>
                      <Button size="sm" variant="outline" disabled={busy}>
                        <Link2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                )}
                {claim.citations.map((citation) => (
                  <div
                    key={citation.id}
                    className="flex items-center gap-2 rounded bg-muted/40 p-2 text-xs"
                  >
                    <Link
                      href={`/evidence/${citation.evidenceId}`}
                      className="font-medium text-primary"
                    >
                      {citation.evidenceTitle}
                    </Link>
                    <span>source v{citation.sourceVersion}</span>
                    <span>{citation.integrityStatus}</span>
                    {!archived && (
                      <button
                        className="ml-auto text-destructive"
                        onClick={() =>
                          void perform(() =>
                            deleteKnowledgeClaimCitation(
                              id,
                              claim.id,
                              citation.id,
                            ),
                          )
                        }
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </article>
            ))}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Lifecycle and review</h2>
            <p className="text-xs text-muted-foreground">
              Review: {page.reviewStatus}
              {page.reviewedAt ? ` · ${formatShortDate(page.reviewedAt)}` : ""}
            </p>
            {!archived ? (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    "Idea",
                    "Research",
                    "Draft",
                    "Verified",
                    "Canonical",
                  ] as KnowledgeLifecycleStatus[]
                ).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={
                      status === page.lifecycleStatus ? "secondary" : "outline"
                    }
                    disabled={busy || status === page.lifecycleStatus}
                    onClick={() =>
                      void perform(() =>
                        transitionKnowledge(id, {
                          expectedVersion: page.version,
                          lifecycleStatus: status,
                        }),
                      )
                    }
                  >
                    {status}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void perform(() =>
                      archiveKnowledge(id, { expectedVersion: page.version }),
                    )
                  }
                >
                  <Archive className="mr-1 h-3.5 w-3.5" />
                  Archive
                </Button>
              </div>
            ) : (
              <Button
                disabled={busy}
                onClick={() =>
                  void perform(() =>
                    restoreKnowledge(id, { expectedVersion: page.version }),
                  )
                }
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore Knowledge
              </Button>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="font-semibold">Typed relationships</h2>
            {!archived && (
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const targetKnowledgeId = Number(
                    form.get("targetKnowledgeId"),
                  );
                  const relationshipType = String(
                    form.get("relationshipType"),
                  ) as "RelatedTo";
                  if (targetKnowledgeId)
                    void perform(() =>
                      createKnowledgeRelationship(id, {
                        targetKnowledgeId,
                        relationshipType,
                      }),
                    );
                }}
              >
                <Select name="targetKnowledgeId" required defaultValue="">
                  <option value="" disabled>
                    Link Knowledge…
                  </option>
                  {knowledge
                    .filter((item) => item.id !== id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                </Select>
                <div className="flex gap-2">
                  <Select name="relationshipType">
                    {[
                      "RelatedTo",
                      "DependsOn",
                      "Explains",
                      "Contradicts",
                      "Supersedes",
                      "DerivedFrom",
                    ].map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </Select>
                  <Button disabled={busy}>Link</Button>
                </div>
              </form>
            )}
            {relationships.map((relationship) => (
              <div
                key={`${relationship.direction}-${relationship.id}`}
                className="rounded border p-2 text-xs"
              >
                <div>
                  <span className="font-medium">{relationship.direction}</span>{" "}
                  · {relationship.relationshipType}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {relationship.targetTitle}
                </div>
                {!archived && relationship.direction === "Outbound" && (
                  <button
                    className="mt-1 text-destructive"
                    onClick={() =>
                      void perform(() =>
                        deleteKnowledgeRelationship(id, relationship.id),
                      )
                    }
                  >
                    Unlink
                  </button>
                )}
              </div>
            ))}
            {relationships.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No relationships or backlinks.
              </p>
            )}
          </Card>

          <Card className="space-y-2 p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <History className="h-4 w-4" />
              Versions
            </h2>
            {versions.map((version) => (
              <div key={version.id} className="rounded border p-2 text-xs">
                <strong>v{version.version}</strong> ·{" "}
                {version.changeSummary || "Checkpoint"}
                <div className="text-muted-foreground">
                  {formatShortDate(version.createdAt)}
                </div>
              </div>
            ))}
          </Card>
        </aside>
      </div>
    </div>
  );
}
