---
title: "Agentic AI, MCP & Gateways — Complete Visual Guide"
date: 2026-06-08
description: "Strip away the hype and an AI agent is one simple thing: a language model running in a loop, calling tools, and reading the results until a goal is reached. A chatbot answers once and stops. An agent acts — it decides its own next step based on what just happened in the environment."
tags: [mcp, agents, llm]
draft: false
---

Agents · Tool Use · Model Context Protocol · MCP & Agent Gateways · A2A — every concept explained with animated diagrams

## Agentic Fundamentals

### What "Agentic" Actually Means

Strip away the hype and an **AI agent** is one simple thing: a language model running in a loop, calling tools, and reading the results until a goal is reached. A chatbot answers once and stops. An agent _acts_ — it decides its own next step based on what just happened in the environment.

The agentic loop — reason · act · observe

<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="300" fill="#F8FAFC"></rect>
      <defs>
        <marker id="d1a" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#444ce7"></polygon></marker>
        <marker id="d1g" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#6B7280"></polygon></marker>
      </defs>
      <rect x="40" y="100" width="150" height="90" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="115" y="138" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">User / Task</text>
      <text x="115" y="157" text-anchor="middle" font-size="11.5" fill="#4B5563">Goal In · Answer Out</text>
      <rect x="340" y="60" width="220" height="170" rx="12" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="450" y="90" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">The Agent</text>
      <text x="450" y="108" text-anchor="middle" font-size="11.5" fill="#a4bbfc">LLM + System Prompt + Context</text>
      <rect x="356" y="122" width="188" height="30" rx="6" fill="rgba(68,76,231,.25)" stroke="rgba(99,102,241,.5)" stroke-width="1"></rect>
      <text x="450" y="141" text-anchor="middle" font-size="11.5" fill="#c7d2fe">1 · Reason — Pick Next Action</text>
      <rect x="356" y="158" width="188" height="30" rx="6" fill="rgba(68,76,231,.25)" stroke="rgba(99,102,241,.5)" stroke-width="1"></rect>
      <text x="450" y="177" text-anchor="middle" font-size="11.5" fill="#c7d2fe">2 · Act — Call A Tool</text>
      <rect x="356" y="194" width="188" height="30" rx="6" fill="rgba(68,76,231,.25)" stroke="rgba(99,102,241,.5)" stroke-width="1"></rect>
      <text x="450" y="213" text-anchor="middle" font-size="11.5" fill="#c7d2fe">3 · Observe — Read The Result</text>
      <circle cx="538" cy="80" r="4" fill="#444ce7"></circle>
      <circle cx="538" cy="80" r="4" fill="none" stroke="#444ce7" stroke-width="1.5">
        <animate attributeName="r" values="4;16" dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".8;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="538" cy="80" r="4" fill="none" stroke="#444ce7" stroke-width="1.5">
        <animate attributeName="r" values="4;16" dur="2s" begin="1s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".8;0" dur="2s" begin="1s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="710" y="60" width="150" height="170" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="785" y="88" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Environment</text>
      <rect x="724" y="102" width="122" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="785" y="120" text-anchor="middle" font-size="11.5" fill="#374151">Files / Shell</text>
      <rect x="724" y="138" width="122" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="785" y="156" text-anchor="middle" font-size="11.5" fill="#374151">APIs / Web</text>
      <rect x="724" y="174" width="122" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="785" y="192" text-anchor="middle" font-size="11.5" fill="#374151">MCP Servers</text>
      <line x1="190" y1="125" x2="338" y2="125" stroke="#6B7280" stroke-width="1.5" marker-end="url(#d1g)"></line>
      <text x="265" y="113" text-anchor="middle" font-size="11.5" font-weight="600" fill="#4B5563">Task</text>
      <line x1="340" y1="165" x2="192" y2="165" stroke="#6B7280" stroke-width="1.5" marker-end="url(#d1g)"></line>
      <text x="265" y="186" text-anchor="middle" font-size="11.5" font-weight="600" fill="#4B5563">Final Answer</text>
      <line x1="560" y1="110" x2="708" y2="110" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d1a)"></line>
      <text x="635" y="98" text-anchor="middle" font-size="11.5" font-weight="600" fill="#444ce7">Tool Call</text>
      <line x1="710" y1="185" x2="562" y2="185" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d1a)"></line>
      <text x="635" y="206" text-anchor="middle" font-size="11.5" font-weight="600" fill="#444ce7">Tool Result</text>
      <text x="635" y="152" text-anchor="middle" font-size="11.5" font-weight="600" fill="#444ce7">↻ Loop Until Done</text>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.2s" repeatCount="indefinite" path="M560,110 L708,110"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite" path="M710,185 L562,185"></animateMotion></circle>
      <text x="450" y="272" text-anchor="middle" font-size="12" fill="#4B5563" font-style="italic">An Agent Is A Model Using Tools In A Loop, Working Toward A Goal</text>
    </svg>

