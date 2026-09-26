# Spec: Visual topic flow builder

Status: ready-for-agent

## Problem Statement

Jevbot's value is that businesses build their own support flows. Every reply is pre-written and every decision is a typed Jev answer. In v1, though, a topic can only be created or changed by hand-editing a JSON file in the repo and redeploying. That has three problems:

- The people who should build flows (support leads, store owners) can't use it.
- Even for a developer it's slow and error-prone. Steps and connections are separate lists linked by ids, so a flow of more than a few steps is hard to follow.
- A deployed Worker can't write files, so flows can't change without a code release.

The product also needs to make the limits of the one-Jev-call design visible to non-technical builders: token budget, cost, and what Jev is actually asked. It also needs a safe way to change a live topic without breaking customer conversations halfway through an edit.

## Solution

A visual builder in the app, modelled on `docs/screenshots/1-topic-flow-builder.png`:

- **Topics list:** shows every topic with its status (never published, published, or published with unpublished changes) and its error count. From here you can create a new topic from a template or import one from JSON.
- **Builder page for a topic:**
  - The flow draws itself as a top-down diagram from its steps and connections, colour-coded like the screenshot's legend.
  - Clicking a step opens a side panel for editing it.
  - Every open outcome (for example a branch path with nothing after it) shows a "+" slot. Clicking it lets you add a step from the palette or connect to an existing step.
  - Validation runs live in the browser, with errors listed and highlighted on the steps they belong to.
  - Edits save automatically to a draft.
  - Buttons: Publish (only when valid), Discard changes, Unpublish, Export JSON, Delete, "Test in chat" and "See what Jev gets".
- **Storage:** topics live in D1, as one draft and one published version each. Customers only ever see published topics. The two bundled JSON topics become starter data, loaded into an empty database once.
- **"See what Jev gets" page:** shows the questions a topic becomes in the one Jev call, the estimated size and cost of the whole call against Jev's context budget, and a sample-message box that runs a real Jev call and shows the answers and the path the flow would take.
- **Settings page:** switches the active threshold preset (Careful, Balanced, Confident) and the fallback behaviour without touching code.

The builder follows the order the user chose. The core builder comes right after v1 ticket 03. "See what Jev gets" and Settings come after ticket 04, and "Test in chat" comes after tickets 05–06.

## User Stories

### Topics list

1. As a flow builder, I want a list of all topics with their name, description and status, so that I can see what the bot knows and what is live.
2. As a flow builder, I want each topic's status shown as "Draft only", "Published" or "Unpublished changes", so that I know whether customers see my latest edits.
3. As a flow builder, I want each topic's validation error count on the list, so that I can spot broken drafts quickly.
4. As a flow builder, I want to create a new topic by giving it a name, so that I can start a flow without writing JSON.
5. As a flow builder, I want the new topic's id suggested from its name in snake_case, so that I don't have to understand ids, while still being able to adjust it before first publish.
6. As a flow builder, I want a new topic to start from a template (entry, standard handoff rules, a confidence gate, and open slots for the rest), so that I start from a sound structure rather than a blank page.
7. As a flow builder, I want to import a topic from a JSON file, so that I can move topics between environments or restore a backup.
8. As a flow builder, I want an imported topic to be validated and to land as a draft, so that importing can never put a broken topic in front of customers.
9. As a flow builder, I want to be warned before an import replaces the draft of an existing topic with the same id, so that I don't lose work by accident.
10. As a developer, I want the bundled starter topics loaded into an empty database automatically on first run, so that a fresh install has working examples.
11. As a developer, I want starter topics loaded only once, so that deleting them doesn't make them reappear.

### Editing a flow

