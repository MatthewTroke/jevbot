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

**Status:** ready-for-agent

- [ ] Both starter topics render as tidy top-down diagrams with every step, every labelled connection and the "back to" links, matching the structure in screenshot 1.
- [ ] A draft with a missing connection shows a "+" node at that outcome, and the error is listed and highlighted on the step.
- [ ] Nodes can't be dragged. Panning and zooming work.
- [ ] Clicking a node shows that step's details in the side panel.
- [ ] The page works at laptop width, and on a phone the side panel stacks below.
- [ ] `npm run check`, `npm run lint` and `npm test` pass, and the production build still serves the page in workerd.
