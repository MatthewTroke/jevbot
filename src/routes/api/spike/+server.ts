import { error, json } from '@sveltejs/kit';
import { createJev, JevError } from '$lib/server/jev';
import type { RequestHandler } from './$types';

// Throwaway spike (ticket 01): proves a server route on Cloudflare can ask Jev one
// hardcoded Choice question and get a typed answer back. Removed once /chat exists.

const SAMPLE_MESSAGE = 'can i send back shoes i bought last week? still in the box';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform) error(500, 'Cloudflare platform bindings are unavailable');

	const jev = createJev(platform.env.AI);
	try {
		const result = await jev.ask(SAMPLE_MESSAGE, {
			topic: {
				type: 'choice',
				instructions: "Which support topic is the customer's message about?",
				criteria: {
					return_policy:
						'Returning or exchanging an item they bought, refunds, or whether an item can be sent back.',
					shipping_times:
						'How long delivery takes, when an order will arrive, shipping speeds or where we ship to.',
					other: 'Anything that is not about returns or shipping times.'
				}
			}
		});

		const topic: 'return_policy' | 'shipping_times' | 'other' = result.answers.topic.choice;
		return json({
			message: SAMPLE_MESSAGE,
			topic,
			confidence: result.answers.topic.confidence,
			probabilities: result.answers.topic.probabilities,
			model: result.model,
			usage: result.usage,
			latencyMs: result.call.latencyMs
		});
	} catch (e) {
		if (e instanceof JevError) {
			return json(
				{ error: e.kind, message: e.message, response: e.call.response },
				{ status: 502 }
			);
		}
		throw e;
	}
};
