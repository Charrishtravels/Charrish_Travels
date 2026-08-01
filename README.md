# Charrish Travels

Mobile-first travel portfolio site — Astro + Tailwind CSS, Decap CMS for content, Netlify Functions + Supabase for the review moderation flow.

## Stack

- **Frontend:** Astro + Tailwind CSS
- **Content (destinations, packages, gallery, testimonials, FAQ):** Decap CMS at `/admin`, git-backed via Netlify Identity + Git Gateway
- **Hosting:** Netlify
- **Reviews:** public submission form → Supabase (`pending`) → admin dashboard at `/admin/reviews` (Netlify Identity–gated) → approve/reject → published on `/testimonials`

## Local development

```sh
npm install
npm run dev
```

Site runs at `http://localhost:4321`.

## One-time setup before deploying

1. **Netlify site:** connect this repo, enable **Identity** and **Git Gateway** (Site settings → Identity), and invite yourself as the first Identity user — that account logs into both `/admin` (Decap CMS) and `/admin/reviews`.
2. **Supabase project:** create one, then run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor to create the `reviews` table.
3. **Environment variables** (Netlify site settings → Environment variables, see [`.env.example`](.env.example)):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API in Supabase — keep this secret, it's only ever used server-side inside Netlify Functions)
4. Update the placeholder contact details and socials in [`src/consts.ts`](src/consts.ts).
5. Replace the placeholder image paths (`/images/...`) referenced in `src/content/**` with real photos, either by editing the Markdown directly or uploading through Decap CMS once Git Gateway is live.

## Commands

| Command           | Action                                      |
| :----------------- | :------------------------------------------ |
| `npm install`       | Install dependencies                        |
| `npm run dev`       | Start local dev server at `localhost:4321`  |
| `npm run build`     | Build production site to `./dist/`          |
| `npm run preview`   | Preview the production build locally        |
