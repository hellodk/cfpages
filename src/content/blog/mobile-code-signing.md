---
title: "Mobile Code Signing — The Complete Visual Guide (iOS + Android)"
date: 2026-08-25
description: "Every iOS executable must carry a cryptographic signature before the kernel will run it. The signature answers two questions on every launch: has this binary been modified since it was signed (integrity), and who signed it (authenticity)."
tags: [ios, android, mobile, ci, security]
cover: "assets/images/covers/mobile-code-signing.svg"
draft: false
---

</>

Certificates, keychains & partition lists, provisioning profiles, .p12 files — and the Android mirror. With a real CI experiment.

## iOS Code Signing

### What code signing actually does

Every iOS executable must carry a cryptographic signature before the kernel will run it. The signature answers two questions on every launch: has this binary been modified since it was signed (integrity), and who signed it (authenticity).

#### 🔒Integrity

The signer hashes every file in the bundle into `_CodeSignature/CodeResources` plus a **CodeDirectory** of page hashes over the Mach-O itself. One flipped byte → invalid signature → process killed.

#### 🪪Authenticity

The signature is made with a private key whose certificate chains back to Apple. Only identities Apple issued can sign code that iOS will trust.

#### 📜Policy

Entitlements (push, iCloud, HealthKit…) are embedded in the signature. The kernel (AMFI) checks that your profile actually grants them at install time and runtime.

The Apple trust chain

<svg viewBox="0 0 900 210" role="img" aria-label="Apple trust chain">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6B7280"></path></marker>
      </defs>
      <g font-family="-apple-system,system-ui" >
        <rect x="330" y="24" width="240" height="46" rx="10" fill="#EEF2FF" stroke="#444CE7" stroke-width="1.4"></rect>
        <text x="450" y="43" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Apple Root CA</text>
        <text x="450" y="59" text-anchor="middle" font-size="11" fill="#4B5563">burned into every Apple device</text>
        <rect x="330" y="96" width="240" height="46" rx="10" fill="#FFFFFF" stroke="#C7D2FE" stroke-width="1.3"></rect>
        <text x="450" y="115" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">WWDR Intermediate CA</text>
        <text x="450" y="131" text-anchor="middle" font-size="11" fill="#4B5563">Apple Worldwide Developer Relations</text>
        <rect x="150" y="150" width="270" height="44" rx="10" fill="#FFFFFF" stroke="#C7D2FE" stroke-width="1.3"></rect>
        <text x="285" y="168" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">iPhone Distribution: YourBank Ltd (TEAM)</text>
        <text x="285" y="184" text-anchor="middle" font-size="11" fill="#4B5563">issued via developer portal, valid 1 year</text>
        <rect x="480" y="150" width="270" height="44" rx="10" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.3"></rect>
        <text x="615" y="168" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Signed .app / .xcarchive</text>
        <text x="615" y="184" text-anchor="middle" font-size="11" fill="#4B5563">signature = sign(CodeDirectory, private key)</text>
        <line x1="450" y1="70" x2="450" y2="92" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="392" y1="142" x2="310" y2="146" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="508" y1="142" x2="590" y2="146" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <circle cx="450" cy="47" r="6" fill="#444CE7" opacity=".35">
          <animate attributeName="r" values="6;13;6" dur="2.4s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values=".35;0;.35" dur="2.4s" repeatCount="indefinite"></animate>
        </circle>
        <circle cx="450" cy="70" r="3" fill="#444CE7">
          <animateMotion dur="2s" repeatCount="indefinite" path="M0,0 L0,22"></animateMotion>
        </circle>
      </g>
    </svg>

**The WWDR certificate** Older Xcode setups required you to manually download the **Apple Worldwide Developer Relations intermediate** into your keychain — without it, `codesign -v` reported "CSSMERR\_TP\_CERT\_REVOKED / unable to build chain to self-signed root". Modern Xcode ships it, but CI images built by hand still trip over this.

### Identities: CSR, certificates and .p12 files

A signing identity is a pair: a **private key in your keychain** + an **Apple-issued certificate** binding your identity to that key. You never send Apple the private key — you send a Certificate Signing Request.

**Generate a CSR locally**

Keychain Access (or `openssl req -new -key priv.pem -out CSR.csr`) creates a request signed with a fresh 2048-bit key pair. The private key never leaves the machine.

**Apple issues the certificate**

Upload the CSR to developer.apple.com → Apple signs your public key with its WWDR CA → you download a `.cer`. Development certs and distribution certs are separate identities.

