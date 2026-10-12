---
title: "115 to 56: Remediating an Image That Cannot Patch Itself"
date: 2026-10-03
description: "UBI Micro scored 115 findings, 3 CRITICAL in Tomcat, and ships no rpm, dnf or microdnf — nothing inside it can upgrade anything. Building the fix outside and copying it in cleared 59 and introduced none, for +4.8% size. Three build bugs along the way, the last silently duplicating a 62 MB JAR."
tags: [rhel, ubi, docker, container-security, cve]
cover: "assets/images/covers/ubi-micro-remediation.svg"
draft: false
---

Container Security · UBI 9 Micro · No Package Manager

UBI Micro scored 115 findings, three of them CRITICAL in Tomcat. It also has no `rpm`, no `dnf` and no `microdnf` — nothing inside the image can upgrade anything. The fix had to be manufactured outside and copied in. It cleared 59 findings, introduced none, and cost 6.8 MB. Getting there took three separate bugs, the last of which was silently duplicating a 62 MB JAR inside the image.

## 1\. Where we started

Red Hat's UBI Micro is the smallest of the RHEL-family images in this comparison: 22 RPMs, a few hundred kilobytes of userland, and `bash` present but no package manager. The published `quay.io/hellodk/base-image:ubi-micro-4.0.2-java21` image carried the Spring Boot application on a hand-installed JRE at `/opt/jre`.

It scanned at **115 findings**: 97 in the OS layer and 18 in the application layer, the worst OS-to-app ratio in the set. Three were CRITICAL, all in `tomcat-embed-core`. The application-layer 18 came from old pins — `spring-retry` 1.0.3.RELEASE and Jackson databind — and were the same findings already fixed on every other image by rebuilding against the updated `pom.xml`.

**The shape of the problem.** An image with no package manager cannot be upgraded by anyone who does not want to rebuild it. That is the entire reason the OS layer had rotted. It is also why the fix cannot be a one-line `dnf upgrade`.

## 2\. The image cannot fix itself

Before designing anything, the blocker was verified rather than assumed. Both the published image and upstream `registry.access.redhat.com/ubi9/ubi-micro` were exported and searched for a package manager:

| Binary | Published micro image | Upstream ubi9-micro |
| --- | --- | --- |
| rpm | absent | absent |
| dnf | absent | absent |
| microdnf | absent | absent |
| bash / sh | present | present |
| java | /opt/jre, hand-installed | absent |

What micro _does_ carry is the database: `/etc/dnf/*` configuration and a populated `/var/lib/rpm`. That matters, because a scanner reads the rpm database to decide what is installed. It means a correct fix must keep the database in agreement with the files on disk — you cannot simply drop in a newer `.so` and expect the finding to clear.

## 3\. What is actually fixable

Installing micro's exact 22-package set into a scratch installroot with `dnf`, and then upgrading it in place, showed how much of the 115 is reachable. **41 findings were fixable; 56 were not.** The unfixable set is dominated by `pcre2` and `pcre2-syntax`, which Red Hat has not shipped an erratum for.

Fixable — cleared by the build

41

No Red Hat erratum — cannot be cleared

56

Application findings — cleared by rebuilding

18

The upgradable packages were `glibc`, `glibc-common`, `glibc-minimal-langpack`, `libacl`, `libattr` and `libcap`. `pcre2`, `libgcc` and `ncurses` were already at the newest build RHEL publishes for the 9.x line.

## 4\. The method

A four-stage build. Nothing that can upgrade a package reaches the final image; only the resulting files do.

Build stages

