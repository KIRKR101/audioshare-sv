<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Accordion from '$lib/components/ui/accordion';
</script>

<main class="mx-auto max-w-xl px-4 pt-32 pb-20 sm:px-6">
	<div class="mb-8 border-b border-white/[0.04] pb-6">
		<h1 class="text-3xl font-extrabold tracking-[-0.04em] text-foreground">FAQ</h1>
		<p class="mt-1.5 text-xs text-neutral-400">
			Frequently asked questions about the AudioShare streaming platform.
		</p>
	</div>

	<div
		class="overflow-hidden rounded-xl border border-white/[0.06] bg-card shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_30px_rgba(0,0,0,0.5)]"
	>
		<Accordion.Root type="single" class="w-full">
			<Accordion.Item value="item-1" class="border-b border-white/[0.04] last:border-b-0">
				<Accordion.Trigger
					class="px-5 py-4 text-sm font-semibold text-neutral-100 transition-colors duration-150 hover:bg-white/[0.015] hover:no-underline"
					>What is AudioShare?</Accordion.Trigger
				>
				<Accordion.Content class="px-5 pb-4 text-xs leading-relaxed font-medium text-neutral-400">
					AudioShare is a platform designed for sharing and managing audio files. You can upload,
					store, and share high-quality audio content with anyone via a simple link.
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="item-2" class="border-b border-white/[0.04] last:border-b-0">
				<Accordion.Trigger
					class="px-5 py-4 text-sm font-semibold text-neutral-100 transition-colors duration-150 hover:bg-white/[0.015] hover:no-underline"
					>How do I upload audio files?</Accordion.Trigger
				>
				<Accordion.Content class="px-5 pb-4 text-xs leading-relaxed font-medium text-neutral-400">
					Navigate to the
					<a
						href={resolve('/')}
						class="text-neutral-200 underline decoration-white/[0.2] underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/[0.5]"
						>upload page</a
					>, then either drag and drop your audio file onto the upload zone, or click to browse your
					device. The platform automatically extracts metadata and album art.
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="item-3" class="border-b border-white/[0.04] last:border-b-0">
				<Accordion.Trigger
					class="px-5 py-4 text-sm font-semibold text-neutral-100 transition-colors duration-150 hover:bg-white/[0.015] hover:no-underline"
					>Is there a limit to file size?</Accordion.Trigger
				>
				<Accordion.Content class="px-5 pb-4 text-xs leading-relaxed font-medium text-neutral-400">
					Yes, the current maximum file size is 300MB per audio file.
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="item-4" class="border-b border-white/[0.04] last:border-b-0">
				<Accordion.Trigger
					class="px-5 py-4 text-sm font-semibold text-neutral-100 transition-colors duration-150 hover:bg-white/[0.015] hover:no-underline"
					>Can I download uploaded files?</Accordion.Trigger
				>
				<Accordion.Content class="px-5 pb-4 text-xs leading-relaxed font-medium text-neutral-400">
					Yes. You can download any file from its
					<a
						href={resolve('/archive')}
						class="text-neutral-200 underline decoration-white/[0.2] underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/[0.5]"
						>archive</a
					>
					entry, or browse the raw
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href="/audio_files.txt"
						target="_blank"
						rel="noopener noreferrer"
						class="text-neutral-200 underline decoration-white/[0.2] underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/[0.5]"
						>audio_files.txt</a
					>
					index.
				</Accordion.Content>
			</Accordion.Item>
			<Accordion.Item value="item-5" class="border-b border-white/[0.04] last:border-b-0">
				<Accordion.Trigger
					class="px-5 py-4 text-sm font-semibold text-neutral-100 transition-colors duration-150 hover:bg-white/[0.015] hover:no-underline"
					>What audio formats are supported?</Accordion.Trigger
				>
				<Accordion.Content class="px-5 pb-4 text-xs leading-relaxed font-medium text-neutral-400">
					MPEG, MP3, WAV, FLAC, OGG, AAC, M4A, AIFF, and WebM.
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	</div>
</main>
