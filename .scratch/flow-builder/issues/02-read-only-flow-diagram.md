# 02 — Read-only flow diagram

**Spec:** `.scratch/flow-builder/spec.md` (section "Diagram"). Visual reference: `docs/screenshots/1-topic-flow-builder.png`.

**What to build:** `/topics/[id]` draws the topic's draft as an automatically laid-out, top-down diagram, like screenshot 1. There's no editing yet.

- **Libraries.** Use Svelte Flow (`@xyflow/svelte`) with `@dagrejs/dagre` for automatic layout. Check that both are still current and support Svelte 5 before adding them. The diagram only renders in the browser.
- **Interaction.** Nodes can't be dragged and connections can't be drawn by hand. Pan and zoom are allowed.
- **Layout.** Positions are computed from the steps and connections, leaving out ask-customer return edges.
- **Steps.**
  - Each step type has a custom node showing its key content: the question, reply text, rule count and so on.
  - Nodes are coloured by the `/topics` categories: starts the flow, decided by Jev, bot action, goes to a person.
  - A small legend explains the colours.
- **Connections.** Each connection is labelled with its outcome (`high`, `medium`, `low`, `matched`, `clear`, or a path name). Ask-customer returns are drawn as a distinct "back to" link, like screenshot 1's "↻ Back to this branch".
- **Open outcomes.** Every required outcome that has no connection is drawn as a "+" node. Clicking it does nothing yet.
- **Errors.** Validation errors are listed next to the diagram, and the node each error's location names is highlighted.
- **Selecting.** Clicking a node selects it and shows its details read-only in a side panel. Ticket 03 turns this into the editor.
- This replaces the read-only step list from ticket 01 on `/topics/[id]`.

**Blocked by:** 01 — Topics stored in D1, listed on /topics

**Status:** done

- [x] Both starter topics render as tidy top-down diagrams with every step, every labelled connection and the "back to" links, matching the structure in screenshot 1.
- [x] A draft with a missing connection shows a "+" node at that outcome, and the error is listed and highlighted on the step.
- [x] Nodes can't be dragged. Panning and zooming work.
- [x] Clicking a node shows that step's details in the side panel.
- [x] The page works at laptop width, and on a phone the side panel stacks below.
- [x] `npm run check`, `npm run lint` and `npm test` pass, and the production build still serves the page in workerd.

## Comments

**2026-09-26, implementation notes:**

- **Code layout:** the diagram lives in `src/lib/flow-diagram/`:
  - `layout.ts`: `buildDiagram(topic)` does the dagre layout from the topic only, and `withState` applies the selection and error badges afterwards.
  - `FlowDiagram.svelte`: the Svelte Flow canvas, with the legend top-left and the zoom controls bottom-left.
  - `StepNode.svelte` and `SlotNode.svelte`: the step and "+" nodes.
  - `StepDetails.svelte`: the read-only side panel. Ticket 03 turns it into the editor.
  - `step-display.ts`: labels, colour categories and node summaries.
- **Node sizes:** nodes are a fixed 240×104 with clamped text, so dagre needs no measuring. The side panel shows the full text.
- **Topic-model additions:**
  - `openOutcomes(topic, step)` returns outcomes with no connection to an existing step, each listed once. It feeds the "+" slots, and ticket 04 will reuse it.
  - `errorStepId(error, topic)` maps an error to an existing step by reading `describeLocation`'s format. Its tests cover both through real errors.
- **Duplicate step ids:** the diagram isn't drawn while step ids are duplicated, because Svelte Flow needs unique ids. Ticket 06's import now rejects duplicate step ids.
- **Server rendering:** the diagram renders client-side only; the server sends a "Drawing the flow…" placeholder.
- **Checked in Chrome:**
  - **Layout:** both starter topics are 13 nodes in 5 rows, no overlaps, with 15 edges including 2 "↻ Back to this branch" links.
  - **Selection:** clicking a node selects it and fills the side panel, and error links select their step.
  - **Open outcomes:** a missing or dangling connection shows a "+" slot plus an error badge.
  - **Interaction:** nodes aren't draggable, panning works, and the zoom controls are there.
  - **Phone width:** at 400px the side panel stacks below with no horizontal scroll.
- **Two browser caveats:**
  - Svelte Flow only draws edges in a visible tab, because it measures on an animation frame.
  - The Dark Reader extension recolours the page; the app only has a light theme.
