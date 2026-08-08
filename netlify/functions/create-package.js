import { dump as dumpYaml } from 'js-yaml';
import { jsonResponse, getIdentityUser } from './_supabase.js';

const GITHUB_API = 'https://api.github.com';
const CONTENT_DIR = 'src/content/destinations';

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

// Builds the frontmatter object in a fixed key order, omitting empty
// optional fields so the generated markdown stays clean and readable.
function buildFrontmatter(pkg) {
  const fm = {
    title: pkg.title,
    location: pkg.location,
    summary: pkg.summary,
    heroImage: pkg.heroImage,
    duration: pkg.duration,
    featured: Boolean(pkg.featured),
  };

  if (pkg.priceFrom) fm.priceFrom = Number(pkg.priceFrom);
  if (pkg.route) fm.route = pkg.route;
  if (pkg.departureDates) fm.departureDates = pkg.departureDates;
  if (pkg.groupSize) fm.groupSize = pkg.groupSize;
  if (pkg.vehicle) fm.vehicle = pkg.vehicle;

  if (Array.isArray(pkg.highlights) && pkg.highlights.length > 0) {
    fm.highlights = pkg.highlights;
  }

  if (pkg.travelArrangements && Object.values(pkg.travelArrangements).some(Boolean)) {
    fm.travelArrangements = pkg.travelArrangements;
  }

  if (pkg.assistance && (pkg.assistance.places?.length > 0 || pkg.assistance.note)) {
    fm.assistance = {
      places: pkg.assistance.places || [],
      ...(pkg.assistance.note ? { note: pkg.assistance.note } : {}),
    };
  }

  if (pkg.specialExperience?.title && pkg.specialExperience?.body) {
    fm.specialExperience = pkg.specialExperience;
  }

  if (Array.isArray(pkg.itinerary) && pkg.itinerary.length > 0) {
    fm.itinerary = pkg.itinerary.map((day) => ({
      day: Number(day.day),
      ...(day.date ? { date: day.date } : {}),
      title: day.title,
      details: day.details,
    }));
  }

  if (Array.isArray(pkg.importantNotes) && pkg.importantNotes.length > 0) {
    fm.importantNotes = pkg.importantNotes;
  }

  return fm;
}

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const user = getIdentityUser(context);
  if (!user) {
    return jsonResponse(401, { error: 'Login required' });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'Charrishtravels/Charrish_Travels';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token) {
    return jsonResponse(500, { error: 'Missing GITHUB_TOKEN environment variable' });
  }

  let pkg;
  try {
    pkg = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const required = ['title', 'location', 'summary', 'heroImage', 'duration'];
  const missing = required.filter((key) => !pkg[key]);
  if (missing.length > 0) {
    return jsonResponse(400, { error: `Missing required fields: ${missing.join(', ')}` });
  }

  const slug = slugify(pkg.title);
  if (!slug) {
    return jsonResponse(400, { error: 'Could not derive a filename from the title' });
  }
  const path = `${CONTENT_DIR}/${slug}.md`;

  const existingRes = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`,
    { headers: githubHeaders(token) }
  );
  if (existingRes.status === 200) {
    return jsonResponse(409, {
      error: `A package already exists at ${path}. Edit it via the CMS instead, or change the title.`,
    });
  }
  if (existingRes.status !== 404) {
    return jsonResponse(502, { error: 'Could not check GitHub for an existing file' });
  }

  const frontmatter = buildFrontmatter(pkg);
  const yamlText = dumpYaml(frontmatter, { lineWidth: -1, noRefs: true });
  const body = (pkg.body || '').trim();
  const fileContent = `---\n${yamlText}---\n\n${body}\n`;

  const commitRes = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify({
      message: `Add package: ${pkg.title}`,
      content: Buffer.from(fileContent, 'utf8').toString('base64'),
      branch,
    }),
  });

  if (!commitRes.ok) {
    const errorBody = await commitRes.text();
    return jsonResponse(502, { error: 'GitHub commit failed', detail: errorBody });
  }

  return jsonResponse(201, { ok: true, path, slug, url: `/destinations/${slug}` });
}