**Import back into the same keychain**

Opening the .cer binds the certificate to the original private key — now Keychain Access shows a proper "signing identity".

**Export as .p12 for CI**

A `.p12` (PKCS#12) bundles certificate + password-encrypted private key into one portable file — exactly what a headless Mac mini needs:

```bash
# export identity from Keychain Access, or programmatically from an existing cert+key
openssl pkcs12 -export -out dist.p12 \
               -inkey dist.key -in dist.crt \
               -certfile ca.crt -passout pass:'DummyCertPass123!'

# later, on the CI Mac — import into a dedicated keychain
security import dist.p12 -k ios-ci.keychain -P 'DummyCertPass123!' \
        -T /usr/bin/codesign -f pkcs12   # -T whitelists codesign in the ACL
```

| Certificate type | Signed by | Runs where | Lifetime | Typical use |
| --- | --- | --- | --- | --- |
| iPhone Developer | WWDR CA | Registered devices only | 1 year | Daily development, debugger attach |
| iPhone Distribution | WWDR CA | Per profile type ↓ | 1 year | Ad-hoc OTA, App Store, Enterprise fleets |
| Enterprise (In-House) | WWDR CA (enterprise program) | Any device | 1 year | Internal corporate distribution |
| Self-signed dummy CI-only | Your own local CA | Nobody — archive proof only | You choose | Pipelines with no Apple account |

### The keychain — and why partition lists exist

The keychain is an encrypted store managed by `securityd`. Every private key carries an **ACL** (which apps may use it) and a **partition list** (which signing "partitions" may touch it without user interaction). GUI users get dialogs; daemons get silence.

🔑

**Locking & unlocking**

Keychains lock after inactivity or sleep. A locked keychain makes every key access fail — CI must call `security unlock-keychain -p …` first, every build.

📋

**Search list vs default**

`codesign` resolves identities through the **user search list**, not just the `--keychain` flag. A keychain that isn't listed yields "no identity found"; a broken _default_ keychain can poison lookups entirely.

🧩

**Partition lists**

macOS 10.12+ partitions keys so that only approved tooling can use them unattended: `apple:` (Apple apps), `apple-tool:` (security tools), `codesign:`. Without a matching partition, a daemon's key access either errors or hangs awaiting a dialog.

**The command every iOS CI box runs once per build** Apply the partition list right after importing the p12 — and put the ephemeral keychain on the search list, because `--keychain` alone is not enough:

```bash
# 1. fresh keychain     2. unlock     3. import     4. SEARCH LIST     5. partition fix
security create-keychain -p "$KC_PASS" ios-build.keychain
security unlock-keychain -p "$KC_PASS" ios-build.keychain
security import $P12_FILE -k ios-build.keychain -P "$P12_PASS" -T /usr/bin/codesign -f pkcs12
security list-keychains -d user -s "$KC" ~/Library/Keychains/login.keychain-db
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KC_PASS" ios-build.keychain
```

### Provisioning profiles & App IDs

A certificate proves _who_ signed. A provisioning profile declares _what may be signed and where it may run_: which App ID, which certificates, which devices, which entitlements. It lands inside the app as `embedded.mobileprovision`.

Anatomy of a provisioning profile

<svg viewBox="0 0 900 260">
      <g font-family="-apple-system,system-ui">
        <rect x="60"  y="30" width="230" height="58" rx="10" fill="#EEF2FF" stroke="#C7D2FE"></rect>
        <text x="175" y="53" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Signing Certificates</text>
        <text x="175" y="70" text-anchor="middle" font-size="11" fill="#4B5563">allowed cert SHA-1 hashes</text>
        <rect x="335" y="30" width="230" height="58" rx="10" fill="#EEF2FF" stroke="#C7D2FE"></rect>
        <text x="450" y="53" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">App ID</text>
        <text x="450" y="70" text-anchor="middle" font-size="11" fill="#4B5563">com.yourbank.app or wildcard *</text>
        <rect x="610" y="30" width="230" height="58" rx="10" fill="#EEF2FF" stroke="#C7D2FE"></rect>
        <text x="725" y="53" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Devices (UDIDs)</text>
        <text x="725" y="70" text-anchor="middle" font-size="11" fill="#4B5563">dev &amp; ad-hoc only · ≤100/yr</text>
        <line x1="175" y1="88" x2="380" y2="128" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="450" y1="88" x2="450" y2="126" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="725" y1="88" x2="520" y2="128" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <rect x="290" y="130" width="320" height="50" rx="10" fill="#FFFFFF" stroke="#444CE7" stroke-width="1.5"></rect>
        <text x="450" y="151" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">embedded.mobileprovision</text>
        <text x="450" y="167" text-anchor="middle" font-size="11" fill="#4B5563">CMS-signed plist · entitlements copy · expiry</text>
        <circle cx="450" cy="155" r="6" fill="#444CE7" opacity=".35">
          <animate attributeName="r" values="6;13;6" dur="2.4s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values=".35;0;.35" dur="2.4s" repeatCount="indefinite"></animate>
        </circle>
        <line x1="450" y1="180" x2="450" y2="206" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <rect x="290" y="208" width="320" height="38" rx="10" fill="#F0FDF4" stroke="#86EFAC"></rect>
        <text x="450" y="232" text-anchor="middle" font-size="12" font-weight="600" fill="#166534">checked by iOS at install AND every launch</text>
      </g>
    </svg>

| Profile type | Needs devices? | Store submission | Expiry | Note |
| --- | --- | --- | --- | --- |
| Development | Yes | No | ~7 days (free) / 1 yr | Xcode auto-manages ("automatic signing") |
| Ad Hoc | Yes | No | 1 yr | Distribute builds directly to testers' UDIDs |
| App Store | No | Yes | 1 yr | TestFlight + store; Apple re-signs after review |
| Enterprise / In-House | No | No | 1 yr | Any device; $299/yr program; heavy compliance rules |

**App IDs** An **explicit** App ID (`com.bank.superapp`) enables per-capability switches (push, Sign in with Apple, associated domains). A **wildcard** (`com.bank.*`) covers many apps but supports almost no capabilities. The bundle ID in Info.plist must match the pattern.

### From source to signed archive

One `xcodebuild archive` compiles, links, embeds frameworks, writes the profile, and invokes `codesign` bottom-up: every framework and nested bundle first, the outermost app last.

```bash
# CI-grade archive invocation (Xcode 26)
xcodebuild archive \
  -project Rampage.xcodeproj \
  -scheme  Rampage \
  -destination 'generic/platform=iOS' \      # no default destination exists!
  -archivePath build/App.xcarchive \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM=TEAMID1234 \
  CODE_SIGN_IDENTITY="iPhone Distribution: YourBank Ltd (TEAMID1234)" \
  OTHER_CODE_SIGN_FLAGS="--keychain ios-build.keychain --timestamp=none"

# inspect the result
codesign -dv build/App.xcarchive/Products/Applications/App.app
#   Identifier=com.charcoaldesign.Rampage
#   Format=app bundle ... CodeDirectory v=20400 flags=0x0(none) location=embedded
#   Signature size=3699          TeamIdentifier=not set   ← self-signed dummies say this

xcodebuild -downloadPlatform iOS   # CI Macs often lack the platform SDK entirely
```

#### 📦Inside an .xcarchive

`Products/Applications/*.app` · `dSYMs/` crash symbols · `Info.plist` metadata · `BCSymbolMaps`. Zip it and Jenkins can archive it as a build artifact.

#### ⏱️\--timestamp=none

Normal signatures get an RFC-3161 timestamp from Apple's TSA so they outlive the certificate. Self-signed CI identities have no TSA trust — disable timestamps or signing stalls.

### Field test: partition vs no-partition on a real CI Mac

Two identical pipelines signed a copy of `/bin/ls` with a self-signed identity on an M4 mini running Xcode 26 / macOS Tahoe. The only variable: `set-key-partition-list`.

Same key, same command — one variable changed

<svg viewBox="0 0 900 300">
      <g font-family="-apple-system,system-ui">
        <rect x="360" y="20" width="180" height="42" rx="9" fill="#EEF2FF" stroke="#444CE7" stroke-width="1.4"></rect>
        <text x="450" y="46" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">import p12 → key</text>
        <line x1="405" y1="62" x2="230" y2="98" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="495" y1="62" x2="670" y2="98" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <rect x="90"  y="100" width="280" height="46" rx="10" fill="#FFFBEB" stroke="#FDE68A"></rect>
        <text x="230" y="119" text-anchor="middle" font-size="12" font-weight="700" fill="#92400E">NO partition list</text>
        <text x="230" y="136" text-anchor="middle" font-size="11" fill="#78350F">key ACL not whitelisted</text>
        <rect x="530" y="100" width="280" height="46" rx="10" fill="#F0FDF4" stroke="#86EFAC"></rect>
        <text x="670" y="119" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">set-key-partition-list ✓</text>
        <text x="670" y="136" text-anchor="middle" font-size="11" fill="#166531">apple:, apple-tool:, codesign: allowed</text>
        <line x1="230" y1="146" x2="230" y2="178" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="670" y1="146" x2="670" y2="178" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <rect x="60" y="182" width="340" height="96" rx="10" fill="#FEF2F2" stroke="#FECACA"></rect>
        <text x="230" y="204" text-anchor="middle" font-size="12" font-weight="700" fill="#991B1B">codesign BLOCKS FOREVER</text>
        <text x="230" y="222" text-anchor="middle" font-size="11" fill="#7F1D1D">waits for a GUI auth dialog</text>
        <text x="230" y="240" text-anchor="middle" font-size="11" fill="#7F1D1D">that cannot appear on a headless agent</text>
        <text x="230" y="264" text-anchor="middle" font-size="11" fill="#7F1D1D">(or dies instantly: errSecInternalComponent)</text>
        <rect x="500" y="182" width="340" height="96" rx="10" fill="#F0FDF4" stroke="#86EFAC"></rect>
        <text x="670" y="204" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">codesign rc=0 · instant</text>
        <text x="670" y="222" text-anchor="middle" font-size="11" fill="#166534">CodeDirectory embedded · Signature size=3699</text>
        <text x="670" y="240" text-anchor="middle" font-size="11" fill="#166534">TeamIdentifier=not set (self-signed, expected)</text>
        <text x="670" y="264" text-anchor="middle" font-size="11" fill="#166534">verified: codesign -dv ls-binary-test</text>
        <circle cx="670" cy="205" r="6" fill="#16A34A" opacity=".35">
          <animate attributeName="r" values="6;13;6" dur="2.2s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values=".35;0;.35" dur="2.2s" repeatCount="indefinite"></animate>
        </circle>
        <circle cx="230" cy="205" r="6" fill="#DC2626" opacity=".35">
          <animate attributeName="r" values="6;13;6" dur="2.2s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values=".35;0;.35" dur="2.2s" repeatCount="indefinite"></animate>
        </circle>
      </g>
    </svg>

| Run | Setup | Observed behaviour |
| --- | --- | --- |
| NOPARTITION · build 1 | ephemeral KC, poisoned default keychain present | errSecInternalComponent, rc=1 in ~0.3 s |
| NOPARTITION · build 2 | clean search list, KC registered | silent hang — codesign waits forever for an unanswerable GUI prompt; killed by timeout |
| PARTITION · build 2 | identical + one command | rc=0 instant signature, verification passes |

**Debug scars worth remembering** A keychain whose password was generated randomly and then lost stays locked _forever_ — if it's also the **default** keychain it degrades every lookup. And `--keychain` alone does not make an identity visible: codesign walks the **search list**. Fix with `security default-keychain -s login.keychain-db` + `security list-keychains -d user -s …`.

## Android Build & Signing

### Android's philosophy: everything is a ZIP

An APK is a plain ZIP of DEX bytecode, resources and native libs. There is no mandatory Apple gatekeeper — the platform simply refuses to install an APK whose signature doesn't verify against the signing certificate(s) recorded during any prior install or update.

Build → sign → ship pipeline

<svg viewBox="0 0 900 190">
      <g font-family="-apple-system,system-ui">
        <rect x="30"  y="64" width="140" height="52" rx="10" fill="#EEF2FF" stroke="#C7D2FE"></rect><text x="100" y="86" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Kotlin / Java</text><text x="100" y="102" text-anchor="middle" font-size="11" fill="#4B5563">src + res + manifest</text>
        <rect x="215" y="64" width="140" height="52" rx="10" fill="#FFFFFF" stroke="#C7D2FE"></rect><text x="285" y="86" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Gradle + R8</text><text x="285" y="102" text-anchor="middle" font-size="11" fill="#4B5563">dex · shrink · obfuscate</text>
        <rect x="400" y="64" width="150" height="52" rx="10" fill="#FFFFFF" stroke="#C7D2FE"></rect><text x="475" y="86" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">unsigned APK/AAB</text><text x="475" y="102" text-anchor="middle" font-size="11" fill="#4B5563">zipaligned</text>
        <rect x="595" y="64" width="140" height="52" rx="10" fill="#F0FDF4" stroke="#86EFAC"></rect><text x="665" y="82" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">apksigner</text><text x="665" y="97" text-anchor="middle" font-size="11" fill="#166534">v2/v3 block</text><text x="665" y="110" text-anchor="middle" font-size="11" fill="#166534">keystore key</text>
        <rect x="770" y="64" width="105" height="52" rx="10" fill="#EEF2FF" stroke="#C7D2FE"></rect><text x="822" y="86" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Play / device</text><text x="822" y="102" text-anchor="middle" font-size="11" fill="#4B5563">verify + install</text>
        <line x1="170" y1="90" x2="211" y2="90" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="355" y1="90" x2="396" y2="90" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="550" y1="90" x2="591" y2="90" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <line x1="735" y1="90" x2="766" y2="90" stroke="#6B7280" stroke-width="1.4" marker-end="url(#arr)"></line>
        <circle cx="665" cy="85" r="6" fill="#16A34A" opacity=".35">
          <animate attributeName="r" values="6;13;6" dur="2.2s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values=".35;0;.35" dur="2.2s" repeatCount="indefinite"></animate></circle>
        <circle cx="475" cy="64" r="3" fill="#444CE7"><animateMotion dur="3s" repeatCount="indefinite" path="M0,0 L120,0 L245,0"></animateMotion></circle>
      </g>
    </svg>

### Keystores: Android's answer to the keychain + p12

Where iOS splits identity across a keychain and an exported .p12, Android folds everything into one file: a Java **KeyStore** holding a private key + certificate chain under a password and an alias.

```bash
# generate an upload keystore (PKCS12 format; legacy JKS is deprecated)
keytool -genkeypair -v \
  -keystore upload-keystore.p12 -storetype PKCS12 \
  -alias upload -keyalg RSA -keysize 4096 -validity 10950

# inspect anything anyone sends you
keytool -printcert -jarfile app.apk
apksigner verify --print-certs app-release.apk

# gradle: secrets come from env vars — never from git
android { signingConfigs { release {
    storeFile     = file("upload-keystore.p12")
    storePassword = System.getenv("KS_PASS")
    keyAlias      = System.getenv("KS_ALIAS")
    keyPassword   = System.getenv("KEY_PASS")
} } }
```

**Validity matters more than on iOS** Play requires the signing certificate to be valid until at least **October 2033** for app updates to keep installing. Lose the keystore without Play App Signing enrolled and the app can never be updated again. Back it up like production data.

### Signature schemes v1 → v4

Each generation patched a weakness of the last. `apksigner` picks automatically based on `minSdkVersion`; you should know what each buys you.

| Scheme | Since | Signs what | Why it exists |
| --- | --- | --- | --- |
| v1 (JAR) | Android 1.0 | each ZIP entry in META-INF | Original model — but names were unsigned → the Janus vulnerability let attackers inject code while keeping valid v1 signatures |
| v2 | Android 7.0 | whole file, one APKSig block between entries and central directory | any byte flip breaks it; far faster install-time verification |
| v3 | Android 9 | v2 + signed rotation info | key rotation: new cert provably succeeds the old one (proof-of-rotation lineage) |
| v4 | Android 11 | merkle tree sidecar (.idsig) | incremental / streaming installs, fs-verity |

```bash
# explicit control instead of autodetection
apksigner sign \
  --ks upload-keystore.p12 --ks-key-alias upload \
  --v1-signing-enabled true  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --min-sdk-version 24 \
  app-release-unsigned.apk

# zipalign BEFORE v2/v3 signing — after would invalidate the block
zipalign -f -p 4 in.apk out.apk && apksigner sign ...
```

### Play App Signing: upload key vs app signing key

Google holds the actual **app signing key** and re-signs every artifact delivered to devices. You sign uploads with a separable **upload key** whose loss or expiry becomes routine to rotate instead of catastrophic.

**You sign the AAB with the upload key**

`./gradlew bundleRelease` → signed with `upload-keystore`. Play verifies it's really you.

**Google strips your signature and re-signs**

Split APKs per density/ABI/language come back signed with the **app signing key** — possibly stored in Google's hardware-backed HSMs.

**Rotation stays cheap**

New upload key? Update it in console. Compromised app-signing key? v3 lineage lets a new key prove succession to installed devices.

### Artifacts, symbols and debug builds

#### 📦APK vs AAB

An **AAB** isn't installable — `bundletool build-apks` derives optimized split APKs per device. Universal-APK fallback exists for sideloading.

#### 🐛mapping.txt ≈ dSYMs

R8 renames symbols; upload `mapping.txt` per release so Play Console retraces crashes — the exact analogue of iOS dSYM symbolication.

#### 🛠️debug.keystore

Auto-created at `~/.android/debug.keystore` (alias `androiddebugkey`). Installs signed with it can't upgrade to a differently-signed release — signature change forces uninstall.

#### 🤝Signature permissions

Apps signed with the same key can share UIDs and request `signature`\-level permissions — the OS trusts them as one author.

**Hardware-backed keys** Generate keys inside Android's StrongBox / TEE (`setIsStrongBoxBacked(true)`) and they never leave secure hardware — signing happens inside the chip, mirroring Apple's SEP-protected keys.

## Side-by-Side & CI Cheat Sheet

### iOS ↔ Android translation table

Same concepts, different machinery. Keep this next to you when switching platforms mid-incident.

| Concept | iOS | Android |
| --- | --- | --- |
| Private key home | Keychain item (ACL + partition list) | Entry inside a KeyStore file |
| Portable credential bundle | .p12 (cert + encrypted key) | the .jks/.p12 keystore itself |
| Certificate issuer | Apple via WWDR CA (CSR flow) | self-signed — nobody issues it |
| "Who may install?" | provisioning profile (+ UDIDs) | nothing pre-installed; signature continuity at update time |
| Capabilities grant | entitlements baked into signature | manifest permissions; some signature-protected |
| CLI signer | codesign | apksigner / historically jarsigner |
| Cert inspection | codesign -dv, security find-identity | keytool -printcert, apksigner verify |
| Crash symbols | dSYMs → TestFlight/symbolicate | mapping.txt → retrace / Play Console |
| Beta distribution | TestFlight / Ad-Hoc OTA | internal testing track / direct APK |
| Store re-signing | Apple re-signs after review | Play App Signing re-signs splits |
| Key loss blast radius | revoke + new profile (dev), painful (dist) | catastrophic unless Play App Signing enrolled |
| Headless-CI pain point | locked keychains, partition lists, GUI prompts | basically none — file-based signing just works |

### CI cheat sheet

#### 🍎iOS runner bootstrap (every build)

```bash
security create-keychain -p "$KC_PASS" build-kc
security unlock-keychain -p "$KC_PASS" build-kc
security import "$P12" -k build-kc -P "$P12_PASS" \
        -T /usr/bin/codesign -f pkcs12
security list-keychains -d user -s build-kc
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: -s -k "$KC_PASS" build-kc
# …build… then delete-keychain
```

#### 🤖Android runner bootstrap

```bash
# secret arrives base64'd from vault/CI variables
echo "$KEYSTORE_B64" | base64 -d > release.keystore
./gradlew bundleRelease \
  -PKS_PASS="$KS_PASS" \
  -PKS_ALIAS=upload
apksigner verify --print-certs *.aab 2>/dev/null || \
  bundletool validate
```

### Common errors, decoded

| You see | Platform | Actually means | Fix direction |
| --- | --- | --- | --- |
| errSecInternalComponent | iOS | key ACL/partition denies non-interactive use | unlock + set-key-partition-list |
| codesign silently hangs | iOS | GUI auth prompt on headless agent | same as above — the prompt IS the bug |
| no identity found | iOS | keychain missing from search list / expired | list-keychains -s … ; check cert dates |
| Unable to find a destination | iOS | platform SDK absent or no destination given | xcodebuild -downloadPlatform iOS; -destination generic/platform=iOS |
| INSTALL_PARSE_FAILED_NO_CERTIFICATES | Android | v2+ required but only v1 present | apksigner with min-sdk-aware schemes |
| INSTALL_FAILED_UPDATE_INCOMPATIBLE | Android | installed build signed by different key | uninstall, or restore correct keystore |
| Execution failed for task :signReleaseBundle | Android | keystore path/password wrong in CI env | check base64 round-trip + env names |

**The one-paragraph mental model** **iOS**: Apple owns the root of trust; you prove membership (certificate) and scope (profile), and macOS guards your private key behind ACLs and partition lists that must be explicitly opened for machines without hands.  
**Android**: there is no issuer — _you_ are the root of trust from day one; the platform only guarantees that today's update was signed by the same entity as yesterday's install, and modern schemes + Play App Signing exist to keep that promise manageable.
