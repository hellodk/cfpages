---
title: "69 to 67: The Honest Result of Remediating Distroless"
date: 2026-10-03
description: "Google Distroless has no shell, no apt and no dpkg. A full Debian 13 upgrade changes nothing and exactly one of its 64 OS findings has a fix published anywhere. This is the write-up of a remediation that cleared two findings for 0.1 MB, and of why that is the correct answer rather than a disappointi"
tags: [docker, distroless, container-security, cve]
cover: "assets/images/covers/google-distroless-remediation.svg"
draft: false
---

Container Security · Google Distroless · Debian 13

Google Distroless has no shell, no `apt` and no `dpkg`. The plan was to inject a package manager, upgrade, then re-strip. Measuring first showed that a full Debian 13 upgrade changes _nothing_, and exactly one of its 64 OS findings has a fix published anywhere. This is the write-up of a remediation that cleared two findings for 0.1 MB — and of why that is the correct answer rather than a disappointing one.

## 1\. Where we started

The published `quay.io/hellodk/base-image:google-4.0.2-java21-cvefix` image is built on `gcr.io/distroless/java21-debian13:nonroot`: a Debian 13 (trixie) userland with a JRE and the Spring Boot app, no shell, no package manager, running as UID 65532.

Scanned on 2 October it read **64 OS findings and 1 application finding**. The 8 HIGH were `libexpat1` ×4 and `libuuid1` ×4 — the exact two packages the original plan had already flagged as having no published fix. The single application finding was `spring-retry` 1.0.3.RELEASE.

## 2\. The blocker

There is no way to upgrade a package inside this image, because there is nothing in the image that can upgrade a package:

| Tool | Present? |
| --- | --- |
| sh, bash | no — 2305 files, no shell of any kind |
| apt, apt-get | no |
| dpkg | no |
| curl, tar | no |
| dpkg metadata | yes — /var/lib/dpkg/status.d/<package>, one file per package |

That last row is the important one. Distroless keeps per-package dpkg records under `/var/lib/dpkg/status.d/` rather than one combined `/var/lib/dpkg/status`. A scanner trusts those files, not the binaries. So replacing a shared library does not by itself change what is reported — the metadata has to change too, or the fix is cosmetic.

**The plan was rejected.** The original approach — inject `apt` and `dpkg` from a Debian build stage, run the upgrade, then re-strip to restore the distroless property — was dropped before implementation. Re-stripping a shell-less image after mutating it is exactly the kind of change that silently breaks the image, and measurement (next section) showed there was almost nothing to gain for the risk.

## 3\. Almost nothing is fixable

The single most useful thing done on this image was running a full Debian 13 security upgrade in a throwaway container and seeing what it actually does. The answer was **nothing**.

```bash
docker run --rm debian:13-slim sh -c "
apt-get update -qq; apt-get upgrade -y -qq
dpkg-query -W -f='\${Package} \${Version}\n' libc6 libgcc-s1 libstdc++6 libuuid1 zlib1g"

gcc-14-base 14.2.0-19
libbz2-1.0 1.0.8-6
libc-bin 2.41-12+deb13u4
libc6 2.41-12+deb13u4
libgcc-s1 14.2.0-19
libstdc++6 14.2.0-19
libuuid1 2.41.5-0+deb13u1
zlib1g 1:1.3.dfsg+really1.3.1-1+b1
```

Every one of those is byte-identical to what the distroless image already ships. Checking what candidates the archive actually offers makes it explicit:

| Package | Distroless ships | Debian candidate today | Findings | Fixable? |
| --- | --- | --- | --- | --- |
| libpng16-16t64 | 1.6.48-1+deb13u5 | 1.6.48-1+deb13u6 | 2 | yes |
| libc6, libc-bin | 2.41-12+deb13u4 | 2.41-12+deb13u4 | 42 | no |
| libexpat1 | 2.8.3-1~deb13u1 | 2.8.3-1~deb13u1 | 6 (4 HIGH) | no |
| libuuid1 | 2.41.5-0+deb13u1 | 2.41.5-0+deb13u1 | 6 (4 HIGH) | no |
| libstdc++6, gcc-14-base, libgcc-s1 | 14.2.0-19 | 14.2.0-19 | 3 | no |
| zlib1g, libbz2-1.0, liblcms2-2-0, libpng16-16t64 (other) | — | — | 5 | no |

