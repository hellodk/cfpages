---
title: "Token-Efficient E2E Testing with Claude Code & Playwright"
date: 2026-05-21
description: "How to cut AI-assisted testing costs by 10× while getting better coverage — using a three-tier strategy that keeps screenshots out of your context window."
tags: [testing, e2e, tokens]
draft: false
---

How to cut AI-assisted testing costs by 10× while getting better coverage — using a three-tier strategy that keeps screenshots out of your context window.

## 1 The Problem with Interactive AI Testing

When Claude Code drives a Playwright browser interactively — click, snapshot, click, snapshot — each step costs tokens. A full user journey of 15 interactions easily burns **30,000–60,000 tokens** in a single session, mostly on accessibility snapshots that look like this:

```bash
### Snapshot
- Heading "Fleet Dashboard" [level=1]
- Button "+ Bootstrap Node" [ref=e47]
- Table [ref=e48]
  - Row [ref=e49]
    - Cell "mac-mini-01" [ref=e50]
    - Cell "online" [ref=e51]
    ...
```

Multiply that across 20 journeys and you've spent a meaningful chunk of a context window just describing what a browser sees. Then the context fills, compacts, and the next session starts cold.

**The real cost:** it's not just API tokens. It's session continuity. When context overflows mid-journey, you lose test state, have to re-login, re-navigate, and re-discover what was already verified.

## 2 The Three-Tier Testing Pyramid

The solution is to match the _test tool_ to the _question being answered_. Not every test needs a browser. Not every assertion needs a screenshot.

<svg viewBox="0 0 560 320" width="100%" style="max-width:560px">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#BBF7D0"></stop>
            <stop offset="100%" stop-color="#86EFAC"></stop>
          </linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#FDE68A"></stop>
            <stop offset="100%" stop-color="#FCD34D"></stop>
          </linearGradient>
          <linearGradient id="g3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#FECACA"></stop>
            <stop offset="100%" stop-color="#FCA5A5"></stop>
          </linearGradient>
        </defs>
        <g>
          <polygon points="40,280 520,280 440,200 120,200" fill="url(#g1)" stroke="#16A34A" stroke-width="1.5" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="0.1s" fill="freeze"></animate>
          </polygon>
          <text x="280" y="248" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#15803D" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.4s" fill="freeze"></animate>
            Tier 1 — API / pytest
          </text>
          <text x="280" y="266" text-anchor="middle" font-family="system-ui" font-size="11" fill="#166534" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.5s" fill="freeze"></animate>
            ~200 tokens per test · backend logic · no browser
          </text>
        </g>
        <g>
          <polygon points="120,200 440,200 360,120 200,120" fill="url(#g2)" stroke="#D97706" stroke-width="1.5" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="0.5s" fill="freeze"></animate>
          </polygon>
          <text x="280" y="166" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#92400E" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.8s" fill="freeze"></animate>
            Tier 2 — Playwright spec files
          </text>
          <text x="280" y="184" text-anchor="middle" font-family="system-ui" font-size="11" fill="#78350F" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="0.9s" fill="freeze"></animate>
            ~2 k tokens per run · UI flows · text report only
          </text>
        </g>
        <g>
          <polygon points="200,120 360,120 310,50 250,50" fill="url(#g3)" stroke="#DC2626" stroke-width="1.5" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.5s" begin="0.9s" fill="freeze"></animate>
          </polygon>
          <text x="280" y="88" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#B91C1C" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.2s" fill="freeze"></animate>
            Tier 3 — Interactive MCP
          </text>
          <text x="280" y="104" text-anchor="middle" font-family="system-ui" font-size="10" fill="#991B1B" opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.3s" fill="freeze"></animate>
            failures only
          </text>
        </g>
        <g font-family="system-ui" font-size="12" fill="#4B5563">
          <text x="532" y="248" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="0.6s" fill="freeze"></animate>80%</text>
          <text x="532" y="166" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.0s" fill="freeze"></animate>15%</text>
          <text x="532" y="88"  opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.4s" fill="freeze"></animate>5%</text>
        </g>
        <text x="527" y="232" font-family="system-ui" font-size="10" fill="#9CA3AF" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="0.6s" fill="freeze"></animate>of tests</text>
        <text x="527" y="150" font-family="system-ui" font-size="10" fill="#9CA3AF" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.0s" fill="freeze"></animate>of tests</text>
        <text x="527" y="72" font-family="system-ui" font-size="10" fill="#9CA3AF" opacity="0">
          <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="1.4s" fill="freeze"></animate>of tests</text>
      </svg>

The wider the tier, the more tests live there. The narrower the tier, the fewer tokens it must burn.

Tier 1 · API

~200

tokens / test

Tier 2 · Spec file

~2k

tokens / full run

Tier 3 · Interactive

~50k

tokens / journey

The numbers make the decision obvious: **default to Tier 1, only escalate to Tier 2 for UI flows, and use Tier 3 only to debug specific failures.**

## 3 Tier 1 — API Tests with pytest + httpx

