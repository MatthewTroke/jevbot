import { parseTopicShape } from './topics';

// Where a stored topic stands between its draft and what customers get.

export type TopicStatus = 'draft only' | 'unpublished changes' | 'published';

export function topicStatus(draft: string, published: string | null): TopicStatus {
	if (published === null) return 'draft only';
	return sameTopic(draft, published) ? 'published' : 'unpublished changes';
}

/**
 * Compares two topic JSON texts by content: formatting and default values the parser fills in
 * (such as `resolve: false`) don't count as changes.
 */
function sameTopic(a: string, b: string): boolean {
	return canonical(a) === canonical(b);
}

function canonical(source: string): string {
	const topic = parseTopicShape(source);
	if (topic) return JSON.stringify(topic);
	try {
		return JSON.stringify(JSON.parse(source));
	} catch {
		return source;
	}
}
