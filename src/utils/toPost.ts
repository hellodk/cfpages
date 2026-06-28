import type { CollectionEntry } from 'astro:content';
import { resolvePostCover } from './postCover';
import { readingTime } from './readingTime';

export type PostSummary = {
  slug: string;
  title: string;
  description: string;
  date: Date;
  tags: string[];
  cover: string;
  readingTime: number;
};

export function toPost(entry: CollectionEntry<'blog'>): PostSummary {
  return {
    slug: entry.id,
    title: entry.data.title,
    description: entry.data.description,
    date: entry.data.date,
    tags: entry.data.tags,
    cover: resolvePostCover(entry.id, entry.data.cover, entry.data.tags, entry.body),
    readingTime: readingTime(entry.body ?? ''),
  };
}
