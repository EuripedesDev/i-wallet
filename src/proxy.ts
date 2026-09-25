import { authConfig } from '@/auth.config';
import NextAuth from 'next-auth';

// Route protection: the `authorized` callback in auth.config decides access.
const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
	// Everything except Auth.js endpoints, Next internals and static files.
	matcher: [
		'/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon|apple-icon|.*\\.(?:png|jpg|svg|webp)$).*)',
	],
};
