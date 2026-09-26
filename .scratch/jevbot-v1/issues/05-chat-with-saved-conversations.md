# 05 — Chat with saved conversations

**Spec:** `.scratch/jevbot-v1/spec.md`. The key sections are "D1 schema" and "Server and pages". Visual reference: `docs/screenshots/3-customer-chat.png`.

**What to build:** A working `/chat` page backed by D1.

- A customer types a message.
- The server loads the conversation and the published topics from D1, runs `decideTurn` with the real Jev adapter, and saves everything.
- The bot's pre-written reply appears in the chat.
- Every Jev call is logged.

Details:

- **D1:**
  - D1 is already set up by flow-builder ticket 01, which holds topics and settings. This ticket adds migrations for `conversations` (status, waiting step, current topic, timestamps), `messages` (role, text, buttons, turn trace, Jev call reference) and `jev_calls` (request, response, ok or error, error text, latency, model version, input and output tokens). Handoffs get their own table in 07.
  - Use plain prepared statements with no ORM.
  - Don't create remote Cloudflare resources without asking the user.
- **Topics:** use the published topics from the flow builder's topic store, validated with `loadTopics`. Drop invalid ones defensively. Use the effective settings if flow-builder ticket 07 is done, and the config defaults otherwise.
- **Message endpoint:** accepts a customer message for a conversation, creating the conversation if needed.
  - Runs `decideTurn` and saves the customer message, the bot message (with its buttons and trace), the new status and waiting step, and the Jev call log entry.
  - Failed Jev calls are logged too.
  - Returns the bot reply, buttons and trace.
- **`/chat`:**
  - Styled after screenshot 3 with plain CSS: bubbles, pill buttons and a bottom input.
  - Buttons show on the latest bot message only. Tapping one sends its label as an ordinary customer message.
  - The customer can always type instead.
  - The conversation id is in the URL, so a reload shows the full conversation, and a "New conversation" button starts a new one.
  - A Jev failure shows the polite retry message.
- The spike route from 01 is removed.

**Blocked by:** 04 — decideTurn: one Jev call walks a fresh message to a reply, question or handoff; flow-builder 01 — Topics stored in D1, listed on /topics (`.scratch/flow-builder/issues/01-topics-stored-in-d1.md`)

**Status:** ready-for-agent

- [ ] Local D1 migrations apply cleanly from scratch with Wrangler.
- [ ] In `npm run dev`, a clear return question in `/chat` gets a pre-written `return_policy` reply from real Jev. For example: "can i send back shoes i bought last week? still in the box".
- [ ] A question the bot can't place gets the fallback reply with a "Talk to a person" button.
- [ ] A reply that ends on an ask_customer step shows its buttons, and tapping one appears as a customer message and is sent to the server.
- [ ] Reloading the page restores the conversation, including buttons on the latest bot message.
- [ ] "New conversation" starts a fresh conversation with a new id.
- [ ] Every Jev call, successful or failed, has a `jev_calls` row with request, response, latency, model version and token usage.
- [ ] The conversation's status and waiting step are saved after each turn. Resuming from the waiting step comes in 06.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
