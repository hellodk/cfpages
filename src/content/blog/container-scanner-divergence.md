---
title: "Container Scanners — Complete Visual Guide: Why Clair, Trivy, Prisma and Grype Disagree"
date: 2026-10-11
description: "Same image, four different answers: Quay/Clair says 18 Low where Trivy says 68 findings, and Trivy says 0 where Quay says 2 High. How Clair, Trivy, Prisma Cloud and Grype actually scan container images, the 7 reasons their findings differ, and the discipline that makes scanner output trustworthy."
tags: [docker, container-security, trivy, clair, scanning]
draft: false
---

S

Why Clair, Trivy, Prisma and Grype disagree on the same image · measured on 26 tags, Trivy 0.70.0, October 2026

## How They Scan

### Every scanner runs the same four-stage pipeline

Unpack layers, inventory packages, match against feeds, report. The tools differ in _how_ they execute each stage — and every difference is a place where two scanners can disagree.

The Universal Scan Pipeline

<svg viewBox="0 0 760 210" role="img" aria-label="Four stage scan pipeline">
        <defs>
          <marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#444CE7"></path>
          </marker>
        </defs>
        <rect x="24" y="70" width="152" height="70" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="100" y="98" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Unpack Layers</text>
        <text x="100" y="118" text-anchor="middle" font-size="11" fill="#4B5563">Diff Every Layer</text>
        <rect x="214" y="70" width="152" height="70" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="290" y="98" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Inventory</text>
        <text x="290" y="118" text-anchor="middle" font-size="11" fill="#4B5563">Build The SBOM</text>
        <rect x="404" y="70" width="152" height="70" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
        <text x="480" y="98" text-anchor="middle" font-size="12" font-weight="700" fill="#FFFFFF">Match Feeds</text>
        <text x="480" y="118" text-anchor="middle" font-size="11" fill="#C7D2FE">Where Counts Diverge</text>
        <circle cx="480" cy="105" r="10" fill="none" stroke="#444CE7" stroke-width="2">
          <animate attributeName="r" values="10;26" dur="1.8s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite"></animate>
        </circle>
        <rect x="594" y="70" width="142" height="70" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="665" y="98" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Report</text>
        <text x="665" y="118" text-anchor="middle" font-size="11" fill="#4B5563">Severity + Fixable</text>
        <line x1="176" y1="105" x2="210" y2="105" stroke="#444CE7" stroke-width="2" marker-end="url(#ah)"></line>
        <line x1="366" y1="105" x2="400" y2="105" stroke="#444CE7" stroke-width="2" marker-end="url(#ah)"></line>
        <line x1="556" y1="105" x2="590" y2="105" stroke="#444CE7" stroke-width="2" marker-end="url(#ah)"></line>
        <circle r="4" fill="#444CE7"><animateMotion dur="1.5s" repeatCount="indefinite" path="M176,105 L210,105"></animateMotion></circle>
        <circle r="4" fill="#444CE7"><animateMotion dur="1.5s" repeatCount="indefinite" path="M366,105 L400,105"></animateMotion></circle>
        <circle r="4" fill="#444CE7"><animateMotion dur="1.5s" repeatCount="indefinite" path="M556,105 L590,105"></animateMotion></circle>
        <text x="100" y="170" text-anchor="middle" font-size="11" fill="#4B5563">Stage 1</text>
        <text x="290" y="170" text-anchor="middle" font-size="11" fill="#4B5563">Stage 2</text>
        <text x="480" y="170" text-anchor="middle" font-size="11" fill="#4B5563">Stage 3</text>
        <text x="665" y="170" text-anchor="middle" font-size="11" fill="#4B5563">Stage 4</text>
      </svg>

#### Stage 1–2: See the software

The scanner walks every layer and reads package databases (`apk`, `dpkg` status, RPM DB) plus language artifacts (JAR manifests, Go build info, Node lockfiles). Miss a database and its packages are invisible.

#### Stage 3–4: Judge the software

Each inventoried package is looked up in vulnerability feeds, assigned the feed's severity, and marked fixable only if the feed names a fixed version. Different feeds, different verdicts.

### The four scanners, stage by stage

Same pipeline, different implementations. Read across a row to see where each tool can surprise you.

