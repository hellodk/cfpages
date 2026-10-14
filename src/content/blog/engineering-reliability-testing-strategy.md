---
title: "Engineering Reliability: A Testing & Quality Framework for Modern Web Platforms"
date: 2026-05-23
description: "A practical framework covering every layer — from fast unit tests to full-stack E2E — and the quality gates that make merging safe."
tags: [testing, reliability, engineering]
draft: false
---

A practical framework covering every layer — from fast unit tests to full-stack E2E — and the quality gates that make merging safe.

## 1 The Testing Pyramid

The pyramid is a prioritisation tool, not a dogma. Its core message: **write many fast tests at the bottom, few slow tests at the top**. Every layer catches a different class of bug. Missing a layer means bugs escape to the layer above — where they cost more to find.

<svg viewBox="0 0 620 420" width="100%" style="max-width:620px;display:block;margin:0 auto">
        <defs>
          <marker id="arr-p" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" fill="#9CA3AF"></path>
          </marker>
        </defs>
        <g style="animation:fadeUp 0.5s ease both; animation-delay:0.0s">
          <polygon points="10,400 610,400 540,340 80,340" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5"></polygon>
          <text x="310" y="368" text-anchor="middle" font-family="system-ui" font-size="15" font-weight="700" fill="#15803D">Unit Tests</text>
          <text x="310" y="385" text-anchor="middle" font-family="system-ui" font-size="11" fill="#166534">fast · isolated · no network · many  ·  &lt; 1s each</text>
        </g>
        <g style="animation:fadeUp 0.5s ease both; animation-delay:0.3s">
          <polygon points="80,340 540,340 470,278 150,278" fill="#CFFAFE" stroke="#0891B2" stroke-width="1.5"></polygon>
          <text x="310" y="306" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#0E7490">Integration Tests</text>
          <text x="310" y="322" text-anchor="middle" font-family="system-ui" font-size="11" fill="#155E75">real DB · transaction rollback · no mocks  ·  &lt; 30s</text>
        </g>
        <g style="animation:fadeUp 0.5s ease both; animation-delay:0.6s">
          <polygon points="150,278 470,278 400,216 220,216" fill="#F3E8FF" stroke="#9333EA" stroke-width="1.5"></polygon>
          <text x="310" y="244" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#7E22CE">Contract Tests</text>
          <text x="310" y="260" text-anchor="middle" font-family="system-ui" font-size="11" fill="#6B21A8">API ↔ consumer shape · schema drift  ·  &lt; 5s</text>
        </g>
        <g style="animation:fadeUp 0.5s ease both; animation-delay:0.9s">
          <polygon points="220,216 400,216 350,154 270,154" fill="#FEF9C3" stroke="#D97706" stroke-width="1.5"></polygon>
          <text x="310" y="180" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#92400E">Component Tests</text>
          <text x="310" y="196" text-anchor="middle" font-family="system-ui" font-size="10" fill="#78350F">UI in isolation · no real API  ·  &lt; 10s</text>
        </g>
        <g style="animation:fadeUp 0.5s ease both; animation-delay:1.2s">
          <polygon points="270,154 350,154 330,92 290,92" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.5"></polygon>
          <text x="310" y="118" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="700" fill="#B91C1C">E2E Tests</text>
          <text x="310" y="133" text-anchor="middle" font-family="system-ui" font-size="10" fill="#991B1B">full stack · &lt; 10 min</text>
        </g>
        <g style="animation:fadeUp 0.5s ease both; animation-delay:1.5s">
          <polygon points="290,92 330,92 320,40 300,40" fill="#F1F5F9" stroke="#64748B" stroke-width="1.5"></polygon>
          <text x="310" y="72" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#475569">Manual</text>
        </g>
        <g style="animation:fadeUp 0.5s ease both; animation-delay:1.8s" font-family="system-ui" font-size="12" fill="#4B5563">
          <text x="624" y="372" font-weight="600">Many</text>
          <text x="624" y="310" font-weight="600">Fewer</text>
          <text x="624" y="248" font-weight="600">Some</text>
          <text x="624" y="186" font-weight="600">Some</text>
          <text x="624" y="124" font-weight="600">Few</text>
          <text x="624" y="68"  font-weight="600">Rare</text>
        </g>
      </svg>

