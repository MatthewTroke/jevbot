# Jevbot

A prototype customer-support chatbot that follows hand-built topic flows and uses Jev (TypeSafe's "System One" model) for every decision. Replies are pre-written in the flows; Jev only decides which path to take. SvelteKit on Cloudflare Workers, with D1 for storage.

Plans live in `.scratch/` (specs and tickets), and Jev API notes are in `docs/research/jev-api.md`.

## Setup

1. `npm install`
2. `npx wrangler login`. Jev runs through the Workers AI binding, which always calls Cloudflare, even in local dev. The account needs AI Gateway Unified Billing credits (dashboard: AI → AI Gateway → Credits Available → Manage).
3. `npm run db:migrate` creates the local D1 tables. Run it again whenever `migrations/` changes.
4. `npm run dev`

On the first request, the starter topics in `src/lib/topics/*.json` are loaded into the empty database. This happens only once, so deleted starter topics don't come back. To start over, delete `.wrangler/state/v3/d1` and run `npm run db:migrate` again.

## Scripts

| Script               | What it does                                                      |
| -------------------- | ----------------------------------------------------------------- |
| `npm run dev`        | Dev server with Cloudflare bindings (local D1, remote Workers AI) |
| `npm run db:migrate` | Apply D1 migrations to the local database                         |
| `npm run build`      | Production build                                                  |
| `npm run preview`    | Run the production build in workerd, the Workers runtime          |
| `npm run check`      | Type check                                                        |
| `npm run lint`       | Prettier and ESLint                                               |
| `npm test`           | Unit tests                                                        |
| `npm run gen`        | Regenerate Worker types after editing `wrangler.jsonc`            |

## Deploying

Not yet. v1 has no login, so anyone who can reach a deployed app could edit topics. Also note:

- **A remote database is created automatically.** `wrangler.jsonc` has no D1 `database_id`, so the first `wrangler deploy` (or a Workers Builds preview) creates a remote `jevbot` database.
- **Remote migrations are a separate step.** Apply them with `npx wrangler d1 migrations apply jevbot --remote` before the app is used.
