---
title: "iOS & Android Build Flows — Deep Dive Guide"
date: 2026-06-01
description: "Enterprise reference guide · Covers Xcode 16, CocoaPods 1.16, AGP 8.x, Gradle 8.x · Updated June 2026"
tags: [ios, android, ci, mobile]
draft: false
---

📱

Enterprise reference guide · Covers Xcode 16, CocoaPods 1.16, AGP 8.x, Gradle 8.x · Updated June 2026

Xcode 16 CocoaPods 1.16 AGP 8.x Gradle 8.x Updated June 2026

## 1 📱 iOS Build Flow

iOS Build Pipeline

Every iOS build—whether in CI or locally—follows the same chain: source checkout → dependency install → compile → test → archive → export IPA → distribute. Each stage is a strict gate: if one fails, nothing downstream runs.

iOS Full Pipeline — Animated

<svg viewBox="0 0 960 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-title-1">
      <rect width="960" height="210" fill="#F8FAFC"></rect>
      <defs>
        <marker id="ah-ios" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#2563EB"></path>
        </marker>
        <path id="ap1" d="M128,105 L152,105"></path>
        <path id="ap2" d="M258,105 L282,105"></path>
        <path id="ap3" d="M388,105 L412,105"></path>
        <path id="ap4" d="M518,105 L542,105"></path>
        <path id="ap5" d="M648,105 L672,105"></path>
        <path id="ap6" d="M778,105 L802,105"></path>
        <linearGradient id="gb1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#EFF6FF"></stop>
          <stop offset="100%" stop-color="#DBEAFE"></stop>
        </linearGradient>
        <linearGradient id="gb2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F0FDF4"></stop>
          <stop offset="100%" stop-color="#DCFCE7"></stop>
        </linearGradient>
        <linearGradient id="gb3" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F5F3FF"></stop>
          <stop offset="100%" stop-color="#EDE9FE"></stop>
        </linearGradient>
        <linearGradient id="gb4" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFBEB"></stop>
          <stop offset="100%" stop-color="#FEF3C7"></stop>
        </linearGradient>
      </defs>
      <g style="animation:stg .4s .0s ease both" class="stg">
        <rect x="22" y="65" width="106" height="80" rx="9" fill="url(#gb1)" stroke="#BFDBFE" stroke-width="1.5"></rect>
        <rect x="22" y="65" width="106" height="24" rx="9" fill="#2563EB" opacity=".12"></rect>
        <rect x="22" y="78" width="106" height="11" fill="#2563EB" opacity=".12"></rect>
        <text x="75" y="80" text-anchor="middle" font-size="14" fill="#2563EB">⊙</text>
        <text x="75" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#1E3A8A">Checkout</text>
        <text x="75" y="116" text-anchor="middle" font-size="12" fill="#4B5563">git clone</text>
        <text x="75" y="130" text-anchor="middle" font-size="12" fill="#6B7280">fetch submodules</text>
      </g>
      <g style="animation:stg .4s .12s ease both" class="stg">
        <rect x="152" y="65" width="106" height="80" rx="9" fill="url(#gb1)" stroke="#BFDBFE" stroke-width="1.5"></rect>
        <text x="205" y="80" text-anchor="middle" font-size="14" fill="#2563EB">🧩</text>
        <text x="205" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#1E3A8A">pod install</text>
        <text x="205" y="116" text-anchor="middle" font-size="12" fill="#4B5563">CocoaPods / SPM</text>
        <text x="205" y="130" text-anchor="middle" font-size="12" fill="#6B7280">resolve deps</text>
      </g>
      <g style="animation:stg .4s .24s ease both" class="stg">
        <rect x="282" y="65" width="106" height="80" rx="9" fill="url(#gb2)" stroke="#BBF7D0" stroke-width="1.5"></rect>
        <text x="335" y="80" text-anchor="middle" font-size="14" fill="#16A34A">⚙</text>
        <text x="335" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">Compile</text>
        <text x="335" y="116" text-anchor="middle" font-size="12" fill="#4B5563">Swift / Obj-C</text>
        <text x="335" y="130" text-anchor="middle" font-size="12" fill="#6B7280">xcodebuild build</text>
      </g>
      <g style="animation:stg .4s .36s ease both" class="stg">
        <rect x="412" y="65" width="106" height="80" rx="9" fill="url(#gb2)" stroke="#BBF7D0" stroke-width="1.5"></rect>
        <text x="465" y="80" text-anchor="middle" font-size="14" fill="#16A34A">✓</text>
        <text x="465" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">Test</text>
        <text x="465" y="116" text-anchor="middle" font-size="12" fill="#4B5563">XCTest / XCUITest</text>
        <text x="465" y="130" text-anchor="middle" font-size="12" fill="#6B7280">Simulator / Device</text>
      </g>
      <g style="animation:stg .4s .48s ease both" class="stg">
        <rect x="542" y="65" width="106" height="80" rx="9" fill="url(#gb3)" stroke="#DDD6FE" stroke-width="1.5"></rect>
        <text x="595" y="80" text-anchor="middle" font-size="14" fill="#7C3AED">📁</text>
        <text x="595" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#4C1D95">Archive</text>
        <text x="595" y="116" text-anchor="middle" font-size="12" fill="#4B5563">xcodebuild archive</text>
        <text x="595" y="130" text-anchor="middle" font-size="12" fill="#6B7280">.xcarchive</text>
      </g>
      <g style="animation:stg .4s .60s ease both" class="stg">
        <rect x="672" y="65" width="106" height="80" rx="9" fill="url(#gb3)" stroke="#DDD6FE" stroke-width="1.5"></rect>
        <text x="725" y="80" text-anchor="middle" font-size="14" fill="#7C3AED">📲</text>
        <text x="725" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#4C1D95">Export IPA</text>
        <text x="725" y="116" text-anchor="middle" font-size="12" fill="#4B5563">ExportArchive</text>
        <text x="725" y="130" text-anchor="middle" font-size="12" fill="#6B7280">sign + package</text>
      </g>
      <g style="animation:stg .4s .72s ease both" class="stg">
        <rect x="802" y="65" width="106" height="80" rx="9" fill="url(#gb4)" stroke="#FDE68A" stroke-width="1.5"></rect>
        <text x="855" y="80" text-anchor="middle" font-size="14" fill="#D97706">🚀</text>
        <text x="855" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#78350F">Distribute</text>
        <text x="855" y="116" text-anchor="middle" font-size="12" fill="#4B5563">App Store / TF</text>
        <text x="855" y="130" text-anchor="middle" font-size="12" fill="#6B7280">Enterprise / AdHoc</text>
      </g>
      <line x1="129" y1="105" x2="149" y2="105" stroke="#2563EB" stroke-width="2" marker-end="url(#ah-ios)" style="animation:da 0.3s .45s ease both" class="da"></line>
      <line x1="259" y1="105" x2="279" y2="105" stroke="#2563EB" stroke-width="2" marker-end="url(#ah-ios)" style="animation:da 0.3s .57s ease both" class="da"></line>
      <line x1="389" y1="105" x2="409" y2="105" stroke="#16A34A" stroke-width="2" marker-end="url(#ah-ios)" style="animation:da 0.3s .69s ease both" class="da"></line>
      <line x1="519" y1="105" x2="539" y2="105" stroke="#16A34A" stroke-width="2" marker-end="url(#ah-ios)" style="animation:da 0.3s .81s ease both" class="da"></line>
      <line x1="649" y1="105" x2="669" y2="105" stroke="#7C3AED" stroke-width="2" marker-end="url(#ah-ios)" style="animation:da 0.3s .93s ease both" class="da"></line>
      <line x1="779" y1="105" x2="799" y2="105" stroke="#7C3AED" stroke-width="2" marker-end="url(#ah-ios)" style="animation:da 0.3s 1.05s ease both" class="da"></line>
      <circle r="4.5" fill="#2563EB" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="1s"><mpath href="#ap1"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#2563EB" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="1.5s"><mpath href="#ap2"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#16A34A" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="2s"><mpath href="#ap3"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#16A34A" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="2.5s"><mpath href="#ap4"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#7C3AED" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="3s"><mpath href="#ap5"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#D97706" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="3.5s"><mpath href="#ap6"></mpath></animateMotion></circle>
      <text x="75" y="165" text-anchor="middle" font-size="11" fill="#6B7280">SCM</text>
      <text x="205" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Deps</text>
      <text x="335" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Build</text>
      <text x="465" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Test</text>
      <text x="595" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Package</text>
      <text x="725" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Sign</text>
      <text x="855" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Deploy</text>
    </svg>

## Stage 1 — Checkout

The CI runner clones the repo (or performs a shallow fetch) and restores submodules. Environment variables like `BUILD_NUMBER`, branch name, and commit SHA are injected here. LFS assets must be pulled explicitly.

```bash
# Jenkins SCM or shell
git clone --depth 1 $REPO_URL
git submodule update --init --recursive
```

<aside class="callout"><div class="callout__body">⚠ Shallow clones (<code>--depth 1</code>) break <code>git describe</code> for version bumping. Use <code>--unshallow</code> before tagging.</div></aside>

## Stage 2 — pod install

CocoaPods resolves the dependency graph from `Podfile`, downloads sources, and generates the `.xcworkspace`. The lock file must be committed so all builds use the exact same versions.

```bash
# Always use the workspace after this point
pod install --repo-update --deployment
# --deployment: treats Podfile.lock as source of truth
# --repo-update: updates local git-based specs repos (~/.cocoapods/repos/).
# Note: the CDN (cdn.cocoapods.org) is fetched lazily on demand and is
# unaffected by this flag — since CocoaPods 1.8, the CDN is the default
# source and does not require a repo update.
```

<aside class="callout"><strong class="callout__title">gitignored</strong><div class="callout__body">ℹ The generated <code>Pods/</code> directory should be . Only <code>Podfile.lock</code> is committed.</div></aside>

