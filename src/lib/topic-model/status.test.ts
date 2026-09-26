import { describe, expect, it } from 'vitest';
import starterSource from '../topics/return_policy.json?raw';
import { applyEdit } from './edits';
import { topicStatus } from './status';
import { validateTopicFile } from './topics';

// What the builder saves: the parsed topic, which fills in defaults like `resolve: false`.
const parsed = validateTopicFile({ file: 'return_policy', source: starterSource }).topic!;
const saved = (topic = parsed) => JSON.stringify(topic, null, '\t');

describe('topicStatus', () => {
	it('is "draft only" when the topic was never published', () => {
		expect(topicStatus(starterSource, null)).toBe('draft only');
	});

	it('ignores formatting and default values the builder fills in', () => {
		expect(topicStatus(saved(), starterSource)).toBe('published');
	});

	it('reports unpublished changes when the content differs', () => {
		const edited = applyEdit(parsed, { type: 'update_topic', name: 'Returns' });

		expect(topicStatus(saved(edited), starterSource)).toBe('unpublished changes');
	});
});
