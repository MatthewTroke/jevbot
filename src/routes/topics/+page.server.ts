import { topicStoreFor, validateDraft } from '$lib/server/topic-store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform }) => {
	const records = await topicStoreFor(platform).list();
	return {
		topics: records.map((record) => {
			const { topic, errors } = validateDraft(record);
			return {
				id: record.id,
				name: topic?.name ?? record.id,
				description: topic?.description ?? '',
				status: record.status,
				errorCount: errors.length
			};
		})
	};
};