12. As a flow builder, I want the flow drawn automatically as a top-down diagram, so that it always looks tidy without me arranging boxes.
13. As a flow builder, I want steps coloured by category (starts the flow, decided by Jev, bot action, goes to a person), so that I can read a flow at a glance.
14. As a flow builder, I want each connection labelled with its outcome (for example "Yes/No", "High/Medium/Low", or a path name), so that I can see why the flow goes where it goes.
15. As a flow builder, I want an ask-customer step's return to its branch drawn as a clearly marked "back to" link, so that the one allowed loop is obvious.
16. As a flow builder, I want every outcome with nothing after it shown as a "+" slot, so that I can see exactly where the flow is unfinished.
17. As a flow builder, I want to click a "+" slot and choose a step type from the palette, so that I can grow the flow where it's needed.
18. As a flow builder, I want to point an outcome at an existing step instead of a new one, so that branches can rejoin (for example "confirmed, yes" continuing to the main question).
19. As a flow builder, I want to disconnect an outcome, so that I can restructure a flow.
20. As a flow builder, I want to click any step to edit it in a side panel, so that I can change its content without leaving the diagram.
21. As a flow builder, I want to edit a branch's question, and its paths' names and descriptions, in the side panel as in screenshot 1, so that I control exactly what Jev chooses between.
22. As a flow builder, I want to add, rename and remove branch paths, so that I can refine how the flow splits.
23. As a flow builder, I want renaming a path to keep its connection, so that renames never break the flow.
24. As a flow builder, I want the automatic "not stated" path shown on every branch and not removable, so that I understand Jev never has to guess.
25. As a flow builder, I want to add, edit and remove handoff rules on a check-rules step in plain English, so that I decide when a person takes over.
26. As a flow builder, I want to edit a reply's text and whether it marks the conversation resolved, so that answers say exactly what I want.
27. As a flow builder, I want to edit an ask-customer step's question, its buttons, and which branch the answer goes back to, so that I can collect missing facts.
28. As a flow builder, I want to edit a hand-off step's message to the customer and its reason tag, so that customers and my team both know what happens.
29. As a flow builder, I want to edit the topic's name, description and 3–5 example questions, so that Jev recognises when a message is about my topic.
30. As a flow builder, I want to delete a step, with its outcomes becoming open "+" slots, so that removing something never leaves hidden broken connections.
31. As a flow builder, I want the entry step to be impossible to delete, so that every topic keeps a start.
32. As a flow builder, I want step ids created for me, so that I never have to name internal things. Only the names Jev sees (topic and path names) are mine to choose.
33. As a flow builder, I want my edits saved automatically as a draft, so that I never lose work and customers never see half-finished changes.
34. As a flow builder, I want the page to show when the draft was last saved, so that I trust autosave.

### Validation

35. As a flow builder, I want validation to run as I edit, so that I see problems immediately.
36. As a flow builder, I want each problem explained in plain English and highlighted on the step it belongs to, so that I can find and fix it.
37. As a flow builder, I want a draft with errors to still save, so that I can stop halfway through a change.
38. As a flow builder, I want the same rules that protect the chat (no dead ends, no loops except ask-customer returns, every branch handles "not stated", the 255-option limit) enforced before publishing, so that the chat can never run a broken flow.
39. As a flow builder, I want publishing blocked if my topic's id clashes with another published topic, so that topic matching stays unambiguous.

### Draft and publish

40. As a flow builder, I want to publish a valid draft with one click, so that customers get my changes.
41. As a flow builder, I want the server to re-check the draft against all other published topics when I publish, so that nothing invalid goes live even if the browser was out of date.
42. As a flow builder, I want to discard my draft changes and go back to the published version, so that I can abandon an experiment.
43. As a flow builder, I want to unpublish a topic, so that I can take it offline without deleting my work.
44. As a flow builder, I want to delete a topic after confirming, so that I can remove topics I no longer need.
45. As a flow builder, I want to export a topic (draft or published) as a JSON file in the same format as the starter topics, so that I can back it up or share it.
46. As a customer, I want the bot to use only published topics, so that I never hit a half-built flow.
47. As a customer who is mid-conversation when a topic is republished or unpublished, I want the bot to continue sensibly (resuming if the step still exists, otherwise treating my message as fresh), so that edits don't strand me.

### See what Jev gets

