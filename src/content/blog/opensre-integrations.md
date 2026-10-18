---
title: "OpenSRE Integrations — Complete Visual Guide"
date: 2026-10-06
description: "How to add an OpenSRE vendor integration the agent can actually call: the eight-layer anatomy, the build order, credential tiers, tool discovery, and the rules that make it reviewable. Worked example: NATS."
tags: [opensre, devops, integrations]
cover: "assets/images/covers/opensre-integrations.svg"
draft: false
---

Every layer explained with animated diagrams · worked example: the NATS integration · 92 vendor packages, 175 vendor tool packages

## Anatomy · Call Path · Layers

### What An Integration Actually Is

An OpenSRE integration is not a client library. It is a **capability surface for an LLM**: a normalized config object, one client, one verification function, and a set of narrowly-scoped tools the agent can call during an incident. Everything a vendor does _for_ the agent lives under one directory — `integrations/<vendor>/` — including that vendor's tools.

### 92

vendor packages under `integrations/`

### 76

of them ship a `tools/` sub-package

### 175

vendor tool packages (`*_tool`)

### 7

skill cards under `integrations/`

<aside class="callout"><strong class="callout__title">Read-only is the default contract.</strong><div class="callout__body">An integration's client should do exactly one kind of network call — <code>GET</code>. Nothing publishes, consumes, mutates, or restarts. When a vendor genuinely needs a write path, that is a separate concern with its own approval surface, not a branch inside a diagnostic tool.</div></aside>

The runtime call path — one tool invocation, end to end

<svg viewBox="0 0 900 340" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="340" fill="#F8FAFC"></rect>
      <rect x="24" y="90" width="136" height="92" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="92" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Model</text>
      <text x="92" y="136" text-anchor="middle" font-size="9.5" fill="#4B5563">picks a tool by</text>
      <text x="92" y="150" text-anchor="middle" font-size="9.5" fill="#4B5563">name + description</text>
      <rect x="44" y="160" width="96" height="14" rx="7" fill="#dbeafe"></rect>
      <text x="92" y="171" text-anchor="middle" font-size="8.5" fill="#1d4ed8" font-weight="600">Chat surface only</text>
      <rect x="200" y="78" width="136" height="104" rx="10" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="268" y="108" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">Tool</text>
      <text x="268" y="126" text-anchor="middle" font-size="9.5" fill="#a4bbfc">tools/&lt;vendor&gt;_tool/</text>
      <text x="268" y="144" text-anchor="middle" font-size="9" fill="#818cf8">builds config,</text>
      <text x="268" y="158" text-anchor="middle" font-size="9" fill="#818cf8">maps evidence</text>
      <circle cx="268" cy="86" r="4" fill="#444ce7"><animate attributeName="opacity" values="1;.25;1" dur="2.4s" repeatCount="indefinite"></animate></circle>
      <rect x="376" y="90" width="136" height="92" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="444" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Diagnostics</text>
      <text x="444" y="136" text-anchor="middle" font-size="9.5" fill="#4B5563">sort + state</text>
      <text x="444" y="150" text-anchor="middle" font-size="9.5" fill="#4B5563">allowlists, caps</text>
      <rect x="552" y="90" width="136" height="92" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="620" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Client</text>
      <text x="620" y="136" text-anchor="middle" font-size="9.5" fill="#4B5563">one GET, typed</text>
      <text x="620" y="150" text-anchor="middle" font-size="9.5" fill="#4B5563">error kinds, no raise</text>
      <rect x="728" y="90" width="136" height="92" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="796" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Vendor</text>
      <text x="796" y="136" text-anchor="middle" font-size="9.5" fill="#4B5563">HTTP endpoint,</text>
      <text x="796" y="150" text-anchor="middle" font-size="9.5" fill="#4B5563">e.g. :8222 /varz</text>
      <defs>
        <marker id="fwd" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="#444ce7"></polygon>
        </marker>
      </defs>
      <path d="M164 136 L194 136" fill="none" stroke="#444ce7" stroke-width="1.5" marker-end="url(#fwd)"></path>
      <path d="M340 136 L370 136" fill="none" stroke="#444ce7" stroke-width="1.5" marker-end="url(#fwd)"></path>
      <path d="M516 136 L546 136" fill="none" stroke="#444ce7" stroke-width="1.5" marker-end="url(#fwd)"></path>
      <path d="M692 136 L722 136" fill="none" stroke="#444ce7" stroke-width="1.5" marker-end="url(#fwd)"></path>
      <circle r="5" fill="#444ce7"><animateMotion dur="1.6s" repeatCount="indefinite" path="M164,136 L194,136"></animateMotion></circle>
      <circle r="5" fill="#444ce7"><animateMotion dur="1.6s" repeatCount="indefinite" begin=".4s" path="M340,136 L370,136"></animateMotion></circle>
      <circle r="5" fill="#444ce7"><animateMotion dur="1.6s" repeatCount="indefinite" begin=".8s" path="M516,136 L546,136"></animateMotion></circle>
      <circle r="5" fill="#444ce7"><animateMotion dur="1.6s" repeatCount="indefinite" begin="1.2s" path="M692,136 L722,136"></animateMotion></circle>
      <path d="M796 186 L796 246 Q796 258 784 258 L104 258 Q92 258 92 246 L92 188" fill="none" stroke="#16A34A" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#ret)"></path>
      <defs>
        <marker id="ret" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="#16A34A"></polygon>
        </marker>
      </defs>
      <circle r="4" fill="#16A34A"><animateMotion dur="3.2s" repeatCount="indefinite" path="M796,186 L796,246 Q796,258 784,258 L104,258 Q92,258 92,246 L92,188"></animateMotion></circle>
      <text x="444" y="278" text-anchor="middle" font-size="9.5" fill="#16A34A" font-weight="600">Normalised result + one evidence citation the agent can quote</text>
      <text x="24" y="34" font-size="10" fill="#4B5563" font-weight="600">Forward: model → tool → vendor. Return: shaped data plus evidence.</text>
      <text x="24" y="314" font-size="9.5" fill="#4B5563">Every hop is a separate module so each can be tested without the layer above it.</text>
    </svg>

