import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const destinations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/destinations' }),
  schema: z.object({
    title: z.string(),
    location: z.string(),
    summary: z.string(),
    heroImage: z.string(),
    priceFrom: z.number(),
    duration: z.string(),
    highlights: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
  }),
});

const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/testimonials' }),
  schema: z.object({
    name: z.string(),
    location: z.string().optional(),
    rating: z.number().min(1).max(5),
    photo: z.string().optional(),
  }),
});

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gallery' }),
  schema: z.object({
    image: z.string(),
    caption: z.string().optional(),
    order: z.number().default(0),
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    order: z.number().default(0),
  }),
});

export const collections = { destinations, testimonials, gallery, faq };
