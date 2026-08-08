---
title: "920 Nodes in Your Editor: graphify + Obsidian as a Living Codebase Map"
date: 2026-05-28
description: "How graphify turns a Python codebase into a queryable knowledge graph, and how the --obsidian flag exports it as a living Obsidian vault — annotatable, navigable, and persistent across sessions."
tags: [graphify, obsidian, knowledge-graph]
draft: false
---

🕸️ Knowledge Graph

graphify ran on the kri fleet platform and produced a 920-node, 2767-edge knowledge graph of 122 Python files across 51 architectural communities. The HTML snapshot is interactive but frozen. The Obsidian vault is editable, annotatable, and grows with your understanding. Here's how both work, when to use each, and the practical workflow for a production codebase.

TL;DR

-   **graphify .** → `graph.html` (interactive snapshot) + `graph.json` (queryable via CLI)
-   **graphify . --obsidian** → a Markdown vault with one note per community, wikilinks for every edge
-   **Obsidian Graph View** renders those wikilinks as a force-directed graph — but unlike the HTML, you can annotate, tag, and add your own links and they persist
-   **Use `graphify query`** for extracting context into subagent prompts — it's fast, programmatic, and returns focused answers
-   **Use Obsidian** for exploration and annotation — navigating communities, finding what calls what, adding architectural notes over time
-   **Caveat:** the kri graph covers Python only — TypeScript/TSX frontend files are not indexed. Rebuild with `--include "**/*.ts" "**/*.tsx"` to include the frontend

Nodes

920

classes, functions, modules

Communities

51

48 shown, 3 thin omitted

Edges

2,767

69% extracted, 31% inferred

God node #1

131

Node — 131 edges

## 1 The knowledge graph — live

This is the actual graphify output for the kri codebase. Each colour is a community. Node size scales with degree. The dense centre is dominated by the 10 god nodes. Drag to pan, scroll to zoom, click any node to highlight its connections.

kri · graphify-out/graph.html · 920 nodes · 2767 edges [Open full screen ↗](graph.html)

**Reading the graph:** zoom into the dense centre to see god nodes. Pan to the periphery to find isolated communities (_Prometheus Metrics_, _Package Init_) with 0 edges — loaded but not directly referenced. Each colour cluster is a community of files that call each other.

## 2 God nodes — the 10 core abstractions

These are the nodes with the most edges — the abstractions everything else depends on. Change any of them and you touch a large fraction of the codebase.

1

Node

131 edges

2

HTTPException

73 edges

3

PaginatedResponse

58 edges

4

Base

56 edges

5

GroupMember

45 edges

6

Group

38 edges

7

PlatformSetting

37 edges

8

NodeFact

35 edges

9

AsyncSession

35 edges

10

Tag

30 edges

`Node` at 131 edges is expected — every subsystem tracks fleet nodes. The surprise is `PlatformSetting` at 37 edges: almost every service reads platform config, making it a silent dependency that's easy to miss when reading individual files.

## 3 Querying the graph

Once `graphify-out/graph.json` exists, query it with natural language. The result is a focused BFS/DFS traversal — the answer you'd get from reading 5 files in one compact output.

bashshell

```bash
# Understand a subsystem before briefing a subagent
graphify query "how does WebSSH credential resolution work"
graphify query "which files import SBOMScan"
graphify query "what calls get_connection in webssh"

# Explain a specific node
graphify explain "PlatformSetting"

# Find the shortest path between two concepts
graphify path "Node" "SBOMScan"
```

**When queries return low-signal results:** the graph may not cover the files you're asking about. The kri graph covers Python backend files only — queries about TypeScript/React components return nothing useful. Rebuild with `graphify . --include "**/*.ts" "**/*.tsx"` to add the frontend.

## 4 What Obsidian does with graphify

Run `graphify . --obsidian` and the tool exports the entire graph as a vault of Markdown files — one `.md` per community, plus a master `index.md`. Every edge becomes a `[[wikilink]]` inside that note.

bashshell

