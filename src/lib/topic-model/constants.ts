// Shared by the topic loader and the flow graph checks. Deliberately imports nothing, so
// those modules can use these at load time without a circular import.

/** Added by the app itself: `other` to the topic question, `not_stated` to every branch. */
export const OTHER = 'other';
export const NOT_STATED = 'not_stated';

/** Jev accepts at most this many options in one Choice question (docs/research/jev-api.md). */
export const MAX_CHOICE_OPTIONS = 255;