[→ See Tab 3 for CocoaPods deep-dive](#)

## Stage 3 — Compile

Xcode compiles Swift/Obj-C source files using whole-module compilation — parallelism is across targets and compilation units, not individual files. Each target builds its own framework. Static libraries are linked. Bitcode was deprecated in Xcode 14 and removed in Xcode 15. Current builds do not emit or accept Bitcode.

```bash
xcodebuild \
  -workspace App.xcworkspace \
  -scheme MyApp \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  ONLY_ACTIVE_ARCH=NO \
  CODE_SIGNING_ALLOWED=NO \
  build
```

## Stage 4 — Test

Unit tests run on a simulator. UI tests can run on a simulator or physical device. XCTest results are exported as `.xcresult` bundles. Test parallelism is controlled by `-maximum-parallel-testing-workers`.

```bash
xcodebuild test \
  -workspace App.xcworkspace \
  -scheme MyAppTests \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -resultBundlePath TestResults.xcresult \
  -enableCodeCoverage YES
```

## Stage 5 — Archive

The archive step compiles a release build and packages it into an `.xcarchive` bundle. This is a signed build containing the `.app`, dSYMs for crash symbolication, and embedded provisioning profile.

```bash
xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme MyApp \
  -configuration Release \
  -archivePath build/MyApp.xcarchive \
  CODE_SIGN_IDENTITY="iPhone Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="My Profile"
```

## Stage 6 — Export IPA

The export step re-signs the archive using the distribution method defined in `ExportOptions.plist` and packages it as an `.ipa` file ready for upload or direct device install.

```bash
xcodebuild -exportArchive \
  -archivePath build/MyApp.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/export/
```

The `ExportOptions.plist` controls the distribution method: app-store enterprise ad-hoc development

[→ See Tab 4 for code signing & certificates](#)

## Stage 7 — Distribute

### App Store / TestFlight

Upload via the App Store Connect API. `altool` was deprecated in 2023 and fully removed in Xcode 16. Use `xcrun notarytool` for notarization and the App Store Connect API or Fastlane deliver for distribution. TestFlight processes the build asynchronously (~10 min).

<aside class="callout"><strong class="callout__title">altool removed in Xcode 16.</strong><div class="callout__body">⚠  Use <code>xcrun notarytool</code> or <code>fastlane deliver</code> instead.</div></aside>

```bash
# App Store Connect API (current — altool removed in Xcode 16)
xcrun notarytool submit build/export/MyApp.ipa \
  --key ~/.appstoreconnect/private_keys/AuthKey_<KeyID>.p8 \
  --key-id $KEY_ID \
  --issuer-id $ISSUER_ID \
  --wait

# Or via Fastlane (recommended)
fastlane deliver --ipa build/export/MyApp.ipa \
  --api_key_path ~/.appstoreconnect/api_key.json
```

### Enterprise / In-House

The `.ipa` signed with an Enterprise certificate can be distributed via a web server or MDM. Users install via a manifest `.plist` link opened in Safari. No App Store review needed.

```bash
# manifest.plist pointing to IPA URL
# itms-services://?action=download-manifest
#   &url=https://server/manifest.plist
```

### Ad Hoc

Signed for specific UDIDs registered in the provisioning profile. Up to 100 registered devices per device type per account. The device count resets once annually — devices can only be removed during the annual reset window, not freely cycled throughout the year. Deployed via tools like Diawi, Firebase App Distribution, or direct install.

```bash
# ExportOptions.plist excerpt
<key>method</key>
<string>ad-hoc</string>
# Note: compileBitcode key removed — Bitcode deprecated Xcode 14,
# removed Xcode 15. Do not include this key in new ExportOptions.plist.
```

[→ See Tab 4 for code signing & certificates](#)

## Key Environment Variables in CI

| Variable | Used For | Example |
| --- | --- | --- |
| CODE_SIGN_IDENTITY | Selects which certificate to sign with | iPhone Distribution: Acme Corp |
| PROVISIONING_PROFILE_SPECIFIER | Profile name or UUID to embed | MyApp_Enterprise |
| DEVELOPMENT_TEAM | Apple Team ID for automatic signing | A1B2C3D4E5 |
| CODE_SIGNING_REQUIRED | Disable signing for compile-only CI | NO |
| ONLY_ACTIVE_ARCH | Build all architectures (not just host) | NO |
| COMPILER_INDEX_STORE_ENABLE | Skip Xcode indexing in CI (faster) | NO |

## 2 🤖 Android Build Flow

Android Build Pipeline

Android builds are driven by Gradle — a JVM-based build system. The pipeline transforms source + resources into a bytecode-optimised, signed APK or AAB. Unlike iOS, there is no archive step: the artifact is produced directly by the build task.

Android Full Pipeline — Animated

<svg viewBox="0 0 960 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-title-2">
      <rect width="960" height="210" fill="#F8FAFC"></rect>
      <defs>
        <marker id="ah-and" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#16A34A"></path>
        </marker>
        <path id="bp1" d="M128,105 L152,105"></path>
        <path id="bp2" d="M258,105 L282,105"></path>
        <path id="bp3" d="M388,105 L412,105"></path>
        <path id="bp4" d="M518,105 L542,105"></path>
        <path id="bp5" d="M648,105 L672,105"></path>
        <path id="bp6" d="M778,105 L802,105"></path>
        <linearGradient id="ga1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F0FDF4"></stop>
          <stop offset="100%" stop-color="#DCFCE7"></stop>
        </linearGradient>
        <linearGradient id="ga2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ECFDF5"></stop>
          <stop offset="100%" stop-color="#A7F3D0"></stop>
        </linearGradient>
        <linearGradient id="ga3" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFBEB"></stop>
          <stop offset="100%" stop-color="#FEF3C7"></stop>
        </linearGradient>
      </defs>
      <g style="animation:stg .4s .0s ease both">
        <rect x="22" y="65" width="106" height="80" rx="9" fill="url(#ga1)" stroke="#BBF7D0" stroke-width="1.5"></rect>
        <text x="75" y="80" text-anchor="middle" font-size="14" fill="#16A34A">⊙</text>
        <text x="75" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">Checkout</text>
        <text x="75" y="116" text-anchor="middle" font-size="12" fill="#4B5563">git clone</text>
        <text x="75" y="130" text-anchor="middle" font-size="12" fill="#6B7280">fetch refs</text>
      </g>
      <g style="animation:stg .4s .12s ease both">
        <rect x="152" y="65" width="106" height="80" rx="9" fill="url(#ga1)" stroke="#BBF7D0" stroke-width="1.5"></rect>
        <text x="205" y="80" text-anchor="middle" font-size="14" fill="#16A34A">🔄</text>
        <text x="205" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">Gradle Sync</text>
        <text x="205" y="116" text-anchor="middle" font-size="12" fill="#4B5563">resolve deps</text>
        <text x="205" y="130" text-anchor="middle" font-size="12" fill="#6B7280">download AARs</text>
      </g>
      <g style="animation:stg .4s .24s ease both">
        <rect x="282" y="65" width="106" height="80" rx="9" fill="url(#ga2)" stroke="#6EE7B7" stroke-width="1.5"></rect>
        <text x="335" y="80" text-anchor="middle" font-size="14" fill="#059669">⚙</text>
        <text x="335" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#064E3B">Compile</text>
        <text x="335" y="116" text-anchor="middle" font-size="12" fill="#4B5563">javac / kotlinc</text>
        <text x="335" y="130" text-anchor="middle" font-size="12" fill="#6B7280">.class files</text>
      </g>
      <g style="animation:stg .4s .36s ease both">
        <rect x="412" y="65" width="106" height="80" rx="9" fill="url(#ga2)" stroke="#6EE7B7" stroke-width="1.5"></rect>
        <text x="465" y="80" text-anchor="middle" font-size="14" fill="#059669">🎨</text>
        <text x="465" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#064E3B">Resources</text>
        <text x="465" y="116" text-anchor="middle" font-size="12" fill="#4B5563">AAPT2 compile</text>
        <text x="465" y="130" text-anchor="middle" font-size="12" fill="#6B7280">R.java / .flat</text>
      </g>
      <g style="animation:stg .4s .48s ease both">
        <rect x="542" y="65" width="106" height="80" rx="9" fill="url(#ga1)" stroke="#BBF7D0" stroke-width="1.5"></rect>
        <text x="595" y="80" text-anchor="middle" font-size="14" fill="#16A34A">🔧</text>
        <text x="595" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">D8 / R8</text>
        <text x="595" y="116" text-anchor="middle" font-size="12" fill="#4B5563">DEX compile</text>
        <text x="595" y="130" text-anchor="middle" font-size="12" fill="#6B7280">shrink + obfuscate</text>
      </g>
      <g style="animation:stg .4s .60s ease both">
        <rect x="672" y="65" width="106" height="80" rx="9" fill="url(#ga1)" stroke="#BBF7D0" stroke-width="1.5"></rect>
        <text x="725" y="80" text-anchor="middle" font-size="14" fill="#16A34A">📦</text>
        <text x="725" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">Package</text>
        <text x="725" y="116" text-anchor="middle" font-size="12" fill="#4B5563">APK / AAB</text>
        <text x="725" y="130" text-anchor="middle" font-size="12" fill="#6B7280">zipalign</text>
      </g>
      <g style="animation:stg .4s .72s ease both">
        <rect x="802" y="65" width="106" height="80" rx="9" fill="url(#ga3)" stroke="#FDE68A" stroke-width="1.5"></rect>
        <text x="855" y="80" text-anchor="middle" font-size="14" fill="#D97706">🔐</text>
        <text x="855" y="101" text-anchor="middle" font-size="12" font-weight="700" fill="#78350F">Sign &amp; Deploy</text>
        <text x="855" y="116" text-anchor="middle" font-size="12" fill="#4B5563">apksigner</text>
        <text x="855" y="130" text-anchor="middle" font-size="12" fill="#6B7280">Play / Firebase</text>
      </g>
      <line x1="129" y1="105" x2="149" y2="105" stroke="#16A34A" stroke-width="2" marker-end="url(#ah-and)" style="animation:da 0.3s .45s ease both" class="da"></line>
      <line x1="259" y1="105" x2="279" y2="105" stroke="#16A34A" stroke-width="2" marker-end="url(#ah-and)" style="animation:da 0.3s .57s ease both" class="da"></line>
      <line x1="389" y1="105" x2="409" y2="105" stroke="#059669" stroke-width="2" marker-end="url(#ah-and)" style="animation:da 0.3s .69s ease both" class="da"></line>
      <line x1="519" y1="105" x2="539" y2="105" stroke="#059669" stroke-width="2" marker-end="url(#ah-and)" style="animation:da 0.3s .81s ease both" class="da"></line>
      <line x1="649" y1="105" x2="669" y2="105" stroke="#16A34A" stroke-width="2" marker-end="url(#ah-and)" style="animation:da 0.3s .93s ease both" class="da"></line>
      <line x1="779" y1="105" x2="799" y2="105" stroke="#D97706" stroke-width="2" marker-end="url(#ah-and)" style="animation:da 0.3s 1.05s ease both" class="da"></line>
      <circle r="4.5" fill="#16A34A" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="1s"><mpath href="#bp1"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#16A34A" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="1.5s"><mpath href="#bp2"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#059669" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="2s"><mpath href="#bp3"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#059669" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="2.5s"><mpath href="#bp4"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#16A34A" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="3s"><mpath href="#bp5"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#D97706" opacity=".85"><animateMotion dur="3s" repeatCount="indefinite" begin="3.5s"><mpath href="#bp6"></mpath></animateMotion></circle>
      <text x="75" y="165" text-anchor="middle" font-size="11" fill="#6B7280">SCM</text>
      <text x="205" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Deps</text>
      <text x="335" y="165" text-anchor="middle" font-size="11" fill="#6B7280">JVM Compile</text>
      <text x="465" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Assets</text>
      <text x="595" y="165" text-anchor="middle" font-size="11" fill="#6B7280">ART/DEX</text>
      <text x="725" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Bundle</text>
      <text x="855" y="165" text-anchor="middle" font-size="11" fill="#6B7280">Sign &amp; Push</text>
    </svg>

## Gradle Sync — How It Works

Gradle downloads all dependencies declared in `build.gradle` (or `build.gradle.kts`) from Maven Central, Google's Maven repo, or your private Nexus/JFrog Artifactory. Dependencies resolve transitively.

```bash
// build.gradle (app module)
dependencies {
  implementation 'androidx.core:core-ktx:1.13.1'
  implementation 'com.google.firebase:firebase-bom:33.0.0'
  testImplementation 'junit:junit:4.13.2'
}
// Use a private Nexus mirror in CI:
maven { url "https://nexus.example.internal/repo" }
```

## D8 / R8 — DEX & Shrinking

**D8** is the debug DEX compiler: it converts Java `.class` files into ART-compatible `.dex` bytecode (Android Runtime — Dalvik was replaced by ART in Android 5.0). **R8** is used in release builds only: it subsumes D8 while also shrinking (removing unused code), minifying (renaming classes/methods), and obfuscating — all in one pass. D8 compiles to DEX for all builds; R8 replaces D8 in release builds only (shrink + obfuscate).

```bash
# In build.gradle (proguard equivalent)
buildTypes {
  release {
    minifyEnabled true
    proguardFiles getDefaultProguardFile(
      'proguard-android-optimize.txt'),
      'proguard-rules.pro'
  }
}
```

## AAPT2 — Resources

AAPT2 (Android Asset Packaging Tool) compiles all resources (layouts, drawables, strings) into a binary format and links them into a resource table. It assigns resource integer IDs (via `R.java` in legacy projects, or `R` class via non-transitive R classes in AGP 8.0+ projects with `android.nonTransitiveRClass=true`) so the app can reference them at runtime.

Two-phase: **Compile** (per-file → `.flat` intermediate) then **Link** (all intermediates → `resources.arsc` + final APK base).

<aside class="callout"><div class="callout__body">✓ AAPT2 supports incremental builds: only changed resources are recompiled, not the whole resource set.</div></aside>

## APK vs AAB

APK is the traditional install package. It contains all code and assets for all device configurations.  
AAB (Android App Bundle) is the modern format. Google Play splits it into device-specific APKs at delivery time — smaller downloads, mandatory for new Play apps since 2021.

```bash
# Build a release AAB for Play Store
./gradlew bundleRelease
# Build a release APK (Enterprise/Firebase)
./gradlew assembleRelease
```

## Signing — Keystores

### Keystore Structure

Android signing uses a Java Keystore (`.jks` or `.keystore`). The keystore file holds one or more key entries, each protected by its own password. CI injects these as secrets.

```bash
# Create a release keystore (do once, store safely)
keytool -genkey -v \
  -keystore release.jks \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -alias myapp
# Note: Google recommends at least 4096-bit RSA keys for new keystores
# (or use EC: -keyalg EC -keysize 256). Play Console warns on keys below 2048 bits.
```

### Signing in Gradle

```bash
signingConfigs {
  release {
    storeFile file("release.jks")
    storePassword System.env.STORE_PASS
    keyAlias "myapp"
    keyPassword System.env.KEY_PASS
  }
}
buildTypes {
  release {
    signingConfig signingConfigs.release
  }
}
```

<aside class="callout"><strong class="callout__title">Warning:</strong><div class="callout__body">⚠ Never commit the keystore to source control. If lost, you cannot update your app on Play Store — the signing key is permanent and irreplaceable.<br><br> Never commit the keystore to source control — even if the file path looks local. For CI pipelines, inject the keystore as a base64-encoded environment variable and decode it to a temp file.</div></aside>

```bash
# CI-safe keystore injection — inject KEYSTORE_BASE64 as a secret env var
echo "$KEYSTORE_BASE64" | base64 --decode > /tmp/release.jks

./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=/tmp/release.jks \
  -Pandroid.injected.signing.store.password="$STORE_PASS" \
  -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$KEY_PASS"

# Clean up immediately after signing
rm -f /tmp/release.jks
```

[→ See Tab 4 for certificate management](#)

## bundletool — Local AAB Testing

AABs cannot be directly installed on a device — use `bundletool` for local testing. For Google Play distribution, upload the `.aab` directly — Play handles APK splitting per device configuration.

```bash
# AABs cannot be directly installed — use bundletool for local testing
# Download bundletool: https://github.com/google/bundletool/releases

# Build a universal APK set from AAB (for device testing)
java -jar bundletool.jar build-apks \
  --bundle=app-release.aab \
  --output=app.apks \
  --ks=release.jks \
  --ks-pass=pass:$STORE_PASS \
  --ks-key-alias=$KEY_ALIAS \
  --key-pass=pass:$KEY_PASS

# Install to connected device
java -jar bundletool.jar install-apks --apks=app.apks

# Get APK size estimate (useful for CI reporting)
java -jar bundletool.jar get-size total --apks=app.apks
```

## Jenkins Pipeline Example — Android

```bash
// Jenkinsfile — Android Build Pipeline
pipeline {
  agent { label 'android-agent' }
  environment {
    KEYSTORE_BASE64 = credentials('android-release-keystore-b64')
    STORE_PASS      = credentials('android-keystore-store-pass')
    KEY_ALIAS       = credentials('android-keystore-key-alias')
    KEY_PASS        = credentials('android-keystore-key-pass')
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Build') {
      steps {
        sh '''
          echo "$KEYSTORE_BASE64" | base64 --decode > /tmp/release.jks
          ./gradlew bundleRelease \
            -Pandroid.injected.signing.store.file=/tmp/release.jks \
            -Pandroid.injected.signing.store.password="$STORE_PASS" \
            -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
            -Pandroid.injected.signing.key.password="$KEY_PASS" \
            --no-daemon
          rm -f /tmp/release.jks
        '''
      }
    }
    stage('Test') { steps { sh './gradlew test --no-daemon' } }
  }
  post {
    always { archiveArtifacts artifacts: 'app/build/outputs/**/*.aab', allowEmptyArchive: true }
  }
}
```

## Gradle Dependency Locking

Dependency locking for Android is the equivalent of `Podfile.lock` for CocoaPods — it ensures reproducible builds by pinning exact resolved versions.

```bash
// build.gradle — enable dependency locking for reproducible builds
dependencyLocking {
  lockAllConfigurations()
}
```

```bash
# Generate/update lock files (commit these to source control)
./gradlew dependencies --write-locks

# Verify existing lock files (use in CI — fails if lock is stale)
./gradlew dependencies --verify-lock-files

# Lock files location: gradle/dependency-locks/*.lockfile
# Commit the lockfiles directory to source control
```

## 3 🔍 Pod Install & Xcode Deep Dive

Pod Install & Xcode Deep Dive

CocoaPods is the dominant dependency manager for iOS. Understanding exactly what `pod install` does — and what Xcode does with the result — is essential for diagnosing build failures. This tab covers the internals and every common failure mode.

CocoaPods Resolution & Integration Flow — Animated

<svg viewBox="0 0 900 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-title-3">
      <rect width="900" height="340" fill="#F8FAFC"></rect>
      <defs>
        <marker id="ah-dp" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#7C3AED"></path>
        </marker>
        <marker id="ah-dp2" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#16A34A"></path>
        </marker>
        <path id="dp1" d="M105,50 L105,80"></path>
        <path id="dp2" d="M105,135 L105,160"></path>
        <path id="dp3" d="M155,195 L215,195"></path>
        <path id="dp4" d="M155,195 L290,195"></path>
        <path id="dp5" d="M155,195 L370,195"></path>
        <path id="dp6" d="M105,245 L105,270"></path>
        <path id="dp7" d="M105,300 Q450,300 795,265"></path>
      </defs>
      <rect x="30" y="20" width="150" height="40" rx="8" fill="#EDE9FE" stroke="#DDD6FE" stroke-width="1.5"></rect>
      <text x="105" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="#4C1D95">Podfile</text>
      <text x="105" y="50" text-anchor="middle" font-size="12" fill="#7C3AED">platform :ios, '16.0'</text>
      <line x1="105" y1="62" x2="105" y2="88" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-dp)"></line>
      <circle r="4" fill="#7C3AED" opacity=".8"><animateMotion dur="2s" repeatCount="indefinite" begin="0.5s"><mpath href="#dp1"></mpath></animateMotion></circle>
      <rect x="30" y="90" width="150" height="52" rx="8" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
      <text x="105" y="111" text-anchor="middle" font-size="11" font-weight="700" fill="#6D28D9">Molinillo Resolver</text>
      <text x="105" y="125" text-anchor="middle" font-size="11" fill="#7C3AED">conflict-driven dep resolver</text>
      <text x="105" y="137" text-anchor="middle" font-size="11" fill="#6B7280">resolves transitive deps</text>
      <line x1="105" y1="144" x2="105" y2="168" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-dp)"></line>
      <circle r="4" fill="#7C3AED" opacity=".8"><animateMotion dur="2s" repeatCount="indefinite" begin="1s"><mpath href="#dp2"></mpath></animateMotion></circle>
      <rect x="30" y="170" width="120" height="38" rx="8" fill="#DCFCE7" stroke="#BBF7D0" stroke-width="1.5"></rect>
      <text x="90" y="186" text-anchor="middle" font-size="11" font-weight="700" fill="#14532D">Podfile.lock</text>
      <text x="90" y="200" text-anchor="middle" font-size="11" fill="#16A34A">pinned versions</text>
      <line x1="152" y1="189" x2="218" y2="230" stroke="#7C3AED" stroke-width="1" stroke-dasharray="3,2" opacity=".5"></line>
      <line x1="152" y1="189" x2="295" y2="230" stroke="#7C3AED" stroke-width="1" stroke-dasharray="3,2" opacity=".5"></line>
      <line x1="152" y1="189" x2="372" y2="230" stroke="#7C3AED" stroke-width="1" stroke-dasharray="3,2" opacity=".5"></line>
      <rect x="178" y="230" width="80" height="36" rx="6" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
      <text x="218" y="246" text-anchor="middle" font-size="12" font-weight="600" fill="#1E3A8A">Alamofire</text>
      <text x="218" y="258" text-anchor="middle" font-size="11" fill="#3B82F6">git clone</text>
      <rect x="256" y="230" width="78" height="36" rx="6" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
      <text x="295" y="246" text-anchor="middle" font-size="12" font-weight="600" fill="#1E3A8A">Firebase</text>
      <text x="295" y="258" text-anchor="middle" font-size="11" fill="#3B82F6">CDN download</text>
      <rect x="333" y="230" width="78" height="36" rx="6" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
      <text x="372" y="246" text-anchor="middle" font-size="12" font-weight="600" fill="#1E3A8A">RxSwift</text>
      <text x="372" y="258" text-anchor="middle" font-size="11" fill="#3B82F6">local cache</text>
      <line x1="218" y1="268" x2="218" y2="290" stroke="#16A34A" stroke-width="1" opacity=".4"></line>
      <line x1="295" y1="268" x2="295" y2="290" stroke="#16A34A" stroke-width="1" opacity=".4"></line>
      <line x1="372" y1="268" x2="372" y2="290" stroke="#16A34A" stroke-width="1" opacity=".4"></line>
      <line x1="218" y1="290" x2="372" y2="290" stroke="#16A34A" stroke-width="1" opacity=".4"></line>
      <line x1="295" y1="290" x2="295" y2="305" stroke="#16A34A" stroke-width="1.5" marker-end="url(#ah-dp2)"></line>
      <rect x="218" y="305" width="155" height="28" rx="6" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
      <text x="295" y="322" text-anchor="middle" font-size="12" font-weight="600" fill="#14532D">Pods/ directory</text>
      <rect x="450" y="90" width="180" height="44" rx="8" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
      <text x="540" y="108" text-anchor="middle" font-size="11" font-weight="700" fill="#4C1D95">App.xcworkspace</text>
      <text x="540" y="124" text-anchor="middle" font-size="11" fill="#7C3AED">references app project + Pods project</text>
      <rect x="450" y="148" width="180" height="44" rx="8" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
      <text x="540" y="166" text-anchor="middle" font-size="11" font-weight="700" fill="#4C1D95">Pods.xcconfig</text>
      <text x="540" y="182" text-anchor="middle" font-size="11" fill="#7C3AED">HEADER_SEARCH_PATHS, LD_FLAGS…</text>
      <rect x="450" y="206" width="180" height="44" rx="8" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
      <text x="540" y="224" text-anchor="middle" font-size="11" font-weight="700" fill="#4C1D95">Pods.xcodeproj</text>
      <text x="540" y="240" text-anchor="middle" font-size="11" fill="#7C3AED">separate project, builds all pod targets</text>
      <line x1="632" y1="112" x2="680" y2="112" stroke="#7C3AED" stroke-width="1" stroke-dasharray="3,2" opacity=".5"></line>
      <line x1="632" y1="170" x2="680" y2="170" stroke="#7C3AED" stroke-width="1" stroke-dasharray="3,2" opacity=".5"></line>
      <line x1="632" y1="228" x2="680" y2="228" stroke="#7C3AED" stroke-width="1" stroke-dasharray="3,2" opacity=".5"></line>
      <line x1="680" y1="112" x2="680" y2="228" stroke="#7C3AED" stroke-width="1" opacity=".4"></line>
      <line x1="680" y1="170" x2="720" y2="170" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-dp)"></line>
      <rect x="720" y="148" width="150" height="44" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
      <text x="795" y="166" text-anchor="middle" font-size="11" font-weight="700" fill="#78350F">xcodebuild</text>
      <text x="795" y="181" text-anchor="middle" font-size="11" fill="#D97706">-workspace .xcworkspace</text>
      <text x="30" y="15" font-size="11" fill="#6B7280" font-weight="600">INPUT</text>
      <text x="30" y="228" font-size="11" fill="#6B7280" font-weight="600">DOWNLOAD</text>
      <text x="450" y="85" font-size="11" fill="#6B7280" font-weight="600">GENERATED</text>
      <text x="720" y="143" font-size="11" fill="#6B7280" font-weight="600">CONSUMES</text>
      <circle r="4" fill="#D97706" opacity=".85">
        <animateMotion dur="2.5s" repeatCount="indefinite" begin="1s" path="M295,305 Q500,290 680,170 L720,170"></animateMotion>
      </circle>
    </svg>

## What pod install Does — Step By Step

1

Parse Podfile

Reads `platform`, `target` blocks, and `pod` declarations. Evaluates Ruby DSL blocks (pre/post install hooks).

2

Resolve Dependency Graph (Molinillo)

Conflict-driven dependency resolver with backtracking. Tries to satisfy all version constraints transitively. Fails if two pods require incompatible versions of the same dependency.

3

Check Podfile.lock

If lock file exists and resolution matches, **no download happens** — existing Pods/ is used. `--deployment` flag enforces this strictly.

4

Download Pod Sources

Clone git repos, download from CDN (cdn.cocoapods.org), or copy from local path. Stored in the global cache at `~/Library/Caches/CocoaPods/`.

5

Generate Xcode Integration Files

Writes `Pods.xcodeproj`, `Pods.xcworkspace`, per-target `.xcconfig` files, and injects `Copy Pods Resources` and `Embed Pods Frameworks` build phases into your project.

## Xcode Build Phases — Execution Order

Build Phase Sequence

<svg viewBox="0 0 380 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-title-4">
          <rect width="380" height="320" fill="#F8FAFC"></rect>
          <defs>
            <marker id="ah-ph" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#7C3AED"></path>
            </marker>
          </defs>
          <rect x="60" y="15" width="260" height="34" rx="7" fill="#EDE9FE" stroke="#DDD6FE" stroke-width="1.5" style="animation:stg .3s .1s ease both"></rect>
          <text x="190" y="29" text-anchor="middle" font-size="12" font-weight="700" fill="#4C1D95">Run Script — Pre-Compile Hooks</text>
          <text x="190" y="41" text-anchor="middle" font-size="11" fill="#7C3AED">SwiftLint, code generation, version bump</text>
          <line x1="190" y1="51" x2="190" y2="63" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-ph)"></line>
          <rect x="60" y="65" width="260" height="34" rx="7" fill="#DBEAFE" stroke="#BFDBFE" stroke-width="1.5" style="animation:stg .3s .2s ease both"></rect>
          <text x="190" y="79" text-anchor="middle" font-size="12" font-weight="700" fill="#1E3A8A">Compile Sources</text>
          <text x="190" y="91" text-anchor="middle" font-size="11" fill="#2563EB">Swift/ObjC → .o object files</text>
          <line x1="190" y1="101" x2="190" y2="113" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-ph)"></line>
          <rect x="60" y="115" width="260" height="34" rx="7" fill="#DBEAFE" stroke="#BFDBFE" stroke-width="1.5" style="animation:stg .3s .3s ease both"></rect>
          <text x="190" y="129" text-anchor="middle" font-size="12" font-weight="700" fill="#1E3A8A">Link Binary With Libraries</text>
          <text x="190" y="141" text-anchor="middle" font-size="11" fill="#2563EB">ld links .o → executable + frameworks</text>
          <line x1="190" y1="151" x2="190" y2="163" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-ph)"></line>
          <rect x="60" y="165" width="260" height="34" rx="7" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5" style="animation:stg .3s .4s ease both"></rect>
          <text x="190" y="179" text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">Copy Bundle Resources</text>
          <text x="190" y="191" text-anchor="middle" font-size="11" fill="#16A34A">assets, storyboards, xcassets → .app</text>
          <line x1="190" y1="201" x2="190" y2="213" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-ph)"></line>
          <rect x="60" y="215" width="260" height="34" rx="7" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5" style="animation:stg .3s .5s ease both"></rect>
          <text x="190" y="229" text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">Embed Pods Frameworks</text>
          <text x="190" y="241" text-anchor="middle" font-size="11" fill="#16A34A">copy dynamic pod frameworks → .app</text>
          <line x1="190" y1="251" x2="190" y2="263" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-ph)"></line>
          <rect x="60" y="265" width="260" height="34" rx="7" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1.5" style="animation:stg .3s .6s ease both"></rect>
          <text x="190" y="279" text-anchor="middle" font-size="12" font-weight="700" fill="#78350F">Code Sign</text>
          <text x="190" y="291" text-anchor="middle" font-size="11" fill="#D97706">embed profile, sign binary + frameworks</text>
          <circle r="4" fill="#7C3AED" opacity=".75">
            <animateMotion dur="3s" repeatCount="indefinite" begin="0.5s" path="M190,50 L190,65 L190,100 L190,115 L190,150 L190,165 L190,200 L190,215 L190,250 L190,265"></animateMotion>
          </circle>
        </svg>

