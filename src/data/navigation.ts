/** Classic hellodk.io sidebar — matches legacy Jasper menu + LLM section. */

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const mainNav: NavItem[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/about', label: 'About', icon: 'about' },
  { href: '/tag/databases', label: 'Databases', icon: 'databases' },
  { href: '/tag/devops', label: 'DevOps', icon: 'devops' },
  { href: '/tag/fiction', label: 'Fiction', icon: 'fiction' },
  { href: '/tag/mlops', label: 'MLOps', icon: 'mlops' },
  { href: '/tag/travel', label: 'Travel', icon: 'travel' },
  { href: '/resume', label: 'Resume', icon: 'resume' },
  { href: '/tag/photography', label: 'Photography', icon: 'photography' },
  { href: '/author', label: 'Author', icon: 'author' },
];

export const llmNav: NavItem[] = [
  { href: '/tag/llm', label: 'LLM', icon: 'llm' },
  { href: '/tag/machine-learning', label: 'Machine Learning', icon: 'machine-learning' },
  { href: '/tag/ai-agents', label: 'AI Agents', icon: 'ai-agents' },
  { href: '/tag/claude-code', label: 'Claude Code', icon: 'claude-code' },
  { href: '/tag/mlx', label: 'MLX', icon: 'mlx' },
  { href: '/tag/graphify', label: 'Graphify', icon: 'graphify' },
];

const tagFromHref = (href: string) =>
  href.startsWith('/tag/') ? href.slice('/tag/'.length) : null;

/** Tag slugs linked from nav — build empty tag pages even with no posts yet. */
export const navTagSlugs = [
  ...new Set(
    [...mainNav, ...llmNav]
      .map((item) => tagFromHref(item.href))
      .filter((tag): tag is string => Boolean(tag)),
  ),
];

export function isNavActive(href: string, currentPath: string): boolean {
  if (href === '/') return currentPath === '/';
  if (href.startsWith('/tag/')) {
    return currentPath === href || currentPath.startsWith(`${href}/`);
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}
