import { bundledTopics } from '$lib/server/bundled-topics';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({
	topics: bundledTopics.topics,
	errors: bundledTopics.errors
});
