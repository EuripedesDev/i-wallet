'use server';

import { parseMoney } from '@/lib/money';
import * as service from '@/server/services/cofres';
import { UploadError } from '@/server/services/storage';
import { requireUserId } from '@/server/session';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionState = { error?: string; ok?: boolean };

function fileOrNull(v: FormDataEntryValue | null): File | null {
	return v instanceof File && v.size > 0 ? v : null;
}

function intOrNull(v: FormDataEntryValue | null): number | null {
	if (typeof v !== 'string' || !v.trim()) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

/** Maps known, user-safe errors to form state; rethrows the rest (including redirects). */
function toState(error: unknown): ActionState {
	if (error instanceof service.ServiceError || error instanceof UploadError) return { error: error.message };
	throw error;
}

export async function createCofreAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
	const userId = await requireUserId();
	let id: string;
	try {
		const cofre = await service.createCofre(userId, {
			name: String(formData.get('name') ?? ''),
			targetValue: parseMoney(formData.get('targetValue')),
			durationMonths: intOrNull(formData.get('durationMonths')),
			monthlyDeposit: parseMoney(formData.get('monthlyDeposit')),
			isFixedParcels: formData.get('isFixedParcels') === 'on',
			yieldsCdi: formData.get('yieldsCdi') === 'on',
			image: fileOrNull(formData.get('image')),
		});
		id = cofre.id;
	} catch (error) {
		return toState(error);
	}
	revalidatePath('/', 'layout');
	redirect(`/cofre/${id}`);
}

export async function editCofreAction(cofreId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
	const userId = await requireUserId();
	try {
		await service.editCofre(userId, cofreId, {
			name: String(formData.get('name') ?? ''),
			yieldsCdi: formData.get('yieldsCdi') === 'on',
			image: fileOrNull(formData.get('image')),
			removeImage: formData.get('removeImage') === 'on',
		});
	} catch (error) {
		return toState(error);
	}
	revalidatePath('/', 'layout');
	redirect(`/cofre/${cofreId}`);
}

export async function deleteCofreAction(cofreId: string): Promise<ActionState> {
	const userId = await requireUserId();
	try {
		await service.removeCofre(userId, cofreId);
	} catch (error) {
		return toState(error);
	}
	revalidatePath('/', 'layout');
	redirect('/');
}

export async function addDepositAction(cofreId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
	const userId = await requireUserId();
	try {
		const date = formData.get('date');
		await service.addDeposit(
			userId,
			cofreId,
			parseMoney(formData.get('amount')),
			typeof date === 'string' ? date : null,
		);
	} catch (error) {
		return toState(error);
	}
	revalidatePath(`/cofre/${cofreId}`);
	revalidatePath('/', 'layout');
	return { ok: true };
}

export async function addYieldAction(cofreId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
	const userId = await requireUserId();
	try {
		await service.addYield(userId, cofreId, parseMoney(formData.get('amount')));
	} catch (error) {
		return toState(error);
	}
	revalidatePath(`/cofre/${cofreId}`);
	revalidatePath('/', 'layout');
	return { ok: true };
}

export async function deleteTransactionAction(cofreId: string, transactionId: string): Promise<ActionState> {
	const userId = await requireUserId();
	try {
		await service.removeTransaction(userId, cofreId, transactionId);
	} catch (error) {
		return toState(error);
	}
	revalidatePath(`/cofre/${cofreId}`);
	revalidatePath('/', 'layout');
	return { ok: true };
}
