const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number): string {
	return brl.format(value);
}

/** Round to cents, avoiding float drift (e.g. 0.1 + 0.2). */
export function roundCents(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Parse user input like "1.234,56", "1234.56" or "1234" into a number. */
export function parseMoney(input: FormDataEntryValue | null | undefined): number | null {
	if (typeof input !== 'string') return null;
	let s = input.trim().replace(/[R$\s]/g, '');
	if (!s) return null;
	if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

export function formatPercent(value: number, digits = 1): string {
	return `${value.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })}%`;
}

export function formatParcel(n: number, total: number): string {
	const width = Math.max(2, String(total).length);
	return `${String(n).padStart(width, '0')}/${String(total).padStart(width, '0')}`;
}
