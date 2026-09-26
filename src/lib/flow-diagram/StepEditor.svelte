<script lang="ts">
	import { EditError, toSnakeCase, type Edit, type StepChanges } from '$lib/topic-model/edits';
	import type { Step, Topic, TopicError } from '$lib/topic-model/topics';
	import EditableList from './EditableList.svelte';
	import { stepStyle, stepSummary } from './step-display';

	// Edits the selected step's content. Every change goes through `onedit`, which applies it
	// with applyEdit; path edits that can't work throw an EditError, shown next to the field.
	// The builder recreates this editor for each selected step, so its local state is per step.
	let {
		step,
		topic,
		errors,
		onedit,
		onselect
	}: {
		step: Step;
		topic: Topic;
		errors: TopicError[];
		onedit: (edit: Edit) => void;
		onselect: (stepId: string) => void;
	} = $props();

	const style = $derived(stepStyle[step.type]);
	const outgoing = $derived(topic.connections.filter((c) => c.from === step.id));
	const stepIds = $derived(new Set(topic.steps.map((s) => s.id)));
	const branches = $derived(topic.steps.filter((s) => s.type === 'branch'));

	const title = $derived(stepSummary(step, topic.name).title);

	let pathError = $state<string>();
	let addingPath = $state(false);
	let newPath = $state({ name: '', description: '' });

	const updateStep = (changes: StepChanges) =>
		onedit({ type: 'update_step', stepId: step.id, changes });

	/** Applies a path edit, showing why if it can't apply. */
	function tryPathEdit(edit: Edit): boolean {
		try {
			onedit(edit);
			pathError = undefined;
			return true;
		} catch (e) {
			if (!(e instanceof EditError)) throw e;
			pathError = e.message;
			return false;
		}
	}

	function renamePath(pathId: string, input: HTMLInputElement) {
		if (!tryPathEdit({ type: 'rename_path', stepId: step.id, pathId, name: input.value })) {
			input.value = pathId;
		}
	}

	function addPath(event: SubmitEvent) {
		event.preventDefault();
		const { name, description } = newPath;
		if (tryPathEdit({ type: 'add_path', stepId: step.id, name, description })) {
			newPath = { name: '', description: '' };
			addingPath = false;
		}
	}
</script>

