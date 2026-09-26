<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';
	import type { SlotNode } from './layout';

	let { data }: NodeProps<SlotNode> = $props();

	const what = $derived(data.outcome === undefined ? 'the next step' : `"${data.outcome}"`);
</script>

<Handle type="target" position={Position.Top} />
<div class="slot" title="Nothing is connected to {what} yet" aria-label="Open outcome {what}">
	+
</div>

<style>
	.slot {
		box-sizing: border-box;
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border: 2px dashed var(--danger);
		border-radius: 999px;
		background: var(--surface);
		color: var(--danger);
		font-size: 1.2rem;
		font-weight: 700;
		line-height: 1;
	}
</style>
