import { EditCofreForm } from '@/components/cofres/edit-cofre-form';
import { formatBRL } from '@/lib/money';
import { getCofreDetail } from '@/server/services/cofres';
import { requireUserId } from '@/server/session';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EditCofrePage(props: PageProps<'/cofre/[id]/editar'>) {
	const { id } = await props.params;
	if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
	const userId = await requireUserId();
	const detail = await getCofreDetail(userId, id);
	if (!detail) notFound();
	const { cofre } = detail;

	return (
		<div className="space-y-6">
			<header className="flex items-center gap-3">
				<Link
					href={`/cofre/${id}`}
					className="glass grid h-11 w-11 place-items-center rounded-full"
					aria-label="Voltar">
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
				<h1 className="text-xl font-bold">Editar meta</h1>
			</header>

			<div className="glass rounded-2xl p-4 text-sm text-muted">
				Plano travado: meta de <span className="text-white">{formatBRL(cofre.targetValue)}</span>
				{cofre.durationMonths && <> em {cofre.durationMonths} meses</>}
				{cofre.monthlyDeposit && <> · {formatBRL(cofre.monthlyDeposit)}/mês</>}
				{cofre.isFixedParcels ? ' · parcelas fixas' : ' · aportes variáveis'}.
			</div>

			<EditCofreForm
				cofre={{ id: cofre.id, name: cofre.name, imageUrl: cofre.imageUrl, yieldsCdi: cofre.yieldsCdi }}
			/>
		</div>
	);
}
