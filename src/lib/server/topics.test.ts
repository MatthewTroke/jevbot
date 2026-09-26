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

// A valid flow using every step type, including the one allowed loop:
// mood → not_stated → ask, which returns to mood.
const BASE_FLOW = {
	steps: [
		{ id: 'start', type: 'when' },
		{ id: 'rules', type: 'check_rules', rules: [{ id: 'upset', condition: 'Customer is upset.' }] },
		{ id: 'person', type: 'hand_off', message: 'A person will follow up.', reason: 'handoff' },
		{ id: 'gate', type: 'confidence_gate' },
		{
			id: 'mood',
			type: 'branch',
			question: 'How does the customer feel?',
			paths: [
				{ id: 'happy', description: 'Customer is happy' },
				{ id: 'sad', description: 'Customer is sad' }
			]
		},
		{ id: 'yay', type: 'send_reply', text: 'Great!', resolve: true },
		{ id: 'aw', type: 'send_reply', text: 'Sorry to hear that.' },
		{
			id: 'ask',
			type: 'ask_customer',
			question: 'How are you?',
			buttons: ['Good', 'Bad'],
			returnsTo: 'mood'
		}
	],
	connections: [
		{ from: 'start', to: 'rules' },
		{ from: 'rules', on: 'matched', to: 'person' },
		{ from: 'rules', on: 'clear', to: 'gate' },
		{ from: 'gate', on: 'high', to: 'mood' },
		{ from: 'gate', on: 'medium', to: 'ask' },
		{ from: 'gate', on: 'low', to: 'person' },
		{ from: 'mood', on: 'happy', to: 'yay' },
		{ from: 'mood', on: 'sad', to: 'aw' },
		{ from: 'mood', on: 'not_stated', to: 'ask' }
	]
};

type Flow = { steps: Record<string, unknown>[]; connections: Record<string, unknown>[] };

/** The base flow as a topic, after applying `edit` to a copy of it. */
function flow(edit: (f: Flow) => void = () => {}) {
	const f: Flow = structuredClone(BASE_FLOW);
	edit(f);
	return greeting(f);
}

const stepById = (f: Flow, id: string) => f.steps.find((step) => step.id === id)!;
const connectionOf = (f: Flow, from: string, on?: string) =>
	f.connections.find((c) => c.from === from && c.on === on)!;

const removeConnection = (f: Flow, from: string, on?: string) => {
	f.connections = f.connections.filter((c) => !(c.from === from && c.on === on));
};

const loadFlow = (edit?: (f: Flow) => void) => loadTopics([file('greeting.json', flow(edit))]);

