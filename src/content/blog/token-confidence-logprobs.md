---
title: "18 — The Sampler Doesn't Lie: Entropy, Perplexity and Confidence from Logprobs"
date: 2026-08-08
description: "Every quality signal in this stack so far reads the model’s text — repetition, hedge words, refusal patterns. Those fire after the model has already written something wrong. Logprobs read the sampler, and the sampler goes flat first. This post closes the last gap in the post 8 comparison against Hyd"
tags: [llm, mlx]
draft: false
---

18 of 19 · closing the quality gap

Every quality signal in this stack so far reads the model’s _text_ — repetition, hedge words, refusal patterns. Those fire after the model has already written something wrong. Logprobs read the _sampler_, and the sampler goes flat first. This post closes the last gap in the post 8 comparison against Hydra: eight new metrics, five new alerts, one dashboard row — and one awkward constraint that made all of it harder than it should have been.

## 1What the text-based heuristics cannot see

Post 6 gave the proxy four heuristics — repetition, refusal, hedging, ungrounded claims — folded into a single `mlx_hallucination_risk`. They work, and they are cheap. They also share one structural weakness: **they only have an opinion once the model has produced text.** A model that confidently states a fabricated function signature scores zero on all four. There is no repetition, no hedging, no refusal, and if it was a coding question there were no tools to be ungrounded about.

The sampler knew. At the moment it emitted that fabricated identifier, the probability distribution over the next token was flat — several candidates, none dominant — and it picked one. That flatness is measurable, it is available for free as a byproduct of generation, and it does not care what the text looks like.

ⓘPost 8 compared this repo against Hydra and listed exactly one capability Hydra had that mlx-oc did not: logprob-derived entropy, perplexity and confidence. That was the last open item. This is it.

## 2The blocker: streams carry no logprobs

The plan was two lines of code — read `choices[0].logprobs`, compute. Then the actual server was probed rather than assumed:

```bash
$ curl -s $BASE/v1/chat/completions -d '{... "logprobs":true, "top_logprobs":3, "stream":false}'
{"choices":[{"logprobs":{"content":[
  {"token":"Hello","logprob":-0.25,"top_logprobs":[
     {"token":"Hello","logprob":-0.25},
     {"token":"Hi","logprob":-1.5},
     {"token":"Hey","logprob":-4.75}]},
  ...
```

Exactly the OpenAI shape. Then the same request with `"stream":true`:

```bash
$ curl -s -N $BASE/v1/chat/completions -d '{... "logprobs":true, "stream":true}' | grep -c logprob
0
```

**Zero.** `mlx_lm.server` accepts the parameter on a streaming request and silently drops it from every SSE chunk. And every real client in this stack streams — opencode streams, `tools/bench.py` streams, `bench_load.py` and `bench_agentic.py` stream. A passive “read the logprobs if they happen to be there” implementation would have scored precisely nothing, forever, while the dashboard sat at a confident-looking zero.

⚠This is the failure mode worth naming: a quality panel that is empty because nothing is _wrong_ looks identical to a quality panel that is empty because nothing is _measured_. That is why `mlx_confidence_scored_total` exists and why the dashboard leads with a coverage stat that goes **red at zero**.

## 3The design: inject, strip, and de-stream a sample

Three request classes, three behaviours:

| Request | What the proxy does | `source` label |
| --- | --- | --- |
| Client asked for logprobs | Nothing. Forward as-is, read the reply. | `client` |
| Non-streaming, no logprobs asked | Inject `logprobs`/`top_logprobs` upstream, score the reply, **strip the field back out** before the client sees it. | `injected` |
| Streaming, no logprobs asked | For a sampled fraction: send upstream with `stream:false`, score it, re-emit to the client as synthetic SSE frames. | `destreamed` |

De-streamed request — one generation, scored, re-emitted as a stream

