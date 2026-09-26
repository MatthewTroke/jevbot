# 01 — Spike: Jev answers a hardcoded Choice from a server route

**Spec:** `.scratch/jevbot-v1/spec.md`. Jev API facts: `docs/research/jev-api.md`.

**What to build:** A thin end-to-end proof that a SvelteKit server route running on Cloudflare can call Jev through the Workers AI binding (`typesafe/jev`) and get a typed answer back.

- Hitting the spike route returns JSON with Jev's answer to one hardcoded Choice question. For example: "Which support topic is this message about?" over `return_policy`, `shipping_times` and `other`, for a fixed sample message.
- The JSON includes the chosen option, its confidence, the probabilities, the model version that answered, token usage and latency.
- This ticket also creates the Jev adapter that every later ticket builds on:
  - It lives in `src/lib/server/jev.ts`, as the brief requires.
  - It is one function: state and questions in, typed answers out, plus the model version, usage, latency and the raw request and response.
  - It uses our own request and response types, because Workers types have no entry for this model.
  - It validates the response with Zod.
  - It reports network failures, error responses and schema mismatches as one typed Jev error.
  - It is the only code that touches `env.AI`. Callers depend on an interface, so tests and the eval script can inject their own.

Before writing Jev code, read `docs/research/jev-api.md` and re-check the Cloudflare model page and schemas it links. Use only documented fields. If something is unclear, ask the user rather than guessing.

The account needs AI Gateway and Unified Billing credits for this third-party model. If calls fail for account or billing reasons, stop and tell the user what's needed. Don't change account settings yourself.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The Workers AI binding is configured, and the generated Worker types are regenerated so the binding is typed.
- [x] Zod is a dependency.
- [x] The Jev adapter's request types only allow documented fields: `state` and `questions`, lowercase `choice`/`noul` types, `instructions` and `criteria`.
- [x] A malformed Jev response produces the typed Jev error, not an unchecked cast.
- [x] The spike route returns the typed answer as JSON under `npm run dev`.
- [x] The spike route also works under `npm run preview`, which runs the built Worker in workerd and so proves it works in the Workers runtime, not only in Node.
- [x] The response shows the real model version reported by Jev (e.g. `jev-1.x.y`).
- [x] The Jev call happens only on the server; nothing Jev-related is shipped to the browser.
- [x] `npm run check`, `npm run lint` and `npm test` pass.
- [ ] Deploying to workers.dev is optional and only with the user's explicit OK. (Not done; not requested yet.)

## Comments

**2026-09-26, implementation notes:**

- **Verified live** under `npm run dev` and `npm run preview` (workerd). The sample message came back as `return_policy` with confidence 1, model `jev-1.13.0`, 383 input and 41 output tokens, about 0.9–1.2 s.
- **Adapter interface:** `createJev(ai)` returns a `Jev` whose `ask(state, questions)` gives typed `answers`, `model`, `usage` and `call` (`{ request, response, latencyMs }`). `JevError` carries a `kind` and the same `call`, so ticket 05 can log successes and failures from one shape.
- **Error kinds:**
  - `request_failed`: the binding threw, e.g. network, auth or `2021: Insufficient AI Gateway credits`.
  - `run_failed`: the run's state wasn't `Completed`.
  - `invalid_response`: the output failed the schema, an answer is missing or has the wrong type, the choice isn't an option, or the probabilities don't cover exactly the options.
- **Run envelope:** the binding wraps the output in `{ state, result, gatewayMetadata }`, which the model page doesn't show. The adapter accepts this and the bare shape. Details are in `docs/research/jev-api.md` under "Observed behaviour".
- **Gateway:** the adapter passes `{ gateway: { id: 'default' } }`, as Cloudflare's third-party binding example does.
- **`npm run gen`** now deletes `.svelte-kit/cloudflare` before `wrangler types`. Otherwise the generated types change depending on whether a build exists. Run `npm run build` again before `npm run preview` after a `gen`.
- **Tests:** the adapter isn't a unit-test seam (per the spec). Its validation was checked with a throwaway fake-binding probe of 13 cases, which wasn't committed.
- **Spike route:** `/api/spike` returns the raw Jev response in its 502 error JSON to help debugging. Ticket 05 removes the route.
