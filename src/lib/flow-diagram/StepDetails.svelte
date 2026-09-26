<script lang="ts">
	import type { Step, Topic, TopicError } from '$lib/topic-model/topics';
	import { stepStyle } from './step-display';

	let {
		step,
		topic,
		errors,
		onselect
	}: {
		step: Step;
		topic: Topic;
		errors: TopicError[];
		onselect: (stepId: string) => void;
	} = $props();

	const style = $derived(stepStyle[step.type]);
	const outgoing = $derived(topic.connections.filter((connection) => connection.from === step.id));
	const stepIds = $derived(new Set(topic.steps.map((s) => s.id)));
</script>

<!-- Drafts may contain duplicate ids, so lists are keyed by position. -->
<div class="details" style="--tone: var(--step-{style.tone})">
	<div class="head">
		<span class="badge">{style.label}</span>
		<code>{step.id}</code>
	</div>

	{#if step.type === 'when'}
		<p>Starts when the customer's message is about this topic.</p>
	{:else if step.type === 'check_rules'}
		<p>Hands off to a person if any of these is true:</p>
		<ul>
			{#each step.rules as rule, i (i)}
				<li><code>{rule.id}</code> {rule.condition}</li>
			{/each}
		</ul>
	{:else if step.type === 'confidence_gate'}
		<p>Checks how sure Jev is that the message is about this topic.</p>
	{:else if step.type === 'branch'}
		<p class="question">{step.question}</p>
		<ul>
			{#each step.paths as path, i (i)}
				<li><code>{path.id}</code> {path.description}</li>
			{/each}
			<li class="auto">
				<code>not_stated</code> Added automatically for when the conversation doesn't say.
			</li>
		</ul>
	{:else if step.type === 'send_reply'}
		<blockquote>{step.text}</blockquote>
		{#if step.resolve}
			<p class="note">Then marks the conversation resolved.</p>
		{/if}
	{:else if step.type === 'ask_customer'}
		<blockquote>{step.question}</blockquote>
		<div class="buttons">
			{#each step.buttons as label, i (i)}
				<span class="pill">{label}</span>
			{/each}
		</div>
		<p class="note">
			The next message returns to
			{#if stepIds.has(step.returnsTo)}
				<button type="button" class="link-button" onclick={() => onselect(step.returnsTo)}
					>{step.returnsTo}</button
				>.
			{:else}
				<code>{step.returnsTo}</code>.
			{/if}
		</p>
	{:else if step.type === 'hand_off'}
		<blockquote>{step.message}</blockquote>
		<p class="note">Reason tag: {step.reason}</p>
	{/if}

	{#if outgoing.length > 0}
		<h3>Leads to</h3>
		<ul class="edges">
			{#each outgoing as connection, i (i)}
				<li>
					{connection.on ?? 'next'} →
					{#if stepIds.has(connection.to)}
						<button type="button" class="link-button" onclick={() => onselect(connection.to)}
							>{connection.to}</button
						>
					{:else}
						<code>{connection.to}</code>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if errors.length > 0}
		<h3>Errors</h3>
		<ul class="errors">
			{#each errors as error, i (i)}
				<li>{error.message}</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.badge {
		background: var(--tone);
		border-radius: 0.35rem;
		padding: 0.1rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	p,
	ul,
	blockquote {
		margin: 0.75rem 0 0;
	}

	ul {
		padding-left: 1.25rem;
	}

	h3 {
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 1.25rem 0 0;
	}

	.question {
		font-weight: 600;
	}

	.auto,
	.note {
		color: var(--muted);
	}

	.note {
		font-size: 0.9rem;
	}

	blockquote {
		padding-left: 0.75rem;
		border-left: 2px solid var(--border);
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.pill {
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 0.2rem 0.75rem;
		font-size: 0.9rem;
		background: var(--bg);
	}

	.edges {
		list-style: none;
		padding: 0;
	}

	.errors li {
		color: var(--danger);
	}
</style>
