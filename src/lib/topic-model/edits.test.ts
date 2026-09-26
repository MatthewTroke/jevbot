import { describe, expect, it } from 'vitest';
import { applyEdit } from './edits';
import { openOutcomes } from './flow-graph';
import { loadTopics, validateTopicFile, type Topic } from './topics';

// A small valid topic: rules, gate, a branch with a button question, a reply and hand-offs.
function sampleTopic(): Topic {
	const source = JSON.stringify({
		id: 'returns',
		name: 'Returns',
		description: 'Customer wants to return an item.',
		examples: ['Can I return this?', 'How do refunds work?', 'I want to send it back'],
		steps: [
			{ id: 'start', type: 'when' },
			{
				id: 'rules',
				type: 'check_rules',
				rules: [{ id: 'rule_1', condition: 'Customer is upset.' }]
			},
			{ id: 'person', type: 'hand_off', message: 'A person will follow up.', reason: 'handoff' },
			{ id: 'gate', type: 'confidence_gate' },
			{
				id: 'condition',
				type: 'branch',
				question: 'What condition is the item in?',
				paths: [
					{ id: 'unworn', description: 'Not worn' },
					{ id: 'worn', description: 'Worn or used' }
				]
			},
			{ id: 'steps', type: 'send_reply', text: 'Here is how to return it.', resolve: true },
			{ id: 'sorry', type: 'send_reply', text: 'Worn items cannot be returned.' },
			{
				id: 'ask',
				type: 'ask_customer',
				question: 'Has it been worn?',
				buttons: ['No', 'Yes'],
				returnsTo: 'condition'
			}
		],
		connections: [
			{ from: 'start', to: 'rules' },
			{ from: 'rules', on: 'matched', to: 'person' },
			{ from: 'rules', on: 'clear', to: 'gate' },
			{ from: 'gate', on: 'high', to: 'condition' },
			{ from: 'gate', on: 'medium', to: 'ask' },
			{ from: 'gate', on: 'low', to: 'person' },
			{ from: 'condition', on: 'unworn', to: 'steps' },
			{ from: 'condition', on: 'worn', to: 'sorry' },
			{ from: 'condition', on: 'not_stated', to: 'ask' }
		]
	});
	const { topic, errors } = validateTopicFile({ file: 'returns', source });
	if (!topic || errors.length > 0) throw new Error(`Bad fixture: ${JSON.stringify(errors)}`);
	return topic;
}

