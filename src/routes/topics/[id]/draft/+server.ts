import { error, json } from '@sveltejs/kit';
import { topicStoreFor } from '$lib/server/topic-store';
import { topicIdOf } from '$lib/topic-model/topics';
import type { RequestHandler } from './$types';

/** Generous for hand-built flows, and well under D1's row size limit. */
const MAX_DRAFT_BYTES = 512 * 1024;

/**
 * Saves the builder's draft of a topic. Drafts may have errors, but must be JSON for this
 * topic: the id isn't changed through here.
 */
export const PUT: RequestHandler = async ({ request, params, platform }) => {
	if (Number(request.headers.get('content-length') ?? 0) > MAX_DRAFT_BYTES) {
		error(413, 'The draft is too large to save.');
	}
	const draft = await request.text();
	if (new TextEncoder().encode(draft).length > MAX_DRAFT_BYTES) {
		error(413, 'The draft is too large to save.');
	}
	if (topicIdOf(draft) !== params.id) {
		error(400, `The draft must be topic JSON with the id "${params.id}".`);
	}

	const updatedAt = await topicStoreFor(platform).saveDraft(params.id, draft);
	if (!updatedAt) error(404, `There's no topic "${params.id}".`);
	return json({ updatedAt });
};