describe('loadTopics flow graph checks', () => {
	it('accepts a flow with every step type and the ask_customer loop', () => {
		const { topics, errors } = loadFlow();

		expect(errors).toEqual([]);
		expect(topics).toHaveLength(1);
	});

	it('requires a "when" step to start the flow', () => {
		const { topics, errors } = loadFlow((f) => {
			f.steps = f.steps.filter((step) => step.type !== 'when');
			removeConnection(f, 'start');
		});

		expect(topics).toEqual([]);
		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'steps',
				message: 'Needs a "when" step to start the flow.'
			}
		]);
	});

	it('allows only one "when" step', () => {
		const { errors } = loadFlow((f) => {
			f.steps.push({ id: 'start_again', type: 'when' });
			f.connections.push({ from: 'start_again', to: 'rules' });
		});

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'step "start_again"',
				message: 'Only one "when" step is allowed; this flow already starts at "start".'
			}
		]);
	});

	it('rejects a connection to a step that does not exist', () => {
		const { errors } = loadFlow((f) => {
			f.steps = f.steps.filter((step) => step.id !== 'aw');
			connectionOf(f, 'mood', 'sad').to = 'awe';
		});

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'connections[7] (from step "mood").to',
				message: 'No step with id "awe".'
			}
		]);
	});

	it('rejects a connection from a step that does not exist', () => {
		const { errors } = loadFlow((f) => {
			f.connections.push({ from: 'mod', on: 'happy', to: 'yay' });
		});

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'connections[9] (from step "mod").from',
				message: 'No step with id "mod".'
			}
		]);
	});

	it.each([
		['start', undefined, 'step "start"', 'No connection to the next step.'],
		['rules', 'clear', 'step "rules"', 'No connection for "clear".'],
		['gate', 'low', 'step "gate"', 'No connection for "low".'],
		['mood', 'happy', 'step "mood"', 'No connection for path "happy".']
	])('requires every outcome of %s to be connected (missing %s)', (from, on, location, message) => {
		const { topics, errors } = loadFlow((f) => removeConnection(f, from, on));

		expect(topics).toEqual([]);
		expect(errors).toEqual([{ file: 'greeting.json', location, message }]);
	});

	it('requires every branch to connect "not_stated"', () => {
		const { errors } = loadFlow((f) => removeConnection(f, 'mood', 'not_stated'));

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'step "mood"',
				message:
					'No connection for "not_stated", the path Jev picks when the conversation doesn\'t say.'
			}
		]);
	});

	it.each([
		[
			{ from: 'gate', on: 'maybe', to: 'person' },
			'connections[9] (from step "gate").on',
			'"gate" has no outcome "maybe". Use one of: high, medium, low.'
		],
		[
			{ from: 'mood', on: 'angry', to: 'aw' },
			'connections[9] (from step "mood").on',
			'"mood" has no path "angry". Use one of: happy, sad, not_stated.'
		],
		[
			{ from: 'gate', to: 'person' },
			'connections[9] (from step "gate").on',
			'"gate" needs an outcome label ("on"). Use one of: high, medium, low.'
		],
		[
			{ from: 'start', on: 'next', to: 'rules' },
			'connections[9] (from step "start").on',
			'"start" connects to the next step without a label. Remove "on".'
		]
	])('rejects an outcome label the step does not have (%j)', (connection, location, message) => {
		const { errors } = loadFlow((f) => f.connections.push(connection));

		expect(errors).toEqual([{ file: 'greeting.json', location, message }]);
	});

	it('rejects connecting the same outcome twice', () => {
		const { errors } = loadFlow((f) => f.connections.push({ from: 'gate', on: 'high', to: 'ask' }));

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'connections[9] (from step "gate")',
				message: '"gate" already connects "high" in connections[3].'
			}
		]);
	});

	it.each([
		[
			{ from: 'yay', to: 'mood' },
			'"yay" is a send_reply step, which ends the turn, so it can\'t connect onward.'
		],
		[
			{ from: 'person', to: 'gate' },
			'"person" is a hand_off step, which ends the turn, so it can\'t connect onward.'
		],
		[
			{ from: 'ask', on: 'good', to: 'yay' },
			'"ask" is an ask_customer step, which ends the turn, so it can\'t connect onward. The customer\'s next message returns to its branch through "returnsTo".'
		]
	])('rejects connections out of a step that ends the turn (%j)', (connection, message) => {
		const { errors } = loadFlow((f) => f.connections.push(connection));

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: `connections[9] (from step "${connection.from}")`,
				message
			}
		]);
	});

	it('requires a matched rule to lead to a hand_off step', () => {
		const { errors } = loadFlow((f) => {
			connectionOf(f, 'rules', 'matched').to = 'aw';
		});

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'connections[1] (from step "rules").to',
				message: '"matched" must lead to a hand_off step, but "aw" is a send_reply step.'
			}
		]);
	});

	it.each([
		['nowhere', 'No step with id "nowhere".'],
		['yay', 'Must be a branch step, but "yay" is a send_reply step.']
	])('requires ask_customer to return to a branch (returnsTo %s)', (returnsTo, message) => {
		const { errors } = loadFlow((f) => {
			stepById(f, 'ask').returnsTo = returnsTo;
		});

		expect(errors).toEqual([{ file: 'greeting.json', location: 'step "ask".returnsTo', message }]);
	});

	it('rejects a loop made of connections', () => {
		const { topics, errors } = loadFlow((f) => {
			f.steps = f.steps.filter((step) => step.id !== 'aw');
			connectionOf(f, 'mood', 'sad').to = 'gate';
		});

		expect(topics).toEqual([]);
		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'connections[7] (from step "mood")',
				message:
					'This connection makes a loop: gate → mood → gate. Only an ask_customer step may lead back, through "returnsTo".'
			}
		]);
	});

	it('rejects a step that cannot be reached from the start', () => {
		const { errors } = loadFlow((f) => {
			f.steps.push({ id: 'lonely', type: 'send_reply', text: 'Nobody gets here.' });
		});

		expect(errors).toEqual([
			{
				file: 'greeting.json',
				location: 'step "lonely"',
				message: 'Can\'t be reached from the start ("start").'
			}
		]);
	});

	it('counts an ask_customer return as a way to reach its branch', () => {
		// The branch is only reachable through ask's returnsTo, like return_policy's confirmed_topic.
		const { errors } = loadFlow((f) => {
			connectionOf(f, 'gate', 'high').to = 'ask';
		});

		expect(errors).toEqual([]);
	});

	it('limits a branch to 255 options including "not_stated"', () => {
		const paths = (count: number) =>
			Array.from({ length: count }, (_, i) => ({ id: `p${i}`, description: `Path ${i}` }));
		const withPaths = (count: number) =>
			loadFlow((f) => {
				stepById(f, 'mood').paths = paths(count);
				f.connections = f.connections.filter((c) => c.from !== 'mood');
				for (const path of paths(count))
					f.connections.push({ from: 'mood', on: path.id, to: 'yay' });
				f.connections.push({ from: 'mood', on: 'not_stated', to: 'aw' });
			});

		expect(withPaths(254).errors).toEqual([]);
		expect(withPaths(255).errors).toEqual([
			{
				file: 'greeting.json',
				location: 'step "mood".paths',
				message:
					'Has 256 options with "not_stated", but Jev allows at most 255. Remove at least 1 path.'
			}
		]);
	});

	it('limits the topic question to 254 topics plus "other", across all files', () => {
		const files = (count: number) =>
			Array.from({ length: count }, (_, i) =>
				file(`topic_${i}.json`, greeting({ id: `topic_${i}` }))
			);

		expect(loadTopics(files(254)).errors).toEqual([]);

		const { topics, errors } = loadTopics(files(255));
		expect(topics).toHaveLength(254);
		expect(errors).toEqual([
			{
				file: 'topic_254.json',
				location: 'id',
				message:
					'Too many topics: Jev\'s topic question allows 254 topics plus "other", so this one is left out.'
			}
		]);
	});

	it('excludes a topic with a broken flow and still loads the others', () => {
		const broken = flow((f) => removeConnection(f, 'gate', 'low'));

		const { topics, errors } = loadTopics([
			file('broken.json', { ...broken, id: 'broken' }),
			file('greeting.json', greeting())
		]);

		expect(topics.map((t) => t.id)).toEqual(['greeting']);
		expect(errors.map((e) => e.file)).toEqual(['broken.json']);
	});

	it('reports a loop even while another step has a missing outcome', () => {
		const { errors } = loadFlow((f) => {
			f.steps = f.steps.filter((step) => step.id !== 'aw');
			connectionOf(f, 'mood', 'sad').to = 'gate';
			removeConnection(f, 'gate', 'low');
		});

		expect(errors.map((e) => e.location)).toEqual([
			'step "gate"',
			'connections[6] (from step "mood")'
		]);
	});
});
