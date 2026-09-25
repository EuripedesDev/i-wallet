import { roundCents } from '@/lib/money';

/**
 * "A Tríade": given any two of target / duration / monthly deposit, derive the third.
 * Pure and isomorphic so the create form can preview the same result the server stores.
 */
export type TriadInput = {
	targetValue: number | null;
	durationMonths: number | null;
	monthlyDeposit: number | null;
};

export type TriadResult =
	| {
			ok: true;
			targetValue: number;
			durationMonths: number | null;
			monthlyDeposit: number | null;
			derived: keyof TriadInput | null;
	  }
	| { ok: false; error: string };

const positive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;

export function resolveTriad(input: TriadInput, isFixedParcels: boolean): TriadResult {
	const target = positive(input.targetValue) ? input.targetValue : null;
	const duration = positive(input.durationMonths) ? input.durationMonths : null;
	const deposit = positive(input.monthlyDeposit) ? input.monthlyDeposit : null;

	if (duration !== null && !Number.isInteger(duration)) {
		return { ok: false, error: 'A duração deve ser um número inteiro de meses.' };
	}

	// Target + duration -> deposit
	if (target !== null && duration !== null) {
		return {
			ok: true,
			targetValue: roundCents(target),
			durationMonths: duration,
			monthlyDeposit: deposit !== null && !isFixedParcels ? roundCents(deposit) : roundCents(target / duration),
			derived: deposit === null || isFixedParcels ? 'monthlyDeposit' : null,
		};
	}

	// Target + deposit -> duration (rounded up; last parcel absorbs the remainder)
	if (target !== null && deposit !== null) {
		if (deposit > target) return { ok: false, error: 'O depósito mensal não pode ser maior que a meta.' };
		return {
			ok: true,
			targetValue: roundCents(target),
			durationMonths: Math.ceil(roundCents(target / deposit)),
			monthlyDeposit: roundCents(deposit),
			derived: 'durationMonths',
		};
	}

	// Duration + deposit -> target
	if (duration !== null && deposit !== null) {
		return {
			ok: true,
			targetValue: roundCents(duration * deposit),
			durationMonths: duration,
			monthlyDeposit: roundCents(deposit),
			derived: 'targetValue',
		};
	}

	// Variable mode only needs the goal itself.
	if (!isFixedParcels && target !== null) {
		return { ok: true, targetValue: roundCents(target), durationMonths: null, monthlyDeposit: null, derived: null };
	}

	return {
		ok: false,
		error: isFixedParcels
			? 'Informe pelo menos dois entre Meta, Duração e Depósito mensal.'
			: 'Informe a meta (ou duração e depósito mensal).',
	};
}

/**
 * Amount due for a given parcel in fixed mode. Every parcel is the base deposit,
 * except the last one, which settles whatever is left so the total hits the target exactly.
 */
export function parcelAmount(
	cofre: { targetValue: number; durationMonths: number; monthlyDeposit: number },
	parcelNumber: number,
	depositedSoFar: number,
): number {
	if (parcelNumber >= cofre.durationMonths) {
		return roundCents(Math.max(0, cofre.targetValue - depositedSoFar));
	}
	return roundCents(cofre.monthlyDeposit);
}
