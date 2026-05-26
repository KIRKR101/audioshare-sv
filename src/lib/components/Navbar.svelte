<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Menu, X } from '@lucide/svelte';

	let mobileOpen = $state(false);
	let mobileMenuEl = $state<HTMLElement | null>(null);

	function isActive(path: string): boolean {
		if (path === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(path);
	}

	$effect(() => {
		if (!mobileOpen) return;
		document.body.style.overflow = 'hidden';
		function esc(e: KeyboardEvent) {
			if (e.key === 'Escape') mobileOpen = false;
		}
		function outside(e: MouseEvent) {
			if (mobileMenuEl && mobileMenuEl.contains(e.target as Node)) return;
			if (e.target instanceof HTMLElement && e.target.closest('[data-mobile-trigger]')) return;
			mobileOpen = false;
		}
		document.addEventListener('keydown', esc);
		document.addEventListener('click', outside);
		return () => {
			document.body.style.overflow = '';
			document.removeEventListener('keydown', esc);
			document.removeEventListener('click', outside);
		};
	});
</script>

<header class="sticky top-0 z-50 h-16 border-b border-white/[0.04] bg-black/60 backdrop-blur-md">
	<div class="mx-auto flex h-full max-w-6xl items-center justify-between px-4 sm:px-6">
		<div class="flex h-full items-center gap-8">
			<a
				href={resolve('/')}
				class="flex cursor-pointer items-center gap-2.5 text-sm font-bold tracking-[-0.04em] text-foreground"
			>
				<svg
					class="h-4 w-4 text-foreground"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M12 2v20M17 5v14M22 9v6M7 8v8M2 10v4" />
				</svg>
				AudioShare
			</a>
			<nav class="hidden h-full items-center gap-6 md:flex">
				<a
					href={resolve('/')}
					class="relative flex h-full cursor-pointer items-center text-sm font-medium transition-colors duration-150 {isActive(
						'/'
					)
						? 'font-semibold text-foreground'
						: 'text-neutral-400 hover:text-foreground'}"
				>
					Upload
					{#if isActive('/')}
						<span class="absolute right-0 bottom-0 left-0 h-[1.5px] rounded-full bg-foreground"
						></span>
					{/if}
				</a>
				<a
					href={resolve('/archive')}
					class="relative flex h-full cursor-pointer items-center text-sm font-medium transition-colors duration-150 {isActive(
						'/archive'
					)
						? 'font-semibold text-foreground'
						: 'text-neutral-400 hover:text-foreground'}"
				>
					Archive
					{#if isActive('/archive')}
						<span class="absolute right-0 bottom-0 left-0 h-[1.5px] rounded-full bg-foreground"
						></span>
					{/if}
				</a>
				<a
					href={resolve('/faq')}
					class="relative flex h-full cursor-pointer items-center text-sm font-medium transition-colors duration-150 {isActive(
						'/faq'
					)
						? 'font-semibold text-foreground'
						: 'text-neutral-400 hover:text-foreground'}"
				>
					FAQ
					{#if isActive('/faq')}
						<span class="absolute right-0 bottom-0 left-0 h-[1.5px] rounded-full bg-foreground"
						></span>
					{/if}
				</a>
			</nav>
		</div>

		<div class="flex items-center gap-1 md:hidden">
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (mobileOpen = !mobileOpen)}
				class="h-8 w-8 rounded-md hover:bg-white/[0.03]"
				aria-label="Toggle menu"
				data-mobile-trigger
			>
				{#if mobileOpen}
					<X class="h-4 w-4" />
				{:else}
					<Menu class="h-4 w-4" />
				{/if}
			</Button>
		</div>
	</div>
</header>

{#if mobileOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 cursor-pointer bg-foreground/20 backdrop-blur-sm md:hidden"
		onclick={() => (mobileOpen = false)}
		aria-label="Close menu"
	></button>
{/if}

<div
	bind:this={mobileMenuEl}
	class="fixed top-0 right-0 bottom-0 z-50 flex w-64 flex-col border-l border-white/[0.06] bg-card transition-transform duration-250 md:hidden {mobileOpen
		? 'translate-x-0'
		: 'translate-x-full'}"
>
	<div class="flex items-center justify-between border-b border-white/[0.06] p-4">
		<span class="text-xs font-semibold tracking-wider text-neutral-400 uppercase">Navigation</span>
		<Button
			variant="ghost"
			size="icon"
			onclick={() => (mobileOpen = false)}
			class="h-7 w-7 rounded-md hover:bg-white/[0.03]"
		>
			<X class="h-3.5 w-3.5" />
		</Button>
	</div>
	<nav class="flex flex-col gap-1 p-3">
		<a
			href={resolve('/')}
			onclick={() => (mobileOpen = false)}
			class="cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 {isActive(
				'/'
			)
				? 'bg-white/[0.03] text-foreground'
				: 'text-neutral-400 hover:bg-white/[0.03] hover:text-foreground'}">Upload</a
		>
		<a
			href={resolve('/archive')}
			onclick={() => (mobileOpen = false)}
			class="cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 {isActive(
				'/archive'
			)
				? 'bg-white/[0.03] text-foreground'
				: 'text-neutral-400 hover:bg-white/[0.03] hover:text-foreground'}">Archive</a
		>
		<a
			href={resolve('/faq')}
			onclick={() => (mobileOpen = false)}
			class="cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 {isActive(
				'/faq'
			)
				? 'bg-white/[0.03] text-foreground'
				: 'text-neutral-400 hover:bg-white/[0.03] hover:text-foreground'}">FAQ</a
		>
	</nav>
</div>
