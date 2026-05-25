import type { RequestHandler } from '@sveltejs/kit';
import { parseBuffer } from 'music-metadata';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from '$lib/server/db';
import { songs } from '$lib/server/db/schema';

const ALLOWED_MIME_TYPES = [
	'audio/mpeg',
	'audio/mp3',
	'audio/wav',
	'audio/wave',
	'audio/x-wav',
	'audio/flac',
	'audio/ogg',
	'audio/aac',
	'audio/m4a',
	'audio/mp4',
	'audio/x-m4a',
	'audio/webm',
	'audio/aiff'
];

const MAX_FILE_SIZE = 300 * 1024 * 1024;

const audioDir = path.join(process.cwd(), 'data', 'audio');
const albumArtDir = path.join(process.cwd(), 'data', 'album-art');
const audioListPath = path.join(process.cwd(), 'data', 'audio_files.txt');

function removeImageDataFromNative(nativeMetadata: any, codec: string) {
	if (!nativeMetadata) return nativeMetadata;
	const cleaned: Record<string, any[]> = {};
	const tagsToRemove: Record<string, string[]> = {
		id3v2: ['APIC'],
		vorbis: ['METADATA_BLOCK_PICTURE'],
		iTunes: ['covr']
	};

	for (const format in nativeMetadata) {
		const removeIds = tagsToRemove[format] || [];
		cleaned[format] = nativeMetadata[format].filter((tag: any) => {
			if (format === 'id3v2' && removeIds.includes(tag.id)) return false;
			if (format === 'vorbis' && removeIds.includes(tag.name)) return false;
			if (format === 'iTunes' && removeIds.includes(tag.id)) return false;
			if (tag.id) {
				const tagIdLower = tag.id.toLowerCase();
				if (
					tagIdLower.includes('picture') ||
					tagIdLower.includes('coverart') ||
					tagIdLower.includes('cover')
				)
					return false;
			}
			if (Array.isArray(tag.value) && tag.value.every((item: any) => typeof item === 'number'))
				return false;
			if (typeof tag.value === 'string' && tag.value.length > 1000) return false;
			return true;
		});
	}
	return cleaned;
}

async function processAlbumArtFromBuffer(buffer: Buffer, format: string): Promise<string | null> {
	try {
		let extension = '.jpg';
		if (format) {
			switch (format) {
				case 'image/jpeg':
					extension = '.jpg';
					break;
				case 'image/png':
					extension = '.png';
					break;
				case 'image/gif':
					extension = '.gif';
					break;
				case 'image/webp':
					extension = '.webp';
					break;
			}
		}
		await fsp.mkdir(albumArtDir, { recursive: true });
		const fileId = crypto.randomBytes(16).toString('hex');
		const fileName = `${fileId}${extension}`;
		const filePath = path.join(albumArtDir, fileName);
		await fsp.writeFile(filePath, buffer);
		return `/api/album-art/${fileName}`;
	} catch {
		return null;
	}
}

