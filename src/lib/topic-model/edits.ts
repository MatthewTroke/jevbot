import { NOT_STATED, OTHER } from './constants';
import type { Step, Topic } from './topics';

// Every change the flow builder makes to a draft goes through applyEdit, so the editing rules
// live here rather than in the page. Edits never change the topic they're given. An edit that
// can't apply throws an EditError with a message for the author.

/** The content fields of a step that the side panel edits. */
export type StepChanges = {
	question?: string;
	text?: string;
	resolve?: boolean;
	buttons?: string[];
	returnsTo?: string;
	message?: string;
	reason?: string;
};

export type Edit =
	| { type: 'update_topic'; name?: string; description?: string; examples?: string[] }
	| { type: 'update_step'; stepId: string; changes: StepChanges }
	| { type: 'add_path'; stepId: string; name: string; description: string }
	| { type: 'rename_path'; stepId: string; pathId: string; name: string }
	| { type: 'update_path'; stepId: string; pathId: string; description: string }
	| { type: 'remove_path'; stepId: string; pathId: string }
	| { type: 'add_rule'; stepId: string; condition: string }
	| { type: 'update_rule'; stepId: string; ruleId: string; condition: string }
	| { type: 'remove_rule'; stepId: string; ruleId: string };

export class EditError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EditError';
	}
}

const editableFields: Record<Step['type'], (keyof StepChanges)[]> = {
	when: [],
	check_rules: [],
	confidence_gate: [],
	branch: ['question'],
	send_reply: ['text', 'resolve'],
	ask_customer: ['question', 'buttons', 'returnsTo'],
	hand_off: ['message', 'reason']
};

export function applyEdit(topic: Topic, edit: Edit): Topic {
	const next = structuredClone(topic);
	switch (edit.type) {
		case 'update_topic': {
			const { name, description, examples } = edit;
			if (name !== undefined) next.name = name;
			if (description !== undefined) next.description = description;
			if (examples !== undefined) next.examples = [...examples];
			return next;
		}
		case 'update_step': {
			const step = findStep(next, edit.stepId);
			for (const [field, value] of Object.entries(edit.changes)) {
				if (!editableFields[step.type].includes(field as keyof StepChanges)) {
					throw new EditError(`A ${step.type} step has no "${field}".`);
				}
				Object.assign(step, { [field]: Array.isArray(value) ? [...value] : value });
			}
			return next;
		}
		case 'add_path': {
			const branch = findStepOfType('branch', next, edit.stepId);
			const id = pathIdFor(branch, edit.name);
			branch.paths.push({ id, description: edit.description });
			return next;
		}
		case 'rename_path': {
			const path = findPath(next, edit.stepId, edit.pathId);
			const id = pathIdFor(findStepOfType('branch', next, edit.stepId), edit.name, edit.pathId);
			path.id = id;
			for (const connection of next.connections) {
				if (connection.from === edit.stepId && connection.on === edit.pathId) connection.on = id;
			}
			return next;
		}
		case 'update_path': {
			findPath(next, edit.stepId, edit.pathId).description = edit.description;
			return next;
		}
		case 'remove_path': {
			const branch = findStepOfType('branch', next, edit.stepId);
			findPath(next, edit.stepId, edit.pathId);
			branch.paths = branch.paths.filter((path) => path.id !== edit.pathId);
			next.connections = next.connections.filter(
				(c) => !(c.from === edit.stepId && c.on === edit.pathId)
			);
			return next;
		}
		case 'add_rule': {
			const step = findStepOfType('check_rules', next, edit.stepId);
			step.rules.push({ id: nextRuleId(step.rules), condition: edit.condition });
			return next;
		}
		case 'update_rule': {
			findRule(next, edit.stepId, edit.ruleId).condition = edit.condition;
			return next;
		}
		case 'remove_rule': {
			const step = findStepOfType('check_rules', next, edit.stepId);
			findRule(next, edit.stepId, edit.ruleId);
			step.rules = step.rules.filter((rule) => rule.id !== edit.ruleId);
			return next;
		}
	}
}

/** `rule_N`, numbered after the highest rule number in use. */
function nextRuleId(rules: { id: string }[]): string {
	const numbers = rules.map((rule) => Number(/^rule_(\d+)$/.exec(rule.id)?.[1] ?? 0));
	return `rule_${Math.max(0, ...numbers) + 1}`;
}

/** Turns a name typed in plain words into a snake_case id, e.g. "Not worn!" → "not_worn". */
export function toSnakeCase(name: string): string {
	const id = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return /^[0-9]/.test(id) ? `path_${id}` : id;
}

/** The id for a path named `name`, refusing names that can't work. `renaming` is the path's current id. */
function pathIdFor(branch: StepOfType<'branch'>, name: string, renaming?: string): string {
	const id = toSnakeCase(name);
	if (!id) throw new EditError('Give the path a name with at least one letter or digit.');
	if (id === NOT_STATED) {
		throw new EditError(
			`"${NOT_STATED}" is added to every branch automatically. Choose another name.`
		);
	}
	if (id === OTHER) throw new EditError(`"${OTHER}" is a reserved name. Choose another name.`);
	if (id !== renaming && branch.paths.some((path) => path.id === id)) {
		throw new EditError(`This branch already has a path named "${id}".`);
	}
	return id;
}

function findRule(topic: Topic, stepId: string, ruleId: string) {
	const rule = findStepOfType('check_rules', topic, stepId).rules.find((r) => r.id === ruleId);
	if (!rule) throw new EditError(`Step "${stepId}" has no rule "${ruleId}".`);
	return rule;
}

function findPath(topic: Topic, stepId: string, pathId: string) {
	const path = findStepOfType('branch', topic, stepId).paths.find((p) => p.id === pathId);
	if (!path) throw new EditError(`Branch "${stepId}" has no path "${pathId}".`);
	return path;
}

type StepOfType<T extends Step['type']> = Extract<Step, { type: T }>;

function findStepOfType<T extends Step['type']>(
	type: T,
	topic: Topic,
	stepId: string
): StepOfType<T> {
	const step = findStep(topic, stepId);
	if (step.type !== type) throw new EditError(`"${stepId}" is not a ${type} step.`);
	return step as StepOfType<T>;
}

function findStep(topic: Topic, stepId: string): Step {
	const step = topic.steps.find((s) => s.id === stepId);
	if (!step) throw new EditError(`There is no step "${stepId}".`);
	return step;
}
