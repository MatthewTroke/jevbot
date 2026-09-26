# 06 — New topics, import and export

**Spec:** `.scratch/flow-builder/spec.md` (sections "Editing: the `applyEdit` seam", which covers the template, and "Topics list" stories).

**What to build:** A flow builder can start a topic from scratch, and move topics in and out as JSON files.

- **"+ New topic"** on `/topics`.
  - Ask for a name and suggest a snake_case topic id from it. The id can be edited until the topic is first published, and is locked after that. Enforce this in `applyEdit`.
  - Create the draft from the template:
    - An entry step leads to check rules with three default rules (customer upset, legal action or chargeback, asks for a person). A match goes to a hand-off step.
    - A clear result goes to a confidence gate. Low goes to a hand-off step; high and medium are open "+" slots.
  - Open the new topic in the builder. It starts with visible errors until the open slots are filled.
- **Import** a `.json` file from `/topics`.
  - Parse and validate it with `loadTopics`. It lands as a draft and is never published automatically.
  - If a topic with the same id exists, warn before replacing its draft. The published version is left alone.
  - Invalid JSON or schema errors are shown and nothing is saved.
  - Duplicate step ids are also rejected on import. The builder can't draw such a draft, and step ids can't be edited in the builder, so it could never be fixed there.
- **Export** the draft or the published version from the builder, as a `.json` download in the same format as the starter topic files.

**Blocked by:** 04 — Grow and restructure the flow; 05 — Draft and publish

**Status:** ready-for-agent

- [ ] An `applyEdit` test builds `return_policy` step by step from the new-topic template, and the result passes `loadTopics` with zero errors.
- [ ] An `applyEdit` test shows the topic id can be changed before first publish and not after.
- [ ] Creating a topic in the browser, filling its slots and publishing it works end to end.
- [ ] Exporting a starter topic and re-importing it round-trips to an identical draft.
- [ ] Importing a file with errors shows them and saves nothing. Importing over an existing id asks first.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
