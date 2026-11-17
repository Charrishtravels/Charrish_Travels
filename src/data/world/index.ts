import type { ImageMetadata } from 'astro';
import { z } from 'astro/zod';
import { countrySchema, detailSchema, WORLD_REGIONS, type Country, type CountryDetail } from './schema';
import credits from './photo-credits.json';
import placeholderPhoto from '../../assets/hero/wat-arun-bangkok.jpg';

export { WORLD_REGIONS };

export interface PhotoCredit {
  artist: string;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

/** Continents, in display order on the International Tours page. */
export const CONTINENTS = ['Asia', 'Europe', 'Africa', 'Oceania', 'North America', 'South America'] as const;
export type Continent = (typeof CONTINENTS)[number];

// Each sub-region sits on one continent, except the two mixed groups resolved per country.
const CONTINENT_OF_REGION: Partial<Record<Country['region'], Continent>> = {
  'Neighbouring Countries': 'Asia',
  'Southeast Asia': 'Asia',
  'Middle East': 'Asia',
  'Central Asia & Caucasus': 'Asia',
  'East Asia': 'Asia',
  Europe: 'Europe',
  Africa: 'Africa',
  'Australia & Pacific': 'Oceania',
};
const CONTINENT_OF_COUNTRY: Record<string, Continent> = {
  maldives: 'Asia',
  'sri-lanka': 'Asia',
  mauritius: 'Africa',
  seychelles: 'Africa',
  tanzania: 'Africa',
  usa: 'North America',
  canada: 'North America',
  mexico: 'North America',
  brazil: 'South America',
  argentina: 'South America',
  peru: 'South America',
  chile: 'South America',
};

const continentOf = (c: Country): Continent => {
  const continent = CONTINENT_OF_COUNTRY[c.slug] ?? CONTINENT_OF_REGION[c.region];
  if (!continent) throw new Error(`No continent for ${c.slug} (region "${c.region}") in data/world/index.ts`);
  return continent;
};

export interface CountryWithPhoto extends Country {
  continent: Continent;
  photo: ImageMetadata;
  credit: PhotoCredit;
  /** Null only in dev while the details files are still being written. */
  details: CountryDetail | null;
}

// Content: ./countries-*.json and ./details/*.json, validated at build time.
const countryFiles = import.meta.glob<unknown>('./countries-*.json', { eager: true, import: 'default' });
const detailFiles = import.meta.glob<unknown>('./details/*.json', { eager: true, import: 'default' });
const detailsBySlug: Record<string, CountryDetail> = Object.assign(
  {},
  ...Object.entries(detailFiles).map(([file, data]) => {
    const parsed = z.record(z.string(), detailSchema).safeParse(data);
    if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
    return parsed.data;
  }),
);

const detailsFor = (slug: string): CountryDetail | null => {
  const d = detailsBySlug[slug];
  if (d) return d;
  if (import.meta.env.DEV) return null;
  throw new Error(`No details for ${slug} in src/data/world/details/`);
};

const photos = import.meta.glob<ImageMetadata>('../../assets/world/*.{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

const photoFor = (slug: string): ImageMetadata => {
  const hit = Object.entries(photos).find(([p]) => p.split('/').pop()!.replace(/\.\w+$/, '') === slug);
  if (hit) return hit[1];
  // In dev, a stand-in keeps the page rendering while photos download.
  if (import.meta.env.DEV) return placeholderPhoto;
  throw new Error(`Missing photo src/assets/world/${slug}.* — run: node scripts/fetch-photos.mjs`);
};

const creditFor = (slug: string): PhotoCredit => {
  const c = (credits as Record<string, PhotoCredit>)[slug];
  if (c) return c;
  if (import.meta.env.DEV) return { artist: 'pending', license: 'pending', licenseUrl: null, sourceUrl: '#' };
  throw new Error(`Missing photo credit for ${slug} in src/data/world/photo-credits.json`);
};

const parse = <T>(schema: z.ZodType<T>, files: Record<string, unknown>): T[] =>
  Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([file, data]) => {
      const parsed = z.array(schema).safeParse(data);
      if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
      return parsed.data;
    });


export const countries: CountryWithPhoto[] = parse(countrySchema, countryFiles).map((c) => ({
  ...c,
  continent: continentOf(c),
  photo: photoFor(c.slug),
  credit: creditFor(c.slug),
  details: detailsFor(c.slug),
}));

export const countryHref = (slug: string) => `/world/${slug}`;

/** Countries grouped by continent, A–Z within each. */
export const countriesByContinent = CONTINENTS.map((continent) => ({
  continent,
  slug: continent.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  countries: countries
    .filter((c) => c.continent === continent)
    .sort((a, b) => a.name.localeCompare(b.name, 'en')),
})).filter((g) => g.countries.length > 0);
