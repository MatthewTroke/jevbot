import { error } from '@sveltejs/kit';
import { topicStatus, type TopicStatus } from '$lib/topic-model/status';
import { validateStoredTopic } from '$lib/topic-model/topics';
import { validStarterTopics } from './starter-topics';

// Topics live in D1 as topic JSON: a draft that the builder edits (possibly invalid) and the
// published version customers get (null while unpublished). See migrations/.

export type TopicRecord = {
	id: string;
	/** Topic JSON as last edited. May be invalid. */
	draft: string;
	/** Topic JSON customers get, or null while unpublished. */
	published: string | null;
	status: TopicStatus;
	createdAt: string;
	updatedAt: string;
	publishedAt: string | null;
};

type TopicRow = {
	id: string;
	draft: string;
	published: string | null;
	created_at: string;
	updated_at: string;
	published_at: string | null;
};

const TOPIC_COLUMNS = 'id, draft, published, created_at, updated_at, published_at';
/** The current time as an ISO-8601 string, matching the table defaults. */
const SQL_NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
const STARTER_TOPICS_LOADED = 'starter_topics_loaded';

export function createTopicStore(db: D1Database) {
	return {
		/**
		 * Loads the bundled starter topics into an empty database, as draft and published.
		 * Runs once ever: a settings flag stops deleted starter topics from coming back. Safe
		 * to repeat or run concurrently.
		 */
		async loadStarterTopics(): Promise<void> {
			const loaded = await db
				.prepare('SELECT 1 FROM settings WHERE key = ?')
				.bind(STARTER_TOPICS_LOADED)
				.first();
			if (loaded) return;

			const topicCount = await db
				.prepare('SELECT COUNT(*) AS count FROM topics')
				.first<number>('count');
			const inserts =
				topicCount === 0
					? validStarterTopics().map(({ id, source }) =>
							db
								.prepare(
									`INSERT OR IGNORE INTO topics (id, draft, published, published_at)
									 VALUES (?, ?, ?, ${SQL_NOW})`
								)
								.bind(id, source, source)
						)
					: [];
			await db.batch([
				...inserts,
				db
					.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
					.bind(STARTER_TOPICS_LOADED, 'true')
			]);
		},

		async list(): Promise<TopicRecord[]> {
			const { results } = await db
				.prepare(`SELECT ${TOPIC_COLUMNS} FROM topics ORDER BY id`)
				.all<TopicRow>();
			return results.map(toRecord);
		},

		async get(id: string): Promise<TopicRecord | null> {
			const row = await db
				.prepare(`SELECT ${TOPIC_COLUMNS} FROM topics WHERE id = ?`)
				.bind(id)
				.first<TopicRow>();
			return row ? toRecord(row) : null;
		}
	};
}

export type TopicStore = ReturnType<typeof createTopicStore>;

/** The topic store for this request's D1 binding. */
export function topicStoreFor(platform: App.Platform | undefined): TopicStore {
	if (!platform?.env.DB) error(500, 'The D1 database binding (DB) is unavailable.');
	return createTopicStore(platform.env.DB);
}

/** Validates a stored topic's draft, with errors named after its id. */
export const validateDraft = (record: TopicRecord) =>
	validateStoredTopic({ id: record.id, source: record.draft });

function toRecord(row: TopicRow): TopicRecord {
	return {
		id: row.id,
		draft: row.draft,
		published: row.published,
		status: topicStatus(row.draft, row.published),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		publishedAt: row.published_at
	};
}
