import { del, get, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import 'server-only';

/**
 * Image storage. With a Blob store connected (Vercel), files go to a private
 * Vercel Blob store; otherwise to local disk (dev, VPS). Either way the stored URL is
 * /api/uploads/<name>, served by /api/uploads/[file], which checks the session and ownership.
 * Local files live outside public/ because Next.js only serves public/ files that existed at build time.
 */
const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? './storage/uploads');
const BLOB_PREFIX = 'uploads/';
const PUBLIC_PREFIX = '/api/uploads/';
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// BLOB_STORE_ID: Vercel OIDC auth (default when connecting a store); BLOB_READ_WRITE_TOKEN: static token.
const isBlobEnabled = () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

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

	const name = `${randomUUID()}.${ext}`;
	if (isBlobEnabled()) {
		await put(BLOB_PREFIX + name, file, { access: 'private', contentType: file.type, addRandomSuffix: false });
	} else {
		await mkdir(UPLOAD_DIR, { recursive: true });
		await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
	}
	return PUBLIC_PREFIX + name;
}

export async function deleteImage(url: string | null | undefined) {
	const name = url?.startsWith(PUBLIC_PREFIX) ? url.slice(PUBLIC_PREFIX.length) : null;
	if (!name || !isSafeName(name)) return;
	if (isBlobEnabled()) await del(BLOB_PREFIX + name).catch(() => {});
	else await unlink(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name)).catch(() => {});
}

// Only names we generated: uuid + known extension. Blocks path traversal.
function isSafeName(name: string) {
	return /^[0-9a-f-]{36}\.(jpg|png|webp|gif)$/.test(name);
}

export async function readImage(name: string): Promise<{ data: Buffer; mime: string } | null> {
	if (!isSafeName(name)) return null;
	const mime = EXT_MIME[name.split('.').pop()!];
	try {
		if (isBlobEnabled()) {
			const blob = await get(BLOB_PREFIX + name, { access: 'private' });
			if (!blob || blob.statusCode !== 200) return null;
			return { data: Buffer.from(await new Response(blob.stream).arrayBuffer()), mime };
		}
		return { data: await readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name)), mime };
	} catch {
		return null;
	}
}
