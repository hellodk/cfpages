---
title: "Building a Robust RAG Pipeline for Fleet Management: Lessons from kri"
date: 2026-05-31
description: "A hands-on deep dive into building a Retrieval-Augmented Generation pipeline for a Mac Mini build fleet: data taxonomy, chunking, hybrid retrieval, live-state integration, pgvector, intent routing, grounding, and evaluation."
tags: [rag, llm, kri]
draft: false
---

kri manages a small fleet of Mac Mini build nodes with SaltStack and Ansible, fronted by a FastAPI + React + PostgreSQL + Celery + Redis stack. It ships an "AI Fleet Assistant" that is, to put it generously, optimistic. This is the story of why a static system prompt is a dead end for fleet ops, and how to replace it with a real Retrieval-Augmented Generation pipeline that cites its sources, knows your node names, and stops greeting "Hi" with "You want to explain code."

## 1\. The Problem

The current assistant builds its entire world view from one line injected into the system prompt:

```bash
Total nodes: 2 | Online: 1 | Offline: 1 | Groups: MacMini-LLM, MacMiniApps
```

That single line is the root of a half-dozen failures:

-   **No node names.** The model knows there are two nodes and that one is offline. It does _not_ know they are called `mm1` and `mm2`, their IPs, or which one is down. So when you ask "which node is offline?" it guesses - and a 3B model guesses confidently.
-   **No RAG.** Everything the model can say is whatever fits in that snapshot. Drift reports, playbook logs, salt state files, last week's alerts - none of it is reachable.
-   **No conversation history.** The React frontend keeps messages in a Zustand store but never sends them back. Every turn is amnesiac.
-   **Hardcoded intent.** The frontend always sends `intent='explain'`. Ask for a status report, get an explanation framing. Say "Hi", and the explain addendum still fires - hence the infamous "You want to explain code" reply to a greeting.
-   **Wrong model.** `mlx-community/Llama-3.2-3B-Instruct-8bit` is a 3B quantized model. It hallucinates hostnames and loses the thread inside a single message.
-   **No tool use.** The bot cannot call a single platform API at runtime. It is a language model bolted to a frozen string.

Fleet assistants are genuinely hard because they sit at the intersection of two data regimes that pull in opposite directions. There is **live state** - is `mm2` online _right now_, is there an active alert - which is volatile and must never be cached. And there is **historical and structural knowledge** - drift history, playbook runs, the contents of a `.sls` file - which is large, slow-changing, and perfect for embedding. The data is also deeply heterogeneous: nodes, groups, Salt states, drift reports, Ansible playbooks, events, and alerts each have their own shape. A pipeline that treats all of it as undifferentiated text will fail at both ends.

## 2\. What RAG Actually Is

Retrieval-Augmented Generation is less mystical than the acronym suggests. You **retrieve** the chunks of your corpus most relevant to the user's question, **augment** the model's context window with those chunks, and let the model **generate** an answer grounded in them rather than in its parametric memory. The model stops being asked "what do you know about Mac Mini fleets in general?" and starts being asked "given _these specific facts about this fleet_, answer the question."

```bash
          user query: "which nodes are offline and why?"
                 |
                 v
       +-------------------+
       | intent classifier |-->  troubleshoot
       +-------------------+
                 |
        +--------+---------+
        v                  v
 +-------------+   +------------------+
 | live state  |   | retrieval        |
 | API call    |   | (BM25 + vectors) |
 | node status |   | events, drift,   |
 | alerts now  |   | playbook logs    |
 +------+------+   +--------+---------+
        |                   |
        +---------+---------+
                  v
        +-------------------+
        | context assembly  |   live snapshot + ranked chunks
        | + citations       |   + conversation summary
        +---------+---------+
                  v
        +-------------------+
        |   LLM (7B-14B)    |-->  grounded, cited answer
        +-------------------+
```

The end-to-end fleet RAG flow: classify, fetch live + retrieve historical, assemble, generate.

The thing people miss: RAG is a _retrieval_ problem first and a _generation_ problem second. If retrieval surfaces the wrong chunks, no model - however large - can save the answer. Most of the engineering effort below is spent making retrieval good.

## 3\. The kri Data Taxonomy

Before you embed anything, you decide what is worth embedding. For kri, the corpus splits into seven source types, each with a different shape and a different update cadence:

