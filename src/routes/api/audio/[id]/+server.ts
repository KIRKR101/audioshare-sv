import type { RequestHandler } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';

const audioDir = path.join(process.cwd(), 'data', 'audio');

function isSafeId(id: string): boolean {
	return /^[a-f0-9]+$/i.test(id);
}

export const GET: RequestHandler = async ({ params, request }) => {
	const id = params.id;
	if (!id || !isSafeId(id)) {
		return new Response(JSON.stringify({ error: 'Invalid file ID' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}
	const metadataPath = path.join(audioDir, `${id}.metadata.json`);

	let metadata: any;
	try {
		metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
	} catch {
		return new Response(JSON.stringify({ error: 'File metadata not found.' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const audioPath = path.join(audioDir, `${id}.${metadata.fileExtension}`);

	try {
		const stat = fs.statSync(audioPath);
		const fileSize = stat.size;
		const range = request.headers.get('range');

		if (range) {
			const parts = range.replace(/bytes=/, '').split('-');
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunkSize = end - start + 1;

			const fileStream = fs.createReadStream(audioPath, { start, end });

			return new Response(fileStream as any, {
				status: 206,
				headers: {
					'Content-Range': `bytes ${start}-${end}/${fileSize}`,
					'Accept-Ranges': 'bytes',
					'Content-Length': String(chunkSize),
					'Content-Type': metadata.mimetype || 'audio/mpeg'
				}
			});
		}

		const fileStream = fs.createReadStream(audioPath);
		return new Response(fileStream as any, {
			status: 200,
			headers: {
				'Content-Length': String(fileSize),
				'Content-Type': metadata.mimetype || 'audio/mpeg'
			}
		});
	} catch {
		return new Response(JSON.stringify({ error: 'File not found.' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
