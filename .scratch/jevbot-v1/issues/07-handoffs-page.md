# 07 — Handoffs page

**Spec:** `.scratch/jevbot-v1/spec.md` (see "D1 schema" and "Server and pages").

**What to build:** Every handoff is recorded with a specific reason, and a Handoffs page lets a support agent see who needs follow-up and why.

- Add a D1 migration for `handoffs`: conversation, reason text, source, topic and timestamp. The source is one of: rule, path, low confidence, fallback, unanswered or customer request.
- Whenever `decideTurn` returns a handoff record, the message endpoint saves it alongside the conversation's `handed_off` status.
- Reasons are specific, for example:
  - the rule that fired and its probability;
  - the hand_off step's reason tag (e.g. "damaged item");
  - "low topic confidence" with the value;
  - "no topic matched";
  - "unanswered: <question>";
  - "customer asked for a person".
- The `/handoffs` page is read-only and lists handoffs newest first, with the time, topic and reason. Each expands (or links) to the reason and the full transcript, including messages sent after the handoff.

**Blocked by:** 05 — Chat with saved conversations

**Status:** ready-for-agent

- [ ] The D1 migration applies cleanly on top of 05's migrations.
- [ ] Handing off in `/chat` through each kind of route creates exactly one handoff with a matching source and a readable reason. The routes are: a rule, the `damaged` path, low topic confidence, and the fallback plus a request for a person.
- [ ] `/handoffs` lists them newest first with time, topic and reason.
- [ ] Opening a handoff shows the full transcript in order, including messages sent after the handoff.
- [ ] If a test is added at the `decideTurn` seam, it asserts the handoff record's source and reason for at least one of each kind.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
