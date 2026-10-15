---
title: "Java 21 Base Image Remediation Programme"
date: 2026-10-03
description: "Created: 2026-10-03 · Owner: hellodk · Status: image 1 of 3 complete"
tags: [java, docker, container-security, cve]
cover: "assets/images/covers/java21-remediation-plan.svg"
draft: false
---

**Created:** 2026-10-03 · **Owner:** hellodk · **Status:** image 1 of 3 complete

Follow-on from `2026-10-02-java-distroless-cve-hunt` (the 7-image comparison) and
`2026-10-03-java21-libpng-cve-fix` (the `apk upgrade` that took Temurin from 1 finding to 0).

Goal: remediate, one image at a time, every candidate that was **not** already fixed in the
first pass — `cvefix3` (Temurin, Hummingbird `cvefix2`, Corretto `cvefix2`) are done.

---

## 1. Verified starting point

Measured by exporting each image's rootfs and inspecting it. Package-manager presence is a
fact about the image, not an assumption about its distribution.

| Image | Tag | OS | App | Total | Shell | Package manager in rootfs |
| --- | --- | --- | --- | --- | --- | --- |
| UBI 9 full | `ubi9-4.0.2-java21-cvefix` | 894 | 1 | **895** | `bash`, `sh` | **`dnf`, `yum`, `rpm` present** |
| UBI 9 Micro | `ubi-micro-4.0.2-java21` | 97 | 18 | **115** | `bash`, `sh` | **none** — only `/etc/dnf/*` config + `var/lib/rpm` |
| Google Distroless | `google-4.0.2-java21-cvefix` | 64 | 1 | **65** | none | **none** — only `var/lib/dpkg/status.d/*` |

Rootfs file counts: UBI 9 full 12,245 · UBI Micro 3,160 · Google 2,305.

## 2. The binding constraint

**None of these three images can reach zero findings.** This is a property of upstream, not of
the build, and it caps what this programme can achieve:

| Image | Unfixable findings | Detail |
| --- | --- | --- |
| Google Distroless | 8 HIGH | `libexpat1` ×4, `libuuid1` ×4 — no published fix |
| UBI 9 Micro | 6 HIGH | `pcre2` ×3, `pcre2-syntax` ×3 — no published fix |
| UBI 9 full | unknown until measured | RHEL 9 ships findings with no errata yet |

Every fix below is therefore a **reduction**, not an elimination. Targets are stated as
reductions, and no finding count is published before it is measured by Trivy.

All three also carry the identical application-layer finding, which is already solved in
`pom.xml` and lands on rebuild:

- `CVE-2026-41710` — `org.springframework.retry:spring-retry` `1.0.3.RELEASE` → `2.0.13`, MEDIUM,
  denial of service via cache exhaustion. Arrives transitively via `spring-data-jdbc 1.2.1.RELEASE`.

## 3. Decisions taken

| Decision | Choice |
| --- | --- |
| Order | UBI 9 full → UBI 9 Micro → Google Distroless |
| UBI Micro control | New tag `ubi-micro-4.0.2-java21-fixed`; the control tag stays untouched |
| Google Distroless | Time-boxed attempt at `apt` injection; document as unfixable if it fails boot test |
| Documentation | One separate post per image |

## 4. Per-image plan

Each image runs the same loop: **measure → fix → verify → push → document**. A dry run always
precedes any change, and no image is pushed unless it boots and scans clean of *new* findings.

### Image 1 — UBI 9 full — ✅ complete

Planned: dry run, then `dnf upgrade --refresh --security`, `dnf clean all`, purge the cache.

Measured outcome:

| | Before | After |
| --- | --- | --- |
| OS findings | 894 | **575** |
| HIGH | 95 | **25** (−70, a 73.7% cut) |
| MEDIUM | 458 | 276 |
| LOW | 341 | 274 |
| Application findings | 1 | **0** |
| Registry size | 276.4 MB | **337.7 MB** (+61.3 MB, +22.2%) |
| Base distro | RHEL 9.5 | RHEL 9.8 |
| Java | 21.0.12 | 21.0.12.1 |

