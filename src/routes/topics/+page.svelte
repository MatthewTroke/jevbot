<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Topic = (typeof data.topics)[number];
	type Step = Topic['steps'][number];

	// Colour categories match the flow builder legend in docs/screenshots.
	type Tone = 'start' | 'jev' | 'bot' | 'person';
	const stepStyle: Record<Step['type'], { label: string; tone: Tone }> = {
		when: { label: 'When', tone: 'start' },
		check_rules: { label: 'Check rules', tone: 'jev' },
		confidence_gate: { label: 'Confidence gate', tone: 'jev' },
		branch: { label: 'Branch', tone: 'jev' },
		send_reply: { label: 'Send reply', tone: 'bot' },
		ask_customer: { label: 'Ask customer', tone: 'bot' },
		hand_off: { label: 'Hand off', tone: 'person' }
	};

	const outgoing = (topic: Topic, stepId: string) =>
		topic.connections.filter((connection) => connection.from === stepId);
</script>

<svelte:head>
	<title>Topics · Jevbot</title>
</svelte:head>

<h1>Topics</h1>
<p class="lead">
	{data.topics.length}
	{data.topics.length === 1 ? 'topic' : 'topics'} loaded from <code>src/lib/topics</code>. This page
	is read-only; edit the JSON files to change a topic.
</p>

{#if data.errors.length > 0}
	<section class="errors" aria-labelledby="errors-heading">
		<h2 id="errors-heading">
			{data.errors.length} validation {data.errors.length === 1 ? 'error' : 'errors'}
		</h2>
		<p>Topics with errors are left out of matching until they're fixed.</p>
		<ul>
			{#each data.errors as error, i (i)}
				<li>
					<code>{error.file}</code>{#if error.location}
						· <code>{error.location}</code>{/if}
					<span>{error.message}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#each data.topics as topic (topic.id)}
	<article class="topic">
		<header>
			<h2>{topic.name}</h2>
			<code>{topic.id}</code>
		</header>
		<p>{topic.description}</p>

		<h3>Example questions</h3>
		<ul class="examples">
			{#each topic.examples as example, i (i)}
				<li>“{example}”</li>
			{/each}
		</ul>

		<h3>Flow</h3>
		<ol class="steps">
			{#each topic.steps as step (step.id)}
				{@const edges = outgoing(topic, step.id)}
				<li class="step {stepStyle[step.type].tone}">
					<div class="step-head">
						<span class="badge">{stepStyle[step.type].label}</span>
						<code>{step.id}</code>
					</div>

					{#if step.type === 'when'}
						<p>Starts when the customer's message is about this topic.</p>
					{:else if step.type === 'check_rules'}
						<p>Hands off to a person if any of these is true:</p>
						<ul>
							{#each step.rules as rule (rule.id)}
								<li><code>{rule.id}</code> {rule.condition}</li>
							{/each}
						</ul>
					{:else if step.type === 'confidence_gate'}
						<p>Checks how sure Jev is that the message is about this topic.</p>
					{:else if step.type === 'branch'}
						<p class="question">{step.question}</p>
						<ul>
							{#each step.paths as path (path.id)}
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
						<p class="note">The next message returns to <code>{step.returnsTo}</code>.</p>
					{:else if step.type === 'hand_off'}
						<blockquote>{step.message}</blockquote>
						<p class="note">Reason tag: {step.reason}</p>
					{/if}

					{#if edges.length > 0}
						<ul class="edges">
							{#each edges as edge, i (i)}
								<li>{edge.on ?? 'next'} → <code>{edge.to}</code></li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ol>
	</article>
{:else}
	<p>No valid topics are loaded.</p>
{/each}

<style>
	.lead {
		color: var(--muted);
		margin-bottom: 2rem;
	}

	.errors {
		background: var(--danger-soft);
		border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 2rem;
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

	.topic {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 1rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.topic header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.75rem;
	}

	.topic h2 {
		margin: 0;
		font-size: 1.5rem;
	}

	.topic header code,
	.lead code {
		color: var(--muted);
	}

	h3 {
		font-size: 0.8rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 1.5rem 0 0.5rem;
	}

	.examples {
		margin: 0;
		padding-left: 1.25rem;
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}

	.step {
		border: 1px solid var(--border);
		border-left: 6px solid var(--tone);
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
		overflow-wrap: anywhere;
	}

	.step.start {
		--tone: var(--step-start);
	}

	.step.jev {
		--tone: var(--step-jev);
	}

	.step.bot {
		--tone: var(--step-bot);
	}

	.step.person {
		--tone: var(--step-person);
	}

	.step-head {
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

	.step p,
	.step ul,
	.step blockquote {
		margin: 0.5rem 0 0;
	}

	.step ul {
		padding-left: 1.25rem;
	}

	.question {
		font-weight: 600;
	}

	.auto {
		color: var(--muted);
	}

	blockquote {
		padding-left: 0.75rem;
		border-left: 2px solid var(--border);
	}

	.note {
		color: var(--muted);
		font-size: 0.9rem;
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
		padding: 0 !important;
		color: var(--muted);
		font-size: 0.9rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
	}
</style>
