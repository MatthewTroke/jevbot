import { describe, expect, it } from 'vitest';
import { loadTopics } from '$lib/topic-model/topics';
import { starterTopicFiles } from './starter-topics';

describe('starter topic files', () => {
	it('all load with no validation errors', () => {
		const { topics, errors } = loadTopics(starterTopicFiles());

		expect(errors).toEqual([]);
		expect(topics.map((t) => t.id)).toEqual(['return_policy', 'shipping_times']);
	});
});
