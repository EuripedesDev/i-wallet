import { CreateCofreForm } from '@/components/cofres/create-cofre-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Nova meta · Metas' };

export default function NovoCofrePage() {
	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-bold">Nova meta</h1>
				<p className="mt-1 text-sm text-muted">Defina a meta e como você vai chegar lá.</p>
			</header>
			<CreateCofreForm />
		</div>
	);
}