The eight files you write — and which layer each one owns

<svg viewBox="0 0 900 396" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="396" fill="#F8FAFC"></rect>
      <text x="132" y="34" text-anchor="middle" font-size="10" fill="#4B5563" font-weight="700" letter-spacing="1">BUILD ORDER</text>
      <text x="648" y="34" text-anchor="middle" font-size="10" fill="#4B5563" font-weight="700" letter-spacing="1">FILE</text>
      <g>
        <rect x="24" y="48" width="136" height="34" rx="8" fill="#1a1a3e" stroke="#444ce7" stroke-width="1.5"></rect>
        <text x="92" y="70" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">1 · Config</text>
        <rect x="24" y="92" width="136" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="92" y="114" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">2 · Client</text>
        <rect x="24" y="136" width="136" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="92" y="158" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">3 · Shaping</text>
        <rect x="24" y="180" width="136" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="92" y="202" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">4 · Query</text>
        <rect x="24" y="224" width="136" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="92" y="246" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">5 · Verifier</text>
        <rect x="24" y="268" width="136" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="92" y="290" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">6 · Setup</text>
        <rect x="24" y="312" width="136" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="92" y="334" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">7 · Tools</text>
      </g>
      <path d="M92 82 L92 92" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M92 126 L92 136" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M92 170 L92 180" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M92 214 L92 224" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M92 258 L92 268" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M92 302 L92 312" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <circle r="4" fill="#444ce7">
        <animateMotion dur="4s" repeatCount="indefinite" path="M92,82 L92,92 M92,126 L92,136 M92,170 L92,180 M92,214 L92,224 M92,258 L92,268 M92,302 L92,312"></animateMotion>
      </circle>
      <rect x="248" y="48" width="628" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="264" y="64" font-size="11" font-family="monospace" fill="#444ce7" font-weight="600">config.py</text>
      <text x="264" y="76" font-size="9" fill="#4B5563">normalised model, validators, classify() — the single definition of "configured"</text>
      <rect x="798" y="56" width="66" height="18" rx="9" fill="#ede9fe"></rect>
      <text x="831" y="69" text-anchor="middle" font-size="8.5" fill="#6d28d9" font-weight="700">FACADE +</text>
      <rect x="248" y="92" width="628" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="264" y="108" font-size="11" font-family="monospace" fill="#444ce7" font-weight="600">client.py</text>
      <text x="264" y="120" font-size="9" fill="#4B5563">one transport, typed error kinds, never raises on expected failures</text>
      <rect x="248" y="136" width="628" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="264" y="152" font-size="11" font-family="monospace" fill="#444ce7" font-weight="600">monitoring.py</text>
      <text x="264" y="164" font-size="9" fill="#4B5563">pure shape_* / summarize_* functions: vendor JSON → typed dicts</text>
      <rect x="248" y="180" width="628" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="264" y="196" font-size="11" font-family="monospace" fill="#444ce7" font-weight="600">diagnostics.py</text>
      <text x="264" y="208" font-size="9" fill="#4B5563">get_* per endpoint, with allowlists and result caps</text>
      <rect x="248" y="224" width="628" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="264" y="240" font-size="11" font-family="monospace" fill="#444ce7" font-weight="600">validation.py + verifier.py</text>
      <text x="264" y="252" font-size="9" fill="#4B5563">cheap reachability probe, registered so setup and health agree</text>
      <rect x="248" y="268" width="628" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="264" y="284" font-size="11" font-family="monospace" fill="#444ce7" font-weight="600">setup.py</text>
      <text x="264" y="296" font-size="9" fill="#4B5563">field declarations only; persistence and tiering come from shared setup_flow</text>
      <rect x="248" y="312" width="628" height="34" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="264" y="328" font-size="11" font-family="monospace" fill="#444ce7" font-weight="600">tools/&lt;vendor&gt;_tool/__init__.py</text>
      <text x="264" y="340" font-size="9" fill="#4B5563">one package per tool — metadata, availability, injected params, evidence</text>
      <rect x="798" y="320" width="66" height="18" rx="9" fill="#dbeafe"></rect>
      <text x="831" y="333" text-anchor="middle" font-size="8.5" fill="#1d4ed8" font-weight="700">FACADE +</text>
      <text x="248" y="374" font-size="9.5" fill="#4B5563">Env-var names live outside the package, under config/constants/ — one home for all static names.</text>
    </svg>

