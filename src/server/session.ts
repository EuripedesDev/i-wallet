import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import 'server-only';

/** Every action and page must re-check the session; the proxy is only a first gate. */
export async function requireUserId(): Promise<string> {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');
	return session.user.id;
}
