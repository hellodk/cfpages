---
title: "Zero: The Image That Was Already Clean"
date: 2026-10-03
description: "Chainguard Hummingbird scans at zero findings in both layers. It was asked to be fixed anyway, so it was re-verified from its digest instead: 0 OS, 0 app, still booting in 8s, still non-root. The interesting part is why rebuilding a clean image would have been the wrong move."
tags: [docker, container-security, cve, dotnet]
cover: "assets/images/covers/hummingbird-verification.svg"
draft: false
---

Container Security · Chainguard Hummingbird · Verification

This is the only image in the set that needed no work. It was asked to be "fixed" anyway, so instead it was re-verified from its digest: 0 OS findings, 0 application findings, still booting in 8 seconds, still non-root. The interesting part is not the result — it is why rebuilding a clean image would have been the wrong move.

## 1\. The verdict: nothing to fix

The published image `quay.io/hellodk/base-image:hummingbird-4.0.2-java21-cvefix2` scans at **zero findings in both layers**.

| Layer | Findings |
| --- | --- |
| OS packages | 0 |
| Application dependencies | 0 |
| CRITICAL / HIGH / MEDIUM / LOW | 0 / 0 / 0 / 0 |

Digest `sha256:5e123f11250e750783e34d9b27b545c2493cedda7f39106e64c88ceacadfca80`, 145.5 MB. There is no residual list to publish, because there is no residual list.

**A clean image is a result, not a gap.** The useful output of this write-up is the evidence that it is still clean, and the reasoning for not touching it.

## 2\. Why it is already clean

The comparison found a clear pattern across the whole set: **the more an image contains, the more can go stale.** Hummingbird sits at the clean end for the same reason every other clean image in this programme does — it ships the smallest possible userland and has no mechanism for software to accumulate in it.

| Property | Hummingbird | Why it matters for CVE count |
| --- | --- | --- |
| Shell | none | No shell means no shell utilities, no scripting languages, no curl/wget, no editors |
| Package manager | none | No apt, apk, dnf — and no dpkg/apk database to accumulate records |
| Runtime UID | 65532 | The conventional unprivileged distroless user |
| Root filesystem | purpose-built minimal | Only the JRE and the application runtime are present |

This is not a free lunch — it is a trade. An image with no shell cannot be debugged interactively, cannot be patched in place, and cannot run a health check that shells out. The compensating control is that such an image cannot be casually modified by whoever runs it either.

## 3\. Re-verification

Rather than trusting a scan from a previous day, the image was re-pulled by its exact digest and re-scanned, so the result refers to the bytes actually in the registry now.

```bash
HB=sha256:5e123f11250e750783e34d9b27b545c2493cedda7f39106e64c88ceacadfca80
docker rmi -f quay.io/hellodk/base-image:hummingbird-4.0.2-java21-cvefix2
docker pull quay.io/hellodk/base-image@$HB
docker tag quay.io/hellodk/base-image@$HB hb-check

trivy image --quiet --scanners vuln --format json \
  --output scan-hummingbird-recheck.json hb-check
```

```bash
OS=0 APP=0 TOTAL=0 CRITICAL=0 HIGH=0 MEDIUM=0 LOW=0
pulled digest: sha256:5e123f11250e750783e34d9b27b545c2493cedda7f39106e64c88ceacadfca80
digest matches the published tag: yes
```

Runtime behaviour was checked the same way as every other image in the set:

| Check | Command | Result |
| --- | --- | --- |
| Boots and serves | curl /petclinic/actuator/health | HTTP 200 in 8 s |
| Actuator | — | {"groups":["liveness","readiness"],"status":"UP"} |
| Java version | java -version | openjdk version "21.0.12.1" 2026-08-18 |
| Runtime UID | image config .Config.User | 65532 |
| Process UID | /proc/<pid>/status | Uid: 65532 65532 65532 65532 |

**A detail worth recording.** The usual `docker exec … id` check cannot be used here, because there is no `id` binary and no shell to run it through: `exec: "id": executable file not found in $PATH`. The non-root claim was verified instead from the image config and from `/proc` on the host side. A verification script that assumes a shell would have reported this image as unverified.

