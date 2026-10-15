---
title: "Git Branching Strategy for AI-Assisted Development — Complete Visual Guide"
date: 2026-08-02
description: "Four real options, not two. GitFlow is too heavy for a codebase where AI agents open PRs continuously; GitHub Flow is too loose once AI-generated code needs a supervised gate before production. The strategy below, Integration-Gate Flow, is a Trunk-Based Development variant — it keeps TBD's"
tags: [git, ai, workflow]
draft: false
---

Integration-Gate Flow · CI/CD Pipelines · Security · OpenTelemetry · Policy as Code — for Human + AI Agent Teams

## Integration-Gate Flow

A Trunk-Based Development variant built for teams where AI agents and humans both open pull requests. It keeps TBD's short-lived-branch discipline and adds exactly the one thing standard TBD lacks: a supervised `integration` branch that gates every AI-generated change — with nightly integration, performance, DAST, chaos, and mutation tests — before it's release-eligible.

TL;DR

-   One branching model, not four: Integration-Gate Flow = Trunk-Based Development + one gated `integration` branch
-   AI agents get their own `ai/*` branches — can never merge without AI Review + Human Review + Security Review
-   Same 9 PR-pipeline stages and 11 security gates for every surface: backend, web, and mobile
-   No direct commits to `main`, `release/*`, or `integration` — ever, by anyone or anything
-   Semver and changelogs are computed from Conventional Commits, never hand-written
-   Local git hooks are fast feedback only — every check has a required CI status-check twin that can't be bypassed
-   Monorepo, not polyrepo — one security/OTel/policy config to keep current instead of four

**8**Branch Types

**9**PR Pipeline Stages

**11**Security Gates

**6**Animated Pipelines

**18**AI Guardrails

1

### Branch Architecture

Eight branch types, why Integration-Gate Flow beats GitFlow/GitHub Flow/Trunk-Based, monorepo vs. polyrepo.

8 Branch Types

2

### Pipelines

Six animated pipelines: PR review, security gates, backend release, mobile release, semver, end-to-end.

6 Pipelines · 11 Security Gates

3

### Hooks · Webhooks · Governance

Client/server hooks with bypass reporting, AI guardrails, OpenTelemetry, branch protection, policies.

18 AI Guardrails

4

### Centralized Governance

One hooks/policy repo, every application repo consumes it — code, Terraform, Helm — plus the answer for repos you don't administer.

4 Enforcement Layers

## Branch Architecture

### Branching Strategies Compared

Four real options, not two. GitFlow is too heavy for a codebase where AI agents open PRs continuously; GitHub Flow is too loose once AI-generated code needs a supervised gate before production. The strategy below, **Integration-Gate Flow**, is a Trunk-Based Development variant — it keeps TBD's short-lived-branch discipline and adds exactly the one thing standard TBD lacks: a supervised `integration` branch that gates AI output before it's release-eligible.

| Strategy | Core Idea | Best Fit | Why (Not) Here |
| --- | --- | --- | --- |
| GitFlow | Long-lived `develop`, formal `release`/`hotfix` branches, scheduled merges | Shrink-wrapped software, versioned on-prem releases | Too much ceremony for continuous AI PR volume — `develop` adds a layer without adding a security gate |
| GitHub Flow | `main` + short-lived feature branches, deploy on merge | Small teams, single deployable, fully trusted contributors | Too loose — no supervised space to gate AI-generated code before it's one merge from production |
| Trunk-Based Dev | Everyone commits to trunk; feature flags hide incomplete work | High-maturity teams with strong test coverage and flag infrastructure | The direct ancestor of Integration-Gate Flow below — but leans on flags instead of a reviewed branch to contain AI output, and has no dedicated slot for nightly integration/DAST/chaos runs |
| Integration-Gate Flow | Trunk-Based Development, plus one supervised `integration` branch as a review-and-test buffer | Multi-surface teams (UI/backend/frontend/mobile) mixing AI agents and humans | **Selected** — the minimum structure that gives AI output a gated holding area with nightly integration/perf/DAST/chaos/mutation tests, without GitFlow's `develop`/`release` ceremony |

Three properties Integration-Gate Flow specifically buys for AI-assisted development:

### Multiple AI Agents + Humans

Every AI agent owns its own `ai/<feature>` branch. Agents never touch `main`, `release/*`, or `integration` directly — they can only propose a PR.

### Release Traceability

Every artifact that reaches `main` is squash-merged, signed, tagged, and shipped with an SBOM and attestation — any production commit maps 1:1 to a PR, a set of scans, and a build.

### Fast Rollback

Squash-only history on `main` plus immutable, signed, tagged release images means rollback is `kubectl rollout undo` or re-deploying the previous signed tag — never a revert-and-pray.

### The Branch Model

Eight branch types, one direction of promotion. Features, AI-generated code, and bug fixes flow _up_ through `integration` → `release/*` → `main`. `hotfix/*` is the one branch allowed to move sideways into all three protected branches at once. `experiment/*` never merges — it exists purely to be cherry-picked from.

Branch topology — animated

