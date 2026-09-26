import { describe, expect, it } from 'vitest';
import { loadTopics } from './topics';

// A minimal valid topic: when → send_reply.
function greeting(overrides: Record<string, unknown> = {}) {
	return {
		id: 'greeting',
		name: 'Greeting',
		description: 'Customer says hello.',
		examples: ['hi', 'hello there', 'good morning'],
		steps: [
			{ id: 'start', type: 'when' },
			{ id: 'reply', type: 'send_reply', text: 'Hello! How can I help?', resolve: true }
		],
		connections: [{ from: 'start', to: 'reply' }],
		...overrides
	};
}

// The minimal topic with `when` followed by the given steps.
const withSteps = (...steps: object[]) =>
	greeting({ steps: [{ id: 'start', type: 'when' }, ...steps] });

const file = (name: string, contents: unknown) => ({
	file: name,
	source: typeof contents === 'string' ? contents : JSON.stringify(contents)
});

describe('loadTopics', () => {
	it('loads a valid topic with no errors', () => {
		const { topics, errors } = loadTopics([file('greeting.json', greeting())]);

		expect(errors).toEqual([]);
		expect(topics.map((t) => t.id)).toEqual(['greeting']);
	});

	it('reports a file that is not valid JSON and still loads the others', () => {
		const { topics, errors } = loadTopics([
			file('broken.json', '{ "id": "broken", '),
			file('greeting.json', greeting())
		]);

		expect(topics.map((t) => t.id)).toEqual(['greeting']);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({ file: 'broken.json', location: '' });
		expect(errors[0].message).toMatch(/^Not valid JSON: /);
	});

	it('rejects an unknown step type, naming the step and the allowed types', () => {
		const topic = withSteps({ id: 'reply', type: 'sendreply', text: 'Hello!' });

		const { topics, errors } = loadTopics([file('greeting.json', topic)]);

		expect(topics).toEqual([]);
		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'step "reply".type',
				message:
					'Unknown step type "sendreply". Use one of: when, check_rules, confidence_gate, branch, send_reply, ask_customer, hand_off.'
			}
		]);
	});

	it('reports a missing required field at its location', () => {
		const topic = withSteps({ id: 'reply', type: 'send_reply' });

		const { errors } = loadTopics([file('greeting.json', topic)]);

		expect(errors).toEqual([
			{ file: 'greeting.json', location: 'step "reply".text', message: 'This field is required.' }
		]);
	});

	it('reports an unknown field instead of silently ignoring it', () => {
		const topic = withSteps({ id: 'reply', type: 'send_reply', text: 'Hi!', resolved: true });

		const { errors } = loadTopics([file('greeting.json', topic)]);

		expect(errors).toEqual([
			{ file: 'greeting.json', location: 'step "reply"', message: 'Unknown field "resolved".' }
		]);
	});

	it.each([
		['resolve', 'yes', 'Must be true or false.'],
		['text', 42, 'Must be text.'],
		['text', '', 'Must not be empty.']
	])('describes a bad %s value (%j) in plain words', (field, value, message) => {
		const topic = withSteps({ id: 'reply', type: 'send_reply', text: 'Hi!', [field]: value });

		const { errors } = loadTopics([file('greeting.json', topic)]);

		expect(errors).toEqual([{ file: 'greeting.json', location: `step "reply".${field}`, message }]);
	});

	it('describes a value that should be a list', () => {
		const { errors } = loadTopics([file('greeting.json', greeting({ examples: 'hi' }))]);

		expect(errors).toEqual([
			{ file: 'greeting.json', location: 'examples', message: 'Must be a list.' }
		]);
	});

	it.each([
		[['hi', 'hello'], 2],
		[['a', 'b', 'c', 'd', 'e', 'f'], 6]
	])('requires 3 to 5 example questions (rejects %j)', (examples, count) => {
		const { errors } = loadTopics([file('greeting.json', greeting({ examples }))]);

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'examples',
				message: `Needs 3 to 5 example questions (found ${count}).`
			}
		]);
	});

	it('requires a one-line description', () => {
		const topic = greeting({ description: 'Customer says hello.\nOr good morning.' });

		const { errors } = loadTopics([file('greeting.json', topic)]);

		expect(errors).toEqual([
			{ file: 'greeting.json', location: 'description', message: 'Must be a single line.' }
		]);
	});

	it('requires snake_case ids', () => {
		const { errors } = loadTopics([file('greeting.json', greeting({ id: 'Greeting-Topic' }))]);

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'id',
				message:
					'Must be snake_case: lowercase letters, digits and underscores, starting with a letter (e.g. return_policy).'
			}
		]);
	});

	it('rejects duplicate step ids within a topic', () => {
		const topic = withSteps(
			{ id: 'reply', type: 'send_reply', text: 'Hello!' },
			{ id: 'reply', type: 'send_reply', text: 'Hi again!' }
		);

		const { topics, errors } = loadTopics([file('greeting.json', topic)]);

		expect(topics).toEqual([]);
		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'steps[2].id',
				message: 'Step id "reply" is already used by steps[1].'
			}
		]);
	});

	it('rejects a topic id already used by another file, keeping the first', () => {
		const { topics, errors } = loadTopics([
			file('greeting.json', greeting()),
			file('hello.json', greeting({ name: 'Hello' }))
		]);

		expect(topics.map((t) => t.name)).toEqual(['Greeting']);
		expect(errors).toEqual([
			{
				file: 'hello.json',
				location: 'id',
				message: 'Topic id "greeting" is already used by greeting.json.'
			}
		]);
	});

	it.each(['other', 'not_stated'])('rejects the reserved name "%s" as a topic id', (reserved) => {
		const { errors } = loadTopics([file('greeting.json', greeting({ id: reserved }))]);

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'id',
				message: `"${reserved}" is a reserved name that the app adds automatically. Choose a different id.`
			}
		]);
	});

	it.each(['other', 'not_stated'])(
		'rejects the reserved name "%s" as a branch path id',
		(reserved) => {
			const topic = withSteps({
				id: 'mood',
				type: 'branch',
				question: 'How does the customer feel?',
				paths: [
					{ id: 'happy', description: 'Customer is happy' },
					{ id: reserved, description: 'Anything else' }
				]
			});

			const { errors } = loadTopics([file('greeting.json', topic)]);

			expect(errors).toEqual([
				{
					file: 'greeting.json',
					location: 'step "mood".paths[1].id',
					message: `"${reserved}" is a reserved name that the app adds automatically. Choose a different id.`
				}
			]);
		}
	);

	it('excludes a topic with schema errors and still loads the others', () => {
		const { topics, errors } = loadTopics([
			file('broken.json', greeting({ id: 'broken', examples: [] })),
			file('greeting.json', greeting())
		]);

		expect(topics.map((t) => t.id)).toEqual(['greeting']);
		expect(errors.map((e) => e.file)).toEqual(['broken.json']);
	});

	it('rejects duplicate path ids within a branch', () => {
		const topic = withSteps({
			id: 'mood',
			type: 'branch',
			question: 'How does the customer feel?',
			paths: [
				{ id: 'happy', description: 'Customer is happy' },
				{ id: 'happy', description: 'Customer is glad' }
			]
		});

		const { topics, errors } = loadTopics([file('greeting.json', topic)]);

		expect(topics).toEqual([]);
		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'step "mood".paths[1].id',
				message: 'Path id "happy" is already used by paths[0].'
			}
		]);
	});

	it('rejects duplicate rule ids within a check_rules step', () => {
		const topic = withSteps({
			id: 'rules',
			type: 'check_rules',
			rules: [
				{ id: 'upset', condition: 'The customer is upset.' },
				{ id: 'upset', condition: 'The customer is angry.' }
			]
		});

		const { errors } = loadTopics([file('greeting.json', topic)]);

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'step "rules".rules[1].id',
				message: 'Rule id "upset" is already used by rules[0].'
			}
		]);
	});
});
