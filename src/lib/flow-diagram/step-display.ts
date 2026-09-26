import { countLabel } from '$lib/text';
import type { Step } from '$lib/topic-model/topics';

// Colour categories from the flow builder legend in docs/screenshots.
export type StepTone = 'start' | 'jev' | 'bot' | 'person';

export const stepStyle: Record<Step['type'], { label: string; tone: StepTone }> = {
	when: { label: 'When', tone: 'start' },
	check_rules: { label: 'Check rules', tone: 'jev' },
	confidence_gate: { label: 'Confidence gate', tone: 'jev' },
	branch: { label: 'Branch', tone: 'jev' },
	send_reply: { label: 'Send reply', tone: 'bot' },
	ask_customer: { label: 'Ask customer', tone: 'bot' },
	hand_off: { label: 'Hand off', tone: 'person' }
};

export const toneLegend: { tone: StepTone; label: string }[] = [
	{ tone: 'start', label: 'Starts the flow' },
	{ tone: 'jev', label: 'Decided by Jev' },
	{ tone: 'bot', label: 'Bot action' },
	{ tone: 'person', label: 'Goes to a person' }
];

/** A short title and detail line for drawing a step as a diagram node. */
export function stepSummary(step: Step, topicName: string): { title: string; detail: string } {
	switch (step.type) {
		case 'when':
			return { title: topicName, detail: 'Starts when a message is about this topic' };
		case 'check_rules':
			return {
				title: 'Does any handoff rule apply?',
				detail: `${countLabel(step.rules.length, 'rule')}: ${step.rules.map((rule) => rule.id).join(' · ')}`
			};
		case 'confidence_gate':
			return { title: 'How sure is Jev about the topic?', detail: 'high · medium · low' };
		case 'branch':
			return { title: step.question, detail: `${step.paths.length} paths + not stated` };
		case 'send_reply':
			return { title: step.text, detail: step.resolve ? 'Then: mark resolved' : 'Reply' };
		case 'ask_customer':
			return {
				title: `“${step.question}”`,
				detail: `${step.buttons.length} buttons · back to ${step.returnsTo}`
			};
		case 'hand_off':
			return { title: step.message, detail: `Reason: ${step.reason}` };
	}
}