| Source type | What it contains | Cadence | Live or embedded? |
| --- | --- | --- | --- |
| node | hostname, IP, status, last_seen, OS, CPU, memory | seconds | Live (status) + embedded (specs) |
| group | group name, membership, purpose | rare | Embedded |
| salt_state | drift reports + executed state results | minutes/hours | Embedded (history) |
| salt_sls | contents of .sls state files | on commit | Embedded |
| playbook_run | Ansible run results, per-task outcome, logs | per run | Embedded |
| playbook_def | playbook/role descriptions, tasks | on commit | Embedded |
| event | alerts and events, last 7 days | seconds | Live (active) + embedded (history) |

Note the two rows marked both Live _and_ embedded. Node status and active alerts are the tip of a volatile spear - you fetch them live - but their _history_ ("mm2 has flapped four times this week") is exactly what embeddings are good at. That dual nature is the central design tension and we come back to it in section 7.

## 4\. Chunking Strategy

The single most common RAG mistake is treating chunking as a tokenizer problem - "split every document into 512-token windows." For fleet data that is actively destructive, because it shreds the structural boundaries that make a chunk _meaningful_.

Anti-pattern

Naive fixed-size chunking on a Salt highstate result will slice a single state declaration across two chunks, so retrieving "did the `pkg.installed` for nginx succeed" returns half the answer and half of an unrelated `file.managed` block. Structure is the signal; don't cut across it.

Chunk along the natural seams of each source type:

-   **Node records, one chunk per node.** A node is small, dense, and self-contained. One node, one chunk, with a stable `source_id` so re-embedding is a point update, not a rebuild.
-   **Salt states, one chunk per top-level state ID,** not per file. A `.sls` with twelve state declarations becomes twelve chunks, each retrievable by its ID (`nginx_pkg`, `salt_minion_conf`). This maps retrieval to how operators actually reason about state.
-   **Playbook runs, one chunk per task + outcome,** not the whole log. "TASK \[install homebrew\] - changed" plus the relevant stderr is a unit. A 4,000-line run log embedded whole is a single useless blob.
-   **Events, rolling 7-day window, grouped by node.** One chunk per node per day summarizing its events keeps temporal locality and bounds the corpus.
-   **Playbook/role defs, one chunk per role,** with name, purpose, and task list.

Every chunk carries metadata: `source_type`, `source_id`, a human-readable `label`, and a `timestamp`. The metadata is what makes citations possible and what lets you scope retrieval ("only `event` chunks for `mm2` from the last 48h").

## 5\. Embedding Model Selection

For a fleet of two nodes you do not need a frontier embedding model. `sentence-transformers/all-MiniLM-L6-v2` (384 dims, runs on CPU, ~80MB) is a sensible baseline - fast, free, and good enough for the semantic slice of hybrid retrieval. It is the right default when you are bootstrapping and want everything local.

You upgrade when two things happen. First, when corpus size or query subtlety outgrows MiniLM's recall - that is the moment for `text-embedding-3-small` (hosted, 1536 dims, strong price/quality) or `nomic-embed-text` (open, 768 dims, runs locally on the exo box). Second, and this is the fleet-specific gotcha, when your corpus is heavy with **command syntax**.

Fleet-specific

General-purpose embeddings treat `salt '*' cmd.run 'systemctl restart salt-minion'` as near-noise - they were trained on prose, not module dotted-paths. A query like "how do I restart the minion service everywhere" may not land near that command in embedding space. This is precisely why you do _not_ rely on dense vectors alone (section 6): BM25 catches the exact token `cmd.run` that embeddings smear out.

Pick one embedding dimension and commit to it in the schema. Mixing 384-dim and 768-dim vectors in one column is not possible; re-embedding the whole corpus to change dimension is a migration, so choose deliberately. The implementation below uses `vector(768)` for `nomic-embed-text`.

## 6\. Hybrid Retrieval

Dense vector search and lexical (BM25) search fail in opposite directions, which is exactly why you run both. BM25 is unbeatable on exact tokens - hostnames (`mm1`), module names (`pkg.installed`, `cmd.run`), IP addresses, error codes. Dense vectors win on semantic intent where the user's words do not match the corpus words: "which nodes are overloaded?" should retrieve a chunk about high memory pressure even though neither says "overloaded."