**Of 64 OS findings, exactly one is fixable today.** The other 63 are on packages Debian has not rebuilt. Injecting a package manager would have produced a fragile, probably-broken image in exchange for zero additional fixes.

## 4\. The method

Since only one library can move, the build moves exactly that one, and does it in a way that is visible to the package metadata as well as to the binary.

Where the single fixable library comes from

<svg viewBox="0 0 900 260" role="img" aria-label="debian 13-slim provides the fixed libpng, the distroless base provides its dpkg records, both are combined by a patch stage, and the result is copied into the final shell-less image.">
            <defs>
              <marker id="ar2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#4B5563"></path>
              </marker>
            </defs>
            <rect x="10" y="30" width="210" height="80" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="2"></rect>
            <text x="115" y="58" text-anchor="middle" fill="#111827" font-size="13" font-family="system-ui" font-weight="600">debian:13-slim</text>
            <text x="115" y="78" text-anchor="middle" fill="#4B5563" font-size="11" font-family="system-ui">libpng16-16t64</text>
            <text x="115" y="95" text-anchor="middle" fill="#16A34A" font-size="11" font-family="system-ui">deb13u6 ✓ fixed</text>
            <rect x="10" y="150" width="210" height="80" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="2"></rect>
            <text x="115" y="178" text-anchor="middle" fill="#111827" font-size="13" font-family="system-ui" font-weight="600">distroless base</text>
            <text x="115" y="198" text-anchor="middle" fill="#4B5563" font-size="11" font-family="system-ui">status.d/libpng16-16t64</text>
            <text x="115" y="215" text-anchor="middle" fill="#4B5563" font-size="11" font-family="system-ui">records deb13u5</text>
            <rect x="330" y="80" width="220" height="100" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
            <text x="440" y="112" text-anchor="middle" fill="#fff" font-size="13" font-family="system-ui" font-weight="600">patch stage</text>
            <text x="440" y="132" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">new .so + u5→u6 record</text>
            <text x="440" y="150" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">md5sums regenerated</text>
            <text x="440" y="168" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">no shell in final image</text>
            <rect x="660" y="80" width="220" height="100" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
            <text x="770" y="112" text-anchor="middle" fill="#fff" font-size="13" font-family="system-ui" font-weight="600">google-…-fixed</text>
            <text x="770" y="132" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">2305 files, unchanged</text>
            <text x="770" y="150" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">uid 65532 · no shell</text>
            <text x="770" y="168" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">123.7 MB</text>
            <path d="M220,70 L325,110" stroke="#4B5563" stroke-width="2" fill="none" marker-end="url(#ar2)"></path>
            <path d="M220,190 L325,150" stroke="#4B5563" stroke-width="2" fill="none" marker-end="url(#ar2)"></path>
            <path d="M550,130 L655,130" stroke="#4B5563" stroke-width="2" fill="none" marker-end="url(#ar2)"></path>
          </svg>

The patch stage needs a shell, so it runs on Debian. The image it produces is only files — nothing executable beyond the one library — so the final image stays shell-less.

### Stage 2 — obtain the fixed library

```bash
FROM docker.io/library/debian:13-slim AS libpng
RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends libpng16-16t64 \
    && rm -rf /var/lib/apt/lists/*
RUN dpkg-query -W -f='${Package} ${Version}\n' libpng16-16t64
```

### Stage 3 — rewrite the record as well as the binary

This is the part that actually clears the finding. Copying only `libpng16.so.16.48.0` would leave `Version: 1.6.48-1+deb13u5` in the dpkg record, and the scanner would keep reporting the finding while the actual bytes on disk were patched — the worst possible state, because it looks remediated and is not.

