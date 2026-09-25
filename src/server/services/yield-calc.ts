/**
 * CDI accrual math. Pure (no I/O) so it can be unit-tested and reasoned about in isolation.
 *
 * Each deposit is its own "lot": it compounds daily at the CDI of every business day
 * from its own date up to (not including) today, and pays IOF according to its own age.
 * Dates are ISO "YYYY-MM-DD" strings in America/Sao_Paulo.
 */

export type DailyRate = { date: string; ratePct: number };
export type Lot = { date: string; amount: number };

/** Regressive IOF on yield, by calendar days since the deposit (index 0 = day 1). 0% from day 30. */
const IOF_TABLE = [
	96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3,
];

export function iofRate(days: number): number {
	if (days < 1) return 1;
	if (days >= 30) return 0;
	return IOF_TABLE[days - 1] / 100;
}

const DAY_MS = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
	return fromMs(toMs(iso) + n * DAY_MS);
}

export function daysBetween(from: string, to: string): number {
	return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

function isWeekday(iso: string) {
	const d = new Date(toMs(iso)).getUTCDay();
	return d !== 0 && d !== 6;
}

/** Today's date in São Paulo, as YYYY-MM-DD. */
export function todayBrt(now = new Date()): string {
	return toBrtDate(now);
}

export function toBrtDate(d: Date): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
}

export function annualFromDaily(ratePct: number): number {
	return Math.pow(1 + ratePct / 100, 252) - 1;
}

export function dailyFromAnnual(annual: number): number {
	return (Math.pow(1 + annual, 1 / 252) - 1) * 100;
}

/**
 * Business-day rates from `from` up to (not including) `today`.
 * - Published rate for the day: used as is.
 * - Weekday after the last published rate (BCB publishes with a 1-day lag): last known rate.
 * - Weekday before any cached rate (BCB unreachable): `fallbackDailyPct`.
 * - Weekday inside the published range without a rate: a holiday, no accrual.
 */
export function buildRateTimeline(
	published: DailyRate[],
	from: string,
	today: string,
	fallbackDailyPct: number,
): DailyRate[] {
	const byDate = new Map(published.map(r => [r.date, r.ratePct]));
	let first: DailyRate | null = null;
	let last: DailyRate | null = null;
	for (const r of published) {
		if (!first || r.date < first.date) first = r;
		if (!last || r.date > last.date) last = r;
	}

	const out: DailyRate[] = [];
	for (let d = from; d < today; d = addDays(d, 1)) {
		const rate = byDate.get(d);
		if (rate !== undefined) out.push({ date: d, ratePct: rate });
		else if (!isWeekday(d)) continue;
		else if (last && d > last.date) out.push({ date: d, ratePct: last.ratePct });
		else if (!first || d < first.date) out.push({ date: d, ratePct: fallbackDailyPct });
	}
	return out;
}

export type AccrualResult = {
	gross: number;
	iof: number;
	net: number;
};

/** Gross yield, IOF and net yield of all lots as of `today`, if redeemed today. */
export function accrue(lots: Lot[], timeline: DailyRate[], today: string): AccrualResult {
	// Prefix products: factor between index a and b is cum[b] / cum[a].
	const cum = [1];
	for (const r of timeline) cum.push(cum[cum.length - 1] * (1 + r.ratePct / 100));
	const end = timeline.length;

	// First timeline index whose date is >= lot date (binary search).
	const startIndex = (date: string) => {
		let lo = 0;
		let hi = end;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (timeline[mid].date < date) lo = mid + 1;
			else hi = mid;
		}
		return lo;
	};

	let gross = 0;
	let iof = 0;
	for (const lot of lots) {
		if (lot.date >= today) continue;
		const lotGross = lot.amount * (cum[end] / cum[startIndex(lot.date)] - 1);
		gross += lotGross;
		iof += lotGross * iofRate(daysBetween(lot.date, today));
	}
	return { gross, iof, net: gross - iof };
}
