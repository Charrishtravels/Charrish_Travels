import { z } from 'astro/zod';

/**
 * One Indian state or union territory in the Domestic Tours directory.
 * Content lives in ./regions/*.json, one file per alphabetical batch; photos live in
 * src/assets/india/<slug>.jpg with their credits in ./photo-credits.json.
 */
export const regionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  kind: z.enum(['state', 'ut']),
  capital: z.string(),
  zone: z.enum(['North', 'South', 'East', 'West', 'Central', 'North-East', 'Islands']),
  /** Short evocative line under the name, max ~70 characters. */
  tagline: z.string(),
  /** 2–3 sentences introducing the region as a travel destination. */
  intro: z.string(),
  bestTime: z.string(),
  idealDuration: z.string(),
  /** English Wikipedia article title whose lead image becomes the card photo. */
  photoArticle: z.string(),
  photoAlt: z.string(),
  /** Non-devotional places: nature, heritage, cities, beaches, wildlife. No places of worship. */
  destinations: z
    .array(
      z.object({
        name: z.string(),
        /** One sentence on why to go. */
        blurb: z.string(),
      }),
    )
    .min(4),
  /** Temples, shrines, mosques, churches, gurdwaras, monasteries and pilgrimage towns. */
  devotional: z
    .array(
      z.object({
        name: z.string(),
        blurb: z.string(),
      }),
    )
    .min(2),
  highlights: z.array(z.string()).min(5),
  itineraries: z
    .array(
      z.object({
        title: z.string(),
        duration: z.string(),
        days: z.array(z.object({ title: z.string(), details: z.string() })).min(2),
      }),
    )
    .min(2),
});

export type Region = z.infer<typeof regionSchema>;
