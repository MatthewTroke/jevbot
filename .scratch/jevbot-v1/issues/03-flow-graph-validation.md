# 03 — Flow graph validation

**Spec:** `.scratch/jevbot-v1/spec.md` (see "Topic loading").

**What to build:** `loadTopics` also checks that each topic's flow graph can be walked safely. A topic with a broken graph is rejected, and its errors show on `/topics` just like schema errors. After this ticket, the walker in 04 can trust that every valid topic has these properties:

- It has exactly one `when` step.
- Every connection's `from` and `to` point at existing steps.
- Every non-final step has exactly the outgoing labels its type needs, and no others:
  - `when`: one unlabelled connection;
  - `check_rules`: `matched` and `clear`;
  - `confidence_gate`: `high`, `medium` and `low`;
  - `branch`: one per path, plus `not_stated`.
- `send_reply`, `ask_customer` and `hand_off` end the turn and have no outgoing connections.
- Every branch has a `not_stated` connection.
- A `check_rules` step's `matched` connection leads to a `hand_off` step.
- Every `ask_customer` step returns to a `branch` in the same topic.
- There are no loops other than ask_customer return edges: the graph must be acyclic once those are removed.
- Every step is reachable from `when`, counting ask_customer return edges.
- No Choice has more than 255 options: the topic Choice (all valid topics plus `other`) and each branch Choice (its paths plus `not_stated`).

**Blocked by:** 02 — Topic files load and show on /topics

**Status:** done

- [x] Each rule above has a unit test with a minimal invalid fixture. The test asserts the error names the file, the step and the problem in plain words.
- [x] A topic containing the one allowed loop (ask_customer → its branch → `not_stated` → the same ask_customer) passes validation.
- [x] Both example topics still load with zero errors.
- [x] A topic that fails graph validation is excluded from matching while other topics still load.
- [x] The topic-Choice limit is checked across all topics together, not per file.
- [x] Temporarily adding a topic with a dead end or a loop shows clear errors on `/topics`.
- [x] `npm run check`, `npm run lint` and `npm test` pass.

## Comments

**2026-09-26, implementation notes:**

- **Where it lives:** the graph checks are in `src/lib/server/flow-graph.ts` (`checkFlow`), and `loadTopics` runs them once a topic's schema and ids are valid. Shared constants (`OTHER`, `NOT_STATED`, `MAX_CHOICE_OPTIONS`) are in a dependency-free `topic-constants.ts`.
- **Exported for later tickets:** `outcomesOf(step)` gives the outcomes a step must connect, in order. It returns an `Outcome[]`, where `undefined` is the `when` step's unlabelled outcome. The walker in ticket 04 and the builder's "+" slots will use it.
- **Check order:**
  1. Per-step and per-connection checks.
  2. Loop checks, which always run, since a missing arrow can't create a loop, and only follow connections that are valid for their step.
  3. Reachability, which only runs when nothing else is wrong. Otherwise one missing arrow would also flag every step after it as unreachable.
- **Error locations:** connection errors name the step the connection leaves from, e.g. `connections[7] (from step "mood").to`, so the builder can highlight the node.
- **Loops through a customer question:** a loop that goes back through an ask_customer's `returnsTo` is allowed, e.g. gate → medium → ask → confirm branch → "no" → gate. That matches "acyclic once ask_customer return edges are removed", and the repeat-question cap in ticket 06 stops it repeating across turns.
- **254-topic limit:** topics past the limit are rejected in the order given. Builder ticket 05 notes that publishing must pass the draft last, so the draft is the one rejected.