<svg viewBox="0 0 900 300" role="img" aria-label="A streaming request is de-streamed by the proxy, generated once upstream, scored, and re-emitted to the client as SSE frames">
    <defs>
      <marker id="ar18" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#444CE7"></path>
      </marker>
      <path id="f18a" d="M 214 122 L 244 122"></path>
      <path id="f18b" d="M 434 122 L 464 122"></path>
      <path id="f18c" d="M 654 122 L 684 122"></path>
    </defs>
    <text x="30"  y="46" font-size="12" font-weight="600" fill="#4B5563" font-family="system-ui, sans-serif">1 &middot; CLIENT</text>
    <text x="250" y="46" font-size="12" font-weight="600" fill="#4B5563" font-family="system-ui, sans-serif">2 &middot; PROXY</text>
    <text x="470" y="46" font-size="12" font-weight="600" fill="#4B5563" font-family="system-ui, sans-serif">3 &middot; SERVER</text>
    <text x="690" y="46" font-size="12" font-weight="600" fill="#4B5563" font-family="system-ui, sans-serif">4 &middot; PROXY</text>
    <rect x="30" y="76" width="184" height="92" rx="12" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
    <text x="122" y="112" font-size="14" font-weight="700" fill="#111827" text-anchor="middle" font-family="system-ui, sans-serif">Streaming Request</text>
    <text x="122" y="134" font-size="12" fill="#4B5563" text-anchor="middle" font-family="system-ui, sans-serif">stream: true</text>
    <text x="122" y="152" font-size="12" fill="#4B5563" text-anchor="middle" font-family="system-ui, sans-serif">No Logprobs Asked</text>
    <rect x="250" y="76" width="184" height="92" rx="12" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
    <circle cx="342" cy="122" r="30" fill="none" stroke="#444CE7" stroke-width="2" opacity="0.55">
      <animate attributeName="r" values="30;54;30" dur="3.2s" repeatCount="indefinite"></animate>
      <animate attributeName="opacity" values="0.55;0;0.55" dur="3.2s" repeatCount="indefinite"></animate>
    </circle>
    <text x="342" y="112" font-size="14" font-weight="700" fill="#F9FAFB" text-anchor="middle" font-family="system-ui, sans-serif">Rewrite Request</text>
    <text x="342" y="134" font-size="12" fill="#CBD5E1" text-anchor="middle" font-family="system-ui, sans-serif">stream &rarr; false</text>
    <text x="342" y="152" font-size="12" fill="#CBD5E1" text-anchor="middle" font-family="system-ui, sans-serif">top_logprobs: 3</text>
    <rect x="470" y="76" width="184" height="92" rx="12" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
    <text x="562" y="112" font-size="14" font-weight="700" fill="#111827" text-anchor="middle" font-family="system-ui, sans-serif">mlx_lm.server</text>
    <text x="562" y="134" font-size="12" fill="#4B5563" text-anchor="middle" font-family="system-ui, sans-serif">One Generation</text>
    <text x="562" y="152" font-size="12" fill="#4B5563" text-anchor="middle" font-family="system-ui, sans-serif">Returns Top-K Logprobs</text>
    <rect x="690" y="76" width="184" height="92" rx="12" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
    <circle cx="782" cy="122" r="30" fill="none" stroke="#444CE7" stroke-width="2" opacity="0.55">
      <animate attributeName="r" values="30;54;30" dur="3.2s" begin="1.6s" repeatCount="indefinite"></animate>
      <animate attributeName="opacity" values="0.55;0;0.55" dur="3.2s" begin="1.6s" repeatCount="indefinite"></animate>
    </circle>
    <text x="782" y="112" font-size="14" font-weight="700" fill="#F9FAFB" text-anchor="middle" font-family="system-ui, sans-serif">Score, Strip, Re-emit</text>
    <text x="782" y="134" font-size="12" fill="#CBD5E1" text-anchor="middle" font-family="system-ui, sans-serif">Perplexity &middot; Entropy</text>
    <text x="782" y="152" font-size="12" fill="#CBD5E1" text-anchor="middle" font-family="system-ui, sans-serif">SSE Frames Out</text>
    <line x1="214" y1="122" x2="244" y2="122" stroke="#444CE7" stroke-width="2" marker-end="url(#ar18)"></line>
    <line x1="434" y1="122" x2="464" y2="122" stroke="#444CE7" stroke-width="2" marker-end="url(#ar18)"></line>
    <line x1="654" y1="122" x2="684" y2="122" stroke="#444CE7" stroke-width="2" marker-end="url(#ar18)"></line>
    <circle r="4" fill="#444CE7">
      <animateMotion dur="2.4s" repeatCount="indefinite"><mpath href="#f18a"></mpath></animateMotion>
    </circle>
    <circle r="4" fill="#444CE7">
      <animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite"><mpath href="#f18b"></mpath></animateMotion>
    </circle>
    <circle r="4" fill="#444CE7">
      <animateMotion dur="2.4s" begin="1.6s" repeatCount="indefinite"><mpath href="#f18c"></mpath></animateMotion>
    </circle>
    <text x="122" y="208" font-size="12" fill="#4B5563" text-anchor="middle" font-family="system-ui, sans-serif">Sampled At 5%</text>
    <text x="342" y="208" font-size="12" fill="#4B5563" text-anchor="middle" font-family="system-ui, sans-serif">No Extra GPU Cost</text>
    <text x="562" y="208" font-size="12" fill="#4B5563" text-anchor="middle" font-family="system-ui, sans-serif">Logprobs Only Here</text>
    <text x="782" y="208" font-size="12" fill="#4B5563" text-anchor="middle" font-family="system-ui, sans-serif">Client Sees A Stream</text>
    <rect x="30" y="238" width="844" height="42" rx="10" fill="#eef0ff" stroke="#c7d2fe" stroke-width="1.5"></rect>
    <text x="452" y="264" font-size="13" font-weight="600" fill="#111827" text-anchor="middle" font-family="system-ui, sans-serif">The Cost Is Latency Shape, Not Tokens &mdash; That One Response Arrives At Once Instead Of Token By Token</text>
  </svg>

