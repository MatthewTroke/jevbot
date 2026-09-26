import { z } from 'zod';
import { checkFlow } from './flow-graph';
import { MAX_CHOICE_OPTIONS, NOT_STATED, OTHER } from './constants';

// Topic files: hand-written JSON flows (see the spec's "Topic model"). loadTopics validates
// them and returns the valid topics plus plain-English errors for the rest.

const RESERVED_IDS: readonly string[] = [OTHER, NOT_STATED];

const exampleCountError = {
	error: (issue: { input?: unknown }) =>
		`Needs 3 to 5 example questions (found ${(issue.input as unknown[]).length}).`
};

/**
 * The topic format. `strict` adds the content rules (non-empty text, snake_case ids, list
 * lengths, a one-line description). Without them only the shape is checked, which is enough
 * to keep editing a draft that's still being filled in.
 */
function topicSchemas(strict: boolean) {
	const idSchema = strict
		? z
				.string()
				.regex(
					/^[a-z][a-z0-9_]*$/,
					'Must be snake_case: lowercase letters, digits and underscores, starting with a letter (e.g. return_policy).'
				)
		: z.string();
	const textSchema = strict ? z.string().min(1) : z.string();
	const nonEmpty = <T extends z.ZodType>(item: T) =>
		strict ? z.array(item).min(1) : z.array(item);

	const step = z.discriminatedUnion('type', [
		z.strictObject({ id: idSchema, type: z.literal('when') }),
		z.strictObject({
			id: idSchema,
			type: z.literal('check_rules'),
			rules: nonEmpty(z.strictObject({ id: idSchema, condition: textSchema }))
		}),
		z.strictObject({ id: idSchema, type: z.literal('confidence_gate') }),
		z.strictObject({
			id: idSchema,
			type: z.literal('branch'),
			question: textSchema,
			paths: nonEmpty(z.strictObject({ id: idSchema, description: textSchema }))
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
			buttons: nonEmpty(textSchema),
			returnsTo: idSchema
		}),
		z.strictObject({
			id: idSchema,
			type: z.literal('hand_off'),
			message: textSchema,
			reason: textSchema
		})
	]);

	const topic = z.strictObject({
		id: idSchema,
		name: textSchema,
		description: strict ? textSchema.regex(/^[^\r\n]*$/, 'Must be a single line.') : textSchema,
		examples: strict
			? z.array(textSchema).min(3, exampleCountError).max(5, exampleCountError)
			: z.array(textSchema),
		steps: nonEmpty(step),
		connections: z.array(
			z.strictObject({ from: idSchema, to: idSchema, on: z.string().optional() })
		)
	});
	return { step, topic };
}

const { step: stepSchema, topic: topicSchema } = topicSchemas(true);
const { topic: draftShapeSchema } = topicSchemas(false);

const stepTypes = stepSchema.options.map((option) => option.shape.type.value);

export type Topic = z.infer<typeof topicSchema>;
export type Step = Topic['steps'][number];

export type TopicFile = { file: string; source: string };

export type TopicError = {
	file: string;
	/** Where in the file, e.g. `step "reply".text`; empty for the whole file. */
	location: string;
	message: string;
};

/** The `id` field of some topic JSON, if it has one. */
export function topicIdOf(source: string): string | undefined {
	try {
		const json: unknown = JSON.parse(source);
		const id =
			typeof json === 'object' && json !== null ? (json as { id?: unknown }).id : undefined;
		return typeof id === 'string' ? id : undefined;
	} catch {
		return undefined;
	}
}

