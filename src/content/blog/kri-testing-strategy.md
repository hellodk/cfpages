---
title: "Testing kri: Reliability Engineering for a macOS Fleet Management Platform"
date: 2026-05-23
description: "How we ensure a fleet management platform stays reliable across bootstraps, drift checks, and Salt operations — and where the gaps still are."
tags: [kri, testing, strategy]
cover: "assets/images/covers/kri-testing-strategy.svg"
draft: false
---

How we ensure a fleet management platform stays reliable across bootstraps, drift checks, and Salt operations — and where the gaps still are.

## 1 kri's Testing Stack

kri uses a layered test stack that maps directly onto the testing pyramid. The current state is partially implemented — some layers are production-ready, some are planned. Planned items are shown with dashed borders in the diagram below.

<svg viewBox="0 0 640 380" width="100%" style="max-width:640px;display:block;margin:0 auto">
        <defs>
        </defs>
        <text x="16"  y="24" font-family="system-ui" font-size="11" font-weight="700" text-transform="uppercase" fill="#9CA3AF" letter-spacing="1">TOOL</text>
        <text x="270" y="24" font-family="system-ui" font-size="11" font-weight="700" fill="#9CA3AF" letter-spacing="1">LAYER</text>
        <text x="430" y="24" font-family="system-ui" font-size="11" font-weight="700" fill="#9CA3AF" letter-spacing="1">WHAT WE USE IT FOR</text>
        <line x1="0" y1="30" x2="640" y2="30" stroke="#E5E7EB" stroke-width="1"></line>
        <g class="tool-row-1">
          <rect x="8"   y="38" width="248" height="44" rx="8" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5"></rect>
          <text x="24"  y="57"  font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="700" fill="#15803D">pytest + asyncio</text>
          <text x="24"  y="73"  font-family="system-ui" font-size="11" fill="#166534">active</text>
          <rect x="264" y="46" width="88" height="28" rx="6" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1.5"></rect>
          <text x="308" y="65" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#15803D">Unit</text>
          <text x="430" y="55"  font-family="system-ui" font-size="12" fill="#4B5563">Isolated functions, mocked boundaries</text>
          <text x="430" y="72"  font-family="system-ui" font-size="11" fill="#6B7280">24 unit test files, real SQLite engine</text>
        </g>
        <g class="tool-row-2">
          <rect x="8"   y="90" width="248" height="44" rx="8" fill="#CFFAFE" stroke="#67E8F9" stroke-width="1.5"></rect>
          <text x="24"  y="109" font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="700" fill="#0E7490">pytest + real PG</text>
          <text x="24"  y="125" font-family="system-ui" font-size="11" fill="#155E75">active</text>
          <rect x="264" y="98" width="88" height="28" rx="6" fill="#CFFAFE" stroke="#67E8F9" stroke-width="1.5"></rect>
          <text x="308" y="117" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#0E7490">Integration</text>
          <text x="430" y="107" font-family="system-ui" font-size="12" fill="#4B5563">Real DB, full FastAPI stack, no mocks</text>
          <text x="430" y="124" font-family="system-ui" font-size="11" fill="#6B7280">18 integration test files, tx rollback</text>
        </g>
        <g class="tool-row-3">
          <rect x="8"   y="142" width="248" height="44" rx="8" fill="#F5F3FF" stroke="#C4B5FD" stroke-width="1.5" stroke-dasharray="6 3"></rect>
          <text x="24"  y="161" font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="700" fill="#7E22CE">Pydantic ↔ TypeScript</text>
          <text x="24"  y="177" font-family="system-ui" font-size="11" fill="#9333EA">planned — next sprint</text>
          <rect x="264" y="150" width="88" height="28" rx="6" fill="#F3E8FF" stroke="#C4B5FD" stroke-width="1.5"></rect>
          <text x="308" y="169" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#7E22CE">Contract</text>
          <text x="430" y="159" font-family="system-ui" font-size="12" fill="#4B5563">Schema drift detection script in CI</text>
          <text x="430" y="176" font-family="system-ui" font-size="11" fill="#6B7280">model_json_schema() vs TS interface</text>
        </g>
        <g class="tool-row-4">
          <rect x="8"   y="194" width="248" height="44" rx="8" fill="#FFFBEB" stroke="#FCD34D" stroke-width="1.5" stroke-dasharray="6 3"></rect>
          <text x="24"  y="213" font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="700" fill="#92400E">Vitest + Testing Library</text>
          <text x="24"  y="229" font-family="system-ui" font-size="11" fill="#D97706">planned</text>
          <rect x="264" y="202" width="88" height="28" rx="6" fill="#FEF9C3" stroke="#FCD34D" stroke-width="1.5"></rect>
          <text x="308" y="221" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#92400E">Component</text>
          <text x="430" y="211" font-family="system-ui" font-size="12" fill="#4B5563">React components in isolation</text>
          <text x="430" y="228" font-family="system-ui" font-size="11" fill="#6B7280">BootstrapModal, FleetDashboard, etc.</text>
        </g>
        <g class="tool-row-5">
          <rect x="8"   y="246" width="248" height="44" rx="8" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1.5"></rect>
          <text x="24"  y="265" font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="700" fill="#B91C1C">Playwright</text>
          <text x="24"  y="281" font-family="system-ui" font-size="11" fill="#DC2626">active</text>
          <rect x="264" y="254" width="88" height="28" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5"></rect>
          <text x="308" y="273" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#B91C1C">E2E</text>
          <text x="430" y="263" font-family="system-ui" font-size="12" fill="#4B5563">Full-stack journeys, real browser</text>
          <text x="430" y="280" font-family="system-ui" font-size="11" fill="#6B7280">200+ tests across 15 spec files</text>
        </g>
        <g class="tool-row-6">
          <rect x="8"   y="298" width="248" height="44" rx="8" fill="#F9FAFB" stroke="#D1D5DB" stroke-width="1.5" stroke-dasharray="6 3"></rect>
          <text x="24"  y="317" font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="700" fill="#4B5563">Hypothesis</text>
          <text x="24"  y="333" font-family="system-ui" font-size="11" fill="#9CA3AF">planned</text>
          <rect x="264" y="306" width="88" height="28" rx="6" fill="#F9FAFB" stroke="#D1D5DB" stroke-width="1.5"></rect>
          <text x="308" y="325" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#4B5563">Property</text>
          <text x="430" y="315" font-family="system-ui" font-size="12" fill="#4B5563">Random input invariants for parsers</text>
          <text x="430" y="332" font-family="system-ui" font-size="11" fill="#6B7280">grain extraction, minion ID validator</text>
        </g>
        <g class="tool-row-7">
          <rect x="8"   y="350" width="248" height="24" rx="8" fill="#F9FAFB" stroke="#D1D5DB" stroke-width="1.5" stroke-dasharray="6 3"></rect>
          <text x="24"  y="366" font-family="'SF Mono','Fira Code',monospace" font-size="13" font-weight="700" fill="#4B5563">mutmut</text>
          <rect x="264" y="350" width="88" height="24" rx="6" fill="#F9FAFB" stroke="#D1D5DB" stroke-width="1.5"></rect>
          <text x="308" y="366" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#4B5563">Mutation</text>
          <text x="430" y="363" font-family="system-ui" font-size="11" fill="#6B7280">planned — verifies test quality</text>
        </g>
      </svg>

