import { findUserByEmail, insertUser } from '@/server/repositories/users';
import bcrypt from 'bcryptjs';
import 'server-only';
import { z } from 'zod';

export const credentialsSchema = z.object({
	email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido.')),
	password: z.string().min(8, 'A senha precisa de pelo menos 8 caracteres.').max(128),
});

// Compared against when the e-mail doesn't exist, so response time doesn't reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 12);

export async function verifyCredentials(email: string, password: string) {
	const user = await findUserByEmail(email);
	const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
	return user && ok ? user : null;
}

export class EmailTakenError extends Error {}

export async function registerUser(email: string, password: string) {
	if (await findUserByEmail(email)) throw new EmailTakenError();
	const hash = await bcrypt.hash(password, 12);
	try {
		return await insertUser(email, hash);
	} catch {
		// Unique index race with a concurrent signup.
		throw new EmailTakenError();
	}
}