## Swift Package Manager (SPM)

SPM is now the default dependency manager for new Xcode projects and is integrated directly into Xcode (no separate install needed).

### Key Differences vs CocoaPods

-   Dependencies declared in `Package.swift` or via Xcode's "Add Package Dependencies" UI
-   No `Podfile.lock` equivalent — Xcode generates `Package.resolved` (commit this file)
-   SPM packages are resolved at the workspace level, not the app target level
-   No `xcworkspace` generation — packages are resolved inside the `.xcodeproj` itself
-   Offline resolution: `xcodebuild -resolvePackageDependencies` pins versions before building
-   Mixing CocoaPods and SPM: your project will have both a `.xcworkspace` (from CocoaPods) and inline SPM dependencies — always open the `.xcworkspace`, never the `.xcodeproj`

```bash
# Resolve SPM dependencies (always run before xcodebuild in CI)
xcodebuild -resolvePackageDependencies \
  -project MyApp.xcodeproj \
  -scheme MyApp

# Then build as normal
xcodebuild clean build \
  -project MyApp.xcodeproj \
  -scheme MyApp ...
```

### Troubleshooting SPM in CI

### error: no such module 'SomePackage'

SPM resolution failed. Run `-resolvePackageDependencies` first.

### PackageIndex: failed to fetch