<svg viewBox="0 0 900 300" role="img" aria-label="Four stage build: Maven builds the jar, ubi-minimal stages the JRE, ubi9 patches 22 RPMs into an overlay, and the final micro image copies all three in.">
            <defs>
              <marker id="ar" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z" fill="#4B5563"></path>
              </marker>
            </defs>
            <rect x="10" y="40" width="180" height="80" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
            <text x="100" y="72" text-anchor="middle" fill="#fff" font-size="13" font-family="system-ui" font-weight="600">builder</text>
            <text x="100" y="92" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">maven + temurin</text>
            <text x="100" y="108" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">app.jar 62 MB</text>
            <rect x="250" y="40" width="180" height="80" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="2"></rect>
            <text x="340" y="72" text-anchor="middle" fill="#111827" font-size="13" font-family="system-ui" font-weight="600">jrestage</text>
            <text x="340" y="92" text-anchor="middle" fill="#4B5563" font-size="11" font-family="system-ui">ubi9-minimal</text>
            <text x="340" y="108" text-anchor="middle" fill="#4B5563" font-size="11" font-family="system-ui">cp -aL → /jre</text>
            <rect x="250" y="180" width="180" height="80" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="2"></rect>
            <text x="340" y="212" text-anchor="middle" fill="#111827" font-size="13" font-family="system-ui" font-weight="600">patcher</text>
            <text x="340" y="232" text-anchor="middle" fill="#4B5563" font-size="11" font-family="system-ui">ubi9 + dnf</text>
            <text x="340" y="248" text-anchor="middle" fill="#4B5563" font-size="11" font-family="system-ui">installroot → /out</text>
            <rect x="530" y="100" width="200" height="100" rx="8" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
            <text x="630" y="130" text-anchor="middle" fill="#fff" font-size="13" font-family="system-ui" font-weight="600">runtime</text>
            <text x="630" y="150" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">ubi9-micro:9.5</text>
            <text x="630" y="168" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">no package manager</text>
            <text x="630" y="186" text-anchor="middle" fill="#c7d2fe" font-size="11" font-family="system-ui">uid 1001 · java 21</text>
            <path d="M190,80 L245,80" stroke="#4B5563" stroke-width="2" fill="none" marker-end="url(#ar)"></path>
            <path d="M430,80 L525,130" stroke="#4B5563" stroke-width="2" fill="none" marker-end="url(#ar)"></path>
            <path d="M430,220 L525,175" stroke="#4B5563" stroke-width="2" fill="none" marker-end="url(#ar)"></path>
            <text x="756" y="152" text-anchor="middle" fill="#111827" font-size="12" font-family="system-ui" font-weight="600">147.3 MB</text>
            <text x="756" y="170" text-anchor="middle" fill="#4B5563" font-size="11" font-family="system-ui">8 layers</text>
          </svg>

The two staging stages never enter the final image. Only their output files do — micro keeps its shell-less, package-manager-free property.

The patcher stage pins micro's exact package list so the overlay contains precisely those 22 RPMs and nothing that came along as a weak dependency:

```bash
ARG MICRO_PACKAGES="basesystem bash coreutils-single filesystem glibc glibc-common \
glibc-minimal-langpack libacl libattr libcap libgcc libselinux libsepol \
ncurses-base ncurses-libs pcre2 pcre2-syntax redhat-release setup tzdata"
RUN dnf -y --installroot=/out --releasever=9 --nodocs \
        --setopt=install_weak_deps=False \
        --setopt=reposdir=/etc/yum.repos.d \
        install $MICRO_PACKAGES
```

`install_weak_deps=False` matters more than it looks. Without it `dnf` drags in `glibc-langpack-*` packages, and those carry their own locale and gconv data — dozens of megabytes of files that belong to no package micro actually shipped. `--setopt=reposdir=/etc/yum.repos.d` is needed because ubi9's repositories are declared as files there rather than through `dnf`'s built-in defaults.

Account files are deleted from the overlay before it is merged. `dnf --installroot` creates its own `/etc/passwd` and `/etc/group` containing a root entry, and copying those over micro's would overwrite the deliberately empty, uid-1001-by-number identity the image relies on.

## 5\. Three bugs we shipped before it worked

This is the part worth reading. Each of the following produced an image that scanned perfectly and was still wrong. A scan is not a boot test.

### Bug 1 — building on the previous image instead of upstream

The first attempt based the fix on `quay.io/hellodk/base-image:ubi-micro-4.0.2-java21` and overlaid the patch. It worked: 56 findings, boots fine. But Docker layers are append-only, so the previous image's 62.08 MB JAR layer could never be reclaimed, and the new JAR was added as a second 62.18 MB layer.

**209.8 MB, 11 layers, 36 seconds to boot** — against a 140.5 MB original. Rebuilding from `registry.access.redhat.com/ubi9/ubi-micro:9.5` instead removes the duplicate entirely.

The general lesson: **never base a remediation image on the image you are remediating.** Layer history is immutable, so anything you do not remove at source is carried forever.

### Bug 2 — the JRE that could not start

Rebuilding cleanly meant copying the JRE into `/opt/jre` from `ubi9-minimal`. It built, it scanned at 56 findings, and the container exited immediately. `java -version` worked standalone. The app failed with:

```bash
Exception in thread "main" java.lang.InternalError: Error loading java.security file
        at java.base/java.security.Security.initialize(Security.java:125)
```