## The Building Blocks

🧠

Model

The LLM doing the reasoning. It never executes anything itself — it only emits text and structured tool-call requests. Capability of the model caps capability of the agent.

🔧

Tools

Functions the model may request: read a file, run a shell command, query an API. Each tool is described by a name, a description, and a JSON Schema for its inputs — that description is the model's only manual.

📜

System Prompt

The standing instructions: role, constraints, style, guardrails. In agent products this is where behaviour is engineered.

🪟

Context Window

The model's working memory — everything it can "see" right now: prompt, conversation, tool results. Finite, so long-running agents need compaction and summarisation.

💾

Memory

State that survives beyond the context window — scratchpad files, vector stores, databases. Short-term (this task) vs long-term (across sessions).

⚙️

Agent Runtime / Harness

The non-AI code around the model: runs the loop, executes tool calls, enforces permissions, retries failures, manages context. Claude Code is a harness; the Claude Agent SDK lets you build your own.

## One Loop Iteration, Step By Step

1

Receive The Task

The user goal lands in the context alongside the system prompt and the list of available tool definitions.

2

Model Reasons

The LLM decides: can I answer now, or do I need information / side effects? If the latter, it emits a structured tool-call request (name + JSON arguments).

3

Harness Executes

The runtime — never the model — validates the call, checks permissions, runs the actual function, and captures output or error.

4

Result Goes Back In

The tool result is appended to the context. The model now "observes" what happened — including failures, which it can recover from.

5

Repeat Or Finish

The model loops to step 2 with richer context. When it stops requesting tools, its text response is the final answer. Stop conditions (max turns, budget) bound the loop.

```bash
# the whole idea, in eight lines
messages = [system_prompt, user_task]
while True:
    reply = llm(messages, tools=TOOLS)      # 1 · reason
    if reply.stop_reason != "tool_use":
        return reply.text                # done
    result = execute(reply.tool_call)       # 2 · act
    messages += [reply, result]             # 3 · observe
```

<aside class="callout"><strong class="callout__title">Key insight:</strong><div class="callout__body">the model proposes, the harness disposes. An LLM cannot touch your filesystem or network — every real-world effect goes through tool execution code you control. That separation is exactly where permissions, sandboxing, and (later) gateways attach.</div></aside>

* * *

## Workflows vs Agents

Anthropic's "Building Effective Agents" draws the line that the industry adopted: in a **workflow**, your code decides the path and the LLM fills in steps. In an **agent**, the LLM decides the path. Workflows are predictable and cheap; agents handle open-ended problems. Most production systems are workflows with agentic islands.

## Workflow Patterns — Predefined Paths

⛓️

Prompt Chaining

Fixed sequence of LLM calls, each consuming the previous output. Outline → draft → polish. Add programmatic checks between steps.

🔀

Routing

A classifier call picks which specialised prompt/model handles the input. Cheap queries → small model, hard ones → big model.

⫘

Parallelization

Fan the same input out to several calls and aggregate — independent subtasks (sectioning) or multiple votes on one question.

🎛️

Orchestrator–Workers

A lead LLM decomposes the task at runtime and dispatches worker calls, then synthesises. The number and shape of subtasks is dynamic.

🔁

Evaluator–Optimizer

One call generates, another critiques against criteria, loop until accepted. The pattern behind self-review and judge loops.

## Choosing Between Them

| Dimension | Workflow | Agent |
| --- | --- | --- |
| Path Through The Task | Known upfront, coded by you | Discovered at runtime by the model |
| Predictability | High — same input, same route | Lower — needs eval + guardrails |
| Cost / Latency | Bounded, easy to budget | Open-ended; cap with max turns |
| Debugging | Step-by-step, deterministic | Trace-driven (hence observability) |
| Best For | Pipelines: classify, extract, transform | Open problems: coding, research, ops |

<aside class="callout"><strong class="callout__title">Rule of thumb:</strong><div class="callout__body">find the simplest pattern that works and stop there. Reach for a full agent only when you cannot enumerate the steps in advance.</div></aside>

## Multi-Agent Patterns

### Orchestrator + Subagents

A lead agent plans and delegates to focused subagents, each with its **own clean context window** and a narrow toolset. The subagent returns a summary, not its working — the orchestrator keeps the big picture without drowning in detail.

Context Isolation

### Handoffs

Peer agents transfer the conversation to whichever specialist owns the current need — triage hands to billing, billing hands to refunds. Control moves; there is no permanent boss.

Specialisation

### Parallel Fan-Out

Many agents attack independent slices simultaneously — review dimensions, file migrations, research angles — and a synthesis step merges results. Wall-clock wins, token costs multiply.

Throughput

<aside class="callout"><strong class="callout__title">More agents is not automatically better.</strong><div class="callout__body">Every agent boundary loses context and adds a failure mode. Multi-agent pays off for exactly two reasons: context isolation (a subagent burns its own window, not yours) and parallelism. If neither applies, one agent with good tools beats five with a committee.</div></aside>

