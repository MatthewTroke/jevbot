<script lang="ts">
	import TopicBuilder from './TopicBuilder.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- A fresh builder per topic, so drafts, selection and autosave never leak between topics. -->
{#key data.id}
	<TopicBuilder {data} />
{/key}
