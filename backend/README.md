# Kairo backend

The phone is the primary engine. This folder adds accounts, sync, the AI proxy, sharing and backup pushes (spec section 5).

```
backend/
├── supabase/                 Supabase project (run CLI commands from backend/)
│   ├── config.toml
│   ├── migrations/           Postgres schema + RLS
│   ├── tests/                pgTAP tests (RLS)
│   └── functions/            Edge Functions (Deno)
│       ├── _shared/          HTTP helpers
│       ├── sync-push/        Outbox upload, idempotent by changeId; registers backup pushes
│       ├── sync-pull/        Changes since a sync token
│       ├── ai-draft/         Text → validated draft JSON (provider not chosen yet)
│       ├── shares/           Invite / change role / revoke
│       └── account-delete/
└── scheduler/                Go service: sends backup pushes for unacknowledged alerts
```

Zod schemas shared with the app live in `../shared/schema` and are imported in functions as `@shared/…` (see each function's `deno.json`).

## Prerequisites

- Docker Desktop or OrbStack, running
- Supabase CLI (`brew install supabase/tap/supabase`)
- Go 1.23+ (`brew install go`), for the scheduler only

## Run the database locally

```bash
cd backend
supabase start          # Postgres, Auth, Studio, Edge runtime in Docker; prints URLs and keys
supabase db reset       # recreate the DB and apply migrations/ + seed.sql
supabase test db        # run pgTAP tests in supabase/tests/
```

- Studio (tables, SQL editor): http://127.0.0.1:54323
- Direct Postgres: `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- `supabase stop` shuts it down; data is kept until the next `db reset`.

### Changing the schema

```bash
supabase migration new add_something   # creates migrations/<timestamp>_add_something.sql
supabase db reset                      # apply from scratch
supabase test db
```

Never edit a migration that has been pushed to a hosted project; add a new one.

## Run the Edge Functions locally

```bash
cp supabase/functions/.env.example supabase/functions/.env   # fill in secrets
supabase functions serve --env-file supabase/functions/.env
```

Functions require a signed-in user's access token (`Authorization: Bearer <jwt>`).

## Run the scheduler

```bash
cd backend/scheduler
go mod tidy             # first time: fetches pgx and writes go.sum
go run ./cmd/scheduler  # defaults to the local Supabase DB; set DATABASE_URL otherwise
```

It logs pushes instead of sending them until FCM/APNs senders are added in `internal/push`.

## Secrets

Server secrets (AI key, service role, push credentials) go in `supabase/functions/.env` locally and `supabase secrets set` in production. Both are gitignored. Never put them in the app's root `.env`: anything Expo reads can end up in the app bundle.
