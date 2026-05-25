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
		return {
			fileMetadata: metadata,
			fileId: id,
			fileName: metadata.originalName || 'Unknown File'
		};
	} catch {
		error(404, 'File not found');
	}
};