async function storeMetadata(fileId: string, metadata: any) {
	await fsp.mkdir(audioDir, { recursive: true });
	const metadataPath = path.join(audioDir, `${fileId}.metadata.json`);
	await fsp.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

async function appendToAudioList(metadata: any) {
	const entry = `${metadata.common?.artist || 'Unknown Artist'} - ${metadata.common?.title || metadata.originalName} - ${metadata.originalName || 'Unknown Filename'} | /audio/${metadata.fileId}\n`;
	await fsp.appendFile(audioListPath, entry, 'utf-8');
}

export const POST: RequestHandler = async ({ request }) => {
	let audioFilePath: string | null = null;

	try {
		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('multipart/form-data')) {
			return new Response(JSON.stringify({ error: 'Content-Type must be multipart/form-data' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
		if (contentLength > MAX_FILE_SIZE) {
			return new Response(JSON.stringify({ error: 'File too large' }), {
				status: 413,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const formData = await request.formData();
		const uploadedFile = formData.get('file') as File | null;

		if (
			!uploadedFile ||
			!(
				uploadedFile instanceof (globalThis as any).File ||
				uploadedFile?.constructor?.name === 'File'
			)
		) {
			return new Response(JSON.stringify({ error: 'No file uploaded.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const fileMimeType = uploadedFile.type || 'application/octet-stream';
		if (!ALLOWED_MIME_TYPES.includes(fileMimeType)) {
			return new Response(JSON.stringify({ error: `Unsupported file type: ${fileMimeType}` }), {
				status: 415,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		console.log(`[INFO] File received: ${uploadedFile.name} (${uploadedFile.size} bytes)`);

		const fileId = crypto.randomBytes(16).toString('hex');
		const fileExt = path.extname(uploadedFile.name).toLowerCase();
		const originalName = uploadedFile.name;
		const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());

		await fsp.mkdir(audioDir, { recursive: true });
		const destFilename = `${fileId}${fileExt}`;
		const destPath = path.join(audioDir, destFilename);
		await fsp.writeFile(destPath, fileBuffer);
		audioFilePath = destPath;

		const metadata = await parseBuffer(new Uint8Array(fileBuffer), {
			mimeType: fileMimeType,
			duration: true
		} as any);

		let albumArt: string | null = null;
		if (metadata?.common?.picture && metadata.common.picture.length > 0) {
			albumArt = await processAlbumArtFromBuffer(
				Buffer.from(metadata.common.picture[0].data),
				metadata.common.picture[0].format
			);
		}

		const commonWithoutPicture = { ...metadata.common };
		delete commonWithoutPicture.picture;
		const nativeWithoutImage = removeImageDataFromNative(
			metadata.native,
			metadata.format?.codec ?? ''
		);

		const fileMetadata = {
			fileId,
			originalName: originalName,
			fileExtension: fileExt.slice(1),
			mimetype: fileMimeType,
			size: uploadedFile.size,
			albumArt,
			publicPath: destFilename,
			format: metadata.format,
			common: commonWithoutPicture,
			native: nativeWithoutImage,
			uploadDate: new Date().toISOString()
		};

		const fileUrl = destFilename.replace(fileExt, '');

		await db.insert(songs).values({
			filename: originalName,
			filepath: destFilename,
			size: uploadedFile.size ?? null,
			artist: metadata.common?.artist ?? null,
			title: metadata.common?.title ?? null,
			album: metadata.common?.album ?? null,
			year: metadata.common?.year ?? null,
			trackNumber: metadata.common?.track?.no ?? null,
			genre: metadata.common?.genre?.join(', ') ?? null,
			duration: metadata.format?.duration ?? null,
			bitrate: metadata.format?.bitrate ?? null,
			sampleRate: metadata.format?.sampleRate ?? null,
			format: metadata.format?.codec ?? null,
			albumArtist: metadata.common?.albumartist ?? null,
			composer: metadata.common?.composer?.join(', ') ?? null,
			diskNumber: metadata.common?.disk?.no ?? null,
			extension: fileExt.slice(1),
			link: fileUrl
		});

		await storeMetadata(fileId, fileMetadata);
		await appendToAudioList(fileMetadata);

		console.log(`[INFO] File processed: ${fileId}`);

		return new Response(JSON.stringify(fileMetadata), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err: any) {
		console.error('[ERROR] Upload failed:', err.message || err);

		if (audioFilePath && fs.existsSync(audioFilePath)) {
			try {
				await fsp.unlink(audioFilePath);
			} catch {}
		}

		const status = err.message?.includes('Unsupported file type')
			? 415
			: err.message === 'File too large'
				? 413
				: 500;

		const message = status === 500 ? 'Internal server error' : err.message || 'Upload failed';

		return new Response(JSON.stringify({ error: message }), {
			status,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