## MCP — Model Context Protocol

### MCP — Model Context Protocol

MCP is an **open standard for connecting AI applications to tools and data** — "USB-C for AI". Open-sourced by Anthropic in November 2024, adopted across the industry through 2025, and now governed openly under the Linux Foundation. The wire format is **JSON-RPC 2.0**. Before MCP, every app × every tool meant a custom integration; with MCP, each side implements the protocol once.

The integration problem MCP solves — M × N becomes M + N

<svg viewBox="0 0 900 340" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="340" fill="#F8FAFC"></rect>
      <rect x="20" y="40" width="410" height="270" rx="12" fill="none" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="225" y="64" text-anchor="middle" font-size="12.5" font-weight="600" fill="#4B5563">Without MCP — M × N Custom Integrations</text>
      <rect x="40" y="90" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="95" y="115" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Claude Code</text>
      <rect x="40" y="150" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="95" y="175" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">IDE Agent</text>
      <rect x="40" y="210" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="95" y="235" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Chat App</text>
      <rect x="300" y="90" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="355" y="115" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">GitHub</text>
      <rect x="300" y="150" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="355" y="175" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Postgres</text>
      <rect x="300" y="210" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="355" y="235" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Slack</text>
      <g stroke="#D1D5DB" stroke-width="1.2" fill="none">
        <path d="M150 110 L300 110"></path>
        <path d="M150 110 L200 110 L200 170 L300 170"></path>
        <path d="M150 110 L200 110 L200 230 L300 230"></path>
        <path d="M150 170 L225 170 L225 110 L300 110"></path>
        <path d="M150 170 L300 170"></path>
        <path d="M150 170 L225 170 L225 230 L300 230"></path>
        <path d="M150 230 L250 230 L250 110 L300 110"></path>
        <path d="M150 230 L250 230 L250 170 L300 170"></path>
        <path d="M150 230 L300 230"></path>
      </g>
      <text x="225" y="285" text-anchor="middle" font-size="11.5" font-weight="600" fill="#4B5563">9 Point-To-Point Integrations · Each Maintained Forever</text>
      <rect x="470" y="40" width="410" height="270" rx="12" fill="none" stroke="#444ce7" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="675" y="64" text-anchor="middle" font-size="12.5" font-weight="600" fill="#444ce7">With MCP — M + N</text>
      <rect x="490" y="90" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="545" y="115" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Claude Code</text>
      <rect x="490" y="150" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="545" y="175" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">IDE Agent</text>
      <rect x="490" y="210" width="110" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="545" y="235" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Chat App</text>
      <rect x="645" y="85" width="70" height="190" rx="10" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="680" y="172" text-anchor="middle" font-size="15" font-weight="700" fill="#ffffff">MCP</text>
      <text x="680" y="190" text-anchor="middle" font-size="11" fill="#a4bbfc">JSON-RPC</text>
      <circle cx="680" cy="115" r="4" fill="#7c89f5"></circle>
      <circle cx="680" cy="115" r="4" fill="none" stroke="#7c89f5" stroke-width="1.5">
        <animate attributeName="r" values="4;15" dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".9;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="680" cy="115" r="4" fill="none" stroke="#7c89f5" stroke-width="1.5">
        <animate attributeName="r" values="4;15" dur="2s" begin="1s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".9;0" dur="2s" begin="1s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="745" y="90" width="120" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="805" y="115" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">GitHub MCP</text>
      <rect x="745" y="150" width="120" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="805" y="175" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Postgres MCP</text>
      <rect x="745" y="210" width="120" height="40" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="805" y="235" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Slack MCP</text>
      <g stroke="#444ce7" stroke-width="1.5" fill="none">
        <line x1="600" y1="110" x2="645" y2="110"></line>
        <line x1="600" y1="170" x2="645" y2="170"></line>
        <line x1="600" y1="230" x2="645" y2="230"></line>
        <line x1="715" y1="110" x2="745" y2="110"></line>
        <line x1="715" y1="170" x2="745" y2="170"></line>
        <line x1="715" y1="230" x2="745" y2="230"></line>
      </g>
      <text x="675" y="285" text-anchor="middle" font-size="11.5" font-weight="600" fill="#444ce7">6 Adapters Total — Add An App Or A Tool Exactly Once</text>
    </svg>

MCP architecture — host · clients · servers

