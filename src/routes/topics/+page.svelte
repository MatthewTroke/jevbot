<script lang="ts">
	import { resolve } from '$app/paths';
	import TopicStatus from '$lib/components/TopicStatus.svelte';
	import { countLabel } from '$lib/text';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Topics · Jevbot</title>
</svelte:head>

<h1>Topics</h1>
<p class="lead">
	Each topic is a flow the bot follows. Customers only get published topics, and a topic with errors
	can't be used until they're fixed.
</p>

<ul class="topics">
	{#each data.topics as topic (topic.id)}
		<li>
			<a class="name" href={resolve('/topics/[id]', { id: topic.id })}>{topic.name}</a>
			<TopicStatus status={topic.status} />
			<span class="errors" class:has-errors={topic.errorCount > 0}>
				{topic.errorCount === 0 ? 'No errors' : countLabel(topic.errorCount, 'error')}
			</span>
			{#if topic.description}<p>{topic.description}</p>{/if}
		</li>
	{:else}
		<li class="empty">There are no topics yet.</li>
	{/each}
</ul>

<style>
	.lead {
		color: var(--muted);
		margin-bottom: 2rem;
	}

	.topics {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}

	.topics li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
	}

	.name {
		font-size: 1.2rem;
		font-weight: 600;
		text-decoration: none;
	}

	.errors {
		color: var(--muted);
		font-size: 0.9rem;
	}

	.errors.has-errors {
		color: var(--danger);
		font-weight: 600;
	}

	.topics p {
		flex-basis: 100%;
		margin: 0;
		color: var(--muted);
	}

	.empty {
		color: var(--muted);
	}
</style>
