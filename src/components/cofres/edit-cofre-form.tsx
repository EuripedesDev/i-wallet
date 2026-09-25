'use client';

import { Field, FormError } from '@/components/ui';
import { SubmitButton, Switch } from '@/components/ui/client';
import { buttonClass } from '@/components/ui/styles';
import { deleteCofreAction, editCofreAction, type ActionState } from '@/server/actions/cofres';
import { startTransition, useActionState, useState, useTransition } from 'react';
import { ImagePicker } from './image-picker';

export function EditCofreForm({
	cofre,
}: {
	cofre: { id: string; name: string; imageUrl: string | null; yieldsCdi: boolean };
}) {
	const [state, action, pending] = useActionState<ActionState, FormData>(editCofreAction.bind(null, cofre.id), {});
	const [deleting, startDelete] = useTransition();
	const [deleteError, setDeleteError] = useState<string>();

	return (
		<div className="space-y-8">
			<form
				className="space-y-4"
				onSubmit={e => {
					e.preventDefault();
					const data = new FormData(e.currentTarget);
					startTransition(() => action(data));
				}}>
				<ImagePicker initialUrl={cofre.imageUrl} allowRemove />
				<Field label="Nome da meta" name="name" required maxLength={120} defaultValue={cofre.name} />
				<Switch name="yieldsCdi" label="Rende 100% do CDI" defaultChecked={cofre.yieldsCdi} />
				<FormError message={state.error} />
				<SubmitButton className="w-full" pending={pending}>
					Salvar alterações
				</SubmitButton>
			</form>

			<div className="space-y-3 border-t border-white/10 pt-6">
				<p className="text-sm text-subtle">
					Excluir a meta apaga também todo o histórico de aportes e rendimentos.
				</p>
				<FormError message={deleteError} />
				<button
					type="button"
					disabled={deleting}
					className={buttonClass('danger', 'w-full')}
					onClick={() => {
						if (!confirm(`Excluir a meta "${cofre.name}"? Essa ação não pode ser desfeita.`)) return;
						startDelete(async () => {
							const res = await deleteCofreAction(cofre.id);
							if (res?.error) setDeleteError(res.error);
						});
					}}>
					{deleting ? 'Excluindo…' : 'Excluir meta'}
				</button>
			</div>
		</div>
	);
}