Pure API tests have zero browser overhead. They validate backend logic, auth, validation, and business rules — which is the majority of what matters. Claude reads a compact pass/fail output, not screenshots.

### What belongs here

Authentication flows, CRUD endpoints, pagination, status transitions, rate limiting, permission enforcement, edge-case inputs, and all security checks (path traversal, SQL injection probes).

```bash
# tests/integration/test_bootstrap.py
async def test_bootstrap_409_if_already_running(client, db):
    # First bootstrap — should succeed
    r1 = await client.post("/api/v1/ansible/bootstrap",
        json={"minion_id": "mac-01", "target_ip": "203.0.113.11"})
    assert r1.status_code == 200

    # Second bootstrap on same node — must be 409
    r2 = await client.post("/api/v1/ansible/bootstrap",
        json={"minion_id": "mac-01", "target_ip": "203.0.113.11"})
    assert r2.status_code == 409
```

Running 50 of these costs roughly the same as _one interactive Playwright journey_. The output Claude reads back is just:

```bash
50 passed in 4.32s
```

**Rule:** If the assertion doesn't require seeing pixels, it belongs in Tier 1.

## 4 Tier 2 — Playwright Spec Files (Not Interactive)

The key insight: **writing and running Playwright spec files is fundamentally different from interactive Playwright MCP.** When you run `npx playwright test --reporter=line`, the only thing that comes back into Claude's context is the text output — not snapshots, not screenshots.

<svg viewBox="0 0 680 120" width="100%" style="min-width:500px">
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF"></path>
          </marker>
        </defs>
        <g font-family="system-ui">
          <rect x="10" y="30" width="120" height="60" rx="8" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
          <text x="70" y="55" text-anchor="middle" font-size="12" font-weight="600" fill="#3730A3">Write</text>
          <text x="70" y="71" text-anchor="middle" font-size="12" font-weight="600" fill="#3730A3">.spec.ts</text>
          <text x="70" y="84" text-anchor="middle" font-size="10" fill="#6366F1">once</text>
          <line x1="132" y1="60" x2="158" y2="60" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr)"></line>
          <rect x="160" y="30" width="120" height="60" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="220" y="55" text-anchor="middle" font-size="12" font-weight="600" fill="#15803D">npx playwright</text>
          <text x="220" y="71" text-anchor="middle" font-size="12" font-weight="600" fill="#15803D">test</text>
          <text x="220" y="84" text-anchor="middle" font-size="10" fill="#16A34A">headless</text>
          <line x1="282" y1="60" x2="308" y2="60" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr)"></line>
          <rect x="310" y="30" width="140" height="60" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="380" y="52" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Compact text</text>
          <text x="380" y="68" text-anchor="middle" font-size="11" fill="#4B5563">✓ 18 passed</text>
          <text x="380" y="82" text-anchor="middle" font-size="11" fill="#DC2626">✗ 2 failed</text>
          <line x1="452" y1="60" x2="478" y2="60" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr)"></line>
          <rect x="480" y="30" width="140" height="60" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="550" y="52" text-anchor="middle" font-size="12" font-weight="600" fill="#92400E">Claude reads</text>
          <text x="550" y="68" text-anchor="middle" font-size="11" fill="#78350F">failure reason</text>
          <text x="550" y="82" text-anchor="middle" font-size="11" fill="#78350F">only</text>
        </g>
        <text x="380" y="108" text-anchor="middle" font-family="system-ui" font-size="11" fill="#9CA3AF">~2,000 tokens total vs ~50,000 for interactive</text>
      </svg>

The spec file is written once by Claude in your session. Subsequent runs — from CI, from the `kri.sh test` command, from your terminal — consume near-zero AI tokens. Only failures come back into context for diagnosis.

### Spec file structure for kri

tests/e2e/  
  helpers.ts ← login helpers, API base URL  
  auth.spec.ts ← AUTH-01..07 (API + UI)  
  fleet.spec.ts ← FLEET-01..14 (API + UI)  
  bootstrap.spec.ts← BOOT-01..22 (API + UI)  
  nodes.spec.ts ← NODE-01..18 (API + UI)  
  baselines.spec.ts← BASE-01..12 (API + UI)  
  groups.spec.ts ← GRP-01..12 (API + UI)  
  playbooks.spec.ts← PLAY-01..21 (API + UI)  
playwright.config.ts ← screenshots only-on-failure

### The login trick that saves the most tokens

The `loginViaApi` helper bypasses the login UI entirely — it calls the auth endpoint with `request.post()` and injects tokens directly into `localStorage`. This skips 4 interactive steps (navigate, fill email, fill password, click submit) on every single test.

```js
// helpers.ts — fast login via API, skips UI
export async function loginViaApi(page: Page, user = ADMIN) {
  const res = await page.request.post(`${API}/auth/login`, {
    data: { email: user.email, password: user.password },
  })
  const { access_token, refresh_token } = await res.json()
  await page.goto('/')
  await page.evaluate(({ at, rt }) => {
    localStorage.setItem('access_token', at)
    localStorage.setItem('refresh_token', rt)
  }, { at: access_token, rt: refresh_token })
  await page.goto('/fleet')
}
```

