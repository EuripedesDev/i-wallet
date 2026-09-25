import { CofreActions } from '@/components/cofres/cofre-actions';
import { CofreImage } from '@/components/cofres/cofre-image';
import { Timeline } from '@/components/cofres/timeline';
import { ProgressBar } from '@/components/ui';
import { formatBRL, formatParcel, formatPercent } from '@/lib/money';
import { getCofreDetail } from '@/server/services/cofres';
import { todayBrt } from '@/server/services/yield-calc';
import { requireUserId } from '@/server/session';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const UUID = /^[0-9a-f-]{36}$/i;

export default async function CofrePage(props: PageProps<'/cofre/[id]'>) {
	const { id } = await props.params;
	if (!UUID.test(id)) notFound();
	const userId = await requireUserId();
	const detail = await getCofreDetail(userId, id);
	if (!detail) notFound();
	const { cofre, timeline, nextParcel, yieldEstimate } = detail;

	return (
		<div className="space-y-6">
			<header className="flex items-center justify-between">
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
				<Link href={`/cofre/${cofre.id}/editar`} className="glass rounded-full px-4 py-2.5 text-sm text-muted">
					Editar
				</Link>
			</header>

			<section className="glass glow relative overflow-hidden rounded-3xl">
				<CofreImage src={cofre.imageUrl} name={cofre.name} className="h-40 w-full text-6xl" />
				<div
					className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent to-black/80"
					aria-hidden
				/>
				<div className="relative -mt-12 p-5">
					<h1 className="text-2xl font-bold">{cofre.name}</h1>
					<p className="mt-1 text-sm text-muted">
						{cofre.isFixedParcels && cofre.durationMonths
							? `${formatParcel(cofre.lastParcel, cofre.durationMonths)} parcelas de ${formatBRL(cofre.monthlyDeposit ?? 0)}`
							: 'Aportes variáveis'}
						{cofre.yieldsCdi && ' · 100% CDI'}
					</p>

					<div className="mt-5 flex items-end justify-between">
						<div>
							<p className="text-xs text-muted">Saldo</p>
							<p className="text-gradient text-3xl font-bold tabular-nums">{formatBRL(cofre.balance)}</p>
						</div>
						<p className="text-sm text-muted">
							de <span className="text-white">{formatBRL(cofre.targetValue)}</span>
						</p>
					</div>
					<ProgressBar value={cofre.progress} className="mt-3" />
					<p className="mt-1.5 text-right text-xs text-subtle">{formatPercent(cofre.progress)} da meta</p>

					<dl className="mt-4 grid grid-cols-2 gap-3">
						<div className="rounded-2xl bg-white/5 p-3">
							<dt className="text-xs text-muted">Total depositado</dt>
							<dd className="mt-0.5 font-semibold tabular-nums">{formatBRL(cofre.deposited)}</dd>
						</div>
						<div className="rounded-2xl bg-white/5 p-3">
							<dt className="text-xs text-muted">Total rendido</dt>
							<dd className="mt-0.5 font-semibold text-neon tabular-nums">+{formatBRL(cofre.yielded)}</dd>
						</div>
					</dl>
					{yieldEstimate && yieldEstimate.pending > 0 && (
						<p className="mt-3 rounded-2xl border border-neon/20 bg-neon/5 px-3 py-2 text-xs text-muted">
							Rendimento estimado ainda não registrado:{' '}
							<span className="font-semibold text-neon tabular-nums">
								+{formatBRL(yieldEstimate.pending)}
							</span>{' '}
							líquido de IOF
						</p>
					)}
				</div>
			</section>

			<section aria-labelledby="historico" className="pb-16">
				<h2 id="historico" className="mb-3 text-lg font-semibold">
					Histórico
				</h2>
				<Timeline
					cofreId={cofre.id}
					items={timeline}
					totalParcels={cofre.isFixedParcels ? cofre.durationMonths : null}
					lastParcel={cofre.lastParcel}
				/>
			</section>

			<CofreActions
				cofreId={cofre.id}
				isFixed={cofre.isFixedParcels}
				nextParcel={nextParcel}
				yieldEstimate={yieldEstimate}
				targetValue={cofre.targetValue}
				today={todayBrt()}
			/>
		</div>
	);
}
