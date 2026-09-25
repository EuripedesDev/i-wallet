import type { NextAuthConfig } from 'next-auth';

const PUBLIC_PATHS = ['/login', '/register'];

/**
 * DB-free part of the Auth.js config, shared with proxy.ts.
 * Keeping bcrypt and the database out of here means the proxy only verifies the JWT.
 */
export const authConfig = {
	pages: { signIn: '/login' },
	session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
	providers: [],
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isPublic = PUBLIC_PATHS.some(p => nextUrl.pathname.startsWith(p));
			if (isPublic) {
				return isLoggedIn ? Response.redirect(new URL('/', nextUrl)) : true;
			}
			return isLoggedIn;
		},
		jwt({ token, user }) {
			if (user?.id) token.sub = user.id;
			return token;
		},
		session({ session, token }) {
			if (token.sub) session.user.id = token.sub;
			return session;
		},
	},
} satisfies NextAuthConfig;
