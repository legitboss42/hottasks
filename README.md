# HOTTasks

Micro‑bounty marketplace demo with an escrow‑style lifecycle:
**Create → Fund → Claim → Submit → Release**.  
Built for hackathon demos with a fast, server‑enforced flow and a polished UI.

## Features
- End‑to‑end lifecycle with server‑side state locks
- Atomic claim/submit/release transitions
- Dev funding button for instant testing
- Seeded demo data when the DB is empty
- Minimal, “startup‑grade” UI polish with micro‑feedback

## Tech Stack
- Next.js (App Router)
- Prisma + PostgreSQL
- NEAR wallet selector (connect UX)

## Local Setup
1. Install dependencies
```bash
npm install
```

2. Create environment files
- `.env` (used by Prisma CLI)
- `.env.local` (used by Next.js)

Example:
```bash
DATABASE_URL="prisma+postgres://..."
DIRECT_URL="postgres://..."
NEXT_PUBLIC_HOTPAY_ITEM_ID="your_item_id"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. Sync the database
```bash
npx prisma db push
```

4. Run the app
```bash
npm run dev
```

Open `http://localhost:3000`.

## Seed Demo Data
When the database is empty, the UI auto‑calls `/api/seed` to create demo tasks.  
You can also seed manually:
```bash
curl -X POST http://localhost:3000/api/seed
```

## Scripts
```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:push
npm run prisma:studio
```

## API Routes
- `GET /api/tasks` – list tasks
- `POST /api/tasks` – create task
- `PATCH /api/tasks/[id]` – update task
- `POST /api/tasks/[id]/fund` – mark funded (dev only)
- `POST /api/tasks/[id]/claim` – atomic claim
- `POST /api/tasks/[id]/submit` – submit proof
- `POST /api/tasks/[id]/release` – release payout (simulated)
- `POST /api/seed` – seed demo data

## Notes
- `release` currently simulates payout. Plug in your real HOT Pay call in
  `app/api/tasks/[id]/release/route.ts`.
- The dev funding route is for demos; lock it down or remove for production.

## Deployment
Deploy on Vercel and set the same env vars in the project settings.  
Prisma runs on `postinstall` and uses `prisma/schema.prisma`.