Network issue or private registry auth. Use `--disable-automatic-package-resolution` with a committed `Package.resolved`.

## dSYM — Debug Symbol Files

Every Xcode archive produces a `.dSYM` bundle alongside the `.xcarchive`. dSYMs map crash addresses back to your source code — without them, production crash reports show only memory addresses.

```bash
# dSYM location after xcodebuild archive
ls build/MyApp.xcarchive/dSYMs/
# → MyApp.app.dSYM/Contents/Resources/DWARF/MyApp

# Verify the dSYM UUID matches your binary
dwarfdump --uuid MyApp.app.dSYM
dwarfdump --uuid MyApp.app/MyApp   # must match

# Upload to Firebase Crashlytics
$PODS_ROOT/FirebaseCrashlytics/upload-symbols \
  -gsp GoogleService-Info.plist \
  -p ios build/MyApp.xcarchive/dSYMs

# Upload to Sentry
sentry-cli upload-dif --org my-org --project my-app \
  build/MyApp.xcarchive/dSYMs/

# Upload to Datadog
datadog-ci dsyms upload build/MyApp.xcarchive/dSYMs/
```

<aside class="callout"><div class="callout__body">ℹ CI best practice: Archive the entire <code>.dSYM</code> bundle as a build artifact alongside the IPA. Never distribute an IPA without preserving its matching dSYMs — they are identified by UUID and cannot be regenerated.</div></aside>

## Build Cache Strategy

### iOS — What to Cache

```bash
# CocoaPods download cache (saves re-downloading pod sources)
# Cache key: hash of Podfile.lock
~/Library/Caches/CocoaPods/

# DerivedData (incremental builds — 60-80% build time reduction)
# Cache key: hash of source files + Podfile.lock
~/Library/Developer/Xcode/DerivedData/

# Gems (Fastlane, CocoaPods gem)
vendor/bundle/  # if using bundler
```

### Android — What to Cache

```bash
# Gradle dependency cache
~/.gradle/caches/
~/.gradle/wrapper/

# Enable Gradle build cache in gradle.properties:
org.gradle.caching=true
org.gradle.daemon=false        # always disable daemon on CI
org.gradle.parallel=true
org.gradle.configureondemand=true
```

### Cache Invalidation Rules

-   **iOS:** invalidate DerivedData cache when Xcode version changes, never carry over between major versions
-   **Android:** invalidate Gradle cache when AGP version changes
-   Never cache build outputs (IPAs, APKs, AABs) — those are artifacts, not caches

## Agent Disk Cleanup (CI Maintenance)

macOS build agents accumulate gigabytes of data within days. Add these to a weekly cron job on every Mac CI agent. A fresh full iOS build generates 1–2 GB; 20 builds/day = 40 GB/day without cleanup. Monitor with: `df -h /`