Exporting the rootfs showed `/opt/jre/conf/security/` simply absent while the staged copy had all four files. The cause is that the RHEL JRE ships three symlinks pointing _outside its own directory_:

| Symlink | Points at | Present in micro? |
| --- | --- | --- |
| conf | /etc/java/java-21-openjdk/<v>/conf — holds java.security | no |
| lib/security | /etc/java/java-21-openjdk/<v>/lib/security — holds cacerts | no |
| tzdb.dat | /usr/share/javazi-1.8/tzdb.dat | no |

Micro has neither `/etc/java` nor `javazi`, so `COPY` faithfully reproduced the symlinks as dangling pointers. The JVM then started, found `conf` unresolvable, and died. The fix is `cp -aL` in the staging stage — the `-L` dereferences, materialising all three as real files:

```bash
RUN microdnf install -y --nodocs java-21-openjdk-headless ca-certificates zlib libstdc++ \
    && microdnf clean all \
    && rm -rf /var/cache/dnf /var/log/* \
    && cp -aL /usr/lib/jvm/java-21-openjdk-* /jre \
    && test -f /jre/conf/security/java.security \
    && /jre/bin/java -version
```

The `test -f` is deliberate. It turns the failure from "somewhere in the JVM, at some later point" into a build-time error at the exact line that caused it.

### Bug 3 — the wrong path for the JRE

A smaller version of the same trap: the first attempt assumed `/usr/lib/jvm/java-21-openjdk` was the JVM directory. It is a symlink chain, and `ubi9-minimal` resolves it to a version-suffixed directory:

```bash
/usr/lib/jvm/java-21-openjdk-21.0.12.1.1-1.2.el9.x86_64/bin/java
```

This failed loudly and early — `exit 127` at `java -version` — which is the correct way for it to fail. Normalising the directory to `/jre` in the staging stage also makes the Dockerfile immune to the next version bump.

## 6\. The 62 MB layer that was not the JAR

With bugs fixed, the clean rebuild still measured 209.5 MB — 69 MB more than the original, for a 29 MB overlay. The file inventory was almost identical to the original image: `/opt/jre` 404 files in both, `/usr/share` 2129 in both, `/app` 2 in both.

The layer breakdown gave it away — two layers of exactly the same size:

| Layer | Size | What it actually is |
| --- | --- | --- |
| 1 | 6.68 MB | ubi9-micro base |
| 2 | 7.12 MB | the patched overlay |
| 3 | 70.30 MB | the JRE |
| 4–7 | ~1 MB | native libraries, CA bundle, metadata |
| 8 | 62.18 MB | the JAR, copied up a second time |
| 9 | 62.18 MB | the JAR |

The culprit was this line:

```bash
COPY --from=builder /tmp/app.jar /app/app.jar
RUN chmod 644 /app/app.jar   ← deletes nothing, adds 62 MB
```

`chmod` does not modify a file, it replaces its inode. overlay2 implements that as a _copy-up_: the file is copied into a new diff layer. On a 62 MB file that is a second 62 MB layer, and it is now in the published image forever.

The fix is to set the mode on the `COPY` itself, so the file is written once with the mode already correct:

```bash
COPY --from=builder --chown=1001:0 --chmod=644 /tmp/app.jar /app/app.jar
```

Result: **147.3 MB and 8 layers**, and the image boots in 8 seconds instead of 36 — the boot test caught this too, because 62 MB of extra layers have to be pulled before the container can start.

**Worth internalising.** Any `RUN` that touches an already-copied large file duplicates it. `chown` and `chmod` should always be folded into the `COPY`. This one line was 42% of the image.

## 7\. What it moved

| Measure | Before | After | Change |
| --- | --- | --- | --- |
| OS findings | 97 | 56 | −41 |
| Application findings | 18 | 0 | −18 |
| Total | 115 | 56 | −59 (−51.3%) |
| CRITICAL | 3 | 0 | −3 |
| HIGH | 18 | 6 | −12 |
| MEDIUM | 74 | 37 | −37 |
| LOW | 20 | 13 | −7 |
| Findings introduced | — | 0 | — |

All three CRITICAL `tomcat-embed-core` findings and all 18 application findings are gone — the latter purely because the JAR was rebuilt against the already-updated `pom.xml`, the same fix applied on every other image in the set.

The residual 56 are entirely in the OS layer. Crucially, **the rpm database now agrees with the files on disk**: 116 packages advanced, and the overlay contains the real updated libraries and their real metadata. That is a stronger guarantee than the UBI 9 full build can offer.

