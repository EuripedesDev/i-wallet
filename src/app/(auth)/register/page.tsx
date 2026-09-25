import { AuthForm } from '@/components/auth/auth-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Criar conta · Metas' };

export default function RegisterPage() {
	return <AuthForm mode="register" />;
}