The pyramid shape is a cost signal: lower layers run faster and cheaper. Push testing down as far as possible.

## 2 Seven Test Types — Deep Dive

Each type answers a different question. Using the wrong type costs time; skipping a type lets bugs through.

Unit Test < 1s

Tests a single function or class in complete isolation. No network, no database, no filesystem. External dependencies are replaced with fakes or mocks at the boundary. The fast feedback loop that makes TDD practical.

```bash
def test_hash_password_is_deterministic():
    # No DB, no IO — pure function test
    h1 = hash_password("secret")
    h2 = hash_password("secret")
    assert h1 == h2
    assert h1 != "secret"
```

Integration Test < 30s

Exercises real infrastructure — a real database, a real message queue. Each test runs inside a transaction that is rolled back at teardown, so tests remain isolated even though they touch real storage. No mocking of the layer being tested.

```bash
async def test_bootstrap_409_if_already_running(client, db):
    r1 = await client.post("/api/v1/ansible/bootstrap",
        json={"minion_id": "mac-01", "target_ip": "203.0.113.11"})
    assert r1.status_code == 200

    r2 = await client.post("/api/v1/ansible/bootstrap",
        json={"minion_id": "mac-01", "target_ip": "203.0.113.11"})
    assert r2.status_code == 409
```

Contract Test < 5s

The producer (API) and consumer (frontend) independently verify they agree on data shapes. The contract is explicit — a Pydantic schema on one side, a TypeScript interface on the other. A contract test fails if either side drifts. Most teams skip this layer entirely; they discover contract breaks when users see blank screens.

```bash
# Producer side — Pydantic schema IS the contract
class BootstrapResponse(BaseModel):
    node_id: uuid.UUID
    minion_id: str
    job_id: str
    bootstrap_status: str
    message: str
    salt_key_deleted: bool = False

// Consumer side — TypeScript interface IS the contract
interface BootstrapResponse {
  node_id: string
  minion_id: string
  job_id: string
  bootstrap_status: string
  message: string
  // ⚠ salt_key_deleted missing — contract is already drifted
}
```

Component Test < 10s

Renders a single React component with a mocked API, verifying it handles loading, success, and error states correctly. Uses Vitest + Testing Library. Does not open a browser — runs in jsdom. Faster than E2E by an order of magnitude.

```bash
// BootstrapModal.test.tsx
it('shows error state when bootstrap API fails', async () => {
  server.use(
    rest.post('/api/v1/ansible/bootstrap', (req, res, ctx) =>
      res(ctx.status(409, 'Already bootstrapping')))
  )
  render(<BootstrapModal isOpen={true} />)
  await userEvent.click(screen.getByRole('button', { name: /start/i }))
  await screen.findByText(/already being bootstrapped/i)
})
```

End-to-End Test < 10 min total suite

A real browser, a real server, a real database. Playwright navigates the full user journey as a user would. Tests user behaviour, not implementation. Slow to run, high confidence, expensive to maintain. Should cover journeys, not every edge case — those belong lower in the pyramid.

```bash
test('BOOT-01 modal opens from fleet dashboard', async ({ page }) => {
  await page.click('button:has-text("+ Bootstrap Node")')
  await expect(page.locator('h2:has-text("Bootstrap Mac Mini")'))
    .toBeVisible()
})
```

Mutation Test minutes

A mutation testing tool (mutmut, Stryker) systematically breaks production code — flips a `==` to `!=`, removes a return statement, deletes a branch — then checks if your tests catch each change. The mutation score is the percentage of mutations your tests detect. A score below 70% means your tests are passing for the wrong reasons.

```bash
# Run mutmut on a specific module
mutmut run --paths-to-mutate fleet_platform/core/auth.py
mutmut results   # shows surviving mutants = test gaps
```