Merge the two ranked lists with **Reciprocal Rank Fusion**. RRF is delightfully simple and needs no score calibration between the two systems - it works purely on rank position:

```bash
def reciprocal_rank_fusion(bm25_ids, vector_ids, k=60):
    # k=60 is the standard damping constant from the RRF paper
    scores: dict[str, float] = {}
    for ranked in (bm25_ids, vector_ids):
        for rank, chunk_id in enumerate(ranked):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)
```

In Postgres you can run both halves natively: BM25-style ranking via `ts_rank` over a `tsvector` column, and dense search via pgvector's `<=>` cosine-distance operator. Fuse the top ~20 from each, take the top 6-8 fused, and that is your retrieval set.

## 7\. Live State Integration

This is the hardest part of fleet RAG and the part generic RAG tutorials never cover, because document corpora do not go offline two minutes ago.

The rule: **never embed volatile state and serve it as truth.** A re-embed cycle of five minutes means an embedded "mm2: online" chunk can be wrong for up to five minutes - and in ops, "the node is up" when it is actually down is the worst possible failure mode. So split the context into two streams:

-   **Live snapshot** - fetched synchronously per request from the platform API: current node status, last\_seen, and active (unresolved) alerts. This is small, always fresh, and always included.
-   **Retrieved history** - pulled from embeddings: drift trends, past playbook runs, resolved events, state file contents. Slow-changing, large, perfectly cacheable as vectors.

```bash
  request time
  -----------------------------------------------------------
  LIVE   -->  GET /api/nodes        (status, last_seen)   <- never cached
              GET /api/alerts?active                       <- never cached
  RETRIEVE -> fleet_embeddings  (history, drift, sls)      <- 5-min Celery refresh
  -----------------------------------------------------------
  ASSEMBLE -> [LIVE SNAPSHOT]  +  [RANKED HISTORY CHUNKS]  -->  prompt
```

The staleness problem still bites at the edges: a node that went offline 90 seconds ago is "online" in the embeddings but "offline" in the live snapshot. Resolve it by **always letting the live snapshot win** on any field it covers, and by stamping every fact with its source and age so the model - and the user - can see which number is authoritative. That stamping is the bridge to grounding (section 10).

## 8\. Conversation History

Fleet conversations are inherently multi-turn and inherently referential. Consider:

```bash
  user:  which nodes are offline?
  bot:   mm2 is offline (last seen 14m ago).
  user:  restart salt on them          <- "them" = mm2. No history => no referent.
```

Without history, turn two is unanswerable - "them" has no antecedent. The current kri assistant drops history entirely, so every such follow-up dead-ends. The fix is not "send the whole transcript every time"; that blows the context budget and degrades retrieval. Use a **token-efficient hybrid**:

-   A rolling **summary** of all turns older than the last N (one or two sentences, regenerated each turn).
-   The **full text of the last N turns** (N = 3-4 is plenty for fleet ops).
-   An explicit **entity ledger** - the node names, group names, and playbook names mentioned so far - carried as structured metadata so "them" and "that group" resolve deterministically rather than relying on the model to re-derive them.

The entity ledger is the cheap, high-leverage piece. Tracking `{nodes: [mm2], group: null}` across turns gives you reliable coreference for a few dozen tokens, and it doubles as a retrieval filter for the next turn.

## 9\. Intent Classification

Hardcoding `intent='explain'` is the bug that breaks the most things at once, because intent should _route the entire pipeline_. Different intents need radically different retrieval - or none at all:

| Intent | What it needs |
| --- | --- |
| fleet_status | Live API only. No retrieval. "How many nodes are up?" needs the snapshot, not embeddings. |
| salt_state_gen | Retrieve similar .sls files, then generate a new state. |
| playbook_gen | Retrieve similar playbooks/roles, then generate. |
| explain | Retrieve the relevant state/playbook and explain it. |
| troubleshoot | Retrieve recent events + alerts + run logs, then diagnose. The retrieval-heaviest path. |

The greeting bug

