import { MonthlyDepositsChart } from '@/components/charts/monthly-deposits-chart';
import { getMonthlyDeposits } from '@/server/services/cofres';
import { todayBrt } from '@/server/services/yield-calc';
import { requireUserId } from '@/server/session';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Resumo · Metas' };

export default async function ResumoPage() {
	const userId = await requireUserId();
	const { cofres, rows } = await getMonthlyDeposits(userId);

	return (
		<div className="space-y-6">
			<header className="flex items-center gap-3">
				<Link href="/" className="glass grid h-11 w-11 place-items-center rounded-full" aria-label="Voltar">
					<svg
						viewBox="0 0 24 24"
						className="h-5 w-5"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden>
						<path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</Link>
				<div>
					<h1 className="text-xl font-bold">Resumo</h1>
					<p className="text-sm text-muted">Aportes de todas as metas</p>
				</div>
			</header>
			<MonthlyDepositsChart cofres={cofres} rows={rows} currentMonth={todayBrt().slice(0, 7)} />
		</div>
	);
}