<svg viewBox="0 0 900 440" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="440" fill="#F8FAFC"></rect>
      <defs>
        <marker id="d3a" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#444ce7"></polygon></marker>
        <marker id="d3b" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto"><polygon points="8 0,0 3,8 6" fill="#444ce7"></polygon></marker>
      </defs>
      <rect x="30" y="50" width="300" height="340" rx="12" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="180" y="78" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">MCP Host</text>
      <text x="180" y="96" text-anchor="middle" font-size="11.5" fill="#a4bbfc">Claude Code · Desktop · IDE — Owns The Loop</text>
      <circle cx="300" cy="72" r="4" fill="#7c89f5"></circle>
      <circle cx="300" cy="72" r="4" fill="none" stroke="#7c89f5" stroke-width="1.5">
        <animate attributeName="r" values="4;14" dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".9;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="50" y="112" width="260" height="64" rx="8" fill="rgba(68,76,231,.25)" stroke="rgba(99,102,241,.5)" stroke-width="1"></rect>
      <text x="66" y="138" font-size="12.5" font-weight="600" fill="#c7d2fe">MCP Client</text>
      <text x="66" y="156" font-size="11" fill="#818cf8">Dedicated 1:1 Session With One Server</text>
      <rect x="50" y="212" width="260" height="64" rx="8" fill="rgba(68,76,231,.25)" stroke="rgba(99,102,241,.5)" stroke-width="1"></rect>
      <text x="66" y="238" font-size="12.5" font-weight="600" fill="#c7d2fe">MCP Client</text>
      <text x="66" y="256" font-size="11" fill="#818cf8">Capability Negotiation On Connect</text>
      <rect x="50" y="312" width="260" height="64" rx="8" fill="rgba(68,76,231,.25)" stroke="rgba(99,102,241,.5)" stroke-width="1"></rect>
      <text x="66" y="338" font-size="12.5" font-weight="600" fill="#c7d2fe">MCP Client</text>
      <text x="66" y="356" font-size="11" fill="#818cf8">Tools Exposed Into The Agent Loop</text>
      <rect x="620" y="112" width="250" height="64" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="745" y="138" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Filesystem MCP Server</text>
      <text x="745" y="156" text-anchor="middle" font-size="11" fill="#4B5563">Local Process · Reads ~/projects</text>
      <rect x="620" y="212" width="250" height="64" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="745" y="238" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">GitHub MCP Server</text>
      <text x="745" y="256" text-anchor="middle" font-size="11" fill="#4B5563">Remote · Hosted By GitHub</text>
      <rect x="620" y="312" width="250" height="64" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="745" y="338" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Postgres MCP Server</text>
      <text x="745" y="356" text-anchor="middle" font-size="11" fill="#4B5563">Remote · Wraps The Database</text>
      <line x1="330" y1="144" x2="612" y2="144" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d3a)" marker-start="url(#d3b)"></line>
      <rect x="380" y="106" width="190" height="20" rx="10" fill="#e0e9ff"></rect>
      <text x="475" y="120" text-anchor="middle" font-size="11" font-weight="600" fill="#3730a3">stdio · JSON-RPC 2.0</text>
      <line x1="330" y1="244" x2="612" y2="244" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d3a)" marker-start="url(#d3b)"></line>
      <rect x="380" y="206" width="190" height="20" rx="10" fill="#e0e9ff"></rect>
      <text x="475" y="220" text-anchor="middle" font-size="11" font-weight="600" fill="#3730a3">Streamable HTTP · JSON-RPC</text>
      <line x1="330" y1="344" x2="612" y2="344" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d3a)" marker-start="url(#d3b)"></line>
      <rect x="380" y="306" width="190" height="20" rx="10" fill="#e0e9ff"></rect>
      <text x="475" y="320" text-anchor="middle" font-size="11" font-weight="600" fill="#3730a3">Streamable HTTP + OAuth 2.1</text>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.5s" repeatCount="indefinite" path="M330,144 L612,144"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.5s" begin=".8s" repeatCount="indefinite" path="M330,244 L612,244"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.5s" begin="1.6s" repeatCount="indefinite" path="M330,344 L612,344"></animateMotion></circle>
      <text x="450" y="420" text-anchor="middle" font-size="12" fill="#4B5563" font-style="italic">One Host Runs Many Clients — Each Client Pins Exactly One Server</text>
    </svg>

## Server Primitives — What A Server Offers

🔧

Tools Model-Controlled

Executable functions the LLM chooses to invoke — `create_issue`, `query_db`. Discovered via `tools/list`, invoked via `tools/call`. This is the primitive that powers agents.

📄

Resources App-Controlled

Read-only context identified by URI — file contents, schemas, log streams. The host application decides what to attach; the model doesn't fetch these on its own.

💬

Prompts User-Controlled

Reusable prompt templates the server publishes — surfaced to users as slash commands or menu entries.

## Client Primitives — What The Host Offers Back

🔮

Sampling

A server can ask the _host's_ model to complete something — servers get LLM access without shipping their own API key. The host mediates and can require approval.

📁

Roots

The host tells the server which filesystem locations are in scope — a soft boundary for where the server should operate.

❓

Elicitation

Mid-operation, a server can ask the user for structured input ("which environment?") through the host UI. Added in the 2025-06-18 revision.

<aside class="callout"><strong class="callout__title">negotiated at initialize</strong><div class="callout__body">Capabilities are  — each side declares what it supports, and only negotiated features may be used during the session.</div></aside>

## Transports

| Transport | How | Use For |
| --- | --- | --- |
| stdio | Host spawns the server as a child process; JSON-RPC over stdin/stdout | Local servers — filesystem, shell, dev tools |
| Streamable HTTP | Single HTTP endpoint; responses can upgrade to SSE streams; session via `Mcp-Session-Id` | Remote / hosted servers |
| HTTP + SSE | Two-endpoint scheme from the original spec | Deprecated — replaced by Streamable HTTP (2025-03-26) |

```bash
// .mcp.json — one remote, one local
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "~/projects"]
    }
  }
}
```

## Connection Lifecycle

1

Initialize

Client sends `initialize` with its protocol version and capabilities; server replies with its own. Versions are date-stamped (e.g. `2025-06-18`).

2

Ready

Client sends `notifications/initialized`. The session is live.

3

Discover

Client calls `tools/list`, `resources/list`, `prompts/list`. Servers push `list_changed` notifications when offerings change.

4

Operate

The agent loop calls `tools/call` as the model requests; results flow back as content blocks (text, structured JSON, images).

5

Terminate

Transport closes; stdio servers exit with the host.

```bash
// a tool, as the model sees it (tools/list)
{
  "name": "create_issue",
  "description": "Create a GitHub issue",
  "inputSchema": {
    "type": "object",
    "properties": {
      "repo":  { "type": "string" },
      "title": { "type": "string" }
    },
    "required": ["repo", "title"]
  }
}
```

## Spec Evolution — Date-Stamped Revisions

| Revision | What Changed |
| --- | --- |
| 2024-11-05 | Initial release: stdio + HTTP/SSE transports, tools, resources, prompts, sampling |
| 2025-03-26 | Streamable HTTP transport, OAuth 2.1 authorization framework, tool annotations (e.g. read-only hints), audio content |
| 2025-06-18 | Elicitation, structured tool output, servers classified as OAuth resource servers (RFC 8707 resource indicators), JSON-RPC batching removed |
| 2025-11-25 | Tasks — call a tool asynchronously and poll for the result of long-running operations |

Governance moved from Anthropic alone to open stewardship under the Linux Foundation (announced December 2025), alongside an official **MCP Registry** for discovering published servers.

<aside class="callout"><strong class="callout__title">Security reality check:</strong><div class="callout__body">every MCP server you connect is code that feeds text straight into your model's context. That enables <strong>prompt injection</strong> via tool results, <strong>tool poisoning</strong> (malicious instructions hidden in tool descriptions), and <strong>rug pulls</strong> (a server silently changing a tool's behaviour after you approved it). One laptop with three servers is manageable by inspection. Fifty agents and two hundred servers is not — that is the problem the next tab exists to solve.</div></aside>

