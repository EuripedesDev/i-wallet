'use server';

import { signIn, signOut } from '@/auth';
import { credentialsSchema, EmailTakenError, registerUser } from '@/server/services/auth';
import { AuthError } from 'next-auth';

export type AuthFormState = { error?: string; email?: string };

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
	const email = String(formData.get('email') ?? '');
	try {
		await signIn('credentials', {
			email,
			password: formData.get('password'),
			redirectTo: '/',
		});
	} catch (error) {
		if (error instanceof AuthError) return { error: 'E-mail ou senha incorretos.', email };
		throw error; // signIn redirects by throwing; let Next handle it.
	}
	return {};
}

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
	const parsed = credentialsSchema.safeParse({
		email: formData.get('email'),
		password: formData.get('password'),
	});
	const email = String(formData.get('email') ?? '');
	if (!parsed.success) return { error: parsed.error.issues[0].message, email };
	if (formData.get('password') !== formData.get('confirm')) {
		return { error: 'As senhas não conferem.', email };
	}

	try {
		await registerUser(parsed.data.email, parsed.data.password);
	} catch (error) {
		if (error instanceof EmailTakenError) return { error: 'Já existe uma conta com esse e-mail.', email };
		throw error;
	}

	await signIn('credentials', { ...parsed.data, redirectTo: '/' });
	return {};
}

export async function logoutAction() {
	await signOut({ redirectTo: '/login' });
}
