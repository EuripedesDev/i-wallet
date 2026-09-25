import { auth } from '@/auth';
import { isImageOwnedBy } from '@/server/repositories/cofres';
import { readImage } from '@/server/services/storage';

// Checked here rather than relying on proxy.ts: its matcher skips *.png/*.jpg paths.
export async function GET(_req: Request, ctx: RouteContext<'/api/uploads/[file]'>) {
	const { file } = await ctx.params;
	const session = await auth();
	if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });
	if (!(await isImageOwnedBy(session.user.id, `/api/uploads/${file}`))) {
		return new Response('Not found', { status: 404 });
	}

	const image = await readImage(file);
	if (!image) return new Response('Not found', { status: 404 });
	return new Response(new Uint8Array(image.data), {
		headers: {
			'Content-Type': image.mime,
			'Cache-Control': 'private, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff',
		},
	});
}