```bash
#!/bin/bash
# /etc/periodic/weekly/cleanup-build-agent.sh

# Remove stale DerivedData (older than 7 days)
find ~/Library/Developer/Xcode/DerivedData -maxdepth 1 \
  -type d -mtime +7 -exec rm -rf {} +

# Remove old simulator runtimes
xcrun simctl delete unavailable

# Remove accumulated .xcarchive bundles (keep last 10)
ls -dt ~/Library/Developer/Xcode/Archives/*/*.xcarchive | \
  tail -n +11 | xargs rm -rf

# Remove CocoaPods download cache older than 30 days
find ~/Library/Caches/CocoaPods/Pods -maxdepth 2 \
  -type d -mtime +30 -exec rm -rf {} +

# Gradle cache cleanup
find ~/.gradle/caches -name "*.lock" -delete
./gradlew --stop  # stop all Gradle daemons
```

## Troubleshooting CocoaPods

### Error: Unable to find a specification for X

Specs repo is out of date or pod doesn't exist at that version.

### Fix

```bash
pod repo update     # refresh CDN
pod install --repo-update
```

### Error: Transitive dependency conflict

Pod A requires FirebaseCore ~> 10.0, Pod B requires ~> 11.0

### Fix

```bash
# Pin the shared dep in Podfile:
pod 'FirebaseCore', '~> 11.0'
# Then pod install again
```

### Error: The Podfile.lock is out of sync

Someone added a pod without running pod install, or PODS\_ROOT is stale.

### Fix

```bash
pod install   # always use --deployment in CI
```

### Xcode: No such file or directory (header not found)

HEADER\_SEARCH\_PATHS from xcconfig not being inherited.

### Fix

```bash
# In Build Settings, check that xcconfig is set for
# your target's configuration. Do NOT override
# HEADER_SEARCH_PATHS manually — it breaks CocoaPods.
pod deintegrate && pod install
```

### Xcode: Duplicate symbols at link time

Two pods embed the same framework. Common with Firebase sub-specs.

### Fix

```bash
# Use the umbrella pod instead of sub-specs:
pod 'Firebase/Core'   # NOT individual sub-pods
```

### Build: Module not found after Xcode update

DerivedData cached stale build artifacts after Xcode upgrade.

### Fix

```bash
# Nuclear clean (always fixes stale DerivedData):
rm -rf ~/Library/Developer/Xcode/DerivedData
xcodebuild clean -workspace App.xcworkspace \
  -scheme MyApp
```

## Verbose Xcode Output — Reading Build Logs

By default `xcodebuild` output is verbose and hard to read. Use `xcpretty` for human-readable output, or install `xcbeautify`:

```bash
# Pipe through xcpretty (Ruby gem)
xcodebuild ... | xcpretty
xcodebuild ... | xcpretty --report junit

# Or xcbeautify (faster, no Ruby dep)
xcodebuild ... | xcbeautify
```

```bash
# Raw log includes full compiler invocations
# Look for these patterns:
## CompileSwift — swift file compilation
## Ld — linker invocation
## CopySwiftLibs — swift runtime copy
## CodeSign — signing step
# Use Xcode → Reports navigator for GUI log
```

<aside class="callout"><div class="callout__body">💡 In Jenkins, save the raw <code>xcodebuild</code> output to a file and archive it as a build artifact. xcodebuild exit codes: 0 = success, 65 = test failures, 70 = build error.</div></aside>

## Jenkins Pipeline Example — iOS

```bash
// Jenkinsfile — iOS Build Pipeline
pipeline {
  agent { label 'mac-agent' }
  environment {
    KEYCHAIN_PASS = credentials('ci-keychain-pass')
    P12_PASS      = credentials('ios-dist-cert-p12-pass')
    CERT_P12      = credentials('ios-dist-cert-p12-b64')
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Setup Keychain') {
      steps {
        sh '''
          security create-keychain -p "$KEYCHAIN_PASS" ci-build.keychain-db
          security set-keychain-settings -t 3600 -l ci-build.keychain-db
          echo "$CERT_P12" | base64 --decode > /tmp/cert.p12
          security import /tmp/cert.p12 -k ci-build.keychain-db \
            -P "$P12_PASS" -T /usr/bin/codesign
          security set-key-partition-list \
            -S apple-tool:,apple:,codesign: \
            -s -k "$KEYCHAIN_PASS" ci-build.keychain-db
          rm -f /tmp/cert.p12
        '''
      }
    }
    stage('Pod Install') {
      steps { sh 'pod install --deployment' }
    }
    stage('Build & Archive') {
      steps {
        sh '''
          xcodebuild clean archive \
            -workspace MyApp.xcworkspace \
            -scheme MyApp \
            -configuration Release \
            -archivePath build/MyApp.xcarchive \
            OTHER_CODE_SIGN_FLAGS="--keychain ci-build.keychain-db" \
            COMPILER_INDEX_STORE_ENABLE=NO | xcpretty
        '''
      }
    }
    stage('Export IPA') {
      steps {
        sh 'xcodebuild -exportArchive -archivePath build/MyApp.xcarchive -exportPath build/export -exportOptionsPlist ExportOptions.plist'
      }
    }
  }
  post {
    always {
      sh 'security delete-keychain ci-build.keychain-db || true'
      archiveArtifacts artifacts: 'build/export/*.ipa, build/MyApp.xcarchive/dSYMs/**', allowEmptyArchive: true
    }
  }
}
```

## 4 🔐 Certs, Profiles & Signing

Certificates, Provisioning Profiles & Code Signing

iOS code signing is a three-party system: Apple (certificate authority), you (the developer with a private key), and the device (which verifies the signature at launch). Every installed app must pass this chain of trust.

Apple Certificate Trust Chain — Animated

<svg viewBox="0 0 900 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-title-5">
      <rect width="900" height="360" fill="#F8FAFC"></rect>
      <defs>
        <marker id="ah-ct" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#D97706"></path>
        </marker>
        <marker id="ah-ct2" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#6B7280"></path>
        </marker>
        <linearGradient id="gcert1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FEF3C7"></stop>
          <stop offset="100%" stop-color="#FDE68A"></stop>
        </linearGradient>
        <linearGradient id="gcert2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#DBEAFE"></stop>
          <stop offset="100%" stop-color="#BFDBFE"></stop>
        </linearGradient>
        <linearGradient id="gcert3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#EDE9FE"></stop>
          <stop offset="100%" stop-color="#DDD6FE"></stop>
        </linearGradient>
      </defs>
      <rect x="325" y="15" width="250" height="56" rx="10" fill="url(#gcert1)" stroke="#F59E0B" stroke-width="2" style="animation:stg .5s .0s ease both"></rect>
      <text x="450" y="37" text-anchor="middle" font-size="13" font-weight="700" fill="#78350F">Apple Root CA</text>
      <text x="450" y="52" text-anchor="middle" font-size="12" fill="#92400E">Self-signed · Pre-installed on every Apple device</text>
      <circle cx="567" cy="33" r="5" fill="#F59E0B" opacity=".6"><animate attributeName="opacity" values=".6;1;.6" dur="2s" repeatCount="indefinite"></animate></circle>
      <line x1="450" y1="73" x2="450" y2="98" stroke="#D97706" stroke-width="1.5" marker-end="url(#ah-ct)" style="animation:da 0.3s .6s ease both" class="da"></line>
      <circle r="4" fill="#D97706" opacity=".8"><animateMotion dur="2s" repeatCount="indefinite" begin=".8s" path="M450,73 L450,98"></animateMotion></circle>
      <rect x="290" y="100" width="320" height="56" rx="10" fill="url(#gcert1)" stroke="#F59E0B" stroke-width="1.5" style="animation:stg .5s .3s ease both"></rect>
      <text x="450" y="122" text-anchor="middle" font-size="13" font-weight="700" fill="#78350F">Apple Worldwide Dev Relations CA</text>
      <text x="450" y="137" text-anchor="middle" font-size="12" fill="#92400E">Signs all developer certificates · G6 intermediate (current; G3 expired Dec 2023)</text>
      <line x1="380" y1="158" x2="250" y2="195" stroke="#D97706" stroke-width="1.5" marker-end="url(#ah-ct)" style="animation:da 0.3s 1s ease both" class="da"></line>
      <line x1="520" y1="158" x2="650" y2="195" stroke="#D97706" stroke-width="1.5" marker-end="url(#ah-ct)" style="animation:da 0.3s 1s ease both" class="da"></line>
      <circle r="4" fill="#D97706" opacity=".8"><animateMotion dur="2s" repeatCount="indefinite" begin="1.5s" path="M380,158 L250,195"></animateMotion></circle>
      <circle r="4" fill="#D97706" opacity=".8"><animateMotion dur="2s" repeatCount="indefinite" begin="1.8s" path="M520,158 L650,195"></animateMotion></circle>
      <rect x="110" y="195" width="280" height="56" rx="10" fill="url(#gcert2)" stroke="#3B82F6" stroke-width="1.5" style="animation:stg .5s .5s ease both"></rect>
      <text x="250" y="217" text-anchor="middle" font-size="12" font-weight="700" fill="#1E3A8A">Development Certificate</text>
      <text x="250" y="232" text-anchor="middle" font-size="12" fill="#2563EB">iPhone Developer: Your Name</text>
      <text x="250" y="244" text-anchor="middle" font-size="11" fill="#6B7280">used for debug builds on device</text>
      <rect x="510" y="195" width="280" height="56" rx="10" fill="url(#gcert3)" stroke="#7C3AED" stroke-width="1.5" style="animation:stg .5s .5s ease both"></rect>
      <text x="650" y="217" text-anchor="middle" font-size="12" font-weight="700" fill="#4C1D95">Distribution Certificate</text>
      <text x="650" y="232" text-anchor="middle" font-size="12" fill="#7C3AED">iPhone Distribution: Acme Corp</text>
      <text x="650" y="244" text-anchor="middle" font-size="11" fill="#6B7280">App Store · Enterprise · Ad Hoc</text>
      <rect x="110" y="265" width="280" height="40" rx="8" fill="#FFF" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,2"></rect>
      <text x="250" y="281" text-anchor="middle" font-size="12" fill="#374151">🔑 <tspan font-weight="600">Private Key</tspan> stored in Keychain</text>
      <text x="250" y="295" text-anchor="middle" font-size="11" fill="#6B7280">cert + key = signing identity (.p12 export)</text>
      <rect x="510" y="265" width="280" height="40" rx="8" fill="#FFF" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,2"></rect>
      <text x="650" y="281" text-anchor="middle" font-size="12" fill="#374151">🔑 <tspan font-weight="600">Private Key</tspan> stored in Keychain</text>
      <text x="650" y="295" text-anchor="middle" font-size="11" fill="#6B7280">must be on the build machine</text>
      <line x1="250" y1="307" x2="250" y2="325" stroke="#6B7280" stroke-width="1" marker-end="url(#ah-ct2)" opacity=".5"></line>
      <line x1="650" y1="307" x2="650" y2="325" stroke="#6B7280" stroke-width="1" marker-end="url(#ah-ct2)" opacity=".5"></line>
      <rect x="150" y="325" width="600" height="26" rx="6" fill="#F3F4F6" stroke="#E5E7EB"></rect>
      <text x="450" y="342" text-anchor="middle" font-size="12" fill="#374151" font-weight="600">Certificate embedded in Provisioning Profile → signs your app binary</text>
    </svg>

