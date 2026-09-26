// Where a stored topic stands between its draft and what customers get.

export type TopicStatus = 'draft only' | 'unpublished changes' | 'published';

export function topicStatus(draft: string, published: string | null): TopicStatus {
	if (published === null) return 'draft only';
	return sameJson(draft, published) ? 'published' : 'unpublished changes';
}

/** Compares two JSON texts, ignoring formatting. */
function sameJson(a: string, b: string): boolean {
	const normalise = (text: string) => {
		try {
			return JSON.stringify(JSON.parse(text));
		} catch {
			return text;
		}
	};
	return normalise(a) === normalise(b);
}
