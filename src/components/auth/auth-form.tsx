'use client';

import { Field, FormError } from '@/components/ui';
import { SubmitButton } from '@/components/ui/client';
import { loginAction, registerAction, type AuthFormState } from '@/server/actions/auth';
import Link from 'next/link';
import { useActionState } from 'react';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
	const isLogin = mode === 'login';
	const [state, action] = useActionState<AuthFormState, FormData>(isLogin ? loginAction : registerAction, {});

	return (
		<form action={action} className="space-y-4">
			<Field
				label="E-mail"
				name="email"
				type="email"
				autoComplete="email"
				inputMode="email"
				required
				defaultValue={state.email}
				placeholder="voce@email.com"
			/>
			<Field
				label="Senha"
				name="password"
				type="password"
				autoComplete={isLogin ? 'current-password' : 'new-password'}
				required
				minLength={isLogin ? undefined : 8}
				placeholder="••••••••"
			/>
			{!isLogin && (
				<Field
					label="Confirmar senha"
					name="confirm"
					type="password"
					autoComplete="new-password"
					required
					minLength={8}
				/>
			)}
			<FormError message={state.error} />
			<SubmitButton className="w-full" pendingText={isLogin ? 'Entrando…' : 'Criando conta…'}>
				{isLogin ? 'Entrar' : 'Criar conta'}
			</SubmitButton>
			<p className="text-center text-sm text-muted">
				{isLogin ? 'Ainda não tem conta? ' : 'Já tem conta? '}
				<Link href={isLogin ? '/register' : '/login'} className="text-neon underline-offset-4 hover:underline">
					{isLogin ? 'Cadastre-se' : 'Entrar'}
				</Link>
			</p>
		</form>
	);
}