## Provisioning Profile — Anatomy

A provisioning profile is a signed property list issued by Apple. It grants specific capabilities to an app binary, for specific certificates, on specific devices. It expires and must be renewed.

What Is Inside a .mobileprovision

<svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-title-7">
          <rect width="400" height="280" fill="#F8FAFC"></rect>
          <rect x="15" y="15" width="370" height="250" rx="10" fill="#FFFBEB" stroke="#FDE68A" stroke-width="2"></rect>
          <text x="200" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="#78350F">Provisioning Profile (.mobileprovision)</text>
          <text x="200" y="48" text-anchor="middle" font-size="11" fill="#92400E">DER-encoded CMS envelope signed by Apple WWDR CA</text>
          <rect x="28" y="56" width="160" height="44" rx="7" fill="url(#gcert2)" stroke="#BFDBFE" stroke-width="1.5" style="animation:stg .4s .2s ease both"></rect>
          <text x="108" y="73" text-anchor="middle" font-size="12" font-weight="600" fill="#1E3A8A">Certificate(s)</text>
          <text x="108" y="86" text-anchor="middle" font-size="11" fill="#3B82F6">public key of signing identity</text>
          <rect x="212" y="56" width="160" height="44" rx="7" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5" style="animation:stg .4s .3s ease both"></rect>
          <text x="292" y="73" text-anchor="middle" font-size="12" font-weight="600" fill="#14532D">App ID</text>
          <text x="292" y="86" text-anchor="middle" font-size="11" fill="#16A34A">com.acme.myapp (or wildcard *)</text>
          <rect x="28" y="112" width="160" height="44" rx="7" fill="#FEE2E2" stroke="#FECACA" stroke-width="1.5" style="animation:stg .4s .4s ease both"></rect>
          <text x="108" y="129" text-anchor="middle" font-size="12" font-weight="600" fill="#991B1B">Devices (UDIDs)</text>
          <text x="108" y="142" text-anchor="middle" font-size="11" fill="#DC2626">empty = App Store or Enterprise; list = Dev or Ad Hoc only</text>
          <rect x="212" y="112" width="160" height="44" rx="7" fill="url(#gcert3)" stroke="#DDD6FE" stroke-width="1.5" style="animation:stg .4s .5s ease both"></rect>
          <text x="292" y="129" text-anchor="middle" font-size="12" font-weight="600" fill="#4C1D95">Entitlements</text>
          <text x="292" y="142" text-anchor="middle" font-size="11" fill="#7C3AED">Push, iCloud, Sign in with Apple…</text>
          <rect x="28" y="168" width="160" height="44" rx="7" fill="#FFF7ED" stroke="#FED7AA" stroke-width="1.5" style="animation:stg .4s .6s ease both"></rect>
          <text x="108" y="185" text-anchor="middle" font-size="12" font-weight="600" fill="#9A3412">Expiry Date</text>
          <text x="108" y="198" text-anchor="middle" font-size="11" fill="#EA580C">1 year (dev) · 1 year (dist)</text>
          <rect x="212" y="168" width="160" height="44" rx="7" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1.5" style="animation:stg .4s .7s ease both"></rect>
          <text x="292" y="185" text-anchor="middle" font-size="12" font-weight="600" fill="#374151">Distribution Type</text>
          <text x="292" y="198" text-anchor="middle" font-size="11" fill="#4B5563">dev · ad-hoc · app-store · enterprise</text>
          <rect x="28" y="224" width="344" height="26" rx="6" fill="#FFFBEB" stroke="#FDE68A"></rect>
          <text x="200" y="240" text-anchor="middle" font-size="11" fill="#78350F" font-weight="600">Entire payload signed by Apple WWDR CA → tamper-proof</text>
        </svg>

## Profile Types — When to Use Each

| Type | Signed By | Distribution | Devices |
| --- | --- | --- | --- |
| Development | Dev Cert | Debug on device via Xcode | Registered UDIDs only |
| Ad Hoc | Dist Cert | Direct install / TestFlight alt | Up to 100 registered devices per device type per account; resets once annually |
| App Store | Dist Cert | Submission to App Store | No device limit (managed by App Store) |
| Enterprise | Dist Cert (Enterprise account) | Internal MDM / web install | All devices (no UDID list) |

<aside class="callout"><strong class="callout__title">employees only</strong><div class="callout__body">⚠ Enterprise distribution is for . Distributing an Enterprise-signed app to the public violates Apple's Developer Enterprise Program License and can result in certificate revocation.</div></aside>

## Common Signing Errors

### No signing certificate found

The cert isn't in the build machine's keychain. Import the `.p12` export including the private key.

### Profile doesn't include the signing certificate

The profile was generated for a different certificate. Regenerate it on developer.apple.com with the correct cert, then re-download.

### The executable was signed with invalid entitlements

The app's `Entitlements.plist` requests a capability not granted by the profile (e.g. Push enabled in code but not in profile). Regenerate the App ID with the capability, then regenerate the profile.

## Code Signing Flow — End to End

How Your App Gets Signed & Verified — Animated

<svg viewBox="0 0 900 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-title-6">
        <rect width="900" height="200" fill="#F8FAFC"></rect>
        <defs>
          <marker id="ah-cs" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#7C3AED"></path>
          </marker>
          <path id="cs1" d="M120,100 L160,100"></path>
          <path id="cs2" d="M260,100 L300,100"></path>
          <path id="cs3" d="M390,80 Q430,60 470,80"></path>
          <path id="cs4" d="M390,120 Q430,140 470,120"></path>
          <path id="cs5" d="M580,100 L620,100"></path>
          <path id="cs6" d="M720,100 L760,100"></path>
        </defs>
        <rect x="20" y="72" width="100" height="56" rx="8" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5" style="animation:stg .4s .0s ease both"></rect>
        <text x="70" y="96" text-anchor="middle" font-size="11" font-weight="700" fill="#1E3A8A">App Binary</text>
        <text x="70" y="111" text-anchor="middle" font-size="11" fill="#3B82F6">compiled .app</text>
        <text x="70" y="123" text-anchor="middle" font-size="11" fill="#6B7280">unsigned</text>
        <line x1="122" y1="100" x2="158" y2="100" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-cs)"></line>
        <circle r="4" fill="#7C3AED" opacity=".8"><animateMotion dur="2.5s" repeatCount="indefinite" begin=".5s"><mpath href="#cs1"></mpath></animateMotion></circle>
        <rect x="160" y="58" width="100" height="84" rx="8" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="2" style="animation:stg .4s .2s ease both"></rect>
        <text x="210" y="90" text-anchor="middle" font-size="12" font-weight="700" fill="#4C1D95">codesign</text>
        <text x="210" y="105" text-anchor="middle" font-size="11" fill="#7C3AED">private key</text>
        <text x="210" y="118" text-anchor="middle" font-size="11" fill="#7C3AED">signs hash</text>
        <text x="210" y="131" text-anchor="middle" font-size="11" fill="#7C3AED">embeds profile</text>
        <circle cx="248" cy="77" r="5" fill="#7C3AED" opacity=".5"><animate attributeName="opacity" values=".5;1;.5" dur="1.5s" repeatCount="indefinite"></animate></circle>
        <line x1="262" y1="100" x2="298" y2="100" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#ah-cs)"></line>
        <circle r="4" fill="#7C3AED" opacity=".8"><animateMotion dur="2.5s" repeatCount="indefinite" begin="1s"><mpath href="#cs2"></mpath></animateMotion></circle>
        <rect x="170" y="155" width="80" height="30" rx="6" fill="#DBEAFE" stroke="#BFDBFE" stroke-width="1"></rect>
        <text x="210" y="169" text-anchor="middle" font-size="11" fill="#1E3A8A" font-weight="600">Certificate</text>
        <text x="210" y="179" text-anchor="middle" font-size="11" fill="#6B7280">+ private key</text>
        <line x1="210" y1="154" x2="210" y2="144" stroke="#3B82F6" stroke-width="1" stroke-dasharray="2,2" opacity=".6"></line>
        <rect x="300" y="72" width="90" height="56" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5" style="animation:stg .4s .4s ease both"></rect>
        <text x="345" y="96" text-anchor="middle" font-size="11" font-weight="700" fill="#14532D">Signed .app</text>
        <text x="345" y="111" text-anchor="middle" font-size="11" fill="#16A34A">signature</text>
        <text x="345" y="123" text-anchor="middle" font-size="11" fill="#16A34A">+ profile</text>
        <line x1="392" y1="100" x2="468" y2="100" stroke="#16A34A" stroke-width="1.5" marker-end="url(#ah-cs)"></line>
        <circle r="4" fill="#16A34A" opacity=".8"><animateMotion dur="2.5s" repeatCount="indefinite" begin="1.5s" path="M392,100 L468,100"></animateMotion></circle>
        <rect x="470" y="72" width="110" height="56" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5" style="animation:stg .4s .6s ease both"></rect>
        <text x="525" y="93" text-anchor="middle" font-size="11" font-weight="700" fill="#78350F">.ipa package</text>
        <text x="525" y="108" text-anchor="middle" font-size="11" fill="#D97706">Payload/App.app</text>
        <text x="525" y="120" text-anchor="middle" font-size="11" fill="#D97706">ZIP container</text>
        <line x1="582" y1="100" x2="618" y2="100" stroke="#D97706" stroke-width="1.5" marker-end="url(#ah-cs)"></line>
        <circle r="4" fill="#D97706" opacity=".8"><animateMotion dur="2.5s" repeatCount="indefinite" begin="2s"><mpath href="#cs5"></mpath></animateMotion></circle>
        <rect x="620" y="72" width="100" height="56" rx="8" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1.5" style="animation:stg .4s .8s ease both"></rect>
        <text x="670" y="96" text-anchor="middle" font-size="11" font-weight="700" fill="#374151">iOS Device</text>
        <text x="670" y="111" text-anchor="middle" font-size="11" fill="#4B5563">install IPA</text>
        <text x="670" y="123" text-anchor="middle" font-size="11" fill="#6B7280">verify on install</text>
        <line x1="722" y1="100" x2="758" y2="100" stroke="#16A34A" stroke-width="1.5" marker-end="url(#ah-cs)"></line>
        <circle r="4" fill="#16A34A" opacity=".8"><animateMotion dur="2.5s" repeatCount="indefinite" begin="2.5s"><mpath href="#cs6"></mpath></animateMotion></circle>
        <rect x="760" y="72" width="120" height="56" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="2" style="animation:stg .4s 1.0s ease both"></rect>
        <text x="820" y="93" text-anchor="middle" font-size="11" font-weight="700" fill="#14532D">✓ Verified</text>
        <text x="820" y="108" text-anchor="middle" font-size="11" fill="#16A34A">sig valid · profile trusted</text>
        <text x="820" y="120" text-anchor="middle" font-size="11" fill="#16A34A">UDID/cert match · app launches</text>
        <circle cx="875" cy="88" r="5" fill="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="1.5s" repeatCount="indefinite"></animate></circle>
      </svg>

### Verification Steps on Device

-   Signature valid (public key in cert matches hash)
-   Certificate issued by trusted Apple CA
-   Profile not expired
-   Device UDID in profile (Dev/AdHoc) or enterprise entitlement
-   App ID matches bundle identifier
-   Entitlements match what profile grants