## 5 Tier 3 — Interactive MCP for Failure Diagnosis

Interactive Playwright MCP (navigating, clicking, snapshotting step-by-step inside a Claude session) is expensive but irreplaceable for one thing: **diagnosing visual failures** that text output can't describe.

<svg viewBox="0 0 560 200" width="100%" style="max-width:560px">
        <defs>
          <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#6366F1"></path>
          </marker>
        </defs>
        <g font-family="system-ui">
          <rect x="20"  y="70" width="100" height="50" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="70"  y="92" text-anchor="middle" font-size="11" font-weight="600" fill="#15803D">Run specs</text>
          <text x="70"  y="108" text-anchor="middle" font-size="10" fill="#166534">kri.sh test</text>
          <line x1="122" y1="95" x2="148" y2="95" stroke="#6366F1" stroke-width="1.5" marker-end="url(#arr2)"></line>
          <rect x="150" y="70" width="110" height="50" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="205" y="92" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">All pass?</text>
          <text x="205" y="108" text-anchor="middle" font-size="10" fill="#16A34A">→ done ✓</text>
          <line x1="262" y1="95" x2="288" y2="95" stroke="#6366F1" stroke-width="1.5" marker-end="url(#arr2)"></line>
          <rect x="290" y="70" width="120" height="50" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="350" y="88" text-anchor="middle" font-size="11" font-weight="600" fill="#92400E">Failure?</text>
          <text x="350" y="104" text-anchor="middle" font-size="10" fill="#78350F">read error text</text>
          <text x="350" y="116" text-anchor="middle" font-size="10" fill="#78350F">first</text>
          <line x1="412" y1="95" x2="438" y2="95" stroke="#6366F1" stroke-width="1.5" marker-end="url(#arr2)"></line>
          <rect x="440" y="70" width="100" height="50" rx="8" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
          <text x="490" y="88" text-anchor="middle" font-size="11" font-weight="600" fill="#B91C1C">Still unclear?</text>
          <text x="490" y="104" text-anchor="middle" font-size="10" fill="#991B1B">↓ use MCP</text>
          <text x="490" y="116" text-anchor="middle" font-size="10" fill="#991B1B">for this test only</text>
          <text x="280" y="30" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Escalation ladder</text>
          <text x="280" y="170" text-anchor="middle" font-size="11" fill="#9CA3AF">Interactive MCP is the last resort, not the first tool</text>
        </g>
      </svg>

### The subagent multiplier

When you do need interactive testing, spawn a subagent for it. The subagent's context is isolated — all the snapshots it takes burn _its_ token budget, not yours. It comes back with a one-paragraph summary.

```bash
# In your main session:
Agent({
  description: "Bootstrap modal interactive test",
  prompt: """Test the Bootstrap Node flow at http://localhost:5173:
    1. Login as admin@fleet.example.internal / changeme
    2. Click + Bootstrap Node
    3. Type mac-mini-01 — verify IP pre-fills and is locked
    4. Type brand-new-xyz — verify IP is editable
    5. Report PASS/FAIL for each step with any error text."""
})
```

The subagent does all the snapshotting internally. You receive one compact result. Your session context stays clean for the next task.

## 6 Running the Suite

All tests are wired into `kri.sh`. Make sure kri is running first.

```bash
# Start kri
./scripts/kri.sh start

# Run full E2E suite — gets compact line reporter output
./scripts/kri.sh test

# Run a specific file
./scripts/kri.sh test auth

# Run from repo root directly
npx playwright test --reporter=line

# Run only API-level tests (fastest)
npx playwright test --grep "API" --reporter=line

# Run with full HTML report (human review)
npx playwright test --reporter=html
```

What Claude reads back when all passes:

```bash
  Running 47 tests using 1 worker
  ··············································
  47 passed (38.2s)
```

What Claude reads back on failure:

```bash
  Running 47 tests using 1 worker
  ·······················✗····················
  1 failed

  ✗ bootstrap.spec.ts:89 › BOOT-03 existing minion ID auto-fills IP
    Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
    Received: <p> "New node — enter IP address below" </p> visible
```

That failure message is 200 tokens. Claude knows exactly what to check without a screenshot.

## 7 Decision Reference

| Question to answer | Tool | Cost |
| --- | --- | --- |
| Does this API return the right status code? | pytest / Playwright API request | ~200 tk |
| Does this UI flow work end-to-end? | Playwright spec file (headless) | ~2k tk |
| Why is this specific test failing visually? | Subagent with interactive MCP | ~10k tk |
| Full visual exploration of an unknown issue | Interactive MCP (direct, last resort) | ~50k tk |

**The 10× savings come from two habits:** writing spec files instead of interactive journeys, and spawning subagents for the rare times you need a real browser session. Both keep your main context window clean and your token bill predictable.

* * *
