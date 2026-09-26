import { z } from 'zod';

// Topic files: hand-written JSON flows (see the spec's "Topic model"). loadTopics validates
// them and returns the valid topics plus plain-English errors for the rest.

/** Added by the app itself: `other` to the topic question, `not_stated` to every branch. */
export const OTHER = 'other';
export const NOT_STATED = 'not_stated';
const RESERVED_IDS: readonly string[] = [OTHER, NOT_STATED];

const idSchema = z
	.string()
	.regex(
		/^[a-z][a-z0-9_]*$/,
		'Must be snake_case: lowercase letters, digits and underscores, starting with a letter (e.g. return_policy).'
	);
const textSchema = z.string().min(1);

const stepSchema = z.discriminatedUnion('type', [
	z.strictObject({ id: idSchema, type: z.literal('when') }),
	z.strictObject({
		id: idSchema,
		type: z.literal('check_rules'),
		rules: z.array(z.strictObject({ id: idSchema, condition: textSchema })).min(1)
	}),
	z.strictObject({ id: idSchema, type: z.literal('confidence_gate') }),
	z.strictObject({
		id: idSchema,
		type: z.literal('branch'),
		question: textSchema,
		paths: z.array(z.strictObject({ id: idSchema, description: textSchema })).min(1)
	}),
	z.strictObject({
		id: idSchema,
		type: z.literal('send_reply'),
		text: textSchema,
		resolve: z.boolean().default(false)
	}),
	z.strictObject({
		id: idSchema,
		type: z.literal('ask_customer'),
		question: textSchema,
		buttons: z.array(textSchema).min(1),
		returnsTo: idSchema
	}),
	z.strictObject({
		id: idSchema,
		type: z.literal('hand_off'),
		message: textSchema,
		reason: textSchema
	})
]);

const stepTypes = stepSchema.options.map((option) => option.shape.type.value);

const exampleCountError = {
	error: (issue: { input?: unknown }) =>
		`Needs 3 to 5 example questions (found ${(issue.input as unknown[]).length}).`
};

const topicSchema = z.strictObject({
	id: idSchema,
	name: textSchema,
	description: textSchema.regex(/^[^\r\n]*$/, 'Must be a single line.'),
	examples: z.array(textSchema).min(3, exampleCountError).max(5, exampleCountError),
	steps: z.array(stepSchema).min(1),
	connections: z.array(z.strictObject({ from: idSchema, to: idSchema, on: z.string().optional() }))
});

export type Topic = z.infer<typeof topicSchema>;
export type Step = Topic['steps'][number];

export type TopicFile = { file: string; source: string };

export type TopicError = {
	file: string;
	/** Where in the file, e.g. `step "reply".text`; empty for the whole file. */
	location: string;
	message: string;
};

export function loadTopics(files: TopicFile[]): { topics: Topic[]; errors: TopicError[] } {
	const topics: Topic[] = [];
	const errors: TopicError[] = [];
	const fileByTopicId = new Map<string, string>();
	for (const { file, source } of files) {
		let json: unknown;
		try {
			json = JSON.parse(source);
		} catch (e) {
			errors.push({ file, location: '', message: `Not valid JSON: ${(e as Error).message}` });
			continue;
		}
		const report = (path: KeyPath, message: string) =>
			errors.push({ file, location: describeLocation(json, path), message });

		const parsed = topicSchema.safeParse(json);
		if (!parsed.success) {
			// Report only the first problem at each location: after a type mismatch Zod can add
			// follow-on checks that don't apply (e.g. an array length check run on a string).
			const reported = new Set<string>();
			for (const issue of parsed.error.issues) {
				const location = describeLocation(json, issue.path);
				if (reported.has(location)) continue;
				reported.add(location);
				report(issue.path, describeIssue(json, issue));
			}
			continue;
		}

		const topic = parsed.data;
		const problems = checkTopic(topic);
		const usedBy = fileByTopicId.get(topic.id);
		if (usedBy) {
			problems.push({
				path: ['id'],
				message: `Topic id "${topic.id}" is already used by ${usedBy}.`
			});
		}
		if (problems.length === 0) {
			topics.push(topic);
			fileByTopicId.set(topic.id, file);
		}
		for (const problem of problems) report(problem.path, problem.message);
	}
	return { topics, errors };
}

type KeyPath = readonly PropertyKey[];
type Problem = { path: KeyPath; message: string };

