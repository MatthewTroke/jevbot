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

**Status:** ready-for-agent

- [ ] The Workers AI binding is configured, and the generated Worker types are regenerated so the binding is typed.
- [ ] Zod is a dependency.
- [ ] The Jev adapter's request types only allow documented fields: `state` and `questions`, lowercase `choice`/`noul` types, `instructions` and `criteria`.
- [ ] A malformed Jev response produces the typed Jev error, not an unchecked cast.
- [ ] The spike route returns the typed answer as JSON under `npm run dev`.
- [ ] The spike route also works under `npm run preview`, which runs the built Worker in workerd and so proves it works in the Workers runtime, not only in Node.
- [ ] The response shows the real model version reported by Jev (e.g. `jev-1.x.y`).
- [ ] The Jev call happens only on the server; nothing Jev-related is shipped to the browser.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
- [ ] Deploying to workers.dev is optional and only with the user's explicit OK.
