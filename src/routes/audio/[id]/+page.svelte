<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Slider } from '$lib/components/ui/slider';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import MetadataDialog from '$lib/components/MetadataDialog.svelte';
	import { Play, Pause, Volume1, Volume2, VolumeX, Download, MoreHorizontal } from '@lucide/svelte';

	let { data } = $props();
	const fileMetadata: any = data.fileMetadata;
	const fileId: string = data.fileId;
	const fileName: string = data.fileName;
	const audioSrc = `/api/audio/${fileId}`;

	let audioEl = $state<HTMLAudioElement | null>(null);
	let isPlaying = $state(false);
	let isBuffering = $state(false);
	let playerProgress = $state(0);
	let duration = $state(0);
	let playerVolume = $state(0.5);
	let isMuted = $state(false);
	let showMetadata = $state(false);
	let error = $state<string | null>(null);
	let seekValue = $state(0);
	let volumeValue = $state(0.5);
	let preMuteVolume = $state(0.5);
	let imageError = $state(false);
	let isSeeking = $state(false);

	function formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60)
			.toString()
			.padStart(2, '0');
		return `${m}:${s}`;
	}

	function togglePlay() {
		if (!audioEl) return;
		if (isPlaying) {
			audioEl.pause();
			isPlaying = false;
		} else {
			audioEl
				.play()
				.then(() => {
					isPlaying = true;
				})
				.catch(() => {
					error = 'Playback failed. Please try again.';
				});
		}
	}

	function toggleMute() {
		if (!audioEl) return;
		if (!isMuted) {
			preMuteVolume = playerVolume;
			audioEl.muted = true;
			playerVolume = 0;
			volumeValue = 0;
		} else {
			audioEl.muted = false;
			playerVolume = preMuteVolume;
			volumeValue = preMuteVolume;
		}
		isMuted = !isMuted;
	}

	function handleSeekChange(value: number) {
		seekValue = value;
		playerProgress = value;
	}

	function handleSeekCommit(value: number) {
		if (audioEl) {
			audioEl.currentTime = value;
			playerProgress = value;
		}
		isSeeking = false;
	}

	function handleVolumeChange(value: number) {
		if (audioEl) {
			audioEl.muted = false;
			audioEl.volume = value;
			playerVolume = value;
			isMuted = value === 0;
		}
	}

	function handleDownload() {
		const a = document.createElement('a');
		a.href = audioSrc;
		a.download = fileName || 'audio_file';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	}

	$effect(() => {
		if (audioEl) audioEl.volume = playerVolume;
	});

	$effect(() => {
		const audio = audioEl;
		if (!audio) return;
		function timeUpdate() {
			playerProgress = audio!.currentTime;
			if (!isSeeking) seekValue = playerProgress;
		}
		function loaded() {
			duration = audio!.duration;
		}
		function play() {
			isPlaying = true;
		}
		function pause() {
			isPlaying = false;
		}
		function onError() {
			error = 'Error loading audio. Please try again.';
			isPlaying = false;
		}
		function onWaiting() {
			isBuffering = true;
		}
		function onCanplay() {
			isBuffering = false;
		}
		audio.addEventListener('timeupdate', timeUpdate);
		audio.addEventListener('loadedmetadata', loaded);
		audio.addEventListener('play', play);
		audio.addEventListener('pause', pause);
		audio.addEventListener('error', onError);
		audio.addEventListener('waiting', onWaiting);
		audio.addEventListener('canplay', onCanplay);
		return () => {
			audio.removeEventListener('timeupdate', timeUpdate);
			audio.removeEventListener('loadedmetadata', loaded);
			audio.removeEventListener('play', play);
			audio.removeEventListener('pause', pause);
			audio.removeEventListener('error', onError);
			audio.removeEventListener('waiting', onWaiting);
			audio.removeEventListener('canplay', onCanplay);
		};
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement ||
			(e.target as HTMLElement).isContentEditable
		)
			return;
		const a = audioEl;
		if (!a) return;
		switch (e.code) {
			case 'Space':
				e.preventDefault();
				togglePlay();
				break;
			case 'KeyM':
				e.preventDefault();
				toggleMute();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				a.currentTime = Math.max(0, a.currentTime - 10);
				playerProgress = a.currentTime;
				seekValue = a.currentTime;
				break;
			case 'ArrowRight':
				e.preventDefault();
				a.currentTime = Math.min(a.duration, a.currentTime + 10);
				playerProgress = a.currentTime;
				seekValue = a.currentTime;
				break;
			case 'ArrowUp':
				e.preventDefault();
				handleVolumeChange(Math.min(1, playerVolume + 0.1));
				break;
			case 'ArrowDown':
				e.preventDefault();
				handleVolumeChange(Math.max(0, playerVolume - 0.1));
				break;
			case 'Home':
				e.preventDefault();
				a.currentTime = 0;
				playerProgress = 0;
				seekValue = 0;
				break;
			case 'End':
				e.preventDefault();
				a.currentTime = a.duration;
				playerProgress = a.duration;
				seekValue = a.duration;
				break;
			case 'Digit0':
			case 'Numpad0':
			case 'Digit1':
			case 'Numpad1':
			case 'Digit2':
			case 'Numpad2':
			case 'Digit3':
			case 'Numpad3':
			case 'Digit4':
			case 'Numpad4':
			case 'Digit5':
			case 'Numpad5':
			case 'Digit6':
			case 'Numpad6':
			case 'Digit7':
			case 'Numpad7':
			case 'Digit8':
			case 'Numpad8':
			case 'Digit9':
			case 'Numpad9':
				e.preventDefault();
				const digit = parseInt(e.code.at(-1)!);
				const ratio = digit / 10;
				a.currentTime = a.duration * ratio;
				playerProgress = a.currentTime;
				seekValue = a.currentTime;
				break;
			case 'Comma':
				e.preventDefault();
				a.currentTime = Math.max(0, a.currentTime - 1);
				playerProgress = a.currentTime;
				seekValue = a.currentTime;
				break;
			case 'Period':
				e.preventDefault();
				a.currentTime = Math.min(a.duration, a.currentTime + 1);
				playerProgress = a.currentTime;
				seekValue = a.currentTime;
				break;
			case 'KeyJ':
				e.preventDefault();
				a.currentTime = Math.max(0, a.currentTime - 5);
				playerProgress = a.currentTime;
				seekValue = a.currentTime;
				break;
			case 'KeyL':
				e.preventDefault();
				a.currentTime = Math.min(a.duration, a.currentTime + 5);
				playerProgress = a.currentTime;
				seekValue = a.currentTime;
				break;
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<main class="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-32 pb-20 sm:px-6">
	<audio bind:this={audioEl} src={audioSrc} preload="metadata" class="hidden"></audio>

	<div
		class="w-full overflow-hidden rounded-xl border border-white/[0.06] bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_12px_40px_rgba(0,0,0,0.6)]"
	>
		<div class="aspect-square bg-neutral-950">
			{#if imageError || !fileMetadata.albumArt}
				<div
					class="relative flex h-full w-full items-center justify-center overflow-hidden bg-neutral-950"
				>
					<div
						class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]"
					></div>
					<svg
						class="relative z-10 h-16 w-16 animate-pulse text-neutral-700"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 2v20M17 5v14M22 9v6M7 8v8M2 10v4" />
					</svg>
				</div>
			{:else}
				<img
					src={fileMetadata.albumArt}
					alt={fileMetadata.common?.title
						? `Album art for ${fileMetadata.common.title}`
						: `Album art for ${fileName}`}
					class="h-full w-full object-cover"
					onerror={() => {
						imageError = true;
					}}
				/>
			{/if}
		</div>

		<div class="space-y-6 p-6">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h2 class="truncate text-base font-bold tracking-[-0.03em] text-foreground">
						{fileMetadata.common?.title || fileName}
					</h2>
					{#if fileMetadata.common?.artist}
						<p
							class="mt-1 truncate text-[10px] font-semibold tracking-wider text-neutral-500 uppercase"
						>
							{fileMetadata.common.artist}
						</p>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-1">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors duration-150 hover:bg-white/[0.03] hover:text-foreground"
						>
							<MoreHorizontal class="h-4 w-4" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content
							align="end"
							class="w-40 border border-white/[0.06] bg-card text-neutral-200"
						>
							<DropdownMenu.Item
								onclick={() => (showMetadata = true)}
								class="cursor-pointer px-3 py-2 text-xs font-semibold transition-all duration-100 hover:bg-white/[0.03] hover:text-white"
							>
								Show Metadata
							</DropdownMenu.Item>
							<DropdownMenu.Item
								onclick={handleDownload}
								class="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-semibold transition-all duration-100 hover:bg-white/[0.03] hover:text-white"
							>
								Download
								<Download class="h-3.5 w-3.5" />
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			</div>

			{#if error}
				<p class="text-xs font-semibold text-red-400" role="alert">{error}</p>
			{/if}

			<Slider
				type="single"
				bind:value={seekValue}
				max={duration || 0}
				step={0.1}
				onpointerdown={() => (isSeeking = true)}
				onValueCommit={handleSeekCommit as any}
				class="[&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:border-none [&_[data-slot=slider-thumb]]:bg-foreground [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/[0.03]"
			/>

			<div class="flex items-center justify-between">
				<span class="font-mono text-xs text-neutral-500 tabular-nums"
					>{formatTime(playerProgress)}</span
				>
				<span class="font-mono text-xs text-neutral-500 tabular-nums">{formatTime(duration)}</span>
			</div>

			<div class="flex items-center justify-between">
				<div class="w-9"></div>

				<Button
					class="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition-all duration-200 hover:scale-[1.04] active:scale-[0.96] disabled:scale-100 disabled:opacity-100"
					onclick={togglePlay}
					disabled={isBuffering}
					aria-label={isPlaying ? 'Pause' : 'Play'}
				>
					{#if isBuffering}
						<span class="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black"
						></span>
					{:else if isPlaying}
						<Pause class="h-5 w-5 fill-current" />
					{:else}
						<Play class="h-5 w-5 translate-x-0.5 fill-current" />
					{/if}
				</Button>

				<div class="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						class="h-9 w-9 rounded-md text-neutral-400 transition-colors duration-150 hover:bg-white/[0.03] hover:text-foreground"
						onclick={toggleMute}
						aria-label={isMuted ? 'Unmute' : 'Mute'}
					>
						{#if isMuted || volumeValue === 0}
							<VolumeX class="h-4 w-4" />
						{:else if volumeValue <= 0.5}
							<Volume1 class="h-4 w-4" />
						{:else}
							<Volume2 class="h-4 w-4" />
						{/if}
					</Button>
					<div class="w-28">
						<Slider
							type="single"
							bind:value={volumeValue}
							max={1}
							step={0.01}
							onValueChange={handleVolumeChange as any}
							class="[&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:border-none [&_[data-slot=slider-thumb]]:bg-foreground [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/[0.03]"
						/>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<MetadataDialog
	isOpen={showMetadata}
	onClose={() => (showMetadata = false)}
	{fileMetadata}
	{fileName}
/>
