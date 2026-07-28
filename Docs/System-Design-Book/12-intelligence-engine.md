# Specification 12 — Engineering Intelligence Engine

Status: **Accepted**
Owner: Intelligence Architecture
Last reviewed: 2026-07-29

## Decision

N-Tech C³ has one Engineering Intelligence Engine with modular capabilities.

```text
Experience → Domains → EIE → Platform Services → Platform Core
```

Domains own truth. Intelligence derives insight.

## Capability contract

```ts
type IntelligenceCapability = {
  id: string;
  version: string;
  consumes: string[];
  analyze(context: AnalysisContext): Promise<AnalysisResult>;
};
```

Results MAY contain derived facts, scores, relationship suggestions,
recommendations, and events. Capabilities are not required to expose irrelevant
empty operations.

## Initial capabilities

- Workspace Health
- Story Health
- Relationship Intelligence
- Evidence Integrity
- Repository Intelligence
- Recommendation Intelligence

Capture, Knowledge, Campaign, Publishing, and Vault capabilities follow when their
domains and specifications require them.

## Result provenance

Every result MUST include:

- capability ID and version;
- deterministic/probabilistic classification;
- subject type and ID;
- input entity version or event watermark;
- calculated time;
- raw components and explanation;
- evidence references;
- confidence when probabilistic;
- invalidation rule.

## Deterministic-first policy

- FTS5/BM25 precedes semantic/vector search.
- Explicit edges, backlinks, degrees, components, and orphan rules precede PageRank,
  HITS, or community detection.
- SHA-256 identity precedes CAS/Merkle restructuring.
- TF-IDF precedes embeddings.
- Rule recommendations precede AI.
- Benchmarks must justify Bloom filters, vector indexes, clustering, or models.

## Health

The EIE provides calculation execution, provenance, caching, and explanation.
Workspace and Story domains own the definitions and blockers of their scores.

## Recommendations

Every recommendation contains:

- reason and rule version;
- evidence/source references;
- priority and optional confidence;
- suggested actions;
- dismiss and snooze state;
- resolution condition.

AI recommendations are optional, probabilistic, and visibly labelled.

## Events and jobs

- Capabilities consume durable domain events.
- Jobs are cancellable and resource-bounded.
- Results are idempotent for the same capability version and input watermark.
- Consumer failure does not roll back the committed domain fact.

## Provider boundaries

Embeddings use an `EmbeddingProvider`. Language generation uses an `AIProvider`.
Neither is required for deterministic Intelligence.

## Plugin boundary

The SDK contract anticipates capability contribution, but runtime support waits for
two real integrations. Capabilities declare permissions, consumed events, result
types, resource budgets, and compatibility.

## Security

- Repository analysis never executes repository code.
- File traversal is bounded and symlink-aware.
- Secrets and unrestricted absolute paths are excluded from event/result payloads.
- Probabilistic providers receive only explicitly authorized content.

## Acceptance evidence

- Capability registry type tests.
- Versioned Workspace/Story Health capability tests.
- Event-driven execution and idempotent replay test.
- Benchmark report with named hardware and dataset.

## Amendment history

- 2026-07-29: Unified EIE accepted; independent intelligence engines rejected.
