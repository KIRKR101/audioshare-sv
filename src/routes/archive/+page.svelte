<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Search, X, ArrowUp, ArrowDown } from '@lucide/svelte';

	let { data } = $props();

	let searchTerm = $state(data.search || '');

	function formatBytes(bytes: number): string {
		if (isNaN(bytes) || bytes < 0) return '0 Bytes';
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getFallbackTitle(filename: string): string {
		if (!filename) return 'N/A';
		const lastDot = filename.lastIndexOf('.');
		if (lastDot === -1 || lastDot === 0) return filename;
		return filename.substring(0, lastDot);
	}

	function updateQuery(params: Record<string, string | number>) {
		const sp = new URLSearchParams($page.url.searchParams);
		for (const [key, value] of Object.entries(params)) {
			if (value === '' || value === undefined) sp.delete(key);
			else sp.set(key, String(value));
		}
		if ('search' in params) sp.set('page', '1');
		goto(`/archive?${sp.toString()}`);
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		updateQuery({ search: searchTerm.trim() });
	}

	function handleClearSearch() {
		searchTerm = '';
		updateQuery({ search: '' });
	}

	function handleSort(column: string) {
		const newOrder = data.sortBy === column && data.sortOrder === 'asc' ? 'desc' : 'asc';
		updateQuery({ sortBy: column, sortOrder: newOrder });
	}

	function handlePage(p: number) {
		updateQuery({ page: p });
	}
</script>

<main class="mx-auto max-w-7xl px-4 pt-32 pb-20 sm:px-6">
	<div
		class="mb-8 flex flex-col gap-2 border-b border-white/[0.04] pb-6 sm:flex-row sm:items-end sm:justify-between"
	>
		<div>
			<h1 class="text-3xl font-extrabold tracking-[-0.04em] text-foreground">Archive</h1>
			<p class="mt-1.5 text-xs text-neutral-400">
				Explore and manage the registry of {data.totalItems} audio file{data.totalItems !== 1
					? 's'
					: ''}.
			</p>
		</div>
	</div>

	<div class="mb-6">
		<form onsubmit={handleSearch}>
			<div class="relative max-w-xs">
				<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<Search class="h-3.5 w-3.5 text-neutral-400" />
				</div>
				<Input
					type="search"
					placeholder="Search files&hellip;"
					bind:value={searchTerm}
					class="h-9 w-full rounded-lg border-white/[0.06] bg-white/[0.015] pr-8 pl-9 text-xs text-foreground transition-all placeholder:text-neutral-500 focus:border-white/[0.2] focus:bg-white/[0.03]"
				/>
				{#if searchTerm}
					<div class="absolute inset-y-0 right-0 flex items-center pr-1.5">
						<button
							type="button"
							onclick={handleClearSearch}
							class="cursor-pointer rounded p-1 text-neutral-400 transition-colors duration-150 hover:text-foreground"
							aria-label="Clear search"
						>
							<X class="h-3.5 w-3.5" />
						</button>
					</div>
				{/if}
			</div>
		</form>
	</div>

	{#if data.error}
		<div
			class="mb-4 rounded-lg border border-white/[0.06] bg-white/[0.015] p-4 text-xs text-foreground"
		>
			<p class="font-semibold text-red-400">Error loading files</p>
			<p class="mt-1 text-neutral-400">{data.error}</p>
		</div>
	{/if}

	<div
		class="overflow-hidden rounded-xl border border-white/[0.06] bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_30px_rgba(0,0,0,0.5)]"
	>
		<div
			class="grid grid-cols-12 gap-4 border-b border-white/[0.06] bg-white/[0.015] px-4 py-3 text-xs font-semibold text-neutral-400"
		>
			<div class="col-span-3">
				<button
					onclick={() => handleSort('title')}
					class="flex cursor-pointer items-center gap-0.5 transition-colors duration-150 hover:text-foreground"
					>Title{#if data.sortBy === 'title'}
						{#if data.sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown
								class="h-3 w-3"
							/>{/if}
					{/if}</button
				>
			</div>
			<div class="col-span-2">
				<button
					onclick={() => handleSort('artist')}
					class="flex cursor-pointer items-center gap-0.5 transition-colors duration-150 hover:text-foreground"
					>Artist{#if data.sortBy === 'artist'}
						{#if data.sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown
								class="h-3 w-3"
							/>{/if}
					{/if}</button
				>
			</div>
			<div class="col-span-2 hidden md:block">
				<button
					onclick={() => handleSort('album')}
					class="flex cursor-pointer items-center gap-0.5 transition-colors duration-150 hover:text-foreground"
					>Album{#if data.sortBy === 'album'}
						{#if data.sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown
								class="h-3 w-3"
							/>{/if}
					{/if}</button
				>
			</div>
			<div class="col-span-3 hidden md:block">
				<button
					onclick={() => handleSort('filename')}
					class="flex cursor-pointer items-center gap-0.5 transition-colors duration-150 hover:text-foreground"
					>Filename{#if data.sortBy === 'filename'}
						{#if data.sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown
								class="h-3 w-3"
							/>{/if}
					{/if}</button
				>
			</div>
			<div class="col-span-2 flex justify-end">
				<button
					onclick={() => handleSort('size')}
					class="flex cursor-pointer items-center gap-0.5 transition-colors duration-150 hover:text-foreground"
					>Size{#if data.sortBy === 'size'}
						{#if data.sortOrder === 'asc'}<ArrowUp class="h-3 w-3" />{:else}<ArrowDown
								class="h-3 w-3"
							/>{/if}
					{/if}</button
				>
			</div>
		</div>

		<div class="divide-y divide-white/[0.02]">
			{#if !data.error && data.files.length > 0}
				{#each data.files as file, index}
					<a
						href={`/audio/${file.link}`}
						class="grid cursor-pointer grid-cols-12 items-center gap-4 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.015]"
					>
						<div class="col-span-3 min-w-0">
							<p class="truncate text-sm font-medium text-foreground">
								{file.title || getFallbackTitle(file.originalName) || 'N/A'}
							</p>
						</div>
						<div class="col-span-2 min-w-0">
							<p class="truncate text-xs text-neutral-400">{file.artist || '—'}</p>
						</div>
						<div class="col-span-2 hidden min-w-0 md:block">
							<p class="truncate text-xs text-neutral-400">{file.album || '—'}</p>
						</div>
						<div class="col-span-3 hidden min-w-0 md:block">
							<p class="truncate font-mono text-xs text-neutral-500">
								{file.originalName || '—'}
							</p>
						</div>
						<div class="col-span-2 text-right">
							<p class="font-mono text-xs text-neutral-400 tabular-nums">
								{formatBytes(file.size ?? 0)}
							</p>
						</div>
					</a>
				{/each}
			{:else}
				<div class="px-4 py-20 text-center font-mono text-xs text-neutral-500">
					{data.search ? `No results for "${data.search}".` : 'No files uploaded yet.'}
				</div>
			{/if}
		</div>
	</div>

	{#if data.totalPages > 0 && !data.error}
		<div class="mt-6 flex items-center justify-between">
			<Button
				variant="outline"
				size="sm"
				class="h-8 rounded-lg border-white/[0.06] bg-transparent text-xs font-semibold transition-all duration-150 hover:bg-white/[0.03] hover:text-foreground"
				onclick={() => handlePage(data.currentPage - 1)}
				disabled={data.currentPage <= 1}>Previous</Button
			>
			<span class="font-mono text-xs text-neutral-400 tabular-nums">
				{data.currentPage} &middot; {data.totalPages}
			</span>
			<Button
				variant="outline"
				size="sm"
				class="h-8 rounded-lg border-white/[0.06] bg-transparent text-xs font-semibold transition-all duration-150 hover:bg-white/[0.03] hover:text-foreground"
				onclick={() => handlePage(data.currentPage + 1)}
				disabled={data.currentPage >= data.totalPages}>Next</Button
			>
		</div>
	{/if}
</main>
