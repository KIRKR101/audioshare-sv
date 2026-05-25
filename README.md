# AudioShare

A platform for sharing and streaming high-quality audio files with automatic metadata extraction and album art support.

## Features

- Drag-and-drop audio file upload (MP3, FLAC, WAV, OGG, AAC, M4A, AIFF, WebM) up to 300MB
- Automatic metadata extraction (artist, title, album, genre, bitrate, etc.)
- Album art support with caching
- Audio player with keyboard shortcuts and range-based streaming
- Search and sort archive with pagination
- Dark-themed responsive UI

## Prerequisites

- [Bun](https://bun.sh) (or Node.js with npm)

## Setup

```sh
bun install
cp .env.example .env
```

The default `.env` uses SQLite (`file:local.db`). If you need a different database, update `DATABASE_URL`.

```sh
bun run db:push
```

## Development

```sh
bun run dev
```

## Production Build

```sh
bun run build
bun run preview
```

## Configuration

| Variable       | Description          | Default         |
| -------------- | -------------------- | --------------- |
| `DATABASE_URL` | Drizzle database URL | `file:local.db` |
