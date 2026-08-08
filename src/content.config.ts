import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const destinations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/destinations' }),
  schema: z.object({
    title: z.string(),
    location: z.string(),
    summary: z.string(),
    heroImage: z.string(),
    priceFrom: z.number().optional(),
    duration: z.string(),
    featured: z.boolean().default(false),

    // Trip logistics (optional — only used for detailed tour packages)
    route: z.string().optional(),
    departureDates: z.string().optional(),
    groupSize: z.string().optional(),
    vehicle: z.string().optional(),

    highlights: z.array(z.string()).default([]),

    travelArrangements: z
      .object({
        vehicle: z.string().optional(),
        group: z.string().optional(),
        water: z.string().optional(),
        breakfast: z.string().optional(),
        lunch: z.string().optional(),
        dinner: z.string().optional(),
      })
      .optional(),

    assistance: z
      .object({
        places: z.array(z.string()).default([]),
        note: z.string().optional(),
      })
      .optional(),

    specialExperience: z
      .object({
        title: z.string(),
        body: z.string(),
      })
      .optional(),

    itinerary: z
      .array(
        z.object({
          day: z.number(),
          date: z.string().optional(),
          title: z.string(),
          details: z.string(),
        })
      )
      .default([]),

    importantNotes: z.array(z.string()).default([]),
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
