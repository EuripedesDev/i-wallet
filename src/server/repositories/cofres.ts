import { db } from '@/db';
import { cofres, transactions, type NewCofre, type TransactionType } from '@/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import 'server-only';

const sumOf = (type: TransactionType) =>
	sql<string>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = ${type}), 0)`;

const summaryColumns = {
	cofre: cofres,
	deposited: sumOf('DEPOSIT'),
	yielded: sumOf('YIELD'),
	depositCount: sql<string>`count(${transactions.id}) filter (where ${transactions.type} = 'DEPOSIT')`,
	lastParcel: sql<string | null>`max(${transactions.parcelNumber})`,
};

type SummaryRow = {
	cofre: typeof cofres.$inferSelect;
	deposited: string;
	yielded: string;
	depositCount: string;
	lastParcel: string | null;
};

// Aggregates come back from the driver as strings.
function toSummary(row: SummaryRow) {
	return {
		...row.cofre,
		deposited: Number(row.deposited),
		yielded: Number(row.yielded),
		depositCount: Number(row.depositCount),
		lastParcel: row.lastParcel === null ? 0 : Number(row.lastParcel),
	};
}

export type CofreSummary = ReturnType<typeof toSummary>;

export async function listCofreSummaries(userId: string): Promise<CofreSummary[]> {
	const rows = await db
		.select(summaryColumns)
		.from(cofres)
		.leftJoin(transactions, eq(transactions.cofreId, cofres.id))
		.where(eq(cofres.userId, userId))
		.groupBy(cofres.id)
		.orderBy(desc(cofres.createdAt));
	return rows.map(toSummary);
}

export async function findCofreSummary(userId: string, cofreId: string): Promise<CofreSummary | null> {
	const [row] = await db
		.select(summaryColumns)
		.from(cofres)
		.leftJoin(transactions, eq(transactions.cofreId, cofres.id))
		.where(and(eq(cofres.id, cofreId), eq(cofres.userId, userId)))
		.groupBy(cofres.id);
	return row ? toSummary(row) : null;
}

export async function insertCofre(values: NewCofre) {
	const [cofre] = await db.insert(cofres).values(values).returning();
	return cofre;
}

export async function updateCofre(userId: string, cofreId: string, values: Partial<NewCofre>) {
	const [cofre] = await db
		.update(cofres)
		.set(values)
		.where(and(eq(cofres.id, cofreId), eq(cofres.userId, userId)))
		.returning();
	return cofre ?? null;
}

export async function deleteCofre(userId: string, cofreId: string) {
	const [cofre] = await db
		.delete(cofres)
		.where(and(eq(cofres.id, cofreId), eq(cofres.userId, userId)))
		.returning({ imageUrl: cofres.imageUrl });
	return cofre ?? null;
}

export async function listTransactions(cofreId: string) {
	return db
		.select()
		.from(transactions)
		.where(eq(transactions.cofreId, cofreId))
		.orderBy(desc(transactions.date), desc(transactions.parcelNumber));
}

export async function insertTransaction(values: typeof transactions.$inferInsert) {
	const [tx] = await db.insert(transactions).values(values).returning();
	return tx;
}

export async function deleteTransaction(cofreId: string, transactionId: string) {
	const [tx] = await db
		.delete(transactions)
		.where(and(eq(transactions.id, transactionId), eq(transactions.cofreId, cofreId)))
		.returning();
	return tx ?? null;
}

export async function isImageOwnedBy(userId: string, imageUrl: string) {
	const [row] = await db
		.select({ id: cofres.id })
		.from(cofres)
		.where(and(eq(cofres.userId, userId), eq(cofres.imageUrl, imageUrl)))
		.limit(1);
	return Boolean(row);
}

export async function monthlyDepositsByCofre(userId: string) {
	const month = sql<string>`to_char(${transactions.date} at time zone 'America/Sao_Paulo', 'YYYY-MM')`;
	return db
		.select({ month, cofreId: transactions.cofreId, amount: sql<string>`sum(${transactions.amount})` })
		.from(transactions)
		.innerJoin(cofres, eq(cofres.id, transactions.cofreId))
		.where(and(eq(cofres.userId, userId), eq(transactions.type, 'DEPOSIT')))
		.groupBy(month, transactions.cofreId)
		.orderBy(month);
}
