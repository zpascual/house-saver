# HouseSaver

Free-only rental tracker for South Bay / Santa Cruz move planning. Save homes from Zillow, Redfin, or Craigslist, clean up imported details, compare commute rank across up to three weighted points of interest, and view homes in both table and map layouts.

## What is built

- Next.js App Router + TypeScript + Tailwind 4
- Local demo repository with seeded homes, POIs, scores, and police snapshots
- Drizzle schema and config for a future Supabase Postgres deployment
- Best-effort URL import for Zillow, Redfin, and Craigslist
- Manual listing editing with address suggestions
- Commute ranking with cached route metrics
- Police activity coverage model with `supported`, `approximate`, and `unavailable`
- Map view using Mapbox tiles when a token is present

## External services

- Supabase Free: auth + Postgres when you add credentials
- Mapbox: map tiles, address search, and driving directions

Without those env vars, the app still runs in local demo mode using seeded South Bay data and a small built-in address catalog.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

These are optional for local demo mode, but needed for live APIs and production persistence:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
CRON_SECRET=
```

## Vercel deployment

1. Import the GitHub repo into Vercel.
2. Add these Production environment variables in Vercel:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
CRON_SECRET=
ENABLE_INVITE_ONLY_AUTH=true
```

3. In Supabase, set your Auth redirect URL to:

```bash
https://YOUR_DOMAIN/auth/callback
```

4. Add invited workspace member emails to the backing data store before turning auth on.
5. The included [vercel.json](/Users/zacharypascual/git/personal/housesaver/vercel.json) schedules a daily call to `/api/cron/police-sync`. Set `CRON_SECRET` in Vercel and send it as a bearer token or `x-cron-secret` header if you call the route manually.

Without `DATABASE_URL`, Vercel will still boot the UI, but edits and imports will not be durable because the local demo store is only meant for local development.

## Database commands

The repo includes Drizzle config for Postgres/Supabase:

```bash
npm run db:generate
npm run db:push
```

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run build
```

## Main routes

- `/homes`: ranked table view + import panel
- `/homes/[id]`: full listing editor
- `/map`: ranking overlay on the map
- `/settings/points-of-interest`: up to three weighted POIs

## Main API routes

- `POST /api/import-listing`
- `POST /api/address-search`
- `POST /api/address-select`
- `POST /api/recompute-scores`
- `GET /api/homes`
- `POST /api/homes`
- `GET /api/homes/:id`
- `PATCH /api/homes/:id`
- `GET /api/pois`
- `PUT /api/pois`
- `GET /api/cron/police-sync`

## Current notes

- Invite-only Supabase auth is wired in a lightweight way: when Supabase env vars are present, app pages and API routes require a signed-in email that exists in the shared workspace member list. Without those env vars, the app stays in shared demo mode.
- Mapbox now powers live tile rendering, address search, and routing when `NEXT_PUBLIC_MAPBOX_TOKEN` is present.
- URL import is intentionally best-effort. Sites can block fetches or omit structured data, so manual editing remains part of the normal flow.
- Police activity is stored as a separate signal and does not affect ranking in v1.
