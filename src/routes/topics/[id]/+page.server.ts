import { error } from '@sveltejs/kit';
import { topicStoreFor, validateDraft } from '$lib/server/topic-store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, platform }) => {
	const record = await topicStoreFor(platform).get(params.id);
	if (!record) error(404, `There's no topic "${params.id}".`);

	const { topic, errors } = validateDraft(record);
	return {
		id: record.id,
		name: topic?.name ?? record.id,
		published: record.published,
		updatedAt: record.updatedAt,
		topic: topic ?? null,
		errors
	};
};
