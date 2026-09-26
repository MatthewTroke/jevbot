# 01 — Topics stored in D1, listed on /topics

**Spec:** `.scratch/flow-builder/spec.md` (sections "Storage (D1)" and "Topic model: shared between browser and server").

**What to build:** Topics move from bundled files into D1, so they can be edited while the app is deployed. The two bundled JSON topics become starter data.

- **D1 setup.** This ticket introduces D1, which v1 ticket 05 used to do: the binding, a local development database and migrations. Queries use plain prepared statements with no ORM. Ask the user before creating any remote Cloudflare resources. After changing the Wrangler config, run `npm run gen`.
- **Migrations:**
  - `topics`: topic id, draft JSON (always present), published JSON (nullable), and created, updated and published timestamps.
  - `settings`: a key-value or single-row table. For now it only holds the "starter topics loaded" flag.
- **Starter topics.** When the flag isn't set and `topics` is empty, insert the bundled starter topics as both draft and published, then set the flag. Deleting them later must not make them come back.
- **Topic store.** A server-only module used by the pages: list topics with a derived status, and get one topic. Publishing, saving and the other writes come in later tickets.

  | Status                | When                                         |
  | --------------------- | -------------------------------------------- |
  | `draft only`          | there's no published version                 |
  | `unpublished changes` | the draft differs from the published version |
  | `published`           | otherwise                                    |

- **Shared topic model.** Move the topic schema, `loadTopics` and the graph checks out of the server-only area into a shared module, so the browser can validate later. Topics from D1 go through `loadTopics`, using the topic id as the "file" in errors.
- **`/topics`** becomes a list read from D1. Each topic shows its name, description, status and validation error count, with a link to `/topics/[id]`.
- **`/topics/[id]`** shows the read-only step view from v1 ticket 02, with its validation errors, now read from the draft in D1.

**Blocked by:** v1 ticket 03 — Flow graph validation (`.scratch/jevbot-v1/issues/03-flow-graph-validation.md`)

**Status:** ready-for-agent

- [ ] Local D1 migrations apply cleanly from scratch.
- [ ] On first load of a fresh local database, both starter topics appear on `/topics` as `published` with 0 errors.
- [ ] After deleting a starter topic's row directly in local D1 and reloading, it doesn't come back.
- [ ] Editing a topic's draft JSON directly in local D1 shows `unpublished changes` on the list, and any validation errors appear on `/topics/[id]` with the topic id as the file name.
- [ ] The topic model imports nothing server-only, so the browser can use it.
- [ ] Existing `loadTopics` tests still pass unchanged, apart from import paths.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
