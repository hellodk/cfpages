const TAG_ACCENTS: Record<string, string> = {
  kubernetes: '#326ce5',
  devops: '#e5645e',
  prometheus: '#e6522c',
  monitoring: '#e6522c',
  cassandra: '#1287b1',
  homelab: '#6f42c1',
  macos: '#555555',
  graphify: '#0d9488',
  kri: '#2563eb',
  tokens: '#d97706',
};

export function tagAccent(tag: string): string {
  return TAG_ACCENTS[tag.toLowerCase()] ?? '#738a94';
}
