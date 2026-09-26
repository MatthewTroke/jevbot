import { Graph, layout } from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/svelte';
import { openOutcomes, type Outcome } from '$lib/topic-model/flow-graph';
import type { Step, Topic } from '$lib/topic-model/topics';

// Turns a topic into Svelte Flow nodes and edges, laid out top-down with dagre. Nodes have
// fixed sizes (their text is clamped), so the layout needs no measuring. Every outcome with
// nothing connected gets a "+" slot node.

const STEP_SIZE = { width: 240, height: 104 };
const SLOT_SIZE = { width: 36, height: 36 };

export type StepNodeData = {
	step: Step;
	topicName: string;
	errorCount: number;
	selected: boolean;
};
export type SlotNodeData = { stepId: string; outcome: Outcome };
export type StepNode = Node<StepNodeData, 'step'>;
export type SlotNode = Node<SlotNodeData, 'slot'>;
export type DiagramNode = StepNode | SlotNode;

/**
 * Lays out the topic. Depends only on the topic, so selection and error badges can be applied
 * afterwards (see `withState`) without laying out again.
 */
export function buildDiagram(topic: Topic): { nodes: DiagramNode[]; edges: Edge[] } {
	const stepIds = new Set(topic.steps.map((step) => step.id));

	const nodes: DiagramNode[] = topic.steps.map((step) => ({
		id: step.id,
		type: 'step',
		position: { x: 0, y: 0 },
		...STEP_SIZE,
		data: { step, topicName: topic.name, errorCount: 0, selected: false }
	}));
	const edges: Edge[] = [];
	// Edges that shape the layout; ask_customer returns are drawn but left out.
	const layoutEdges: [string, string][] = [];

	topic.connections.forEach((connection, index) => {
		if (!stepIds.has(connection.from) || !stepIds.has(connection.to)) return;
		edges.push({
			id: `connection-${index}`,
			source: connection.from,
			target: connection.to,
			label: connection.on,
			type: 'smoothstep'
		});
		layoutEdges.push([connection.from, connection.to]);
	});

	for (const step of topic.steps) {
		for (const outcome of openOutcomes(topic, step)) {
			const id = `slot-${step.id}-${outcome ?? 'next'}`;
			nodes.push({
				id,
				type: 'slot',
				position: { x: 0, y: 0 },
				...SLOT_SIZE,
				data: { stepId: step.id, outcome }
			});
			edges.push({
				id: `${id}-edge`,
				source: step.id,
				target: id,
				label: outcome,
				type: 'smoothstep',
				class: 'open-edge'
			});
			layoutEdges.push([step.id, id]);
		}

		if (step.type === 'ask_customer' && stepIds.has(step.returnsTo)) {
			edges.push({
				id: `return-${step.id}`,
				source: step.id,
				target: step.returnsTo,
				label: '↻ Back to this branch',
				type: 'smoothstep',
				class: 'return-edge'
			});
		}
	}

	const graph = new Graph();
	graph.setGraph({ rankdir: 'TB', nodesep: 36, ranksep: 64 });
	graph.setDefaultEdgeLabel(() => ({}));
	for (const node of nodes) graph.setNode(node.id, { width: node.width, height: node.height });
	for (const [from, to] of layoutEdges) graph.setEdge(from, to);
	layout(graph);

	return {
		nodes: nodes.map((node) => {
			const { x, y } = graph.node(node.id);
			return { ...node, position: { x: x - node.width! / 2, y: y - node.height! / 2 } };
		}),
		edges
	};
}

/** Marks the selected step and each step's error count on already laid-out nodes. */
export function withState(
	nodes: DiagramNode[],
	{ errorCounts, selectedId }: { errorCounts: Record<string, number>; selectedId?: string }
): DiagramNode[] {
	return nodes.map((node) =>
		node.type === 'step'
			? {
					...node,
					data: {
						...node.data,
						errorCount: errorCounts[node.id] ?? 0,
						selected: node.id === selectedId
					}
				}
			: node
	);
}