## Gateways · A2A · Glossary

### Gateways — Running Agents At Scale

One agent on one laptop needs nothing from this tab. The moment an organisation runs **many agents** against **many models, many MCP servers, and each other**, the old microservices lesson repeats: unmanaged point-to-point traffic becomes a security and operations nightmare. A **gateway** is the choke point where identity, policy, and observability attach — the same role the API gateway played for REST, rebuilt for agent traffic.

The enterprise agentic stack — one governed data plane

<svg viewBox="0 0 900 520" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="520" fill="#F8FAFC"></rect>
      <defs>
        <marker id="d4a" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#444ce7"></polygon></marker>
      </defs>
      <rect x="150" y="36" width="600" height="96" rx="12" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
      <text x="450" y="58" text-anchor="middle" font-size="12.5" font-weight="600" fill="#4338CA">Agent Layer</text>
      <rect x="170" y="68" width="160" height="52" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="250" y="89" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Support Agent</text>
      <text x="250" y="106" text-anchor="middle" font-size="11" fill="#4B5563">LLM Loop + Tools</text>
      <rect x="370" y="68" width="160" height="52" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="450" y="89" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Coding Agent</text>
      <text x="450" y="106" text-anchor="middle" font-size="11" fill="#4B5563">Claude Code / SDK</text>
      <rect x="570" y="68" width="160" height="52" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="650" y="89" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Research Agent</text>
      <text x="650" y="106" text-anchor="middle" font-size="11" fill="#4B5563">Web + RAG</text>
      <line x1="250" y1="132" x2="250" y2="186" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d4a)"></line>
      <line x1="450" y1="132" x2="450" y2="186" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d4a)"></line>
      <line x1="650" y1="132" x2="650" y2="186" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d4a)"></line>
      <rect x="150" y="190" width="600" height="80" rx="12" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="450" y="218" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">Agent Gateway</text>
      <text x="450" y="238" text-anchor="middle" font-size="11.5" fill="#a4bbfc">AuthN/Z · Rate Limits · Quotas · Audit · Tracing · Guardrails · Failover</text>
      <text x="450" y="256" text-anchor="middle" font-size="11" fill="#818cf8">One Data Plane For All Agent Traffic</text>
      <circle cx="730" cy="206" r="4" fill="#7c89f5"></circle>
      <circle cx="730" cy="206" r="4" fill="none" stroke="#7c89f5" stroke-width="1.5">
        <animate attributeName="r" values="4;15" dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".9;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="730" cy="206" r="4" fill="none" stroke="#7c89f5" stroke-width="1.5">
        <animate attributeName="r" values="4;15" dur="2s" begin="1s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".9;0" dur="2s" begin="1s" repeatCount="indefinite"></animate>
      </circle>
      <line x1="170" y1="270" x2="170" y2="336" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d4a)"></line>
      <text x="182" y="306" font-size="11.5" font-weight="600" fill="#4B5563">LLM Traffic</text>
      <line x1="450" y1="270" x2="450" y2="336" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d4a)"></line>
      <text x="462" y="306" font-size="11.5" font-weight="600" fill="#4B5563">Tool Traffic — MCP</text>
      <line x1="730" y1="270" x2="730" y2="336" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d4a)"></line>
      <text x="718" y="306" text-anchor="end" font-size="11.5" font-weight="600" fill="#4B5563">Agent Traffic — A2A</text>
      <circle r="4" fill="#444ce7"><animateMotion dur="2s" repeatCount="indefinite" path="M450,132 L450,186"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2s" begin="1s" repeatCount="indefinite" path="M450,270 L450,336"></animateMotion></circle>
      <rect x="60" y="340" width="220" height="120" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="170" y="366" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">LLM Providers</text>
      <rect x="76" y="380" width="188" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="170" y="398" text-anchor="middle" font-size="11.5" fill="#374151">Claude API</text>
      <rect x="76" y="416" width="188" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="170" y="434" text-anchor="middle" font-size="11.5" fill="#374151">Fallback / Other Models</text>
      <rect x="340" y="340" width="220" height="120" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="450" y="366" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">MCP Gateway</text>
      <rect x="356" y="380" width="188" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="450" y="398" text-anchor="middle" font-size="11.5" fill="#374151">Virtual MCP Servers</text>
      <rect x="356" y="416" width="188" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="450" y="434" text-anchor="middle" font-size="11.5" fill="#374151">GitHub · Jira · DB · 100s More</text>
      <rect x="620" y="340" width="220" height="120" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="730" y="366" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Peer Agents</text>
      <rect x="636" y="380" width="188" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="730" y="398" text-anchor="middle" font-size="11.5" fill="#374151">Internal / Partner Agents</text>
      <rect x="636" y="416" width="188" height="28" rx="5" fill="#F3F4F6"></rect>
      <text x="730" y="434" text-anchor="middle" font-size="11.5" fill="#374151">Agent Cards · Tasks</text>
      <text x="450" y="496" text-anchor="middle" font-size="12" fill="#4B5563" font-style="italic">Every Hop An Agent Makes — To A Model, A Tool, Or Another Agent — Passes One Governed Control Point</text>
    </svg>

