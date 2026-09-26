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

**Status:** ready-for-agent

- [ ] `applyEdit` tests use realistic edit sequences and assert on the resulting topic. They cover:
  - Topic details.
  - Branch paths: adding a path; renaming one, which relabels its connection; removing one, which removes its connection.
  - Rules: adding, updating and removing a rule.
  - Replies, ask-customer steps and hand-off steps.
- [ ] Editing in the side panel updates the diagram immediately, and validation errors appear and clear as the draft changes.
- [ ] Reloading the page shows the autosaved draft, and `/topics` shows `unpublished changes` for an edited published topic.
- [ ] `not_stated` can't be removed or renamed from the panel.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
