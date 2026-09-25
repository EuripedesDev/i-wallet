'use client';

import { Field, FormError } from '@/components/ui';
import { SubmitButton, Switch } from '@/components/ui/client';
import { formatBRL, parseMoney } from '@/lib/money';
import { createCofreAction, type ActionState } from '@/server/actions/cofres';
import { resolveTriad } from '@/server/services/triad';
import { startTransition, useActionState, useState } from 'react';
import { ImagePicker } from './image-picker';

export function CreateCofreForm() {
	const [state, action, pending] = useActionState<ActionState, FormData>(createCofreAction, {});
	const [target, setTarget] = useState('');
	const [duration, setDuration] = useState('');
	const [deposit, setDeposit] = useState('');
	const [isFixed, setIsFixed] = useState(true);

	const durationNum = duration.trim() ? Number(duration) : null;
	const triad = resolveTriad(
		{ targetValue: parseMoney(target), durationMonths: durationNum, monthlyDeposit: parseMoney(deposit) },
		isFixed,
	);
	const derived = triad.ok ? triad.derived : null;
	const hasInput = Boolean(target || duration || deposit);

	// Show the derived value in-place as a placeholder so the "third variable" fills itself in.
	const derivedHint = (field: 'targetValue' | 'durationMonths' | 'monthlyDeposit') => {
		if (!triad.ok || derived !== field) return undefined;
		return <span className="text-neon">Calculado automaticamente</span>;
	};

	return (
		<form
			className="space-y-6"
			onSubmit={e => {
				// Submit manually so React doesn't reset the form (and the chosen image) on validation errors.
				e.preventDefault();
				const data = new FormData(e.currentTarget);
				startTransition(() => action(data));
			}}>
			<section className="space-y-4">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-subtle">1. Identidade</h2>
				<ImagePicker />
				<Field label="Nome da meta" name="name" required maxLength={120} placeholder="Ex.: Viagem ao Japão" />
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-subtle">2. Plano</h2>
				<Switch
					name="isFixedParcels"
					label="Parcelas fixas"
					description={
						isFixed
							? 'Aporte travado no valor da parcela (01/12, 02/12…)'
							: 'Aportes livres, de qualquer valor'
					}
					checked={isFixed}
					onChange={setIsFixed}
				/>
				<p className="text-xs text-subtle">
					{isFixed
						? 'Preencha dois campos; o terceiro é calculado.'
						: 'Só a meta é obrigatória. Duração e depósito são opcionais.'}
				</p>
				<Field
					label="Meta (R$)"
					name="targetValue"
					inputMode="decimal"
					value={target}
					onChange={e => setTarget(e.target.value)}
					placeholder={derived === 'targetValue' && triad.ok ? formatBRL(triad.targetValue) : '10.000,00'}
					hint={derivedHint('targetValue')}
				/>
				<Field
					label="Duração (meses)"
					name="durationMonths"
					type="number"
					inputMode="numeric"
					min={1}
					step={1}
					value={duration}
					onChange={e => setDuration(e.target.value)}
					placeholder={derived === 'durationMonths' && triad.ok ? String(triad.durationMonths) : '12'}
					hint={derivedHint('durationMonths')}
				/>
				<Field
					label="Depósito mensal (R$)"
					name="monthlyDeposit"
					inputMode="decimal"
					value={deposit}
					onChange={e => setDeposit(e.target.value)}
					placeholder={
						derived === 'monthlyDeposit' && triad.ok && triad.monthlyDeposit
							? formatBRL(triad.monthlyDeposit)
							: '500,00'
					}
					hint={derivedHint('monthlyDeposit')}
				/>

				{hasInput && (
					<div className="glass rounded-2xl p-4 text-sm" aria-live="polite">
						{triad.ok ? (
							<p className="text-muted">
								Meta de <strong className="text-white">{formatBRL(triad.targetValue)}</strong>
								{triad.durationMonths && (
									<>
										{' '}
										em <strong className="text-white">{triad.durationMonths} meses</strong>
									</>
								)}
								{triad.monthlyDeposit && (
									<>
										{' '}
										com <strong className="text-white">{formatBRL(triad.monthlyDeposit)}</strong>
										/mês
									</>
								)}
								.
							</p>
						) : (
							<p className="text-subtle">{triad.error}</p>
						)}
					</div>
				)}
			</section>

			<section className="space-y-4">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-subtle">3. Rendimento</h2>
				<Switch
					name="yieldsCdi"
					label="Rende 100% do CDI"
					description="Permite registrar rendimentos no histórico"
					defaultChecked
				/>
			</section>

			<FormError message={state.error} />
			<SubmitButton className="w-full" pendingText="Criando…" pending={pending}>
				Criar meta
			</SubmitButton>
		</form>
	);
}