### CI / Jenkins Setup — Dedicated Keychain

<aside class="callout"><strong class="callout__title">Never unlock the login keychain on a shared Mac agent</strong><div class="callout__body">⚠  — it exposes every private key on the machine to concurrent builds. Always create a dedicated per-pipeline keychain and delete it after the build.</div></aside>

```bash
# Create a dedicated per-pipeline keychain (never use the login keychain on shared agents)
security create-keychain -p "$KEYCHAIN_PASS" ci-build.keychain-db
security set-keychain-settings -t 3600 -l ci-build.keychain-db
security list-keychains -d user -s ci-build.keychain-db $(security list-keychains -d user | tr -d '"')

# Import certificate — inject P12 as base64 env var in CI
echo "$CERT_P12_BASE64" | base64 --decode > /tmp/cert.p12
security import /tmp/cert.p12 -k ci-build.keychain-db -P "$P12_PASS" \
  -T /usr/bin/codesign -T /usr/bin/security

# CRITICAL: without this call, codesign silently fails with
# "User interaction is not allowed" on headless agents (macOS 12+)
security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s -k "$KEYCHAIN_PASS" ci-build.keychain-db

# Always clean up after build
security delete-keychain ci-build.keychain-db
```

-   Copy `.mobileprovision` to `~/Library/MobileDevice/Provisioning Profiles/`
-   Set `CODE_SIGN_IDENTITY` + `PROVISIONING_PROFILE_SPECIFIER`
-   Or use Fastlane match for centralized cert management

### Fastlane Match

Stores all certs and profiles encrypted in a git repo or S3 bucket. All CI agents run `match appstore` to sync — always the latest valid cert+profile pair.

```bash
fastlane match appstore
fastlane match enterprise
fastlane match adhoc
```

## CI Keychain Lifecycle — Headless macOS Signing

On a headless CI agent (no logged-in user session), macOS has no accessible login keychain for `codesign`. You must create a dedicated keychain, populate it with the certificate and private key, grant programmatic access without any UI prompt, use it for signing, and destroy it. Every build gets its own isolated keychain that exists only for the duration of that build.

Login Keychain (Dangerous) vs Dedicated Per-Build Keychain (Safe)

<svg viewBox="0 0 900 178" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-kc-cmp">
        <defs></defs>
        <rect width="900" height="178" fill="#F8FAFC"></rect>
        <rect x="0" y="0" width="438" height="178" rx="0" fill="#FFF5F5"></rect>
        <text x="219" y="20" text-anchor="middle" font-size="12" font-weight="700" fill="#DC2626">⚠ Login Keychain — Never on Shared CI Agents</text>
        <rect x="22"  y="32" width="72" height="26" rx="5" fill="#FECACA" stroke="#DC2626" stroke-width="1.5" style="animation:kc-stg .35s .1s ease both"></rect>
        <text x="58"  y="49" text-anchor="middle" font-size="11" font-weight="600" fill="#991B1B">Build A</text>
        <rect x="112" y="32" width="72" height="26" rx="5" fill="#FECACA" stroke="#DC2626" stroke-width="1.5" style="animation:kc-stg .35s .2s ease both"></rect>
        <text x="148" y="49" text-anchor="middle" font-size="11" font-weight="600" fill="#991B1B">Build B</text>
        <rect x="202" y="32" width="72" height="26" rx="5" fill="#FECACA" stroke="#DC2626" stroke-width="1.5" style="animation:kc-stg .35s .3s ease both"></rect>
        <text x="238" y="49" text-anchor="middle" font-size="11" font-weight="600" fill="#991B1B">Build C</text>
        <line x1="58"  y1="58" x2="148" y2="96" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="4,3"></line>
        <line x1="148" y1="58" x2="148" y2="96" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="4,3"></line>
        <line x1="238" y1="58" x2="158" y2="96" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="4,3"></line>
        <circle r="3.5" fill="#DC2626" opacity=".85"><animateMotion dur="2s" repeatCount="indefinite" begin="0s"   path="M58,58 L148,96"></animateMotion></circle>
        <circle r="3.5" fill="#DC2626" opacity=".85"><animateMotion dur="2s" repeatCount="indefinite" begin=".67s" path="M148,58 L148,96"></animateMotion></circle>
        <circle r="3.5" fill="#DC2626" opacity=".85"><animateMotion dur="2s" repeatCount="indefinite" begin="1.33s" path="M238,58 L158,96"></animateMotion></circle>
        <rect x="78" y="96" width="140" height="50" rx="8" fill="#FEE2E2" stroke="#DC2626" stroke-width="2" style="animation:kc-stg .35s .4s ease both"></rect>
        <text x="148" y="116" text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">login.keychain-db</text>
        <text x="148" y="129" text-anchor="middle" font-size="10" fill="#DC2626">ALL team private keys exposed</text>
        <text x="148" y="141" text-anchor="middle" font-size="10" fill="#DC2626">to every concurrent build</text>
        <text x="340" y="102" text-anchor="middle" font-size="38" fill="#DC2626" opacity=".7">✕</text>
        <text x="340" y="136" text-anchor="middle" font-size="11" font-weight="600" fill="#DC2626">Zero isolation</text>
        <text x="340" y="150" text-anchor="middle" font-size="10" fill="#991B1B">Concurrent builds share all</text>
        <text x="340" y="163" text-anchor="middle" font-size="10" fill="#991B1B">signing keys simultaneously</text>
        <line x1="450" y1="8" x2="450" y2="170" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="5,4"></line>
        <rect x="462" y="0" width="438" height="178" rx="0" fill="#F0FDF4"></rect>
        <text x="681" y="20" text-anchor="middle" font-size="12" font-weight="700" fill="#16A34A">✓ Dedicated Per-Build Keychain</text>
        <rect x="470" y="30" width="60" height="24" rx="5" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5" style="animation:kc-stg .35s .1s ease both"></rect>
        <text x="500" y="45" text-anchor="middle" font-size="10" font-weight="600" fill="#166534">Build A</text>
        <line x1="500" y1="54" x2="500" y2="70" stroke="#16A34A" stroke-width="1.5"></line>
        <rect x="468" y="70" width="64" height="22" rx="4" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.5" style="animation:kc-stg .35s .2s ease both"></rect>
        <text x="500" y="84" text-anchor="middle" font-size="9" fill="#14532D">ci-a.keychain</text>
        <line x1="500" y1="92" x2="500" y2="104" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="3,2"></line>
        <text x="500" y="116" text-anchor="middle" font-size="9" fill="#DC2626">deleted ✕</text>
        <circle r="3" fill="#16A34A" opacity=".8"><animateMotion dur="1.8s" repeatCount="indefinite" begin="0s"   path="M500,54 V104"></animateMotion></circle>
        <rect x="614" y="30" width="60" height="24" rx="5" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5" style="animation:kc-stg .35s .3s ease both"></rect>
        <text x="644" y="45" text-anchor="middle" font-size="10" font-weight="600" fill="#166534">Build B</text>
        <line x1="644" y1="54" x2="644" y2="70" stroke="#16A34A" stroke-width="1.5"></line>
        <rect x="612" y="70" width="64" height="22" rx="4" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.5" style="animation:kc-stg .35s .4s ease both"></rect>
        <text x="644" y="84" text-anchor="middle" font-size="9" fill="#14532D">ci-b.keychain</text>
        <line x1="644" y1="92" x2="644" y2="104" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="3,2"></line>
        <text x="644" y="116" text-anchor="middle" font-size="9" fill="#DC2626">deleted ✕</text>
        <circle r="3" fill="#16A34A" opacity=".8"><animateMotion dur="1.8s" repeatCount="indefinite" begin=".6s"  path="M644,54 V104"></animateMotion></circle>
        <rect x="758" y="30" width="60" height="24" rx="5" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5" style="animation:kc-stg .35s .5s ease both"></rect>
        <text x="788" y="45" text-anchor="middle" font-size="10" font-weight="600" fill="#166534">Build C</text>
        <line x1="788" y1="54" x2="788" y2="70" stroke="#16A34A" stroke-width="1.5"></line>
        <rect x="756" y="70" width="64" height="22" rx="4" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.5" style="animation:kc-stg .35s .6s ease both"></rect>
        <text x="788" y="84" text-anchor="middle" font-size="9" fill="#14532D">ci-c.keychain</text>
        <line x1="788" y1="92" x2="788" y2="104" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="3,2"></line>
        <text x="788" y="116" text-anchor="middle" font-size="9" fill="#DC2626">deleted ✕</text>
        <circle r="3" fill="#16A34A" opacity=".8"><animateMotion dur="1.8s" repeatCount="indefinite" begin="1.2s" path="M788,54 V104"></animateMotion></circle>
        <text x="681" y="140" text-anchor="middle" font-size="28" fill="#16A34A" opacity=".85">✓</text>
        <text x="681" y="158" text-anchor="middle" font-size="11" font-weight="600" fill="#16A34A">Isolated · temporary · auditable</text>
        <text x="681" y="170" text-anchor="middle" font-size="10" fill="#4B5563">Each build sees only its own keys</text>
      </svg>

CI Keychain 7-Step Lifecycle — Animated Flow

