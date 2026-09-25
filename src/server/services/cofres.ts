import { roundCents } from '@/lib/money';
import type { CofreSummary } from '@/server/repositories/cofres';
import * as repo from '@/server/repositories/cofres';
import 'server-only';
import { estimateCofreYield } from './cdi';
import { deleteImage, saveImage } from './storage';
import { parcelAmount, resolveTriad, type TriadInput } from './triad';
import { todayBrt } from './yield-calc';

/** Errors whose message is safe to show to the user. */
export class ServiceError extends Error {}

function withProgress(c: CofreSummary) {
	const balance = roundCents(c.deposited + c.yielded);
	const progress = c.targetValue > 0 ? Math.min(100, (balance / c.targetValue) * 100) : 0;
	return { ...c, balance, progress };
}

export type CofreView = ReturnType<typeof withProgress>;

export async function getDashboard(userId: string) {
	const cofres = (await repo.listCofreSummaries(userId)).map(withProgress);
	const invested = roundCents(cofres.reduce((s, c) => s + c.deposited, 0));
	const yielded = roundCents(cofres.reduce((s, c) => s + c.yielded, 0));
	return { cofres, totals: { invested, yielded, balance: roundCents(invested + yielded) } };
}

/** Next fixed parcel to pay, or null when not in fixed mode / all parcels paid. */
function nextParcel(c: CofreSummary) {
	if (!c.isFixedParcels || !c.durationMonths || !c.monthlyDeposit) return null;
	const number = c.lastParcel + 1;
	if (number > c.durationMonths) return null;
	const amount = parcelAmount(
		{ targetValue: c.targetValue, durationMonths: c.durationMonths, monthlyDeposit: c.monthlyDeposit },
		number,
		c.deposited,
	);
	return { number, total: c.durationMonths, amount };
}

export async function getCofreDetail(userId: string, cofreId: string) {
	const summary = await repo.findCofreSummary(userId, cofreId);
	if (!summary) return null;
	const cofre = withProgress(summary);
	const transactions = await repo.listTransactions(cofreId);
	const timeline = transactions.map(tx => ({
		...tx,
		percentOfTarget: cofre.targetValue > 0 ? (tx.amount / cofre.targetValue) * 100 : 0,
	}));
	const yieldEstimate = cofre.yieldsCdi
		? await estimateCofreYield(
				transactions.filter(tx => tx.type === 'DEPOSIT'),
				cofre.yielded,
			)
		: null;
	return { cofre, timeline, nextParcel: nextParcel(summary), yieldEstimate };
}

export type CreateCofreInput = TriadInput & {
	name: string;
	isFixedParcels: boolean;
	yieldsCdi: boolean;
	image: File | null;
};

export async function createCofre(userId: string, input: CreateCofreInput) {
	const name = input.name.trim();
	if (!name) throw new ServiceError('Dê um nome à meta.');

	const triad = resolveTriad(input, input.isFixedParcels);
	if (!triad.ok) throw new ServiceError(triad.error);

	const imageUrl = input.image && input.image.size > 0 ? await saveImage(input.image) : null;

	return repo.insertCofre({
		userId,
		name,
		imageUrl,
		targetValue: triad.targetValue,
		durationMonths: triad.durationMonths,
		monthlyDeposit: triad.monthlyDeposit,
		isFixedParcels: input.isFixedParcels,
		yieldsCdi: input.yieldsCdi,
	});
}

/** Only cosmetic fields are editable; the plan (triad) is locked once created. */
export async function editCofre(
	userId: string,
	cofreId: string,
	input: { name: string; yieldsCdi: boolean; image: File | null; removeImage: boolean },
) {
	const current = await repo.findCofreSummary(userId, cofreId);
	if (!current) throw new ServiceError('Meta não encontrada.');
	const name = input.name.trim();
	if (!name) throw new ServiceError('Dê um nome à meta.');

	let imageUrl = current.imageUrl;
	if (input.image && input.image.size > 0) imageUrl = await saveImage(input.image);
	else if (input.removeImage) imageUrl = null;

	await repo.updateCofre(userId, cofreId, { name, yieldsCdi: input.yieldsCdi, imageUrl });
	if (imageUrl !== current.imageUrl) await deleteImage(current.imageUrl);
}