Dashed borders = planned, not yet implemented. Solid borders = active in CI.

## 2 Journey Coverage Map

This table is the honest current state. It is updated per sprint. Every row with a red badge in the Coverage column represents a risk: if that journey breaks, no automated test will catch it.

| User Journey | Unit | Integration | E2E | Coverage |
| --- | --- | --- | --- | --- |
| Add / check node | ✓ check-minion-id | ✓ node_registration | ✓ fleet.spec.ts | Good |
| Bootstrap node | — | ✓ ansible_api | ✓ BOOT-01..22 | Partial |
| Salt key approval | — | — | — | None |
| Grain collection | — | ✓ ingest_grains | — | Partial |
| Drift detection | ✓ drift_engine | ✓ drift_api | ✓ DRIFT-* | Good |
| SBOM scan | ✓ sbom_parser | ✓ sbom_api | ✓ partial | Partial |
| Security dashboard | — | — | ✓ SEC-01..06 | Partial |
| Node secrets → pillar | — | — | — | None |
| Group secrets | — | ✓ groups_api | ✓ partial | Partial |
| Minion key lifecycle | — | — | — | None |
| Playbook execution | ✓ playbook_tasks | ✓ playbook_api | ✓ PLAY-01..21 | Good |
| Auth & sessions | ✓ auth_core | ✓ auth_endpoints | ✓ AUTH-01..07 | Good |