<svg viewBox="0 0 960 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svg-kc-lc">
        <defs>
          <marker id="ah-kc-b" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#2563EB"></path></marker>
          <marker id="ah-kc-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#D97706"></path></marker>
          <marker id="ah-kc-g" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#16A34A"></path></marker>
          <marker id="ah-kc-r" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#DC2626"></path></marker>
          <path id="kc-main-path" d="M30,62 H930"></path>
        </defs>
        <rect width="960" height="200" fill="#F8FAFC"></rect>
        <rect x="30"  y="0" width="372" height="24" rx="4" fill="#DBEAFE" opacity=".75"></rect>
        <text x="216" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="#1D4ED8">① Create &amp; Setup Phase</text>
        <rect x="426" y="0" width="240" height="24" rx="4" fill="#FEF3C7" opacity=".75"></rect>
        <text x="546" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="#B45309">② Security Phase</text>
        <rect x="690" y="0" width="108" height="24" rx="4" fill="#DCFCE7" opacity=".75"></rect>
        <text x="744" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="#15803D">③ Sign</text>
        <rect x="822" y="0" width="108" height="24" rx="4" fill="#FEE2E2" opacity=".75"></rect>
        <text x="876" y="16" text-anchor="middle" font-size="11" font-weight="600" fill="#991B1B">④ Cleanup</text>
        <rect x="30" y="28" width="108" height="66" rx="8" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5" style="animation:kc-pop .4s .1s ease both"></rect>
        <text x="84" y="48"  text-anchor="middle" font-size="11" font-weight="700" fill="#1E3A8A">① Create</text>
        <text x="84" y="61"  text-anchor="middle" font-size="10" fill="#2563EB">Keychain File</text>
        <text x="84" y="75"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">create-keychain</text>
        <text x="84" y="87"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">-p $KEYCHAIN_PASS</text>
        <line x1="138" y1="61" x2="156" y2="61" stroke="#2563EB" stroke-width="1.5" marker-end="url(#ah-kc-b)"></line>
        <rect x="162" y="28" width="108" height="66" rx="8" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5" style="animation:kc-pop .4s .2s ease both"></rect>
        <text x="216" y="48"  text-anchor="middle" font-size="11" font-weight="700" fill="#1E3A8A">② Configure</text>
        <text x="216" y="61"  text-anchor="middle" font-size="10" fill="#2563EB">Auto-Lock 3600s</text>
        <text x="216" y="75"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">set-keychain-settings</text>
        <text x="216" y="87"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">-t 3600 -l</text>
        <line x1="270" y1="61" x2="288" y2="61" stroke="#2563EB" stroke-width="1.5" marker-end="url(#ah-kc-b)"></line>
        <rect x="294" y="28" width="108" height="66" rx="8" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5" style="animation:kc-pop .4s .3s ease both"></rect>
        <text x="348" y="48"  text-anchor="middle" font-size="11" font-weight="700" fill="#1E3A8A">③ Register</text>
        <text x="348" y="61"  text-anchor="middle" font-size="10" fill="#2563EB">Search List</text>
        <text x="348" y="75"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">list-keychains</text>
        <text x="348" y="87"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">-d user -s</text>
        <line x1="402" y1="61" x2="420" y2="61" stroke="#D97706" stroke-width="1.5" marker-end="url(#ah-kc-a)"></line>
        <rect x="426" y="28" width="108" height="66" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5" style="animation:kc-pop .4s .4s ease both"></rect>
        <text x="480" y="48"  text-anchor="middle" font-size="11" font-weight="700" fill="#78350F">④ Import</text>
        <text x="480" y="61"  text-anchor="middle" font-size="10" fill="#D97706">Certificate + Key</text>
        <text x="480" y="75"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">base64 decode</text>
        <text x="480" y="87"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">security import</text>
        <line x1="534" y1="61" x2="552" y2="61" stroke="#D97706" stroke-width="1.5" marker-end="url(#ah-kc-a)"></line>
        <rect x="558" y="28" width="108" height="66" rx="8" fill="#FFFBEB" stroke="#DC2626" stroke-width="2" style="animation:kc-pop .4s .5s ease both"></rect>
        <text x="612" y="45"  text-anchor="middle" font-size="10" font-weight="700" fill="#DC2626">⑤ Authorize</text>
        <text x="612" y="57"  text-anchor="middle" font-size="9"  fill="#DC2626">set-key-partition-list</text>
        <text x="612" y="69"  text-anchor="middle" font-size="9"  fill="#DC2626">-S apple-tool:,apple:</text>
        <text x="612" y="81"  text-anchor="middle" font-size="9"  fill="#991B1B" font-weight="700">⚠ CRITICAL</text>
        <text x="612" y="91"  text-anchor="middle" font-size="8"  fill="#991B1B">no UI prompt</text>
        <line x1="666" y1="61" x2="684" y2="61" stroke="#16A34A" stroke-width="1.5" marker-end="url(#ah-kc-g)"></line>
        <rect x="690" y="28" width="108" height="66" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="2" style="animation:kc-pop .4s .6s ease both"></rect>
        <text x="744" y="48"  text-anchor="middle" font-size="11" font-weight="700" fill="#14532D">⑥ Sign</text>
        <text x="744" y="61"  text-anchor="middle" font-size="10" fill="#16A34A">xcodebuild</text>
        <text x="744" y="75"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">codesign reads</text>
        <text x="744" y="87"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">from keychain</text>
        <line x1="798" y1="61" x2="816" y2="61" stroke="#DC2626" stroke-width="1.5" marker-end="url(#ah-kc-r)"></line>
        <rect x="822" y="28" width="108" height="66" rx="8" fill="#FEF2F2" stroke="#FECACA" stroke-width="2" style="animation:kc-pop .4s .7s ease both"></rect>
        <text x="876" y="48"  text-anchor="middle" font-size="11" font-weight="700" fill="#991B1B">⑦ Delete</text>
        <text x="876" y="61"  text-anchor="middle" font-size="10" fill="#DC2626">Keychain</text>
        <text x="876" y="75"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">delete-keychain</text>
        <text x="876" y="87"  text-anchor="middle" font-size="9"  fill="#4B5563" font-family="'SF Mono',monospace">post { always }</text>
        <text x="480" y="106" text-anchor="middle" font-size="10" fill="#D97706">Inject $CERT_P12_BASE64</text>
        <text x="480" y="118" text-anchor="middle" font-size="10" fill="#D97706">from CI secret store</text>
        <text x="612" y="106" text-anchor="middle" font-size="10" fill="#DC2626" font-weight="600">Without this → codesign fails</text>
        <text x="612" y="118" text-anchor="middle" font-size="10" fill="#DC2626">"User interaction not allowed"</text>
        <text x="612" y="130" text-anchor="middle" font-size="10" fill="#DC2626">on macOS 12+ headless agents</text>
        <text x="876" y="106" text-anchor="middle" font-size="10" fill="#DC2626">Always run in post/finally</text>
        <text x="876" y="118" text-anchor="middle" font-size="10" fill="#DC2626">— even on build failure</text>
        <circle r="5" fill="#2563EB" opacity=".8"><animateMotion dur="5s" repeatCount="indefinite" begin="0s">   <mpath href="#kc-main-path"></mpath></animateMotion></circle>
        <circle r="5" fill="#D97706" opacity=".8"><animateMotion dur="5s" repeatCount="indefinite" begin="1.67s"><mpath href="#kc-main-path"></mpath></animateMotion></circle>
        <circle r="5" fill="#16A34A" opacity=".8"><animateMotion dur="5s" repeatCount="indefinite" begin="3.33s"><mpath href="#kc-main-path"></mpath></animateMotion></circle>
      </svg>

<aside class="callout"><strong class="callout__title">⑤ The single most common headless CI signing failure:</strong><div class="callout__body">omitting <code>security set-key-partition-list</code>. Without it, <code>codesign</code> silently fails with <em>"User interaction is not allowed"</em> on every macOS 12+ agent. This call grants <code>apple-tool:</code> and <code>codesign:</code> partition access so the private key can be used without triggering a UI passphrase dialog.</div></aside>

<aside class="callout"><strong class="callout__title">⑦ Always delete the keychain in post { always { } }:</strong><div class="callout__body">if the build crashes mid-sign, a leaked keychain stays on disk unlocked until it times out (3600s). A <code>security delete-keychain</code> in the post block removes it immediately regardless of build outcome.</div></aside>

## Inspecting & Verifying Signatures

```bash
# Inspect a signed app binary
codesign -dv --verbose=4 MyApp.app

# Deep verification of the app bundle
codesign --verify --deep --strict MyApp.app
echo $?  # 0 = valid, non-zero = invalid

# Check which certificate signed the binary
codesign -dv MyApp.app 2>&1 | grep "Authority="

# Verify provisioning profile is embedded
cat MyApp.app/embedded.mobileprovision | \
  security cms -D | grep -A1 -E "(Name|ExpirationDate|TeamName)"

# Check entitlements baked into the binary
codesign -d --entitlements - MyApp.app

# Common output meanings
# "valid on disk" — file not tampered
# "satisfies its Designated Requirement" — cert chain valid
# "sealed resource is missing or invalid" — file added/changed after signing
```

## Expiry Monitoring

**Why it matters:** Distribution certificates expire in 1 year. Provisioning profiles expire in 1 year (paid account) or 7 days (free). A Friday cert expiry with no alert blocks releases until Monday.

```bash
# Check certificate expiry (run on CI agent)
security find-certificate -a -p | \
  openssl x509 -noout -dates 2>/dev/null | \
  grep notAfter

# Check a provisioning profile expiry
security cms -D -i ~/Library/MobileDevice/Provisioning\ Profiles/*.mobileprovision \
  | grep -A1 ExpirationDate

# Days remaining for a cert (add to a cron job)
EXPIRY=$(security find-certificate -c "iPhone Distribution" -p | \
  openssl x509 -noout -enddate | cut -d= -f2)
DAYS=$(( ($(date -jf "%b %d %T %Y %Z" "$EXPIRY" +%s) - $(date +%s)) / 86400 ))
echo "Certificate expires in $DAYS days"
[ $DAYS -lt 30 ] && echo "WARNING: cert expires soon" && exit 1
```

<aside class="callout"><strong class="callout__title">Recommended:</strong><div class="callout__body">⚠  Add a scheduled Jenkins/CI job that runs this check daily and alerts at 30 days and 7 days before expiry. Treat a cert expiry like an on-call alert — it will block your release pipeline without warning.</div></aside>

## Document Notes & Known Limitations

Reference checklist for editors — all findings addressed in this document.

### Deprecated/Removed APIs

-   `altool` removed Xcode 16 → replaced with App Store Connect API / Fastlane deliver
-   Bitcode deprecated Xcode 14, removed Xcode 15 → all Bitcode keys silently ignored in new builds
-   `pod repo update` for CDN refresh is incorrect since CocoaPods 1.8 (CDN is lazy-fetched on demand)
-   `jarsigner` deprecated for APK signing → use `apksigner` for APK v2+ signing scheme
-   `R.java` — AGP 8.0+ uses non-transitive R classes by default (`android.nonTransitiveRClass=true`)

### Technical Clarifications

-   Molinillo is a conflict-driven backtracking resolver, not a SAT solver
-   D8 = debug DEX compiler for all builds; R8 = release-only optimizer that subsumes D8 (shrink + obfuscate)
-   WWDR CA: G6 is current (G3 expired Dec 2023)
-   Ad Hoc device limit: 100 per device type per account, reset window once per year (not freely cycled)
-   Swift compilation: whole-module compilation, not per-file per core
-   ART replaced Dalvik in Android 5.0; .dex format is ART-compatible, not Dalvik
-   Apple Distribution cert validity: 1 year; Provisioning profiles: 1 year (paid), 7 days (free)
-   App Store AND Enterprise profiles have empty device lists; only Dev/AdHoc have UDID lists

### CI/CD Operational Gaps (addressed in this document)

-   Dedicated per-pipeline keychain required (never login keychain on shared agents)
-   `security set-key-partition-list` is mandatory for headless codesign on macOS 12+
-   Android keystore must never be committed to source control — use base64 env var injection
-   Cert/profile expiry monitoring is required for production pipelines
-   Gradle `--no-daemon` must be used in CI
-   DerivedData/Gradle cache cleanup must be scheduled as cron jobs
-   dSYM upload to crash reporting platform must be part of CI pipeline

### Content Added Based on Review

-   SPM (Swift Package Manager) section added (Tab 3)
-   dSYM workflow section added (Tab 3)
-   `codesign --verify` inspection commands added (Tab 4)
-   `bundletool` usage for AAB local testing added (Tab 2)
-   Build cache strategy (DerivedData, CocoaPods, Gradle) added (Tab 3)
-   Disk cleanup cron job guidance added (Tab 3)
-   Gradle dependency locking (`gradle.lockfile`) added (Tab 2)
-   Jenkins pipeline-as-code examples added — iOS (Tab 3) and Android (Tab 2)
-   Cert/profile expiry monitoring commands added (Tab 4)
-   ARIA accessibility (tab roles, SVG titles, prefers-reduced-motion) added throughout
-   Copy-to-clipboard on all code blocks added
