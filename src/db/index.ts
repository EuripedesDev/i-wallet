import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'server-only';
import * as schema from './schema';

/**
 * Always PostgreSQL over the wire. In dev, `npm run dev` starts an embedded
 * PGlite server (see package.json) and injects DATABASE_URL, so no install is needed.
 */
function createDb() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is not set. Use `npm run dev` locally or point it at PostgreSQL.');
	// The dev PGlite server drops connections under parallel load, so `npm run dev` sets DB_POOL_MAX=1.
	const max = Number(process.env.DB_POOL_MAX) || 10;
	return drizzle(postgres(url, { max }), { schema });
}

type Db = ReturnType<typeof createDb>;

// Reuse the connection pool across HMR reloads in dev.
const globalForDb = globalThis as unknown as { __db?: Db };

function getDb(): Db {
	return (globalForDb.__db ??= createDb());
}

// Lazy, so `next build` can import modules without a DATABASE_URL.
export const db = new Proxy({} as Db, {
	get: (_, prop) => Reflect.get(getDb(), prop),
});
