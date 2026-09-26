# Spec: Jevbot v1: a topic-flow support chatbot driven by Jev

Status: ready-for-agent

## Problem Statement

I want a customer-support chatbot whose behaviour I fully control and can audit. LLM chatbots write their own replies, so they can say things I never approved, and I can't easily see why they said them. What I want is:

- Every word the bot says is pre-written by me in a topic flow.
- Every decision the bot makes (which topic this is, which path to take, whether to hand off to a person) is a typed, scored answer I can inspect and tune.

I also need to know whether Jev, TypeSafe's System One model, can make those decisions accurately and cheaply enough in one call per customer message. And I need to know that this works on a Cloudflare-first stack.

Right now I have nothing to test that with. I have no topic format, no chat to try messages in, no view of why the bot chose a path, no record of conversations handed to a person, and no way to measure accuracy while I tweak question wording and thresholds.

## Solution

A single-user prototype web app on Cloudflare Workers (SvelteKit):

- **Topics** are hand-written JSON files bundled into the app. Each topic has:
  - a name, a one-line description and 3–5 example customer questions;
  - a flow of steps and connections.

  Topics are validated when they load. Invalid ones are left out of matching, and their errors are shown on a read-only Topics page.

- **Each customer message makes exactly one Jev call.** The call asks every question at once: which topic this is (or "other"), every branch question in every topic, and every handoff rule as a yes/no question.
- **Plain TypeScript walks the flow.** It starts from the matched topic, or resumes the step the conversation was waiting on. It uses Jev's answers and a thresholds preset (Balanced to start) and ends by sending a pre-written reply, asking the customer a button question, or handing off to a person.
- **The Chat page** is a test chat. Button questions render as tappable pills. A debug panel shows every Jev answer, its confidence and the path taken through the flow.
- **The Handoffs page** lists conversations handed to a person, with the transcript and the reason.
- **Everything is stored in D1:** conversations, messages, waiting state, handoffs and a log of every Jev call (request, response, latency, model version).
- **An eval script** runs sample messages with expected topics and paths against the real Jev. It reports accuracy so I can tune wording and thresholds.

No LLM is used anywhere. Jev only chooses among options we provide. It never writes text.

## User Stories

### Writing topics

1. As the developer, I want to define a topic as a JSON file with a name, a one-line description and 3–5 example customer questions, so that Jev can recognise when a message is about that topic.
2. As the developer, I want to describe a topic's behaviour as a flow of steps and connections, so that I control exactly what the bot does and says.
3. As the developer, I want a `when` entry step that uses the topic's name, description and examples, so that every flow has one clear starting point.
4. As the developer, I want a `check_rules` step that lists plain-English handoff conditions, so that risky conversations (an upset customer, a damaged item, legal or chargeback threats, a request for a person) go straight to a person.
5. As the developer, I want a `confidence_gate` step with high, medium and low outcomes on the topic match, so that the bot acts when sure, confirms when unsure and hands off when it has no idea.
6. As the developer, I want a `branch` step with a question for Jev and named paths that each have a short description, so that the flow can split on facts stated in the conversation.
7. As the developer, I want every branch to automatically get a `not_stated` option in the Jev question, so that Jev never has to guess when the customer hasn't said.
8. As the developer, I want a `send_reply` step with fixed reply text and an optional "mark resolved" flag, so that answers are exactly what I wrote.
9. As the developer, I want an `ask_customer` step with a question and button options that returns to a named branch on the next message, so that the bot can collect a missing fact and continue.
10. As the developer, I want a `hand_off` step with a customer-facing message and a reason tag, so that the customer knows a person will follow up and my team knows why.
11. As the developer, I want to write each branch question and handoff rule with its full meaning in plain English, so that Jev understands it even though question IDs aren't sent to the model.
12. As the developer, I want a medium-confidence topic match to lead to an ask_customer step I wire myself ("Is this about a return?") that returns to a confirmation branch, so that confirming a topic uses the same building blocks as everything else.
13. As the developer, I want an example `return_policy` topic that matches the flow in screenshot 1 (minus the documents fallback), so that I have a realistic reference flow.
14. As the developer, I want an example `shipping_times` topic, so that topic matching has a real competitor and I can test switching topics.

### Validation