The de-streaming trade is the honest part. It does **not** cost a second generation — it is the same single forward pass, the same GPU time, the same tokens. What it costs is the incremental delivery of that one response: the caller waits and then receives everything at once. At `MLX_LOGPROBS_STREAM_SAMPLE=0.05` that is one request in twenty. Set it to `0` and the behaviour disappears entirely.

It also means that request has no meaningful time-to-first-token, so the proxy deliberately records none. Recording the full generation time as a TTFT would have quietly poisoned the p95 that `MLXHighTTFTP95` fires on — a monitoring change causing a monitoring alert is the worst kind of self-inflicted page.

```bash
if t_first_token is not None:
    TTFT.labels(model).observe(t_first_token - t_send)
elif not synth_sse:
    TTFT.labels(model).observe(gen_time)
# A de-streamed request has no meaningful TTFT - the whole
# completion lands at once. Recording gen_time there would poison
# the TTFT percentiles the latency alerts fire on.
```

## 4The maths, and one caveat that matters

Each token entry carries the natural log of the probability the sampler assigned to the token it picked, plus the top-k candidates it considered.

| Quantity | Definition | Reads as |
| --- | --- | --- |
| **Confidence** | `exp(logprob)` per token | 1.0 = certain. The *minimum* across a completion is where a fabricated identifier enters. |
| **Perplexity** | `exp(-mean(log p))` | 1.0 = certain of every token. Step changes mean the *model* changed. |
| **Entropy** | `-Σ q log q` over the renormalised top-k, averaged per token | 0 = one candidate held all the mass. Rising = the distribution is flattening. |
| **Margin** | `p₁ − p₂`, averaged | Near zero = the model is coin-flipping between two tokens. |

⚠**The entropy caveat.** `top_logprobs` is a _truncated_ distribution — the tail is missing. The implementation renormalises over the returned candidates, which makes the result a **lower bound** on the true entropy, not the true entropy. It is honest to trend it and to threshold it. It is not honest to quote it as an absolute value, and the metric help text says so.

