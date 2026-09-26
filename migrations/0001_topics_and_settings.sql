-- Migration number: 0001 	 2026-09-26T10:31:32.926Z

-- Topics are hand-built flows stored as topic JSON (the same format as src/lib/topics/*.json).
-- `draft` is what the builder edits and may be invalid; `published` is what customers get
-- and is NULL while the topic is unpublished.
CREATE TABLE topics (
	id TEXT PRIMARY KEY,
	draft TEXT NOT NULL,
	published TEXT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	published_at TEXT
);

-- App settings as key/value pairs, with JSON values.
CREATE TABLE settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);