Pushed `quay.io/hellodk/base-image:ubi9-4.0.2-java21-cvefix2`,
`sha256:fdc4f9ed221a81bebe77aea9497946f6f488dd50ebdc0811426a53002fb5bb7b`.
Boots to HTTP 200 in 30s, actuator `UP`, `uid=1001(appuser) gid=0(root)`.

Three findings that changed the plan mid-flight:

1. **`dnf upgrade --refresh --security` is a no-op.** It returns "No security updates needed, but 116
   updates available" and then "Nothing to do." The packages are stale, not unpatched, so the fix had to
   become an unconditional `dnf upgrade` — 116 upgrades + 5 installs, 62 MB.
2. **The upgrade introduced 20 new findings**, 16 from `glibc-langpack-en` (9),
   `rpm-plugin-systemd-inhibit` (6) and `gawk-all-langpacks` (1) — all pulled in as dependencies, none
   useful in a container. Removed all three after the upgrade. Verified to remove cleanly with no
   dependency breakage.
3. **One new finding is unfixable.** `CVE-2026-95512` in `java-21-openjdk-headless`, MEDIUM, no published
   fix, and `dnf list --available` confirms 21.0.12.1 is the newest build Red Hat ships. Accepted:
   1 unfixable MEDIUM traded for 321 cleared findings, 70 of them HIGH.

Final diff: **321 cleared, 1 introduced.** The single before-and-after total of "895 → 575" would have
hidden both of the last two points.

Documentation written: `2026-10-03-ubi9-full-remediation` (HTML + Medium + OG), and the comparison post's
tables, verdict, analysis section and size example were updated. The reconciler now covers all 10 digest
rows and passes 10/10 against the live registry.

### Image 2 — UBI 9 Micro — ✅ complete

The blocker was confirmed: no `rpm` and no `dnf` binary exists in the rootfs, only `/etc/dnf/*`
config and `var/lib/rpm`. The same is true of upstream `registry.access.redhat.com/ubi9/ubi-micro`.

Method actually used — the plan's "copy libraries over the micro rootfs" was **wrong in two ways**
and had to be replaced:

1. Overlaying the patch onto the *already published* image worked but inherited that image's dead
   62.08 MB JAR layer and added a second 62.18 MB one: **209.8 MB**, 11 layers, 36 s to boot.
   The fix was to build from **upstream `ubi9-micro:9.5`** instead, so only one JAR layer exists.
2. The JRE could not simply be copied out of `ubi9-minimal`, because the RHEL JRE ships three
   symlinks pointing outside itself (`conf` → `/etc/java/...`, `lib/security` → `/etc/java/...`,
   `tzdb.dat` → `/usr/share/javazi-1.8/`). ubi-micro has neither `/etc/java` nor `javazi`, so a
   plain `COPY` leaves `conf` dangling and the JVM dies at startup with
   `InternalError: Error loading java.security`. `cp -aL` in the staging stage dereferences them.
3. `COPY --chmod`, never a follow-up `RUN chmod`. A `RUN` that touches an existing file makes
   overlay2 copy that whole file up into a new diff layer, which duplicated the 62 MB JAR a
   *second* time (209.5 MB with 8 layers instead of 147.3 MB).

The rpm database is now genuinely consistent with the files on disk — unlike the UBI 9 full image,
where 116 packages advanced while only the files that actually change are present.

| | Before | After |
| --- | --- | --- |
| OS findings | 97 | **56** |
| Application findings | 18 | **0** |
| Total | 115 | **56** (−59, −51.3%) |
| CRITICAL | 3 | **0** |
| HIGH | 18 | **6** |
| MEDIUM | 74 | 37 |
| LOW | 20 | 13 |
| Registry size | 140.5 MB | **147.3 MB** (+6.8 MB, +4.8%) |
| Layers | 9 | 8 |
| Boot time | — | 8 s |

Result: 59 cleared, **0 introduced**. All three CRITICAL Tomcat findings and all 18 application
findings (old `spring-retry` 1.0.3, old Jackson databind) are gone. The residual 56 have no Red Hat
errata: glibc and `glibc-common` ×9 CVEs, `pcre2`/`pcre2-syntax` ×8, `libgcc` ×4, `ncurses` ×2.