Because intent is pinned to `explain`, the "you want me to explain X" addendum is appended unconditionally - even to "Hi". The model dutifully completes "You want to explain code." The fix is a real classifier with a `chitchat`/`greeting` fallthrough that triggers _no_ retrieval and _no_ addendum. A small zero-shot classifier (or even a single LLM call returning a JSON intent label) is enough; the point is that intent must be _derived from the message_, never hardcoded by the frontend.

## 10\. Grounding and Citations

Retrieval gets the right facts into context; grounding makes the model _use them and admit where they came from_. The contract: every factual claim about the fleet must cite the chunk it came from. This is what turns "mm2 is probably down" into something an on-call engineer can trust.

```bash
  Node mm2 is offline (last seen: 14 minutes ago,
  source: fleet_snapshot_2026-05-31). It last ran the
  highstate successfully on 2026-05-29 (source:
  salt_state:mm2:highstate:2026-05-29).
```

Enforce it in the system prompt with three hard rules: (1) answer _only_ from the provided context blocks; (2) every fleet fact must be followed by its `source:` tag; (3) if the context does not contain the answer, say so explicitly rather than inventing one. The third rule is the antidote to the 3B model's confident guessing - "I don't have data on that node's CPU" is a correct answer and must be rewarded, not papered over.

Why citations matter operationally

Citations are not decoration. They make answers _auditable_: when the bot says mm2 is down, you can click through to the exact snapshot and verify. They also expose retrieval failures - an answer with no citations is a red flag that the model fell back to parametric memory, i.e. it is hallucinating.

## 11\. Implementation Sketch for kri

The good news: PostgreSQL is already in the stack, so the vector store is one extension away. No new infrastructure.

### Schema

```bash
-- enable once per database
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE fleet_embeddings (
    chunk_id      TEXT PRIMARY KEY,        -- e.g. "salt_state:mm2:highstate:2026-05-29"
    source_type   TEXT NOT NULL,           -- node | group | salt_state | salt_sls | playbook_run | playbook_def | event
    source_id     TEXT NOT NULL,           -- the entity this chunk describes (e.g. "mm2")
    label         TEXT NOT NULL,           -- human-readable, used in citations
    chunk_text    TEXT NOT NULL,
    embedding     vector(768) NOT NULL,    -- nomic-embed-text dims
    tsv           tsvector GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- dense ANN index (cosine) + lexical index for the BM25 half
CREATE INDEX ON fleet_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON fleet_embeddings USING gin (tsv);
```

### Background re-embedding (Celery)

A periodic task re-embeds only what changed - nodes whose `last_seen` or specs moved, and events from the last 7 days - every five minutes. Point updates by `chunk_id`, never a full rebuild.

```python
from celery import shared_task

@shared_task
def refresh_fleet_embeddings():
    """Re-embed changed nodes + last-7-day events. Runs every 5 min via beat."""
    changed = collect_changed_chunks()        # [(chunk_id, source_type, source_id, label, text), ...]
    if not changed:
        return {"reembedded": 0}
    vectors = embed_model.encode([c.text for c in changed])   # nomic-embed-text, 768-d
    upsert_embeddings(changed, vectors)        # INSERT ... ON CONFLICT (chunk_id) DO UPDATE
    return {"reembedded": len(changed)}
```

### Retrieval + the new `build_fleet_context()`

Retrieval runs the dense and lexical halves, fuses them with RRF, and returns labeled chunks. The rewritten `build_fleet_context()` calls it, prepends the _live_ snapshot, and emits a prompt where every block is source-tagged:

```bash
async def retrieve(conn, query: str, qvec: list[float], top_k: int = 8):
    # dense: pgvector cosine distance (smaller = closer)
    dense = await conn.fetch(
        """SELECT chunk_id FROM fleet_embeddings
              ORDER BY embedding <=> $1 LIMIT 20""", qvec)
    # lexical: ts_rank over the generated tsvector (the BM25-ish half)
    lexical = await conn.fetch(
        """SELECT chunk_id FROM fleet_embeddings
              WHERE tsv @@ plainto_tsquery('english', $1)
              ORDER BY ts_rank(tsv, plainto_tsquery('english', $1)) DESC
              LIMIT 20""", query)

    fused = reciprocal_rank_fusion(
        [r["chunk_id"] for r in lexical],
        [r["chunk_id"] for r in dense],
    )[:top_k]
    return await load_chunks(conn, fused)        # [{label, chunk_text, source_type}, ...]

async def build_fleet_context(conn, query: str, intent: str, history_summary: str):
    parts: list[str] = []

    # 1. LIVE snapshot - always fresh, never from embeddings
    live = await fetch_live_snapshot()   # GET /api/nodes + /api/alerts?active
    parts.append(
        f"[LIVE FLEET SNAPSHOT @ {live.ts}]\n"
        + "\n".join(f"  {n.host} ({n.ip}): {n.status}, last_seen {n.last_seen_human} "
                    f"(source: fleet_snapshot_{live.date})" for n in live.nodes)
    )

    # 2. RETRIEVAL - skip entirely for fleet_status / greetings
    if intent not in ("fleet_status", "chitchat"):
        qvec = embed_model.encode([query])[0].tolist()
        chunks = await retrieve(conn, query, qvec)
        for c in chunks:
            parts.append(f"[{c['source_type'].upper()}: {c['label']}]\n{c['chunk_text']}")

    # 3. conversation continuity
    if history_summary:
        parts.append(f"[CONVERSATION SO FAR]\n{history_summary}")

    return "\n\n".join(parts)
```

That is the whole shape of it: live first, retrieved second, history third, every block labeled so the model can cite it. Compare that to one hardcoded count line.

## 12\. Model Requirements for Fleet RAG

RAG reduces but does not eliminate the model-quality floor. The model still has to follow the grounding contract, resolve coreference across turns, and not invent hostnames. The current `Llama-3.2-3B-8bit` fails all three - 3B quantized models hallucinate node names, drop citations, and lose context inside a single message.

| Option | Notes |
| --- | --- |
| 3B quantized (current) | Unusable. Hallucinates hostnames, ignores citation rules, confuses context. |
| Minimum viable | 7B-14B with a >8k context window so the live snapshot + retrieved chunks + history all fit. |
| Recommended (self-host) | exo cluster running Llama-3.1-8B-Instruct or Qwen2.5-14B. The exo box at 192.0.2.23 already serves this fleet. |
| Recommended (hosted) | Claude Haiku - cost-effective, reliable instruction-following, strong on citation discipline. The pragmatic default when local capacity is tight. |

The context-window requirement is not optional. The whole RAG premise is that you stuff relevant facts into the window; an 8k floor is what lets the live snapshot, six-to-eight retrieved chunks, and three turns of history coexist without truncation.

## 13\. Evaluation

You cannot improve what you do not measure, and "it felt better" is not a metric. Build a small **golden dataset** - 20 Q&A pairs with known-correct answers spanning every intent ("which nodes are offline?", "generate a state to install nginx", "why did the bootstrap playbook fail on mm2?"). Then track four numbers on every change:

-   **Grounding rate** - % of answers that cite at least one source chunk. Target >95%. A dip here means the model is reverting to parametric memory.
-   **Hallucination rate** - % of node/IP/hostname claims that are factually wrong, checked against ground truth. This is the metric that matters most for trust; target it toward zero.
-   **Retrieval precision** - of the chunks retrieved, what fraction are actually relevant to the question. Measured independently of the model, this isolates retrieval bugs from generation bugs.
-   **Answer correctness** - does the final answer match the golden answer. The end-to-end number.

Tip

Run the golden set on every model and embedding-model swap. The 3B-to-8B upgrade and the MiniLM-to-nomic upgrade should each show up as a measurable jump in hallucination rate and retrieval precision respectively. If a change does not move a number, you do not actually know whether it helped.

* * *

## Wrapping Up

The current kri assistant fails not because language models are bad at ops, but because we asked one to reason about a live fleet from a single frozen sentence. A real RAG pipeline fixes that systematically: a deliberate data taxonomy, structure-aware chunking, hybrid retrieval that respects both `cmd.run` and "overloaded," a hard split between live state and embedded history, multi-turn continuity with an entity ledger, intent routing that stops greeting "Hi" with a code lecture, and a grounding contract that makes every claim auditable.

None of it requires new infrastructure - pgvector lives inside the Postgres you already run, the re-embed loop is one Celery beat task, and the exo box can serve an 8B model today. The hard part was never the plumbing. It was deciding to treat the fleet assistant as a retrieval problem with a generation step on the end, rather than a chatbot with a status line taped to its forehead.