| Tool | Inventory (Stage 2) | Feeds (Stage 3) | Severity + Fixable (Stage 4) |
| --- | --- | --- | --- |
| **Clair v4** (inside Quay) | **Indexer** extracts OS packages per layer into an index report; language coverage is narrower than the others and varies by version | **Matcher** consults configured updaters: Alpine secdb, Debian tracker, RHEL OVAL, Ubuntu OVAL, NVD | Feed's severity (often NVD CVSS); **fixable** means the feed names a fixed build. Quay shows counts like `1 Unknown · 1 fixable` |
| **Trivy** | **fanal** analyzer reads OS DBs plus JARs, Go binaries, Node/Python/Rust artifacts in one pass; splits results into `os-pkgs` vs language classes | **trivy-db** (NVD plus per-distro trackers) and **trivy-java-db**; both refresh on a schedule you control | NVD-derived severity, vendor rating kept separately as `VendorSeverity`; `UNKNOWN` when no CVSS vector exists yet; `Status: fixed` with a named version |
| **Prisma Cloud Compute** (ex-Twistlock) | **Defenders** inventory running hosts/containers; **twistcli** scans images in CI; registry scanning covers images at rest | **Threat Intelligence Stream** — Palo Alto-curated feed plus compliance libraries (CIS, DISA); policy engine sits on top of raw CVEs | Curated severity with allowlists and grace periods; a CVE can be *known but waived by policy*, so two Prisma consoles with different policies report different numbers |
| **Grype** (Anchore) | **Syft SBOM first** — the inventory is an explicit SBOM document you can inspect, then Grype matches it | **GrypeDB**, built by **Vunnel** from NVD, GHSA and distro feeds; distro qualifiers model backports | Feed severity with `only-fixed` filtering; SBOM-first means inventory bugs and matching bugs are separable and auditable |

<aside class="callout"><strong class="callout__title">Snyk</strong><div class="callout__body">Also in the room:  (proprietary DB plus reachability — a CVE in an unreachable function scores lower), <strong>Docker Scout</strong> (SBOM plus policy with VEX statements), and build-model changers like <strong>Chainguard apko/melange</strong> (minimal APK sets with signed VEX attestations that scanners are learning to consume).</div></aside>

## Why They Differ

### Same digest, different answers — measured

Every row below is one immutable image (pinned by digest), scanned the same week by Quay/Clair and by Trivy 0.70.0 with the 2026-10-11 database. No rebuild sits between the two columns — the difference is pure scanner mechanics.

| Image (digest) | Quay / Clair | Trivy 0.70.0 |
| --- | --- | --- |
| `google-4.0.2-java21-base` (`ba8b0af3…`) | 18 Low | 9 High 39 Med 20 Low — 68 rows, every one unfixable |
| `hummingbird-4.0.2-java21-cvefix2` (`5e123f11…`) | 2 High | 0 findings |
| `hummingbird-4.0.2-java21-base` (`67d22d2c…`) | 3 High | 0 findings |
| `temurin-4.0.2-java21-base` (`24d9ae63…`) | 1 Unknown · 1 fixable | 1 MEDIUM (zlib CVE-2026-85091) |
| `ubi9-4.0.2-java21-base` (`fdc4f9ed…`) | 20 High | 25 High of 585 total |
| `golang-1.26-base` (`a7517af4…`) | 14 Unknown · 14 fixable | 1 MEDIUM OS + 13 stdlib CVEs in *each* toolchain binary |
| `golang-hello-scratch` (`6e808e9f…`) | 13 Unknown · 13 fixable | 13 (3H / 5M / 1L / 4U) in the one static binary |

<aside class="callout callout--warn"><strong class="callout__title">Neither column is "wrong".</strong><div class="callout__body">Each is a correct answer to a slightly different question: different feeds, different dates, different severity scales, different counting rules. The seven reasons below name the question each scanner is actually answering.</div></aside>

### The 7 reasons findings differ

In roughly the order to check when two scanners disagree.

1

**Database date.** zlib CVE-2026-85091 (heap overflow in `gz_vacate()`) was absent from the 2026-10-06 feed and present on 2026-10-11. An image scanned "clean" on Monday reports 1 MEDIUM on Saturday with zero bytes changed. Always compare scans with the feed date attached — comparing across dates measures the database, not the image.

2

**Feed selection per distro.** Trivy reported zero binutils findings on an image carrying binutils 2.45.1 with known CVE-2025-69644 (fixed in 2.46): Alpine's secdb simply had no advisory mapping that CVE to its build, so there was nothing to match. Conversely Quay's RHEL OVAL feed flags 2–3 Highs on Hummingbird images where Trivy sees no package database at all. A scanner can only report what its feeds know.

3

