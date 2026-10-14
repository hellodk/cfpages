import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    description: z.string(),
    tags: z.array(z.coerce.string()).default([]),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
    // Per-post TL;DR panel. Absent on most posts — the layout renders the
    // panel only when present, so no post ever shows another post's summary.
    tldr: z.object({
      summary: z.string(),
      points: z.array(z.object({ k: z.string(), v: z.string() })).max(4),
    }).optional(),
  }),
});

export const collections = { blog };