describe('applyEdit', () => {
	it('updates the topic details', () => {
		const topic = applyEdit(sampleTopic(), {
			type: 'update_topic',
			name: 'Returns and refunds',
			description: 'Customer wants to return an item or get a refund.',
			examples: ['Can I return this?', 'Where is my refund?', 'I want to send it back']
		});

		expect(topic).toMatchObject({
			name: 'Returns and refunds',
			description: 'Customer wants to return an item or get a refund.',
			examples: ['Can I return this?', 'Where is my refund?', 'I want to send it back']
		});
	});

	it('does not change the topic it was given', () => {
		const original = sampleTopic();

		applyEdit(original, { type: 'update_topic', name: 'Something else' });

		expect(original.name).toBe('Returns');
	});

	it.each([
		['condition', { question: 'Is the item worn, unworn or damaged?' }],
		['sorry', { text: "Sorry, worn items can't be returned.", resolve: true }],
		['ask', { question: 'Have you worn it?', buttons: ['Not worn', 'Worn', 'Damaged'] }],
		['ask', { returnsTo: 'rules' }],
		['person', { message: 'Someone from our team will reply soon.', reason: 'rule matched' }]
	])('updates the fields of step %s', (stepId, changes) => {
		const topic = applyEdit(sampleTopic(), { type: 'update_step', stepId, changes });

		expect(topic.steps.find((step) => step.id === stepId)).toMatchObject(changes);
	});

	it('refuses a field the step type does not have', () => {
		expect(() =>
			applyEdit(sampleTopic(), { type: 'update_step', stepId: 'gate', changes: { text: 'Hi' } })
		).toThrow('A confidence_gate step has no "text".');
	});

	it('refuses to edit a step that does not exist', () => {
		expect(() =>
			applyEdit(sampleTopic(), { type: 'update_step', stepId: 'nope', changes: { text: 'Hi' } })
		).toThrow('There is no step "nope".');
	});

	const branch = (topic: Topic, id = 'condition') => {
		const step = topic.steps.find((s) => s.id === id);
		if (step?.type !== 'branch') throw new Error(`${id} is not a branch`);
		return step;
	};

	it('adds a path named in plain words, leaving it open to connect', () => {
		const topic = applyEdit(sampleTopic(), {
			type: 'add_path',
			stepId: 'condition',
			name: 'It arrived damaged!',
			description: 'Broken, faulty or wrong item'
		});

		expect(branch(topic).paths).toEqual([
			{ id: 'unworn', description: 'Not worn' },
			{ id: 'worn', description: 'Worn or used' },
			{ id: 'it_arrived_damaged', description: 'Broken, faulty or wrong item' }
		]);
		expect(openOutcomes(topic, branch(topic))).toEqual(['it_arrived_damaged']);
	});

	it('starts a path name that begins with a digit with "path_"', () => {
		const topic = applyEdit(sampleTopic(), {
			type: 'add_path',
			stepId: 'condition',
			name: '2nd hand',
			description: 'Bought second hand'
		});

		expect(branch(topic).paths.at(-1)?.id).toBe('path_2nd_hand');
	});

	const connectionsFrom = (topic: Topic, from: string) =>
		topic.connections.filter((c) => c.from === from);

	it('renames a path and keeps its connection', () => {
		const topic = applyEdit(sampleTopic(), {
			type: 'rename_path',
			stepId: 'condition',
			pathId: 'worn',
			name: 'Worn or used'
		});

		expect(branch(topic).paths[1]).toEqual({ id: 'worn_or_used', description: 'Worn or used' });
		expect(connectionsFrom(topic, 'condition')).toEqual([
			{ from: 'condition', on: 'unworn', to: 'steps' },
			{ from: 'condition', on: 'worn_or_used', to: 'sorry' },
			{ from: 'condition', on: 'not_stated', to: 'ask' }
		]);
	});

	it("updates a path's description", () => {
		const topic = applyEdit(sampleTopic(), {
			type: 'update_path',
			stepId: 'condition',
			pathId: 'unworn',
			description: 'Not worn or used, still in the box'
		});

		expect(branch(topic).paths[0]).toEqual({
			id: 'unworn',
			description: 'Not worn or used, still in the box'
		});
	});

	it('removes a path and its connection', () => {
		const topic = applyEdit(sampleTopic(), {
			type: 'remove_path',
			stepId: 'condition',
			pathId: 'worn'
		});

		expect(branch(topic).paths.map((path) => path.id)).toEqual(['unworn']);
		expect(connectionsFrom(topic, 'condition')).toEqual([
			{ from: 'condition', on: 'unworn', to: 'steps' },
			{ from: 'condition', on: 'not_stated', to: 'ask' }
		]);
	});

	it.each([
		['?!', 'Give the path a name with at least one letter or digit.'],
		['Not stated', '"not_stated" is added to every branch automatically. Choose another name.'],
		['other', '"other" is a reserved name. Choose another name.'],
		['Worn', 'This branch already has a path named "worn".']
	])('refuses to add a path named %j', (name, message) => {
		expect(() =>
			applyEdit(sampleTopic(), { type: 'add_path', stepId: 'condition', name, description: 'x' })
		).toThrow(message);
	});

	it('refuses to rename a path to the name of another path', () => {
		expect(() =>
			applyEdit(sampleTopic(), {
				type: 'rename_path',
				stepId: 'condition',
				pathId: 'unworn',
				name: 'worn'
			})
		).toThrow('This branch already has a path named "worn".');
	});

	it('allows renaming a path to its own name', () => {
		const topic = applyEdit(sampleTopic(), {
			type: 'rename_path',
			stepId: 'condition',
			pathId: 'worn',
			name: 'Worn'
		});

		expect(branch(topic).paths[1].id).toBe('worn');
	});

	const rules = (topic: Topic) => {
		const step = topic.steps.find((s) => s.id === 'rules');
		if (step?.type !== 'check_rules') throw new Error('rules is not a check_rules step');
		return step.rules;
	};

	it('adds a rule with a generated id', () => {
		const topic = applyEdit(sampleTopic(), {
			type: 'add_rule',
			stepId: 'rules',
			condition: 'The customer mentions a chargeback.'
		});

		expect(rules(topic)).toEqual([
			{ id: 'rule_1', condition: 'Customer is upset.' },
			{ id: 'rule_2', condition: 'The customer mentions a chargeback.' }
		]);
	});

	it('updates and removes rules, numbering new rules after the highest id in use', () => {
		let topic = applyEdit(sampleTopic(), {
			type: 'add_rule',
			stepId: 'rules',
			condition: 'Legal.'
		});
		topic = applyEdit(topic, {
			type: 'update_rule',
			stepId: 'rules',
			ruleId: 'rule_2',
			condition: 'The customer mentions legal action.'
		});
		topic = applyEdit(topic, { type: 'remove_rule', stepId: 'rules', ruleId: 'rule_1' });
		topic = applyEdit(topic, {
			type: 'add_rule',
			stepId: 'rules',
			condition: 'Asks for a person.'
		});

		expect(rules(topic)).toEqual([
			{ id: 'rule_2', condition: 'The customer mentions legal action.' },
			{ id: 'rule_3', condition: 'Asks for a person.' }
		]);
	});

	it('keeps the topic valid through a realistic editing session', () => {
		const edits: Parameters<typeof applyEdit>[1][] = [
			{
				type: 'update_topic',
				examples: ['Can I return this?', 'How do refunds work?', 'Return shoes']
			},
			{
				type: 'update_step',
				stepId: 'condition',
				changes: { question: 'Has the item been worn?' }
			},
			{ type: 'rename_path', stepId: 'condition', pathId: 'unworn', name: 'Still in the box' },
			{
				type: 'update_path',
				stepId: 'condition',
				pathId: 'worn',
				description: 'Worn, used or washed'
			},
			{ type: 'add_rule', stepId: 'rules', condition: 'The customer mentions a chargeback.' },
			{
				type: 'update_step',
				stepId: 'sorry',
				changes: { text: 'Sorry, worn items can’t come back.' }
			},
			{ type: 'update_step', stepId: 'ask', changes: { buttons: ['Still in the box', 'Worn'] } }
		];
		const topic = edits.reduce(applyEdit, sampleTopic());

		const { topics, errors } = loadTopics([{ file: 'returns', source: JSON.stringify(topic) }]);

		expect(errors).toEqual([]);
		expect(topics).toHaveLength(1);
	});
});