## Agent Gateway

A data plane purpose-built for agentic traffic. Where an API gateway understands HTTP requests, an agent gateway natively understands the three protocols agents speak:

🧠

Agent → LLM

Provider APIs (Anthropic, OpenAI, …). The gateway can route by model, enforce token budgets, fail over between providers.

🔧

Agent → Tool (MCP)

Proxies and multiplexes MCP sessions, applies per-tool authorization, inspects payloads for policy violations.

🤝

Agent → Agent (A2A)

East–west traffic between agents — identity propagation and audit for delegation chains.

Reference open-source implementation: **agentgateway** (Rust, originated at Solo.io, now a Linux Foundation project, integrated with the Envoy/kgateway ecosystem).

## MCP Gateway

A narrower, very common specialisation: a reverse proxy that sits between MCP clients and a fleet of MCP servers.

1️⃣

Aggregation

Agents configure _one_ endpoint; the gateway federates hundreds of upstream servers behind it.

🎭

Virtual Servers

Compose curated tool subsets per team or per agent — "deploy-bot sees these 6 tools", regardless of what upstreams expose.

🔐

Central Auth + Audit

One OAuth flow at the gateway instead of N credentials scattered across agents; every `tools/call` logged and traced.

🛡️

Policy Enforcement

Tool allow-lists, rate limits, payload scanning — the practical mitigation for tool poisoning and rug pulls from the previous tab.

Examples: Docker MCP Gateway, IBM ContextForge MCP Gateway.

MCP gateway — agents see one server, operators govern hundreds

