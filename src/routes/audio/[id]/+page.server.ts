import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';

const audioDir = path.join(process.cwd(), 'data', 'audio');

function isSafeId(id: string): boolean {
	return /^[a-f0-9]+$/i.test(id);
}

export const load: PageServerLoad = async ({ params }) => {
	const id = params.id;
	if (!id || !isSafeId(id)) {
		error(400, 'Invalid file ID');
	}
	const metadataPath = path.join(audioDir, `${id}.metadata.json`);

	try {
		const content = fs.readFileSync(metadataPath, 'utf-8');
		const metadata = JSON.parse(content);

		const files = fs.readdirSync(audioDir);
		const metadataFiles = files.filter((f) => f.endsWith('.metadata.json'));
		const tracklist = metadataFiles
			.map((f) => {
				try {
					const raw = JSON.parse(fs.readFileSync(path.join(audioDir, f), 'utf-8'));
					return {
						fileId: raw.fileId || f.replace('.metadata.json', ''),
						title: raw.common?.title || null,
						artist: raw.common?.artist || null,
						album: raw.common?.album || null,
						duration: raw.format?.duration || 0,
						albumArt: raw.albumArt || null,
						originalName: raw.originalName || ''
					};
				} catch {
					return null;
				}
			})
			.filter((t): t is NonNullable<typeof t> => t != null);

		return {
			fileMetadata: metadata,
			fileId: id,
			fileName: metadata.originalName || 'Unknown File',
			tracklist
		};
	} catch {
		error(404, 'File not found');
	}
};
