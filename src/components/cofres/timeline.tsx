'use client';

import { cn } from '@/components/ui/styles';
import { formatBRL, formatParcel, formatPercent } from '@/lib/money';
import { deleteTransactionAction } from '@/server/actions/cofres';
import { useState, useTransition } from 'react';

export type TimelineItem = {
	id: string;
	type: 'DEPOSIT' | 'YIELD';
	amount: number;
	parcelNumber: number | null;
	date: Date;
	percentOfTarget: number;
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export function Timeline({
	cofreId,
	items,
	totalParcels,
	lastParcel,
}: {
	cofreId: string;
	items: TimelineItem[];
	totalParcels: number | null;
	lastParcel: number;
}) {
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string>();

	if (items.length === 0) {
		return <p className="glass rounded-3xl p-6 text-center text-sm text-muted">Nenhuma movimentação ainda.</p>;
	}

	const undo = (id: string) => {
		if (!confirm('Desfazer este lançamento?')) return;
		setError(undefined);
		startTransition(async () => {
			const res = await deleteTransactionAction(cofreId, id);
			if (res.error) setError(res.error);
		});
	};

	return (
		<>
			{error && (
				<p role="alert" className="mb-3 text-sm text-red-300">
					{error}
				</p>
			)}
			<ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-5 before:w-px before:bg-white/10">
				{items.map(tx => {
					const isDeposit = tx.type === 'DEPOSIT';
					// Fixed parcels can only be undone from the top, so the numbering stays gap-free.
					const canUndo = tx.parcelNumber === null || tx.parcelNumber === lastParcel;
					return (
						<li key={tx.id} className="relative flex gap-3">
							<span
								aria-hidden
								className={cn(
									'z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border text-lg',
									isDeposit
										? 'border-purple/50 bg-purple/15 text-purple shadow-[0_0_14px_rgb(153_69_255/0.35)]'
										: 'border-neon/50 bg-neon/15 text-neon shadow-[0_0_14px_rgb(20_241_149/0.35)]',
								)}>
								{isDeposit ? '↓' : '↗'}
							</span>
							<div className="glass min-w-0 flex-1 rounded-2xl px-4 py-3">
								<div className="flex items-baseline justify-between gap-2">
									<p className="truncate font-medium">
										{isDeposit ? 'Aporte' : 'Rendimento'}
										{tx.parcelNumber !== null && totalParcels && (
											<span className="ml-1.5 font-mono text-sm text-purple">
												{formatParcel(tx.parcelNumber, totalParcels)}
											</span>
										)}
									</p>
									<p
										className={cn(
											'shrink-0 font-semibold tabular-nums',
											isDeposit ? 'text-white' : 'text-neon',
										)}>
										+{formatBRL(tx.amount)}
									</p>
								</div>
								<div className="mt-1 flex items-center justify-between gap-2 text-xs text-subtle">
									<span>
										{dateFmt.format(new Date(tx.date))} · {formatPercent(tx.percentOfTarget, 2)} da
										meta
									</span>
									{canUndo && (
										<button
											type="button"
											disabled={pending}
											onClick={() => undo(tx.id)}
											className="shrink-0 text-subtle underline-offset-4 hover:text-red-300 hover:underline disabled:opacity-50">
											Desfazer
										</button>
									)}
								</div>
							</div>
						</li>
					);
				})}
			</ol>
		</>
	);
}
