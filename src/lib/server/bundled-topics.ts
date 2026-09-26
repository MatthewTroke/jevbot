import { loadTopics, type TopicFile } from './topics';

// Topic files are bundled at build time as raw text, so a JSON syntax error shows up on
// /topics like any other validation error instead of breaking the build.
const sources = import.meta.glob<string>('../topics/*.json', {
	query: '?raw',
	import: 'default',
	eager: true
});

const files: TopicFile[] = Object.entries(sources)
	.map(([path, source]) => ({ file: path.replace('../', 'src/lib/'), source }))
	.sort((a, b) => a.file.localeCompare(b.file));

export const bundledTopics = loadTopics(files);