/** Checks within one topic that the schema can't express. */
function checkTopic(topic: Topic): Problem[] {
	const problems: Problem[] = [];
	const rejectReserved = (path: KeyPath, id: string) => {
		if (RESERVED_IDS.includes(id)) {
			problems.push({
				path,
				message: `"${id}" is a reserved name that the app adds automatically. Choose a different id.`
			});
		}
	};

	rejectReserved(['id'], topic.id);
	forEachDuplicate(topic.steps, (i, first) =>
		problems.push({
			path: ['steps', i, 'id'],
			message: `Step id "${topic.steps[i].id}" is already used by steps[${first}].`
		})
	);
	topic.steps.forEach((step, s) => {
		if (step.type === 'branch') {
			step.paths.forEach((branchPath, i) =>
				rejectReserved(['steps', s, 'paths', i, 'id'], branchPath.id)
			);
			forEachDuplicate(step.paths, (i, first) =>
				problems.push({
					path: ['steps', s, 'paths', i, 'id'],
					message: `Path id "${step.paths[i].id}" is already used by paths[${first}].`
				})
			);
		}
		if (step.type === 'check_rules') {
			forEachDuplicate(step.rules, (i, first) =>
				problems.push({
					path: ['steps', s, 'rules', i, 'id'],
					message: `Rule id "${step.rules[i].id}" is already used by rules[${first}].`
				})
			);
		}
	});
	return problems;
}

/** Calls `onDuplicate(index, firstIndex)` for each item whose id repeats an earlier one. */
function forEachDuplicate(
	items: readonly { id: string }[],
	onDuplicate: (index: number, firstIndex: number) => void
) {
	const firstIndex = new Map<string, number>();
	items.forEach((item, i) => {
		const first = firstIndex.get(item.id);
		if (first === undefined) firstIndex.set(item.id, i);
		else onDuplicate(i, first);
	});
}

function valueAt(json: unknown, path: KeyPath): unknown {
	let value = json;
	for (const key of path) {
		if (typeof value !== 'object' || value === null) return undefined;
		value = (value as Record<PropertyKey, unknown>)[key];
	}
	return value;
}

/**
 * Renders a key path like `step "reply".text`. Steps are named by id when the id is unique
 * in the file, and by position (`steps[2]`) otherwise.
 */
function describeLocation(json: unknown, path: KeyPath): string {
	const steps = valueAt(json, ['steps']);
	const stepIds = Array.isArray(steps) ? steps.map((step) => valueAt(step, ['id'])) : [];
	const isUniqueStepId = (id: unknown) =>
		typeof id === 'string' && stepIds.filter((other) => other === id).length === 1;

	let location = '';
	for (let i = 0; i < path.length; i++) {
		const key = path[i];
		const next = path[i + 1];
		const stepId = key === 'steps' && typeof next === 'number' ? stepIds[next] : undefined;
		if (isUniqueStepId(stepId)) {
			location += `${location ? '.' : ''}step "${stepId}"`;
			i++;
		} else if (typeof key === 'number') {
			location += `[${key}]`;
		} else {
			location += `${location ? '.' : ''}${String(key)}`;
		}
	}
	return location;
}

const expectedType: Partial<Record<string, string>> = {
	string: 'Must be text.',
	boolean: 'Must be true or false.',
	array: 'Must be a list.',
	object: 'Must be an object.'
};

function describeIssue(json: unknown, issue: z.core.$ZodIssue): string {
	if (issue.code === 'invalid_union' && issue.discriminator === 'type') {
		const value = valueAt(json, issue.path);
		const allowed = `Use one of: ${stepTypes.join(', ')}.`;
		return value === undefined
			? `Missing step type. ${allowed}`
			: `Unknown step type ${JSON.stringify(value)}. ${allowed}`;
	}
	if (issue.code === 'invalid_type') {
		if (valueAt(json, issue.path) === undefined) return 'This field is required.';
		return expectedType[issue.expected] ?? issue.message;
	}
	if (issue.code === 'too_small' && issue.origin === 'string') return 'Must not be empty.';
	if (issue.code === 'unrecognized_keys') {
		const keys = issue.keys.map((key) => JSON.stringify(key)).join(', ');
		return issue.keys.length === 1 ? `Unknown field ${keys}.` : `Unknown fields ${keys}.`;
	}
	return issue.message;
}
