import { MAX_CHOICE_OPTIONS, NOT_STATED } from './topic-constants';
import type { Problem, Step, Topic } from './topics';

// Checks that a topic's flow can be walked safely: one entry, every outcome connected, no
// loops except ask_customer returning to its branch. loadTopics runs these once the schema
// and ids are valid, so the walker can trust every valid topic.

/**
 * An outcome a step connects onward: `high`, `matched`, a branch path id and so on. The
 * `when` step's single outcome is unlabelled, written as `undefined`.
 */
export type Outcome = string | undefined;

type Connection = Topic['connections'][number];

/** Lookups shared by every check. */
type FlowIndex = {
	stepsById: Map<string, Step>;
	/** The first `when` step, if any. */
	entry: Step | undefined;
	/** Connections leaving each step, with their index in `topic.connections`. */
	outgoing: Map<string, { connection: Connection; index: number }[]>;
};

function indexFlow(topic: Topic): FlowIndex {
	const outgoing: FlowIndex['outgoing'] = new Map();
	topic.connections.forEach((connection, index) => {
		outgoing.set(connection.from, [
			...(outgoing.get(connection.from) ?? []),
			{ connection, index }
		]);
	});
	return {
		stepsById: new Map(topic.steps.map((step) => [step.id, step])),
		entry: topic.steps.find((step) => step.type === 'when'),
		outgoing
	};
}

export function checkFlow(topic: Topic): Problem[] {
	const flow = indexFlow(topic);
	const problems = [
		...checkEntry(topic, flow),
		...checkConnections(topic, flow),
		...checkSteps(topic, flow)
	];

	// A missing connection can't create a loop, so loops are always reported. Reachability is
	// only checked once every step's own connections are sound: otherwise one missing arrow
	// would also report every step after it as unreachable.
	problems.push(...findLoops(topic, flow));
	if (problems.length === 0) problems.push(...findUnreachable(topic, flow));
	return problems;
}

function checkEntry(topic: Topic, { entry }: FlowIndex): Problem[] {
	if (!entry) return [{ path: ['steps'], message: 'Needs a "when" step to start the flow.' }];
	return topic.steps.flatMap((step, stepIndex) =>
		step.type === 'when' && step !== entry
			? [
					{
						path: ['steps', stepIndex],
						message: `Only one "when" step is allowed; this flow already starts at "${entry.id}".`
					}
				]
			: []
	);
}

/** Checks each connection on its own: its ends exist and its label suits the step it leaves. */
function checkConnections(topic: Topic, { stepsById }: FlowIndex): Problem[] {
	const problems: Problem[] = [];
	const firstIndexByOutcome = new Map<string, number>();

	topic.connections.forEach((connection, index) => {
		for (const end of ['from', 'to'] as const) {
			if (!stepsById.has(connection[end])) {
				problems.push({
					path: ['connections', index, end],
					message: `No step with id "${connection[end]}".`
				});
			}
		}

		const step = stepsById.get(connection.from);
		if (!step) return;
		const outcomes = outcomesOf(step);
		if (outcomes.length === 0) {
			const hint =
				step.type === 'ask_customer'
					? ` The customer's next message returns to its branch through "returnsTo".`
					: '';
			problems.push({
				path: ['connections', index],
				message: `"${step.id}" is ${withArticle(step.type)} step, which ends the turn, so it can't connect onward.${hint}`
			});
			return;
		}
		if (!outcomes.includes(connection.on)) {
			problems.push({
				path: ['connections', index, 'on'],
				message: describeUnknownOutcome(step, connection.on, outcomes)
			});
			return;
		}

		const target = stepsById.get(connection.to);
		if (step.type === 'check_rules' && connection.on === 'matched' && target) {
			if (target.type !== 'hand_off') {
				problems.push({
					path: ['connections', index, 'to'],
					message: `"matched" must lead to a hand_off step, but "${target.id}" is ${withArticle(target.type)} step.`
				});
			}
		}

		const outcomeKey = JSON.stringify([connection.from, connection.on ?? null]);
		const firstIndex = firstIndexByOutcome.get(outcomeKey);
		if (firstIndex === undefined) firstIndexByOutcome.set(outcomeKey, index);
		else {
			const what = connection.on === undefined ? 'to the next step' : `"${connection.on}"`;
			problems.push({
				path: ['connections', index],
				message: `"${step.id}" already connects ${what} in connections[${firstIndex}].`
			});
		}
	});
	return problems;
}

