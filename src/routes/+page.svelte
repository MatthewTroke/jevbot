<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Jevbot</title>
</svelte:head>

<h1>Jevbot</h1>
<p>
	A prototype support chatbot that follows hand-built topic flows and uses Jev for every decision.
</p>
<p><a href={resolve('/topics')}>See the loaded topics</a></p>
