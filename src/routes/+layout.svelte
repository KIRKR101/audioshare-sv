<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>AudioShare</title>
	<meta name="description" content="Share large audio files easily" />
</svelte:head>

<div class="relative min-h-screen bg-background">
	<Navbar />
	{@render children()}
</div>
<Toaster />