## 3 Contract Testing in kri — A Live Example

The bootstrap endpoint is the most operationally critical path in kri: it installs Salt, configures the Mac Mini, and creates the minion's PKI identity. A contract break here means operators see a broken modal with no error message.

### The Pydantic contract (producer)

The backend's `BootstrapResponse` Pydantic model defines exactly what the API will return. FastAPI validates every response against this schema at runtime.

```bash
# fleet_platform/schemas/ansible.py
class BootstrapResponse(BaseModel):
    node_id: uuid.UUID
    minion_id: str
    job_id: str
    bootstrap_status: str
    message: str
    salt_key_deleted: bool = False   # ← added in the re-bootstrap fix
```

### The TypeScript contract (consumer)

The frontend's `BootstrapResponse` interface in `frontend/src/api/ansible.ts` defines what the React code expects to receive.

```js
// frontend/src/api/ansible.ts  — current state
export interface BootstrapResponse {
  node_id: string
  minion_id: string
  job_id: string
  bootstrap_status: string
  message: string
  // salt_key_deleted is absent — the contract has drifted
}
```

**The gap is live right now.** The backend sends `salt_key_deleted: true` when a stale Salt key is removed before re-bootstrap. The frontend TypeScript interface does not declare this field. The frontend cannot display this information — it is silently discarded. If the frontend ever needs to show a warning like "old Salt key was removed — node will re-register", it currently has no typed way to access that field.

### What a contract test would catch

```bash
# schema_drift_check.py — run in CI
import json
from fleet_platform.schemas.ansible import BootstrapResponse

actual = BootstrapResponse.model_json_schema()
expected_fields = {"node_id", "minion_id", "job_id",
                   "bootstrap_status", "message", "salt_key_deleted"}

actual_fields = set(actual["properties"].keys())
drift = expected_fields.symmetric_difference(actual_fields)
if drift:
    print(f"Contract drift: {drift}")
    exit(1)   # ← blocks merge
```

## 4 Unit Testing Pattern — Annotated

kri's unit tests use an async-first pattern with module-scoped fixtures. This pattern keeps test setup cost low — the database engine is created once per module, not per test — while keeping each test isolated through session rollback.

tests/unit/test\_check\_minion\_id.py

```bash
# Module-scoped engine — created once for the whole file.
# Creates all tables, tears them down at the end.
@pytest_asyncio.fixture(scope="module", loop_scope="module")
async def test_engine():
    engine = create_async_engine(settings.test_database_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

# Rate limiter is swapped for an in-memory fake — no Redis needed.
# DB dependency is overridden to use the test engine.
async def app_with_test_db(test_engine):
    test_limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
    app.dependency_overrides[deps.get_db] = override_get_db
    app.dependency_overrides[deps.get_redis] = override_get_redis
    return app

# Tests themselves are pure assertions — no setup logic.
async def test_taken_minion_id(admin_client, existing_node):
    response = await admin_client.get(
        "/api/v1/fleet/nodes/check-minion-id",
        params={"id": existing_node.minion_id},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert data["existing_node"]["hostname"] == existing_node.hostname
```

**What this pattern mocks vs. what it does not:** Redis is mocked (no side effects needed). The rate limiter is replaced with an in-memory fake. The database is real (SQLite async engine) — because SQL query correctness is what we are testing. The FastAPI app layer is real. This tests the full request/response cycle without any network.

### What the six tests cover

The `test_check_minion_id.py` file covers six scenarios for a single endpoint: available ID, taken ID with full node summary, invalid character formats (four variants), authentication required, missing query parameter, and all valid character classes (dots, hyphens, underscores, uppercase). This is the happy path + auth failure + invalid input pattern that every endpoint should have.

## 5 E2E Test Anatomy — Annotated

Here is a complete E2E test from `bootstrap.spec.ts`, annotated to explain every structural decision.

tests/e2e/bootstrap.spec.ts — BOOT-04