Perplexity and margin have no such caveat — both are computed from the chosen token’s own probability, which is exact.

## 5Eight metrics, and why each one earns its place

```bash
mlx_output_perplexity{model}                  + _histogram_bucket
mlx_token_entropy_nats{model}                 + _histogram_bucket
mlx_token_confidence_mean{model}
mlx_token_confidence_min{model}
mlx_token_confidence_std{model}
mlx_token_margin_mean{model}
mlx_low_confidence_token_ratio{model}
mlx_confidence_scored_total{model,source}
mlx_low_confidence_response_total{model}
```

Three of these are worth arguing for specifically:

-   **`confidence_min`, not just the mean.** A 400-token answer that is 0.95-confident throughout and contains one token at 0.06 has a fine mean. The minimum is the interesting number, and the shape — high mean, collapsing minimum — is the signature of a confident answer with one invented detail in it.
-   **`margin_mean` separates two different failures.** High entropy on hard prompts is normal. A margin that collapses across an entire window is not a prompt problem — it points at a corrupt or mis-quantised weight load. That distinction is why `MLXConfidenceCollapse` is the only critical alert in the new group.
-   **`scored_total{source}` is the anti-lie metric.** Divided by `mlx_requests_total` it gives coverage. Without it, every other panel on the row is unfalsifiable.

⚠**Building the coverage stat found an older bug.** Reading the live counters after deploy showed `mlx_finish_reason_total{reason="unknown"}` climbing on its own. A two-command check — scrape, `GET /v1/models`, scrape again — confirmed it: **every model-list poll was being counted as a chat completion.** It incremented `mlx_requests_total`, added an `unknown` finish\_reason, and pushed a near-zero sample into the TTFT and generation histograms that `MLXHighTTFTP95` reads percentiles from. A client polling `/v1/models` every few seconds was quietly making p95 latency look better than it was. Non-completion requests are now excluded from the completion metrics; `mlx_up` and `mlx_error_total` still count, because reachability and errors are real for any request. Expect the affected series to _drop_ after the fix — that is the polling traffic leaving, not a regression.

Deliberately _not_ done: folding confidence into `mlx_hallucination_risk`. Only a subset of requests carry logprobs, so a blended score would silently mean two different things depending on whether that request happened to be sampled. The heuristics stay text-only; confidence is its own axis.

## 6Does it actually discriminate? Three prompts, measured

A quality metric that does not move is decoration. Three prompts through the real cluster against `Qwen3.5-4B-MLX-8bit`, 60-token cap:

| Prompt | Perplexity | Entropy | Conf. mean | Conf. min | Margin |
| --- | --- | --- | --- | --- | --- |
| “What is 2+2?” — temp 0.0 | 1.00 | 0.087 | 1.000 | 1.000 | 0.980 |
| “Invent a name for a new colour” — temp 1.0 | 1.46 | 0.465 | 0.748 | 0.135 | 0.635 |
| “Ada Lovelace’s exact birthplace street address?” — temp 0.0 | 1.41 | 0.412 | 0.763 | **0.119** | 0.675 |

The arithmetic answer pins every metric — perplexity exactly 1.00, minimum confidence 1.00, margin 0.98. The invented colour sits where creative generation at temperature 1.0 should sit.

The third row is the one that matters. It is a **factual** question at temperature 0.0 — the same settings as the arithmetic row — asking for a specific detail the model does not reliably have. It lands almost exactly where the deliberately creative prompt landed. And note which number moved most: `confidence_mean` is a respectable 0.763, while `confidence_min` drops to **0.119**. The sentence reads fluently and confidently; one token in it was a near coin-flip. That is the shape the text heuristics cannot see, and it is why the minimum is on the dashboard next to the mean rather than hidden behind it.

## 7Five new alerts — including one that watches the watcher