Property-Based Test < 30s

Hypothesis (Python) or fast-check (TypeScript) generates hundreds of random inputs and verifies that an invariant always holds. Finds edge cases that humans forget to write — empty strings, negative numbers, Unicode, max-length values. Write one property test to replace dozens of example-based tests.

```bash
from hypothesis import given, strategies as st

@given(st.text(min_size=1, max_size=128))
def test_validate_minion_id_never_crashes(s):
    # Invariant: validation never raises an exception — only True/False
    result = is_valid_minion_id(s)
    assert isinstance(result, bool)
```

## 3 The TDD Cycle

Test-Driven Development is a discipline, not a suggestion. The cycle is short — three phases, typically two to ten minutes per iteration. The discipline: **never write production code without a failing test first.**

<svg viewBox="0 0 560 260" width="100%" style="max-width:560px;display:block;margin:0 auto">
        <defs>
          <marker id="arr-tdd" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto">
            <path d="M0,0 L0,8 L10,4 z" fill="#6366F1"></path>
          </marker>
        </defs>
        <g class="tdd-circle-1">
          <circle cx="130" cy="165" r="72" fill="#FEE2E2" stroke="#DC2626" stroke-width="2.5"></circle>
          <text x="130" y="155" text-anchor="middle" font-family="system-ui" font-size="22">🔴</text>
          <text x="130" y="178" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#B91C1C">Write failing</text>
          <text x="130" y="196" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#B91C1C">test</text>
        </g>
        <g class="tdd-circle-2">
          <circle cx="430" cy="165" r="72" fill="#DCFCE7" stroke="#16A34A" stroke-width="2.5"></circle>
          <text x="430" y="155" text-anchor="middle" font-family="system-ui" font-size="22">🟢</text>
          <text x="430" y="178" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#15803D">Write minimal</text>
          <text x="430" y="196" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#15803D">code to pass</text>
        </g>
        <g class="tdd-circle-3">
          <circle cx="280" cy="68" r="60" fill="#EEF2FF" stroke="#4F46E5" stroke-width="2.5"></circle>
          <text x="280" y="60" text-anchor="middle" font-family="system-ui" font-size="20">🔵</text>
          <text x="280" y="80" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#3730A3">Refactor</text>
          <text x="280" y="97" text-anchor="middle" font-family="system-ui" font-size="11" fill="#4338CA">(test stays green)</text>
        </g>
        <path class="tdd-arrow-1" d="M 200,150 Q 280,185 358,155"
          fill="none" stroke="#6366F1" stroke-width="2" marker-end="url(#arr-tdd)" stroke-dashoffset="200"></path>
        <path class="tdd-arrow-2" d="M 415,97 Q 380,60 338,72"
          fill="none" stroke="#6366F1" stroke-width="2" marker-end="url(#arr-tdd)" stroke-dashoffset="200"></path>
        <path class="tdd-arrow-3" d="M 222,72 Q 180,60 148,97"
          fill="none" stroke="#6366F1" stroke-width="2" marker-end="url(#arr-tdd)" stroke-dashoffset="200"></path>
        <text x="280" y="245" text-anchor="middle" font-family="system-ui" font-size="12" fill="#9CA3AF">Typical cycle time: 2–10 minutes per iteration</text>
      </svg>

**The constraint that makes TDD valuable:** if you cannot write a test first, it means the requirement is not yet clear enough to implement. Clarify the requirement before writing code.

## 4 Development Workflow

Every feature follows the same sequence. The critical property: tests are written before implementation, and CI runs them automatically. Nothing can merge without passing through every gate.

