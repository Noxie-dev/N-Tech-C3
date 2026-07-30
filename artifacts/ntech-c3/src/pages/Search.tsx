import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { globalSearch, useListWorkspaces } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search as SearchIcon, FileSearch, ArrowRight } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  Input,
  Select,
  Spinner,
} from "@/components/shared";
import type { GlobalSearchEntityType } from "@workspace/api-client-react";

export function Search() {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState<GlobalSearchEntityType | "">("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: workspaces = [] } = useListWorkspaces();
  const normalizedQuery = query.trim();
  const {
    data = [],
    isFetching,
    error,
  } = useQuery({
    queryKey: [
      "global-search",
      normalizedQuery,
      entityType,
      workspaceId,
      status,
      from,
      to,
    ],
    queryFn: () =>
      globalSearch({
        q: normalizedQuery,
        limit: 30,
        entityType: entityType || undefined,
        projectId: workspaceId ? Number(workspaceId) : undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: normalizedQuery.length >= 2,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-2xl font-bold">Global Search</h1>
        <p className="text-sm text-muted-foreground">
          Search stories, evidence, knowledge, campaigns, Publications, assets,
          templates, and workspaces.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Select
          aria-label="Entity type"
          value={entityType}
          onChange={(event) =>
            setEntityType(event.target.value as GlobalSearchEntityType | "")
          }
        >
          <option value="">ALL ENTITY TYPES</option>
          {[
            "story",
            "evidence",
            "knowledge",
            "campaign",
            "publication",
            "asset",
            "template",
            "workspace",
          ].map((type) => (
            <option key={type} value={type}>
              {type.toUpperCase()}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Workspace"
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
        >
          <option value="">ALL WORKSPACES</option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          placeholder="Status…"
        />
        <Input
          aria-label="Created from"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <Input
          aria-label="Created to"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search engineering intelligence…"
          className="h-12 bg-card pl-12 font-mono"
          autoFocus
        />
        {isFetching && (
          <Spinner className="absolute right-4 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Search failed. Check the local API and try again.
        </p>
      )}

      {normalizedQuery.length < 2 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          <FileSearch className="mx-auto mb-3 h-8 w-8" />
          <p className="font-mono text-sm">ENTER AT LEAST TWO CHARACTERS</p>
        </div>
      ) : !isFetching && data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          No indexed intelligence matches “{normalizedQuery}”.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((result) => (
            <Link
              key={`${result.entityType}-${result.entityId}`}
              href={result.path}
              className="block"
            >
              <Card className="group transition-colors hover:border-primary/50">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase"
                      >
                        {result.entityType}
                      </Badge>
                      <h2 className="truncate font-semibold">{result.title}</h2>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {result.snippet.replace(/<\/?mark>/g, "")}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
