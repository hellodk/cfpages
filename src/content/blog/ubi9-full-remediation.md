---
title: "895 to 575: Remediating Red Hat UBI 9 Full"
date: 2026-10-03
description: "The only image in the comparison with a package manager was also the worst offender at 895 findings. Its security channel turned out to be completely empty. A full dnf upgrade cleared 320 of them — and quietly introduced 20 new ones."
tags: [rhel, ubi, docker, container-security, cve]
cover: "assets/images/covers/ubi9-full-remediation.svg"
draft: false
---

Container Security · UBI 9 · RHSA Remediation

In the comparison, Red Hat UBI 9 full scored 895 findings — 95 of them HIGH — and was rejected outright. It was also the only candidate that shipped a package manager capable of fixing itself. That combination made it the one image worth spending a day on. A single `dnf upgrade` cleared 320 findings and 70 of the HIGH ones. It also introduced 20 new findings, which is the part worth reading.

## 1\. Where we started

The comparison scored seven Java 21 base images carrying the same application. Three came back with zero findings. UBI 9 full came back with 895 — an order of magnitude worse than anything else on the list — and was rejected without further thought.

That was the right call at the time, but it left one thing unexplored. Of the six candidates worth discussing, UBI 9 full was the only one that shipped a working package manager. Everything else was either already clean or fundamentally unfixable in place.

| Layer | Critical | High | Medium | Low | Total |
| --- | --- | --- | --- | --- | --- |
| OS — ubi9/ubi 9.5 | 0 | 95 | 458 | 341 | 894 |
| Application — spring-retry | 0 | 0 | 1 | 0 | 1 |
| Total | 0 | 95 | 459 | 341 | 895 |

The application-layer finding was already solved: `CVE-2026-41710` in `spring-retry` 1.0.3, which arrived transitively through `spring-data-jdbc`. Pinning it to 2.0.13 in the POM clears it on any rebuild. The 894 OS findings were the real work.

## 2\. The dry run found nothing

Before changing anything, the obvious first move is the security channel. This is the command you reach for first, and the one that would be quoted in a pull request:

```bash
dnf upgrade --refresh --security
```

It returns this:

```bash
No security updates needed, but 116 updates available
Dependencies resolved.
Nothing to do.
Complete!
```

**The security channel is empty.** RHEL 9 has no pending security errata for anything in this image. Every one of the 894 OS findings is either already-fixed-but-stale or has no errata at all. A tool that greps for `dnf upgrade --security` in a Dockerfile and calls the image remediated would have reported this image as clean and been wrong by 894.

That is worth stating plainly, because it inverts the usual remediation story. The packages are not vulnerable-to-be-patched; they are _old_. The distinction decides the fix.

## 3\. Why the base was 9.5

The build pulls `registry.access.redhat.com/ubi9/ubi:9.5` and installs a headless JRE:

```bash
FROM registry.access.redhat.com/ubi9/ubi:9.5
RUN dnf install -y --nodocs java-21-openjdk-headless tzdata shadow-utils
```

`dnf install` installs what is missing. It does not upgrade what the base tag already shipped. So every package already present in `ubi9:9.5` — glibc, openssl, python3, libevent, the lot — stayed pinned at whatever version 9.5 carried, months old, while the JRE moved forward.

This is the same class of bug as the stale Alpine snapshot, and it is invisible until you measure it. The image installs cleanly, boots cleanly, and reports `openjdk version "21.0.12"`, so every surface check passes. Only the vulnerability count tells you.

A second-order effect made it worse: an old `ubi9` base pulls in `python3`, `python3-libs`, `libevent` and friends as part of the standard install set. Those are 9 HIGH findings each in packages a Spring Boot service never calls. The base was not just behind, it was behind while carrying bloat the service did not ask for.

## 4\. The fix

Since the packages are stale rather than unpatched, the fix is an unconditional upgrade. Two lines, placed in a specific order:

```bash
RUN dnf install -y --nodocs java-21-openjdk-headless tzdata shadow-utils     && dnf upgrade -y --refresh --nodocs     && dnf remove -y gawk-all-langpacks glibc-langpack-en rpm-plugin-systemd-inhibit     && dnf clean all     && rm -rf /var/cache/dnf /var/log/*     && java -version     && useradd -u 1001 -r -g 0 -m -s /sbin/nologin -c "petclinic app user" appuser     && mkdir -p /app     && chown 1001:0 /app
```

Three ordering decisions carry the weight:

-   **The upgrade runs after the JRE install**, so the JRE itself moves forward too. Placing it first would install a current JRE onto a stale system and leave it there.
-   **The upgrade runs before `useradd`**, so every subsequent operation links against the patched libraries rather than the old ones.
-   **The cache is purged in the same layer**, so the 62 MB of downloaded RPMs never reach the published image.

## 5\. What it moved

The transaction is larger than the finding count suggests:

Packages upgraded

116

Packages installed

5

Total download

62 MB

Base distro moved

9.5 → 9.8

<svg viewBox="0 0 948 210" role="img" aria-label="Remediation flow: UBI 9 base 9.5 with 894 findings, upgraded, three packages removed, resulting in base 9.8 with 575 findings">
            <defs>
              <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 Z" fill="#6B7280"></path>
              </marker>
            </defs>
            <g font-family="ui-sans-serif, system-ui, sans-serif">
              <rect x="24" y="58" width="180" height="82" rx="12" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"></rect>
              <text x="114" y="88" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">ubi9:9.5 Base</text>
              <text x="114" y="112" text-anchor="middle" font-size="13" fill="#4B5563">894 OS Findings</text>
              <rect x="264" y="58" width="180" height="82" rx="12" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
              <text x="354" y="88" text-anchor="middle" font-size="14" font-weight="700" fill="#FFFFFF">dnf Upgrade</text>
              <text x="354" y="112" text-anchor="middle" font-size="13" fill="#C7D2FE">116 Packages, 62 MB</text>
              <rect x="504" y="58" width="180" height="82" rx="12" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
              <text x="594" y="88" text-anchor="middle" font-size="14" font-weight="700" fill="#FFFFFF">Remove 3 Packages</text>
              <text x="594" y="112" text-anchor="middle" font-size="13" fill="#C7D2FE">Clears 16 New Findings</text>
              <rect x="744" y="58" width="180" height="82" rx="12" fill="#FFFFFF" stroke="#16A34A" stroke-width="2"></rect>
              <text x="834" y="88" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">ubi9:9.8 Base</text>
              <text x="834" y="112" text-anchor="middle" font-size="13" fill="#4B5563">575 OS Findings</text>
              <line x1="210" y1="99" x2="256" y2="99" stroke="#6B7280" stroke-width="2" marker-end="url(#ar)"></line>
              <line x1="450" y1="99" x2="496" y2="99" stroke="#6B7280" stroke-width="2" marker-end="url(#ar)"></line>
              <line x1="690" y1="99" x2="736" y2="99" stroke="#6B7280" stroke-width="2" marker-end="url(#ar)"></line>
            </g>
          </svg>

One `dnf upgrade` moved the base from RHEL 9.5 to 9.8. Removing the three packages the upgrade dragged in took back 16 of the 20 findings it introduced.

The base moved three minor versions forward, from RHEL 9.5 to 9.8, and the JRE moved from 21.0.12 to `21.0.12.1`. A three-point distro jump inside a single-line Dockerfile change is a reminder that "the base tag was stale" and "we changed the base" are the same edit.

## 6\. The 20 findings the fix introduced

This is the part that justifies measuring instead of assuming, and it is not visible from the finding count alone. 895 became 575, which looks like a straightforward win. Diffing the CVE and package pairs between the two scans tells a different story:

```bash
cleared:            321
newly introduced:    20
```

Twenty of the findings were not in the old image at all. Sixteen of them came from three packages that a container has no use for:

| Package | New findings | Why it is in the image |
| --- | --- | --- |
| glibc-langpack-en | 9 | English locale messages. The image sets no locale. |
| rpm-plugin-systemd-inhibit | 6 | systemd integration. Nothing systemd runs in here. |
| gawk-all-langpacks | 1 | gawk translations, pulled in by the same mechanism. |
| java-21-openjdk-headless | 1 | The JRE patch level itself — see below. |

The upgrade pulled these in as dependencies of the newer `glibc`, `rpm` and `util-linux`. A remediation step that raises the count you are measuring is a step that needs explaining before it ships.

## 7\. Taking them back out

Three of the four are removable. Langpacks exist to translate messages for humans, and there are no humans reading a container's logs; the systemd plugin exists to coordinate with an init system that is not present. Both are pure weight.

```bash
&& dnf remove -y gawk-all-langpacks glibc-langpack-en rpm-plugin-systemd-inhibit
```

Verified to remove cleanly with no dependency breakage, and it shrinks the image on top of removing the findings. That leaves one new finding, and it is a different problem.

**`CVE-2026-95512` cannot be fixed.** The upgrade moved the JRE to `21.0.12.1`, which Trivy reports as MEDIUM with _no published fix_. `dnf list --available java-21-openjdk-headless` returns "No matching Packages to list" — the installed build is the newest Red Hat has shipped. This is the intrinsic cost of taking the patch: one unfixable MEDIUM in the JRE, accepted in exchange for clearing 321 findings including 70 HIGH.

That trade is worth stating explicitly rather than burying in a diff. A 1-for-321 swap with a 73.7% reduction in HIGH findings is not a close call. But a scanner diff that shows `cleared 321 / new 1` is more honest than a single before-and-after total, and it is the number that should go in the pull request.

## 8\. Verification

Every gate from the plan, measured rather than assumed:

| Check | Before | After | Result |
| --- | --- | --- | --- |
| OS findings | 894 | 575 | −319 |
| HIGH | 95 | 25 | −70, a 73.7% cut |
| MEDIUM | 458 | 276 | −182 |
| LOW | 341 | 274 | −67 |
| Application findings | 1 | 0 | CVE-2026-41710 cleared |
| Newly introduced | — | 1 | CVE-2026-95512, no fix available |
| Boot to healthy | HTTP 200 | HTTP 200 in 30s | actuator UP |
| Runtime user | uid 1001 | uid 1001 | appuser, unchanged |
| Java version | 21.0.12 | 21.0.12.1 | still Java 21 |

The non-root UID survives the upgrade, which was the real risk: `useradd` runs after a step that rewrites large parts of the filesystem, and `gid 0` membership was preserved. Boot response reports `uid=1001(appuser) gid=0(root)`.

Pushed as `quay.io/hellodk/base-image:ubi9-4.0.2-java21-cvefix2`, digest verified by reading it back from the registry rather than trusting the push output:

```bash
sha256:fdc4f9ed221a81bebe77aea9497946f6f488dd50ebdc0811426a53002fb5bb7b
```

## 9\. What it cost

Size is the price, and it is not small. Registry figures are the sum of compressed layer sizes from the manifest, which is what a pull actually transfers:

Before — cvefix

276.4 MB

After — cvefix2

337.7 MB

Increase

+61.3 MB

Local size

609 → 778 MB

That is +22.2% on a compressed transfer, and it is the direct consequence of moving the base three minor versions forward. The 62 MB of downloaded RPMs are correctly purged — that is why the increase is 61.3 MB and not 123 MB — but the upgraded packages themselves are genuinely larger than what they replaced.

The honest framing: 320 fewer findings for 61.3 MB. Whether that is a good trade depends entirely on whether you need a package manager in the image. If you do not, Hummingbird is still 145.5 MB with zero findings and no shell, and it remains the right answer.

## 10\. What is left

575 findings, 25 of them HIGH. Zero is not reachable here, and pretending otherwise would be the same mistake as calling the empty security channel a clean image. The residual is structural:

-   **RHEL 9 is a moving target that is behind.** Three minor versions of accumulated fixes have already landed in this pass. The remaining findings are the ones Red Hat has not shipped an errata for yet, and will clear over the following months as it does.
-   **The JRE carries one unfixable MEDIUM.** `CVE-2026-95512` has no published fix in any build Red Hat offers.
-   **Full UBI is a general-purpose OS.** It ships python3, systemd integration and a microdnf toolchain because it is designed to be a complete platform. Stripping it toward a Java-only image means building your own distroless — at which point use Hummingbird.

Compare the three images with no package manager. Google Distroless: 64 findings, 8 HIGH with no fix. UBI Micro: 115, 6 HIGH with no fix. UBI 9 full: 575, 25 HIGH — and a `dnf` that can eventually fix all 25. UBI 9 is worse today and better in principle. That is the actual trade, and it is a question about your operational model rather than about the numbers.

## 11\. Lessons

-   **An empty security channel means a stale base, not a safe one.** `dnf upgrade --security` returned "Nothing to do" on an image with 894 findings. The command succeeding is not the same as the image being remediated.
-   **`dnf install` does not upgrade the base.** Every package already present in the base tag stays pinned at the base's version, indefinitely, while the thing you just installed moves forward. This is the RHEL equivalent of the stale Alpine snapshot.
-   **Diff the CVE list, not the total.** The count went 895 → 575 and looked like a clean win. It was 321 cleared and 20 introduced. Two of those numbers are the difference between a credible finding and a misleading one.
-   **A fix that raises the count needs explaining.** Three packages the upgrade dragged in accounted for 16 new findings and were removable. Blindly accepting the upgrade would have made the image worse than the diff implied.
-   **Moving a base tag is a security change.** "Just bump the base" and "upgrade every package" are the same edit when the base is stale, and the second one moved the distro three minor versions in a single line.
-   **Measure the compressed size, not the local one.** 778 MB locally is 337.7 MB transferred. Quoting the local number overstates the cost by more than 2×.
-   **Accept an unfixable finding when the trade is 1 for 321.** The JRE regression is real and has no fix. It is still correct to ship the upgrade, provided the trade is stated rather than buried.

## 12\. Reproduce

Full command sequence, all of it read-only apart from the build:

```bash
# 1. Measure the security channel first -- it is empty
docker run --rm --user 0 --entrypoint sh \
  quay.io/hellodk/base-image:ubi9-4.0.2-java21-cvefix \
  -c 'dnf upgrade --refresh --security --assumeno'

# 2. Measure the full upgrade without committing to it
docker run --rm --user 0 --entrypoint sh \
  quay.io/hellodk/base-image:ubi9-4.0.2-java21-cvefix \
  -c 'dnf upgrade --refresh --assumeno'

# 3. Build, then scan
docker build -f Dockerfile.ubi9 \
  -t quay.io/hellodk/base-image:ubi9-4.0.2-java21-cvefix2 .
trivy image --scanners vuln --format json \
  --output scan.json quay.io/hellodk/base-image:ubi9-4.0.2-java21-cvefix2

# 4. Diff CVE+package pairs between the two scans, not the totals
```

-   Image: `quay.io/hellodk/base-image:ubi9-4.0.2-java21-cvefix2`, `sha256:fdc4f9ed221a81bebe77aea9497946f6f488dd50ebdc0811426a53002fb5bb7b`
-   Scanner: Trivy 0.70.0, `--scanners vuln`, OS findings under `Class: os-pkgs`, application findings under `Class: lang-pkgs`
-   Base: `registry.access.redhat.com/ubi9/ubi:9.5`, moved to 9.8 by the upgrade
-   Registry sizes: sum of compressed layer sizes from the OCI manifest
-   Workload: `spring-petclinic-rest` 4.0.2, Spring Boot 4.1.1, Java 21, port 9966
-   Related: _Which Java 21 Base Image Has the Fewest CVEs_ (2026-10-02) and _1 Finding to Zero: The One-Line Dockerfile Fix for CVE-2026-46675_ (2026-10-03)