<svg viewBox="0 0 720 180" width="100%" style="min-width:600px">
        <defs>
          <marker id="arr-wf" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" fill="#9CA3AF"></path>
          </marker>
        </defs>
        <g font-family="system-ui" font-size="11">
          <rect x="4"   y="20" width="80" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="44"  y="40"  text-anchor="middle" font-weight="600" fill="#111827">Issue</text>
          <text x="44"  y="56"  text-anchor="middle" fill="#4B5563">created</text>
          <line x1="86" y1="42" x2="102" y2="42" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="104" y="20" width="90" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="149" y="40"  text-anchor="middle" font-weight="600" fill="#111827">Spec / AC</text>
          <text x="149" y="56"  text-anchor="middle" fill="#4B5563">written</text>
          <line x1="196" y1="42" x2="212" y2="42" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="214" y="20" width="90" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="259" y="40"  text-anchor="middle" font-weight="600" fill="#111827">Tests</text>
          <text x="259" y="56"  text-anchor="middle" fill="#4B5563">defined</text>
          <line x1="306" y1="42" x2="322" y2="42" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="324" y="20" width="80" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="364" y="40"  text-anchor="middle" font-weight="600" fill="#111827">Branch</text>
          <text x="364" y="56"  text-anchor="middle" fill="#4B5563">cut</text>
          <line x1="406" y1="42" x2="422" y2="42" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="424" y="14" width="92" height="56" rx="8" fill="#FEF2F2" stroke="#DC2626" stroke-width="2"></rect>
          <text x="470" y="35"  text-anchor="middle" font-weight="700" fill="#B91C1C">Failing</text>
          <text x="470" y="50"  text-anchor="middle" font-weight="700" fill="#B91C1C">tests</text>
          <text x="470" y="64"  text-anchor="middle" fill="#DC2626">written</text>
          <line x1="518" y1="42" x2="534" y2="42" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="536" y="20" width="90" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="581" y="40"  text-anchor="middle" font-weight="600" fill="#111827">Implement</text>
          <text x="581" y="56"  text-anchor="middle" fill="#4B5563">code</text>
          <line x1="628" y1="42" x2="644" y2="42" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="646" y="14" width="68" height="56" rx="8" fill="#F0FDF4" stroke="#16A34A" stroke-width="2"></rect>
          <text x="680" y="35"  text-anchor="middle" font-weight="700" fill="#15803D">Tests</text>
          <text x="680" y="50"  text-anchor="middle" font-weight="700" fill="#15803D">green</text>
          <text x="680" y="64"  text-anchor="middle" fill="#16A34A">✓</text>
        </g>
        <g font-family="system-ui" font-size="11">
          <line x1="680" y1="72" x2="680" y2="110" stroke="#9CA3AF" stroke-width="1.5"></line>
          <line x1="680" y1="110" x2="664" y2="110" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="566" y="94" width="96" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="614" y="114" text-anchor="middle" font-weight="600" fill="#111827">PR opened</text>
          <text x="614" y="130" text-anchor="middle" fill="#4B5563">+ test plan</text>
          <line x1="564" y1="116" x2="548" y2="116" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="446" y="94" width="100" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="496" y="114" text-anchor="middle" font-weight="600" fill="#111827">CI runs</text>
          <text x="496" y="130" text-anchor="middle" fill="#4B5563">all checks</text>
          <line x1="444" y1="116" x2="428" y2="116" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="324" y="94" width="102" height="44" rx="8" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="375" y="114" text-anchor="middle" font-weight="600" fill="#111827">Review</text>
          <text x="375" y="130" text-anchor="middle" fill="#4B5563">incl. tests</text>
          <line x1="322" y1="116" x2="306" y2="116" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="210" y="94" width="94" height="44" rx="8" fill="#EEF2FF" stroke="#6366F1" stroke-width="1.5"></rect>
          <text x="257" y="114" text-anchor="middle" font-weight="700" fill="#3730A3">Merge</text>
          <text x="257" y="130" text-anchor="middle" fill="#4338CA">to main</text>
          <line x1="208" y1="116" x2="192" y2="116" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#arr-wf)"></line>
          <rect x="90"  y="94" width="100" height="44" rx="8" fill="#F0FDF4" stroke="#16A34A" stroke-width="1.5"></rect>
          <text x="140" y="114" text-anchor="middle" font-weight="600" fill="#15803D">Issue closes</text>
          <text x="140" y="130" text-anchor="middle" fill="#166534">DoD met ✓</text>
        </g>
      </svg>

