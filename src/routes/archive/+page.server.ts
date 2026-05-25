import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { songs } from '$lib/server/db/schema';
import { like, count, asc, desc, sql } from 'drizzle-orm';

const ITEMS_PER_PAGE = 20;

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const search = url.searchParams.get('search') || '';
	const sortBy = url.searchParams.get('sortBy') || 'uploadDate';
	const sortOrder = url.searchParams.get('sortOrder') || 'desc';

	const offset = (page - 1) * ITEMS_PER_PAGE;

	const allowedSortColumns: Record<string, any> = {
		filename: songs.filename,
		title: songs.title,
		artist: songs.artist,
		album: songs.album,
		size: songs.size,
		uploadDate: songs.uploadDate
	};

	const sortCol = allowedSortColumns[sortBy] || songs.uploadDate;

	try {
		const whereClause = search
			? sql`(${like(songs.filename, `%${search}%`)} OR ${like(songs.title, `%${search}%`)} OR ${like(songs.artist, `%${search}%`)} OR ${like(songs.album, `%${search}%`)})`
			: undefined;

		const [{ count: totalItems }] = await db
			.select({ count: count() })
			.from(songs)
			.where(whereClause);

		const rows = await db
			.select({
				id: songs.id,
				filename: songs.filename,
				filepath: songs.filepath,
				size: songs.size,
				title: songs.title,
				artist: songs.artist,
				album: songs.album,
				uploadDate: songs.uploadDate,
				link: songs.link
			})
			.from(songs)
			.where(whereClause)
			.orderBy(sortOrder === 'asc' ? asc(sortCol) : desc(sortCol))
			.limit(ITEMS_PER_PAGE)
			.offset(offset);

		const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

		return {
			files: rows.map((row) => ({
				id: row.id,
				originalName: row.filename,
				filepath: row.filepath,
				size: row.size,
				title: row.title,
				artist: row.artist,
				album: row.album,
				uploadDate: row.uploadDate,
				link: row.link
			})),
			totalItems,
			currentPage: Math.min(page, totalPages) || 1,
			totalPages,
			search,
			sortBy,
			sortOrder
		};
	} catch (err: any) {
		console.error('Error loading archive:', err);
		return {
			files: [],
			totalItems: 0,
			currentPage: 1,
			totalPages: 0,
			error: `Failed to load files: ${err.message || 'Unknown error'}.`,
			search: '',
			sortBy: 'uploadDate',
			sortOrder: 'desc'
		};
	}
};