```bash
FROM docker.io/library/debian:13-slim AS patch
RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends libpng16-16t64 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=base /var/lib/dpkg/status.d/libpng16-16t64         /p/status
COPY --from=base /var/lib/dpkg/status.d/libpng16-16t64.md5sums /p/md5sums
# u5 -> u6 in Version, Provides and Breaks, then install the real deb13u6 object.
# install -D also recreates /usr/lib/x86_64-linux-gnu/ under the staging root.
RUN cd /p \
    && sed -i 's/deb13u5/deb13u6/g' status \
    && install -D -m 0644 /usr/lib/x86_64-linux-gnu/libpng16.so.16.48.0 \
                /p/out/usr/lib/x86_64-linux-gnu/libpng16.so.16.48.0 \
    && cd /p/out \
    && mkdir -p var/lib/dpkg/status.d \
    && cp /p/status var/lib/dpkg/status.d/libpng16-16t64 \
    && newmd5=$(md5sum usr/lib/x86_64-linux-gnu/libpng16.so.16.48.0 | cut -d" " -f1) \
    && sed "s|^dfaa70c7860eceb19c8e0a2029ad057c |$newmd5 |" /p/md5sums \
        > var/lib/dpkg/status.d/libpng16-16t64.md5sums \
    && echo "new libpng md5: $newmd5" \
    && grep '^Version:' var/lib/dpkg/status.d/libpng16-16t64
```

Three details are deliberate. `sed 's/deb13u5/deb13u6/g'` rewrites the `Version:`, `Provides:` and `Breaks:` lines together, because leaving `Provides: libpng16-16 (= …deb13u5)` would make the record internally inconsistent. The `md5sums` file is regenerated rather than left stale, since it would otherwise describe a file that no longer exists. And `grep '^Version:'` echoes the result, so the build log always states which version actually landed.

### Stage 4 — the runtime image

```bash
FROM gcr.io/distroless/java21-debian13:nonroot
COPY --from=patch /p/out/ /
WORKDIR /app
COPY --from=builder /tmp/app.jar /app/app.jar
EXPOSE 9966
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", \
            "-jar", "/app/app.jar"]
```

No `apt`, no `dpkg`, no shell was ever added. The image gained exactly one layer containing one shared library and two metadata files.

## 5\. The measurement trap

The first scan of the new image appeared to make things _worse_: 65 findings before, 67 after, with four apparently new ones.

```bash
BEFORE   OS=64  APP=1  TOTAL=65
AFTER    OS=67  APP=0  TOTAL=67
new 4: CVE-2026-95512 libfreetype6
       CVE-2026-95619 gcc-14-base, libgcc-s1, libstdc++6
```

Those four were not caused by the change. The "before" number came from a scan on 2 October; the "after" from 3 October. Re-scanning the _unmodified control image_ on 3 October gave **69** — Trivy's database had simply gained four entries that apply to versions the image already shipped.

| Scan | OS | App | Total |
| --- | --- | --- | --- |
| Control, 2 October database | 64 | 1 | 65 |
| Control, 3 October database | 68 | 1 | 69 |
| Fixed build, 3 October database | 67 | 0 | 67 |

**Only same-database comparisons mean anything.** Comparing a scan taken today against one taken last week measures the vulnerability database, not the image. Every before/after figure in this programme is therefore same-day and same-database, and the four-entry drift is reported rather than hidden.

To rule out any real regression, the installed version of every affected package was diffed between the two images. The build changed exactly two things:

```bash
version changes control -> fixed:
  CVE-2021-4214    libpng16-16t64    1.6.48-1+deb13u5 -> 1.6.48-1+deb13u6
  CVE-2026-3713    libpng16-16t64    1.6.48-1+deb13u5 -> 1.6.48-1+deb13u6
  CVE-2026-41710   spring-retry      1.0.3.RELEASE    -> None
  CVE-2026-46675   libpng16-16t64    1.6.48-1+deb13u5 -> None
```

Two version changes, both intended, nothing else touched. The `spring-retry` removal is not a fix in this image — it is the same `pom.xml` rebuild every other image in the set received. **No other package version changed, so the base-image refresh introduced no regression.**