<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="400" fill="#F8FAFC"></rect>
      <defs>
        <marker id="d5a" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#444ce7"></polygon></marker>
      </defs>
      <rect x="40" y="70" width="170" height="56" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="125" y="93" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Claude Code</text>
      <text x="125" y="111" text-anchor="middle" font-size="11" fill="#4B5563">.mcp.json → One URL</text>
      <rect x="40" y="160" width="170" height="56" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="125" y="183" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Internal Agent</text>
      <text x="125" y="201" text-anchor="middle" font-size="11" fill="#4B5563">Service Identity</text>
      <rect x="40" y="250" width="170" height="56" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="125" y="273" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">CI Pipeline</text>
      <text x="125" y="291" text-anchor="middle" font-size="11" fill="#4B5563">Headless Runs</text>
      <rect x="330" y="50" width="240" height="300" rx="12" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="450" y="78" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">MCP Gateway</text>
      <rect x="346" y="94" width="208" height="34" rx="6" fill="rgba(68,76,231,.22)" stroke="rgba(99,102,241,.45)" stroke-width="1"></rect>
      <text x="450" y="115" text-anchor="middle" font-size="11.5" fill="#c7d2fe">Single MCP Endpoint</text>
      <rect x="346" y="134" width="208" height="34" rx="6" fill="rgba(68,76,231,.22)" stroke="rgba(99,102,241,.45)" stroke-width="1"></rect>
      <text x="450" y="155" text-anchor="middle" font-size="11.5" fill="#c7d2fe">Central OAuth + Identity</text>
      <rect x="346" y="174" width="208" height="34" rx="6" fill="rgba(68,76,231,.22)" stroke="rgba(99,102,241,.45)" stroke-width="1"></rect>
      <text x="450" y="195" text-anchor="middle" font-size="11.5" fill="#c7d2fe">Tool Allow-Lists / Filtering</text>
      <rect x="346" y="214" width="208" height="34" rx="6" fill="rgba(68,76,231,.22)" stroke="rgba(99,102,241,.45)" stroke-width="1"></rect>
      <text x="450" y="235" text-anchor="middle" font-size="11.5" fill="#c7d2fe">Rate Limits + Quotas</text>
      <rect x="346" y="254" width="208" height="34" rx="6" fill="rgba(68,76,231,.22)" stroke="rgba(99,102,241,.45)" stroke-width="1"></rect>
      <text x="450" y="275" text-anchor="middle" font-size="11.5" fill="#c7d2fe">Audit Log + OTEL Tracing</text>
      <rect x="346" y="294" width="208" height="34" rx="6" fill="rgba(68,76,231,.22)" stroke="rgba(99,102,241,.45)" stroke-width="1"></rect>
      <text x="450" y="315" text-anchor="middle" font-size="11.5" fill="#c7d2fe">Virtual Server Composition</text>
      <rect x="700" y="64" width="170" height="50" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="785" y="85" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">GitHub MCP</text>
      <text x="785" y="102" text-anchor="middle" font-size="11" fill="#4B5563">Remote · OAuth</text>
      <rect x="700" y="148" width="170" height="50" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="785" y="169" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Jira MCP</text>
      <text x="785" y="186" text-anchor="middle" font-size="11" fill="#4B5563">Remote · SaaS</text>
      <rect x="700" y="232" width="170" height="50" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="785" y="253" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Postgres MCP</text>
      <text x="785" y="270" text-anchor="middle" font-size="11" fill="#4B5563">Internal Network</text>
      <rect x="700" y="316" width="170" height="50" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="785" y="337" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Internal API MCP</text>
      <text x="785" y="354" text-anchor="middle" font-size="11" fill="#4B5563">Team-Built Server</text>
      <line x1="210" y1="98" x2="322" y2="98" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d5a)"></line>
      <line x1="210" y1="188" x2="322" y2="188" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d5a)"></line>
      <line x1="210" y1="278" x2="322" y2="278" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d5a)"></line>
      <text x="266" y="84" text-anchor="middle" font-size="11" font-weight="600" fill="#444ce7">One URL · One Token</text>
      <line x1="570" y1="89" x2="692" y2="89" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d5a)"></line>
      <line x1="570" y1="173" x2="692" y2="173" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d5a)"></line>
      <line x1="570" y1="257" x2="692" y2="257" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d5a)"></line>
      <line x1="570" y1="341" x2="692" y2="341" stroke="#444ce7" stroke-width="1.5" marker-end="url(#d5a)"></line>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.2s" repeatCount="indefinite" path="M210,188 L322,188"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite" path="M570,173 L692,173"></animateMotion></circle>
      <circle cx="552" cy="64" r="4" fill="#7c89f5"></circle>
      <circle cx="552" cy="64" r="4" fill="none" stroke="#7c89f5" stroke-width="1.5">
        <animate attributeName="r" values="4;14" dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".9;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <text x="450" y="386" text-anchor="middle" font-size="12" fill="#4B5563" font-style="italic">Add Or Revoke An Upstream Server Once — Every Agent Inherits The Change</text>
    </svg>

## The Four Gateways, Side By Side

