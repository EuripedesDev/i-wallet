'use client';

import { Field, FormError } from '@/components/ui';
import { SubmitButton } from '@/components/ui/client';
import { Sheet } from '@/components/ui/sheet';
import { buttonClass } from '@/components/ui/styles';
import { formatBRL, formatParcel, formatPercent } from '@/lib/money';
import { addDepositAction, addYieldAction, type ActionState } from '@/server/actions/cofres';
import type { YieldEstimate } from '@/server/services/cdi';
import { useActionState, useEffect, useState } from 'react';

type Props = {
	cofreId: string;
	isFixed: boolean;
	nextParcel: { number: number; total: number; amount: number } | null;
	yieldEstimate: YieldEstimate | null;
	targetValue: number;
	/** Today in São Paulo (YYYY-MM-DD), from the server so the date picker's default/max match it. */
	today: string;
};

/** Floating "Novo aporte" button + optional "Rendimento" button, each opening a bottom sheet. */
export function CofreActions({ cofreId, isFixed, nextParcel, yieldEstimate, targetValue, today }: Props) {
	const [open, setOpen] = useState<'deposit' | 'yield' | null>(null);
	const close = () => setOpen(null);
	const finished = isFixed && !nextParcel;

	return (
		<>
			<div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 mx-auto flex max-w-md justify-end gap-3 px-4 pb-[env(safe-area-inset-bottom)]">
				{yieldEstimate && (
					<button
						type="button"
						onClick={() => setOpen('yield')}
						className={buttonClass('ghost', 'pointer-events-auto rounded-full border-neon/30 text-neon')}>
						+ Rendimento
					</button>
				)}
				<button
					type="button"
					onClick={() => setOpen('deposit')}
					disabled={finished}
					className={buttonClass('primary', 'pointer-events-auto rounded-full px-6')}>
					{finished ? 'Meta quitada ✓' : '+ Novo aporte'}
				</button>
			</div>

			<Sheet open={open === 'deposit'} onClose={close} title="Novo aporte">
				{open === 'deposit' && (
					<DepositForm
						cofreId={cofreId}
						nextParcel={nextParcel}
						targetValue={targetValue}
						today={today}
						onDone={close}
					/>
				)}
			</Sheet>
			{yieldEstimate && (
				<Sheet open={open === 'yield'} onClose={close} title="Registrar rendimento">
					{open === 'yield' && <YieldForm cofreId={cofreId} estimate={yieldEstimate} onDone={close} />}
				</Sheet>
			)}
		</>
	);
}

function useCloseOnSuccess(state: ActionState, onDone: () => void) {
	useEffect(() => {
		if (state.ok) onDone();
	}, [state, onDone]);
}

function DepositForm({
	cofreId,
	nextParcel,
	targetValue,
	today,
	onDone,
}: {
	cofreId: string;
	nextParcel: Props['nextParcel'];
	targetValue: number;
	today: string;
	onDone: () => void;
}) {
	const [state, action] = useActionState<ActionState, FormData>(addDepositAction.bind(null, cofreId), {});
	useCloseOnSuccess(state, onDone);

	return (
		<form action={action} className="space-y-4">
			{nextParcel ? (
				<div className="glass rounded-2xl p-5 text-center">
					<p className="text-sm text-muted">Pagar parcela</p>
					<p className="text-gradient text-3xl font-bold tabular-nums">
						{formatParcel(nextParcel.number, nextParcel.total)}
					</p>
					<p className="mt-2 text-2xl font-semibold tabular-nums">{formatBRL(nextParcel.amount)}</p>
					<p className="mt-1 text-xs text-subtle">
						{formatPercent((nextParcel.amount / targetValue) * 100, 2)} da meta · valor travado
					</p>
				</div>
			) : (
				<Field
					label="Valor do aporte (R$)"
					name="amount"
					inputMode="decimal"
					required
					autoFocus
					placeholder="0,00"
				/>
			)}
			<Field
				label="Data do aporte"
				name="date"
				type="date"
				defaultValue={today}
				max={today}
				required
				hint="O rendimento CDI e o IOF contam a partir desta data."
			/>
			<FormError message={state.error} />
			<SubmitButton className="w-full" pendingText="Registrando…">
				Confirmar aporte
			</SubmitButton>
		</form>
	);
}

const dateBr = (iso: string) => iso.split('-').reverse().join('/');

function YieldForm({ cofreId, estimate, onDone }: { cofreId: string; estimate: YieldEstimate; onDone: () => void }) {
	const [state, action] = useActionState<ActionState, FormData>(addYieldAction.bind(null, cofreId), {});
	useCloseOnSuccess(state, onDone);

	return (
		<form action={action} className="space-y-4">
			<dl className="glass space-y-1.5 rounded-2xl p-4 text-sm tabular-nums">
				<div className="flex justify-between">
					<dt className="text-muted">Rendimento bruto acumulado</dt>
					<dd>{formatBRL(estimate.gross)}</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-muted">IOF</dt>
					<dd className="text-red-300">−{formatBRL(estimate.iof)}</dd>
				</div>
				<div className="flex justify-between">
					<dt className="text-muted">Já registrado</dt>
					<dd>−{formatBRL(estimate.registered)}</dd>
				</div>
				<div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold">
					<dt>A registrar (líquido)</dt>
					<dd className="text-neon">{formatBRL(estimate.pending)}</dd>
				</div>
			</dl>
			<Field
				label="Rendimento do período (R$)"
				name="amount"
				inputMode="decimal"
				required
				autoFocus
				defaultValue={estimate.pending > 0 ? estimate.pending.toFixed(2).replace('.', ',') : ''}
				hint={
					estimate.rateDate && !estimate.complete
						? `Histórico do Banco Central incompleto: parte do período usa ${formatPercent(estimate.annualRate * 100, 2)} a.a. Confira com o extrato.`
						: estimate.rateDate
							? `100% do CDI, ${formatPercent(estimate.annualRate * 100, 2)} a.a. (Banco Central, ${dateBr(estimate.rateDate)}). Cada aporte rende desde a própria data; IOF regressivo nos primeiros 30 dias.`
							: `Banco Central indisponível: usando ${formatPercent(estimate.annualRate * 100, 2)} a.a. como estimativa.`
				}
			/>
			<FormError message={state.error} />
			<SubmitButton className="w-full" pendingText="Registrando…">
				Registrar rendimento
			</SubmitButton>
		</form>
	);
}
