import { describe, expect, it } from 'vitest';
import { bundledTopics } from './bundled-topics';

describe('bundled topic files', () => {
	it('all load with no validation errors', () => {
		expect(bundledTopics.errors).toEqual([]);
		expect(bundledTopics.topics.map((t) => t.id)).toEqual(['return_policy', 'shipping_times']);
	});
});