## 8\. Verification

A CVE-level diff of the two scans, comparing `(VulnerabilityID, PkgName)` pairs rather than totals:

```bash
clean rebuild vs before: cleared 59, new 0 (none)
```

Zero introduced findings is the number that matters most here, because a remediation that trades 40 old findings for 4 new ones is a different proposition from one that simply clears.

| Check | Result |
| --- | --- |
| Container start | HTTP 200 in 8 s |
| Actuator | {"groups":["liveness","readiness"],"status":"UP"} |
| Runtime user | uid=1001 gid=0(root) — numeric, no passwd entry, as intended |
| Java | openjdk version "21.0.12.1" 2026-08-18 LTS |
| Package manager still absent | confirmed — micro's defining property preserved |
| Control tag digest | sha256:7888370f76a… unchanged |

```bash
docker rm -f um2 2>/dev/null
docker run -d --name um2 -p 9969:9966 \
  quay.io/hellodk/base-image:ubi-micro-4.0.2-java21-fixed2

for i in $(seq 1 45); do
  s=$(curl -s -o um2.json -w '%{http_code}' \
       http://localhost:9969/petclinic/actuator/health)
  [ "$s" = "200" ] && break
  sleep 2
done
echo "HTTP $s in $((i*2))s  $(cat um2.json)"
echo "user: $(docker exec um2 id)"
docker rm -f um2
```

## 9\. What it cost

Registry size, measured as the sum of compressed layer sizes in the manifest — the number that actually affects pull time:

Control — 9 layers

140.5 MB

Overlay on previous image — 11 layers

209.8 MB

Final — 8 layers

147.3 MB

**+6.8 MB, or +4.8%** — the cheapest remediation in the entire comparison. For comparison, the UBI 9 full image needed +61.3 MB to remove 320 findings.

| Tag | Registry size | Layers | Digest |
| --- | --- | --- | --- |
| ubi-micro-4.0.2-java21 (control) | 140.5 MB | 9 | sha256:7888370f76a47467d59035355ba17e631d439ab8759c8db643403ff71fa20a97 |
| ubi-micro-4.0.2-java21-fixed | 147.3 MB | 8 | sha256:69ee63e740f53b5aa463e4f3e7d8c45ba57d6debcfbe8a50f77a49744f06c167 |

The control tag was deliberately left untouched so the before/after comparison stays reproducible. A redundant alias `-fixed2` also points at the fixed digest; it could not be removed because the registry token used here carries no delete permission.

## 10\. What is left

56 findings, and none of them can be cleared by any action available today. Red Hat has published no erratum for any of the packages involved.

| Package | Findings | Note |
| --- | --- | --- |
| glibc, glibc-common, glibc-minimal-langpack | 30 | 9 distinct CVEs × 3 packages; already at the newest RHEL 9 build |
| pcre2, pcre2-syntax | 14 | 7 distinct CVEs; no erratum. This is where all 6 HIGH findings are |
| libgcc | 4 | already at the newest build |
| ncurses-base, ncurses-libs | 2 | already at the newest build |

**Zero findings is not reachable on this base.** 56 findings, 6 of them HIGH, are the floor until Red Hat ships errata for `pcre2` and `glibc`. Claiming this image is "clean" would be wrong by 56.

## 11\. Reproduce it yourself

Every step, in order, from a clean checkout. Nothing here needs credentials beyond a Quay push token.

### 1\. Prove the blocker

```bash
docker pull registry.access.redhat.com/ubi9/ubi-micro:9.5
cid=$(docker create registry.access.redhat.com/ubi9/ubi-micro:9.5 true)
docker export "$cid" | tar -t | grep -E 'usr/bin/(rpm|dnf|microdnf)$'
# expected: no output
docker rm "$cid"
```

### 2\. Build

```bash
cd petclinic-rest
docker build -f Dockerfile.ubi-micro \
  -t quay.io/hellodk/base-image:ubi-micro-4.0.2-java21-fixed .
```

### 3\. Scan

```bash
trivy image --quiet --scanners vuln --format json \
  --output scan-micro-fixed.json \
  quay.io/hellodk/base-image:ubi-micro-4.0.2-java21-fixed
```

### 4\. Compare at CVE level, not total level

