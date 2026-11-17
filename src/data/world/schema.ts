import { z } from 'astro/zod';

/** Region groups on the International Tours page, in display order. */
export const WORLD_REGIONS = [
  'Neighbouring Countries',
  'Southeast Asia',
  'Middle East',
  'Central Asia & Caucasus',
  'Island Destinations',
  'Europe',
  'East Asia',
  'Australia & Pacific',
  'Africa',
  'North & South America',
] as const;

export const countrySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  region: z.enum(WORLD_REGIONS),
  /** Short evocative line, max ~70 characters. */
  tagline: z.string(),
  /** 4–6 must-visit cities or places. */
  places: z.array(z.string()).min(4).max(6),
  bestTime: z.string(),
  idealDuration: z.string(),
  /** Visa note for Indian passport holders, kept general, e.g. "Visa on arrival" or "e-Visa". */
  visa: z.string(),
  /** English Wikipedia article whose lead image becomes the card photo. */
  photoArticle: z.string(),
  photoAlt: z.string(),
});

export type Country = z.infer<typeof countrySchema>;

const placeList = z.array(z.object({ name: z.string(), blurb: z.string() }));

/** Long-form content for a country's own page, from ./details/*.json keyed by slug. */
export const detailSchema = z.object({
  capital: z.string(),
  currency: z.string(),
  intro: z.string(),
  destinations: placeList.min(4),
  devotional: placeList.min(1),
  dishes: z.array(z.object({ name: z.string(), blurb: z.string(), veg: z.boolean() })).min(3),
  highlights: z.array(z.string()).min(4),
  indianTraveller: z.string(),
});

export type CountryDetail = z.infer<typeof detailSchema>;