<svg id="svg-tree" viewBox="0 0 960 460" aria-label="Branch topology diagram">
      <defs>
        <marker id="arrIndigo" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><polygon points="0 0,9 4,0 8" fill="#8C94E8"></polygon></marker>
        <marker id="arrRed" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><polygon points="0 0,9 4,0 8" fill="#E38A82"></polygon></marker>
      </defs>
      <path id="bt-p1" d="M200,126 L200,79" fill="none" stroke="#8C94E8" stroke-width="1.75" opacity=".9" marker-end="url(#arrIndigo)"></path>
      <path id="bt-p2" d="M200,221 L200,174" fill="none" stroke="#8C94E8" stroke-width="1.75" opacity=".9" marker-end="url(#arrIndigo)"></path>
      <path d="M140,356 L140,310" fill="none" stroke="#C7CBF0" stroke-width="1.75"></path>
      <path d="M370,356 L370,310" fill="none" stroke="#C7CBF0" stroke-width="1.75"></path>
      <path d="M600,356 L600,310" fill="none" stroke="#C7CBF0" stroke-width="1.75"></path>
      <path d="M140,310 L600,310" fill="none" stroke="#C7CBF0" stroke-width="1.75"></path>
      <path id="bt-p7" d="M200,310 L200,269" fill="none" stroke="#8C94E8" stroke-width="1.75" opacity=".9" marker-end="url(#arrIndigo)"></path>
      <path id="bt-p8" d="M300,55 L830,55 L830,126" fill="none" stroke="#E38A82" stroke-width="1.75" opacity=".9" marker-end="url(#arrRed)"></path>
      <path d="M745,150 L300,150" fill="none" stroke="#E38A82" stroke-width="1.75" opacity=".9" marker-end="url(#arrRed)"></path>
      <path id="bt-p10" d="M830,174 L830,245 L310,245" fill="none" stroke="#E38A82" stroke-width="1.75" opacity=".9" marker-end="url(#arrRed)"></path>
      <path d="M745,320 L655,320" fill="none" stroke="#A8A29E" stroke-width="1.75" stroke-dasharray="4 3" opacity=".85"></path>
      <circle cx="655" cy="320" r="3.5" fill="#A8A29E"></circle>
      <text x="700" y="337" text-anchor="middle" font-size="12" font-weight="600" fill="#4B5563">cherry-pick only</text>
      <circle r="3.3" fill="#6B74D6"><animateMotion dur="2.4s" repeatCount="indefinite" path="M200,126 L200,79"></animateMotion></circle>
      <circle r="3.3" fill="#6B74D6"><animateMotion dur="2.4s" begin=".8s" repeatCount="indefinite" path="M200,221 L200,174"></animateMotion></circle>
      <circle r="3.3" fill="#6B74D6"><animateMotion dur="2.4s" begin="1.6s" repeatCount="indefinite" path="M200,310 L200,269"></animateMotion></circle>
      <circle r="3.3" fill="#D46A60"><animateMotion dur="3s" repeatCount="indefinite" path="M300,55 L830,55 L830,126"></animateMotion></circle>
      <circle r="3.3" fill="#D46A60"><animateMotion dur="3s" begin="1.5s" repeatCount="indefinite" path="M830,174 L830,245 L310,245"></animateMotion></circle>
      <circle cx="200" cy="245" r="118" fill="none" stroke="#8C94E8" stroke-width="1.5" opacity=".35">
        <animate attributeName="r" values="112;150" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".35;0" dur="2.4s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="100" y="31" width="200" height="48" rx="10" fill="#EEF4FF" stroke="#B9D2FA" stroke-width="1.75"></rect>
      <circle cx="286" cy="45" r="4" fill="#2451C4"></circle>
      <text x="200" y="51" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">main</text>
      <text x="200" y="67" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">Production Only</text>
      <rect x="100" y="126" width="200" height="48" rx="10" fill="#F4F1FE" stroke="#D2C7F7" stroke-width="1.75"></rect>
      <circle cx="286" cy="140" r="4" fill="#6B3FD1"></circle>
      <text x="200" y="146" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">release/vX.Y</text>
      <text x="200" y="163" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">UAT · Regression · Security</text>
      <rect x="90" y="221" width="220" height="48" rx="10" fill="#1E1B3A" stroke="#8C94E8" stroke-width="2"></rect>
      <text x="200" y="241" text-anchor="middle" font-size="13" font-weight="700" fill="#F9FAFB">integration</text>
      <text x="200" y="258" text-anchor="middle" font-size="12" font-weight="500" fill="#C7CBF0">AI + Human Playground</text>
      <rect x="55" y="356" width="170" height="48" rx="10" fill="#EFF9FF" stroke="#A9DEF5" stroke-width="1.75"></rect>
      <circle cx="211" cy="370" r="4" fill="#0B7AA8"></circle>
      <text x="140" y="376" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">ai/&lt;feature&gt;</text>
      <text x="140" y="393" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">AI Agent Owned</text>
      <rect x="285" y="356" width="170" height="48" rx="10" fill="#EFFBF3" stroke="#A9E4C1" stroke-width="1.75"></rect>
      <circle cx="441" cy="370" r="4" fill="#157A47"></circle>
      <text x="370" y="376" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">feature/&lt;jira&gt;</text>
      <text x="370" y="393" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">Human Feature Work</text>
      <rect x="515" y="356" width="170" height="48" rx="10" fill="#FEF7EC" stroke="#F3D18F" stroke-width="1.75"></rect>
      <circle cx="671" cy="370" r="4" fill="#9A5B0A"></circle>
      <text x="600" y="376" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">bugfix/&lt;jira&gt;</text>
      <text x="600" y="393" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">Human Bug Fix</text>
      <rect x="745" y="126" width="170" height="48" rx="10" fill="#FDF0EF" stroke="#F0AEA8" stroke-width="1.75"></rect>
      <circle cx="901" cy="140" r="4" fill="#A5372F"></circle>
      <text x="830" y="146" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">hotfix/&lt;jira&gt;</text>
      <text x="830" y="163" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">Emergency Patch</text>
      <rect x="745" y="296" width="170" height="48" rx="10" fill="#F7F6F4" stroke="#D3CFC8" stroke-width="1.75" stroke-dasharray="6 3"></rect>
      <circle cx="901" cy="310" r="4" fill="#78716C"></circle>
      <text x="830" y="316" text-anchor="middle" font-size="12.5" font-weight="700" fill="#374151">experiment/&lt;topic&gt;</text>
      <text x="830" y="333" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">No Guarantees</text>
    </svg>

Promotion Path (Feature → Integration → Release → Main)

Hotfix — Created From Main, Synced To All Three

Experiment — Cherry-Pick Only, Never Merged

main

Production only. The single source of truth for what is running live.

**Merges from:**release/\*, hotfix/\*

**Protection:**Signed commits, CODEOWNERS, no force-push, no merge commits, squash only

**On every merge:**Tag release · attach SBOM · attach attestations

release/vX.Y

Cut from integration for UAT, regression, and security validation.

**Merges from:**integration, hotfix/\*

**Merges to:**main

**Rule:**No new features — bug fixes only

integration

The AI playground. Every UI, backend, frontend, mobile, and AI-generated PR lands here first.

**Merges from:**feature/\*, ai/\*, bugfix/\*, hotfix/\*

**Nightly:**Integration tests · performance · DAST · chaos · mutation tests

ai/<feature>

Owned by AI agents — e.g. `ai/refactor-payment`, `ai/new-ui`, `ai/improve-auth`, `ai/graphql`, `ai/optimize-api`.

**Rule:**Cannot merge directly — requires AI Review + Human Review + Security Review + passing tests

feature/<jira>

