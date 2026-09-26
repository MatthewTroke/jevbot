<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import type { StepNode } from './layout';
	import { stepStyle, stepSummary } from './step-display';

	let { data }: NodeProps<StepNode> = $props();

	const style = $derived(stepStyle[data.step.type]);
	const summary = $derived(stepSummary(data.step, data.topicName));
</script>

<Handle type="target" position={Position.Top} />
<div
	class="node {style.tone}"
	style="--tone: var(--step-{style.tone})"
	class:selected={data.selected}
	class:has-errors={data.errorCount > 0}
	title={summary.title}
>
	<span class="badge">{style.label}</span>
	<strong>{summary.title}</strong>
	<span class="detail">{summary.detail}</span>
	{#if data.errorCount > 0}
		<span class="error-count" aria-label="{data.errorCount} errors">{data.errorCount}</span>
	{/if}
</div>
<Handle type="source" position={Position.Bottom} />

<style>
	.node {
		position: relative;
		box-sizing: border-box;
		width: 240px;
		height: 104px;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.6rem 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		text-align: left;
		cursor: pointer;
		overflow: hidden;
	}

	.node.person {
		border-color: color-mix(in srgb, var(--danger) 25%, var(--border));
	}

	.node.selected {
		border: 2px solid var(--accent);
		padding: calc(0.6rem - 1px) calc(0.75rem - 1px);
	}

	.node.has-errors {
		box-shadow: 0 0 0 2px var(--danger);
	}

	.badge {
		align-self: flex-start;
		background: var(--tone);
		border-radius: 0.3rem;
		padding: 0.05rem 0.45rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	strong {
		font-size: 0.85rem;
		line-height: 1.25;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.detail {
		color: var(--muted);
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.error-count {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		min-width: 1.2rem;
		height: 1.2rem;
		border-radius: 999px;
		background: var(--danger);
		color: white;
		font-size: 0.7rem;
		font-weight: 700;
		display: grid;
		place-items: center;
	}
</style>