|  | API Gateway | LLM Gateway | MCP Gateway | Agent Gateway |
| --- | --- | --- | --- | --- |
| Traffic | Clients → REST/gRPC services | Apps/agents → model provider APIs | MCP clients → MCP servers | All of it: LLM + MCP + A2A |
| Speaks | HTTP, gRPC | Anthropic / OpenAI-style APIs | MCP (JSON-RPC over stdio / HTTP) | MCP, A2A, provider APIs |
| Governs | Routes, keys, rate limits | Model choice, cost, caching, fallback | Which tools exist and who may call them | End-to-end agent traffic policy |
| Examples | Traefik, Kong, Envoy | LiteLLM, Portkey, OpenRouter, Envoy AI Gateway | Docker MCP Gateway, IBM ContextForge | agentgateway |

<aside class="callout"><strong class="callout__title">They compose, not compete.</strong><div class="callout__body">A realistic stack runs an agent gateway as the front door, an LLM gateway function for model routing, and an MCP gateway function for tool federation — sometimes three products, increasingly one.</div></aside>

## A2A — Agent2Agent Protocol

Where MCP connects an agent to _tools_, **A2A** connects an agent to _other agents_ — opaque peers that hold their own state and reasoning. Announced by Google in April 2025, donated to the Linux Foundation in June 2025.

1

Discover

Each agent publishes an **Agent Card** — a JSON document at a well-known URL describing identity, skills, endpoint, and auth requirements.

2

Delegate A Task

The client agent sends a task (JSON-RPC over HTTPS). Tasks are the unit of work, with a lifecycle: submitted → working → input-required → completed / failed.

3

Stream Progress

Long tasks stream status updates over SSE or deliver webhooks via push notifications.

4

Collect Artifacts

Results come back as artifacts — text, files, structured data. The remote agent's internals stay private; only the task interface is shared.

## MCP vs A2A — Which Wire When

|  | MCP | A2A |
| --- | --- | --- |
| Connects | Agent ↔ tools & data | Agent ↔ agent |
| Remote Side Is | Deterministic functions you describe with schemas | An autonomous peer with its own reasoning |
| Interaction | Call → result, usually seconds | Task lifecycle, possibly hours, may ask questions back |
| Discovery | Config / registry of servers | Agent Cards at well-known URLs |
| Mental Model | "Plug in a capability" | "Delegate to a colleague" |

<aside class="callout"><div class="callout__body">A useful test: if you can fully describe the remote thing with a JSON Schema, it's a tool — use MCP. If you'd brief it like a coworker, it's an agent — use A2A.</div></aside>

## Glossary — The Rest Of The Vocabulary

| Concept | What It Is |
| --- | --- |
| Function Calling / Tool Use | The model-API feature underneath everything here: the LLM emits a structured request naming a function and JSON arguments; your code executes it |
| ReAct | The 2022 paper pattern (Reason + Act) that became the agent loop: interleave thinking traces with actions and observations |
| Context Engineering | Successor discipline to prompt engineering: curating everything in the window — instructions, tools, retrievals, history — for the current step |
| Compaction | Summarising older conversation turns to reclaim context window space so long-running agents don't run out of memory mid-task |
| Agentic RAG | Retrieval driven by the agent loop — the model decides what to search, reads results, and searches again — instead of one fixed retrieve-then-answer pass |
| Skills | Packaged procedural knowledge (instructions + scripts + resources) an agent loads on demand — teaching workflows without retraining or bloating the system prompt |
| Computer Use | An agent operating a GUI directly — screenshots in, mouse/keyboard actions out — for software that has no API |
| Sandboxing | Executing agent tool calls inside containers/VMs with restricted filesystem and network so a bad action is contained |
| Human-In-The-Loop (HITL) | Approval checkpoints on consequential actions — deploys, payments, deletions — while routine steps run autonomously |
| Guardrails | Input/output validation around the model: schema checks, content filters, policy rules — enforced by code, not by asking nicely |
| Evals | Repeatable test suites for agent behaviour — graded tasks and LLM-as-judge scoring; the agent world's regression tests |
| Agent Observability | Traces of every loop iteration, tool call, and token spent — converging on OpenTelemetry GenAI semantic conventions |
| MCP Registry | The official catalog for discovering published MCP servers (with private sub-registries inside enterprises) |
| Agent Runtime | The managed place agents execute — loop scheduling, state persistence, scaling — e.g. cloud agent platforms or your own harness on k8s |
| Tool Poisoning | Attack: hostile instructions hidden inside a tool's description or output, hijacking the model when they enter context |
| Confused Deputy | Attack: tricking a privileged agent into using *its* authority for the attacker's request — why per-user, per-tool authorization beats one god-token |
| Rug Pull | Attack: an MCP server changes a tool's behaviour after the user approved the original — mitigated by version pinning and gateway policy |

<aside class="callout"><strong class="callout__title">How it all composes:</strong><div class="callout__body">a model becomes an <strong>agent</strong> when a harness runs it in a tool loop · <strong>MCP</strong> standardises how that loop reaches tools and data · <strong>A2A</strong> standardises how agents delegate to each other · and <strong>gateways</strong> put identity, policy, and observability on every one of those wires. Four layers — reasoning, tooling, collaboration, governance.</div></aside>
