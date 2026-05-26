<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Music, Upload, Copy, Check, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let file = $state<File | null>(null);
	let uploading = $state(false);
	let progress = $state(0);
	let shareableLink = $state('');
	let isCopying = $state(false);
	let metadata = $state<{ title: string; artist: string } | null>(null);
	let albumArtUrl = $state<string | null>(null);
	let loadingMetadata = $state(false);
	let isDragging = $state(false);
	let fileInputEl = $state<HTMLInputElement | null>(null);

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	$effect(() => {
		return () => {
			if (albumArtUrl) URL.revokeObjectURL(albumArtUrl);
		};
	});

	async function extractMetadata(f: File) {
		loadingMetadata = true;
		try {
			const { parseBlob } = await import('music-metadata');
			const parsed = await parseBlob(f);
			const title = parsed.common.title || f.name.replace(/\.[^/.]+$/, '');
			const artist = parsed.common.artist || 'Unknown Artist';
			const art =
				parsed.common.picture && parsed.common.picture.length > 0
					? URL.createObjectURL(
							new Blob([parsed.common.picture[0].data as BlobPart], {
								type: parsed.common.picture[0].format
							})
						)
					: null;
			metadata = { title, artist };
			albumArtUrl = art;
		} catch {
			metadata = { title: f.name.replace(/\.[^/.]+$/, ''), artist: 'Unknown Artist' };
			albumArtUrl = null;
		} finally {
			loadingMetadata = false;
		}
	}

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const selected = target.files?.[0];
		if (selected) {
			file = selected;
			progress = 0;
			shareableLink = '';
			extractMetadata(selected);
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const dropped = e.dataTransfer?.files[0];
		if (dropped && dropped.type.startsWith('audio/')) {
			file = dropped;
			progress = 0;
			shareableLink = '';
			extractMetadata(dropped);
		} else {
			toast.error('Please drop an audio file.');
		}
	}

	function handleUpload() {
		if (!file) {
			toast.error('Please select a file first!');
			return;
		}

		uploading = true;
		progress = 0;

		const formData = new FormData();
		formData.append('file', file);

		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/api/upload');

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable) {
				progress = Math.round((event.loaded * 100) / event.total);
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				const data = JSON.parse(xhr.response);
				shareableLink = `${window.location.origin}/audio/${data.fileId}`;
				toast.success('Upload successful!');
			} else {
				let msg = 'Upload failed. Try again.';
				try {
					const errData = JSON.parse(xhr.response);
					if (errData?.error) msg = errData.error;
				} catch {
					/* intentionally empty */
				}
				toast.error(msg);
			}
		};

		xhr.onerror = () => {
			toast.error('Upload failed. Network error.');
			progress = 0;
		};
		xhr.onloadend = () => {
			uploading = false;
		};
		xhr.send(formData);
	}

	function handleDeselectFile() {
		file = null;
		if (fileInputEl) fileInputEl.value = '';
		progress = 0;
		shareableLink = '';
		metadata = null;
		albumArtUrl = null;
	}

	function handleCopyLink() {
		navigator.clipboard
			.writeText(shareableLink)
			.then(() => {
				toast.success('Link copied to clipboard!');
				isCopying = true;
				setTimeout(() => (isCopying = false), 1500);
			})
			.catch(() => toast.error('Failed to copy link.'));
	}
</script>

