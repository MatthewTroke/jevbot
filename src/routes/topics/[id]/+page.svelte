<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import TopicStatus from '$lib/components/TopicStatus.svelte';
	import FlowDiagram from '$lib/flow-diagram/FlowDiagram.svelte';
	import StepDetails from '$lib/flow-diagram/StepDetails.svelte';
	import { countLabel } from '$lib/text';
	import { errorStepId } from '$lib/topic-model/topics';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let selectedId = $state<string | undefined>();

	const topic = $derived(data.topic);
	const errorsWithStep = $derived(
		data.errors.map((error) => ({ error, stepId: topic ? errorStepId(error, topic) : undefined }))
	);
	const errorCounts = $derived(
		errorsWithStep.reduce<Record<string, number>>((counts, { stepId }) => {
			if (stepId) counts[stepId] = (counts[stepId] ?? 0) + 1;
			return counts;
		}, {})
	);
	const selectedStep = $derived(topic?.steps.find((step) => step.id === selectedId));
	// Svelte Flow needs unique node ids, so the diagram waits until step ids are unique.
	const hasDuplicateStepIds = $derived(
		!!topic && new Set(topic.steps.map((step) => step.id)).size !== topic.steps.length
	);
</script>

<svelte:head>
	<title>{data.name} · Topics · Jevbot</title>
</svelte:head>

<nav class="crumbs"><a href={resolve('/topics')}>Topics</a> / {data.name}</nav>
<h1>{data.name}</h1>
<p class="lead">
	<TopicStatus status={data.status} /> Showing the draft, last saved {new Date(
		data.updatedAt
	).toLocaleString()}.
</p>

{#if data.errors.length > 0}
	<section class="errors" aria-labelledby="errors-heading">
		<h2 id="errors-heading">
			{countLabel(data.errors.length, 'validation error')} in <code>{data.id}</code>
		</h2>
		<p>These need fixing before this topic can go live.</p>
		<ul>
			{#each errorsWithStep as { error, stepId }, i (i)}
				<li>
					{#if stepId && !hasDuplicateStepIds}
						<button type="button" class="link-button" onclick={() => (selectedId = stepId)}
							>{error.location}</button
						>
					{:else if error.location}
						<code>{error.location}</code>
					{/if}
					<span>{error.message}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if topic && !hasDuplicateStepIds}
	<div class="builder">
		<div class="canvas">
			{#if browser}
				<FlowDiagram
					{topic}
					{errorCounts}
					{selectedId}
					onselect={(stepId) => (selectedId = stepId)}
				/>
			{:else}
				<p class="loading">Drawing the flow…</p>
			{/if}
		</div>

		<aside class="panel" aria-label={selectedStep ? 'Step details' : 'Topic details'}>
			{#if selectedStep}
				<StepDetails
					step={selectedStep}
					{topic}
					errors={errorsWithStep
						.filter(({ stepId }) => stepId === selectedStep.id)
						.map(({ error }) => error)}
					onselect={(stepId) => (selectedId = stepId)}
				/>
			{:else}
				<h2>{topic.name}</h2>
				<p>{topic.description}</p>
				<h3>Example questions</h3>
				<ul>
					{#each topic.examples as example, i (i)}
						<li>“{example}”</li>
					{/each}
				</ul>
				<p class="hint">Click a step to see its details.</p>
			{/if}
		</aside>
	</div>
{:else if topic}
	<p>This draft has duplicate step ids, so its flow can't be drawn. Fix the errors above.</p>
{:else}
	<p>
		This draft doesn't match the topic format, so its flow can't be drawn. Fix the errors above.
	</p>
{/if}

<style>
	.crumbs {
		color: var(--muted);
		margin-bottom: 0.5rem;
	}

	.lead {
		color: var(--muted);
		margin-bottom: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.errors {
		background: var(--danger-soft);
		border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
	}

	.errors h2 {
		color: var(--danger);
		font-size: 1.1rem;
		margin: 0 0 0.25rem;
	}

	.errors p {
		margin: 0 0 0.75rem;
	}

	.errors ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.errors li + li {
		margin-top: 0.5rem;
	}

	.errors li span {
		display: block;
	}

	.builder {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 22rem;
		gap: 1rem;
		align-items: stretch;
	}

	.canvas {
		height: 72vh;
		min-height: 28rem;
	}

	.loading {
		color: var(--muted);
	}

	.panel {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.25rem;
		max-height: 72vh;
		overflow-y: auto;
		overflow-wrap: anywhere;
	}

	.panel h2 {
		margin: 0 0 0.5rem;
		font-size: 1.3rem;
	}

	.panel h3 {
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 1.25rem 0 0.5rem;
	}

	.panel ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.hint {
		color: var(--muted);
		font-size: 0.9rem;
		margin-top: 1.5rem;
	}

	@media (max-width: 52rem) {
		.builder {
			grid-template-columns: 1fr;
		}

		.canvas {
			height: 60vh;
		}

		.panel {
			max-height: none;
		}
	}
</style>