## 5 Contract Testing — The Critical Gap

Most teams test the API in isolation and test the frontend in isolation. Neither test verifies that the two sides agree on the shape of data flowing between them. Contract tests close this gap explicitly.

**The risk:** without contract tests, a backend developer can rename a field, the unit tests pass, the E2E tests pass (if they test for something else), and the frontend breaks silently in production. The user sees a blank screen or NaN.

### Three contract failure modes

01

Field removed

API removes `message` field → frontend renders `undefined` in the status banner

02

Type changed

Field changes from `string` to `number` → frontend renders `NaN` where a human-readable label should appear

03

Structure changed

Nested object refactored → `TypeError: cannot read property of undefined` — crashes the component silently

### How to implement contract tests

**Producer side (Python/FastAPI):** Pydantic schemas ARE the contract. The API endpoint is declared with `response_model=BootstrapResponse`. FastAPI validates every response against the schema at runtime. Add a unit test asserting the schema's JSON representation matches the expected shape.

**Consumer side (TypeScript):** TypeScript interfaces are the contract. Run `tsc --noEmit` in CI — any code that accesses a field that no longer exists in the interface will fail the build.

**Bridge:** extract Pydantic JSON schemas (`model.model_json_schema()`), export them as JSON files, and write a script that compares them to the TypeScript interfaces. Run this script in CI. Alert on any field name or type drift.

```bash
# schema_drift_check.py — run in CI after tsc
import json
from fleet_platform.schemas.ansible import BootstrapResponse

schema = BootstrapResponse.model_json_schema()
with open("frontend/src/schemas/BootstrapResponse.json", "w") as f:
    json.dump(schema, f, indent=2)

# CI then runs: npx ts-json-schema-generator --validate
# Any field mismatch exits non-zero → merge blocked
```

## 6 Quality Gates — What Blocks Merge

CI is the last line of defence before code hits main. Every gate on this list must be green before a PR can merge. There are no exceptions — removing a gate "just this once" is how technical debt accumulates.

-   TypeScript builds with zero errors (`tsc --noEmit`)
-   Unit tests pass — 100% of them, zero allowed failures
-   Integration tests pass
-   E2E test count must not decrease from previous run
-   Coverage threshold maintained (target: ≥ 60% lines)
-   Contract schema drift check passes (zero drift)
-   No secrets detected in diff (pre-push hook via gitleaks or trufflehog)
-   PR description links to an issue and includes a test plan

**The pre-push hook is not optional.** Secret leaks are permanent. Once a key is committed to a public repo, it must be rotated even if you force-push — git history is replicated immediately. Catch secrets before they leave the machine.

## 7 Agile Quality

Quality is not a phase after development — it is woven into every sprint event.

Acceptance criteria first

Write acceptance criteria in the issue before assigning it. AC defines done. If you cannot write AC, the work is not ready for development.

Definition of Done

Code written + tests written + no new regressions + PR reviewed and approved. All four. A feature without tests is not done — it is a liability.

Test review is code review

Reviewers check test completeness, not just implementation. Ask: does this test actually catch the bug it claims to catch? Does it test behaviour or implementation? Would this test survive a refactor?

Sprint retrospective metrics

Review flakiness rate, coverage trend, and mutation score every sprint. Trends matter more than snapshots. A declining mutation score signals test quality degradation before coverage numbers show it.

## 8 Metrics to Track

| Metric | Target | How to measure |
| --- | --- | --- |
| Unit test coverage | ≥ 60% | pytest-cov, `--cov-fail-under=60` |
| Mutation score | ≥ 70% | mutmut — track surviving mutants per sprint |
| E2E flakiness rate | < 2% | Track retry count in CI logs over 4-week window |
| Contract drift | 0 fields | Schema comparison script in CI — exit non-zero on drift |
| MTTR (mean time to recovery) | < 1 sprint | Track time from incident detection to closed issue |
| Test suite duration | < 10 min | CI timing — fast suites get run; slow suites get skipped |

* * *
