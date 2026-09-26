import { loadTopics, type TopicFile } from '$lib/topic-model/topics';

// The bundled starter topics (src/lib/topics/*.json), loaded into an empty database once.
// They're bundled as raw text so a JSON syntax error is reported like any other error.
const sources = import.meta.glob<string>('../topics/*.json', {
	query: '?raw',
	import: 'default',
	eager: true
});

export function starterTopicFiles(): TopicFile[] {
	return Object.entries(sources)
		.map(([path, source]) => ({ file: path.replace('../', 'src/lib/'), source }))
		.sort((a, b) => a.file.localeCompare(b.file));
}

/** The valid starter topics, each with its file's original text. */
export function validStarterTopics(): { id: string; source: string }[] {
	const files = starterTopicFiles();
	const failed = new Set(loadTopics(files).errors.map((error) => error.file));
	return files
		.filter((file) => !failed.has(file.file))
		.map((file) => ({ id: JSON.parse(file.source).id as string, source: file.source }));
}