15. As the developer, I want topics validated when they load, so that I find authoring mistakes before a customer does.
16. As the developer, I want validation to reject unknown step types, so that typos can't create steps that silently do nothing.
17. As the developer, I want validation to reject dead ends: a non-final step missing an outgoing connection, or a connection pointing at a step that doesn't exist. That way every message ends in a reply, a question or a handoff.
18. As the developer, I want validation to require a `not_stated` connection on every branch, so that the "not stated" outcome always has somewhere to go.
19. As the developer, I want validation to reject loops except an ask_customer step returning to its branch, so that the walker can never spin forever.
20. As the developer, I want validation to require that a check_rules step's "rule matched" connection leads to a hand_off step, so that any true rule really hands off.
21. As the developer, I want validation to enforce Jev's limit of 255 options per Choice, for the topic question (all topics plus "other") and for each branch, so that calls never fail on option count.
22. As the developer, I want validation to reject duplicate topic IDs, duplicate step IDs and reserved names (`not_stated`, `other`) used as my own path or topic names, so that answers can't be ambiguous.
23. As the developer, I want invalid topics excluded from matching while valid ones keep working, so that one broken file doesn't take the whole bot down.
24. As the developer, I want each validation error to name the file, the step or field and the problem in plain words, so that I can fix it without reading the validator.
25. As the developer, I want a Topics page listing every loaded topic (name, description, examples, steps, rules) and every validation error, so that I can see what the bot currently knows.

### Chatting

26. As a customer, I want to type a question in a chat and get an instant reply, so that I can get help without waiting for a person.
27. As a customer, I want ask_customer questions to show tappable buttons, so that I can answer with one tap.
28. As a customer, I want to be able to type a free-text answer instead of tapping a button, so that I'm not forced into the given options.
29. As a customer, I want the bot to skip a follow-up question when I've already answered it (for example "still in the box"), so that I don't repeat myself.
30. As a customer, I want the bot to ask me to confirm the topic when it's only fairly sure, so that I don't get an answer to the wrong question.
31. As a customer, I want to be handed to a person when I'm upset, the item is damaged, I mention legal action or a chargeback, or I ask for a person, so that serious problems get human attention.
32. As a customer, I want a clear message telling me a person will follow up when I'm handed off, so that I know what happens next.
33. As a customer, I want to change the subject while the bot is waiting on a question and have it follow me to the new topic, so that I'm not stuck in the old flow.
34. As a customer, I want a helpful fallback reply, with a "Talk to a person" button, when my question isn't about any topic the bot knows, so that I'm never left with nothing.
35. As a customer, I want to be handed off rather than asked the same question over and over when my answer is unclear twice, so that the bot doesn't loop.
36. As a customer, I want to ask a new question after my previous one was resolved and get a fresh answer, so that one conversation can cover several needs.
37. As a customer, I want a polite "please try again" message if the bot can't reach its decision service, so that a failure doesn't look like a wrong answer.
38. As the developer, I want the chat styled like screenshot 3 (bubbles, pill buttons, bottom input), so that tests feel like the eventual product.
39. As the developer, I want to start a new conversation from the chat page and to reload the page without losing the current conversation, so that I can run many tests quickly.

### Debugging and tuning