48. As a flow builder, I want to see the Jev questions my topic becomes (its option in the topic question, each branch as a Choice with its paths and "not stated", and each rule as a yes/no question), so that I understand what Jev is actually asked.
49. As a flow builder, I want a plain view and a raw request view, so that I can read it easily or inspect exactly what is sent.
50. As a flow builder, I want the estimated input size of the whole per-message Jev call, and my topic's share of it, shown against Jev's context budget, so that I can see how close I am to the limit.
51. As a flow builder, I want the estimated cost per message shown, so that I understand what running the bot costs.
52. As a flow builder, I want a warning when the whole call nears the budget, so that I find out before the chat starts failing.
53. As a flow builder, I want to type a sample customer message and see Jev's real answers, the exact token count, and the path my draft would take, so that I can check a topic before publishing it.

### Test in chat

54. As a flow builder, I want a "Test in chat" button that opens the chat using my draft of this topic in place of its published version, so that I can try changes end to end before customers see them.
55. As a flow builder, I want test conversations clearly marked as tests, including any handoffs they create, so that they don't get mixed up with real customer conversations.

### Settings

56. As a flow builder, I want to switch the active preset between Careful, Balanced and Confident, with each preset's thresholds shown, so that I can tune how cautious the bot is without editing code.
57. As a flow builder, I want to choose whether the bot replies or hands off when no topic matches, and to edit the fallback reply text, so that the fallback fits my business.
58. As a developer, I want settings to default to the values in the config file until they're changed, so that a fresh install behaves sensibly.

### Navigation

59. As a flow builder, I want header navigation between Chat, Topics, Handoffs and Settings, so that I can move around the app easily.

## Implementation Decisions

### Order and dependencies on v1

- **Core builder** is blocked by v1 ticket 03 and comes before ticket 04. It covers D1 storage, the topics list, the diagram editor, draft and publish, and import/export.
- **"See what Jev gets" and Settings** are blocked by ticket 04, which provides question building and the thresholds config.
- **"Test in chat"** is blocked by tickets 05–06.
- **Changes to v1 tickets:**
  - Setting up D1 moves from ticket 05 to the builder's first ticket. Ticket 05 then only adds the conversation tables.
  - The chat (05) and eval (09) read published topics from D1 instead of the bundled files.
  - Ticket 04 exposes its question building so the Jev page can reuse it.
  - The builder's topics list replaces ticket 02's read-only `/topics` page.

### Topic model: shared between browser and server

- The topic schema, `loadTopics` and ticket 03's graph checks move out of the server-only area into a shared module. The builder can then validate in the browser as the author edits, and the server can re-validate on publish with identical rules.
- **Stored format:** a topic is stored as the same JSON format as the starter files, so `loadTopics` validates drafts and published versions from D1 exactly as it validates files. The "file" in an error becomes the topic's id.
- **No new validation rules.** The builder relies on `loadTopics`. An open outcome is simply ticket 03's missing-connection error, which the diagram also draws as a "+" slot.

### Editing: the `applyEdit` seam

- **The pure function** `applyEdit(topic, edit) → topic` holds all editing logic. The builder page keeps the draft in memory, applies each edit through it, re-validates, and autosaves. The page itself has no editing logic.
- **Edit operations:**
  - Topic: set the name, description or examples, or set the topic id (only allowed before first publish).
  - Adding: add a step of a given type at an open outcome (a step and outcome label). The new step gets default content and a generated id.
  - Connections: connect an outcome to an existing step, or disconnect an outcome.
  - Step fields: update a branch's question, a reply's text and resolve flag, an ask-customer step's question, buttons and return branch, and a hand-off step's message and reason tag.
  - Branch paths: add a path, rename it (which also relabels its connection), update its description, or remove it (which also removes its connection).
  - Handoff rules: add, update or remove a rule on a check-rules step.
  - Deleting: delete a step. Its incoming connections are removed, which reopens those outcomes, and its outgoing connections are removed. The entry step can't be deleted, and an ask-customer step that pointed at a deleted branch is left for validation to flag.
- **Ids:**
  - Step ids are generated (a type-based, unique, snake_case id) and are never edited. They aren't sent to Jev, and live conversations may be waiting on them, so keeping them stable avoids breaking conversations.
  - Path ids and the topic id are author-chosen because Jev sees them as option names. The editor offers them as names and enforces snake_case through validation.
  - Rule ids are generated.
