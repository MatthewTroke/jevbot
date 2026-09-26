import { z } from 'zod';

// Jev (TypeSafe "System One") via the Workers AI binding. This is the only module that
// touches env.AI; everything else depends on the `Jev` interface so the provider can be
// swapped (e.g. for TypeSafe's HTTP API) and faked in tests.
//
// Only documented fields are used — see docs/research/jev-api.md and
// https://developers.cloudflare.com/ai/models/typesafe/jev/. Question ids are not sent to
// the model, so each question's full meaning must be in `instructions`. Choice option keys
// and their descriptions ARE sent, so option keys should be meaningful words.

const MODEL = 'typesafe/jev';
// Third-party models run through AI Gateway and are paid with Unified Billing credits.
// "default" is auto-created on the first request if the account doesn't have it yet.
const GATEWAY_ID = 'default';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JevState = string | JsonValue[] | { [key: string]: JsonValue };

export type ChoiceQuestion<Option extends string = string> = {
	type: 'choice';
	instructions: string;
	/** Option key → description of when to pick it. At most 255 options. */
	criteria: Record<Option, string>;
};

export type NoulQuestion = {
	type: 'noul';
	instructions: string;
	criteria?: { true: string; false: string };
};

export type JevQuestion = ChoiceQuestion | NoulQuestion;
export type JevQuestions = Record<string, JevQuestion>;

export type ChoiceAnswer<Option extends string = string> = {
	type: 'choice';
	choice: Option;
	probabilities: Record<Option, number>;
	confidence: number;
};

/** Noul answers carry only the probability of "yes"; Jev returns no confidence for them. */
export type NoulAnswer = { type: 'noul'; noul: number };

export type JevAnswers<Q extends JevQuestions> = {
	[K in keyof Q]: Q[K] extends ChoiceQuestion<infer Option> ? ChoiceAnswer<Option> : NoulAnswer;
};

export type JevRequest = { state: JevState; questions: JevQuestions };

/** One round trip to Jev, kept for the call log whether it succeeded or failed. */
export type JevCall = {
	request: JevRequest;
	/** Raw response from the binding; undefined when the request itself failed. */
	response: unknown;
	latencyMs: number;
};

export type JevResult<Q extends JevQuestions> = {
	answers: JevAnswers<Q>;
	/** Versioned id of the model that answered, e.g. "jev-1.13.0". */
	model: string;
	usage: { inputTokens: number; outputTokens: number };
	call: JevCall;
};

export interface Jev {
	ask<Q extends JevQuestions>(state: JevState, questions: Q): Promise<JevResult<Q>>;
}

/**
 * - `request_failed`: the binding call threw (network, auth, missing credits, …).
 * - `run_failed`: Jev ran but the run didn't complete.
 * - `invalid_response`: the output doesn't match the documented schema or the questions asked.
 */
export type JevErrorKind = 'request_failed' | 'run_failed' | 'invalid_response';

export class JevError extends Error {
	readonly kind: JevErrorKind;
	readonly call: JevCall;

	constructor(kind: JevErrorKind, message: string, call: JevCall, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'JevError';
		this.kind = kind;
		this.call = call;
	}
}

const probability = z.number().min(0).max(1);

const answerSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('noul'), noul: probability }),
	z.object({
		type: z.literal('choice'),
		choice: z.string(),
		probabilities: z.record(z.string(), probability),
		confidence: probability
	})
]);

const responseSchema = z.object({
	model: z.string().min(1),
	answers: z.record(z.string(), answerSchema),
	usage: z.object({
		input_tokens: z.number().int().nonnegative(),
		output_tokens: z.number().int().nonnegative()
	})
});

// The binding wraps third-party output in a run envelope that the model page doesn't show
// (see "Observed behaviour" in docs/research/jev-api.md). Both shapes are accepted.
const runEnvelopeSchema = z.object({
	state: z.string(),
	result: z.unknown().optional(),
	error: z.unknown().optional()
});

export function createJev(ai: Ai): Jev {
	return {
		async ask<Q extends JevQuestions>(state: JevState, questions: Q): Promise<JevResult<Q>> {
			const request: JevRequest = { state, questions };
			const started = Date.now();

			let response: unknown;
			try {
				response = await ai.run(MODEL, request, { gateway: { id: GATEWAY_ID } });
			} catch (cause) {
				const reason = cause instanceof Error ? cause.message : String(cause);
				const call = { request, response: undefined, latencyMs: Date.now() - started };
				throw new JevError('request_failed', `Jev call failed: ${reason}`, call, { cause });
			}
			const call: JevCall = { request, response, latencyMs: Date.now() - started };

			let output = response;
			const envelope = runEnvelopeSchema.safeParse(response);
			if (envelope.success) {
				const { state: runState, result, error } = envelope.data;
				if (runState !== 'Completed') {
					const detail = JSON.stringify(error ?? null);
					throw new JevError('run_failed', `Jev run ended in state "${runState}": ${detail}`, call);
				}
				output = result;
			}

			const parsed = responseSchema.safeParse(output);
			const problem = parsed.success
				? describeMismatch(questions, parsed.data.answers)
				: z.prettifyError(parsed.error);
			if (!parsed.success || problem) {
				throw new JevError('invalid_response', `Unexpected Jev response: ${problem}`, call);
			}

			return {
				answers: parsed.data.answers as JevAnswers<Q>,
				model: parsed.data.model,
				usage: {
					inputTokens: parsed.data.usage.input_tokens,
					outputTokens: parsed.data.usage.output_tokens
				},
				call
			};
		}
	};
}

/** Checks the answers line up with the questions asked, so the cast to JevAnswers is sound. */
function describeMismatch(
	questions: JevQuestions,
	answers: Record<string, z.infer<typeof answerSchema>>
): string | undefined {
	for (const [id, question] of Object.entries(questions)) {
		const answer = answers[id];
		if (!answer) return `no answer for question "${id}"`;
		if (answer.type !== question.type) {
			return `question "${id}" is a ${question.type} but got a ${answer.type} answer`;
		}
		if (question.type === 'choice' && answer.type === 'choice') {
			const options = Object.keys(question.criteria);
			if (!options.includes(answer.choice)) {
				return `question "${id}" answered "${answer.choice}", which is not an option`;
			}
			const scored = Object.keys(answer.probabilities);
			if (scored.length !== options.length || !options.every((o) => scored.includes(o))) {
				return `question "${id}" has probabilities for [${scored}] but the options are [${options}]`;
			}
		}
	}
	return undefined;
}