export async function removeCofre(userId: string, cofreId: string) {
	const deleted = await repo.deleteCofre(userId, cofreId);
	if (!deleted) throw new ServiceError('Meta não encontrada.');
	await deleteImage(deleted.imageUrl);
}

/**
 * Deposit date from the form ("YYYY-MM-DD", São Paulo). Today or empty means "now";
 * past days are stored at noon BRT so the calendar day never shifts across time zones.
 * The date matters: each deposit starts earning CDI (and ageing for IOF) from it.
 */
function depositDate(raw: string | null): Date {
	const today = todayBrt();
	if (!raw || raw === today) return new Date();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
		throw new ServiceError('Data do aporte inválida.');
	}
	if (raw > today) throw new ServiceError('A data do aporte não pode estar no futuro.');
	if (raw < '2000-01-01') throw new ServiceError('Data do aporte muito antiga.');
	return new Date(`${raw}T12:00:00-03:00`);
}

export async function addDeposit(userId: string, cofreId: string, rawAmount: number | null, rawDate: string | null) {
	const cofre = await repo.findCofreSummary(userId, cofreId);
	if (!cofre) throw new ServiceError('Meta não encontrada.');
	const date = depositDate(rawDate);

	if (cofre.isFixedParcels) {
		// Fixed mode ignores the client amount: the parcel value is locked server-side.
		const parcel = nextParcel(cofre);
		if (!parcel) throw new ServiceError('Todas as parcelas desta meta já foram pagas.');
		try {
			return await repo.insertTransaction({
				cofreId,
				type: 'DEPOSIT',
				amount: parcel.amount,
				parcelNumber: parcel.number,
				date,
			});
		} catch {
			// Unique (cofre_id, parcel_number) violation: a concurrent request paid it first.
			throw new ServiceError('Essa parcela acabou de ser registrada. Atualize a página.');
		}
	}

	const amount = rawAmount === null ? null : roundCents(rawAmount);
	if (amount === null || amount <= 0) throw new ServiceError('Informe um valor maior que zero.');
	return repo.insertTransaction({ cofreId, type: 'DEPOSIT', amount, parcelNumber: null, date });
}

export async function addYield(userId: string, cofreId: string, rawAmount: number | null) {
	const cofre = await repo.findCofreSummary(userId, cofreId);
	if (!cofre) throw new ServiceError('Meta não encontrada.');
	if (!cofre.yieldsCdi) throw new ServiceError('Esta meta não está configurada para render CDI.');
	const amount = rawAmount === null ? null : roundCents(rawAmount);
	if (amount === null || amount <= 0) throw new ServiceError('Informe um rendimento maior que zero.');
	return repo.insertTransaction({ cofreId, type: 'YIELD', amount, parcelNumber: null });
}

export async function removeTransaction(userId: string, cofreId: string, transactionId: string) {
	const cofre = await repo.findCofreSummary(userId, cofreId);
	if (!cofre) throw new ServiceError('Meta não encontrada.');
	const tx = (await repo.listTransactions(cofreId)).find(t => t.id === transactionId);
	if (!tx) throw new ServiceError('Lançamento não encontrado.');
	// Removing a middle parcel would leave a gap in 01/80, 02/80... so only the latest can be undone.
	if (tx.parcelNumber !== null && tx.parcelNumber !== cofre.lastParcel) {
		throw new ServiceError('Só é possível desfazer a última parcela paga.');
	}
	await repo.deleteTransaction(cofreId, transactionId);
}

/** Deposits per month (São Paulo time) and per cofre, for the overview chart. */
export async function getMonthlyDeposits(userId: string) {
	const [rows, cofres] = await Promise.all([repo.monthlyDepositsByCofre(userId), repo.listCofreSummaries(userId)]);
	// Oldest first, so each cofre keeps the same color as new ones are added.
	const ordered = [...cofres].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	return {
		cofres: ordered.map(c => ({ id: c.id, name: c.name })),
		rows: rows.map(r => ({ month: r.month, cofreId: r.cofreId, amount: roundCents(Number(r.amount)) })),
	};
}
