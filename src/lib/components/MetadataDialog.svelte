<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { X, Download } from '@lucide/svelte';

	interface NativeTag {
		id?: string;
		name?: string;
		value?: unknown;
	}

	interface FileMetadata {
		originalName?: string;
		common?: {
			title?: string;
			artist?: string;
			album?: string;
			year?: number;
			genre?: string[];
			track?: { no?: number };
			disk?: { no?: number };
			composer?: string[];
		};
		format?: {
			container?: string;
			codec?: string;
			lossless?: boolean;
			bitrate?: number;
			sampleRate?: number;
			channels?: number;
			duration?: number;
		};
		native?: Record<string, NativeTag[]>;
	}

	let {
		isOpen,
		onClose,
		fileMetadata,
		fileName
	}: {
		isOpen: boolean;
		onClose: () => void;
		fileMetadata: FileMetadata;
		fileName: string;
	} = $props();

	function getValue(value: unknown, unknownText = 'Unknown'): string {
		if (value == null || value === '') return unknownText;
		if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : unknownText;
		return String(value);
	}

	function downloadMetadata() {
		const json = JSON.stringify(fileMetadata, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${fileName.replace(/\.[^/.]+$/, '') || 'audio_metadata'}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function formatTime(seconds: number): string {
		if (isNaN(seconds)) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60)
			.toString()
			.padStart(2, '0');
		return `${m}:${s}`;
	}

	$effect(() => {
		if (!isOpen) return;
		function esc(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose();
		}
		document.addEventListener('keydown', esc);
		return () => document.removeEventListener('keydown', esc);
	});
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
		<button
			type="button"
			class="fixed inset-0 cursor-pointer bg-black/80 backdrop-blur-sm"
			onclick={onClose}
			aria-label="Close dialog"
		></button>
		<div
			class="relative z-50 mx-4 flex max-h-[85vh] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_12px_40px_rgba(0,0,0,0.6)]"
		>
			<div class="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
				<h2 class="text-sm font-semibold tracking-[-0.02em]">Metadata</h2>
				<Button
					variant="ghost"
					size="icon"
					onclick={onClose}
					class="h-7 w-7 rounded-md text-neutral-400 transition-colors duration-150 hover:bg-white/[0.03] hover:text-foreground"
				>
					<X class="h-3.5 w-3.5" />
				</Button>
			</div>

			<ScrollArea class="min-h-0 flex-1 overflow-y-auto">
				<div class="p-5">
					<table class="w-full font-mono text-xs">
						<tbody>
							<tr class="border-b border-white/[0.06]">
								<td class="py-2.5 pr-4 text-xs font-semibold text-neutral-400" colspan="2">
									Basic
								</td>
							</tr>
							{#if fileMetadata.originalName}
								<tr class="border-b border-white/[0.03]">
									<td class="w-28 py-1.5 pr-4 text-neutral-500">Filename</td>
									<td class="truncate py-1.5 text-neutral-200">{fileMetadata.originalName}</td>
								</tr>
							{/if}
							{#if fileMetadata.common?.title}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Title</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.common.title}</td>
								</tr>
							{/if}
							{#if fileMetadata.common?.artist}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Artist</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.common.artist}</td>
								</tr>
							{/if}
							{#if fileMetadata.common?.album}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Album</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.common.album}</td>
								</tr>
							{/if}
							{#if fileMetadata.common?.year}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Year</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.common.year}</td>
								</tr>
							{/if}
							{#if fileMetadata.common?.genre}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Genre</td>
									<td class="py-1.5 text-neutral-200">{getValue(fileMetadata.common.genre)}</td>
								</tr>
							{/if}
							{#if fileMetadata.common?.track?.no}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Track</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.common.track.no}</td>
								</tr>
							{/if}
							{#if fileMetadata.common?.disk?.no}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Disc</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.common.disk.no}</td>
								</tr>
							{/if}
							{#if fileMetadata.common?.composer}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Composer</td>
									<td class="py-1.5 text-neutral-200">{getValue(fileMetadata.common.composer)}</td>
								</tr>
							{/if}

							<tr class="border-b border-white/[0.06]">
								<td class="py-2.5 pr-4 text-xs font-semibold text-neutral-400" colspan="2">
									Format
								</td>
							</tr>
							{#if fileMetadata.format?.container}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Container</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.format.container}</td>
								</tr>
							{/if}
							{#if fileMetadata.format?.codec}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Codec</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.format.codec}</td>
								</tr>
							{/if}
							<tr class="border-b border-white/[0.03]">
								<td class="py-1.5 pr-4 text-neutral-500">Lossless</td>
								<td class="py-1.5 text-neutral-200"
									>{fileMetadata.format?.lossless ? 'Yes' : 'No'}</td
								>
							</tr>
							{#if fileMetadata.format?.bitrate}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Bitrate</td>
									<td class="py-1.5 text-neutral-200"
										>{Math.round(fileMetadata.format.bitrate / 1000)} kbps</td
									>
								</tr>
							{/if}
							{#if fileMetadata.format?.sampleRate}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Sample Rate</td>
									<td class="py-1.5 text-neutral-200"
										>{Math.round(fileMetadata.format.sampleRate / 1000)} kHz</td
									>
								</tr>
							{/if}
							{#if fileMetadata.format?.channels}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Channels</td>
									<td class="py-1.5 text-neutral-200">{fileMetadata.format.channels}</td>
								</tr>
							{/if}
							{#if fileMetadata.format?.duration}
								<tr class="border-b border-white/[0.03]">
									<td class="py-1.5 pr-4 text-neutral-500">Duration</td>
									<td class="py-1.5 text-neutral-200">{formatTime(fileMetadata.format.duration)}</td
									>
								</tr>
							{/if}

							{#if fileMetadata.native}
								<tr class="border-b border-white/[0.06]">
									<td class="py-2.5 pr-4 text-xs font-semibold text-neutral-400" colspan="2">
										Native Tags
									</td>
								</tr>
								{#each Object.keys(fileMetadata.native) as formatKey (formatKey)}
									{#each fileMetadata.native[formatKey] ?? [] as tag, i (`${formatKey}-${tag.id ?? tag.name ?? i}`)}
										<tr class="border-b border-white/[0.03]">
											<td class="py-1.5 pr-4 text-neutral-500"
												>{tag.id || tag.name || `Tag ${i + 1}`}</td
											>
											<td class="py-1.5 text-neutral-200">{getValue(tag.value)}</td>
										</tr>
									{/each}
								{/each}
							{/if}
						</tbody>
					</table>
				</div>
			</ScrollArea>

			<div class="flex justify-end border-t border-white/[0.06] px-5 py-3">
				<Button
					variant="outline"
					size="sm"
					class="h-8 rounded-lg border-white/[0.06] bg-transparent text-xs font-semibold transition-all duration-150 hover:bg-white/[0.03] hover:text-foreground"
					onclick={downloadMetadata}
				>
					<Download class="mr-1.5 h-3 w-3" />
					Download JSON
				</Button>
			</div>
		</div>
	</div>
{/if}