## Layer contract

⚙

Config normalizes, it does not fetch

Stripping, scheme checks, numeric coercion and defaults live in one pydantic model. A password is deliberately exempt from stripping — whitespace is valid credential content.

↯

Client owns transport and error taxonomy

Expected failures (auth, 404, wrong port, non-JSON) return typed errors the agent can read. Nothing raises into the model loop.

⇄

Shaping is pure

No I/O. That is why a 49-file fixture suite can cover the parsing layer with no server running.

## Worked example — NATS

A read-only HTTP integration against the nats-server monitoring port (default 8222). Six tools, one environment variable that is actually required.

| env | NATS_MONITOR_URL — required, scheme + port checked |
| --- | --- |
| secret | NATS_MONITOR_USERNAME / NATS_MONITOR_PASSWORD — only used when a proxy fronts the port |
| tools | server status, connections, subscriptions, JetStream streams, JetStream consumers, cluster status |
| tests | 115 test functions across 10 files, 49 fixture payloads |
| failure modes | client port vs monitoring port detected from the protocol error |

<aside class="callout"><strong class="callout__title">no authentication by design</strong><div class="callout__body">The monitoring port has . Keep it on a private network or behind a proxy — never published.</div></aside>

## Where a new tool belongs

Placement is decided by the tool's _purpose_, not by convenience or file size. Does the tool's reason to exist depend on one specific vendor?

Single Vendor

A Datadog query, a GitHub mutation, a NATS stream lookup → `integrations/<vendor>/tools/`. The default case.

No Vendor

Local process introspection, sandboxed execution, guidance retrieval → `tools/system/`.

Two Or More

Logic that genuinely reads from one vendor and hands off to another → `tools/cross_vendor/`. Narrow.

Presentation Only

Code two surfaces both need (CLI + REPL) → `surfaces/shared/`. A different axis entirely.

## Build Order · Code · Wiring

### Build Order

Write bottom-up. Each step is independently testable, and each step is reviewable on its own. The order matters for one reason: if you start at the tool, you will invent a config shape and then have to retrofit it into the credential contract.

1

Declare the env-var names under config/constants/

