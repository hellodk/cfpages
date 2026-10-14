---
title: "6 — The Feedback Loop: Every Chat Completion Gets Scored"
date: 2026-08-08
description: "Traces are just records until someone says whether the answer was any good. This week the proxy logs heuristic scores in-band for every completion, and a small judge process uses the MLX cluster itself — via the same proxy — to rate the answers. Five scores per trace, visible in the Opik UI."
tags: [opik, llm]
draft: false
---

Post 6 of 19 · Online evaluation

Traces are just records until someone says whether the answer was any good. This week the proxy logs heuristic scores in-band for every completion, and a small judge process uses the MLX cluster itself — via the same proxy — to rate the answers. Five scores per trace, visible in the Opik UI.

<svg viewBox="0 0 840 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Feedback loop: proxy logs heuristic scores, evaluator judges via the cluster and writes scores back">
      <defs>
        <linearGradient id="c1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#e6f6f4"></stop><stop offset="1" stop-color="#c7e9e4"></stop>
        </linearGradient>
        <linearGradient id="c2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f1e9fe"></stop><stop offset="1" stop-color="#ddd0f7"></stop>
        </linearGradient>
        <linearGradient id="c3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fde8f1"></stop><stop offset="1" stop-color="#fbcfe8"></stop>
        </linearGradient>
      </defs>
      <g transform="translate(24,75)">
        <rect x="0" y="0" width="130" height="80" rx="12" fill="url(#c3)" opacity=".75"></rect>
        <text x="65" y="28" text-anchor="middle" font-size="11" font-weight="800" fill="#be185d">curl / opencode</text>
        <text x="65" y="52" text-anchor="middle" font-size="9.5" font-weight="700" fill="#be185d">/v1/chat/completions</text>
      </g>
      <g transform="translate(190,20)">
        <rect x="0" y="0" width="150" height="190" rx="12" fill="url(#c2)" opacity=".7"></rect>
        <text x="75" y="22" text-anchor="middle" font-size="11" font-weight="800" fill="#6d28d9">mlx_metrics_proxy</text>
        <text x="75" y="44" text-anchor="middle" font-size="9" font-weight="600" fill="#6d28d9">:8080 &rarr; mlx_lm.server</text>
        <rect x="10" y="62" width="130" height="28" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="75" y="80" text-anchor="middle" font-size="9" font-weight="800" fill="#6d28d9">log heuristic scores</text>
        <rect x="10" y="98" width="130" height="28" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="75" y="116" text-anchor="middle" font-size="9" font-weight="800" fill="#6d28d9">X-Mlx-Trace: 0 honored</text>
      </g>
      <g transform="translate(560,20)">
        <rect x="0" y="0" width="240" height="180" rx="12" fill="url(#c1)" opacity=".8"></rect>
        <text x="120" y="22" text-anchor="middle" font-size="11" font-weight="800" fill="#0f766e">Opik (self-hosted)</text>
        <text x="120" y="44" text-anchor="middle" font-size="9" font-weight="600" fill="#0f766e">traces + feedback scores</text>
        <rect x="10" y="80" width="220" height="28" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="120" y="98" text-anchor="middle" font-size="9" font-weight="800" fill="#0f766e">PUT /traces/feedback-scores</text>
        <text x="120" y="148" text-anchor="middle" font-size="9" font-weight="600" fill="#0f766e">:32173 NodePort &middot; project "mlx"</text>
      </g>
      <g transform="translate(60,260)">
        <rect x="0" y="0" width="220" height="90" rx="12" fill="url(#c2)" opacity=".6"></rect>
        <text x="110" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#6d28d9">opik_evaluator.py</text>
        <text x="110" y="46" text-anchor="middle" font-size="9" font-weight="600" fill="#6d28d9">polls traces &middot; builds judge prompt</text>
        <text x="110" y="66" text-anchor="middle" font-size="9" font-weight="600" fill="#6d28d9">parses {"correctness": ...} &middot; temp 0.0</text>
      </g>
      <line x1="160" y1="115" x2="184" y2="115" stroke="#7c3aed" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="344" y1="96" x2="554" y2="96" stroke="#7c3aed" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <text x="450" y="80" text-anchor="middle" font-size="9" font-weight="700" fill="#7c3aed">scores in-band</text>
      <line x1="344" y1="132" x2="554" y2="132" stroke="#b45309" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <text x="450" y="116" text-anchor="middle" font-size="9" font-weight="700" fill="#b45309">PUT scores</text>
      <path d="M640 200 L640 260 L280 260" fill="none" stroke="#0f766e" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </path>
      <text x="652" y="230" font-size="9" font-weight="700" fill="#0f766e">GET traces (pending)</text>
      <line x1="250" y1="260" x2="250" y2="210" stroke="#6d28d9" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <text x="258" y="235" font-size="9" font-weight="700" fill="#6d28d9">judge via proxy</text>
    </svg>

