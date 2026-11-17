import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import { regionSchema, type Region } from './schema';
import credits from './photo-credits.json';
import placeholderPhoto from '../../assets/hero/himalayan-snow-pass.jpg';

export type { Region };

export interface PhotoCredit {
  artist: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

export interface Dish {
  name: string;
  blurb: string;
  veg: boolean;
}

export interface RegionWithPhoto extends Region {
  photo: ImageMetadata;
  credit: PhotoCredit;
  dishes: Dish[];
}

const dishSchema = z.record(
  z.string(),
  z.array(z.object({ name: z.string(), blurb: z.string(), veg: z.boolean() })).min(3),
);

// Every batch file under ./regions is parsed and validated at build time, so a typo
// in the content fails the build instead of shipping a broken page.
const batches = import.meta.glob<unknown>('./regions/*.json', { eager: true, import: 'default' });
// Famous dishes live in ./dishes/*.json, each an object keyed by region slug.
const dishFiles = import.meta.glob<unknown>('./dishes/*.json', { eager: true, import: 'default' });
const dishesBySlug: Record<string, Dish[]> = Object.assign(
  {},
  ...Object.entries(dishFiles).map(([file, data]) => {
    const parsed = dishSchema.safeParse(data);
    if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
    return parsed.data;
  }),
);

const dishesFor = (slug: string): Dish[] => {
  const d = dishesBySlug[slug];
  if (!d) {
    if (import.meta.env.DEV) return [];
    throw new Error(`No famous dishes for ${slug} in src/data/india/dishes/`);
  }
  return d;
};

const photos = import.meta.glob<ImageMetadata>('../../assets/india/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

const photoFor = (key: string): ImageMetadata => {
  const hit = Object.entries(photos).find(([p]) => p.split('/').pop()!.replace(/\.\w+$/, '') === key);
  if (!hit) {
    const msg = `Missing photo src/assets/india/${key}.* — run: node scripts/fetch-photos.mjs`;
    // In dev, show a stand-in so pages still render while photos download.
    if (import.meta.env.DEV) return placeholderPhoto;
    throw new Error(msg);
  }
  return hit[1];
};

const creditFor = (key: string): PhotoCredit => {
  const c = (credits as Record<string, PhotoCredit>)[key];
  if (!c) {
    if (import.meta.env.DEV) return { artist: 'pending', license: 'pending', licenseUrl: null, sourceUrl: '#' };
    throw new Error(`Missing photo credit for ${key} in photo-credits.json`);
  }
  return c;
};

const regions: RegionWithPhoto[] = Object.entries(batches)
  .flatMap(([file, data]) => {
    const parsed = z.array(regionSchema).safeParse(data);
    if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
    return parsed.data;
  })
  .map((r) => ({ ...r, photo: photoFor(r.slug), credit: creditFor(r.slug), dishes: dishesFor(r.slug) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

export const allRegions = regions;
export const states = regions.filter((r) => r.kind === 'state');
export const unionTerritories = regions.filter((r) => r.kind === 'ut');
export const regionBySlug = (slug: string) => regions.find((r) => r.slug === slug);

export const regionHref = (slug: string) => `/india/${slug}`;