Before any feature module exists. Shared static names live in a leaf module so any layer can import them without a cycle — never inline a name in two places.

2

Write config.py — model, validators, classify()

The model is strict: unknown fields are rejected, so a typo in an operator's .env fails loudly at startup instead of silently disabling a tool. Secrets resolve through the shared credential helper, never a bare env read.

3

Write client.py — one transport, typed errors

Build the HTTP client from the config (timeout, TLS verification, basic auth only when credentials exist). Then the fetch helper that turns expected failures into a small enum of causes the agent can reason about.

4

Write the pure shaping module

Vendor payloads arrive with Go-style durations, raw byte counts, and names that change between versions. Convert once, in one place, with no I/O — this is the layer your fixtures test.

5

Write the query layer with allowlists

One function per endpoint. Sort keys, sort directions and state filters are enumerated constants, not free strings — a model cannot invent a parameter the vendor does not support. Result sets are capped on purpose.

6

Write the verifier and register it

Two cheap calls — a health endpoint then a detail endpoint — and one human-readable detail line. Cross-field rules (either/or, all-or-nothing) belong here, not in a setup-only check, so setup and `integrations verify` can never disagree about what "configured" means.

7

Declare the setup spec — fields only

Prompt text, defaults, and which env var each field writes. The credential tier is derived from the env-var name, so a field never chooses its own tier and cannot write a password into a plain-text config file.

8

Write the tools — one package each

Narrow purpose, a description that names the situations it answers, availability gated on real configuration, and credentials declared as injected params rather than model arguments.

9

Wire discovery, catalog, docs and tests

Four separate registrations — each one is a place where a forgotten line makes your work invisible rather than broken. Tab 3 is entirely about these.

## The config model

Normalize at the edge; downstream layers assume clean values. Note the password exemption and the scheme guard.

```bash
# integrations/<vendor>/config.py
class VendorConfig(StrictConfigModel):
    """Normalized <vendor> connection settings."""

    url: str = ""
    username: str = ""
    password: str = ""
    timeout_seconds: int = Field(default=10, gt=0)

    @field_validator("*", mode="before")
    @classmethod
    def _strip_strings(cls, value, info):
        # whitespace is valid credential content — never strip a password
        return value if info.field_name == "password" else value

    @field_validator("url", mode="before")
    @classmethod
    def _normalize_url(cls, value) -> str:
        raw = str(value or "").strip().rstrip("/")
        if raw and not raw.startswith(("http://", "https://")):
            raise ValueError("must start with http:// or https://")
        return raw

    @property
    def is_configured(self) -> bool:
        return bool(self.url)

def classify(credentials: dict, record_id: str):
    """Normalize a store record; return (config, service) or (None, None)."""
```

## The client — expected failures become data

The single most valuable pattern in the integration. A wrong-port mistake, a proxy 401, a JSON parse miss, an upstream 500: each gets its own machine-readable kind, because the agent's next move depends on which one it was. The NATS client detects "you pointed me at the client port instead of the monitoring port" from a protocol error rather than from guessing at text.

```python
class FetchErrorKind(StrEnum):
    TRANSPORT  = "transport"
    WRONG_PORT = "wrong_port"
    AUTH       = "auth"
    NOT_FOUND  = "not_found"
    HTTP       = "http"
    BODY       = "body"

def get_json(client, config, path, *, accept=(HTTPStatus.OK,)):
    """GET a monitoring path; never raises for HTTP or transport problems."""
    try:
        response = client.get(path)
    except httpx.RemoteProtocolError:
        return None, FetchError(
            kind=FetchErrorKind.WRONG_PORT,
            message=("did not answer HTTP; the URL probably points at "
                     "the client port instead of the monitoring port"),
        )
    except httpx.RequestError as err:
        return None, FetchError(FetchErrorKind.TRANSPORT, str(err))

    if response.status_code in accept:
        try:
            return FetchResult(response.status_code, response.json()), None
        except ValueError:
            return None, FetchError(
                FetchErrorKind.BODY, "non-JSON body — wrong port or wrong service")
    return None, FetchError(FetchErrorKind.HTTP, "upstream error")
```

## The tool — what makes it agent-safe

Six declarations carry the whole contract. The last three are the ones people skip.