- **New topic template:**
  - An entry step leads to check-rules with three default rules (customer upset, legal action or chargeback, asks for a person). A match goes to a hand-off step.
  - A clear result goes to a confidence gate. Low goes to a hand-off step, while high and medium are open slots.

  The template is deliberately incomplete, so a new topic starts as a draft with visible "+" slots.

### Diagram

- The diagram uses Svelte Flow (`@xyflow/svelte`, which supports Svelte 5) with automatic top-down layout from `@dagrejs/dagre`. Dragging nodes and drawing connections by hand are turned off; pan and zoom are allowed.
- Layout is computed from the steps and connections, leaving out ask-customer return edges. Those are drawn as distinct "back to" links, like screenshot 1's "↻ Back to this branch".
- Each step type has a custom node matching the `/topics` colour categories. Open outcomes render as "+" nodes.
- Selecting a node opens that step type's side panel. Validation errors are highlighted on the node their location names.
- Layout is a thin client-side function and is checked by eye, not unit-tested.

### Storage (D1)

- **Setting up D1:** the D1 binding, local development database and migrations are introduced by the builder's first ticket. Queries use plain prepared statements with no ORM, as in the v1 spec. Remote Cloudflare resources are only created with the user's OK.
- **`topics` table:** the topic id, draft JSON (always present, may be invalid), published JSON (null when unpublished), and created, updated and published timestamps. Status is derived from these: "Draft only" when there's no published version, "Unpublished changes" when the draft differs from the published version, and "Published" otherwise.
- **`settings` table:** a single row or key-value store for the active preset, fallback mode, fallback reply text, and a "starter topics loaded" flag. Missing values fall back to the config module's defaults.
- **Starter topics:** when the "starter topics loaded" flag isn't set and the topics table is empty, the bundled starter JSON topics are inserted as both draft and published, and the flag is set.
- **Topic store module:** a small server-only module that the endpoints use. It lists topics with their status, gets one, saves a draft, publishes, discards changes, unpublishes, deletes, imports and exports.
- **Publishing:** the server runs `loadTopics` on the draft together with every other published topic. It only copies the draft to the published version when there are no errors for this topic. Otherwise it returns the errors.
- **Concurrency:** single user, so the last write wins.

### Chat and eval use published topics

- The per-message flow loads published topics from D1 and validates them with `loadTopics`. Invalid ones are dropped defensively, even though publishing already prevents them.
- **Live conversations after a republish:** if a conversation's waiting step no longer exists in the published topic, or its topic was unpublished, the waiting step is dropped and the message is treated as fresh. This lives in `decideTurn`, whose input already includes the waiting step.
- **Test mode:**
  - "Test in chat" opens the chat in test mode for one topic. That topic's draft (if valid) replaces its published version for that conversation only.
  - Test conversations are marked in D1 and labelled as tests in the chat and on the Handoffs page.
  - If the draft is invalid, the chat says so instead of running.
- **Eval (ticket 09):** reads published topics from the local D1 through Wrangler's platform proxy by default, with an option to use a folder of exported JSON files instead.

### "See what Jev gets" page

- A page per topic, modelled on screenshot 2, without anything about documents:
  - The Jev questions this topic contributes, as a plain view and a raw request view. It uses ticket 04's exported question building, run on all published topics with this topic's draft swapped in.
  - Estimated input tokens for the whole call, this topic's share, the share of Jev's 32k context budget, and the estimated cost per message at $0.042 per million input tokens.
- **Token estimate:** there's no tokenizer, so the page estimates by character count. It labels the number as an estimate and calibrates the ratio from the real token usage of sample calls where possible. It warns once the whole call passes 75% of the budget.
- **Sample message:** runs a real Jev call through `decideTurn` with the draft and shows the answers, confidences, exact token usage, model version and the path the walker takes. This call is server-side only and logged like any other Jev call.

### Settings page

- The active preset, shown with each preset's `act`, `confirm` and `rule` thresholds. The fallback mode (reply or hand off) and the fallback reply text.
- Saved to the D1 settings table, and read by the per-message flow on each message.

### Pages and navigation