## 4\. What we deliberately did not do

The instruction for this image was "fix it". It did not need fixing, so the honest response was to verify and stop. Three things were considered and rejected:

| Option | Why it was rejected |
| --- | --- |
| Rebuild from the same Dockerfile.hi-openjdk | Reproduces identical bytes with no security benefit. Any change to base layers, JDK build or the application layer could only introduce variance — and variance in a clean image is pure downside |
| Refresh the base to a newer tag | A newer Chainguard base could add or remove packages. It might fix nothing, or it might introduce findings into an image that has none. That is a change with negative expected value until there is a CVE to fix |
| Publish a new tag anyway, for consistency | New tags create new things to track, pull and document. A tag that points at the same content as an existing tag is pure operational overhead |

**Remediation is not the goal; a smaller risk surface is.** For a clean image the lowest-risk action is no action. Inventing a change to satisfy the shape of a process is how clean images become dirty ones.

## 5\. How it compares

Placed against the images that did need work, Hummingbird's position is not subtle.

Hummingbird — no action taken

0

Google Distroless — 1 library fixed

67

UBI 9 Micro — overlay rebuild

56

UBI 9 full — dnf upgrade

575

Findings remaining after remediation, 2026-10-03. UBI 9 full and Micro cannot reach zero because Red Hat has not shipped errata for `pcre2` and `glibc`; Distroless cannot because Debian has not rebuilt glibc, `libexpat1` or `libuuid1`. Hummingbird has nothing outstanding.

| Image | Action taken | Findings before | Findings after | Size cost |
| --- | --- | --- | --- | --- |
| Hummingbird | none — verified clean | 0 | 0 | none |
| Google Distroless | 1 library + dpkg metadata | 69 | 67 | +0.1 MB |
| UBI 9 Micro | overlay rebuild from upstream | 115 | 56 | +6.8 MB |
| UBI 9 full | dnf upgrade | 895 | 575 | +61.3 MB |

## 6\. Reproduce it yourself

Four commands. There is no Dockerfile to change, which is the point.

```bash
HB=sha256:5e123f11250e750783e34d9b27b545c2493cedda7f39106e64c88ceacadfca80

# 1. pull the exact published bytes
docker pull quay.io/hellodk/base-image@$HB

# 2. scan them
docker tag quay.io/hellodk/base-image@$HB hb-check
trivy image --quiet --scanners vuln --format json \
  --output scan-hummingbird-recheck.json hb-check

# 3. prove there is still no shell or package manager
docker run --rm --entrypoint /busybox/sh \
  quay.io/hellodk/base-image@$HB -c 'ls /bin/sh /usr/bin/apt /sbin/apk'
# expected: "OCI runtime exec failed"

# 4. boot it
docker rm -f hb 2>/dev/null
docker run -d --name hb -p 9970:9966 quay.io/hellodk/base-image@$HB
for i in $(seq 1 45); do
  c=$(curl -s -o hb.json -w '%{http_code}' \
       http://localhost:9970/petclinic/actuator/health)
  [ "$c" = "200" ] && break; sleep 2
done
echo "HTTP $c after $((i*2))s  $(cat hb.json)"
docker inspect quay.io/hellodk/base-image@$HB --format '{{.Config.User}}'
docker rm -f hb
```

```bash
$ python3 -c "
import json
d=json.load(open('scan-hummingbird-recheck.json'))
for r in d.get('Results') or []:
    for v in r.get('Vulnerabilities') or []:
        print(r.get('Class'), v['Severity'], v['VulnerabilityID'], v['PkgName'])
print('total:', sum(len(r.get('Vulnerabilities') or [])
                    for r in d.get('Results') or []))"
total: 0
```

**When to revisit this page.** Re-verify when Trivy publishes a new advisory affecting any package this image contains, when the Chainguard base moves to a new `latest`, or when the application dependencies in `pom.xml` change. Until one of those happens, the digest above is the whole story.