| Alert | Fires when | Severity |
| --- | --- | --- |
| `MLXLowTokenConfidence` | mean sampled-token probability < 0.5 for 15m | warning |
| `MLXHighPerplexity` | perplexity > 8 for 15m | warning |
| `MLXHighTokenEntropy` | mean per-token entropy > 1.5 nats for 15m | warning |
| `MLXConfidenceCollapse` | top-1 vs top-2 margin < 0.15 for 10m | critical |
| `MLXConfidenceScoringStopped` | traffic flowing, nothing scored for 30m | info |

Every one of the first four is gated on `sum(rate(mlx_confidence_scored_total[...])) > 0`, so an idle or unscored cluster cannot page anyone. The fifth exists because the other four are only as good as their input: if `MLX_LOGPROBS` gets set to 0, or the upstream stops returning logprobs after an upgrade, the confidence alerts go quiet — and quiet is indistinguishable from healthy unless something says otherwise.

That takes `observability/vmalert/rules.yml` from 36 to 41 rules.

## 8Proving the rewrite does not break anything

Injecting a field into a request body and rewriting the response body is the riskiest kind of proxy change: the failure mode is a coding agent that silently loses tool calls. So the tests cover the rewrite path with a stub upstream that mirrors the real server’s behaviour — including its refusal to put logprobs in SSE chunks.

```bash
$ python3 -m pytest tests/ -q
.....................................                          [100%]
39 passed in 1.12s
```

The ones that matter:

-   `test_non_streaming_request_gets_logprobs_injected_and_stripped` — upstream received `logprobs: true`, the client’s response has no `logprobs` key, and `Content-Length` matches the _rewritten_ body rather than the upstream one.
-   `test_destreamed_tool_calls_reach_the_client` — synthesised SSE frames are fed back through the proxy’s own `_StreamParser`; tool calls and `finish_reason: tool_calls` survive the round trip.
-   `test_destreaming_does_not_record_a_ttft` — asserts the TTFT histogram count does **not** move.
-   `test_upstream_error_is_passed_through_untouched` — a 503 from upstream reaches the client as a 503 with its original body.
-   `test_score_confidence_returns_empty_when_nothing_is_scorable` and `..._degrades_when_only_top_logprobs_are_broken` — eleven shapes of malformed logprobs payload. None raise; a usable `logprob` with a broken `top_logprobs` still yields confidence and perplexity, with entropy and margin correctly falling to zero rather than to a wrong number.

That last pair started as one test with a wrong assertion — it expected a broken `top_logprobs` to invalidate the whole entry. The code was right and the test was wrong: partial data should degrade, not vanish. Splitting it into two named tests made the contract explicit instead of accidental.

## 9Configuration, in one file as usual

Three knobs join `MLX_MODEL` and `MLX_DEFAULT_TEMP` in `cluster/cluster.env`, the single source of truth `start_server.sh` sources and exports:

```bash
MLX_LOGPROBS=3                  # top-k asked upstream; 0 disables the layer
MLX_LOGPROBS_STREAM_SAMPLE=0.05 # fraction of streams de-streamed for scoring
MLX_LOW_CONFIDENCE=0.5          # token probability below which it counts as low
```

3 candidates is enough for entropy and for a top-1 vs top-2 margin without bloating the upstream response. The proxy prints its scoring configuration at startup, so the log says what the dashboard is measuring:

```json
[proxy] confidence scoring: top_logprobs=3 stream_sample=0.05 low_conf<0.5
```

## 10Where this leaves the stack

-   **Grafana** gets a new _Answer confidence (token logprobs)_ row on MLX Performance — coverage stat first, then confidence, perplexity, entropy, margin and low-confidence ratio.
-   **Opik** gets the same numbers as span attributes and trace metadata, plus a `token_confidence` feedback score alongside the post-6 heuristic scores.
-   **The post-8 gap against Hydra is closed**, and closed differently: Hydra’s telemetry SDK expects the calling application to hand it token probabilities. Here the proxy sources them itself, from a server that will not give them up during a stream.

✓Text heuristics tell you the answer looked wrong. Logprobs tell you the model was guessing. The second one arrives first — and now both are on the same dashboard.
