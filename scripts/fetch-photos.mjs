// Downloads one Wikimedia Commons photo per Indian state/UT (src/assets/india/) and per
// international country (src/assets/world/), and records author + licence in each
// set's photo-credits.json so the pages can credit them. Re-run after changing a
// `photoArticle`; existing files are skipped unless --force is passed.
//
//   node scripts/fetch-photos.mjs [--force]

import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const force = process.argv.includes('--force');
const UA = 'CharrishTravelsSiteBuilder/1.0 (https://charrishtravels.com)';
const WIDTH = 1280;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikimedia rate-limits bursts with 429s; back off and retry rather than fail.
const get = async (url, attempt = 0) => {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (res.status === 429 && attempt < 6) {
    const wait = Math.min(Number(res.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt, 60_000);
    console.log(`  429, waiting ${wait / 1000}s`);
    await sleep(wait);
    return get(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
};

const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function leadImageFile(article) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(article)}`;
  const data = await (await get(url)).json();
  const page = Object.values(data.query.pages)[0];
  if (!page.pageimage) throw new Error(`no lead image for "${article}"`);
  return page.pageimage;
}

async function commonsInfo(file) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=${WIDTH}&titles=${encodeURIComponent('File:' + file)}`;
  const data = await (await get(url)).json();
  const info = Object.values(data.query.pages)[0].imageinfo?.[0];
  if (!info) throw new Error(`no Commons info for ${file}`);
  // Logos, maps and diagrams are SVG; only photographs make sense on a card.
  if (!/^image\/(jpeg|png|webp)$/.test(info.mime)) throw new Error(`${file} is ${info.mime}, not a photo`);
  const m = info.extmetadata ?? {};
  return {
    url: info.thumburl ?? info.url,
    mime: info.thumbmime ?? info.mime,
    artist: strip(m.Artist?.value) || 'Unknown author',
    license: strip(m.LicenseShortName?.value) || 'See source',
    licenseUrl: m.LicenseUrl?.value ?? null,
    sourceUrl: info.descriptionurl,
  };
}

const extFor = (mime) => ({ 'image/png': 'png', 'image/webp': 'webp' })[mime] ?? 'jpg';

// Each set: which JSON files list the photos, and where the photos and credits go.
const SETS = [
  { data: 'src/data/india', files: (f) => f.startsWith('regions/'), assets: 'src/assets/india' },
  { data: 'src/data/world', files: (f) => /^countries-.*\.json$/.test(f), assets: 'src/assets/world' },
];

const listJson = async (dir) => {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const f of await fs.readdir(path.join(dir, entry.name))) out.push(`${entry.name}/${f}`);
    } else out.push(entry.name);
  }
  return out.filter((f) => f.endsWith('.json'));
};

let totalJobs = 0;
const failures = [];
for (const set of SETS) {
  const dataDir = path.join(root, set.data);
  const assetDir = path.join(root, set.assets);
  const creditsFile = path.join(dataDir, 'photo-credits.json');
  const jobs = [];
  try {
    for (const f of (await listJson(dataDir)).filter(set.files)) {
      for (const r of JSON.parse(await fs.readFile(path.join(dataDir, f), 'utf8'))) {
        jobs.push({ key: r.slug, article: r.photoArticle });
      }
    }
  } catch {
    continue; // set not present yet
  }
  totalJobs += jobs.length;

  await fs.mkdir(assetDir, { recursive: true });
  let credits = {};
  try {
    credits = JSON.parse(await fs.readFile(creditsFile, 'utf8'));
  } catch {}

  const existing = new Set(await fs.readdir(assetDir));
  for (const job of jobs) {
    const have = [...existing].find((f) => f.replace(/\.\w+$/, '') === job.key);
    if (have && credits[job.key]?.article === job.article && !force) continue;
    try {
      const file = await leadImageFile(job.article);
      const info = await commonsInfo(file);
      const ext = extFor(info.mime);
      const buf = Buffer.from(await (await get(info.url)).arrayBuffer());
      if (have) await fs.rm(path.join(assetDir, have));
      await fs.writeFile(path.join(assetDir, `${job.key}.${ext}`), buf);
      const { url, mime, ...rest } = info;
      credits[job.key] = { article: job.article, file, ...rest };
      console.log(`ok   ${job.key}  <- ${file}`);
    } catch (err) {
      failures.push(job.key);
      console.error(`FAIL ${job.key}: ${err.message}`);
    }
    await sleep(3000);
  }

  const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
  await fs.writeFile(creditsFile, JSON.stringify(sorted, null, 2) + '\n');
}

console.log(`\n${totalJobs - failures.length}/${totalJobs} photos present.`);
if (failures.length) process.exitCode = 1;
