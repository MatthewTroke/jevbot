# 03 — Edit step content in the side panel, with autosave

**Spec:** `.scratch/flow-builder/spec.md` (section "Editing: the `applyEdit` seam"). Visual reference: the side panel in `docs/screenshots/1-topic-flow-builder.png`.

**What to build:** A flow builder can change what every step says and decides, from a side panel. Edits save automatically to the draft and are validated live.

- **Edits.** The new pure seam `applyEdit(topic, edit) → topic` covers content edits. The builder page keeps the draft in memory, applies edits through `applyEdit`, re-validates in the browser with `loadTopics`, and autosaves the draft to D1 after a short pause. There's no editing logic in the page itself.
- **Content edits in this ticket:**
  - **Topic:** name, description, and adding, editing or removing example questions.
  - **Branch:**
    - Edit the question.
    - Add a path with an author-chosen name and a description.
    - Rename a path. This also relabels its connection, so nothing breaks.
    - Edit a path's description.
    - Remove a path. This also removes its connection.
    - `not_stated` is shown but can't be removed or renamed.
  - **Check rules:** add, edit and remove rules. Rule ids are generated.
  - **Send reply:** the text and the "marks resolved" flag.
  - **Ask customer:** the question, adding, editing and removing buttons, and choosing the branch the next message returns to.
  - **Hand off:** the customer message and the reason tag.
- **Side panels.** One panel per step type, plus a topic details panel, replacing ticket 02's read-only panel. Layout follows screenshot 1.
- **Autosave.** Save the draft through a server action or endpoint that writes it to D1, and show "Saved at …". A draft with errors still saves.

**Blocked by:** 02 — Read-only flow diagram

**Status:** done

- [x] `applyEdit` tests use realistic edit sequences and assert on the resulting topic. They cover:
  - Topic details.
  - Branch paths: adding a path; renaming one, which relabels its connection; removing one, which removes its connection.
  - Rules: adding, updating and removing a rule.
  - Replies, ask-customer steps and hand-off steps.
- [x] Editing in the side panel updates the diagram immediately, and validation errors appear and clear as the draft changes.
- [x] Reloading the page shows the autosaved draft, and `/topics` shows `unpublished changes` for an edited published topic.
- [x] `not_stated` can't be removed or renamed from the panel.
- [x] `npm run check`, `npm run lint` and `npm test` pass.

## Comments

**2026-09-26, implementation notes:**

- **`applyEdit`** (`src/lib/topic-model/edits.ts`) handles `update_topic`, `update_step`, `add_path`, `rename_path`, `update_path`, `remove_path`, `add_rule`, `update_rule` and `remove_rule`. An edit that can't apply throws an `EditError`, which the side panel shows.
  - **Path names:** typed in plain words and turned into snake_case, e.g. "It arrived damaged!" becomes `it_arrived_damaged` (the user agreed this). A leading digit gets `path_`. Empty, reserved (`not_stated`, `other`) and duplicate names are refused, because renaming needs unique names to relabel connections.
  - **Rule ids:** `rule_N`, numbered after the highest in use.
- **Drafts stay editable.** `validateTopicFile` now returns the topic whenever the JSON has the shape of a topic. Content problems (empty text, 3 to 5 examples, snake_case, a one-line description, lists needing an item) are reported as errors but don't stop the draft being shown and edited. Found in review: before this, an autosaved draft with an empty rule or button couldn't be opened again.
- **Status** compares parsed topics via `parseTopicShape`, so formatting and parser defaults such as `resolve: false` don't count as unpublished changes.
- **Saving.** `PUT /topics/[id]/draft` stores the draft. It's capped at 512 KB, checked against `content-length` first, and must be JSON with this topic's id. Renaming a topic's id in ticket 06 therefore needs its own operation.
- **Autosave.** The `Autosave` class in `src/lib/flow-diagram/autosave.svelte.ts` saves 0.8 s after the last change, one request at a time. It only shows "saved" once the latest change is saved, and flushes (with keepalive when the draft is small enough) when the tab is hidden or the builder closes.
- **Per-topic state.** The page renders a `TopicBuilder` per topic (`{#key data.id}`) and a `StepEditor` per selected step, so drafts, selection and autosave never leak between topics or steps.
- **Checked in Chrome** (hidden window, so fields were driven with dispatched events):
  - live name and status changes;
  - adding, renaming and refusing path names;
  - the rules, "marks resolved" and buttons editors;
  - persistence across reloads;
  - a draft with an empty rule reopens editable;
  - leaving right after an edit still saves it.
