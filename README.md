# tRPC Monorepo Scaffold

A full-stack TypeScript monorepo scaffold powered by **Turborepo**, **tRPC**, **Next.js**, **Express**, and **Drizzle ORM**. Clone this and start building — everything is pre-wired.

---

## Stack

| Layer | Tech |
|---|---|
| Monorepo | [Turborepo](https://turborepo.com) + [pnpm workspaces](https://pnpm.io/workspaces) |
| Frontend | [Next.js 16](https://nextjs.org) (App Router) |
| Backend | [Express](https://expressjs.com) + [tRPC](https://trpc.io) |
| API contract | [trpc-to-openapi](https://github.com/jlalmes/trpc-to-openapi) + [Scalar](https://scalar.com) |
| Database | [PostgreSQL](https://postgresql.org) via [Drizzle ORM](https://orm.drizzle.team) |
| Logging | [Winston](https://github.com/winstonjs/winston) |
| UI components | [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS v4) |
| Type checking | TypeScript 5 |
| Linting | ESLint + Prettier |

---

## Monorepo structure

```
.
├── apps/
│   ├── api/          # Express server — tRPC + OpenAPI
│   └── web/          # Next.js frontend
└── packages/
    ├── database/     # Drizzle ORM setup, schema, migrations
    ├── eslint-config/ # Shared ESLint configs
    ├── logger/        # Winston logger (shared)
    ├── services/      # Business logic services
    ├── trpc/          # Shared tRPC router, client, types
    └── typescript-config/ # Shared tsconfig bases
```

---

## Prerequisites

- **Node.js** ≥ 18
- **pnpm** 9 (`npm i -g pnpm@9`)
- **Docker** (for local PostgreSQL, or supply your own `DATABASE_URL`)

---

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd <repo-name>
pnpm install
```

### 2. Set up environment

Copy the example env file and fill in values:

```bash
cp .env.example .env
```

Then run the setup script, which symlinks `.env` into every app and package automatically:

```bash
bash setup.sh
```

Minimum required variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev
NODE_ENV=development
BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start PostgreSQL (Docker)

```bash
docker-compose up -d
```

This spins up a Postgres 15 container on port `5432`.

### 4. Run the dev servers

```bash
pnpm dev
```

Turborepo starts all apps in parallel:

| App | URL |
|---|---|
| Next.js (web) | http://localhost:3000 |
| Express API | http://localhost:8000 |
| API docs (Scalar) | http://localhost:8000/docs |
| OpenAPI JSON | http://localhost:8000/openapi.json |
| tRPC endpoint | http://localhost:8000/trpc |
| Drizzle Studio | run `pnpm db:studio` separately |

---

## Scripts

All scripts are run from the **repo root** using `pnpm <script>`.

### `pnpm dev`
Starts all apps and packages in watch/dev mode concurrently via Turborepo. Hot-reloads on file changes.

### `pnpm build`
Compiles all packages and apps for production. Order is resolved automatically by Turborepo's dependency graph (`^build` means "build my dependencies first").

### `pnpm lint`
Runs ESLint across all packages and apps.

### `pnpm format`
Runs Prettier across all `.ts`, `.tsx`, and `.md` files.

### `pnpm check-types`
Runs `tsc --noEmit` across all packages — no output files, just type verification.

### `pnpm db:generate`
Generates a new Drizzle migration based on your current `packages/database/schema.ts`. Run this after adding or changing table definitions.

### `pnpm db:migrate`
Applies all pending migrations to the database pointed to by `DATABASE_URL`.

---

## How tRPC is wired

```
packages/trpc/server/
  ├── trpc.ts          # initTRPC — creates router + procedures
  ├── context.ts       # Request context (add auth, DB, etc. here)
  ├── schema.ts        # Shared zod helpers (zodUndefinedModel, etc.)
  ├── services/        # Instantiated service singletons for route use
  ├── utils/           # path-generator helper for OpenAPI paths
  └── routes/
      └── health/      # Example route — GET /health

packages/trpc/client/
  └── index.ts         # Re-exports client utilities + typed RouterOutputs
```

The `serverRouter` from `packages/trpc/server` is consumed by both:
- `apps/api` — mounts it on Express at `/trpc` and `/api` (OpenAPI)
- `apps/web` — calls it via the tRPC React client

### Adding a new route

1. Create `packages/trpc/server/routes/<feature>/route.ts`
2. Define a router using `publicProcedure` and `router` from `../../trpc`
3. Register it in `packages/trpc/server/index.ts`

```ts
// packages/trpc/server/routes/posts/route.ts
import { z } from "../../schema";
import { publicProcedure, router } from "../../trpc";

export const postsRouter = router({
  list: publicProcedure
    .meta({ openapi: { method: "GET", path: "/posts" } })
    .input(z.undefined())
    .output(z.array(z.object({ id: z.string(), title: z.string() })))
    .query(async () => {
      return []; // replace with DB call
    }),
});
```

```ts
// packages/trpc/server/index.ts
import { postsRouter } from "./routes/posts/route";

export const serverRouter = router({
  health: healthRouter,
  posts: postsRouter, // add here
});
```

---

## How the database is wired

```
packages/database/
  ├── env.ts          # Validates DATABASE_URL
  ├── index.ts        # Exports drizzle db instance
  ├── schema.ts       # Re-exports all table definitions (empty scaffold)
  ├── drizzle.config.ts # Drizzle Kit config
  └── models/         # Create table files here (e.g., models/posts.ts)
```

### Adding a table

1. Create `packages/database/models/posts.ts`
2. Define the table with Drizzle's `pgTable`
3. Export it from `packages/database/schema.ts`
4. Run `pnpm db:generate` then `pnpm db:migrate`

```ts
// packages/database/models/posts.ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const postsTable = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectPost = typeof postsTable.$inferSelect;
export type InsertPost = typeof postsTable.$inferInsert;
```

```ts
// packages/database/schema.ts
export * from "./models/posts";
```

---

## Adding a new service

Services live in `packages/services/` and contain business logic that routes call.

1. Create `packages/services/<feature>/index.ts`
2. Instantiate it in `packages/trpc/server/services/index.ts`
3. Import and use it in your route

---

## Environment variables reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `NODE_ENV` | — | `development` | `development` or `prod` |
| `PORT` | — | `8000` | API server port |
| `BASE_URL` | — | `http://localhost:8000` | Public base URL of API |
| `NEXT_PUBLIC_API_URL` | — | `/trpc` (relative) | API URL used by the web client |
| `LOGGER_LEVEL` | — | `debug` in dev | `error`, `info`, or `debug` |

---

## Useful links

- [Turborepo docs](https://turborepo.com/docs)
- [tRPC docs](https://trpc.io/docs)
- [Drizzle ORM docs](https://orm.drizzle.team)
- [Next.js App Router docs](https://nextjs.org/docs/app)
- [shadcn/ui components](https://ui.shadcn.com/docs/components)
- [trpc-to-openapi](https://github.com/jlalmes/trpc-to-openapi)
