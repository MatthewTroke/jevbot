<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { children } = $props();

	const links = [{ route: '/topics', label: 'Topics' }] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header>
	<a class="brand" href={resolve('/')}>Jevbot</a>
	<nav>
		{#each links as link (link.route)}
			<a
				href={resolve(link.route)}
				aria-current={page.url.pathname.startsWith(link.route) ? 'page' : undefined}>{link.label}</a
			>
		{/each}
	</nav>
</header>

<main>
	{@render children()}
</main>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}

	.brand {
		font-family: var(--font-serif);
		font-size: 1.4rem;
		color: var(--text);
		text-decoration: none;
	}

	nav {
		display: flex;
		gap: 0.25rem;
	}

	nav a {
		padding: 0.35rem 0.75rem;
		border-radius: 0.5rem;
		color: var(--muted);
		text-decoration: none;
	}

	nav a[aria-current='page'] {
		background: var(--accent-soft);
		color: var(--accent);
	}

	main {
		max-width: 60rem;
		margin: 0 auto;
		padding: 2rem 1rem 4rem;
	}
</style>