40. As the developer, I want a debug panel beside the chat showing, for each bot turn, every Jev answer (the topic with its confidence and probabilities, every branch answer with confidence, every rule's probability), so that I can see exactly what Jev thought.
41. As the developer, I want the debug panel to show the path taken through the flow (each step, the answer used and the decision made, including thresholds applied and any "unsure → not_stated" downgrade), so that I understand why the bot replied as it did.
42. As the developer, I want the debug panel to show the active preset, the model version that answered, the latency and the token usage, so that I can judge cost and speed.
43. As the developer, I want the debug panel to show which answers were ignored (branches and rules of topics that didn't match), so that I can see the full picture of the one call.
44. As the developer, I want Careful, Balanced and Confident threshold presets in one config file, with one active at a time, so that I can tune how cautious the bot is without touching flow code.
45. As the developer, I want the global fallback behaviour (generic reply or hand off), the fallback reply text, the default handoff message and the number of recent messages sent to Jev in the same config, so that all tuning knobs live in one place.
46. As the developer, I want every Jev request, response, latency, model version, token usage and error logged in D1, so that I can audit and debug any decision after the fact.
47. As the developer, I want an eval script that runs a list of sample messages (optionally with earlier conversation and a waiting step) with expected topics and paths against the real Jev, so that I can measure accuracy.
48. As the developer, I want the eval script to report topic accuracy, path accuracy, each failure with Jev's answers and confidences, and the model version, so that I know what to change when a case fails.
49. As the developer, I want to run the eval against a chosen preset, so that I can compare presets on the same cases.
50. As the developer, I want the Jev integration isolated behind one function (state and questions in, typed answers out), so that I can swap in TypeSafe's HTTP API later without touching flow logic.

### Handoffs

51. As a support agent, I want a Handoffs page listing handed-off conversations with time, topic and reason, so that I know who to follow up with and why.
52. As a support agent, I want to open a handoff and read the full transcript, including messages sent after the handoff, so that I have all the context before replying.
53. As a support agent, I want the handoff reason to be specific (which rule fired and its probability, the path's reason tag, low topic confidence, no topic matched, an unanswered question, or a customer request), so that I can prioritise.
54. As a customer who has been handed off, I want further messages acknowledged with the "a person will follow up" message, so that I know I'm still in the queue.

## Implementation Decisions

### Provider and the Jev adapter

- **Provider:** the Cloudflare Workers AI binding with model `typesafe/jev`, called as `run` with exactly `state` and `questions`. This requires AI Gateway (the default gateway is fine) and Unified Billing on the Cloudflare account. The binding can't pin a model version. We accept that and log the `model` field every response returns. The TypeSafe HTTP API is not built in v1.
- **Jev adapter module:** one server-only module with one function, `ask(state, questions) → answers`. It returns typed answers plus the model version, token usage, latency and the raw request and response for logging.
  - It owns our own TypeScript types for the Jev request and response, because the Workers types package has no entry for this model.
  - It validates the response with Zod.
  - It maps failures (network, non-OK response, schema mismatch) to one typed Jev error.
  - It is the only code that touches `env.AI`. Everything else depends on a `Jev` interface, so tests pass a fake and the eval script passes the real one.
- **Wire format facts** (see `docs/research/jev-api.md`):
  - `type` values are lowercase (`choice`, `noul`).
  - Question keys aren't sent to the model, but Choice option keys and their descriptions are.
  - A Choice answer has `choice`, `probabilities` and `confidence`.
  - A Noul answer has only `noul`, a probability of yes. It has no confidence.

### Topic model

- **Topic fields:** `id` (snake_case, unique, used as the option key in the topic question, so it must be a meaningful word), `name`, `description` (one line), `examples` (3–5 strings), `steps` and `connections`.
- **Steps:** each step has an `id` unique within its topic and one of seven types:
  - `when`: the entry step. Exactly one per topic, with no extra fields.
  - `check_rules`: a list of rules, each with an `id` and a plain-English condition.
  - `confidence_gate`: no fields. It reads the active preset.
  - `branch`: a question with its full meaning in plain English, and named paths, each with a snake_case id and a short description. `not_stated` is reserved and is added to the Jev Choice automatically with a standard description.
  - `send_reply`: the reply text and a `resolve` flag.
  - `ask_customer`: the question text, button labels, and the id of the branch the next message returns to.
  - `hand_off`: the customer-facing message and a reason tag.
- **Connections:** each connection has `from`, `to` and an outcome label. The labels each step needs are:
  - `when`: one unlabelled connection.
  - `check_rules`: `matched` and `clear`.
  - `confidence_gate`: `high`, `medium` and `low`.
  - `branch`: one per path, plus `not_stated`.

  `ask_customer` has no outgoing connection; its return-to-branch is declared on the step. `send_reply`, `ask_customer` and `hand_off` end the turn.

- **Confirming a topic** is not special-cased. The example topic wires `medium` to an ask_customer ("Is this about a return?", buttons Yes/No) that returns to a confirmation branch (paths `yes` and `no`). The `yes` path continues into the main flow.
- **Topic loading:** topic files are bundled at build time. The loader is a pure `loadTopics(files) → { topics, errors }`, validated with Zod plus graph checks:
  - one `when` step, and known step types only;
  - every connection points at an existing step, and every non-final step has all its required outgoing labels;
  - every branch has a `not_stated` connection;
  - a check_rules `matched` connection leads to a hand_off step;
  - an ask_customer returns to a branch in the same topic;
  - the graph is acyclic once ask_customer return edges are removed;
  - every step is reachable from `when` (return edges count);
  - no duplicate ids and no reserved names;
  - the topic Choice (valid topics + `other`) and every branch Choice (paths + `not_stated`) have at most 255 options.

  Each error carries the file name, a pointer to the offending step or field, and a plain-English message. Invalid topics are dropped from matching.

### Thresholds config

One config module holds the tuning knobs:

- the three presets and which one is active;
- the fallback mode (`reply` or `hand_off`), the fallback reply text and the fallback's own handoff rules (default: "the customer asks to talk to a person");
- the default handoff message, used when a handoff has no hand_off step (for example, an unanswered question);
- the size of the recent-message window sent to Jev (default: 6 messages).

Each preset sets three thresholds:

- `act`: the minimum topic confidence for the high outcome, and the minimum branch confidence for taking a path.
- `confirm`: the minimum for the medium outcome. Below it is low.
- `rule`: the minimum handoff-rule probability that counts as true.

| Preset    | act ≥ | confirm ≥ | rule ≥ |
| --------- | ----- | --------- | ------ |
| Careful   | 0.85  | 0.6       | 0.4    |
| Balanced  | 0.7   | 0.5       | 0.6    |
| Confident | 0.6   | 0.4       | 0.8    |

The Balanced values come from the brief and screenshot 2. The Careful and Confident values are proposed starting points to tune with the eval script.

### The one Jev call per message

- **State:** a structured object holding the recent transcript (role + text, including the bot's own replies and button questions, so a reply like "Yes" has context) and the latest customer message.
- **Questions, all in the same call:**
  - `topic`: a Choice over every valid topic id plus `other`. Each option's description holds the topic's name, description and example questions. `other` means none of them fit.
  - One Choice per branch in every valid topic: the branch's question as instructions, its paths plus `not_stated` as options.
  - One Noul per handoff rule in every valid topic, plus the fallback's rules. The instructions wrap the rule's condition as a yes/no question about the conversation.
  - Question keys are namespaced (for example by topic and step) so answers map back to steps.
- Answers for topics that didn't match are ignored by the walker but kept for the debug panel and the log.
- Never ask Jev about dates, amounts or math. The example topics' rules and branches are about what the customer said, not calculations.

### The decision function (`decideTurn`)

`decideTurn` is a pure function of topics, conversation state, config and an injected `Jev`. Conversation state is the status, the recent messages, the latest message, and the waiting step if any. It returns:

- the bot reply (text plus optional buttons);
- the new status (`open`, `resolved` or `handed_off`);
- the new waiting step (or none);
- a handoff record (reason text and source) when handing off;
- a trace of every step visited, with the answer, confidence, threshold and outcome;
- the Jev call record (or error).

It works through these rules in order:

1. **Handed-off conversation:** make no Jev call and repeat the handoff message.
2. **Resolved conversation:** treat the message as fresh (the status goes back to open).
3. **Otherwise,** build the questions and call Jev once.
4. **If waiting on an ask_customer step:**
   - First check the waiting topic's handoff rules. If any rule's probability is at or above `rule`, follow that check_rules step's `matched` connection.
   - Otherwise, if the waiting branch's answer is `not_stated` and the topic answer is a different topic at or above `act`, drop the waiting step and start that topic's flow fresh.
   - Otherwise, resume at the waiting branch with its answer.
5. **Starting fresh:**
   - If the topic is `other`, apply the fallback. In `hand_off` mode, hand off. In `reply` mode, check the fallback rules and hand off if any is true; otherwise send the fallback reply with a "Talk to a person" button.
   - Otherwise walk the matched topic from `when`.
6. **Walking the flow:**
   - `check_rules`: `matched` if any of its rules is at or above `rule`, otherwise `clear`.
   - `confidence_gate`: compares the topic answer's `confidence` with `act` and `confirm`.
   - `branch`: takes the chosen path, but a `confidence` below `act` is downgraded to `not_stated`.
   - `send_reply`: emits its text and marks the conversation resolved if the step says to.
   - `ask_customer`: emits the question and buttons and records the waiting step (topic, ask step, branch).
   - `hand_off`: emits its message and creates a handoff with its reason tag plus context.
7. **Repeat-question cap:** if the walk would ask the same ask_customer step the conversation was just waiting on, hand off instead with reason "unanswered: <question>". An ask_customer step is never asked twice in a row.
8. **Safety cap:** a cap on steps per turn guards the walker even though validation already forbids loops.
9. **Jev errors:** if the call fails, reply with a polite "please try again" message, leave the conversation state unchanged, and record the error. It doesn't hand off.

### Buttons

Tapping a button sends its label as an ordinary customer message. It shows as a customer bubble and goes through Jev like typed text. Buttons don't map directly to paths, so Jev still makes every decision.

### D1 schema

Created with Wrangler D1 migrations and accessed with prepared statements (no ORM).

| Table           | Columns                                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversations` | id, status, waiting step (JSON or null), current topic, created and updated timestamps                                                                     |
| `messages`      | id, conversation, role (customer or bot), text, buttons (JSON, bot only), turn trace (JSON, bot only), Jev call reference, timestamp                       |
| `handoffs`      | id, conversation, reason text, source (rule, path, low confidence, fallback, unanswered or customer request), topic, timestamp                             |
| `jev_calls`     | id, conversation, customer message, request JSON, response JSON, ok or error, error text, latency in ms, model version, input and output tokens, timestamp |

### Server and pages

- **Server:** SvelteKit server routes on Cloudflare Workers.
  - One endpoint accepts a customer message for a conversation. It loads the conversation, calls `decideTurn`, persists everything and returns the bot reply, buttons and debug trace.
  - Page loads read D1 directly.
  - All Jev calls are server-side only.
- **`/chat`:** styled after screenshot 3, with plain CSS and the screenshot's warm palette.
  - The conversation id is in the URL, so a reload resumes the conversation, and a "New conversation" button starts another.
  - Buttons show on the latest bot message only.
  - The debug panel sits beside the chat and has a per-turn view with a raw request and response toggle.
- **`/topics`:** read-only. Shows the loaded topics, their steps, rules and examples, and the validation errors.
- **`/handoffs`:** a list of handoffs, newest first. Each expands to its reason and full transcript.

### Example topics

- **`return_policy`:**
  - Rules: upset customer, damaged item, legal action or chargeback, asks for a person.
  - The gate's `medium` outcome leads to the confirmation ask plus branch, and `low` hands off.
  - Main branch "What condition is the item in?":
    - `unworn`: reply with return steps and the prepaid label, then mark resolved.
    - `worn`: reply "worn items can't be returned".
    - `damaged`: hand off, tagged "damaged item".
    - `not_stated`: ask "Has it been worn or used?" with buttons for unworn, worn and damaged, which returns to the branch.
- **`shipping_times`:**
  - Its own rules, gate and a branch over shipping options (for example domestic standard, domestic express, international), with `not_stated` leading to a button question.
  - Reply text uses bracketed placeholders like screenshot 3 (for example "[3–5] business days").

### Eval script

- An npm script runs cases from a JSON file. Each case has:
  - a message;
  - optionally, earlier transcript and a waiting step;
  - the expected topic;
  - the expected path (the sequence of step ids, or the final step).
- It runs in Node and gets the real Workers AI binding through Wrangler's platform proxy, so it runs the same `decideTurn` and Jev adapter as production. It doesn't touch D1.
- It takes a `--preset` option.
- It prints per-case pass or fail with Jev's topic and branch answers and confidences, a summary of topic and path accuracy, and the model version.
- It is not part of `npm test`, because it costs credits and needs `wrangler login`.

## Testing Decisions

- **What a good test is:** a good test drives a public seam with realistic inputs and asserts outcomes someone could observe: the reply text, buttons, status, waiting step, handoff reason, the trace's decisions, and the question set sent to Jev. It must not assert on private helpers or internal structure, so the walker can be refactored freely.
- **Seam 1, `loadTopics(files)`:** one small invalid fixture per validation rule, each asserting the error names the file, the location and the problem. Plus one test that loads the real bundled topic files and expects zero errors, so a bad edit to an example topic fails `npm test`.
- **Seam 2, `decideTurn(…, jev)`:** a fake `Jev` records the questions it received and returns canned answers keyed by question. The tests cover:
  - Question building: every valid topic plus `other` is in the topic Choice; every branch includes `not_stated`; every rule is a Noul; type values are lowercase; invalid topics are excluded.
  - Topic confidence: high confidence reaches the expected reply; medium leads to the confirmation ask; low hands off.
  - Rules: a rule at or above `rule` hands off with the rule named in the reason; a rule just below it doesn't.
  - Branches: a confident branch answer takes its path; a low-confidence answer is downgraded to `not_stated`, which leads to the ask.
  - Resuming: resuming a waiting branch takes the answered path in the same turn; a second unclear answer hands off as "unanswered"; a rule firing while waiting hands off; a confident different topic while waiting switches topics.
  - Fallback: `other` in `reply` mode sends the fallback reply with a button; `other` plus the "asks for a person" rule hands off; `hand_off` mode hands off.
  - Status: a handed-off conversation makes no Jev call; a resolved conversation starts fresh.
  - Presets: switching preset changes the outcome for the same answers.
  - Errors: a Jev error gives the retry message and leaves the state unchanged.
- **Not unit-tested:** the Jev adapter, D1 persistence and the Svelte pages stay thin. They're covered by the end-to-end spike, the eval script and manual checks in `/chat`.
- **Prior art:** none yet (fresh scaffold). Vitest is set up with a Node "server" test project and `requireAssertions`, so the scaffold's sample test can be replaced once real tests exist.

## Out of Scope

- A visual flow builder, publishing or drafting topics, the "See what Jev gets" page and the Settings page. These are no longer out of scope overall: they moved to their own spec, `.scratch/flow-builder/spec.md`, which is built right after ticket 03 and changes how topics are stored (D1 instead of bundled files).
- Documents, uploads, "Quote from docs", source citations and anything else document-related in the screenshots.
- Post-reply "That helped / Talk to a person" buttons and "Then: offer a person" on send_reply. The only "Talk to a person" button is on the fallback reply.
- Any LLM, including drafting topics or generating replies.
- Accounts, auth, billing, multi-tenancy, and embedding the chat on other sites.
- Live chat with humans. A handoff only records the conversation and tells the customer someone will follow up.
- The TypeSafe HTTP API adapter, pinning a model version, and Jev `score` questions.
- The Order tracking and Store hours topics shown in the screenshot sidebar.
- Cost and token-price displays beyond logging token usage.

## Further Notes

- **Ticket ordering constraint (from the brief):** the first ticket must be a thin end-to-end spike. It must prove a SvelteKit server route on Cloudflare can call Jev through the Workers AI binding and get a typed answer back for one hardcoded Choice question. Everything else depends on it.
- **Locations fixed by the brief:** these are user requirements, which is why the spec names them.
  - The Jev adapter lives in `src/lib/server/jev.ts`.
  - Topic files live in `/src/lib/topics`.
  - The thresholds config is one config file.
- **Jev rule from the brief:** read the Jev docs before writing Jev code. Start with `docs/research/jev-api.md` and re-check the linked pages. Never invent request fields or SDK methods. If unsure, ask the user.
- **Shipping:** deploying the full prototype isn't ticketed yet.
- **Account prerequisites:**
  - A Cloudflare account with `wrangler login` done.
  - AI Gateway plus Unified Billing credits for the third-party Jev model. The AI binding always runs remotely, even in local dev.
  - A D1 database created with Wrangler.

  Creating Cloudflare resources and deploying should be confirmed with the user when the ticket gets there.

- **Context budget:** Cloudflare gives Jev a 32k-token context. With two topics the call is small (screenshot 2 estimates about 1,700 input tokens). Adding many topics grows every call, because every branch and rule is always asked. Revisit this if the topic count grows.
- **Screenshots:** the visual references are in `docs/screenshots/`. The Jev API facts behind these decisions, with source links, are in `docs/research/jev-api.md`.
- **Clarifications from the user:**
  - The rule threshold is per preset (0.6 for Balanced).
  - While a conversation is waiting: rules first, then resume or switch topic.
  - A low-confidence branch answer counts as `not_stated`, and a second miss hands off.
  - The fallback is a config switch that defaults to a reply.
  - The provider is the Workers AI binding.
  - Thresholds compare against Jev's `confidence`.
  - The test seams are `loadTopics` and `decideTurn`.
