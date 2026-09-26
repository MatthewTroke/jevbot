<script lang="ts">
	import { Controls, Panel, SvelteFlow, type Edge, type NodeTypes } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import type { Topic } from '$lib/topic-model/topics';
	import { buildDiagram, withState, type DiagramNode } from './layout';
	import SlotNode from './SlotNode.svelte';
	import StepNode from './StepNode.svelte';
	import { toneLegend } from './step-display';

	// A read-only, automatically laid-out drawing of a topic's flow. Nodes can't be dragged
	// or connected by hand; panning and zooming work.
	let {
		topic,
		errorCounts,
		selectedId,
		onselect
	}: {
		topic: Topic;
		errorCounts: Record<string, number>;
		selectedId: string | undefined;
		onselect: (stepId: string | undefined) => void;
	} = $props();

	const nodeTypes = { step: StepNode, slot: SlotNode } as NodeTypes;

	// Lay out only when the topic changes; selection and error badges are a cheap map on top.
	const laidOut = $derived(buildDiagram(topic));
	let nodes = $state.raw<DiagramNode[]>([]);
	let edges = $state.raw<Edge[]>([]);
	$effect(() => {
		nodes = withState(laidOut.nodes, { errorCounts, selectedId });
		edges = laidOut.edges;
	});
</script>

<div class="diagram">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		fitView
		minZoom={0.2}
		nodesDraggable={false}
		nodesConnectable={false}
		elementsSelectable={false}
		onnodeclick={({ node }) => {
			if (node.type === 'step') onselect(node.id);
		}}
		onpaneclick={() => onselect(undefined)}
	>
		<Controls showLock={false} />
		<Panel position="top-left">
			<ul class="legend" aria-label="Step colours">
				{#each toneLegend as { tone, label } (tone)}
					<li><span class="swatch" style="--tone: var(--step-{tone})"></span>{label}</li>
				{/each}
				<li><span class="swatch open"></span>Nothing connected yet</li>
			</ul>
		</Panel>
	</SvelteFlow>
</div>

<style>
	.diagram {
		height: 100%;
		min-height: 28rem;
		border: 1px solid var(--border);
		border-radius: 1rem;
		overflow: hidden;
		background: var(--surface);
	}

	.legend {
		list-style: none;
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.5rem;
		font-size: 0.75rem;
		display: grid;
		gap: 0.2rem;
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.swatch {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 0.2rem;
		background: var(--tone);
	}
	.swatch.open {
		border: 2px dashed var(--danger);
		border-radius: 999px;
	}

	.diagram :global(.return-edge .svelte-flow__edge-path) {
		stroke-dasharray: 6 4;
		stroke: var(--muted);
	}

	.diagram :global(.open-edge .svelte-flow__edge-path) {
		stroke: var(--danger);
		stroke-dasharray: 3 3;
	}

	.diagram :global(.svelte-flow__edge-text) {
		font-size: 11px;
	}

	.diagram :global(.svelte-flow__node-step) {
		cursor: pointer;
	}

	/* Connections can't be drawn by hand, so the connection handles stay hidden. */
	.diagram :global(.svelte-flow__handle) {
		opacity: 0;
		pointer-events: none;
	}
</style>
