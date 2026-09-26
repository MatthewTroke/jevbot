// Saves a draft shortly after the last change, one request at a time. `state` reports
// progress; it only says "saved" once the latest change has been saved.

export type SaveState =
	| { kind: 'saved'; at: string }
	| { kind: 'pending' }
	| { kind: 'saving' }
	| { kind: 'failed'; message: string };

const DELAY_MS = 800;
/** Browsers refuse keepalive requests with bodies over 64 KiB. */
const KEEPALIVE_LIMIT = 60 * 1024;

export class Autosave {
	state = $state<SaveState>({ kind: 'pending' });

	#url: string;
	#unsaved: string | undefined;
	#version = 0;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#inFlight = false;
	#again = false;

	constructor(url: string, savedAt: string) {
		this.#url = url;
		this.state = { kind: 'saved', at: savedAt };
	}

	/** Records a new version of the draft and saves it after a short pause. */
	change(draft: string) {
		this.#unsaved = draft;
		this.#version++;
		this.state = { kind: 'pending' };
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => this.flush(), DELAY_MS);
	}

	/** Saves any unsaved change now. `leaving` lets the request outlive the page. */
	async flush({ leaving = false } = {}) {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		if (this.#unsaved === undefined) return;
		if (this.#inFlight) {
			this.#again = true;
			return;
		}

		const draft = this.#unsaved;
		const version = this.#version;
		this.#inFlight = true;
		this.state = { kind: 'saving' };
		try {
			const response = await fetch(this.#url, {
				method: 'PUT',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: draft,
				keepalive: leaving && draft.length < KEEPALIVE_LIMIT
			});
			const body = (await response.json().catch(() => ({}))) as {
				updatedAt?: string;
				message?: string;
			};
			if (!response.ok || !body.updatedAt) {
				this.state = {
					kind: 'failed',
					message: body.message ?? `Unexpected response (${response.status})`
				};
			} else if (version === this.#version) {
				this.#unsaved = undefined;
				this.state = { kind: 'saved', at: body.updatedAt };
			} else {
				// A newer change arrived while saving; its own save is still to come.
				this.state = { kind: 'pending' };
			}
		} catch {
			this.state = { kind: 'failed', message: "Couldn't reach the server." };
		} finally {
			this.#inFlight = false;
			if (this.#again) {
				this.#again = false;
				this.flush({ leaving });
			}
		}
	}
}