```python
python3 - <<'PY'
import json
def t(f):
    d=json.load(open(f)); o=a=0; s={}; k=set()
    for r in d.get('Results') or []:
        c=r.get('Class','')
        for v in r.get('Vulnerabilities') or []:
            s[v['Severity']]=s.get(v['Severity'],0)+1
            k.add((v['VulnerabilityID'], v['PkgName']))
            if c.startswith('os-pkgs'): o+=1
            elif c.startswith('lang-pkgs'): a+=1
    return o,a,s,k

bo,ba,_,bk = t('scan-ubi-micro-4.0.2-java21.json')
o,a,s,k    = t('scan-micro-fixed.json')
print(f'OS={o} APP={a} cleared={len(bk-k)} new={len(k-bk)} {sorted(k-bk)}')
PY
```

### 5\. Boot test — the step that catches what a scan cannot

```bash
docker rm -f um 2>/dev/null
docker run -d --name um -p 9969:9966 \
  quay.io/hellodk/base-image:ubi-micro-4.0.2-java21-fixed
for i in $(seq 1 45); do
  s=$(curl -s -o /dev/null -w '%{http_code}' \
       http://localhost:9969/petclinic/actuator/health)
  [ "$s" = "200" ] && break; sleep 2
done
echo "HTTP $s after $((i*2))s"
docker exec um id
docker rm -f um
```

### 6\. Check the layers before you push

```bash
docker push quay.io/hellodk/base-image:ubi-micro-4.0.2-java21-fixed
docker inspect quay.io/hellodk/base-image:ubi-micro-4.0.2-java21-fixed \
  --format '{{range .RootFS.Layers}}{{println .}}{{end}}' | wc -l
# 8 layers. If this reads 9, you have a stray RUN touching the JAR.
```

### 7\. Read the digest back and verify the control is unchanged

```bash
CTRL=sha256:7888370f76a47467d59035355ba17e631d439ab8759c8db643403ff71fa20a97
docker buildx imagetools inspect \
  quay.io/hellodk/base-image:ubi-micro-4.0.2-java21 | grep -i digest
```

### The complete Dockerfile

```bash
FROM docker.io/library/maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -Djava.version=21 -DskipTests package \
    && cp target/spring-petclinic-rest-*.jar /tmp/app.jar \
    && ls -lh /tmp/app.jar

FROM registry.access.redhat.com/ubi9/ubi-minimal:9.5 AS jrestage
RUN microdnf install -y --nodocs java-21-openjdk-headless ca-certificates zlib libstdc++ \
    && microdnf clean all \
    && rm -rf /var/cache/dnf /var/log/* \
    && cp -aL /usr/lib/jvm/java-21-openjdk-* /jre \
    && test -f /jre/conf/security/java.security \
    && /jre/bin/java -version

FROM registry.access.redhat.com/ubi9/ubi:9.5 AS patcher
ARG MICRO_PACKAGES="basesystem bash coreutils-single filesystem glibc glibc-common \
glibc-minimal-langpack libacl libattr libcap libgcc libselinux libsepol \
ncurses-base ncurses-libs pcre2 pcre2-syntax redhat-release setup tzdata"
RUN dnf -y --installroot=/out --releasever=9 --nodocs \
        --setopt=install_weak_deps=False \
        --setopt=reposdir=/etc/yum.repos.d \
        install $MICRO_PACKAGES \
    && rm -f /out/etc/passwd /out/etc/group /out/etc/shadow /out/etc/gshadow \
    && rm -rf /out/var/cache /out/var/log /out/usr/share/doc /out/usr/share/man

FROM registry.access.redhat.com/ubi9/ubi-micro:9.5
COPY --from=patcher /out/ /
COPY --from=jrestage /jre /opt/jre
COPY --from=jrestage /usr/lib64/libstdc++.so.6 /usr/lib64/libstdc++.so.6
COPY --from=jrestage /usr/lib64/libz.so.1 /usr/lib64/libz.so.1
COPY --from=jrestage /etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem \
     /etc/pki/tls/certs/ca-bundle.crt
WORKDIR /app
COPY --from=builder --chown=1001:0 --chmod=644 /tmp/app.jar /app/app.jar
EXPOSE 9966
USER 1001
ENTRYPOINT ["/opt/jre/bin/java", "-XX:+UseContainerSupport", \
            "-XX:MaxRAMPercentage=75.0", "-Duser.timezone=UTC", \
            "-jar", "/app/app.jar"]
```

### Disaster recovery

The control tag was never modified, so reverting is a pull:

```bash
docker pull quay.io/hellodk/base-image@sha256:7888370f76a47467d59035355ba17e631d439ab8759c8db643403ff71fa20a97
```