```python
@tool(
    name="get_<vendor>_server_status",
    description="Return one server's status from its monitoring endpoint: "
               "version, uptime, health result, connection counts against "
               "the limit, slow consumers, throughput, JetStream usage.",
    source="<vendor>",
    surfaces=(ToolSurface.CHAT,),
    use_cases=[
        "Checking whether a server is up and near its connection limit",
        "Seeing throughput plus memory during an incident",
    ],
    is_available=vendor_is_available,        # hidden when unconfigured
    injected_params=("url", "username", "password", "verify_ssl"),
    extract_params=vendor_extract_params,      # credentials come from resolved config
    evidence_mapper=_map_status,              # one quotable citation per call
)
def get_<vendor>_server_status(url: str, username: str = "",
                              password: str = "",
                              verify_ssl: bool = True) -> dict:
    """Return one server's status from its monitoring endpoint."""
    return get_server_status(VendorConfig(url=url, username=username,
                                        password=password, verify_ssl=verify_ssl))
```

<aside class="callout"><strong class="callout__title">Why the description matters more than the code.</strong><div class="callout__body">The model chooses a tool by reading its name and description. "Connection counts against the limit" tells it when to call this; a vague description makes it pick a neighbouring tool or improvise. Write the description as usage guidance, and keep <code>use_cases</code> phrased as situations, not as restatements of the name.</div></aside>

## Pure shaping

Where vendor JSON becomes something an LLM reads reliably. No I/O, which is exactly why it is cheap to test exhaustively.

```python
def parse_go_duration(value): # "1m52s" → 112.0
def ns_to_seconds(value): # 150877844740 → float secs

def shape_varz(payload) -> dict:
    """Normalize a /varz payload into typed fields."""
```

Units, byte counts and uptime strings get normalized exactly once, so no tool ever re-parses a raw vendor string.

## Query layer with caps

Sort keys and state filters are enumerated constants exported from the package. The model cannot invent a parameter the vendor will reject.

```bash
ALLOWED_CONNZ_SORT = (...)
ALLOWED_CONNZ_STATE = (...)
CLOSED_ONLY_SORTS = (...)
DEFAULT_CONNECTION_LIMIT = 50
MAX_CONNECTION_LIMIT = 200
```

Capping is not laziness — it is what keeps one call from flooding the agent's context window mid-incident. When you do truncate, say so in the payload.

## Tests: fixtures over mocks

Mock the transport boundary once, then drive the whole stack — config, catalog classification, tool, evidence mapper — from real-shaped payload files. The NATS suite has 49 of them, including deliberately invalid ones (an unsupported sort key, an unsupported state) so the allowlist rejections are pinned rather than assumed.

```bash
tests/integrations/test_<vendor>.py          # config, normalization, classify, validation
tests/tools/test_<vendor>_<endpoint>_tool.py  # one per tool
tests/tools/test_<vendor>_tools_port_injection.py # secrets do not leak through the schema
tests/e2e/<vendor>/test_<vendor>_e2e.py       # full pipeline, transport mocked
tests/integrations/<vendor>/fixtures/*.json    # realistic payloads, incl. negative cases
```

<aside class="callout"><div class="callout__body">A port-injection test is not optional in spirit even when it is easy to skip: it is the test that asserts the model-facing schema contains no credential fields and that injected values win over anything the model supplies.</div></aside>

## Rules · Secrets · Traps

### The Rules That Make It Reviewable

Every rule below exists because its absence produced a specific failure someone had to debug. They are not style preferences.

Credential resolution — two read tiers, one resolved truth

