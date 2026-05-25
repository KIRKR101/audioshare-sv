import type { RequestHandler } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';

const audioDir = path.join(process.cwd(), 'data', 'audio');

function isSafeId(id: string): boolean {
	return /^[a-f0-9]+$/i.test(id);
}

export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;
	if (!id || !isSafeId(id)) {
		return new Response(JSON.stringify({ error: 'Invalid file ID' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	const metadataPath = path.join(audioDir, `${id}.metadata.json`);

	try {
		const content = fs.readFileSync(metadataPath, 'utf-8');
		return new Response(content, {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Metadata not found.' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
