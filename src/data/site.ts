/** Site identity — from legacy _config.yml (Jasper / hellodk.io). */
export const site = {
  title: 'hellodk.io',
  /** Homepage hero headline (was `site.name` in Jekyll). */
  name: 'Curiosity is the most powerful thing you own',
  /** Homepage hero subline (was `site.description` in Jekyll). */
  description:
    'A beautiful narrative written over an elegant publishing platform. The story begins here...',
  author: 'Deepak Gupta',
  tagline: 'DevOps · SRE · Homelab',
  /**
   * One line of scale under the narrative. Anchored to a fixed year rather
   * than a running total — "fifteen years" is wrong the moment a year turns
   * and nobody is watching the string. No employer is named: the homepage is
   * a blog surface, and `scripts/check-secrets.mjs` enforces that.
   */
  heroScale:
    'Platform Engineering. Securing and running production systems across banking, gaming and e-commerce since 2011 — secure CI/CD, Kubernetes, MLOps, Observability. I write up the failures in detail: what broke, what the graphs showed, and what actually fixed it.',
  /** Practical one-liner under the Jasper quote (Chirping hero). */
  heroTagline: 'Home Labber — Notes from the Trenches',
  /** Closing flourish, in place of a CTA button row. */
  heroJourney: 'The Journey Begins here…',
  homeCover: '/assets/images/cover1.jpg',
} as const;