<!-- Drafts may contain duplicate ids, so lists are keyed by position. -->
<div class="editor" style="--tone: var(--step-{style.tone})">
	<div class="head">
		<span class="badge">{style.label}</span>
		<h2>{title}</h2>
		<code>{step.id}</code>
	</div>

	{#if step.type === 'when'}
		<p class="note">Starts the flow when the customer's message is about this topic.</p>
	{:else if step.type === 'confidence_gate'}
		<p class="note">
			Checks how sure Jev is that the message is about this topic: high, medium or low. The
			thresholds are set for the whole app.
		</p>
	{:else if step.type === 'check_rules'}
		<fieldset>
			<legend>Hand off to a person if any of these is true</legend>
			<small>Write each rule in plain English, as a statement about the conversation.</small>
			<ul class="rules">
				{#each step.rules as rule, i (i)}
					<li>
						<textarea
							aria-label="Rule {i + 1}"
							rows="2"
							value={rule.condition}
							oninput={(e) =>
								onedit({
									type: 'update_rule',
									stepId: step.id,
									ruleId: rule.id,
									condition: e.currentTarget.value
								})}></textarea>
						<button
							type="button"
							class="icon-button"
							aria-label="Remove rule {i + 1}"
							onclick={() => onedit({ type: 'remove_rule', stepId: step.id, ruleId: rule.id })}
							>✕</button
						>
					</li>
				{/each}
			</ul>
			<button
				type="button"
				class="add-button"
				onclick={() => onedit({ type: 'add_rule', stepId: step.id, condition: '' })}
				>+ Add rule</button
			>
		</fieldset>
	{:else if step.type === 'branch'}
		<label>
			<span>Question for Jev</span>
			<textarea
				rows="3"
				value={step.question}
				oninput={(e) => updateStep({ question: e.currentTarget.value })}></textarea>
			<small>Write its full meaning; Jev only sees this text and the paths below.</small>
		</label>

		<fieldset>
			<legend>Paths</legend>
			<ul class="paths">
				{#each step.paths as path, i (i)}
					<li>
						<div class="path-name">
							<input
								aria-label="Name of path {i + 1}"
								value={path.id}
								onchange={(e) => renamePath(path.id, e.currentTarget)}
							/>
							<button
								type="button"
								class="icon-button"
								aria-label="Remove path {path.id}"
								onclick={() =>
									tryPathEdit({ type: 'remove_path', stepId: step.id, pathId: path.id })}>✕</button
							>
						</div>
						<input
							aria-label="Description of path {path.id}"
							value={path.description}
							oninput={(e) =>
								onedit({
									type: 'update_path',
									stepId: step.id,
									pathId: path.id,
									description: e.currentTarget.value
								})}
						/>
					</li>
				{/each}
				<li class="auto">
					<code>not_stated</code>
					<span>Always included, so Jev never has to guess. It can't be renamed or removed.</span>
				</li>
			</ul>

			{#if addingPath}
				<form class="new-path" onsubmit={addPath}>
					<input aria-label="New path name" placeholder="New path name" bind:value={newPath.name} />
					<input
						aria-label="New path description"
						placeholder="When should Jev pick it?"
						bind:value={newPath.description}
					/>
					{#if newPath.name && toSnakeCase(newPath.name) !== newPath.name}
						<small>Saved as <code>{toSnakeCase(newPath.name)}</code></small>
					{/if}
					<div class="form-actions">
						<button type="submit" class="add-button">Add path</button>
						<button type="button" class="link-button" onclick={() => (addingPath = false)}
							>Cancel</button
						>
					</div>
				</form>
			{:else}
				<button type="button" class="add-button" onclick={() => (addingPath = true)}
					>+ Add a path</button
				>
			{/if}
			{#if pathError}<p class="edit-error" role="alert">{pathError}</p>{/if}
		</fieldset>
	{:else if step.type === 'send_reply'}
		<label>
			<span>Reply</span>
			<textarea
				rows="5"
				value={step.text}
				oninput={(e) => updateStep({ text: e.currentTarget.value })}></textarea>
		</label>
		<label class="checkbox">
			<input
				type="checkbox"
				checked={step.resolve}
				onchange={(e) => updateStep({ resolve: e.currentTarget.checked })}
			/>
			<span>Then mark the conversation resolved</span>
		</label>
	{:else if step.type === 'ask_customer'}
		<label>
			<span>Question for the customer</span>
			<textarea
				rows="3"
				value={step.question}
				oninput={(e) => updateStep({ question: e.currentTarget.value })}></textarea>
		</label>
		<fieldset>
			<legend>Buttons</legend>
			<EditableList
				items={step.buttons}
				label="button"
				onchange={(buttons) => updateStep({ buttons })}
			/>
		</fieldset>
		<label>
			<span>The answer goes back to</span>
			<select
				value={step.returnsTo}
				onchange={(e) => updateStep({ returnsTo: e.currentTarget.value })}
			>
				{#if !branches.some((b) => b.id === step.returnsTo)}
					<option value={step.returnsTo}>{step.returnsTo} (not a branch)</option>
				{/if}
				{#each branches as branch, i (i)}
					<option value={branch.id}>{branch.id}: {branch.question}</option>
				{/each}
			</select>
		</label>
	{:else if step.type === 'hand_off'}
		<label>
			<span>Message to the customer</span>
			<textarea
				rows="3"
				value={step.message}
				oninput={(e) => updateStep({ message: e.currentTarget.value })}></textarea>
		</label>
		<label>
			<span>Reason tag</span>
			<input value={step.reason} oninput={(e) => updateStep({ reason: e.currentTarget.value })} />
			<small>Shown to your team on the Handoffs page.</small>
		</label>
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
		display: grid;
		justify-items: start;
		gap: 0.35rem;
		margin-bottom: 0.5rem;
	}

	.head h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.head code {
		color: var(--muted);
		font-size: 0.8rem;
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
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

	.note,
	.auto span {
		color: var(--muted);
	}

	.rules,
	.paths,
	.edges,
	.errors {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.6rem;
	}

	.rules li,
	.path-name {
		display: flex;
		gap: 0.4rem;
		align-items: flex-start;
	}

	.rules textarea,
	.path-name input {
		flex: 1;
		min-width: 0;
	}

	.paths li {
		display: grid;
		gap: 0.3rem;
		padding-bottom: 0.6rem;
		border-bottom: 1px solid var(--border);
	}

	.paths li.auto {
		border-bottom: none;
		font-size: 0.9rem;
	}

	.new-path {
		display: grid;
		gap: 0.4rem;
		margin-top: 0.75rem;
	}

	.edit-error,
	.errors li {
		color: var(--danger);
	}

	h3 {
		font-size: 0.75rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 1.25rem 0 0.5rem;
	}
</style>