One feature per branch. Deleted immediately after merge.

**Merges to:**integration

bugfix/<jira>

Standard bug fix tied to a ticket, same review path as feature/\*.

**Merges to:**integration

hotfix/<jira>

Emergency production patch — the one branch allowed to move sideways.

**Created from:**main

**Merges into:**main, release/\*, integration

experiment/<topic>

Spikes and prototypes — e.g. `experiment/langgraph`, `experiment/new-cache`, `experiment/ollama`.

**Rule:**No guarantees. Never merged directly. Cherry-pick only.

<aside class="callout"><strong class="callout__title">Never allowed:</strong><div class="callout__body">direct commits to <code>main</code>, <code>release/*</code>, or <code>integration</code> — under any circumstances, by any human or agent. Every change enters through a pull request.</div></aside>

### Repository Layout

One repo, one graph, clear ownership per surface. Security, telemetry, and infra live as first-class top-level directories — not bolted on inside each app.

```bash
repo/
├── ui/              # design system + shared components
├── backend/         # services, APIs, workers
├── frontend/        # web application
├── mobile/          # iOS + Android apps
├── shared/          # cross-surface types, utils, constants
├── terraform/       # cloud infrastructure as code
├── helm/            # kubernetes helm charts
├── k8s/             # raw manifests, kustomize overlays
├── .github/         # workflows, CODEOWNERS, PR/issue templates
├── otel/            # collector config, dashboards, alert rules
├── security/        # OPA/Kyverno policies, scan configs
├── docs/            # architecture docs, ADRs
├── scripts/         # unified CLI entry point
├── api/             # OpenAPI specs
└── protobuf/        # gRPC/proto contracts
```

### Monorepo vs. Polyrepo

The layout above is a monorepo — `ui/`, `backend/`, `frontend/`, and `mobile/` all live in one repository, one `integration` branch, one set of branch-protection rules. That's a deliberate choice, not a default.

## Monorepo — Selected

**Buys:** one PR can touch `shared/`, `backend/`, and `frontend/` atomically — no cross-repo version pinning when an API contract changes. One CODEOWNERS file, one security pipeline, one OTel/policy config to keep current instead of four. An AI agent refactoring an API and its three callers does it in a single reviewable PR.

**Costs:** CI must be scoped by path filters (see the Terraform/Helm hooks) or every PR triggers every pipeline. Requires a build system that understands partial builds (Nx/Turborepo/Bazel-style) once the repo gets large.

## Polyrepo — Rejected Here

**Buys:** hard isolation — a mobile team can't accidentally break the backend build. Independent release cadences and independent access control per repo out of the box.

**Costs:** a cross-surface change becomes N coordinated PRs across N repos, each needing its own review and its own security pipeline run. For a small set of AI agents already producing a high PR volume, that multiplies the exact review load this branch model exists to control — and CODEOWNERS, OTel config, and policy rules must be kept in sync by hand across every repo.

<aside class="callout"><strong class="callout__title">Why monorepo wins here:</strong><div class="callout__body">the AI-guardrail and security-gate machinery in this guide has to be configured and kept current exactly once. Polyrepo would mean replicating branch protection, CODEOWNERS, the security pipeline, and the OTel requirements across every surface's repo — more places for the gate to silently drift out of sync, which is the one failure mode Integration-Gate Flow is built to prevent.</div></aside>

### Branch Naming & Commit Convention

Naming carries information the tooling depends on — the pre-push hook, the CI pipeline, and the changelog generator all parse these patterns.

## Branch Naming

Ticket + owner, not a free-text description — `git blame` → branch → owner is then a one-step lookup, and two people never collide on the same ticket. Enforced by the `pre-commit` hook and its CI twin (Tab 3).

| Pattern | Example |
| --- | --- |
| feature/JIRA-user | feature/ABC-145-hellodk |
| bugfix/JIRA-user | bugfix/ABC-240-hellodk |
| hotfix/JIRA-user | hotfix/ABC-520-hellodk |
| ai/JIRA-agent | ai/ABC-300-agent |
| release/vX.Y | release/v1.4 |
| experiment/topic | experiment/new-ui — exempt, no ticket required |

## Conventional Commits

| Prefix | Example |
| --- | --- |
| feat: | feat(auth): add OAuth login |
| fix: | fix(cart): correct tax rounding |
| perf: | perf(api): cache user lookups |
| security: | security(api): validate JWT |
| refactor: | refactor(ui): extract Button |
| docs: | docs(readme): update setup |
| build: | build(deps): bump pnpm lock |
| ci: | ci(workflow): add SBOM step |
| test: | test(payments): add contract test |
| otel: | otel(api): add payment span |
| ai: | ai(ui): generated dashboard |

## Pipelines

### Pipeline Overview

Six pipelines, one per moment in a change's life — from a PR being opened to a signed tag running in production. They used to be split across tabs; they're grouped here in the order a change actually passes through them: **PR review → security gates → backend release → mobile release → semantic versioning → the end-to-end picture.**

### 1 · The PR Pipeline

Every change — human or AI — travels the same nine-stage path before it can land on `integration`. Nothing skips a stage; there is no "trusted author" bypass, including for AI agents.

Developer / agent to merge — animated

### 2 · Security Pipeline

Eleven gates between a commit and a running, monitored container. Any one of them failing blocks the deploy — there is no override that isn't logged and reviewed.

Secrets to deploy — animated

## Security Tooling — Open Source vs. Enterprise

Every gate has a default. Where the org licenses a commercial platform, it slots into the same gate rather than adding a new one. `SCA` below covers open-source component analysis (dependency/license risk, sometimes shortened "OSA").

| Security Gate | Tool Options |
| --- | --- |
| SAST | OSSSemgrep, CodeQL   EnterpriseSonarQube |
| Code Coverage | EnterpriseSonarQube   OSScoverage.py / JaCoCo / Istanbul |
| SCA / Dependency (OSA) | OSSOWASP Dependency-Check   EnterpriseCheckmarx OSA |
| IaC / Config Scan | OSStflint   EnterpriseCheckmarx |
| License Scan | EnterpriseCheckmarx |
| Container / Image Scan | OSSClair   EnterprisePrisma Cloud |
| SBOM | EnterpriseCheckmarx |
| Image Signing | OSSCosign (Sigstore) |
| Image Registry | OSSQuay (self-hosted)   EnterpriseRed Hat Quay, Quay.io |
| K8s Admission Enforcement | OSSKyverno, OPA / Conftest |
| Runtime Protection (Backend) | EnterprisePrisma Cloud (Defender) |
| Runtime Protection (Mobile / RASP) | EnterpriseAppdome, Guardsquare, Promon |

### 3 · Backend & Web Release Pipeline

Seventeen stages from a merged PR to a verified production rollout, for every surface that ships as a container — backend services and the containerized web frontend. `Approval` is the one manual human gate in the entire chain — everything before and after it is automated.

Merge to production, with post-deployment verification — animated

## Helm Release Hooks — Not the Same Thing as `helm-ci`

The `helm-ci` check in Tab 3 lints the chart at PR time. Helm's own **release hooks** are a separate, native mechanism — Kubernetes Jobs annotated `helm.sh/hook: ...` that run at deploy time, when `helm install`/`upgrade` actually executes against the cluster. They slot directly into the stages already shown above.

| Hook | Typical Job | Maps to Pipeline Stage |
| --- | --- | --- |
| pre-install / pre-upgrade | DB schema migration, config validation | Runs before `Deploy Dev` / `Deploy QA` / `Production` — a failure here aborts the release, nothing new is applied |
| post-install / post-upgrade | Smoke-test Job, Slack/webhook notification | `Smoke` |
| test | `helm test` Job, run on demand post-deploy | `Integration` / `Post-Deploy` |
| pre-rollback / post-rollback | State snapshot, post-rollback verification | Fires automatically on `helm rollback` — the "Fast Rollback" path from Tab 1 |
| pre-delete / post-delete | Backup Job, external resource cleanup (DNS, LB) | Decommissioning — outside the normal promotion path |

**Failure policy:** if a `pre-*` hook Job fails, Helm halts before touching any release resources — the same fail-closed guarantee the rest of this pipeline relies on. Hook ordering within a phase is controlled by `helm.sh/hook-weight`; cleanup of one-shot hook Jobs is controlled by `helm.sh/hook-delete-policy`.

<aside class="callout"><strong class="callout__title">Working chart, not just a table:</strong><div class="callout__body"><a href="https://github.com/hellodk/github-ci-cd/tree/main/helm/example-service" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">helm/example-service</a> implements all 5 hook points above with the annotations that matter in production (<code>hook-weight</code>, <code>hook-delete-policy</code>, <code>restartPolicy: Never</code>, <code>backoffLimit</code>/<code>activeDeadlineSeconds</code>) — <code>helm lint</code> and <code>helm template</code> clean. Its <a href="https://github.com/hellodk/github-ci-cd/tree/main/helm/example-service#edge-cases-the-part-the-annotations-alone-dont-tell-you" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">README</a> covers 11 edge cases the table above can't: post-hook failures don't roll back an already-live release (<code>--atomic</code> fixes this), <code>test</code> never runs automatically, why the delete policy is deliberately not <code>hook-failed</code>, idempotency requirements, and more.</div></aside>

### 4 · Mobile Release Pipeline — Android & iOS

The "frontend" delivery pipeline for the two app-store surfaces. It shares the same PR-review and CI gates as everything else, but diverges after that — there's no Kubernetes canary for a mobile app; there's a device farm, a store review queue, an in-app runtime guard, and a phased rollout instead.

Merge to app store, with real-device testing and in-app protection — animated

## Build & Test

-   Android built via Gradle, iOS via Xcode / Fastlane
-   Unit + UI tests run per platform (Espresso, XCUITest)
-   Real-device regression on HeadSpin's device farm — actual hardware, not just emulators/simulators
-   Beta build pushed to TestFlight (iOS) and the Play Console internal/closed track (Android)

## Ship & Protect

-   QA sign-off is the human gate — same role as `Approval` in the backend pipeline
-   Submitted to App Store Connect and the Google Play Console
-   Store review queue is outside our control — build time budgets for it
-   RASP (Runtime Application Self-Protection) SDK embedded at build time — guards the live app against tampering, rooting/jailbreak, and hooking frameworks post-install
-   Phased/staged rollout percentage in both stores before 100%

### 5 · Semantic Versioning & Automated Release Notes

The version number and the changelog are both _computed_, not written by hand. Both are derived from the same input the `commit-msg` hook already enforces: Conventional Commits.

<aside class="callout"><strong class="callout__title">Semver does not roll over at 99.</strong><div class="callout__body">MAJOR, MINOR, and PATCH are each an independent, uncapped integer — there is no odometer digit limit. <code>1.1.99</code> followed by another <code>fix:</code> commit is <code>1.1.100</code>, not <code>1.2.0</code>. A segment only resets to zero when a <em>higher</em> segment increments: a <code>feat:</code> resets PATCH; a breaking change resets MINOR and PATCH.</div></aside>

## Bump Rule — Highest-Precedence Commit Since the Last Tag Wins

| Commits Since Last Tag | Bump | Example |
| --- | --- | --- |
| Any `BREAKING CHANGE:` footer, or a `type!` | Major — resets MINOR + PATCH | 1.1.99 → 2.0.0 |
| At least one `feat:`, no breaking change | Minor — resets PATCH | 1.1.99 → 1.2.0 |
| Only `fix:` / `perf:` / `security:` | Patch | 1.1.99 → 1.1.100 |
| Only `docs:` / `build:` / `ci:` / `test:` / `refactor:` / `otel:` / `ai:` | No release cut | 1.1.99 stays 1.1.99 |

Commit to signed, versioned tag — animated

## Release-PR Model — Recommended

`release-please` maintains a standing, auto-updated "Release PR" that accumulates the version bump and changelog as commits land on `release/*`. Nothing is tagged until that PR is merged.

This fits the model directly — the Release PR _is_ the "Approval" human gate already in the release pipeline. Merging it is what triggers tag, sign, and attest.

## Continuous Model — Alternative

`semantic-release` computes the bump and publishes a tag on every merge to `release/*`, with no pause for review. Faster, but removes the human checkpoint — only appropriate if `release/*` is already fully covered by the required reviews in the branch-protection table.

## Changelog Section Mapping

Only `feat`, `fix`, and `perf` exist in the default Angular commit preset most release tools ship with. `security`, `otel`, and `ai` are all custom to this convention and need an explicit type map in `.release-please-config.json` / `.releaserc` — without it, commits using those three prefixes are silently dropped from the notes.

| Prefix | Changelog Section |
| --- | --- |
| feat: | Features |
| fix: | Bug Fixes |
| perf: | Performance |
| security: | Security |
| ai: | AI-Generated Changes |
| otel: | Observability |
| refactor: / docs: / build: / ci: / test: | Hidden from notes (internal only) |

<aside class="callout"><strong class="callout__title">Enforcement lever:</strong><div class="callout__body">there is no separate release-notes check to pass or fail — <code>commit-msg</code> is the enforcement point. A commit that doesn't match Conventional Commits never lands, so a malformed or missing changelog entry is structurally impossible, not just discouraged.</div></aside>

### 6 · Recommended End-to-End Flow

Every pipeline above, in one path — from a developer or an AI agent opening a branch, to a verified rollout on `main`.

Developer / AI agent to production — animated

<aside class="callout"><div class="callout__body">Integration-Gate Flow scales across UI, backend, frontend, mobile, and AI-assisted development while enforcing security, observability, provenance, and release governance at every stage — the same nine PR-pipeline stages and eleven security gates apply regardless of which surface the change touches.</div></aside>

## Hooks · Webhooks · Governance

### Git Hooks

Two groups: hooks that run on the laptop or agent sandbox before code ever leaves it, and hooks that run server-side in CI once a PR is open. `git commit` runs `pre-commit` → `prepare-commit-msg` → `commit-msg` → `post-commit` in that order; `git push` is a separate command that later runs `pre-push`.

<aside class="callout"><strong class="callout__title">This isn't just documentation — it's running.</strong><div class="callout__body">Every hook below is a real, tested script in <a href="https://github.com/hellodk/github-ci-cd" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">github.com/hellodk/github-ci-cd</a>: <code>.pre-commit-config.yaml</code> + <code>scripts/</code> for the client-side hooks, <code>.github/workflows/</code> for their CI-side twins. <code>pip install pre-commit && pre-commit install</code> activates them in a clone.</div></aside>

<aside class="callout"><strong class="callout__title">Local hooks are fast feedback, not the enforcement boundary.</strong><div class="callout__body">Every local check below has a required-status-check twin in CI. Skipping a local hook — deliberately with <code>--no-verify</code>, or because a tool isn't installed — just means finding out at the PR instead of on the laptop. Nothing reaches <code>main</code> without the CI-side check passing regardless of what ran locally.</div></aside>

Client-Side Hooks — Run Locally

## pre-commit

**Purpose:**Formatting, linting, secret scan, IaC scan, Helm lint, Terraform validate, unit tests, license check, SBOM generation, branch naming convention — the cheapest place to catch a problem, before it becomes a CI minute.

**If not applicable:**Each file-scoped sub-check no-ops rather than failing — e.g. no `.tf` staged skips `terraform fmt`/`validate` entirely. Branch naming is the exception: like `commit-msg`, it always applies — every commit happens on some branch, checked against the [naming patterns in Tab 1](#).

**Bypass reporting:**`git commit --no-verify` skips this hook silently on the laptop, but every one of these checks re-runs as a required CI status check on the PR — a bypassed commit fails later, not never.

pre-commitgitleakstrufflehog terraform fmtterraform validatetflint checkmarxhelm lintyamllint eslintruffgolangci-lint spotlessktlintswiftlint

## pre-commit — ticket traceability

**Purpose:**Warns when a newly added `HACK`/`WORKAROUND`/`XXX` line has no ticket ID on it. The branch name and commit trailer already give `git blame` a ticket for free on _every_ line — this exists only for lines where that isn't enough, because a skimming reader needs the explanation right there.

**If not applicable:**No marker words in the diff — nothing to warn about, silent pass.

**Bypass reporting:**_Not applicable_ — deliberately non-blocking (exit 0 always). Requiring a ticket comment on every changed line would be impractical and just get ignored.

## prepare-commit-msg

**Purpose:**Pre-fills a `Jira: ABC-145` trailer from the branch name before the editor opens, so the ticket is present without the author retyping it.

**If not applicable:**Skips entirely for `git commit -m`, merges, squashes, and `--template` — anywhere the message is already fully decided, mutating it would be surprising.

**Bypass reporting:**_Not applicable_ — it only pre-fills a starting point; `commit-msg` is what actually enforces the ticket is present.

## commit-msg

**Purpose:**Conventional Commits format, blank line before the body (required for changelog parsing), correct `BREAKING CHANGE:` footer format, branch↔commit ticket cross-check, Signed-off-by trailer, no forbidden words, 72-char subject limit.

**If not applicable:**Never — every commit has a message, so this hook always runs in full.

**Bypass reporting:**Same `--no-verify` path skips it locally; CI independently re-validates every commit in the PR _and_ the PR title itself (squash-merge commits the title, not the individual commits) before merge is allowed.

## post-commit

**Purpose:**Draft changelog entry appended locally, desktop/Slack notification to the author, SBOM cache refresh, ticket-status ping (e.g. move JIRA to "In Progress").

**If not applicable:**Never skipped by design, but non-blocking — if a sub-step fails (e.g. Slack API down), the commit still stands.

**Bypass reporting:**_Not applicable_ — this hook never gates, so there's nothing to bypass. A failed step is written to a local `.git/hooks.log`, nothing more.

## pre-push

**Purpose:**Unit tests, API contract tests, OpenAPI validation, proto validation, dependency check, SAST — the last local check before code leaves the machine.

**If not applicable:**Contract/proto validation skips if no `.proto` or `api/*.yaml` files changed in the pushed commits.

**Bypass reporting:**`git push --no-verify` skips it locally; the identical test/contract/SAST suite re-runs as a required CI check before the PR can merge.

Server-Side Hooks — Run in CI

## terraform/\*\* → terraform-ci

**Purpose:**terraform fmt -check, terraform validate, tflint, Checkmarx policy scan, terraform plan posted as a PR comment, Infracost estimate posted as a PR comment, nightly drift detection against live state.

**If not applicable:**PR doesn't touch `terraform/**` — the job still runs and reports a "skipped, no changes" **success**, not an absent check, so this required status check never gets stuck pending.

**Bypass reporting:**Nothing to bypass server-side — every run (pass, fail, or skipped) is a GitHub check run, permanently visible in the PR's Checks tab and Actions history.

## helm/\*\* → helm-ci

**Purpose:**helm lint, helm template + kubeconform schema validation, Conftest/OPA policy test against rendered manifests, Chart.yaml version bump check, kube-score / Prisma Cloud config scan on rendered output.

**If not applicable:**PR doesn't touch `helm/**` — same skip-as-success pattern as terraform-ci.

**Bypass reporting:**Same — logged as a GitHub check run, nothing hidden or silently absent.

<aside class="callout"><strong class="callout__title">--no-verify cannot be blocked from a hook — by any repo, not just this one.</strong><div class="callout__body">When that flag is passed, git skips invoking the hook script entirely; there's no code path for a hook to detect or refuse it. Anything claiming to "prevent" a local bypass from inside <code>pre-commit</code>/<code>commit-msg</code>/<code>pre-push</code> itself is describing something that can't work. The one detection layer that's still useful: <code>pre-commit</code> and <code>pre-push</code> emit a heartbeat to the OTel Collector when they <em>do</em> run — a push whose commit SHA never sent one gets a non-blocking "likely bypassed locally" PR comment. Informational only.</div></aside>

<aside class="callout"><strong class="callout__title">What actually prevents a bypass from reaching main: server-side branch protection</strong><div class="callout__body">— live on this repo's <code>main</code>, not just documented. Direct pushes are rejected by GitHub itself before any hook question even arises; 6 required status checks (branch naming, every commit message, PR title, <code>pre-commit</code> re-run, <code>terraform-ci</code>, <code>helm-ci</code>) must pass; <code>enforce_admins</code> is on, so the repo owner isn't exempt either. Verify it yourself: <code>gh api repos/hellodk/github-ci-cd/branches/main/protection</code>.</div></aside>

### GitHub Webhooks

Every branch-protected event fans out to the systems that need to react to it — build, deploy, alert, or record.

## Webhook Events

pushpull\_requestmerge\_group releasetagbranch protection deploymentcheck\_runworkflow\_run repository\_dispatch

## Trigger Targets

JenkinsArgo Security PlatformSlack ServiceNowSplunk OpenTelemetry Collector

### Pull Request Checks — Mandatory

-   Minimum 2 approvals
-   CODEOWNERS sign-off
-   AI review completed
-   Security review completed
-   Architecture review (critical modules only)

-   Passing CI
-   Coverage threshold met (SonarQube)
-   SBOM generated
-   SLSA provenance attached
-   Signed commits, branch up to date

### AI Guardrails

Every AI-generated PR is automatically checked for the failure modes specific to LLM-written code, on top of the standard security pipeline. Grouped by what actually catches each one.

### Code Quality — caught by lint / dead-code analysis

Hallucinated Imports Dead Code Duplicate Code Unused Variables

### Injection & Access Control — caught by SAST

Prompt Injection SQL Injection XSS SSRF Command Injection Unsafe Deserialization Missing Auth Missing Validation

### Data & Secrets — caught by secret scan / DLP

PII Leakage Logging Secrets Hardcoded Credentials

### Coverage Gaps — caught by PR checklist review

Missing Telemetry Missing Unit Tests Missing Documentation

### OpenTelemetry Requirements

No service ships without traces, metrics, and logs wired in from the first commit — retrofitting observability after an incident is too late.

## Trace

Every request gets a span tree from edge to database. Trace IDs propagate through every hop, including AI/LLM calls.

## Metrics

Request rate, error rate, latency, and saturation exported in Prometheus format from every service.

## Logs

Structured JSON logs carrying the active `trace_id` so a log line and a span are always one click apart.

## Minimum Required Spans

HTTP RequestDatabase RedisKafka AuthenticationAuthorization CacheExternal API QueueFilesystem

## Every PR Validates

-   Trace propagation across service boundaries
-   Correlation IDs present in logs
-   Sampling configuration is set, not default
-   Resource attributes populated
-   OTel semantic conventions followed

### Branch Protection Rules

The same rule set, scoped by branch. `main` carries one extra requirement — tagging — that doesn't apply upstream. Provenance is delivered _as_ an attestation, so anywhere provenance is required, attestations are required too.

| Rule | main | release/* | integration |
| --- | --- | --- | --- |
| No force push | ✓ | ✓ | ✓ |
| Linear / squash-only history | ✓ | ✓ | — |
| Signed, verified commits | ✓ | ✓ | ✓ |
| Required reviews (CODEOWNERS) | ✓ | ✓ | ✓ |
| Required status checks | ✓ | ✓ | ✓ |
| Conversation resolved | ✓ | ✓ | ✓ |
| No stale reviews | ✓ | ✓ | ✓ |
| Branch up to date before merge | ✓ | ✓ | ✓ |
| Passing security scans | ✓ | ✓ | ✓ |
| SLSA provenance required | ✓ | ✓ | — |
| Signed container image required | ✓ | ✓ | — |
| SBOM upload required | ✓ | ✓ | — |
| Tag every release | ✓ | — | — |
| Attestations attached | ✓ | ✓ | — |

### Repository Policies — Enforced via OPA / Kyverno

-   No plaintext secrets
-   No large binaries
-   No direct main commits
-   Mandatory CODEOWNERS

-   Mandatory telemetry
-   Mandatory tests
-   Mandatory documentation updates
-   Mandatory changelog

-   Mandatory semantic versioning
-   Mandatory signed commits
-   Mandatory Dependabot resolution
-   Mandatory branch naming
-   Mandatory Conventional Commits

## Centralized Governance

### Why Centralize

Every hook, workflow, and policy in this guide currently lives inside one repo. The moment a second application repo needs the same branch-naming check, the same security pipeline, the same Helm hook conventions, you have a choice: copy-paste it (and now there are two places that drift out of sync the first time one gets updated), or centralize it — one source of truth, versioned, that every repo consumes rather than reimplements. At 50 application repos, copy-paste isn't a maintenance cost, it's a governance failure waiting to happen.

One hooks/policy repo, three distribution mechanisms — animated

<svg viewBox="0 0 960 600" aria-label="Centralized governance architecture diagram">
      <defs>
        <marker id="arrGov" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><polygon points="0 0,9 4,0 8" fill="#8C94E8"></polygon></marker>
        <marker id="arrGovGreen" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><polygon points="0 0,9 4,0 8" fill="#5CB985"></polygon></marker>
        <marker id="arrGovRed" markerWidth="9" markerHeight="8" refX="8" refY="4" orient="auto"><polygon points="0 0,9 4,0 8" fill="#E38A82"></polygon></marker>
      </defs>
      <path d="M220,230 L270,230 L270,90 L320,90" fill="none" stroke="#8C94E8" stroke-width="1.75" opacity=".9" marker-end="url(#arrGov)"></path>
      <path d="M220,230 L320,230" fill="none" stroke="#8C94E8" stroke-width="1.75" opacity=".9" marker-end="url(#arrGov)"></path>
      <path d="M220,230 L270,230 L270,370 L320,370" fill="none" stroke="#8C94E8" stroke-width="1.75" opacity=".9" marker-end="url(#arrGov)"></path>
      <path d="M550,90 L630,90 L630,230 L700,230" fill="none" stroke="#5CB985" stroke-width="1.75" opacity=".9" marker-end="url(#arrGovGreen)"></path>
      <path d="M550,230 L700,230" fill="none" stroke="#5CB985" stroke-width="1.75" opacity=".9" marker-end="url(#arrGovGreen)"></path>
      <path d="M550,370 L630,370 L630,230 L700,230" fill="none" stroke="#5CB985" stroke-width="1.75" opacity=".9" marker-end="url(#arrGovGreen)"></path>
      <circle r="3.2" fill="#6B74D6"><animateMotion dur="2.6s" repeatCount="indefinite" path="M220,230 L270,230 L270,90 L320,90"></animateMotion></circle>
      <circle r="3.2" fill="#6B74D6"><animateMotion dur="2.6s" begin=".7s" repeatCount="indefinite" path="M220,230 L320,230"></animateMotion></circle>
      <circle r="3.2" fill="#6B74D6"><animateMotion dur="2.6s" begin="1.4s" repeatCount="indefinite" path="M220,230 L270,230 L270,370 L320,370"></animateMotion></circle>
      <circle r="3" fill="#4A9D6E"><animateMotion dur="2.6s" begin=".3s" repeatCount="indefinite" path="M550,90 L630,90 L630,230 L700,230"></animateMotion></circle>
      <circle r="3" fill="#4A9D6E"><animateMotion dur="2.6s" begin="1s" repeatCount="indefinite" path="M550,230 L700,230"></animateMotion></circle>
      <circle r="3" fill="#4A9D6E"><animateMotion dur="2.6s" begin="1.7s" repeatCount="indefinite" path="M550,370 L630,370 L630,230 L700,230"></animateMotion></circle>
      <circle cx="125" cy="230" r="95" fill="none" stroke="#8C94E8" stroke-width="1.5" opacity=".35">
        <animate attributeName="r" values="90;125" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".35;0" dur="2.4s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="30" y="195" width="190" height="70" rx="10" fill="#1E1B3A" stroke="#8C94E8" stroke-width="2"></rect>
      <text x="125" y="226" text-anchor="middle" font-size="13" font-weight="700" fill="#F9FAFB">github-ci-cd</text>
      <text x="125" y="244" text-anchor="middle" font-size="12" font-weight="500" fill="#C7CBF0">Hooks &amp; Policy Source</text>
      <rect x="320" y="60" width="230" height="60" rx="10" fill="#F4F1FE" stroke="#D2C7F7" stroke-width="1.75"></rect>
      <circle cx="536" cy="74" r="4" fill="#6B3FD1"></circle>
      <text x="435" y="86" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">pre-commit repo:</text>
      <text x="435" y="103" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">Client-Side Hooks</text>
      <rect x="320" y="200" width="230" height="60" rx="10" fill="#F4F1FE" stroke="#D2C7F7" stroke-width="1.75"></rect>
      <circle cx="536" cy="214" r="4" fill="#6B3FD1"></circle>
      <text x="435" y="226" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Reusable Workflows</text>
      <text x="435" y="243" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">workflow_call — CI-Side</text>
      <rect x="320" y="340" width="230" height="60" rx="10" fill="#F4F1FE" stroke="#D2C7F7" stroke-width="1.75"></rect>
      <circle cx="536" cy="354" r="4" fill="#6B3FD1"></circle>
      <text x="435" y="366" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Org Rulesets</text>
      <text x="435" y="383" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">Mandates Adoption</text>
      <rect x="700" y="150" width="200" height="160" rx="10" fill="#EFFBF3" stroke="#A9E4C1" stroke-width="1.75"></rect>
      <circle cx="884" cy="164" r="4" fill="#157A47"></circle>
      <text x="800" y="220" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Application</text>
      <text x="800" y="238" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Repositories</text>
      <text x="800" y="258" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">N Repos, One Config</text>
      <rect x="30" y="440" width="260" height="65" rx="10" fill="#F7F6F4" stroke="#D3CFC8" stroke-width="1.75" stroke-dasharray="6 3"></rect>
      <circle cx="270" cy="454" r="4" fill="#78716C"></circle>
      <text x="160" y="468" text-anchor="middle" font-size="13" font-weight="700" fill="#374151">Repo You Don't Own</text>
      <text x="160" y="486" text-anchor="middle" font-size="12" font-weight="500" fill="#4B5563">No Push Access, No Admin</text>
      <path d="M160,505 L160,520" fill="none" stroke="#A8A29E" stroke-width="1.75" stroke-dasharray="4 3"></path>
      <path d="M160,520 L860,520" fill="none" stroke="#A8A29E" stroke-width="1.75" stroke-dasharray="4 3"></path>
      <path d="M415,520 L415,528" fill="none" stroke="#E38A82" stroke-width="1.75" marker-end="url(#arrGovRed)"></path>
      <path d="M635,520 L635,528" fill="none" stroke="#E38A82" stroke-width="1.75" marker-end="url(#arrGovRed)"></path>
      <path d="M855,520 L855,528" fill="none" stroke="#E38A82" stroke-width="1.75" marker-end="url(#arrGovRed)"></path>
      <circle r="3" fill="#D46A60"><animateMotion dur="2.8s" repeatCount="indefinite" path="M160,505 L160,520 L415,520 L415,528"></animateMotion></circle>
      <circle r="3" fill="#D46A60"><animateMotion dur="2.8s" begin=".9s" repeatCount="indefinite" path="M160,505 L160,520 L635,520 L635,528"></animateMotion></circle>
      <circle r="3" fill="#D46A60"><animateMotion dur="2.8s" begin="1.8s" repeatCount="indefinite" path="M160,505 L160,520 L855,520 L855,528"></animateMotion></circle>
      <text x="500" y="510" text-anchor="middle" font-size="12" font-weight="600" fill="#4B5563">enforcement shifts to a boundary you DO control</text>
      <rect x="320" y="528" width="190" height="55" rx="10" fill="#FDF0EF" stroke="#F0AEA8" stroke-width="1.75"></rect>
      <text x="415" y="552" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Artifact Registry</text>
      <text x="415" y="569" text-anchor="middle" font-size="11.5" font-weight="500" fill="#4B5563">Refuse Unsigned Images</text>
      <rect x="540" y="528" width="190" height="55" rx="10" fill="#FDF0EF" stroke="#F0AEA8" stroke-width="1.75"></rect>
      <text x="635" y="552" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Cluster Admission</text>
      <text x="635" y="569" text-anchor="middle" font-size="11.5" font-weight="500" fill="#4B5563">Kyverno / Gatekeeper</text>
      <rect x="760" y="528" width="190" height="55" rx="10" fill="#FDF0EF" stroke="#F0AEA8" stroke-width="1.75"></rect>
      <text x="855" y="552" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Deployment Gateway</text>
      <text x="855" y="569" text-anchor="middle" font-size="11.5" font-weight="500" fill="#4B5563">Verify SLSA Provenance</text>
    </svg>

This Repo → Distribution Mechanism

Mechanism → Every Application Repo

No Repo Access → Boundary Enforcement Instead

### Client-Side — pre-commit's `repo:` field

pre-commit was built for exactly this. `.pre-commit-config.yaml`'s `repo:` field accepts any git URL — point it at this repo instead of `pre-commit/pre-commit-hooks`, pin a `rev:`, and every consuming repo gets the same branch-naming, commit-msg, and ticket-traceability checks with zero duplicated script logic.

### CI-Side — Reusable Workflows

`pr-checks.yml`, `terraform-ci.yml`, and `helm-ci.yml` become `workflow_call` targets here. Every application repo's own workflow shrinks to a two-line wrapper: `uses: hellodk/github-ci-cd/.github/workflows/pr-checks.yml@v1`. One version bump here updates every consumer's next run.

### Org-Side — Repository Rulesets

GitHub Rulesets defined once at the _organization_ level, targeting `~ALL` repos matching a pattern, make the reusable workflow's status checks _mandatory_ rather than opt-in — this is what turns "a repo could adopt this" into "every repo must." Requires org-owner rights, not per-repo admin.

### Git Hooks — Centralizing `pre-commit`

The mechanism already exists in every repo that has a `.pre-commit-config.yaml` — it just usually points at public hook repos. Point it at yours instead.

```bash
# in any application repo's .pre-commit-config.yaml
repos:
  - repo: git@github.com:hellodk/github-ci-cd.git
    rev: v1.4.0          # pinned — never floating
    hooks:
      - id: branch-name-check
      - id: commit-msg-check
      - id: ticket-traceability-check
```

**Bootstrapping new repos:** a company-wide `init.templateDir` (`git config --global init.templateDir ~/.git-templates`) seeds this config into every `git init`/`git clone` automatically. **Catching skips even then:** point [pre-commit.ci](https://pre-commit.ci) at the same config so it re-runs server-side on every PR — the same "local hooks aren't the enforcement boundary" principle from Tab 3, applied org-wide instead of repo-wide.

### Terraform — Centralizing Modules & Policy

Two separate things get centralized: the _good pattern itself_ (as a module teams consume) and the _policy that rejects the bad pattern_ (as something the run pipeline evaluates, not something each repo's CI has to remember to check).

### Shared Module Registry

App teams stop hand-writing `for_each`+map S3 buckets from scratch — they consume the vetted version:

```bash
module "buckets" {
  source = "git::https://github.com/hellodk/github-ci-cd.git//terraform/modules/s3-bucket?ref=v1.2.0"
}
```

### Policy Moves to the Runner

If every `terraform apply` routes through one shared platform — Atlantis, Terraform Cloud, Spacelift — Sentinel or OPA/Conftest policies defined _once_ there apply to every workspace automatically. The enforcement point becomes the platform, not each repo's willingness to wire up `terraform-ci.yml` correctly.

### Helm — Centralizing Charts & Admission

The strongest lever here isn't the repo at all — it's the cluster. A manifest gets admitted or rejected based on what it _is_, not which repo's CI produced it.

### Shared Chart Registry

Publish `helm/example-service`'s pattern to an OCI registry (GHCR, Harbor, ChartMuseum). App repos `helm install` a versioned central chart instead of authoring their own release hooks from first principles — the hook edge cases in Tab 2 get solved once.

### Cluster Admission — the Real Backstop

Kyverno/OPA Gatekeeper admission policies (already the `Admission` stage of Tab 2's Security Pipeline) don't care which repo a manifest came from. A workload without the required labels, resource limits, or signed image gets rejected at `kubectl apply` regardless of source — this is the one control that works even when nothing upstream cooperated.

### When You Don't Control the Repo

This is the real question, and it has a real answer — but not the one "add a hook" implies. You cannot install a git hook into a repo you have no push access to, and you cannot configure branch protection on a repo you're not an admin of. Full stop. The lever that's actually available shifts depending on how "not controlled" the repo is.

| Situation | Real Lever |
| --- | --- |
| Different team, same GitHub org | Org-level Repository Rulesets / Required Workflows — an org owner can mandate these without the individual repo owner opting in. This is the one case where you get repo-level enforcement without repo-level cooperation. |
| Genuinely external (vendor, OSS dependency) | You cannot touch their repo at all. Move enforcement to a boundary you control instead: the artifact registry (refuse unsigned/unscanned images), cluster admission (Kyverno/Gatekeeper reject non-compliant manifests regardless of origin), or a deployment gateway that verifies SLSA provenance/attestation before promoting anything. |
| Vendor relationship, contractual leverage exists | Not a technical control at all — security requirements written into the procurement contract (SOC2 evidence, scan reports, signed artifacts as a delivery condition) is the actual enforcement mechanism when there's no git access to lean on. |

<aside class="callout"><strong class="callout__title">The pattern underneath all three:</strong><div class="callout__body">when you can't push a hook upstream into someone else's process, you verify the output at the boundary where their work meets yours — a registry pull, a cluster admission, a deployment gate. Same principle as Tab 3's "local hooks aren't the enforcement boundary," just with the boundary moved from "your laptop vs. CI" to "their repo vs. your cluster."</div></aside>
