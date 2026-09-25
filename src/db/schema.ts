import {
	boolean,
	date,
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cofres = pgTable(
	'cofres',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 120 }).notNull(),
		imageUrl: varchar('image_url', { length: 512 }),
		targetValue: numeric('target_value', { precision: 14, scale: 2, mode: 'number' }).notNull(),
		// Nullable: variable-mode cofres may not have a set duration / base deposit.
		durationMonths: integer('duration_months'),
		monthlyDeposit: numeric('monthly_deposit', { precision: 14, scale: 2, mode: 'number' }),
		isFixedParcels: boolean('is_fixed_parcels').notNull().default(false),
		yieldsCdi: boolean('yields_cdi').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	t => [index('cofres_user_id_idx').on(t.userId)],
);

export const transactionType = pgEnum('transaction_type', ['DEPOSIT', 'YIELD']);

export const transactions = pgTable(
	'transactions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		cofreId: uuid('cofre_id')
			.notNull()
			.references(() => cofres.id, { onDelete: 'cascade' }),
		type: transactionType('type').notNull(),
		amount: numeric('amount', { precision: 14, scale: 2, mode: 'number' }).notNull(),
		parcelNumber: integer('parcel_number'),
		date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
	},
	t => [
		index('transactions_cofre_id_idx').on(t.cofreId),
		// Guards against paying the same parcel twice (NULLs are distinct, so variable deposits are unaffected).
		uniqueIndex('transactions_cofre_parcel_uq').on(t.cofreId, t.parcelNumber),
	],
);

/** Cache of BCB SGS series 12: daily CDI rate (% per day) for each business day. */
export const cdiRates = pgTable('cdi_rates', {
	date: date('date').primaryKey(),
	ratePct: numeric('rate_pct', { precision: 12, scale: 8, mode: 'number' }).notNull(),
});

export type User = typeof users.$inferSelect;
export type Cofre = typeof cofres.$inferSelect;
export type NewCofre = typeof cofres.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionType = (typeof transactionType.enumValues)[number];
