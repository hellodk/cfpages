# Cover image brief — all 56 published posts

**Issue:** [#9](https://github.com/hellodk/cfpages/issues/9) · **Companion audit:** [`UI_UX_AUDIT.md`](./UI_UX_AUDIT.md)

Today 27 of 56 posts share `assets/images/cover1.jpg` and only 28 distinct
images serve the whole site. This document is the generation brief: a shared
style contract, a technical spec, and one concrete subject per post.

---

## 1. The style contract

Paste this ahead of every individual subject. It is doing one job: keeping the
set from reading as AI output.

> Photorealistic documentary photograph. Single real-world subject, shot on a
> 50mm lens at f/2.8, natural directional light from one side, mild shadow
> falloff. Muted natural colour, slightly desaturated. Real materials with
> visible wear — dust, fingerprints, scuffs, uneven patina. Asymmetric
> composition, subject off-centre, generous negative space. Shallow depth of
> field with a genuine focal plane. No text, letters, numbers or signage
> anywhere in the frame. No people, hands, faces or body parts. No logos or
> brand marks. No screens showing a user interface. No illustration, 3D
> render, vector art or digital painting.

### Why each clause is there

Every clause below removes a specific tell. These are not stylistic
preferences.

| Clause | The tell it removes |
|---|---|
| No text, letters or numbers | The single most reliable giveaway. Generative models produce text that is *almost* language and unmistakably wrong. One garbled label discredits the whole image. |
| No people, hands, faces | The second most reliable. Hands especially — finger count and joint direction still fail. |
| No screens showing a UI | A monitor is just text again, with added fake-toolbar tells. |
| No logos or brand marks | Same failure as text, plus a trademark problem you do not need. |
| Visible wear, dust, scuffs | Generated images default to a showroom finish. Grime is the cheapest realism signal available. |
| Asymmetric, off-centre | Models gravitate to dead-centre symmetry. A slightly-off subject reads as a photograph someone actually took. |
| Named focal length and aperture | Produces a physically coherent depth of field instead of a uniformly sharp or uniformly blurred frame. |
| Muted, desaturated colour | Avoids the oversaturated teal-and-orange grade that flags the source instantly. |
| One directional light source | Generated lighting is often ambient from everywhere, which reads as a render. |

### Never generate

These are the visual clichés of AI-about-AI imagery. Any one of them makes the
post look like it was illustrated by the thing it describes:

- Glowing blue circuit-board traces, especially forming a brain or a head
- Floating translucent hexagons, holograms or HUD overlays
- Neon wireframe grids receding to a horizon
- Humanoid robots, android faces, glowing eyes
- Binary digits raining down a screen
- A generic "data centre" corridor with blue LED strips and volumetric haze
- Purple-to-blue gradient backgrounds with bokeh particles
- Hands touching a floating interface

The subjects below are deliberately mundane and physical — a whetstone, a
patch panel, a salt pan, a drawer of index cards. Metaphor carried by a real
object is what stops a technical blog from looking like a stock library.

---

## 2. Technical spec

| Property | Value | Why |
|---|---|---|
| Dimensions | **1800 × 1200** | 3:2. Gives retina headroom over the 1109px widest slot without paying for 4K. |
| Aspect ratio | **3:2 (1.5)** | Already the most common ratio on the site (33 posts). Fixing one ratio makes the crop predictable. |
| Format | **JPEG**, sRGB, quality ~78 | The current PNG screenshots are photographic content in the wrong container — one of them is 1.97MB. |
| File size | **≤ 400KB** | The cover is the LCP element on every post page. |
| Filename | `covers/<slug>.jpg` | One image per post, named after the slug. Never reused. |

### The safe area — this constrains composition

The same file is cropped to four different shapes:

| Surface | Rendered box | Ratio |
|---|---|---|
| `PostFeed` sidebar thumb | 168 × 112 | 1.50 |
| `PostCard` grid tile | `aspect-ratio: 16/10` | 1.60 |
| `FeaturedPost` banner | full width × 320px | ~2.19 |
| `PostLayout` post cover | 1109 × 360 at 1440px | **3.08** |

Everything uses `object-fit: cover`, so the widest surface throws away the
most. A 3:2 source cropped to 3.08 keeps only the **middle 49% of the frame
height**.

**So: the subject must sit inside the central horizontal band — roughly the
middle half of the image height.** Anything in the top or bottom quarter is
gone on the post page. Add this line to every prompt:

> Compose the subject within the central horizontal third of the frame, with
> empty space above and below it.

---

## 3. Wiring the images in

1. Save each file to `public/assets/images/covers/<slug>.jpg`.
2. Add to that post's frontmatter — no leading slash:

   ```yaml
   cover: "assets/images/covers/<slug>.jpg"
   ```

3. `resolvePostCover` (`src/utils/postCover.ts:29`) takes frontmatter first, so
   this wins over every fallback.

Two cleanups belong with this work:

- **`SLUG_COVERS` in `src/data/post-covers.ts` is dead code.** All 23 slugs in
  it already carry `cover:` in their own frontmatter, so step 2 of the
  resolution chain is unreachable. Delete it once every post has a frontmatter
  cover.
- **`TAG_COVERS` becomes unreachable too**, along with the body-image fallback
  and `DEFAULT_COVER`. Keep `DEFAULT_COVER` as a genuine last resort for
  future posts; the other two can go.

Licensing: images are generated, so no attribution line and no `/credits` page
is required.

---

## 4. Per-post subjects

56 entries, one per published post. Each is a real photographable object —
that is what keeps the set grounded.

### Linux and systems fundamentals

| Post | Subject |
|---|---|
| `understanding-lvm-basics` | Three bare 3.5-inch hard drives stacked flat on a workbench, labels peeled off, side light raking across the aluminium. The stack is the metaphor: physical volumes under a group under a logical volume. |
| `exploring-top-command` | A cluster of analogue panel meters on a worn industrial console, needles resting at different points mid-scale, one slightly into the red. |
| `working-with-aureport` | A concertina stack of fanfold continuous-feed printer paper on a desk, folded edges catching the light, print out of focus and illegible. |
| `yum-commands-quick-reference` | A hardware-store parts cabinet of small metal drawers, two pulled open, brass handles worn bright by use. |
| `mac-shortcuts` | Low three-quarter angle across the modifier row of a well-used mechanical keyboard, blank keycaps, shallow focus falling off along the row. |
| `upgrading-sublime-text` | A chisel being drawn across a wet whetstone on a workbench, water beading on the stone, metal shavings at the edge. |
| `markdown-cheatsheet` | A letterpress type case with metal sorts in their compartments, seen from directly above, individual letterforms too small to resolve. |
| `how-to-pass-datastax-cassandra-administrator-certification` | A study desk at dawn: closed notebook, mechanical pencil, cooling cup of coffee, low sun across the surface. Nothing written is legible. |
| `the-road-to-a-kingdom` | A single-track dirt road running toward distant hills at dusk, ruts holding the last light, no vehicles or figures. |
| `resume` | A tidy desk flat-lay from above: fountain pen, a folded sheet of heavy paper, a linen bookmark, morning window light. No writing visible. |

### Version control

| Post | Subject |
|---|---|
| `understanding-git-flow` | A railway junction from a footbridge, three steel tracks converging through ballast, morning frost still on the sleepers. |
| `git-concepts` | A braided river delta photographed from the air, channels splitting and rejoining across pale sediment, muted greys and ochres. |
| `ai-git-branching-strategy` | A canal lock with both gates closed and the water at two clearly different levels, wet stone walls, overcast light. |

### Networking, DNS and certificates

| Post | Subject |
|---|---|
| `dns-explained` | A vintage telephone switchboard patch field, fabric-covered cords hanging in loops across brass jacks, warm dim light. |
| `understanding-dns` | A library card catalogue with one drawer pulled fully open, index cards standing on edge, card text thrown out of focus. |
| `kube-dns-split-dns-ubuntu24` | A brass plumbing manifold splitting one supply into two branches, patina on the fittings, plain workshop wall behind. |
| `generating-ssl-certificates` | A brass wax-seal press beside a finished dark red seal on cream paper, sealing wax stick and a lit taper to one side. The seal face is a plain blank disc. |
| `browser-rdp-zero-ports` | The hinge edge of a heavy steel vault door standing ajar, machined pins and bolt-work catching a single hard light. No keypad, no dial. |
| `auth-concepts` | A bank of stainless turnstiles in an empty lobby at first light, arms at rest, polished floor reflecting the row. |
| `homelab-sso-consolidation` | One brass key in sharp focus on a ring holding a dozen others, the rest falling away into blur on a wooden table. |

### Kubernetes and platform

| Post | Subject |
|---|---|
| `kubernetes-cluster-vagrant` | Shipping containers stacked four high at a small working port, muted weathered paint, flat overcast light. |
| `kubernetes-monitoring` | An industrial control room wall of round analogue gauges in painted steel frames, glass slightly dusty, needles at rest. |
| `drift-detector-observability` | Two identical mechanical wall clocks side by side on a plain shelf, hands showing a small but obvious difference. |
| `typhoon-wifi-cpu-powersave` | A rooftop antenna mast against flat grey weather, guy wires taut and dripping, wet galvanised steel. |
| `nfs-meltdown` | A thick black hose coiled tightly on its reel with the free end fed back into its own coil, rubber scuffed and dusty, concrete floor. |
| `macos-vms-tart-salt` | A shelf of identical unlabelled aluminium equipment cases, latches closed, one pulled slightly proud of the row. |
| `kri-fleet-management` | A ventilated shelf of identical small silver boxes with cables dressed neatly to one side, workshop light from above. |
| `kri-salt-deployment` | Coarse sea-salt crystals scattered on dark slate under hard raking light, individual crystal facets picking up the highlight. |
| `salt-concepts` | Salt evaporation pans photographed from directly above, geometric basins in chalk white and faded pink, drying rims cracked. |
| `kri-ops-guide` | A spiral-bound field manual lying open on a workbench, pages oil-stained and dog-eared, print out of focus. |

### CI/CD and builds

| Post | Subject |
|---|---|
| `deploy-jenkins-with-ssl` | A factory conveyor carrying identical unfinished metal parts, shot along the belt, hard overhead industrial lighting. |
| `mobile-ci-cd` | An electronics repair bench: anti-static mat, precision screwdrivers laid in order, small parts trays, warm task lamp. No device on the mat. |
| `ios-android-build-guide` | Two clearly incompatible pipe couplings laid side by side on a workbench, different threads and diameters, machining marks visible. |
| `kri-testing-strategy` | A torque wrench engaged on a bolt head, the click mechanism in focus, oil on the fastener. |
| `engineering-reliability-testing-strategy` | A stack of cast-iron calibration weights on a laboratory bench, largest at the bottom, chipped paint on the edges. |
| `e2e-testing-token-efficiency` | A set of nested measuring spoons fanned open on a scrubbed wooden surface, worn steel, one still slightly damp. |

### AI, LLMs and agents

| Post | Subject |
|---|---|
| `rag-embeddings-vector-db` | A library stacks aisle from a low angle, shelves receding into warm depth, spines rendered as colour and texture rather than readable titles. |
| `rag-for-kri-fleet-assistant` | A museum archive drawer pulled open on its runners, densely packed index cards seen edge-on, one card standing slightly proud. |
| `kri-agentic-fleet-assistant` | A brass pneumatic-tube station on a wall, several carriers loaded in their tubes, polished fittings and dark wood surround. |
| `agentic-mcp-gateways` | A single boom barrier at a service entrance, arm lowered across an empty roadway, striped paint chipped, wet tarmac. |
| `local-llm-inference-architecture` | A bare graphics card lying on a workshop bench beside a thermal paste tube and a torx driver, heatsink fins in sharp relief. |
| `mlx-llms-on-apple-silicon-wwdc25-26` | Four identical small aluminium computers stacked in a tidy column on an oak desk, one short cable looping between two of them. |
| `two-mac-minis-mlx-debugging` | Two identical aluminium boxes side by side on a wooden desk joined by a single ethernet cable, one sitting slightly askew. |
| `save-tokens-and-better-prompts` | A glass jar of mixed coins on a windowsill, half empty, morning light through the glass throwing a coin-shaped caustic on the sill. |
| `graphify-token-enforcement` | An old electricity meter's spinning aluminium disc and dial train, close in, dust on the glass, brass number wheels out of focus. |
| `kri-knowledge-graph-graphify` | An orb-weaver's web at dawn covered in dew, every junction beaded, radial and spiral threads sharp against a soft dark hedge. |
| `graphify-obsidian-vault` | A fist-sized piece of raw obsidian on grey stone, conchoidal fracture faces catching one hard light, glass-black with a green edge. |

### Terminal and tooling

| Post | Subject |
|---|---|
| `tmux-session-manager` | Index-card dividers standing in a wooden card file, seen edge-on so the staggered tabs recede, blank tab faces. |
| `zellij-session-manager` | A wall of small brass post-office boxes, doors closed, numbers worn to illegibility, one door slightly ajar. |
| `pnpm-smarter-package-manager` | A bicycle wheel hub photographed straight down the axle, spokes radiating from a single centre, grease and road grit on the flange. |
| `vagrant-with-qemu-kvm` | A small vintage caravan parked on grass at the edge of a field, door open, everything needed carried inside it. |
| `mysql-master-master-replication` | Two identical vintage typewriters facing each other on a desk, carriages aligned, a single sheet in each. Paper blank. |

### Incidents and debugging

| Post | Subject |
|---|---|
| `gnome-thumbnails-broke` | A strip of photographic negatives on a lightbox with a loupe resting on it, several frames completely clear and blank. |
| `perils-of-timezone` | A row of identical wall clocks in a newsroom showing different times, the name plates beneath them out of focus and unreadable. |

### The site itself

| Post | Subject |
|---|---|
| `hellodk-jekyll-to-astro-cloudflare-migration` | Taped removal boxes stacked in an empty room with bare floorboards, one window throwing a long light patch across them. |
| `hellodk-content-migration-guide` | A clipboard on a workbench holding a checklist with hand-drawn tick boxes, some ticked, handwriting out of focus. |
| `hardware-telemetry` | A compact desktop machine with its top cover slid aside, heatsink fins and fan exposed, dust in the slats. |
| `alerting` | A wall-mounted brass bell above a workbench, pull cord frayed, shavings and screws scattered beneath. |
| `dashboards` | A darkened control room corner with empty swivel chairs facing a blank dark monitor, cable conduits overhead. |
| `observability-audit` | A clipboard holding blank paper sheets, a pencil resting across the top, more blank stock stacked beneath. |
| `opik-llm-tracing` | A spool of thread trailing across a workbench through a row of small brass eyelets, loose end curling off the edge. |
| `opik-feedback-loop` | A kitchen scale with a chipped enamel bowl, needle resting left of zero, flour dust on the base. |
| `mlx-inference-performance` | Two stacked wooden crates with paint marks worn past reading, straw poking from between the slats. |
| `hydra-vs-mlx-oc` | Two mismatched table lamps side by side on a long bench, only the left one lit, cords tangled behind. |
| `model-serving-resilience` | A night-shift workshop bench with a single caged work lamp burning, tools laid in a straight row. |
| `opik-log-streaming` | A rain gutter downspout pouring into a galvanized bucket, waterline stained, leaves plastered near the mouth. |
| `agentic-edge-cases` | A tackle box with every compartment open, one lure missing from its slot, lake water beading on the lid. |
| `fault-error-restart-analysis` | A wall clock with its glass cracked across the face, both hands stopped, dust on the rim. |
| `agentic-forensics` | A row of dominoes frozen mid-topple on a scarred tabletop, the lead tile face-down past the rest. |
| `recommendations-decision` | A balance scale with brass pans holding river stones of uneven size, pointer settled off-centre. |
| `sglang-on-two-mac-minis` | Two sawhorses holding an unfinished plank walkway over muddy ground, tool belt hanging from one end. |
| `mlx-distributed-options-tuning` | A control panel of chunky toggle switches set in a steel plate, half thrown, paint worn smooth. |
| `opik-dashboards` | A greenhouse window fogged from inside, a wiped arc revealing seedling trays beyond the glass. |
| `token-confidence-logprobs` | A handful of dice mid-roll above green felt, pips blurred, one die already settled. |
| `observability-telemetry-and-testing` | A long workbench with open tins of sorted screws, each tin dented, a magnet sweeper leaning nearby. |
| `k8s-grafana-data-path` | A freight pallet stacked with strapped crates beside railway tracks, rope frayed, tarpaulin half-slipped. |
| `thunderbolt-ring-launchdaemons` | A suspension bridge cable close-up with rain beading on steel strands, one frayed wire tucked back. |
| `observability-dashboard-reference` | A wall of small wooden pigeonholes holding coiled cables and corked vials, one drawer pulled open. |
| `network-spike-investigation` | A garden hose burst at its coupling, water arcing across a patio, a coiled spare hose untouched nearby. |
| `java21-libpng-cve-fix` | A single open Alpine package carton on a workbench beside a sealed one, packing tape half-pulled, dust in a shaft of window light. |
| `homelab-secret-rescue` | An open desk drawer of tangled backup drives and server keys, one drive pulled halfway out, rubber bands and dust on scarred wood. |
| `ubi-micro-remediation` | A stripped workbench holding only a sealed metal tin and a bare wrench, paint worn off the edges, everything else cleared away. |
| `opensre-workshop-plan` | A whiteboard covered edge to edge in marker diagrams, a stool pushed back mid-session, eraser dust on the tray below. |
| `hummingbird-verification` | A freshly washed glass jar standing empty on a sunny sill, water spots drying on the rim, nothing inside but light. |
| `jenkins-macos-gui-session-agent` | A Mac Mini tucked beneath a sleeping monitor, cable slack coiled on the desk, power brick warm with dust. |
| `prefix-cache-economics` | A library returns cart stacked with identical worn volumes, one pulled out and left face-down open on top. |
| `opensre-homelab-integration` | A closet rack of blinking small servers laced with cables, one patch lead unplugged and dangling, dust on the fan grilles. |
| `297-probe-failures-mlx-cluster` | Two compact desktop machines back to back on a workbench, linked by a single braided cable, a coiled spare cable and scattered screws beside them. |
| `yugabyte-aerospike-connectors-opensre` | Two mismatched storage jars joined by a short copper pipe, one filled with dark beans, the other with pale lentils. |
| `java-distroless-cve-hunt` | Seven identical glass bottles in a row on a shelf, six capped, one left open, dust lines marking how long each stood. |
| `distroless-base-image-findings` | Eight sealed preserving jars lined on a pantry shelf, lids vacuumed flat, paper tags blank from age. |
| `mlx-jaccl-silent-hang` | A ceiling fan frozen mid-spin in a dusty workshop, pull chain swaying slightly, light through slatted blinds. |
| `opensre-connectors-e2e-gauntlet` | A workbench vise gripping a chipped ceramic mug, hairline crack lit from one side, shavings scattered around. |
| `java21-remediation-plan` | A corkboard of blank pinned cards in three columns, the first column cleared, spare pins lined below. |
| `deploying-qwen-tensor-parallelism` | Two compact desktops side by side sharing one monitor cable through a switch box, vents dusty. |
| `tensor-parallelism-omlx` | A sliced layer cake with offset strata on a chipped plate, one thin slice laid flat beside it. |
| `local-tool-calling-models` | A small workshop radio with its back panel off, vacuum tubes warm, a folded cloth beneath it. |
| `llama-cpp-systemd` | A battered thin laptop running on a kitchen table, fan vent propped on bottle caps, screen dark. |
| `google-distroless-remediation` | A smooth river stone beside a rusted padlock with no keyhole, both half-buried in pale gravel. |
| `omlx-stack-teardown` | A dismantled wooden crate with its slats laid in order on sawdust, nails sorted in a tin lid. |
| `two-lenses-cluster-estimates` | A pair of worn binoculars on a fence post at dusk, one lens cap on, the other hanging by its strap. |
| `ubi9-full-remediation` | An overstuffed toolbox with its lid sprung open, sockets spilling onto an oil-stained rag. |
| `mobile-code-signing` | A wax seal stamp beside a brass key on a dark desk blotter, sealing wax pooled and cooled. |

---

## 5. Sequence

The set has to hang together, so generate in this order and stop after each
batch to check the register:

1. **Three test images first** — `salt-concepts`, `nfs-meltdown`,
   `rag-embeddings-vector-db`. They span the three registers (landscape,
   industrial detail, interior). If those three sit together, the contract is
   working.
2. **The 27 currently on `cover1.jpg`** — the visible problem.
3. **The two duplicate pairs** — `drift-detector-observability` /
   `typhoon-wifi-cpu-powersave`, and `kri-knowledge-graph-graphify` /
   `mlx-llms-on-apple-silicon-wwdc25-26`.
4. **The four unfit covers** — `deploy-jenkins-with-ssl` (a 542×38 screenshot
   strip, and currently a 404 — see #11), `kri-fleet-management` (a 398×128
   logo), `macos-vms-tart-salt` (a Manali travel photo),
   `mysql-master-master-replication` (a RethinkDB screenshot).
5. **The rest**, replacing the remaining screenshots and stock covers.

### Rejection checklist

Before accepting any image:

- [ ] No text, letters, numbers or signage anywhere in the frame
- [ ] No hands, faces or people
- [ ] Subject sits in the central horizontal third
- [ ] Survives a crop to 3.08:1 without losing the subject
- [ ] Reads as a photograph at full size, not just as a thumbnail
- [ ] Not on the "never generate" list
- [ ] ≤400KB at 1800×1200 JPEG
