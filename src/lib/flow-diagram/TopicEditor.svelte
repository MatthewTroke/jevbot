<script lang="ts">
	import type { Edit } from '$lib/topic-model/edits';
	import type { Topic } from '$lib/topic-model/topics';
	import EditableList from './EditableList.svelte';

	let { topic, onedit }: { topic: Topic; onedit: (edit: Edit) => void } = $props();
</script>

<div class="editor">
	<label>
		<span>Name</span>
		<input
			value={topic.name}
			oninput={(e) => onedit({ type: 'update_topic', name: e.currentTarget.value })}
		/>
	</label>

	<label>
		<span>Description</span>
		<input
			value={topic.description}
			oninput={(e) => onedit({ type: 'update_topic', description: e.currentTarget.value })}
		/>
		<small>One line: what customers ask about in this topic.</small>
	</label>

	<fieldset>
		<legend>Example questions</legend>
		<small>3 to 5 things a customer might say. Jev uses them to recognise the topic.</small>
		<EditableList
			items={topic.examples}
			label="example question"
			onchange={(examples) => onedit({ type: 'update_topic', examples })}
		/>
	</fieldset>

	<p class="hint">Click a step in the diagram to edit it.</p>
</div>
