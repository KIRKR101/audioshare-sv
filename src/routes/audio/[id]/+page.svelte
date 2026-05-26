<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import MetadataDialog from '$lib/components/MetadataDialog.svelte';
	import {
		Play,
		Pause,
		SkipBack,
		SkipForward,
		Volume1,
		Volume2,
		VolumeX,
		Download,
		MoreHorizontal,
		Search,
		X,
		Plus,
		Shuffle,
		GripVertical,
		Trash2
	} from '@lucide/svelte';
	import { SvelteSet } from 'svelte/reactivity';

	interface Track {
		fileId: string;
		title: string | null;
		artist: string | null;
		album: string | null;
		duration: number;
		albumArt: string | null;
		originalName: string;
	}

	interface FileMetadata {
		fileId: string;
		common: {
			title?: string;
			artist?: string;
			album?: string;
		};
		format: {
			duration?: number;
		};
		albumArt: string | null;
		originalName: string;
	}

	let {
		data
	}: {
		data: { fileMetadata: FileMetadata; fileId: string; fileName: string; tracklist: Track[] };
	} = $props();

	const QUEUE_SIZE = 20;

	let audioEl = $state<HTMLAudioElement | null>(null);
	let isPlaying = $state(false);
	let isBuffering = $state(false);
	let playerProgress = $state(0);
	let duration = $state(0);
	let playerVolume = $state(0.5);
	let isMuted = $state(false);
	let error = $state<string | null>(null);
	let seekValue = $state(0);
	let volumeValue = $state(0.5);
	let preMuteVolume = $state(0.5);
	let imageError = $state(false);
	let isSeeking = $state(false);

	let allTracks = $state<Track[]>(data.tracklist);
	let fullMetadata = $state<FileMetadata>(data.fileMetadata);
	let currentTrack = $state<Track>(
		data.tracklist.find((t) => t.fileId === data.fileId) || {
			fileId: data.fileId,
			title: data.fileMetadata.common?.title || null,
			artist: data.fileMetadata.common?.artist || null,
			album: data.fileMetadata.common?.album || null,
			duration: data.fileMetadata.format?.duration || 0,
			albumArt: data.fileMetadata.albumArt || null,
			originalName: data.fileName
		}
	);
	let audioSrc = $state(`/api/audio/${data.fileId}`);

	let queue = $state<Track[]>([]);
	let playHistory = $state<Track[]>([]);
	let showMetadata = $state(false);
	let showClearConfirm = $state(false);
	let autoFillQueue = $state(true);

	let searchQuery = $state('');
	let searchFocused = $state(false);
	let searchResults = $state<Track[]>([]);
	let selectedSearchIndex = $state(-1);
	let resultsContainerEl = $state<HTMLElement | null>(null);

	let prevDataFileId = $state(data.fileId);

	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	let playerCardEl = $state<HTMLElement | null>(null);
	let queueMaxHeight = $state(0);

	$effect(() => {
		if (!playerCardEl) return;
		const obs = new ResizeObserver(() => {
			if (playerCardEl) queueMaxHeight = playerCardEl.clientHeight;
		});
		obs.observe(playerCardEl);
		return () => obs.disconnect();
	});

	function normalizeName(name: string): string {
		return name
			.toLowerCase()
			.replace(/[\s\-_.]+/g, '')
			.replace(/\bfeat\.?\b|\bft\.?\b/gi, '')
			.replace(/&/g, 'and')
			.replace(/[()]/g, '')
			.trim();
	}

	function getFallbackTitle(filename: string): string {
		if (!filename) return 'N/A';
		const lastDot = filename.lastIndexOf('.');
		if (lastDot === -1 || lastDot === 0) return filename;
		return filename.substring(0, lastDot);
	}

	function formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60)
			.toString()
			.padStart(2, '0');
		return `${m}:${s}`;
	}

	function categorizeTracks(excludeIds: SvelteSet<string>): {
		sameArtist: Track[];
		sameAlbum: Track[];
		rest: Track[];
	} {
		const currentNormalizedArtist = currentTrack.artist ? normalizeName(currentTrack.artist) : '';
		const currentNormalizedAlbum = currentTrack.album ? normalizeName(currentTrack.album) : '';

		const sameArtist: Track[] = [];
		const sameAlbum: Track[] = [];
		const rest: Track[] = [];

		for (const t of allTracks) {
			if (excludeIds.has(t.fileId)) continue;
			const nArtist = t.artist ? normalizeName(t.artist) : '';
			const nAlbum = t.album ? normalizeName(t.album) : '';
			if (currentNormalizedArtist && nArtist === currentNormalizedArtist) {
				sameArtist.push(t);
			} else if (currentNormalizedAlbum && nAlbum === currentNormalizedAlbum) {
				sameAlbum.push(t);
			} else {
				rest.push(t);
			}
		}

		return { sameArtist, sameAlbum, rest };
	}

	function generateQueue(): Track[] {
		const excludeIds = new SvelteSet([currentTrack.fileId]);
		for (const q of queue) excludeIds.add(q.fileId);

		const { sameArtist, sameAlbum, rest } = categorizeTracks(excludeIds);

		shuffle(sameArtist);
		shuffle(sameAlbum);
		shuffle(rest);

		const result: Track[] = [];
		for (const t of sameArtist) {
			if (result.length >= QUEUE_SIZE) break;
			result.push(t);
		}
		for (const t of sameAlbum) {
			if (result.length >= QUEUE_SIZE) break;
			if (!result.find((q) => q.fileId === t.fileId)) {
				result.push(t);
			}
		}
		for (const t of rest) {
			if (result.length >= QUEUE_SIZE) break;
			if (!result.find((q) => q.fileId === t.fileId)) {
				result.push(t);
			}
		}

		return result;
	}

	function shuffle(arr: Track[]) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	}

	function refillQueue() {
		const existingIds = new SvelteSet(queue.map((t) => t.fileId));
		existingIds.add(currentTrack.fileId);
		for (const h of playHistory) existingIds.add(h.fileId);

		const { sameArtist, sameAlbum, rest } = categorizeTracks(existingIds);

		shuffle(sameArtist);
		shuffle(sameAlbum);
		shuffle(rest);

		const toAdd = QUEUE_SIZE - queue.length;
		let added = 0;
		for (const t of [...sameArtist, ...sameAlbum, ...rest]) {
			if (added >= toAdd) break;
			if (!queue.find((q) => q.fileId === t.fileId)) {
				queue.push(t);
				added++;
			}
		}
	}

	function addToQueue(track: Track) {
		if (queue.find((q) => q.fileId === track.fileId)) return;
		if (track.fileId === currentTrack.fileId) return;
		autoFillQueue = true;
		queue.push(track);
		searchResults = searchResults.filter((r) => r.fileId !== track.fileId);
	}

	function removeFromQueue(index: number) {
		queue.splice(index, 1);
		refillQueue();
	}

	function reorderQueue(from: number, to: number) {
		if (from === to) return;
		const [item] = queue.splice(from, 1);
		const adjustedTo = from < to ? to - 1 : to;
		queue.splice(adjustedTo, 0, item);
	}

	function updateSearch() {
		selectedSearchIndex = -1;
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		const q = searchQuery.toLowerCase();
		const queueIds = new SvelteSet(queue.map((t) => t.fileId));
		queueIds.add(currentTrack.fileId);
		searchResults = allTracks.filter(
			(t) =>
				!queueIds.has(t.fileId) &&
				((t.title || '').toLowerCase().includes(q) ||
					(t.artist || '').toLowerCase().includes(q) ||
					(t.album || '').toLowerCase().includes(q) ||
					t.originalName.toLowerCase().includes(q))
		);
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (!searchResults.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedSearchIndex = Math.min(selectedSearchIndex + 1, searchResults.length - 1);
			scrollToSelected();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedSearchIndex = Math.max(selectedSearchIndex - 1, 0);
			scrollToSelected();
		} else if (e.key === 'Enter' && selectedSearchIndex >= 0) {
			e.preventDefault();
			addToQueue(searchResults[selectedSearchIndex]);
			selectedSearchIndex = -1;
		}
	}

	function scrollToSelected() {
		requestAnimationFrame(() => {
			const el = resultsContainerEl?.querySelector('[data-selected]');
			el?.scrollIntoView({ block: 'nearest' });
		});
	}

	function playNext() {
		if (queue.length === 0) {
			queue = generateQueue();
			if (queue.length === 0) return;
		}
		const next = queue.shift();
		if (!next) return;
		playHistory.push(currentTrack);
		currentTrack = next;
		audioSrc = `/api/audio/${next.fileId}`;
		imageError = false;
		error = null;
		playerProgress = 0;
		seekValue = 0;
		duration = 0;
		refillQueue();
		playHistory = playHistory.slice(-50);
		isPlaying = false;
		setTimeout(() => {
			if (audioEl) {
				audioEl.play().catch(() => {});
			}
		}, 50);
	}

	function playPrevious() {
		if (playHistory.length === 0) {
			if (audioEl) {
				audioEl.currentTime = 0;
				playerProgress = 0;
				seekValue = 0;
			}
			return;
		}
		queue.unshift(currentTrack);
		const prev = playHistory.pop()!;
		currentTrack = prev;
		audioSrc = `/api/audio/${prev.fileId}`;
		imageError = false;
		error = null;
		playerProgress = 0;
		seekValue = 0;
		duration = 0;
		isPlaying = false;
		setTimeout(() => {
			if (audioEl) {
				audioEl.play().catch(() => {});
			}
		}, 50);
	}

	$effect(() => {
		allTracks = data.tracklist;
		if (data.fileId !== prevDataFileId) {
			prevDataFileId = data.fileId;
			const found = data.tracklist.find((t) => t.fileId === data.fileId);
			if (found) {
				autoFillQueue = true;
				currentTrack = found;
				fullMetadata = data.fileMetadata;
				audioSrc = `/api/audio/${data.fileId}`;
				imageError = false;
				error = null;
				isPlaying = false;
				playerProgress = 0;
				seekValue = 0;
				duration = 0;
				queue = generateQueue();
				playHistory = [];
			}
		} else if (queue.length === 0 && autoFillQueue && allTracks.length > 0) {
			queue = generateQueue();
		}
	});

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
		function onEnded() {
			playNext();
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
		audio.addEventListener('ended', onEnded);
		audio.addEventListener('error', onError);
		audio.addEventListener('waiting', onWaiting);
		audio.addEventListener('canplay', onCanplay);
		return () => {
			audio.removeEventListener('timeupdate', timeUpdate);
			audio.removeEventListener('loadedmetadata', loaded);
			audio.removeEventListener('play', play);
			audio.removeEventListener('pause', pause);
			audio.removeEventListener('ended', onEnded);
			audio.removeEventListener('error', onError);
			audio.removeEventListener('waiting', onWaiting);
			audio.removeEventListener('canplay', onCanplay);
		};
	});

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

	async function handleDownload() {
		try {
			const response = await fetch(audioSrc);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = currentTrack.originalName || 'audio_file';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch {
			error = 'Download failed. Please try again.';
		}
	}

	function handleDragStart(e: DragEvent, index: number) {
		dragIndex = index;
		e.dataTransfer!.effectAllowed = 'move';
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';
		dragOverIndex = index;
	}

	function handleDrop(e: DragEvent, toIndex: number) {
		e.preventDefault();
		if (dragIndex !== null && dragIndex !== toIndex) {
			reorderQueue(dragIndex, toIndex);
		}
		dragIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		dragIndex = null;
		dragOverIndex = null;
	}

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
				{
					const digit = parseInt(e.code.at(-1)!);
					const ratio = digit / 10;
					a.currentTime = a.duration * ratio;
					playerProgress = a.currentTime;
					seekValue = a.currentTime;
				}
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

<main class="mx-auto w-full max-w-7xl px-4 pt-28 pb-20 sm:px-6">
	<audio bind:this={audioEl} src={audioSrc} preload="metadata" class="hidden"></audio>

	<div class="grid gap-8 lg:grid-cols-2 lg:items-start">
		<div class="w-full">
			<div
				class="flex flex-col overflow-hidden rounded-lg border border-neutral-800 bg-card"
				bind:this={playerCardEl}
			>
				<div class="w-full">
					<div class="aspect-square bg-neutral-950">
						{#if imageError || !currentTrack.albumArt}
							<div class="flex h-full w-full items-center justify-center bg-neutral-950">
								<div
									class="relative inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)]"
								></div>
								<svg
									class="relative z-10 h-16 w-16 text-neutral-700"
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
								src={currentTrack.albumArt}
								alt={`Album art for ${currentTrack.title || getFallbackTitle(currentTrack.originalName)}`}
								class="h-full w-full object-cover"
								style="aspect-ratio: 1 / 1;"
								onerror={() => {
									imageError = true;
								}}
							/>
						{/if}
					</div>

					<div class="space-y-4 p-5">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h2 class="truncate text-lg font-bold tracking-[-0.03em] text-foreground">
									{currentTrack.title || getFallbackTitle(currentTrack.originalName)}
								</h2>
								{#if currentTrack.artist}
									<p
										class="mt-1 truncate text-[12px] font-semibold tracking-wider text-neutral-500 uppercase"
									>
										{currentTrack.artist}
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
							onValueCommit={handleSeekCommit}
							class="[&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:border-none [&_[data-slot=slider-thumb]]:bg-foreground [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/[0.1]"
						/>

						<div class="flex items-center justify-between">
							<span class="font-mono text-xs text-neutral-500 tabular-nums"
								>{formatTime(playerProgress)}</span
							>
							<span class="font-mono text-xs text-neutral-500 tabular-nums"
								>{formatTime(duration)}</span
							>
						</div>

						<div class="flex items-center justify-between">
							<Button
								class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white shadow transition-all duration-200 hover:bg-white/20"
								onclick={playPrevious}
								aria-label="Previous"
							>
								<SkipBack class="h-5 w-5 fill-current" />
							</Button>

							<Button
								class="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-lg transition-all duration-200 disabled:opacity-100"
								onclick={togglePlay}
								disabled={isBuffering}
								aria-label={isPlaying ? 'Pause' : 'Play'}
							>
								{#if isBuffering}
									<span
										class="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black"
									></span>
								{:else if isPlaying}
									<Pause class="h-5 w-5 fill-current" />
								{:else}
									<Play class="h-5 w-5 fill-current" />
								{/if}
							</Button>

							<Button
								class="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white shadow transition-all duration-200 hover:bg-white/20"
								onclick={playNext}
								aria-label="Next"
							>
								<SkipForward class="h-5 w-5 fill-current" />
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
										onValueChange={handleVolumeChange}
										class="[&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:border-none [&_[data-slot=slider-thumb]]:bg-foreground [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/[0.1]"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="w-full">
			<div
				class="flex flex-col rounded-lg border border-neutral-800 bg-card"
				style={queueMaxHeight > 0 ? `height: ${queueMaxHeight}px` : ''}
			>
				<div
					class="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 text-xs font-semibold text-neutral-400 uppercase"
				>
					<span>Queue ({queue.length})</span>
					<div class="flex items-center gap-1">
						<button
							class="cursor-pointer rounded p-1.5 text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white"
							onclick={() => {
								autoFillQueue = true;
								queue = [];
								queue = generateQueue();
							}}
							aria-label="Shuffle queue"
							title="Shuffle queue"
						>
							<Shuffle class="h-4 w-4" />
						</button>
						{#if queue.length > 0}
							<button
								class="cursor-pointer rounded p-1.5 text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white"
								onclick={() => (showClearConfirm = true)}
								aria-label="Clear queue"
								title="Clear queue"
							>
								<X class="h-4 w-4" />
							</button>
						{/if}
					</div>
				</div>

				<div class="border-b border-white/[0.06] px-3 py-2">
					<div class="relative">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<Search class="h-3.5 w-3.5 text-neutral-500" />
						</div>
						<Input
							type="search"
							placeholder="Search tracks to add..."
							value={searchQuery}
							oninput={(e) => {
								searchQuery = (e.target as HTMLInputElement).value;
								updateSearch();
							}}
							onfocus={() => (searchFocused = true)}
							onblur={() => {
								setTimeout(() => (searchFocused = false), 200);
							}}
							onkeydown={handleSearchKeydown}
							class="h-8 w-full rounded-md border-white/[0.06] bg-white/[0.015] pr-8 pl-9 text-xs text-foreground placeholder:text-neutral-500 focus:border-white/[0.2] focus:bg-white/[0.03]"
						/>
						{#if searchQuery}
							<button
								class="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded pr-2 text-neutral-400 hover:text-white"
								onclick={() => {
									searchQuery = '';
									searchResults = [];
								}}
							>
								<X class="h-3.5 w-3.5" />
							</button>
						{/if}

						{#if searchQuery && searchFocused}
							<div
								class="queue-scrollbar absolute left-0 z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-white/[0.06] bg-neutral-900 shadow-xl"
								bind:this={resultsContainerEl}
							>
								{#if searchResults.length > 0}
									{#each searchResults as result, i (result.fileId)}
										<div
											class="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] {i ===
											selectedSearchIndex
												? 'bg-white/[0.06]'
												: ''}"
											onclick={() => addToQueue(result)}
											onmouseover={() => (selectedSearchIndex = i)}
											data-selected={i === selectedSearchIndex ? '' : undefined}
										>
											<div class="min-w-0 flex-1">
												<p class="truncate font-medium text-foreground">
													{result.title || getFallbackTitle(result.originalName)}
												</p>
												{#if result.artist}
													<p class="truncate text-neutral-500">{result.artist}</p>
												{/if}
											</div>
											<Plus class="h-3.5 w-3.5 shrink-0 text-neutral-400" />
										</div>
									{/each}
								{:else}
									<div class="px-3 py-4 text-center text-neutral-500">No results found</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<div class="queue-scrollbar flex-1 overflow-y-auto">
					{#if queue.length > 0}
						<div class="py-1">
							{#each queue as track, index (track.fileId)}
								<div
									draggable="true"
									class="group flex cursor-pointer items-center gap-2 px-4 py-2.5 transition-colors duration-150 {dragIndex ===
									index
										? 'opacity-50'
										: dragOverIndex === index
											? 'border-t-2 border-white/40'
											: 'border-t-2 border-transparent hover:bg-white/[0.015]'}"
									ondragstart={(e) => handleDragStart(e, index)}
									ondragover={(e) => handleDragOver(e, index)}
									ondrop={(e) => handleDrop(e, index)}
									ondragend={handleDragEnd}
								>
									<div
										class="flex h-5 w-5 cursor-grab items-center justify-center text-neutral-600 transition-colors group-hover:text-neutral-400"
									>
										<GripVertical class="h-3.5 w-3.5" />
									</div>
									<span class="w-5 pr-2 text-right font-mono text-[10px] text-neutral-500">
										{index + 1}
									</span>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-foreground">
											{track.title || getFallbackTitle(track.originalName)}
										</p>
										{#if track.artist}
											<p class="truncate text-xs text-neutral-400">{track.artist}</p>
										{/if}
									</div>
									<span class="shrink-0 font-mono text-xs text-neutral-500 tabular-nums">
										{formatTime(track.duration)}
									</span>
									<button
										class="ml-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
										onclick={(e) => {
											e.stopPropagation();
											removeFromQueue(index);
										}}
										aria-label="Remove from queue"
									>
										<Trash2 class="h-3.5 w-3.5" />
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<div
							class="flex h-full items-center justify-center px-4 py-20 text-center text-xs text-neutral-500"
						>
							<p>Queue is empty. Search to add tracks or refresh.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</main>

<MetadataDialog
	isOpen={showMetadata}
	onClose={() => (showMetadata = false)}
	fileMetadata={fullMetadata}
	fileName={currentTrack.originalName}
/>

{#if showClearConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
		<button
			type="button"
			class="fixed inset-0 cursor-pointer bg-black/80 backdrop-blur-sm"
			onclick={() => (showClearConfirm = false)}
			aria-label="Close dialog"
		></button>
		<div
			class="relative z-50 mx-4 w-full max-w-sm overflow-hidden rounded-xl border border-white/[0.06] bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_12px_40px_rgba(0,0,0,0.6)]"
		>
			<div class="p-5">
				<h3 class="text-sm font-semibold tracking-[-0.02em] text-foreground">Clear Queue</h3>
				<p class="mt-1.5 text-xs text-neutral-400">
					Remove all {queue.length} track{queue.length !== 1 ? 's' : ''} from the queue?
				</p>
			</div>
			<div class="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
				<Button
					variant="outline"
					size="sm"
					class="h-8 rounded-lg border-white/[0.06] bg-transparent text-xs font-semibold transition-all duration-150 hover:bg-white/[0.03] hover:text-foreground"
					onclick={() => (showClearConfirm = false)}
				>
					Cancel
				</Button>
				<Button
					size="sm"
					class="h-8 rounded-lg bg-red-500/90 text-xs font-semibold text-white transition-all duration-150 hover:bg-red-500"
					onclick={() => {
						queue = [];
						showClearConfirm = false;
					}}
				>
					Clear
				</Button>
			</div>
		</div>
	</div>
{/if}
