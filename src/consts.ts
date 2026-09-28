export const SITE = {
  name: 'Charrish Travels',
  tagline: 'Expertise beyond borders',
  logo: '/images/logo.svg',
  logoWhite: '/images/logo-white.svg',
  phone: '+91 98667 11775',
  whatsapp: '919866711775',
  email: 'admin@charrishtravels.com',
  location: 'Hyderabad, India',
  instagram: 'https://instagram.com/charrishtravels',
  facebook: 'https://facebook.com/charrishtravels',
};

/** The Tours menu, the three category listings and every tour URL are driven by this. */
export const TOUR_CATEGORIES = [
  {
    slug: 'domestic',
    label: 'Domestic Tours',
    blurb: 'Journeys across India, planned around your pace, your people and your dates.',
  },
  {
    slug: 'temple',
    label: 'Temple Tours',
    blurb: 'Pilgrimage circuits built around darshan timings, travel comfort and on-ground assistance.',
  },
  {
    slug: 'international',
    label: 'International Tours',
    blurb: 'Overseas itineraries with visas, transfers and local guidance handled end to end.',
  },
] as const;

export type TourCategory = (typeof TOUR_CATEGORIES)[number]['slug'];

export const tourHref = (category: string, id: string) => `/tours/${category}/${id}`;