Control tag left untouched at `sha256:7888370f76a47467d59035355ba17e631d439ab8759c8db643403ff71fa20a97`.
Fixed tag `ubi-micro-4.0.2-java21-fixed` = `sha256:69ee63e740f53b5aa463e4f3e7d8c45ba57d6debcfbe8a50f77a49744f06c167`.
A redundant alias `-fixed2` points at the same digest and could not be deleted (the registry token
carries no delete permission).

### Image 3 — Google Distroless — ✅ complete

Blocker confirmed: no shell, no `apt`, no `dpkg` binary. Injecting `apt` and re-stripping, as the
plan proposed, was rejected as too fragile. Instead the **one** library with a published fix was
replaced surgically.

Measurement first: a full `apt-get upgrade` on `debian:13-slim` upgrades **nothing**. glibc stays at
`2.41-12+deb13u4`, libgcc/libstdc++ at `14.2.0-19`, zlib, libuuid and libexpat are all already the
newest Debian 13 publishes. Of 64 OS findings exactly **one** is fixable today:

```text
CVE-2026-46675  libpng16-16t64  1.6.48-1+deb13u5 -> 1.6.48-1+deb13u6
```

So the build stages `libpng16-16t64` from `debian:13-slim` and, critically, also rewrites distroless'
own dpkg records (`/var/lib/dpkg/status.d/libpng16-16t64` and its `.md5sums`). Copying only the
`.so` would leave `deb13u5` on record and the finding would not clear — the fix has to be visible to
the metadata, not just to the binary.

**Methodology note.** The 2 October baseline read 65 findings. Re-scanning the *unmodified* control
on 3 October reads **69** — Trivy's database gained four entries (CVE-2026-95512 on `libfreetype6`,
CVE-2026-95619 on `gcc-14-base`/`libgcc-s1`/`libstdc++6`) that apply to versions already shipped.
Only same-database comparisons are honest, so:

| | Control (rescanned 3 Oct) | Fixed |
| --- | --- | --- |
| OS findings | 68 | **67** |
| Application findings | 1 | **0** |
| Total | 69 | **67** |
| CRITICAL / HIGH | 0 / 8 | 0 / 8 |
| MEDIUM / LOW | 40 / 20 | 39 / 20 |
| Registry size | 123.6 MB | **123.7 MB** (+0.1 MB, +0.1%) |
| Layers | 36 | 37 |

A version-level diff confirms the build changed exactly two things and nothing else: `libpng16-16t64`
`deb13u5 → deb13u6`, and `spring-retry 1.0.3.RELEASE` removed because the jar was rebuilt against the
already-pinned `pom.xml`. **No new findings and no other version changes.** The image is still
shell-less (2305 files, unchanged count), still UID 65532, still boots in 8 s.

Residual: 8 HIGH (`libexpat1` ×4, `libuuid1` ×4) and 40 MEDIUM/LOW dominated by 42 glibc findings,
none of which Debian has fixed.

### Image 4 — Hummingbird — ✅ verified clean, no fix required

Re-pulled by exact digest on 3 October and rescanned: **0 OS, 0 application**. Boots in 8 s, actuator
`UP`, Java 21.0.12.1, UID 65532, 145.5 MB. It has no shell and no package manager, which is the
reason it is clean. There is nothing to fix, so nothing was changed and nothing was rebuilt — an
invented rebuild would only risk regressing it. Written up as a verification, not a remediation.

`sha256:5e123f11250e750783e34d9b27b545c2493cedda7f39106e64c88ceacadfca80`

### Excluded — Chainguard

Java 21 tags are access-restricted and cannot be pulled anonymously, and `:jre:latest` is Java
27. No image can be built, so there is nothing to remediate.

## 5. Definition of done, per image

- [ ] Dry run measured and recorded before any change
- [ ] Fix implemented in the Dockerfile
- [ ] Rebuilt and booted: HTTP 200, actuator `UP`, expected non-root UID
- [ ] Trivy scan recorded, no new findings introduced
- [ ] Registry size re-measured from the manifest (compressed layer sum)
- [ ] Pushed, digest read back and matched
- [ ] Per-image post written
- [ ] Comparison post's tables updated with the new figures