Fig 1. Two score writers, one Opik. The proxy logs heuristic scores in-band as every request finishes; the evaluator reads traces, asks the cluster to rate the answer, and writes judge scores back. Both flows land on the same trace.

## 1 Why traces need scores

Post 5 gave every chat completion a trace: input, output, tokens, TTFT, hallucination risk. That tells you _what happened_. It does not tell you _whether it was any good_ — and a 1.7B model on a Mac mini can be confidently wrong. The K2 question is the running example: asked "What is the tallest mountain on Earth?", Qwen3-1.7B answers **K2**, complete with confident, contradictory details (it calls K2 both the "highest" and "second highest", and names Everest's height as K2's). A trace with no score lets that slip past; a trace with a `correctness: 0.9` badge and a `hallucination_flagged` warning makes it visible in one glance.

Opik's model for this is **feedback scores**: named, 0–1 values attached to a trace (or span) with a category and a reason. They render as chips on the trace detail page, as extra columns in the log table, and aggregate to averages. The only question is who writes them.

## 2 Writer 1: heuristic scores, in-band from the proxy

The proxy already computes a hallucination `risk` and a `flagged` boolean for every response (repetition, refusal and hedging/ungrounded-signal heuristics, alert-rule quality inherited from the audit). Posting those as feedback scores is three lines, in the same success handler that ends the trace:

```bash
opik_trace.log_feedback_score(
    name="hallucination_quality",
    value=round(1.0 - risk, 3),
    category_name="quality",
    reason="proxy heuristic (repetition/refusal/hedging/"
           "ungrounded signals), higher is better",
)
opik_trace.log_feedback_score(
    name="hallucination_flagged",
    value=0.0 if flagged else 1.0,
    category_name="safety",
    reason="1.0 == proxy heuristics did NOT flag the output "
           "for hallucination risk",
)
```

Note the polarity flip: feedback scores mean "higher is better", so we store `1 - risk` and invert `flagged`. These two land for every completion — even tool-call replies with no text — because they are computed from the proxy's own signal, not from the model output.

## 3 Writer 2: an LLM-as-judge that runs on the cluster itself

Heuristics catch shape, not substance. For substance we let the cluster grade its own homework. `cluster/opik_evaluator.py` runs on the Mac and, every pass:

1.  `GET /api/v1/private/traces?project_name=mlx` to list recent traces;
2.  skips traces that already carry all three judge scores (`correctness`, `helpfulness`, `hallucination_free`);
3.  builds a prompt with the user's question and the assistant's answer, and calls the live proxy (`/v1/chat/completions`, model Qwen3-1.7B-4bit, temperature 0.0);
4.  parses the reply's JSON and writes the three scores with one batched `PUT /api/v1/private/traces/feedback-scores`.

**The judge prompt.** Ask a 1.7B model for a verdict, and you get prose. We pin it to a strict contract and give it a worked example:

```bash
You are an evaluator. Score the assistant's answer to the user's
question using three numbers between 0 and 1.

Question: {question}

Assistant answer: {answer}

Return ONLY a JSON object with exactly these keys:
- "correctness": how factually correct and complete the answer is
- "helpfulness": how well the answer addresses the request
- "hallucination_free": 1.0 if the answer is fully grounded in the
  question and invents nothing, 0.0 if it fabricates
Example: {"correctness": 0.9, "helpfulness": 0.8, "hallucination_free": 1.0}
```

The evaluator extracts the `{"..."}` object from the reply (regex from first `{` to last `}`), clamps each value to \[0,1\], and writes it.

Real run, against the K2 trace and a fresh haiku:

```bash
$ .venv/bin/python cluster/opik_evaluator.py --once --limit 20
[evaluator] 18 traces, 1 pending judge scores
[evaluator] scored 019fc8f0-d92 -> {"correctness": 0.9, "helpfulness": 0.8, "hallucination_free": 1.0}
[evaluator] wrote 3 feedback scores
```

