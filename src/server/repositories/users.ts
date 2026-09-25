import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import 'server-only';

export async function findUserByEmail(email: string) {
	const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
	return user ?? null;
}

export async function insertUser(email: string, passwordHash: string) {
	const [user] = await db.insert(users).values({ email, passwordHash }).returning();
	return user;
}