```js
/**
 * BOOT-04 IP field locked for existing node
 * Tests user behaviour, not implementation detail.
 */
test.describe('Bootstrap Node', () => {

  // beforeEach logs in via API (not UI) — skips 4 interactive steps.
  // This alone saves ~3,000 tokens per test file run.
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page)
  })

  // Test ID in name → traceable to TEST_CASES.md
  test('BOOT-04 IP field locked for existing node', async ({ page }) => {
    // Navigate to the feature — no hardcoded /fleet URL
    await page.click('button:has-text("+ Bootstrap Node")')

    // Type a node ID known to be in the live fleet DB
    await page.fill('input[placeholder="mac-mini-01"]', 'mm1')

    // Wait for async lookup — uses toBeVisible with explicit timeout
    await expect(page.locator('text=Node found in fleet'))
      .toBeVisible({ timeout: 5000 })

    // Assert the behaviour the user cares about:
    // the IP field is readonly when a node is found.
    // We check the attribute, not a CSS class or internal state.
    const ipInput = page.locator('input[placeholder="203.0.113.111"]')
    await expect(ipInput).toHaveAttribute('readonly')

    await page.locator('button:has-text("×")').click()
  })
})
```

**What this test deliberately does NOT check:** it does not assert on CSS classes, internal React state, or component hierarchy. It asserts that the IP input is readonly — the user-visible behaviour. If the component is refactored internally, this test will still pass. That is the correct level of abstraction for an E2E test.

### The login helper — the single most impactful optimisation

```js
// helpers.ts — bypasses the login UI entirely
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

## 6 The Gaps — Honest Assessment

Honest gap lists are more useful than optimistic coverage numbers. These are the areas where a regression would not be caught by any automated test today.

-   🔴

    Contract drift detection script The `salt_key_deleted` field drift is live today and undetected by CI. A script that exports Pydantic JSON schemas and diffs them against TypeScript interfaces needs to be written and wired into CI. Planned for next sprint.

-   🔴

    Salt key lifecycle E2E No test verifies the full sequence: minion key appears in pending, operator approves it, node transitions to accepted. This is a critical operational flow with zero test coverage.

-   🔴

    Node secrets → pillar integration When node secrets are saved, they should appear in the pillar file at the correct path. No integration test verifies the write, the path structure, or the encryption round-trip.

-   🟡

    Visual regression baseline No visual regression tests exist. The UI is still changing frequently enough that maintaining a baseline would be expensive. Planned once the dashboard layout stabilises.

-   🟡

    Property-based tests for grain extraction Grain extraction handles arbitrary Salt return data. Hypothesis tests that generate random grain dictionaries would find edge cases faster than hand-written examples. Planned alongside integration test expansion.

-   🟡

    Mutation score baseline mutmut has not been run on the unit test suite. We do not know what percentage of mutations are caught. Target: ≥ 70% score. Running it once will identify which modules need stronger tests.

## 7 TDD in Practice — The Salt Key Fix

When re-bootstrapping a node that already had a Salt key accepted, the master cached the old public key, causing authentication to loop indefinitely. Here is how this feature was built using TDD.

-   Issue created with acceptance criteria AC: "When bootstrap is triggered on a node with an existing accepted key, the old key file at `$SALT_PKI_DIR/minions/{minion_id}` must be deleted before the Celery task is dispatched. The response must include `salt_key_deleted: true` when deletion occurred."

-   Unit test written first (failing) A test was written that mocked the PKI directory, placed a fake key file, called the bootstrap endpoint, and asserted `salt_key_deleted` was `true` in the response and the file was gone. This test failed because the field did not exist yet.

-   Implementation written to make the test pass The route handler was extended to check for and delete the existing key before dispatching the Celery task. `salt_key_deleted: bool = False` was added to `BootstrapResponse`. The unit test turned green.

-   E2E test added for the UI warning BOOT-21 was added to `bootstrap.spec.ts`: re-bootstrap a known node and assert that the modal shows a visual indicator that a re-bootstrap (not first-time bootstrap) is underway. This test covers the user-visible consequence of the fix.

-   Contract gap identified (post-mortem) The TypeScript `BootstrapResponse` interface was not updated to include `salt_key_deleted`. This was not caught because there was no contract drift check in CI. This gap is now on the roadmap as the highest-priority testing task.

**The lesson:** the TDD cycle caught the backend logic. The missing contract test allowed a field to be added on one side without updating the other. The fix is a CI-enforced schema comparison, not better human memory.

* * *
