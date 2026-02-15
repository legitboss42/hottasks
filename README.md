# HOTTasks

HOTTasks is a wallet-based micro-bounty demo with a server-enforced lifecycle:

`Create -> Fund -> Claim -> Submit -> Release`

## Features
- Wallet-authenticated task creation and management
- Creator-only funding workflow with HOT Pay redirect
- Atomic claim/submit/release transitions on the server
- Visibility lock: unfunded tasks are only visible to their creator
- Optional one-shot seed endpoint for demo data

## Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Prisma + PostgreSQL
- wagmi + viem (MetaMask / WalletConnect on Sepolia)

## Prerequisites
- Node.js 20+
- npm
- PostgreSQL database

## Environment Variables

Required:
- `DATABASE_URL` (Prisma datasource URL)
- `DIRECT_URL` (direct Postgres URL for migrations/introspection)
- `AUTH_SECRET` (or `NEXTAUTH_SECRET`) for wallet auth cookies
- `NEXT_PUBLIC_HOTPAY_ITEM_ID` for HOT Pay checkout redirects
- `NEXT_PUBLIC_APP_URL` public app origin (used in redirects)

Optional:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` WalletConnect project ID
- `NEXT_PUBLIC_DEFAULT_CURRENCY_TOKEN_ADDRESS` ERC-20 used for balance display

Example `.env` / `.env.local`:
```bash
DATABASE_URL="prisma+postgres://..."
DIRECT_URL="postgres://..."
AUTH_SECRET="replace-with-a-long-random-string"
NEXT_PUBLIC_HOTPAY_ITEM_ID="your_hotpay_item_id"
NEXT_PUBLIC_APP_URL="https://your-public-domain.com"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_walletconnect_project_id"
NEXT_PUBLIC_DEFAULT_CURRENCY_TOKEN_ADDRESS="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
```

## Local Development
1. Install dependencies:
```bash
npm install
```

2. Push the Prisma schema:
```bash
npm run prisma:push
```

3. Start the dev server:
```bash
npm run dev
```

App URL: `http://localhost:3000`

## Seed Demo Data
The app can seed tasks automatically when empty, or you can call:
```bash
curl -X POST http://localhost:3000/api/seed
```

## Scripts
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run prisma:generate
npm run prisma:push
npm run prisma:studio
```

## Main API Routes
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/[id]`
- `POST /api/tasks/[id]/fund`
- `POST /api/tasks/[id]/claim`
- `POST /api/tasks/[id]/submit`
- `POST /api/tasks/[id]/release`
- `POST /api/tasks/[id]/cancel`
- `POST /api/seed`