## 6\. What it moved

| Measure | Control (rescanned 3 Oct) | Fixed | Change |
| --- | --- | --- | --- |
| OS findings | 68 | 67 | −1 |
| Application findings | 1 | 0 | −1 |
| Total | 69 | 67 | −2 |
| CRITICAL | 0 | 0 | — |
| HIGH | 8 | 8 | — |
| MEDIUM | 40 | 39 | −1 |
| LOW | 20 | 20 | — |
| UNKNOWN | 1 | 0 | −1 |
| Findings introduced | — | 0 | — |

Two findings cleared: `CVE-2026-46675` (libpng) by the library bump, and `CVE-2026-41710` (`spring-retry`) by the JAR rebuild. The HIGH count is unchanged at 8 because the one fixed finding was severity `UNKNOWN`.

## 7\. Verification

Since the whole point of this image is what it does _not_ contain, the containment was verified as rigorously as the fix.

```bash
$ docker run --rm --entrypoint /busybox/sh \
    quay.io/hellodk/base-image:google-4.0.2-java21-fixed -c 'id'
OCI runtime exec failed: exec: "id": executable file not found in $PATH

$ docker run --rm --entrypoint /busybox/sh \
    quay.io/hellodk/base-image:google-4.0.2-java21-fixed -c 'ls /usr/bin/apt'
OCI runtime exec failed: … executable file not found in $PATH
```

| Check | Result |
| --- | --- |
| Container start | HTTP 200 in 8 s |
| Actuator | {"groups":["liveness","readiness"],"status":"UP"} |
| Image config User | 65532 — unchanged |
| File count | 2305 in both control and fixed — nothing added or lost |
| Shell / apt / dpkg | confirmed still absent |
| libpng version on disk | 1.6.48-1+deb13u6, md5sum regenerated |

The file-count equality is the strongest single check: 2305 files before and after means the overlay replaced files in place and introduced nothing. A build that had smuggled in a shell would have shown up here immediately.

## 8\. What it cost

| Tag | Registry size | Layers |
| --- | --- | --- |
| google-4.0.2-java21-cvefix (control) | 123.6 MB | 36 |
| google-4.0.2-java21-fixed | 123.7 MB | 37 |

**+0.1 MB, or +0.1%.** One additional layer holding one 100 KB library. Fixed digest: `sha256:ba8b0af3928054785db65e810771db0e56cbe83d138e46e5895ae54ddb57b1df`.

## 9\. What is left

67 findings, of which 66 have no fix available from anyone.

| Package | Findings | Note |
| --- | --- | --- |
| libc6, libc-bin | 42 | Debian has not rebuilt glibc 2.41-12+deb13u4 |
| libexpat1 | 6 (4 HIGH) | candidate is still 2.8.3-1~deb13u1 |
| libuuid1 | 6 (4 HIGH) | candidate is still 2.41.5-0+deb13u1 |
| libstdc++6, gcc-14-base, libgcc-s1 | 3 | already newest |
| libpng16-16t64 (residual), zlib1g, libbz2-1.0, liblcms2-2-0 | 5 | already newest |

**8 HIGH findings are not fixable on Debian 13.** They are not a defect in this build, and they are not fixable by rebuilding harder. They clear only when Debian ships `libexpat1` and `libuuid1` updates. Do not report this image as clean.

## 10\. Reproduce it yourself

### 1\. Prove the blocker

```bash
cid=$(docker create gcr.io/distroless/java21-debian13:nonroot true)
docker export "$cid" | tar -t | grep -E '(sh|bash|apt|dpkg)$'
# expected: nothing
docker rm "$cid"
```

### 2\. Establish the ceiling before writing any Dockerfile

```bash
docker run --rm debian:13-slim sh -c "
apt-get update -qq; apt-get upgrade -y -qq
dpkg-query -W -f='\${Package} \${Version}\n' libc6 libexpat1 libuuid1 libpng16-16t64"
docker run --rm debian:13-slim sh -c "
apt-get update -qq; apt-cache policy libpng16-16t64 libexpat1"
```

