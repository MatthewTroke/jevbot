<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import TopicStatus from '$lib/components/TopicStatus.svelte';
	import { Autosave } from '$lib/flow-diagram/autosave.svelte';
	import FlowDiagram from '$lib/flow-diagram/FlowDiagram.svelte';
	import StepEditor from '$lib/flow-diagram/StepEditor.svelte';
	import TopicEditor from '$lib/flow-diagram/TopicEditor.svelte';
	import { countLabel } from '$lib/text';
	import { applyEdit, type Edit } from '$lib/topic-model/edits';
	import { topicStatus } from '$lib/topic-model/status';
	import { errorStepId, validateStoredTopic } from '$lib/topic-model/topics';
	import type { PageData } from './$types';

	// Edits one topic's draft. The page creates a fresh builder per topic, so none of this
	// state carries over when another topic is opened.
	let { data }: { data: PageData } = $props();

	// Every edit replaces the draft through applyEdit.
	// svelte-ignore state_referenced_locally
	let draft = $state.raw(data.topic);
	let selectedId = $state<string | undefined>();

	const draftJson = $derived(draft ? JSON.stringify(draft, null, '\t') : null);
	const title = $derived(draft?.name || data.name);
	const errors = $derived(
		draftJson ? validateStoredTopic({ id: data.id, source: draftJson }).errors : data.errors
	);
	const status = $derived(topicStatus(draftJson ?? '', data.published));
	const errorsWithStep = $derived(
		errors.map((error) => ({ error, stepId: draft ? errorStepId(error, draft) : undefined }))
	);
	const errorCounts = $derived(
		errorsWithStep.reduce<Record<string, number>>((counts, { stepId }) => {
			if (stepId) counts[stepId] = (counts[stepId] ?? 0) + 1;
			return counts;
		}, {})
	);
	const selectedStep = $derived(draft?.steps.find((step) => step.id === selectedId));
	// Svelte Flow needs unique node ids, so the diagram and editing wait until step ids are unique.
	const hasDuplicateStepIds = $derived(
		!!draft && new Set(draft.steps.map((step) => step.id)).size !== draft.steps.length
	);

	// svelte-ignore state_referenced_locally
	const autosave = new Autosave(
		`${resolve('/topics/[id]', { id: data.id })}/draft`,
		data.updatedAt
	);

	/** Applies an edit. An EditError propagates so the editor can show it. */
	function edit(change: Edit) {
		if (!draft) return;
		draft = applyEdit(draft, change);
		autosave.change(JSON.stringify(draft, null, '\t'));
	}

	// Save the last edits when the tab is hidden or this builder goes away.
	$effect(() => {
		const onHidden = () => {
			if (document.visibilityState === 'hidden') autosave.flush({ leaving: true });
		};
		document.addEventListener('visibilitychange', onHidden);
		return () => {
			document.removeEventListener('visibilitychange', onHidden);
			autosave.flush({ leaving: true });
		};
	});

	const time = (iso: string) => new Date(iso).toLocaleTimeString();
</script>

<svelte:head>
	<title>{title} · Topics · Jevbot</title>
</svelte:head>

<nav class="crumbs"><a href={resolve('/topics')}>Topics</a> / {title}</nav>
<h1>{title}</h1>
<p class="lead">
	<TopicStatus {status} />
	<span class="save-state" class:failed={autosave.state.kind === 'failed'} aria-live="polite">
		{#if autosave.state.kind === 'saved'}
			Draft saved {time(autosave.state.at)}
		{:else if autosave.state.kind === 'pending'}
			Unsaved changes…
		{:else if autosave.state.kind === 'saving'}
			Saving…
		{:else}
			Couldn't save the draft: {autosave.state.message}
			<button type="button" class="link-button" onclick={() => autosave.flush()}>Try again</button>
		{/if}
	</span>
</p>

{#if errors.length > 0}
	<section class="errors" aria-labelledby="errors-heading">
		<h2 id="errors-heading">
			{countLabel(errors.length, 'validation error')} in <code>{data.id}</code>
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

{#if draft && !hasDuplicateStepIds}
	<div class="builder">
		<div class="canvas">
			{#if browser}
				<FlowDiagram
					topic={draft}
					{errorCounts}
					{selectedId}
					onselect={(stepId: string | undefined) => (selectedId = stepId)}
				/>
			{:else}
				<p class="loading">Drawing the flow…</p>
			{/if}
		</div>

		<aside class="panel" aria-label={selectedStep ? 'Edit step' : 'Edit topic'}>
			{#if selectedStep}
				{#key selectedStep.id}
					<StepEditor
						step={selectedStep}
						topic={draft}
						errors={errorsWithStep
							.filter(({ stepId }) => stepId === selectedStep.id)
							.map(({ error }) => error)}
						onedit={edit}
						onselect={(stepId: string) => (selectedId = stepId)}
					/>
				{/key}
			{:else}
				<TopicEditor topic={draft} onedit={edit} />
			{/if}
			<p class="footnote">
				Every check and branch in this flow is answered in one Jev call per message, so adding steps
				doesn't slow the bot down.
			</p>
		</aside>
	</div>
{:else if draft}
	<p>This draft has duplicate step ids, so it can't be drawn or edited. Fix the errors above.</p>
{:else}
	<p>
		This draft doesn't match the topic format, so it can't be drawn or edited. Fix the errors above.
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

	.save-state.failed {
		color: var(--danger);
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
		grid-template-columns: minmax(0, 1fr) 24rem;
		gap: 1rem;
		align-items: stretch;
	}

	.canvas {
		height: 76vh;
		min-height: 28rem;
	}

	.loading {
		color: var(--muted);
	}

	.footnote {
		margin: 1.5rem 0 0;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		background: var(--bg);
		color: var(--muted);
		font-size: 0.85rem;
	}

	.panel {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.25rem;
		max-height: 76vh;
		overflow-y: auto;
		overflow-wrap: anywhere;
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
