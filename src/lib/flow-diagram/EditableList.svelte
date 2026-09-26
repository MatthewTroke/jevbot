<script lang="ts">
	// A list of text rows the author can edit, add to and remove from. Keyed by position,
	// since drafts may contain duplicates.
	let {
		items,
		label,
		onchange
	}: {
		items: string[];
		label: string;
		onchange: (items: string[]) => void;
	} = $props();

	const set = (index: number, value: string) =>
		onchange(items.map((item, i) => (i === index ? value : item)));
	const remove = (index: number) => onchange(items.filter((_, i) => i !== index));
</script>

<ul class="editable-list">
	{#each items as item, i (i)}
		<li>
			<input
				aria-label="{label} {i + 1}"
				value={item}
				oninput={(e) => set(i, e.currentTarget.value)}
			/>
			<button
				type="button"
				class="icon-button"
				aria-label="Remove {label} {i + 1}"
				onclick={() => remove(i)}>✕</button
			>
		</li>
	{/each}
</ul>
<button type="button" class="add-button" onclick={() => onchange([...items, ''])}
	>+ Add {label}</button
>

<style>
	.editable-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.4rem;
	}

	li {
		display: flex;
		gap: 0.4rem;
		align-items: flex-start;
	}

	input {
		flex: 1;
		min-width: 0;
	}
</style>
