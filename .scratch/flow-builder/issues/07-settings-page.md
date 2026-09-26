# 07 — Settings page

**Spec:** `.scratch/flow-builder/spec.md` (section "Settings page").

**What to build:** A flow builder can tune the bot's caution and fallback without touching code.

- **`/settings`** lets the user:
  - Choose the active preset (Careful, Balanced or Confident). Each preset's `act`, `confirm` and `rule` thresholds are shown next to it.
  - Choose the fallback mode: reply or hand off.
  - Edit the fallback reply text.
- **Storage.** Values are saved in the D1 settings table. Anything not yet saved falls back to the defaults in the thresholds config module from v1 ticket 04.
- **Reading settings.** A server-side function returns the effective settings, merging D1 values over the defaults. The per-message flow (v1 ticket 05) and "See what Jev gets" use it.
- Add Settings to the header navigation.

**Blocked by:** 01 — Topics stored in D1, listed on /topics; v1 ticket 04 — decideTurn (`.scratch/jevbot-v1/issues/04-decide-turn-for-a-fresh-message.md`), which provides the thresholds config

**Status:** ready-for-agent

- [ ] A fresh database shows the config defaults (Balanced, reply mode, the default fallback text).
- [ ] Changing each setting persists across reloads, and the effective-settings function returns the new values.
- [ ] Empty fallback text is rejected with a clear message.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
