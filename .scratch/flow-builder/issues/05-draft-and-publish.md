# 05 — Draft and publish

**Spec:** `.scratch/flow-builder/spec.md` (sections "Storage (D1)" and "Draft and publish" stories).

**What to build:** A flow builder controls what customers see. Drafts go live only when published and valid.

- **Publish.**
  - The button is enabled only when the draft has no validation errors.
  - The server re-validates the draft with `loadTopics` together with every other published topic. That covers duplicate topic ids, the 255-option topic limit and the graph rules.
  - Pass the other published topics first and the draft last. `loadTopics` rejects topics past the 254-topic limit in the order given, so this way the draft is the one rejected, never a topic that's already live.
  - Only if this topic has no errors is the draft copied to the published version and the published timestamp set. Otherwise the errors are returned and shown.
- **Discard changes.** Replace the draft with the published version, after confirming. It's only available when there are unpublished changes.
- **Unpublish.** Set the published version to null. The topic stays as a draft only.
- **Delete.** Remove the topic after confirming by typing or re-clicking.
- **Status badges** (`draft only`, `published`, `unpublished changes`) appear on the builder and the `/topics` list, and update after each action.
- **Topic store.** These are write operations in the topic store module. Everything runs server-side.

**Blocked by:** 03 — Edit step content in the side panel, with autosave

**Status:** ready-for-agent

- [ ] Publishing a valid edited draft makes the status `published`, and the published JSON in D1 equals the draft.
- [ ] Publish is disabled while the draft has errors.
- [ ] A forced server publish of an invalid draft is rejected with the errors. Check this by calling the action directly.
- [ ] Publishing a draft whose topic id clashes with another published topic is rejected with a clear message.
- [ ] Discard changes restores the published version into the draft and the builder.
- [ ] Unpublish shows `draft only`, and the topic is no longer in the set of published topics the store returns.
- [ ] Delete removes the topic from `/topics`.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
