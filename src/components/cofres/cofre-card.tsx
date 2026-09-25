import { ProgressBar } from '@/components/ui';
import { formatBRL, formatParcel, formatPercent } from '@/lib/money';
import type { CofreView } from '@/server/services/cofres';
import Link from 'next/link';
import { CofreImage } from './cofre-image';

export function CofreCard({ cofre }: { cofre: CofreView }) {
	return (
		<Link
			href={`/cofre/${cofre.id}`}
			className="glass group block rounded-3xl p-4 transition hover:border-white/20 active:scale-[0.99]">
			<div className="flex items-center gap-4">
				<CofreImage src={cofre.imageUrl} name={cofre.name} className="h-14 w-14 shrink-0 rounded-2xl text-xl" />
				<div className="min-w-0 flex-1">
					<div className="flex items-baseline justify-between gap-2">
						<h3 className="truncate font-semibold">{cofre.name}</h3>
						<span className="text-gradient shrink-0 text-sm font-semibold">
							{formatPercent(cofre.progress)}
						</span>
					</div>
					<p className="mt-0.5 text-sm text-muted">
						<span className="text-white">{formatBRL(cofre.balance)}</span> / {formatBRL(cofre.targetValue)}
					</p>
				</div>
			</div>
			<ProgressBar value={cofre.progress} className="mt-4" />
			<div className="mt-2 flex justify-between text-xs text-subtle">
				<span>
					{cofre.isFixedParcels && cofre.durationMonths
						? `Parcela ${formatParcel(cofre.lastParcel, cofre.durationMonths)}`
						: 'Aportes variáveis'}
				</span>
				{cofre.yieldsCdi && <span className="text-neon/80">100% CDI</span>}
			</div>
		</Link>
	);
}