### 3\. Build

```bash
cd petclinic-rest
docker build -f Dockerfile.google-distroless \
  -t quay.io/hellodk/base-image:google-4.0.2-java21-fixed .
```

### 4\. Scan both images on the same day

```bash
trivy image --quiet --scanners vuln --format json \
  --output scan-google-control.json \
  quay.io/hellodk/base-image:google-4.0.2-java21-cvefix
trivy image --quiet --scanners vuln --format json \
  --output scan-google-fixed.json \
  quay.io/hellodk/base-image:google-4.0.2-java21-fixed
```

### 5\. Diff package versions, not totals

```python
python3 - <<'PY'
import json
def vers(f):
    d=json.load(open(f)); out={}
    for r in d.get('Results') or []:
        for v in r.get('Vulnerabilities') or []:
            out[(v['VulnerabilityID'], v['PkgName'])]=v['InstalledVersion']
    return out
a,b = vers('scan-google-control.json'), vers('scan-google-fixed.json')
for k in sorted(set(a)|set(b)):
    if a.get(k)!=b.get(k): print(k, a.get(k),'->',b.get(k))
PY
```

### 6\. Confirm nothing was smuggled in

```bash
cid=$(docker create quay.io/hellodk/base-image:google-4.0.2-java21-fixed true)
docker export "$cid" | tar -t | wc -l          # 2305
docker export "$cid" | tar -t \
  | grep -E '(^|/)(sh|bash|apt|apt-get|dpkg)$' | grep -v dpkg/status
docker rm "$cid"                              # expect no output
```

### 7\. Boot test

```bash
docker rm -f gg 2>/dev/null
docker run -d --name gg -p 9971:9966 \
  quay.io/hellodk/base-image:google-4.0.2-java21-fixed
for i in $(seq 1 45); do
  c=$(curl -s -o /dev/null -w '%{http_code}' \
       http://localhost:9971/petclinic/actuator/health)
  [ "$c" = "200" ] && break; sleep 2
done
echo "HTTP $c after $((i*2))s"
docker rm -f gg
```

### The complete Dockerfile

```bash
FROM docker.io/library/maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -Djava.version=21 -DskipTests package \
    && cp target/spring-petclinic-rest-*.jar /tmp/app.jar

FROM gcr.io/distroless/java21-debian13:nonroot AS base

FROM docker.io/library/debian:13-slim AS libpng
RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends libpng16-16t64 \
    && rm -rf /var/lib/apt/lists/*

FROM docker.io/library/debian:13-slim AS patch
RUN apt-get update -qq \
    && apt-get install -y -qq --no-install-recommends libpng16-16t64 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=base /var/lib/dpkg/status.d/libpng16-16t64         /p/status
COPY --from=base /var/lib/dpkg/status.d/libpng16-16t64.md5sums /p/md5sums
RUN cd /p \
    && sed -i 's/deb13u5/deb13u6/g' status \
    && install -D -m 0644 /usr/lib/x86_64-linux-gnu/libpng16.so.16.48.0 \
                /p/out/usr/lib/x86_64-linux-gnu/libpng16.so.16.48.0 \
    && cd /p/out \
    && mkdir -p var/lib/dpkg/status.d \
    && cp /p/status var/lib/dpkg/status.d/libpng16-16t64 \
    && newmd5=$(md5sum usr/lib/x86_64-linux-gnu/libpng16.so.16.48.0 | cut -d" " -f1) \
    && sed "s|^dfaa70c7860eceb19c8e0a2029ad057c |$newmd5 |" /p/md5sums \
        > var/lib/dpkg/status.d/libpng16-16t64.md5sums

FROM gcr.io/distroless/java21-debian13:nonroot
COPY --from=patch /p/out/ /
WORKDIR /app
COPY --from=builder /tmp/app.jar /app/app.jar
EXPOSE 9966
ENTRYPOINT ["java", "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
```

### Disaster recovery

The control tag was never modified, so reverting is a pull:

```bash
docker pull quay.io/hellodk/base-image@sha256:cd50ed9b02229151f
```