/** Parses topic JSON by shape only: no content, id or flow checks. Cheap enough to run often. */
export function parseTopicShape(source: string): Topic | undefined {
	try {
		const parsed = draftShapeSchema.safeParse(JSON.parse(source));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Validates one topic file on its own. `topic` is the parsed topic whenever the file has the
 * shape of a topic, even if it breaks content, id or flow rules, so a draft can still be shown
 * and edited. Only an error-free topic is ready to use.
 */
export function validateTopicFile({ file, source }: TopicFile): {
	topic?: Topic;
	errors: TopicError[];
} {
	let json: unknown;
	try {
		json = JSON.parse(source);
	} catch (e) {
		return {
			errors: [{ file, location: '', message: `Not valid JSON: ${(e as Error).message}` }]
		};
	}
	const toError = (path: KeyPath, message: string): TopicError => ({
		file,
		location: describeLocation(json, path),
		message
	});

	const parsed = topicSchema.safeParse(json);
	if (!parsed.success) {
		// Report only the first problem at each location: after a type mismatch Zod can add
		// follow-on checks that don't apply (e.g. an array length check run on a string).
		const errors = new Map<string, TopicError>();
		for (const issue of parsed.error.issues) {
			const error = toError(issue.path, describeIssue(json, issue));
			if (!errors.has(error.location)) errors.set(error.location, error);
		}
		// A draft that only breaks content rules still has the shape of a topic, so it can
		// be shown and edited while it's being fixed.
		const shape = draftShapeSchema.safeParse(json);
		return { topic: shape.success ? shape.data : undefined, errors: [...errors.values()] };
	}

	const topic = parsed.data;
	const problems = checkTopic(topic);
	// Graph checks assume unique ids, so skip them until the ids are sorted out.
	if (problems.length === 0) problems.push(...checkFlow(topic));
	return { topic, errors: problems.map((problem) => toError(problem.path, problem.message)) };
}

/**
 * Validates a topic stored under `id`, such as a D1 row: like a topic file named after the
 * id, plus the topic's own id must match it. With unique storage ids, that also rules out
 * two stored topics claiming the same topic id.
 */
export function validateStoredTopic({ id, source }: { id: string; source: string }): {
	topic?: Topic;
	errors: TopicError[];
} {
	const result = validateTopicFile({ file: id, source });
	if (result.topic && result.topic.id !== id) {
		result.errors.push({
			file: id,
			location: 'id',
			message: `Must be "${id}", the id this topic is stored under.`
		});
	}
	return result;
}

/**
 * The id of the step an error is located on, if that step exists. Reads the locations
 * `describeLocation` writes (`step "id"…`, `connections[i] (from step "id")…`, `steps[i]…`),
 * so the two must change together; the tests exercise both through real errors.
 */
export function errorStepId(error: TopicError, topic: Topic): string | undefined {
	const named = /^(?:step|connections\[\d+\] \(from step) "([^"]+)"/.exec(error.location);
	const byPosition = /^steps\[(\d+)\]/.exec(error.location);
	const id = named ? named[1] : byPosition ? topic.steps[Number(byPosition[1])]?.id : undefined;
	return topic.steps.some((step) => step.id === id) ? id : undefined;
}

/** Validates every topic file, including checks across files, and returns the valid topics. */
export function loadTopics(files: TopicFile[]): { topics: Topic[]; errors: TopicError[] } {
	const topics: Topic[] = [];
	const errors: TopicError[] = [];
	const fileByTopicId = new Map<string, string>();
	for (const topicFile of files) {
		const { file } = topicFile;
		const { topic, errors: fileErrors } = validateTopicFile(topicFile);
		errors.push(...fileErrors);
		if (!topic) continue;

		const usedBy = fileByTopicId.get(topic.id);
		if (usedBy) {
			errors.push({
				file,
				location: 'id',
				message: `Topic id "${topic.id}" is already used by ${usedBy}.`
			});
		}
		if (fileErrors.length > 0 || usedBy) continue;

		// The topic question offers every valid topic plus "other" as options.
		if (topics.length + 1 >= MAX_CHOICE_OPTIONS) {
			errors.push({
				file,
				location: 'id',
				message: `Too many topics: Jev's topic question allows ${MAX_CHOICE_OPTIONS - 1} topics plus "${OTHER}", so this one is left out.`
			});
			continue;
		}
		topics.push(topic);
		fileByTopicId.set(topic.id, file);
	}
	return { topics, errors };
}

type KeyPath = readonly PropertyKey[];
/** A problem found in a parsed topic, located by key path within the topic JSON. */
export type Problem = { path: KeyPath; message: string };

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
 * in the file, and by position (`steps[2]`) otherwise. Connections name the step they leave
 * from, e.g. `connections[7] (from step "mood").to`.
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
		const connectionIndex = key === 'connections' && typeof next === 'number' ? next : undefined;
		const from =
			connectionIndex === undefined
				? undefined
				: valueAt(json, ['connections', connectionIndex, 'from']);
		if (isUniqueStepId(stepId)) {
			location += `${location ? '.' : ''}step "${stepId}"`;
			i++;
		} else if (typeof from === 'string') {
			location += `${location ? '.' : ''}connections[${connectionIndex}] (from step "${from}")`;
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