**Severity normalization.** Quay called the zlib finding _Unknown_; Trivy calls it _MEDIUM_. Trivy prefers NVD CVSS and keeps the vendor rating in a separate `VendorSeverity` field; Clair surfaces the feed's own label; Prisma may override by policy. And severities _move_: libpng CVE-2026-46675 was `UNKNOWN` (no CVSS vector) on 2026-10-02 and `MEDIUM` by 2026-10-11. Treat UNKNOWN as a finding, then go fix it.

4

**Fix-status and backport logic.** "Fixable" means _the feed names a fixed build_ — nothing more. Red Hat's errata model is the sharpest example: pcre2 10.40 carries 6 HIGH rows with `Fixed: None` because no erratum exists, while openssl 3.5.8-1 names 3.5.8-2. Debian "no-DSA" minor issues and Alpine snapshot lag behave the same way. Two scanners with different backport data give different "fixable" counts for identical packages.

5

**Inventory scope: OS vs language.** The Go toolchain image carries ~10 compiled binaries, each embedding stdlib v1.26.8 — Trivy emits the same 13 CVEs per binary. A scanner with narrower language coverage (or one that dedupes by CVE) reports a far smaller number for the same bytes. Quay's 14 vs Trivy's 1-plus-13-per-binary on `golang-1.26-base` is this reason wearing a counting disguise. On the scratch image both agreed (13 = 13) because there is exactly one binary to see.

6

**Counting methodology.** Trivy counts _package-instances_: one CVE in `pcre2` and `pcre2-syntax` is two rows; the glibc CVEs repeat across `glibc`, `glibc-common` and `glibc-minimal-langpack`. Quay's 18 Low vs Trivy's 68 rows on the Google image is largely unique-CVEs vs rows plus a different Debian feed snapshot. Decide which number you quote — unique CVEs for risk, rows for work — and say which.

7

**Blind spots run both directions.** Trivy missed a real binutils CVE its feed didn't cover (found only by manual version inspection). Clair-only Highs on a Trivy-clean Hummingbird image show the reverse. No single scanner sees everything; the second scanner is not a luxury, it is the control experiment.

## Trustworthy Practice

### Five rules for trustworthy scanner output

The workflow that produced 11 zero-finding tags this week — and that survives contact with every scanner above.

1

**Compare like with like.** Same tool, same database date, same severity set, same image digest. Our canonical form: `trivy image --scanners vuln --severity UNKNOWN,LOW,MEDIUM,HIGH,CRITICAL --format json <repo>@sha256:<digest>`. Anything else is anecdote.

2

**Split by layer before ranking.** Score the OS layer (`Class: os-pkgs`) separately from the application layer (`jar`, `gobinary`, `node-pkg`). The same 69 MB JAR rode six runtimes in our comparison — an unsplit total scores your own dependency tree six times and inverts the ranking.

3

**Weight fixability above count.** Eight patchable findings are a queue; eight with `Fixed: None` are a property of the image. Our triage order: upgrade what has a fix, remove what is unused and unfixable (binutils), document the rest with CVE IDs — never silently accept.

4

**Verify the registry copy, not your build.** Pull by digest, rescan, and check function (boot the app, run `go version`, print the hello). The digest you scanned must be the digest you ship; tags move, digests don't. Never overwrite a published tag — push a new one.

5

**Re-scan on a schedule, not on suspicion.** Feeds move weekly: our zlib finding did not exist in Monday's database. A zero from last month is a rumor. Automate the rescan, alert on delta, and keep the previous tag until the new digest verifies clean.

```bash
# The one-liner this whole guide reduces to:
trivy image --scanners vuln --format json "$IMAGE" \
  | jq '{os:  [.Results[] | select(.Class | startswith("os-pkgs/"))
          | .Vulnerabilities[]? | .Severity] | group_by(.) | map({(.[0]): length}) | add,
      app: [.Results[] | select(.Class | startswith("jar"))
          | .Vulnerabilities[]? | .Severity] | group_by(.) | map({(.[0]): length}) | add}'
# Bucket on .Class, never on .Type: Debian-family results carry Type "debian",
# and a Type-based filter files OS findings into the application bucket.
```

<aside class="callout callout--ok"><strong class="callout__title">Bottom line for your audience:</strong><div class="callout__body">scanners disagree because they ask different questions of different feeds on different days and count the answers differently. Pick one as ground truth, pin everything it needs to be reproducible (tool version, DB date, digest), split OS from app, fix by fixability — and run a second scanner as the control, because every feed has a binutils-shaped hole somewhere.</div></aside>