- `/topics` becomes the topics list, replacing ticket 02's read-only page. `/topics/[id]` is the builder, `/topics/[id]/jev` is "See what Jev gets", and `/settings` is the Settings page.
- The header navigation shows Chat, Topics, Handoffs and Settings as each page comes into existence.
- Autosave, publish and the other actions go through SvelteKit form actions or server endpoints. Everything that touches D1 or Jev is server-side.

## Testing Decisions

- **What a good test is:** a test drives a public seam with realistic input and asserts outcomes the user could observe. For editing, that's the resulting topic and whether it validates, not internal helper calls. Expected values are known-good literals, not recomputed.
- **Seam 1, `loadTopics` (existing):** no new rules. Add tests only if a builder-specific behaviour needs `loadTopics` to change, such as validating from a topic id instead of a file name.
- **Seam 2, `applyEdit` (new, pure):** tests run realistic edit sequences and assert on the resulting topic. For example:
  - Building `return_policy` from the new-topic template step by step, with the result passing `loadTopics` with zero errors.
  - Adding a step at an open outcome connects it there. Connecting an outcome to an existing step lets branches rejoin.
  - Renaming a path relabels its connection. Removing a path removes its connection.
  - Deleting a step reopens its incoming outcomes and removes its outgoing connections. The entry step can't be deleted.
  - Generated step ids are unique and snake_case, even after deletions.
  - The topic id can't be changed after first publish.
  - Rule edits add, update and remove rules.
- **Seam 3, `decideTurn` (existing):** one added behaviour, covered at this seam: a waiting step missing from the current topics is dropped and the message treated as fresh.
- **Not unit-tested:** the D1 topic store, publish and settings endpoints, layout, and Svelte components. They're checked by hand in the browser: build a topic in the builder, publish it, try it in "Test in chat", and confirm the chat uses it.
- **Prior art:** `loadTopics` tests (fixtures built with small helpers, and assertions on `{ file, location, message }`), and the fake-Jev pattern from ticket 04.

## Out of Scope

- Free-form canvas editing (dragging steps, drawing connections by hand), manual layout, and saved node positions.
- Version history beyond one draft and one published version, rollback to older versions, and diffs between versions.
- Multiple users, accounts, auth, permissions, and editing the same topic at the same time. Single user, last write wins.
- Documents, "Quote from docs", source documents and a per-topic documents fallback.
- LLM-assisted topic drafting or suggested wording.
- Undo/redo beyond "Discard changes".
- Embedding the builder or chat in other sites, and billing.
- Changing which questions are sent per message, such as only the matched topic's branches. The one-call design stays; the budget meter only surfaces the limit.
- Deduplicating identical handoff rules across topics, and remembering decided branch answers across turns. These were discussed and deferred.

## Further Notes

- **Security:** v1 has no auth. Once the builder exists, anyone who can reach a deployed app can edit and publish topics. Don't deploy it publicly without protection, for example Cloudflare Access in front of the Worker, until accounts exist.
- **Svelte Flow:** `@xyflow/svelte` 1.7.0 (peer `svelte ^5.25.0`, published 2026-09-24) and `@dagrejs/dagre` 3.1.1 were current when this spec was written. Svelte Flow's docs include an auto-layout example with dagre. It's client-side only, so render the diagram in the browser.
- **Clarifications from the user:**
  - The builder is wanted, and should fit right after v1 ticket 03.
  - The editor uses an auto-laid-out diagram, not a free-form canvas.
  - Topics are stored in D1, with JSON import/export.
  - Extras: draft and publish, "See what Jev gets", "Test in chat", and a Settings page.
  - Test seams: `loadTopics`, a new `applyEdit`, and `decideTurn`.
- **Decisions made in this spec for the user to review:**
  - One draft and one published version per topic.
  - Step ids are generated and never edited; topic ids can't change after first publish.
  - The contents of the new-topic template.
  - Starter topics are loaded once.
  - Test-mode conversations are labelled as tests.
  - The token estimate is by character count, with a warning at 75% of the budget.
- **References:** visual references are in `docs/screenshots/`, and Jev facts in `docs/research/jev-api.md`. The v1 spec and tickets are in `.scratch/jevbot-v1/`.
