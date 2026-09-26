<script lang="ts">
	import type { TopicStatus } from '$lib/topic-model/status';

	let { status }: { status: TopicStatus } = $props();

	const style: Record<TopicStatus, { label: string; className: string }> = {
		'draft only': { label: 'Draft only', className: 'draft-only' },
		'unpublished changes': { label: 'Unpublished changes', className: 'unpublished-changes' },
		published: { label: 'Published', className: 'published' }
	};
</script>

<span class="status {style[status].className}">{style[status].label}</span>

<style>
	.status {
		display: inline-block;
		border-radius: 999px;
		padding: 0.1rem 0.65rem;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.published {
		background: var(--accent-soft);
		color: var(--accent);
	}

	.unpublished-changes {
		background: var(--step-jev);
		color: var(--text);
	}

	.draft-only {
		background: var(--step-bot);
		color: var(--muted);
	}
</style>