/** Checks each step on its own: option limits, ask_customer returns, and missing outcomes. */
function checkSteps(topic: Topic, { stepsById, outgoing }: FlowIndex): Problem[] {
	const problems: Problem[] = [];
	topic.steps.forEach((step, stepIndex) => {
		if (step.type === 'branch') {
			const optionCount = step.paths.length + 1;
			const excess = optionCount - MAX_CHOICE_OPTIONS;
			if (excess > 0) {
				problems.push({
					path: ['steps', stepIndex, 'paths'],
					message: `Has ${optionCount} options with "${NOT_STATED}", but Jev allows at most ${MAX_CHOICE_OPTIONS}. Remove at least ${excess} path${excess === 1 ? '' : 's'}.`
				});
			}
		}

		if (step.type === 'ask_customer') {
			const target = stepsById.get(step.returnsTo);
			if (!target || target.type !== 'branch') {
				problems.push({
					path: ['steps', stepIndex, 'returnsTo'],
					message: target
						? `Must be a branch step, but "${target.id}" is ${withArticle(target.type)} step.`
						: `No step with id "${step.returnsTo}".`
				});
			}
		}

		const connected = (outgoing.get(step.id) ?? []).map(({ connection }) => connection.on);
		for (const outcome of outcomesOf(step)) {
			if (!connected.includes(outcome)) {
				problems.push({
					path: ['steps', stepIndex],
					message: describeMissingOutcome(step, outcome)
				});
			}
		}
	});
	return problems;
}

/**
 * Reports each connection that closes a loop, found by depth-first search from `when`. Only
 * connections that are valid for their step are followed; the others are already reported.
 */
function findLoops(topic: Topic, { stepsById, entry, outgoing }: FlowIndex): Problem[] {
	const problems: Problem[] = [];
	const finished = new Set<string>();
	const trail: string[] = [];
	const validOutgoing = (id: string) => {
		const step = stepsById.get(id);
		const outcomes = step ? outcomesOf(step) : [];
		return (outgoing.get(id) ?? []).filter(
			({ connection }) => outcomes.includes(connection.on) && stepsById.has(connection.to)
		);
	};

	const visit = (id: string) => {
		trail.push(id);
		for (const { connection, index } of validOutgoing(id)) {
			if (trail.includes(connection.to)) {
				const loop = [...trail.slice(trail.indexOf(connection.to)), connection.to].join(' → ');
				problems.push({
					path: ['connections', index],
					message: `This connection makes a loop: ${loop}. Only an ask_customer step may lead back, through "returnsTo".`
				});
			} else if (!finished.has(connection.to)) {
				visit(connection.to);
			}
		}
		trail.pop();
		finished.add(id);
	};

	if (entry) visit(entry.id);
	for (const step of topic.steps) if (!finished.has(step.id)) visit(step.id);
	return problems;
}

/** Reports steps that can't be reached from `when`, following connections and ask_customer returns. */
function findUnreachable(topic: Topic, { stepsById, entry, outgoing }: FlowIndex): Problem[] {
	if (!entry) return [];
	const next = (id: string): string[] => {
		const step = stepsById.get(id);
		const onward = (outgoing.get(id) ?? []).map(({ connection }) => connection.to);
		return step?.type === 'ask_customer' ? [...onward, step.returnsTo] : onward;
	};

	const reached = new Set([entry.id]);
	const queue = [entry.id];
	for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
		for (const to of next(id)) {
			if (!reached.has(to)) {
				reached.add(to);
				queue.push(to);
			}
		}
	}

	return topic.steps.flatMap((step, stepIndex) =>
		reached.has(step.id)
			? []
			: [
					{
						path: ['steps', stepIndex],
						message: `Can't be reached from the start ("${entry.id}").`
					}
				]
	);
}

/**
 * The outcomes a step must connect onward, in order. send_reply, ask_customer and hand_off
 * end the turn and have none.
 */
export function outcomesOf(step: Step): Outcome[] {
	switch (step.type) {
		case 'when':
			return [undefined];
		case 'check_rules':
			return ['matched', 'clear'];
		case 'confidence_gate':
			return ['high', 'medium', 'low'];
		case 'branch':
			return [...step.paths.map((path) => path.id), NOT_STATED];
		default:
			return [];
	}
}

function describeUnknownOutcome(step: Step, on: Outcome, outcomes: Outcome[]): string {
	if (step.type === 'when') {
		return `"${step.id}" connects to the next step without a label. Remove "on".`;
	}
	const allowed = `Use one of: ${outcomes.join(', ')}.`;
	if (on === undefined) return `"${step.id}" needs an outcome label ("on"). ${allowed}`;
	const kind = step.type === 'branch' ? 'path' : 'outcome';
	return `"${step.id}" has no ${kind} "${on}". ${allowed}`;
}

function describeMissingOutcome(step: Step, outcome: Outcome): string {
	if (outcome === undefined) return 'No connection to the next step.';
	if (outcome === NOT_STATED) {
		return `No connection for "${NOT_STATED}", the path Jev picks when the conversation doesn't say.`;
	}
	if (step.type === 'branch') return `No connection for path "${outcome}".`;
	return `No connection for "${outcome}".`;
}

const withArticle = (word: string) => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);
