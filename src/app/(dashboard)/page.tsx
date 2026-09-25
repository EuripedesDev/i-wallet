import { auth } from '@/auth';
import { CofreCard } from '@/components/cofres/cofre-card';
import { buttonClass } from '@/components/ui/styles';
import { formatBRL } from '@/lib/money';
import { getDashboard } from '@/server/services/cofres';
import { requireUserId } from '@/server/session';
import Link from 'next/link';

export default async function DashboardPage() {
	const userId = await requireUserId();
	const [session, { cofres, totals }] = await Promise.all([auth(), getDashboard(userId)]);
	const firstName = session?.user?.email?.split('@')[0];

	return (
		<div className="space-y-6">
			<header>
				<p className="text-sm text-muted">Olá{firstName ? `, ${firstName}` : ''}</p>
				<h1 className="text-2xl font-bold">Suas metas</h1>
			</header>

			<Link
				href="/resumo"
				className="glass glow relative block overflow-hidden rounded-3xl p-5 transition hover:border-white/20 active:scale-[0.99]">
				<div
					className="bg-solana absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-25 blur-3xl"
					aria-hidden
				/>
				<p className="text-sm text-muted">Total guardado</p>
				<p className="text-gradient mt-1 text-4xl font-bold tracking-tight tabular-nums">
					{formatBRL(totals.balance)}
				</p>
				<dl className="mt-5 grid grid-cols-2 gap-3">
					<div className="rounded-2xl bg-white/5 p-3">
						<dt className="text-xs text-muted">Total investido</dt>
						<dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(totals.invested)}</dd>
					</div>
					<div className="rounded-2xl bg-white/5 p-3">
						<dt className="text-xs text-muted">Total rendimento</dt>
						<dd className="mt-0.5 font-semibold text-neon tabular-nums">+{formatBRL(totals.yielded)}</dd>
					</div>
				</dl>
				<p className="mt-4 flex items-center justify-end gap-1 text-xs text-muted">
					Ver aportes por mês
					<svg
						viewBox="0 0 24 24"
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden>
						<path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</p>
			</Link>

			<section aria-label="Metas" className="space-y-3">
				{cofres.length === 0 ? (
					<div className="glass rounded-3xl p-8 text-center">
						<p className="text-lg font-semibold">Nenhuma meta ainda</p>
						<p className="mt-1 text-sm text-muted">
							Crie sua primeira meta e comece a guardar dinheiro para ela.
						</p>
						<Link href="/cofre/novo" className={buttonClass('primary', 'mt-5')}>
							Criar meta
						</Link>
					</div>
				) : (
					cofres.map(c => <CofreCard key={c.id} cofre={c} />)
				)}
			</section>
		</div>
	);
}