<svg viewBox="0 0 900 476" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="476" fill="#F8FAFC"></rect>
      <text x="132" y="34" text-anchor="middle" font-size="10" fill="#4B5563" font-weight="700" letter-spacing="1">READ IN PRIORITY ORDER</text>
      <text x="440" y="34" text-anchor="middle" font-size="10" fill="#4B5563" font-weight="700" letter-spacing="1">RESOLVE ONCE</text>
      <text x="768" y="34" text-anchor="middle" font-size="10" fill="#4B5563" font-weight="700" letter-spacing="1">AT EXECUTION</text>
      <rect x="24" y="64" width="216" height="76" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="40" y="88" font-size="12" font-weight="700" fill="#111827">1 · Process Env</text>
      <text x="40" y="106" font-size="9.5" fill="#4B5563">an exported var, or a line</text>
      <text x="40" y="122" font-size="9.5" fill="#4B5563">loaded from the project .env</text>
      <rect x="196" y="74" width="34" height="18" rx="9" fill="#dcfce7"></rect>
      <text x="213" y="87" text-anchor="middle" font-size="8" fill="#166534" font-weight="700">FIRST</text>
      <rect x="24" y="164" width="216" height="76" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="40" y="188" font-size="12" font-weight="700" fill="#111827">2 · Credentials File</text>
      <text x="40" y="206" font-size="9.5" fill="#4B5563">owner-only JSON under the</text>
      <text x="40" y="222" font-size="9.5" fill="#4B5563">agent home, read when env is empty</text>
      <rect x="24" y="264" width="216" height="76" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="5 4"></rect>
      <text x="40" y="288" font-size="12" font-weight="700" fill="#111827">No OS Keyring</text>
      <text x="40" y="306" font-size="9.5" fill="#4B5563">exactly two read tiers exist,</text>
      <text x="40" y="322" font-size="9.5" fill="#4B5563">and a switch drops to env only</text>
      <rect x="348" y="140" width="184" height="100" rx="10" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="440" y="172" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">Resolved Config</text>
      <text x="440" y="190" text-anchor="middle" font-size="9.5" fill="#a4bbfc">one object per vendor,</text>
      <text x="440" y="204" text-anchor="middle" font-size="9.5" fill="#a4bbfc">normalized, secret-aware</text>
      <rect x="392" y="212" width="96" height="18" rx="9" fill="rgba(68,76,231,.25)" stroke="#444ce7" stroke-width="1"></rect>
      <text x="440" y="225" text-anchor="middle" font-size="8.5" fill="#c7d2fe" font-weight="700">ENV WINS</text>
      <circle cx="440" cy="190" r="10" fill="none" stroke="#818cf8" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="12;70" dur="3s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".6;0" dur="3s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="660" y="132" width="216" height="116" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="768" y="158" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Injected Params</text>
      <text x="768" y="176" text-anchor="middle" font-size="9.5" fill="#4B5563">stripped from the public</text>
      <text x="768" y="190" text-anchor="middle" font-size="9.5" fill="#4B5563">input schema entirely</text>
      <text x="768" y="204" text-anchor="middle" font-size="9.5" fill="#4B5563">protected at execution, so</text>
      <text x="768" y="218" text-anchor="middle" font-size="9.5" fill="#4B5563">injected beats model-supplied</text>
      <rect x="700" y="224" width="136" height="16" rx="8" fill="#fee2e2"></rect>
      <text x="768" y="236" text-anchor="middle" font-size="8" fill="#991b1b" font-weight="700">MODEL NEVER SEES THIS</text>
      <path d="M244 102 L296 102 Q308 102 308 114 L308 166 Q308 178 320 178 L342 178" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M244 202 L342 202" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.6s" repeatCount="indefinite" path="M244,202 L342,202"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.6s" repeatCount="indefinite" begin="1.3s" path="M244,102 L296,102 Q308,102 308,114 L308,166 Q308,178 320,178 L342,178"></animateMotion></circle>
      <path d="M536 190 L654 190" fill="none" stroke="#16A34A" stroke-width="1.5"></path>
      <defs>
        <marker id="grn" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0,8 3,0 6" fill="#16A34A"></polygon>
        </marker>
      </defs>
      <path d="M536 190 L654 190" fill="none" stroke="#16A34A" stroke-width="1.5" marker-end="url(#grn)"></path>
      <circle r="4.5" fill="#16A34A"><animateMotion dur="1.8s" repeatCount="indefinite" path="M536,190 L654,190"></animateMotion></circle>
      <text x="24" y="372" font-size="9.5" fill="#4B5563">Hard rule: never read a secret env name with a bare getenv. Use the shared resolver — env first, then the credentials file.</text>
      <text x="24" y="392" font-size="9.5" fill="#4B5563">Writes run the other way: a sensitive name lands in the credentials file and in .env; every other name lands in .env only.</text>
      <text x="24" y="412" font-size="9.5" fill="#4B5563">Setup writes the env file before the integration store on purpose, so a failed write can never leave a store-only</text>
      <text x="24" y="432" font-size="9.5" fill="#4B5563">integration that looks configured at runtime and then fails a deploy preflight that reads the env file.</text>
      <text x="24" y="452" font-size="9.5" fill="#4B5563">A name ending in URL counts as public, so a webhook URL goes to .env only — but it often embeds a token, so mask it.</text>
    </svg>