<main class="mx-auto max-w-xl px-4 pt-32 pb-20 sm:px-6">
	<div class="mb-12 flex flex-col items-center text-center">
		<h1
			class="text-[clamp(3rem,8vw,5.5rem)] leading-[0.92] font-extrabold tracking-[-0.06em] text-foreground"
		>
			Share audio.
		</h1>
		<p class="mt-4 max-w-md text-sm leading-relaxed text-neutral-400">
			Upload high-quality audio files and share them instantly with anyone, featuring automated
			metadata extraction and lossless streaming.
		</p>
	</div>

	<div
		class="overflow-hidden rounded-xl border border-white/[0.06] bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_30px_rgba(0,0,0,0.5)]"
	>
		<div class="p-6">
			{#if file}
				<div class="space-y-4">
					<div
						class="flex items-start gap-3.5 rounded-lg border border-white/[0.04] bg-white/[0.015] p-4"
					>
						{#if loadingMetadata}
							<div class="h-10 w-10 shrink-0 animate-pulse rounded-md bg-white/[0.03]"></div>
						{:else if albumArtUrl}
							<img
								src={albumArtUrl}
								alt="Album Art"
								class="h-10 w-10 shrink-0 rounded-md border border-white/[0.06] object-cover"
							/>
						{:else}
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.03] bg-white/[0.03]"
							>
								<Music class="h-4 w-4 text-neutral-400" />
							</div>
						{/if}

						<div class="min-w-0 flex-1">
							{#if loadingMetadata}
								<div class="space-y-1.5">
									<div class="h-4 w-3/4 animate-pulse rounded bg-white/[0.03]"></div>
									<div class="h-3 w-1/2 animate-pulse rounded bg-white/[0.03]"></div>
									<div class="h-3 w-1/4 animate-pulse rounded bg-white/[0.03]"></div>
								</div>
							{:else}
								<p class="truncate text-sm font-medium text-foreground">{metadata?.title}</p>
								<p class="truncate text-xs text-neutral-400">{metadata?.artist}</p>
								<p class="mt-0.5 font-mono text-[10px] text-neutral-500">
									{formatFileSize(file.size)}
								</p>
							{/if}
						</div>

						<Button
							variant="ghost"
							size="icon"
							onclick={handleDeselectFile}
							class="h-7 w-7 shrink-0 rounded-md text-neutral-400 transition-colors duration-150 hover:bg-white/[0.03] hover:text-foreground"
							disabled={uploading}
						>
							<X class="h-3.5 w-3.5" />
						</Button>
					</div>

					{#if uploading}
						<div class="space-y-2.5">
							<div class="h-1 w-full overflow-hidden rounded-full bg-white/[0.03]">
								<div
									class="h-full bg-foreground transition-all duration-300 ease-out"
									style="width: {progress}%"
								></div>
							</div>
							<div
								class="flex justify-between font-mono text-[10px] tracking-wider text-neutral-400 uppercase"
							>
								<span>Uploading</span>
								<span class="tabular-nums">{progress}%</span>
							</div>
						</div>
					{/if}

					{#if !shareableLink}
						<Button
							class="h-10 w-full rounded-lg bg-white text-sm font-medium text-black transition-all duration-150 hover:opacity-90 active:scale-[0.99]"
							onclick={handleUpload}
							disabled={uploading || loadingMetadata}
						>
							{#if uploading}
								<span
									class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
								></span>
								Uploading&hellip;
							{:else}
								<Upload class="mr-1.5 h-3.5 w-3.5" />
								Upload File
							{/if}
						</Button>
					{/if}
				</div>
			{:else}
				<div
					class="relative cursor-pointer rounded-lg border border-dashed border-white/[0.09] bg-white/[0.015] p-12 text-center transition-all duration-200 hover:border-white/[0.2] hover:bg-white/[0.015] {isDragging
						? 'border-white bg-white/[0.03]'
						: ''}"
					onclick={() => fileInputEl?.click()}
					ondragover={(e) => e.preventDefault()}
					ondragenter={(e) => {
						e.preventDefault();
						isDragging = true;
					}}
					ondragleave={(e) => {
						e.preventDefault();
						isDragging = false;
					}}
					ondrop={handleDrop}
					role="button"
					tabindex="0"
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') fileInputEl?.click();
					}}
				>
					<input
						type="file"
						accept="audio/*"
						onchange={handleFileChange}
						bind:this={fileInputEl}
						class="hidden"
					/>
					<div
						class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.015]"
					>
						<Upload class="h-4 w-4 text-neutral-400" />
					</div>
					<p class="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
					<p class="mt-1.5 font-mono text-xs text-neutral-500">
						MP3, WAV, FLAC, OGG, AAC, M4A &mdash; up to 300MB
					</p>
				</div>
			{/if}

			{#if shareableLink}
				<div
					class="mt-4 flex items-center gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.015] p-3"
				>
					<Check class="h-3.5 w-3.5 shrink-0 text-emerald-400" />
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={shareableLink}
						target="_blank"
						rel="noopener noreferrer"
						class="flex-1 truncate font-mono text-xs text-neutral-400 decoration-white/[0.2] underline-offset-4 transition-colors duration-150 hover:text-white hover:underline"
					>
						{shareableLink}
					</a>
					<Button
						variant="ghost"
						size="icon"
						onclick={handleCopyLink}
						class="h-7 w-7 shrink-0 rounded-md text-neutral-400 transition-colors duration-150 hover:bg-white/[0.03] hover:text-foreground"
						disabled={isCopying}
					>
						{#if isCopying}
							<Check class="h-3.5 w-3.5 text-emerald-400" />
						{:else}
							<Copy class="h-3.5 w-3.5" />
						{/if}
					</Button>
				</div>
			{/if}
		</div>
	</div>
</main>