The loop is fully self-contained: no external API, no GPU cloud — the judge is the same Qwen3-1.7B-4bit the cluster serves, reaching it through the same proxy that traced it.

## 4 The judge must not trace itself

First run, and every pass kept finding new pending traces. Cause: each judge call is a `POST /v1/chat/completions` through the proxy — so the proxy traced the judge, then the evaluator rated its own rating prompt, then the rating got traced too, forever. A feedback loop with no exit.

The fix is an opt-out: the proxy honors an `X-Mlx-Trace: 0` header and skips Opik tracing for that request, and the evaluator sends it on every judge call. After that, a judge pass creates zero traces and the pending count converges to 0.

```bash
# proxy: don't start a trace when the caller opts out
if _OPIK is not None and self.headers.get("X-Mlx-Trace", "1") != "0":
    opik_trace = _OPIK.trace(name="mlx.chat.completions", input={...})

# evaluator: mark judge calls as untraceable
headers = {"Content-Type": "application/json", "X-Mlx-Trace": "0"}
```

## 5 Scores on the wire

Six requests through the live proxy — a fact, a capital, a streaming count, the K2 question, a haiku, and a tool-call — then one evaluator pass. Every text-bearing trace carries all five scores:

| Question | correctness | helpfulness | hallucination_free | hallucination_quality | hallucination_flagged |
| --- | --- | --- | --- | --- | --- |
| Who wrote Moby-Dick? | `1.0` | `1.0` | `1.0` | `0.99` | `1.0` |
| Capital of Japan | `1.0` | `1.0` | `1.0` | `1.0` | `1.0` |
| Count 1–10 (stream) | `1.0` | `1.0` | `1.0` | `0.97` | `1.0` |
| Tallest mountain on Earth? | `0.9` | `0.9` | `1.0` | `0.99` | `1.0` |
| Haiku about the ocean | `0.9` | `0.8` | `1.0` | `1.0` | `1.0` |
| Weather in Paris (tool call) | — | — | — | `1.0` | `1.0` |

Worth calling out: the model answered K2 with full confidence, so the proxy's _shape_ heuristics gave it a near-perfect `hallucination_quality` — the flags catch repetition/refusal, not wrong-but-confident facts. The judge is the layer that caught it, docking correctness to 0.9. The two score sources are deliberately complementary, and the tool-call trace is the boundary case: no text, nothing to judge, heuristic scores only.

![Opik trace detail, Feedback scores tab, showing five scores with reasons](/assets/blog/opik-feedback-loop/opik-trace-feedback.png)

Fig 2. The Feedback scores tab on the K2 trace: `correctness` and `helpfulness` judge 0.9, `hallucination_free` judge 1.0, plus the proxy's `hallucination_quality` (quality 0.99) and `hallucination_flagged` (safety 1.0), each with its reason.

![Opik log table with one column per feedback score and per-trace score chips](/assets/blog/opik-feedback-loop/opik-traces-scores.png)

Fig 3. The project log view: every feedback score is a column (`correctness avg 0.96`, `hallucination_quality avg 0.99`, …) and every row carries its chips — `judge (1)`, `safety (1)`, `quality (0.99)`.

## 6 What bit us along the way

-   **Self-tracing judge.** The evaluator's judge calls were being traced and then judged by themselves. Fixed with the `X-Mlx-Trace: 0` opt-out.
-   **Eventual consistency on the read side.** The traces list is served by a search index, not the live DB. The first evaluator pass often saw a just-finished trace with an empty output (the index hadn't caught up) and skipped it as unjudgeable. One more pass later and it scores fine.
-   **PUT, not POST.** `POST /traces/feedback-scores` is a 405; the writer is `PUT` with a `{"scores": [...]}` wrapper, and the span variant additionally demands a `source` field. The SDK's `log_traces_feedback_scores` does the same thing under the hood.
-   **Tool calls have no content.** Nothing to judge, so no judge scores — the right behavior, and the reason the heuristic scores exist at all.

✓

**Score types on one trace.** The Feedback scores tab on Fig 2 shows exactly what the UI does with a mixed-source trace: `judge`, `quality` and `safety` categories each render as a chip with its reason, and the log table aggregates them into averages — correctness 0.96 across the project in Fig 3.

> The pattern that repeated all day: close the loop and it immediately starts feeding on itself. The judge needed its own escape hatch before it could grade anyone else's answers.