## Agent rules (repo-owned)

✋

Never hand-roll persistence in a setup handler

The shared setup flow writes the env file and credentials file first, then the integration store, then a best-effort org-vault mirror. A surface handler that writes only the store produces an integration that looks configured at runtime and fails a deploy preflight that reads the env file. Use the shared spec and hand it your collected values.

⚖

Cross-field rules belong in the verifier

Either/or, all-or-nothing, and incomplete-combination rejections go in the verifier — never a setup-only check, because health checks call only the verifier. A UI picker is not a guarantee: an agent or a hand-edited store bypasses it.

⇅

The tier is derived, never chosen

A field's env-var name decides the tier, not the field. A terminal token/key/secret/password — or a connection-string name — goes to the credentials file and .env; anything else goes to .env alone. A field cannot opt out, which is the point.

⧉

Skill cards are human-owned

Skill guidance files are natural-language cards describing how to use a tool. Agents may only suggest changes — never create, edit, rename, move, or delete them. Deterministic vendor behaviour belongs in a real tool, not in a card's helper scripts.

## Session rules (operator-owned)

🎫

No work without a ticket

Every change needs an issue with acceptance criteria first, then failing tests, then the minimum implementation. No retroactive tickets, no deferred test passes.

🔒

No elevated privileges, ever

No root, no hosts-file edits, no DNS changes. If a task seems to require one, stop and describe what the operator must do themselves.

📝

Facts, labelled

A document is evidence of itself, never of the world it describes. If a claim would change a decision, verify it — and if it cannot be verified, say so instead of hedging.

🔁

Close the loop on CI

Push is not done. Watch the checks, fix root causes rather than skipping, and treat a post-merge failure as unfinished delivery.

The four registrations — a forgotten line is invisible, not broken

<svg viewBox="0 0 900 330" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="330" fill="#F8FAFC"></rect>
      <rect x="24" y="60" width="200" height="84" rx="10" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="124" y="86" text-anchor="middle" font-size="12" font-weight="700" fill="#ffffff">Tool Package</text>
      <text x="124" y="104" text-anchor="middle" font-size="9" fill="#a4bbfc">integrations/&lt;vendor&gt;/tools/</text>
      <text x="124" y="120" text-anchor="middle" font-size="9" fill="#818cf8">declaration of truth</text>
      <rect x="320" y="34" width="556" height="52" rx="9" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="336" y="55" font-size="11" font-weight="700" fill="#111827">Discovery tuple</text>
      <text x="336" y="71" font-size="9" fill="#4B5563">list the dotted package path or the registry never imports it</text>
      <rect x="784" y="48" width="80" height="20" rx="10" fill="#fee2e2"></rect>
      <text x="824" y="62" text-anchor="middle" font-size="8.5" fill="#991b1b" font-weight="700">INVISIBLE</text>
      <rect x="320" y="98" width="556" height="52" rx="9" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="336" y="119" font-size="11" font-weight="700" fill="#111827">Catalog + verifier wiring</text>
      <text x="336" y="135" font-size="9" fill="#4B5563">service entry with aliases, classifier, verify path, model field</text>
      <rect x="784" y="112" width="80" height="20" rx="10" fill="#fef3c7"></rect>
      <text x="824" y="126" text-anchor="middle" font-size="8.5" fill="#92400e" font-weight="700">NO STATUS</text>
      <rect x="320" y="162" width="556" height="52" rx="9" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="336" y="183" font-size="11" font-weight="700" fill="#111827">Docs page + navigation entry</text>
      <text x="336" y="199" font-size="9" fill="#4B5563">the page exists but is unregistered in navigation without a warning</text>
      <rect x="784" y="176" width="80" height="20" rx="10" fill="#fef3c7"></rect>
      <text x="824" y="190" text-anchor="middle" font-size="8.5" fill="#92400e" font-weight="700">UNREACHABLE</text>
      <rect x="320" y="226" width="556" height="52" rx="9" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="336" y="247" font-size="11" font-weight="700" fill="#111827">Example env file</text>
      <text x="336" y="263" font-size="9" fill="#4B5563">new required variables go in the example file — never the real one</text>
      <rect x="784" y="240" width="80" height="20" rx="10" fill="#dcfce7"></rect>
      <text x="824" y="254" text-anchor="middle" font-size="8.5" fill="#166534" font-weight="700">SAFE</text>
      <path d="M228 88 L264 88 Q276 88 276 76 L276 60 Q276 48 288 48 L314 48" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M228 96 L264 96 Q276 96 276 112 L276 124 Q276 136 288 136 L314 136" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M228 104 L264 104 Q276 104 276 148 L276 188 Q276 200 288 200 L314 200" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M228 112 L264 112 Q276 112 276 184 L276 252 Q276 264 288 264 L314 264" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <circle r="4" fill="#444ce7"><animateMotion dur="1.8s" repeatCount="indefinite" path="M228,96 L264,96 Q276,96 276,112 L276,124 Q276,136 288,136 L314,136"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="1.8s" repeatCount="indefinite" begin=".45s" path="M228,104 L264,104 Q276,104 276,148 L276,188 Q276,200 288,200 L314,200"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="1.8s" repeatCount="indefinite" begin=".9s" path="M228,112 L264,112 Q276,112 276,184 L276,252 Q276,264 288,264 L314,264"></animateMotion></circle>
      <text x="24" y="304" font-size="9.5" fill="#4B5563">The nastiest class of integration bug: everything passes, tests are green, and the agent simply cannot see the tool.</text>
    </svg>

