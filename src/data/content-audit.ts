export type ContentStatus = 'clean' | 'thin' | 'html-heavy' | 'migration-junk';

export interface AuditedPost {
  slug: string;
  title: string;
  status: ContentStatus;
  note: string;
  autoFix: 'done' | 'ready' | 'manual';
}

export const contentAudit = {
  scanned: 22,
  summary: {
    clean: 9,
    thin: 4,
    htmlHeavy: 6,
    migrationJunk: 3,
  },
  posts: [
    { slug: 'kubernetes-monitoring', title: 'Kubernetes Monitoring', status: 'clean', note: 'Full markdown — no action needed.', autoFix: 'done' },
    { slug: 'pnpm-smarter-package-manager', title: 'pnpm: The Package Manager…', status: 'clean', note: 'Full markdown — no action needed.', autoFix: 'done' },
    { slug: 'kube-dns-split-dns-ubuntu24', title: 'Kubernetes Split DNS on Ubuntu 24.04', status: 'clean', note: 'Full markdown — no action needed.', autoFix: 'done' },
    { slug: 'kri-fleet-management', title: 'kri: Fleet Management Platform', status: 'clean', note: 'Full markdown — no action needed.', autoFix: 'done' },
    { slug: 'graphify-token-enforcement', title: '406 Million Wasted Tokens…', status: 'clean', note: 'Full markdown — no action needed.', autoFix: 'done' },
    { slug: 'gnome-thumbnails-broke', title: 'GNOME Thumbnails Broke', status: 'clean', note: 'Full markdown — no action needed.', autoFix: 'done' },
    { slug: 'working-with-aureport', title: 'Working with aureport', status: 'clean', note: 'Good structure — optional light edit.', autoFix: 'done' },
    { slug: 'dns-explained', title: 'DNS Explained', status: 'clean', note: 'Rewritten from panel scratch notes.', autoFix: 'done' },
    { slug: 'hellodk-jekyll-to-astro-cloudflare-migration', title: 'Jekyll → Astro Migration', status: 'clean', note: 'Meta post — publish when ready.', autoFix: 'done' },

    { slug: 'exploring-top-command', title: 'Exploring the Linux top Command', status: 'thin', note: 'Body is QEMU/Vagrant commands — wrong topic entirely.', autoFix: 'ready' },
    { slug: 'generating-ssl-certificates', title: 'Generating SSL Certificates', status: 'thin', note: 'Stub — only a few lines.', autoFix: 'ready' },
    { slug: 'vagrant-with-qemu-kvm', title: 'Vagrant with QEMU/KVM', status: 'thin', note: 'Command fragments, not an article.', autoFix: 'ready' },
    { slug: 'understanding-dns', title: 'Understanding DNS Records', status: 'thin', note: 'Prose exists but wrapped in <html> tags, no headings.', autoFix: 'ready' },

    { slug: 'kubernetes-cluster-vagrant', title: 'Kubernetes Cluster on Vagrant', status: 'html-heavy', note: 'Legacy HTML lists — readable but ugly.', autoFix: 'ready' },
    { slug: 'mysql-master-master-replication', title: 'MySQL Master-Master Replication', status: 'html-heavy', note: 'Legacy HTML from Jekyll.', autoFix: 'ready' },
    { slug: 'understanding-lvm-basics', title: 'Understanding LVM Basics', status: 'html-heavy', note: 'Heavy <ul>/<code> HTML.', autoFix: 'ready' },
    { slug: 'yum-commands-quick-reference', title: 'Yum Commands Quick Reference', status: 'html-heavy', note: 'HTML table/list reference.', autoFix: 'ready' },
    { slug: 'the-road-to-a-kingdom', title: 'The Road to Kingdom', status: 'html-heavy', note: 'Fiction — HTML paragraphs.', autoFix: 'manual' },
    { slug: 'how-to-pass-datastax-cassandra-administrator-certification', title: 'DataStax Cassandra Cert', status: 'html-heavy', note: 'Body may be wrong post (K8s text) — verify source.', autoFix: 'manual' },

    { slug: 'kri-knowledge-graph-graphify', title: 'kri + graphify Knowledge Graph', status: 'migration-junk', note: 'Chirping sidebar chrome in body.', autoFix: 'ready' },
    { slug: 'macos-vms-tart-salt', title: 'macOS VMs with tart + Salt', status: 'migration-junk', note: 'Broken heading lines + layout debris.', autoFix: 'ready' },
    { slug: 'browser-rdp-zero-ports', title: 'Browser RDP Zero Ports', status: 'migration-junk', note: 'Liquid/code-fence artifacts possible.', autoFix: 'ready' },
  ] as AuditedPost[],
};

export const userTasks = [
  {
    id: 'env',
    title: 'Cloudflare environment variables',
    detail: 'Set PUBLIC_GISCUS_*, PUBLIC_BREVO_FORM_URL, PUBLIC_GA4_ID, PUBLIC_GOATCOUNTER_CODE, PUBLIC_CF_BEACON_TOKEN in Pages dashboard.',
    doc: 'docs/LAUNCH-CHECKLIST.md',
  },
  {
    id: 'ai',
    title: 'Workers AI binding',
    detail: 'Bind Workers AI as AI in Cloudflare Pages → Functions. Without this, chat uses search-only fallback.',
    doc: 'wrangler.toml',
  },
  {
    id: 'brevo-secret',
    title: 'Contact form secret',
    detail: 'Add BREVO_API_KEY + CONTACT_* emails as encrypted vars for /api/contact.',
    doc: '.env.example',
  },
  {
    id: 'dns',
    title: 'Domain redirects',
    detail: 'Configure hellodk.in → hellodk.io and www → apex in Cloudflare Bulk Redirects.',
    doc: 'docs/cloudflare-dns.md',
  },
  {
    id: 'fiction',
    title: 'Personal / fiction posts',
    detail: 'Review The Road to a Kingdom and any draft fiction — only you can judge tone and privacy.',
    doc: null,
  },
  {
    id: 'covers',
    title: 'Custom cover images (optional)',
    detail: 'Add cover: "assets/images/..." to frontmatter on posts you want a specific thumbnail. Others use tag defaults.',
    doc: null,
  },
  {
    id: 'proofread',
    title: 'Proofread after auto-rewrite',
    detail: 'When we restore posts from _jekyll-backup, skim for accuracy — especially tutorials with version-specific commands.',
    doc: null,
  },
  {
    id: 'drafts',
    title: '44 legacy drafts',
    detail: 'Files in _drafts/ and _jekyll-backup/_drafts/ — decide publish, merge, or archive.',
    doc: null,
  },
];

export const agentTasks = [
  'Run scripts/fix-empty-posts.mjs against _jekyll-backup HTML sources',
  'Convert html-heavy posts to clean markdown (headings, lists, code blocks)',
  'Rewrite thin posts from backup or scratch using original intent',
  'Strip Chirping migration junk (On This Page, sidebar blocks)',
  'Fix wrong-body duplicates (e.g. Cassandra cert vs K8s cluster)',
  'Add cover: fields where legacy posts had images',
];
