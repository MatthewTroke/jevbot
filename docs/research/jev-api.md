# Jev (TypeSafe "System One") API notes

Researched 2026-09-26 from primary sources. Re-check the linked pages before relying on a limit or field that isn't listed here — never invent request fields.

## Sources

- Cloudflare model page: https://developers.cloudflare.com/ai/models/typesafe/jev/
  - Input schema: https://developers.cloudflare.com/ai/models/typesafe/jev/schema-input.json
  - Output schema: https://developers.cloudflare.com/ai/models/typesafe/jev/schema-output.json
- TypeSafe API reference: https://docs.typesafe.ai/api.md (index: https://docs.typesafe.ai/llms.txt)
- Choice: https://docs.typesafe.ai/primitives/choice.md · Noul: https://docs.typesafe.ai/primitives/noul.md · Confidence: https://docs.typesafe.ai/confidence.md
- Models and limits: https://docs.typesafe.ai/models.md · Fan-out pattern: https://docs.typesafe.ai/patterns/fan-out.md
- Third-party models on Workers AI need AI Gateway + Unified Billing: https://developers.cloudflare.com/ai-gateway/usage/worker-binding-methods/

## Workers AI binding (the v1 provider)

```ts
const response = await env.AI.run('typesafe/jev', {
	state: 'Help! My payouts have been failing for 3 days.',
	questions: {
		is_urgent: {
			type: 'noul',
			instructions: 'Does this convey urgency?',
			criteria: { true: 'Explicitly time-sensitive', false: 'No urgency expressed' }
		},
		department: {
			type: 'choice',
			instructions: 'Which team should handle this?',
			criteria: { billing: '...', technical: '...', sales: '...' }
		}
	}
});
```

- Input: exactly `state` and `questions` (`additionalProperties: false`). **No `model` field, so the version can't be pinned.**
- `state`: string | object | array | null.
- `questions`: map of id → question. The id must be non-empty and **is not sent to the model**.
- Every question has `type` and `instructions`. The Cloudflare schema lets `instructions` be null, but TypeSafe's reference requires it, so always send it.
- **`type` values are lowercase:** `"noul"`, `"choice"`, `"score"`. Capitalised values are rejected.
- `noul`: optional `criteria: { true, false }`.
- `choice`: required `criteria`, a map of option → description (string | object | array | null). **Option names and their descriptions are both sent to the model**, so option keys should be meaningful words.
- `score` (not used in v1): an ordered `criteria` array with 2–10 levels.
- Output (`model`, `answers` and `usage` are all required):

```json
{
	"model": "jev-1.13.0",
	"answers": {
		"is_urgent": { "type": "noul", "noul": 0.95 },
		"department": {
			"type": "choice",
			"choice": "billing",
			"probabilities": { "billing": 0.88, "technical": 0.12, "sales": 0.0 },
			"confidence": 0.81
		}
	},
	"usage": { "input_tokens": 296, "output_tokens": 20 }
}
```

- `noul`: probability of yes, 0–1. **Noul answers have no `confidence`.**
- `choice`: the option with the highest probability. `probabilities` covers every option and sums to 1. `confidence` (0–1) is derived from the probabilities by an undocumented formula.
- `model` is the versioned ID that answered. Log it.
- `@cloudflare/workers-types` has no typed entry for `typesafe/jev` (`run` falls back to `Record<string, unknown>`), so define our own types and validate the response.
- Context window: 32,000 tokens (Cloudflare page).
- Billing: Cloudflare Unified Billing (prepaid credits, 5% fee on credit purchases) via AI Gateway; the `default` gateway is created automatically if none is specified. Price is $0.042 per million input tokens and output tokens are free.
- Rate limits: none documented for Jev specifically. Generic Text Generation models get 300 requests per minute.

## Observed behaviour (ticket 01 spike, 2026-09-26)

- **The binding wraps the output in a run envelope.** The model page shows the bare output, but a real `env.AI.run('typesafe/jev', …)` returned:

  ```json
  {
  	"state": "Completed",
  	"result": {
  		"model": "jev-1.13.0",
  		"answers": { "…": "…" },
  		"usage": { "input_tokens": 383, "output_tokens": 41 }
  	},
  	"gatewayMetadata": { "keySource": "Unified" }
  }
  ```

  AI Gateway documents a similar envelope for background runs (`id`, `state`, `result`, `error`) but doesn't list `state` values (https://developers.cloudflare.com/ai-gateway/usage/rest-api/). The adapter accepts the envelope or the bare shape, and treats any `state` other than `"Completed"` as a failed run.

- **Gateway:** the adapter passes `{ gateway: { id: 'default' } }`, as Cloudflare's third-party binding example does. The `default` gateway is created on the first successful authenticated request.
- **Credits:** with no Unified Billing credits, the binding throws `2021: Insufficient AI Gateway credits`. Top up in the dashboard: AI → AI Gateway → Credits Available → Manage → Top-up credits. Credits belong to the account Wrangler is logged into (`wrangler whoami`).
- **Cost and speed:** one Choice with 3 options on a short message used 383 input and 41 output tokens, with about 0.9–1 s latency end to end.

## Limits and behaviour (TypeSafe docs)

- Max **255 options per Choice** (TypeSafe docs; Cloudflare doesn't state it — enforce it anyway).
- No documented cap on questions per call; the only limits are token budgets. TypeSafe: 64k tokens per request, of which 32k for `state` plus the longest question. Cloudflare: 32k context.
- Questions in one call are answered independently, so one answer is never context for another.
- Input is text only.

## TypeSafe HTTP API (the swap target, not built in v1)

- `POST https://api.typesafe.ai/v1/systemone` with `Authorization: Bearer <key>`. Body is `{ state, model, questions }`, where `model` is e.g. `"jev-latest"` or a pinned `"jev-1.13.0"`. The response has the same shape as the binding's.
- Errors: 401, 422 (the body names the offending field), 429, 529 Overloaded. May include a `retry-after` header. The request-ID header is `x-typesafe-request-id`.
- JS SDK: `@typesafe-ai/sdk`, method `client.systemOne({ state, questions, model? })`. On Workers, pass `apiKey` explicitly.
