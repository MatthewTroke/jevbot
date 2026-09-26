import type { Handle } from '@sveltejs/kit';
import { createTopicStore } from '$lib/server/topic-store';

// Make sure the starter topics are loaded before the first request that needs them. Loading
// is idempotent, so concurrent first requests each just check and move on; once it has
// succeeded, this Worker instance skips the check.
let starterTopicsReady = false;

export const handle: Handle = async ({ event, resolve }) => {
	const db = event.platform?.env.DB;
	if (db && !starterTopicsReady) {
		try {
			await createTopicStore(db).loadStarterTopics();
			starterTopicsReady = true;
		} catch (cause) {
			if (String(cause).includes('no such table')) {
				throw new Error(
					'The database has no tables yet. Locally, run `npm run db:migrate`; for a deployed Worker, run `npx wrangler d1 migrations apply jevbot --remote`.',
					{ cause }
				);
			}
			throw cause;
		}
	}
	return resolve(event);
};
