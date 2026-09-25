import { db } from '@/db';
import { cdiRates } from '@/db/schema';
import { roundCents } from '@/lib/money';
import { gte, max, min } from 'drizzle-orm';
import 'server-only';
import {
	accrue,
	addDays,
	annualFromDaily,
	buildRateTimeline,
	dailyFromAnnual,
	daysBetween,
	toBrtDate,
	todayBrt,
	type DailyRate,
} from './yield-calc';

/**
 * Daily CDI from the Banco Central SGS API (series 12, % per business day),
 * cached in the cdi_rates table. BCB limits a query to a 10-year window.
 */
const SGS_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados';
const MAX_WINDOW_DAYS = 3600;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

/** Used only when BCB has never been reachable: CDI_ANNUAL_RATE (e.g. 0.1365) or 13.65% a.a. */
function fallbackAnnualRate(): number {
	const n = Number(process.env.CDI_ANNUAL_RATE);
	return Number.isFinite(n) && n > 0 ? n : 0.1365;
}

const brToIso = (br: string) => br.split('/').reverse().join('-');
const isoToBr = (iso: string) => iso.split('-').reverse().join('/');

async function fetchSgs(from: string, to: string): Promise<DailyRate[]> {
	const out: DailyRate[] = [];
	for (let start = from; start <= to; start = addDays(start, MAX_WINDOW_DAYS + 1)) {
		const end = addDays(start, MAX_WINDOW_DAYS) < to ? addDays(start, MAX_WINDOW_DAYS) : to;
		const url = `${SGS_URL}?formato=json&dataInicial=${isoToBr(start)}&dataFinal=${isoToBr(end)}`;
		const res = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: 'no-store' });
		// SGS answers 404 when the window has no business days (e.g. a weekend).
		if (res.status === 404) continue;
		if (!res.ok) throw new Error(`BCB SGS ${res.status}`);
		const rows = (await res.json()) as { data: string; valor: string }[];
		for (const r of rows) out.push({ date: brToIso(r.data), ratePct: Number(r.valor) });
	}
	return out;
}

// Per-process backoff so a BCB outage doesn't add a timeout to every page view.
let lastFailure = 0;
// Today's rate is only published tomorrow: don't re-ask for the same missing day on every view.
const emptyUntil = new Map<string, number>();

async function fetchAndStore(from: string, to: string) {
	const now = Date.now();
	if (now - lastFailure < RETRY_AFTER_FAILURE_MS) return;
	if ((emptyUntil.get(`${from}:${to}`) ?? 0) > now) return;
	try {
		const rows = await fetchSgs(from, to);
		if (rows.length) await db.insert(cdiRates).values(rows).onConflictDoNothing();
		else emptyUntil.set(`${from}:${to}`, now + 60 * 60 * 1000);
	} catch (error) {
		lastFailure = now;
		console.warn('[cdi] BCB fetch failed, using cached/fallback rates:', (error as Error).message);
	}
}

/** Makes sure the cache covers [from, yesterday], then returns the cached rates from `from`. */
async function ratesSince(from: string, today: string): Promise<DailyRate[]> {
	const [range] = await db.select({ first: min(cdiRates.date), last: max(cdiRates.date) }).from(cdiRates);
	const yesterday = addDays(today, -1);

	if (!range?.first || !range.last) {
		await fetchAndStore(from, today);
	} else {
		// A few days of slack: `from` may fall on a weekend/holiday before the first cached rate.
		if (daysBetween(from, range.first) > 5) await fetchAndStore(from, addDays(range.first, -1));
		if (range.last < yesterday) await fetchAndStore(addDays(range.last, 1), today);
	}

	return db
		.select({ date: cdiRates.date, ratePct: cdiRates.ratePct })
		.from(cdiRates)
		.where(gte(cdiRates.date, addDays(from, -10)))
		.orderBy(cdiRates.date);
}

export type CdiInfo = {
	/** Annualized CDI (base 252) from the latest known daily rate. */
	annualRate: number;
	/** Date of that rate; null when running on the fallback rate. */
	rateDate: string | null;
};

export type YieldEstimate = CdiInfo & {
	gross: number;
	iof: number;
	net: number;
	registered: number;
	/** Net yield accrued but not yet registered as a YIELD transaction. */
	pending: number;
	/** False when part of the period had to use the fallback rate (BCB history missing). */
	complete: boolean;
};

/**
 * Yield of a cofre at 100% of CDI, computed per deposit from its own date, net of IOF.
 * `registered` (the YIELD transactions so far) is subtracted to get what is left to register.
 */
export async function estimateCofreYield(
	deposits: { date: Date; amount: number }[],
	registered: number,
): Promise<YieldEstimate> {
	const today = todayBrt();
	const lots = deposits.map(d => ({ date: toBrtDate(d.date), amount: d.amount }));
	const from = lots.reduce((acc, l) => (l.date < acc ? l.date : acc), addDays(today, -7));

	const published = await ratesSince(from, today);
	const fallbackDaily = dailyFromAnnual(fallbackAnnualRate());
	const timeline = buildRateTimeline(published, from, today, fallbackDaily);
	const { gross, iof, net } = accrue(lots, timeline, today);

	const latest = published.at(-1) ?? null;
	const firstLot = lots.reduce<string | null>((acc, l) => (!acc || l.date < acc ? l.date : acc), null);
	const complete = !firstLot || (published.length > 0 && daysBetween(firstLot, published[0].date) <= 5);
	return {
		annualRate: latest ? annualFromDaily(latest.ratePct) : fallbackAnnualRate(),
		rateDate: latest?.date ?? null,
		gross: roundCents(gross),
		iof: roundCents(iof),
		net: roundCents(net),
		registered: roundCents(registered),
		pending: roundCents(Math.max(0, net - registered)),
		complete,
	};
}
