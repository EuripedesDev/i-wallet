import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import 'server-only';

/**
 * Local disk storage. Files live outside public/ because Next.js only serves
 * public/ files that existed at build time; they are served by /api/uploads/[file],
 * which checks the session and ownership.
 * Swap this module for S3/Cloudinary later without touching callers.
 */
const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? './storage/uploads');
const PUBLIC_PREFIX = '/api/uploads/';
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/gif': 'gif',
};
const EXT_MIME = Object.fromEntries(Object.entries(MIME_EXT).map(([m, e]) => [e, m]));

export class UploadError extends Error {}

export async function saveImage(file: File): Promise<string> {
	const ext = MIME_EXT[file.type];
	if (!ext) throw new UploadError('Formato de imagem não suportado (use JPG, PNG, WEBP ou GIF).');
	if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('Imagem muito grande (máx. 4 MB).');

	await mkdir(UPLOAD_DIR, { recursive: true });
	const name = `${randomUUID()}.${ext}`;
	await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
	return PUBLIC_PREFIX + name;
}

export async function deleteImage(url: string | null | undefined) {
	const name = url?.startsWith(PUBLIC_PREFIX) ? url.slice(PUBLIC_PREFIX.length) : null;
	if (!name || !isSafeName(name)) return;
	await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name)).catch(() => {});
}

// Only names we generated: uuid + known extension. Blocks path traversal.
function isSafeName(name: string) {
	return /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(name);
}

export async function readImage(name: string): Promise<{ data: Buffer; mime: string } | null> {
	if (!isSafeName(name)) return null;
	try {
		const data = await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name));
		return { data, mime: EXT_MIME[name.split('.').pop()!] };
	} catch {
		return null;
	}
}
