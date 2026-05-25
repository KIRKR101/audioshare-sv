import { sqliteTable, integer, real, text } from 'drizzle-orm/sqlite-core';

export const songs = sqliteTable('songs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	filename: text('filename').notNull().unique(),
	filepath: text('filepath').notNull(),
	uploadDate: text('uploadDate').default('(CURRENT_TIMESTAMP)'),
	size: integer('size'),
	artist: text('artist'),
	title: text('title'),
	album: text('album'),
	year: integer('year'),
	trackNumber: integer('trackNumber'),
	genre: text('genre'),
	duration: real('duration'),
	bitrate: integer('bitrate'),
	sampleRate: integer('sampleRate'),
	format: text('format'),
	albumArtist: text('albumArtist'),
	composer: text('composer'),
	diskNumber: integer('diskNumber'),
	extension: text('extension'),
	link: text('link')
});
