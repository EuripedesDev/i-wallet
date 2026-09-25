import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { credentialsSchema, verifyCredentials } from './server/services/auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
	...authConfig,
	providers: [
		Credentials({
			credentials: { email: {}, password: {} },
			async authorize(raw) {
				const parsed = credentialsSchema.safeParse(raw);
				if (!parsed.success) return null;
				const user = await verifyCredentials(parsed.data.email, parsed.data.password);
				return user ? { id: user.id, email: user.email } : null;
			},
		}),
	],
});