```bash
# Export to the default vault location
graphify . --obsidian

# Export to an existing Obsidian vault
graphify . --obsidian --obsidian-dir ~/vaults/kri
```

A generated community note looks like this:

\_COMMUNITY\_SBOM & Security Scanning.md (generated)markdown

```bash
# SBOM & Security Scanning

## Nodes
- [[SBOMScan]] — TimescaleDB hypertable, scanned_at is partition key
- [[SBOMComponent]] — purl is the dedup key across scans
- [[VulnerabilityFinding]] — CVE severity + affected package
- [[scan_node_security()]] — Celery task, triggers Trivy via Salt

## Edges
- [[SBOMComponent]] --belongs_to--> [[SBOMScan]]
- [[scan_node_security()]] --calls--> [[SBOMScan]]
- [[sbom.py]] --imports--> [[SBOMComponent]]
```

Open that folder in Obsidian and two things happen immediately:

Graph View

All `[[wikilinks]]` render as an interactive force-directed graph — same visual structure as graphify's HTML but persistent. Navigate by clicking nodes. Filter by tags. Zoom in/out. The graph updates instantly as you add or remove links in your notes.

Editable notes

Unlike graphify's read-only HTML, Obsidian notes are writable. Annotate communities: _"this module is being refactored"_, _"don't change — load-bearing"_. Tag notes with status. Add your own links. Changes persist across sessions and enrich the graph over time.

Backlinks panel

Open any community note and Obsidian shows every note that links to it. This is the reverse of graphify's edge list: instead of "what does SBOM call?", you see "what calls SBOM?" — both views in one sidebar.

## 5 graph.html vs Obsidian vault — when to use each

### 📄 graph.html (+ graphify query)

-   Snapshot of the codebase at build time
-   Read-only — explore but cannot annotate
-   Fast CLI queries: `graphify query "..."`
-   Best for: extracting context into subagent prompts
-   Best for: quick "what calls X?" lookups
-   Best for: sharing a read-only graph with the team
-   Stays accurate as long as you don't merge major changes

### 🔮 Obsidian vault (--obsidian)

-   Living document — annotate as you work
-   Wikilinks become Obsidian Graph View nodes
-   Add your own links, tags, and architectural notes
-   Best for: deep exploration of an unfamiliar subsystem
-   Best for: tracking what's in-progress or off-limits
-   Best for: onboarding new engineers to the codebase
-   Rebuild with `graphify . --obsidian --update` after big merges

**The key difference:** graphify's HTML is a point-in-time snapshot. Obsidian's graph is a living workspace — your knowledge grows on top of the AST-extracted structure. The HTML tells you what the code does; the vault remembers what _you_ know about it.

## 6 Practical workflow for kri

1.  After a major feature merge: `graphify . --obsidian --update` to refresh the vault
2.  Before starting a new feature: `graphify query "what handles <subsystem>"` to find the relevant files
3.  Open Obsidian → Graph View → pin the god nodes as anchors (`Node`, `PlatformSetting`, `AsyncSession`)
4.  Annotate the community note for the subsystem you're working in: status, gotchas, who owns it
5.  Use backlinks to find all callers before changing a model or schema
6.  Before dispatching a subagent: run `graphify query`, paste the result into the brief — replaces multi-file reads

**Rebuild the graph to include TypeScript:** the current kri graph covers Python only. To get frontend coverage: `graphify . --include "**/*.ts" "**/*.tsx" --update` This will add the React pages, API clients, and store files to the graph — making `graphify query` useful for frontend tasks too.

| Tool | Use for | Command |
| --- | --- | --- |
| graphify query | Subagent briefs, quick lookups | graphify query "..." |
| graphify explain | Deep dive on one symbol | graphify explain "PlatformSetting" |
| graphify path | Trace dependency chains | graphify path "Node" "SBOMScan" |
| Obsidian Graph View | Exploration, onboarding | Open vault → Cmd+G |
| Obsidian Backlinks | Find all callers of X | Open note → Backlinks panel |
