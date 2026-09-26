# 04 — Grow and restructure the flow

**Spec:** `.scratch/flow-builder/spec.md` (section "Editing: the `applyEdit` seam").

**What to build:** A flow builder can add, connect and delete steps, so any valid structure can be built from the diagram.

- **Add a step at a "+" slot.** Clicking a slot opens the step palette (check rules, branch, confidence gate, send reply, ask customer, hand off). The chosen step is added at that outcome with default content and a generated step id, then selected in the side panel.
- **Connect to an existing step.** From a "+" slot, or from an outcome in a step's side panel, point the outcome at an existing step, so branches can rejoin.
- **Disconnect an outcome.** The outcome becomes a "+" slot again.
- **Delete a step.**
  - Its incoming connections are removed, so those outcomes reopen as "+" slots, and its outgoing connections are removed.
  - Ask a confirmation first when the step has content.
  - The entry step can't be deleted.
  - An ask-customer step whose return branch was deleted is left for validation to flag.
- **Step ids.** Generated ids are snake_case, based on the step type (e.g. `branch_3`), unique within the topic even after deletions, and never edited.
- **All of this goes through `applyEdit`** as new edit operations.

**Blocked by:** 03 — Edit step content in the side panel, with autosave

**Status:** ready-for-agent

- [ ] `applyEdit` tests cover:
  - Adding a step at an open outcome connects it there.
  - Connecting an outcome to an existing step.
  - Disconnecting an outcome.
  - Deleting a step reopens its incoming outcomes and removes its outgoing connections.
  - The entry step can't be deleted.
  - Generated ids stay unique after deletions.
- [ ] In the browser, a flow can be extended from "+" slots until there are no errors, and the diagram re-lays itself out after each change.
- [ ] Deleting a step with content asks for confirmation, and afterwards its incoming outcomes show "+" slots.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
