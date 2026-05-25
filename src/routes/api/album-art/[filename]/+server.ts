import type { RequestHandler } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';

const albumArtDir = path.join(process.cwd(), 'data', 'album-art');

export const GET: RequestHandler = async ({ params }) => {
	const filename = params.filename;
	if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
		return new Response(JSON.stringify({ error: 'Invalid filename' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	const filePath = path.join(albumArtDir, filename);

	try {
		const buffer = fs.readFileSync(filePath);
		const ext = path.extname(filename).toLowerCase();
		const mimeTypes: Record<string, string> = {
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.webp': 'image/webp'
		};
		const contentType = mimeTypes[ext] || 'application/octet-stream';

		return new Response(buffer, {
			status: 200,
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000'
			}
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Album art not found.' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