## Review gates worth knowing

| Gate | What it enforces |
| --- | --- |
| Border test | Tools import the tier's public API, never an internal leaf module. This is what stops a tool from coupling to a private helper and breaking on refactors. |
| Import linter | Package boundaries. Importing upward — a lower tier reaching into a surface — is an error, not a warning. |
| Constant-condition test | No dead product logic disabled by a hardcoded false to silence a test. |
| Static analysis | Protocol method bodies are docstring-only. Mixed import styles, unused module constants, and implicit string concatenation inside a list all fail review-quality checks. |
| make verify-integrations | The human-facing probe: one integration at a time, or the whole set, printing a status table. |

## Metadata conventions

Declare what the tool needs and what it answers. Across 175 vendor tool packages the usage block is common and an outputs block is rare — but no vendor tool declares an output schema or a retrieval control at all, so match the surrounding convention rather than inventing a new field nobody reads.

| name | always |
| --- | --- |
| description | always — this is the model's only selection signal |
| source / surfaces | always — decides which turns can see it |
| use_cases | common — phrase as situations |
| is_available | when the tool needs configuration |

## Discovery and edge cases

For tools that list, search, or inspect:

| nesting | handle folder and nested resource layouts where the upstream has them |
| --- | --- |
| volume | cap or paginate deliberately |
| partials | surface them — truncated flags, fetch errors |
| ordering | preserve causal order when time matters |

<aside class="callout"><div class="callout__body">Validate against real or documented upstream response shapes. Also handle alternate field names, missing and partial fields, and upstream rate-limit or server errors returning a clear agent-friendly error instead of raising.</div></aside>

## Definition of done

### Core completeness

Config, normalization, validators and `classify()` in place, facade left thin · catalog resolution and env loading wired · verification path wired · integration-local client if it makes remote calls · tool layer wired and stable · CLI setup flow updated · `setup <name>` parity or documented out of scope · new required variables in the example env file · credentials follow the resolution contract · `make verify-integrations` passes.

### Docs and tests

A docs page shipped or updated in the same PR, registered in navigation · unit tests for config and normalization · tool contract or equivalent schema coverage · a realistic-fixture regression test · an end-to-end test that exercises the investigation pipeline with the transport mocked at the boundary.

<aside class="callout"><div class="callout__body">Then: run the full suite, open the PR, and watch the checks until green. For live-LLM tool-selection behaviour, remember that mocked-transport tests prove the plumbing, not the model's choice — if you want that pinned, it is a separate marker-gated test.</div></aside>
