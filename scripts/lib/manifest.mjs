/**
 * The 88 posts migrated from ~/Documents/blogs.
 *
 * Static reviewed data. `src` is relative to the blogs root. Rebuild entries
 * keep the date already published, so URLs and ordering do not shift.
 *
 * Excluded by design: nfs-meltdown (Copy)/ (duplicate), linux_hacks.md
 * (222 bytes) and nginx_tutorials.md (81 bytes) (near-empty stubs, not posts),
 * docs/ (superpowers internals), omlx-blog-mocks-v2.html (build mock, not a
 * post), the five build artifacts (redesign-mockup, animation-preview,
 * traffic-animations, token-consumption-24h, token-consumption.svg), and two
 * held stubs pending expansion: 2026-10-02-gemma-4-e2b-mm1-mlx/ (12K) and
 * 2026-10-03-gemma-4-mlx-kaggle-mirror/ (6K).
 */
export const POSTS = [
  // ---- Rebuilt: post already exists, date preserved from its frontmatter ----
  { src: '2026-04-25-browser-rdp-zero-ports/2026-04-25-browser-rdp-zero-ports.md', slug: 'browser-rdp-zero-ports', date: '2026-04-25', tags: ['kubernetes', 'networking', 'rdp'], draft: false },
  { src: '2026-05-23-gnome-thumbnails-broke/2026-05-23-gnome-thumbnails-broke.html', slug: 'gnome-thumbnails-broke', date: '2026-05-23', tags: ['linux', 'ubuntu', 'gnome', 'debugging'], draft: false },
  { src: '2026-05-27-kri-knowledge-graph-graphify/2026-05-27-kri-knowledge-graph-graphify.html', slug: 'kri-knowledge-graph-graphify', date: '2026-05-27', tags: ['kri', 'knowledge-graph', 'graphify'], draft: false },
  { src: '2026-05-27-macos-vms-tart-salt/2026-05-27-macos-vms-tart-salt.html', slug: 'macos-vms-tart-salt', date: '2026-05-27', tags: ['macos', 'saltstack', 'virtualization'], draft: false },
  { src: '2026-05-28-graphify-token-enforcement/2026-05-28-graphify-token-enforcement.html', slug: 'graphify-token-enforcement', date: '2026-05-28', tags: ['graphify', 'llm', 'tokens'], draft: false },
  { src: 'kri-fleet-management/kri-fleet-management.html', slug: 'kri-fleet-management', date: '2026-05-15', tags: ['kri', 'devops', 'fleet-management'], draft: false },
  { src: 'kube_dns_split_dns_ubuntu24/kube_dns_split_dns_ubuntu24.md', slug: 'kube-dns-split-dns-ubuntu24', date: '2026-05-01', tags: ['kubernetes', 'dns', 'ubuntu'], draft: false },
  { src: 'monitoring-blog/monitoring-blog.md', slug: 'kubernetes-monitoring', date: '2026-05-01', tags: ['kubernetes', 'monitoring', 'prometheus'], draft: false },
  { src: 'pnpm-the-smarter-package-manager/pnpm-the-smarter-package-manager.html', slug: 'pnpm-smarter-package-manager', date: '2026-04-01', tags: ['nodejs', 'pnpm', 'tooling'], draft: false },

  // ---- Bucket A: dated posts, date from the directory name ----
  { src: '2026-05-28-graphify-obsidian-vault/2026-05-28-graphify-obsidian-vault.html', slug: 'graphify-obsidian-vault', date: '2026-05-28', tags: ['graphify', 'obsidian', 'knowledge-graph'], draft: false },
  { src: '2026-05-30-salt-concepts.html', slug: 'salt-concepts', date: '2026-05-30', tags: ['saltstack', 'devops', 'automation'], draft: false },
  { src: '2026-05-31-rag-for-kri-fleet-assistant.html', slug: 'rag-for-kri-fleet-assistant', date: '2026-05-31', tags: ['rag', 'llm', 'kri'], draft: false },
  { src: '2026-06-08-agentic-mcp-gateways/2026-06-08-agentic-mcp-gateways.html', slug: 'agentic-mcp-gateways', date: '2026-06-08', tags: ['mcp', 'agents', 'llm'], draft: false },
  { src: '2026-06-09-kri-agentic-fleet-assistant/2026-06-09-kri-agentic-fleet-assistant.html', slug: 'kri-agentic-fleet-assistant', date: '2026-06-09', tags: ['agents', 'kri', 'llm', 'saltstack'], draft: false },
  { src: '2026-06-09-rag-embeddings-vector-db/2026-06-09-rag-embeddings-vector-db.html', slug: 'rag-embeddings-vector-db', date: '2026-06-09', tags: ['rag', 'embeddings', 'pgvector'], draft: false },
  { src: '2026-06-21-kri-salt-deployment/2026-06-21-kri-salt-deployment.html', slug: 'kri-salt-deployment', date: '2026-06-21', tags: ['saltstack', 'macos', 'kri', 'launchd'], draft: false },
  { src: '2026-06-28-typhoon-wifi-cpu-powersave/2026-06-28-typhoon-wifi-cpu-powersave.html', slug: 'typhoon-wifi-cpu-powersave', date: '2026-06-28', tags: ['kubernetes', 'k0s', 'calico', 'networking'], draft: false },
  { src: '2026-07-17-tmux-session-manager/2026-07-17-tmux-session-manager.html', slug: 'tmux-session-manager', date: '2026-07-17', tags: ['tmux', 'terminal', 'dotfiles'], draft: false },
  { src: '2026-07-17-zellij-session-manager/2026-07-17-zellij-session-manager.html', slug: 'zellij-session-manager', date: '2026-07-17', tags: ['zellij', 'terminal', 'dotfiles'], draft: false },
  { src: '2026-08-02-ai-git-branching-strategy/2026-08-02-ai-git-branching-strategy.html', slug: 'ai-git-branching-strategy', date: '2026-08-02', tags: ['git', 'ai', 'workflow'], draft: false },
  { src: '2026-08-02-two-mac-minis-mlx-debugging/2026-08-02-two-mac-minis-mlx-debugging.html', slug: 'two-mac-minis-mlx-debugging', date: '2026-08-02', tags: ['macos', 'mlx', 'debugging', 'networking'], draft: false },
  { src: '2026-08-04-drift-detector-observability/2026-08-04-drift-detector-observability.html', slug: 'drift-detector-observability', date: '2026-08-04', tags: ['observability', 'prometheus', 'kubernetes'], draft: false },
  { src: '2026-08-06-perils-of-timezone/2026-08-06-perils-of-timezone.html', slug: 'perils-of-timezone', date: '2026-08-06', tags: ['timezone', 'distributed-systems', 'observability'], draft: false },
  { src: '2026-08-07-homelab-sso-consolidation/2026-08-07-homelab-sso-consolidation.html', slug: 'homelab-sso-consolidation', date: '2026-08-07', tags: ['sso', 'keycloak', 'homelab', 'cloudflare'], draft: false },

  // ---- Bucket B: undated guides, date from source mtime ----
  { src: 'save-tokens-and-better-prompts/save-tokens-and-better-prompts.md', slug: 'save-tokens-and-better-prompts', date: '2026-03-04', tags: ['llm', 'prompting', 'tokens'], draft: false },
  { src: 'custom-vs-code-plugin/custom-vs-code-plugin.md', slug: 'custom-vs-code-plugin', date: '2026-04-08', tags: ['vscode', 'tooling'], draft: true },
  { src: 'nfs-meltdown/blog-nfs-meltdown.md', slug: 'nfs-meltdown', date: '2026-05-10', tags: ['nfs', 'kubernetes', 'incident', 'storage'], draft: false },
  { src: 'e2e-testing-token-efficiency/e2e-testing-token-efficiency.html', slug: 'e2e-testing-token-efficiency', date: '2026-05-21', tags: ['testing', 'e2e', 'tokens'], draft: false },
  { src: 'kri-ops-guide/kri-ops-guide.html', slug: 'kri-ops-guide', date: '2026-05-21', tags: ['kri', 'operations', 'devops'], draft: false },
  { src: 'engineering-reliability-testing-strategy/engineering-reliability-testing-strategy.html', slug: 'engineering-reliability-testing-strategy', date: '2026-05-23', tags: ['testing', 'reliability', 'engineering'], draft: false },
  { src: 'kri-testing-strategy/kri-testing-strategy.html', slug: 'kri-testing-strategy', date: '2026-05-23', tags: ['kri', 'testing', 'strategy'], draft: false },
  { src: 'git-concepts/git-concepts.html', slug: 'git-concepts', date: '2026-05-27', tags: ['git', 'concepts', 'version-control'], draft: false },
  { src: 'ios-android-build-guide.html', slug: 'ios-android-build-guide', date: '2026-06-01', tags: ['ios', 'android', 'ci', 'mobile'], draft: false },
  { src: 'auth-concepts.html', slug: 'auth-concepts', date: '2026-06-06', tags: ['auth', 'oidc', 'security', 'concepts'], draft: false },
  { src: 'local-llm-inference-architecture.html', slug: 'local-llm-inference-architecture', date: '2026-07-17', tags: ['llm', 'inference', 'architecture'], draft: false },

  // ---- Bucket C: internal notes, all draft ----
  { src: 'using_operators.md', slug: 'using-operators', date: '2021-12-07', tags: ['kubernetes', 'operators'], draft: true },
  { src: 'incident-investigation-2026-02-22.md', slug: 'incident-investigation-2026-02-22', date: '2026-02-22', tags: ['incident', 'postmortem'], draft: true },
  { src: 'linkedin-post-network-spike.md', slug: 'linkedin-post-network-spike', date: '2026-03-01', tags: ['networking', 'incident'], draft: true },
  { src: 'grafana-screenshot-guide.md', slug: 'grafana-screenshot-guide', date: '2026-03-01', tags: ['grafana', 'monitoring'], draft: true },
  { src: 'avika_deep_analysis.md.resolved', slug: 'atlas-deep-analysis', date: '2026-03-03', tags: ['analysis', 'observability'], draft: true },
  { src: 'blog-network-spike-investigation.md', slug: 'network-spike-investigation', date: '2026-04-08', tags: ['networking', 'incident', 'debugging'], draft: false },
  { src: 'kube-system-priority-classes.md', slug: 'kube-system-priority-classes', date: '2026-05-11', tags: ['kubernetes', 'scheduling'], draft: true },

  // ---- Bucket D: 2026-08-09 onward, date from the directory name ----
  { src: '2026-08-09-homelab-secret-rescue/2026-08-09-homelab-secret-rescue.html', slug: 'homelab-secret-rescue', date: '2026-08-09', tags: ['homelab', 'gitops', 'kubernetes', 'postgres', 'openbao'], draft: false },
  { src: '2026-08-09-opensre-homelab-integration/2026-08-09-opensre-homelab-integration.html', slug: 'opensre-homelab-integration', date: '2026-08-09', tags: ['opensre', 'homelab', 'kubernetes', 'sre'], draft: false },
  { src: '2026-08-15-local-tool-calling-models/2026-08-15-local-tool-calling-models.html', slug: 'local-tool-calling-models', date: '2026-08-15', tags: ['llm', 'agents', 'local-llm', 'inference', 'tool-calling'], draft: false },
  { src: '2026-08-16-297-probe-failures-mlx-cluster/2026-08-16-297-probe-failures-mlx-cluster.html', slug: '297-probe-failures-mlx-cluster', date: '2026-08-16', tags: ['mlx', 'macos', 'apple-silicon', 'debugging'], draft: false },
  { src: '2026-08-16-mlx-jaccl-silent-hang/2026-08-16-mlx-jaccl-silent-hang.html', slug: 'mlx-jaccl-silent-hang', date: '2026-08-16', tags: ['mlx', 'macos', 'apple-silicon', 'debugging', 'distributed-systems'], draft: false },
  { src: '2026-08-16-two-lenses-cluster-estimates/2026-08-16-two-lenses-cluster-estimates.html', slug: 'two-lenses-cluster-estimates', date: '2026-08-16', tags: ['mlx', 'ai', 'debugging', 'engineering'], draft: false },
  { src: '2026-08-21-deploying-qwen-tensor-parallelism/2026-08-21-deploying-qwen-tensor-parallelism.html', slug: 'deploying-qwen-tensor-parallelism', date: '2026-08-21', tags: ['llm', 'tensor-parallelism', 'mlx', 'inference', 'qwen'], draft: false },
  { src: '2026-08-21-tensor-parallelism-omlx/2026-08-21-tensor-parallelism-omlx.html', slug: 'tensor-parallelism-omlx', date: '2026-08-21', tags: ['mlx', 'llm', 'tensor-parallelism', 'inference'], draft: false },
  { src: '2026-08-22-omlx-stack-teardown/2026-08-22-omlx-stack-teardown.html', slug: 'omlx-stack-teardown', date: '2026-08-22', tags: ['mlx', 'llm', 'apple-silicon', 'inference'], draft: false },
  { src: '2026-08-23-yugabyte-aerospike-connectors-opensre/2026-08-23-yugabyte-aerospike-connectors-opensre.html', slug: 'yugabyte-aerospike-connectors-opensre', date: '2026-08-23', tags: ['opensre', 'yugabydb', 'aerospike', 'kubernetes', 'testing'], draft: false },
  { src: '2026-08-24-prefix-cache-economics/2026-08-24-prefix-cache-economics.html', slug: 'prefix-cache-economics', date: '2026-08-24', tags: ['llm', 'inference', 'caching', 'agents', 'apple-silicon'], draft: false },
  { src: '2026-08-25-mobile-code-signing/2026-08-25-mobile-code-signing.html', slug: 'mobile-code-signing', date: '2026-08-25', tags: ['ios', 'android', 'mobile', 'ci', 'security'], draft: false },
  { src: '2026-08-25-opensre-connectors-e2e-gauntlet/2026-08-25-opensre-connectors-e2e-gauntlet.html', slug: 'opensre-connectors-e2e-gauntlet', date: '2026-08-25', tags: ['opensre', 'testing', 'e2e', 'kubernetes', 'reliability'], draft: false },
  { src: '2026-09-09-jenkins-macos-gui-session-agent/2026-09-09-jenkins-macos-gui-session-agent.html', slug: 'jenkins-macos-gui-session-agent', date: '2026-09-09', tags: ['jenkins', 'macos', 'ci', 'devops'], draft: false },
  { src: '2026-09-09-opensre-workshop-plan/2026-09-09-opensre-workshop-plan.html', slug: 'opensre-workshop-plan', date: '2026-09-09', tags: ['opensre', 'sre', 'observability', 'devops', 'workshop'], draft: false },
  { src: '2026-09-22-llama-cpp-systemd/2026-09-22-llama-cpp-systemd.html', slug: 'llama-cpp-systemd', date: '2026-09-22', tags: ['llm', 'inference', 'llama-cpp', 'systemd', 'linux'], draft: false },
  { src: '2026-10-02-java-distroless-cve-hunt/2026-10-02-java-distroless-cve-hunt.html', slug: 'java-distroless-cve-hunt', date: '2026-10-02', tags: ['java', 'docker', 'container-security', 'cve', 'distroless'], draft: false },
  { src: '2026-10-03-google-distroless-remediation/2026-10-03-google-distroless-remediation.html', slug: 'google-distroless-remediation', date: '2026-10-03', tags: ['docker', 'distroless', 'container-security', 'cve'], draft: false },
  { src: '2026-10-04-distroless-base-image-findings/2026-10-04-distroless-base-image-findings.html', slug: 'distroless-base-image-findings', date: '2026-10-04', tags: ['docker', 'distroless', 'container-security', 'cve', 'trivy'], draft: false },
  { src: '2026-10-11-container-scanner-divergence/2026-10-11-container-scanner-divergence.html', slug: 'container-scanner-divergence', date: '2026-10-11', tags: ['docker', 'container-security', 'trivy', 'clair', 'scanning'], draft: false },
  { src: '2026-10-11-temurin-cve-2025-69644-fix/2026-10-11-temurin-cve-2025-69644-fix.html', slug: 'temurin-cve-2025-69644-fix', date: '2026-10-11', tags: ['java', 'docker', 'container-security', 'cve', 'temurin'], draft: false },
  { src: '2026-10-04-sre-llm-fleet-decision/2026-10-04-sre-llm-fleet-decision.html', slug: 'sre-llm-fleet-decision', date: '2026-10-04', tags: ['sre', 'llm', 'fleet', 'litellm', 'opik'], draft: false },
  { src: '2026-10-06-mlx-oc-monitoring-explained/2026-10-06-mlx-oc-monitoring-explained.html', slug: 'mlx-oc-monitoring-explained', date: '2026-10-06', tags: ['mlx', 'observability', 'monitoring', 'llm'], draft: false },
  { src: '2026-10-06-mlx-supervision-launchagent/2026-10-06-mlx-supervision-launchagent.html', slug: 'mlx-supervision-launchagent', date: '2026-10-06', tags: ['mlx', 'macos', 'launchd', 'supervision'], draft: false },
  { src: '2026-10-06-opensre-integrations/2026-10-06-opensre-integrations.html', slug: 'opensre-integrations', date: '2026-10-06', tags: ['opensre', 'devops', 'integrations'], draft: false },
  { src: '2026-10-15-cve-agent-autopush/2026-10-15-cve-agent-autopush.html', slug: 'cve-agent-autopush', date: '2026-10-15', tags: ['cve', 'agents', 'llm', 'automation', 'container-security'], draft: false },
  { src: '2026-10-15-omlx-071-upstream-roadmap/2026-10-15-omlx-071-upstream-roadmap.html', slug: 'omlx-071-upstream-roadmap', date: '2026-10-15', tags: ['omlx', 'llm', 'roadmap'], draft: false },
  { src: '2026-10-03-hummingbird-verification/2026-10-03-hummingbird-verification.html', slug: 'hummingbird-verification', date: '2026-10-03', tags: ['docker', 'container-security', 'cve', 'dotnet'], draft: false },
  { src: '2026-10-03-java21-libpng-cve-fix/2026-10-03-java21-libpng-cve-fix.html', slug: 'java21-libpng-cve-fix', date: '2026-10-03', tags: ['java', 'docker', 'cve', 'container-security', 'distroless'], draft: false,
    tldr: {
      summary: 'A Java 21 Alpine base image appeared stuck at one UNKNOWN CVE. It was not unpatchable — the image was built on an Alpine package snapshot old enough to predate the fix. One `RUN apk upgrade` in the Dockerfile cleared it for 3.1 MB.',
      points: [
        { k: 'The culprit', v: 'Stale package snapshot, not an unfixable CVE' },
        { k: 'The field that settled it', v: 'FixedVersion was populated — it is a to-do, not a dead end' },
        { k: 'The fix', v: 'One `apk upgrade`, 3.1 MB, cleared the remaining finding' },
      ],
    } },
  { src: '2026-10-03-ubi9-full-remediation/2026-10-03-ubi9-full-remediation.html', slug: 'ubi9-full-remediation', date: '2026-10-03', tags: ['rhel', 'ubi', 'docker', 'container-security', 'cve'], draft: false },
  { src: '2026-10-03-ubi-micro-remediation/2026-10-03-ubi-micro-remediation.html', slug: 'ubi-micro-remediation', date: '2026-10-03', tags: ['rhel', 'ubi', 'docker', 'container-security', 'cve'], draft: false },
  { src: '2026-10-03-java21-remediation-plan.md', slug: 'java21-remediation-plan', date: '2026-10-03', tags: ['java', 'docker', 'container-security', 'cve'], draft: false },
  // ---- mlx-oc series: mirrored from the mlx-oc repo blog/ (slugs strip the series number) ----
  { src: 'mlx-oc/15-sglang-on-two-mac-minis.html', slug: 'sglang-on-two-mac-minis', date: '2026-08-04', tags: ['sglang', 'llm', 'macos'], draft: false },
  { src: 'mlx-oc/1-hardware-telemetry.html', slug: 'hardware-telemetry', date: '2026-08-08', tags: ['macos', 'mlx', 'observability'], draft: false },
  { src: 'mlx-oc/2-alerting.html', slug: 'alerting', date: '2026-08-08', tags: ['observability', 'prometheus'], draft: false },
  { src: 'mlx-oc/3-dashboards.html', slug: 'dashboards', date: '2026-08-08', tags: ['observability', 'grafana'], draft: false },
  { src: 'mlx-oc/4-observability-audit.html', slug: 'observability-audit', date: '2026-08-08', tags: ['observability', 'audit'], draft: false },
  { src: 'mlx-oc/5-opik-llm-tracing.html', slug: 'opik-llm-tracing', date: '2026-08-08', tags: ['opik', 'llm', 'observability'], draft: false },
  { src: 'mlx-oc/6-opik-feedback-loop.html', slug: 'opik-feedback-loop', date: '2026-08-08', tags: ['opik', 'llm'], draft: false },
  { src: 'mlx-oc/7-mlx-inference-performance.html', slug: 'mlx-inference-performance', date: '2026-08-08', tags: ['mlx', 'llm', 'observability'], draft: false },
  { src: 'mlx-oc/8-hydra-vs-mlx-oc.html', slug: 'hydra-vs-mlx-oc', date: '2026-08-08', tags: ['observability', 'mlx'], draft: false },
  { src: 'mlx-oc/9-model-serving-resilience.html', slug: 'model-serving-resilience', date: '2026-08-08', tags: ['llm', 'mlx', 'observability'], draft: false },
  { src: 'mlx-oc/10-opik-log-streaming.html', slug: 'opik-log-streaming', date: '2026-08-08', tags: ['opik', 'observability'], draft: false },
  { src: 'mlx-oc/11-agentic-edge-cases.html', slug: 'agentic-edge-cases', date: '2026-08-08', tags: ['agents', 'llm'], draft: false },
  { src: 'mlx-oc/12-fault-error-restart-analysis.html', slug: 'fault-error-restart-analysis', date: '2026-08-08', tags: ['observability', 'grafana'], draft: false },
  { src: 'mlx-oc/13-agentic-forensics.html', slug: 'agentic-forensics', date: '2026-08-08', tags: ['agents', 'debugging'], draft: false },
  { src: 'mlx-oc/14-recommendations-decision.html', slug: 'recommendations-decision', date: '2026-08-08', tags: ['mlx', 'observability'], draft: false },
  { src: 'mlx-oc/16-mlx-distributed-options-tuning.html', slug: 'mlx-distributed-options-tuning', date: '2026-08-08', tags: ['mlx', 'observability'], draft: false },
  { src: 'mlx-oc/17-opik-dashboards.html', slug: 'opik-dashboards', date: '2026-08-08', tags: ['opik', 'observability'], draft: false },
  { src: 'mlx-oc/18-token-confidence-logprobs.html', slug: 'token-confidence-logprobs', date: '2026-08-08', tags: ['llm', 'mlx'], draft: false },
  { src: 'mlx-oc/19-observability-telemetry-and-testing.html', slug: 'observability-telemetry-and-testing', date: '2026-08-08', tags: ['observability', 'testing'], draft: false },
  { src: 'mlx-oc/20-k8s-grafana-data-path.html', slug: 'k8s-grafana-data-path', date: '2026-08-09', tags: ['kubernetes', 'grafana', 'observability'], draft: false },
  { src: 'mlx-oc/21-thunderbolt-ring-launchdaemons.html', slug: 'thunderbolt-ring-launchdaemons', date: '2026-08-09', tags: ['macos', 'networking'], draft: false },
  { src: 'mlx-oc/22-observability-dashboard-reference.html', slug: 'observability-dashboard-reference', date: '2026-08-09', tags: ['observability', 'grafana'], draft: false },

  // ---- Bucket E: 2026-10-17/18 mlx + oMLX serving series, date from the directory name ----
  { src: '2026-10-17-local-llm-mlx-serving-landscape/2026-10-17-local-llm-mlx-serving-landscape.html', slug: 'local-llm-mlx-serving-landscape', date: '2026-10-17', tags: ['llm', 'inference', 'mlx', 'apple-silicon'], draft: false },
  { src: '2026-10-17-omlx-vs-mlx-serve-benchmark/2026-10-17-omlx-vs-mlx-serve-benchmark.html', slug: 'omlx-vs-mlx-serve-benchmark', date: '2026-10-17', tags: ['mlx', 'llm', 'inference', 'prometheus'], draft: false },
  { src: '2026-10-18-mlx-architecture/2026-10-18-mlx-architecture.html', slug: 'mlx-architecture', date: '2026-10-18', tags: ['mlx', 'apple-silicon', 'inference'], draft: false },
  { src: '2026-10-18-mlx-hw-telemetry/2026-10-18-mlx-hw-telemetry.html', slug: 'mlx-hw-telemetry', date: '2026-10-18', tags: ['mlx', 'macos', 'observability', 'prometheus'], draft: false },
  { src: '2026-10-18-mlx-metrics-proxy/2026-10-18-mlx-metrics-proxy.html', slug: 'mlx-metrics-proxy', date: '2026-10-18', tags: ['mlx', 'observability', 'prometheus', 'llm'], draft: false },
  { src: '2026-10-18-mtp-multi-token-prediction/2026-10-18-mtp-multi-token-prediction.html', slug: 'mtp-multi-token-prediction', date: '2026-10-18', tags: ['llm', 'inference', 'mlx'], draft: false },
  { src: '2026-10-18-omlx-speculative-decoding/2026-10-18-omlx-speculative-decoding.html', slug: 'omlx-speculative-decoding', date: '2026-10-18', tags: ['mlx', 'llm', 'inference', 'debugging'], draft: false },
  { src: '2026-10-18-omlx-tiered-ssd-cache/2026-10-18-omlx-tiered-ssd-cache.html', slug: 'omlx-tiered-ssd-cache', date: '2026-10-18', tags: ['mlx', 'llm', 'inference', 'macos'], draft: false },
  { src: '2026-10-18-transformer-architecture/2026-10-18-transformer-architecture.html', slug: 'transformer-architecture', date: '2026-10-18', tags: ['llm', 'inference', 'architecture'], draft: false },
];
