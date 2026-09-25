import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { buttonClass, cn, type ButtonVariant } from './styles';

export { SubmitButton, Switch } from './client';
export { buttonClass, cn } from './styles';

export function Button({
	variant = 'primary',
	className,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
	return <button className={buttonClass(variant, className)} {...props} />;
}

/** Submit button that disables itself while the parent form's action is pending. */

export function Field({
	label,
	hint,
	className,
	...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
	return (
		<label className={cn('block', className)}>
			<span className="mb-1.5 block text-sm text-muted">{label}</span>
			<input
				className="glass block min-h-12 w-full rounded-2xl px-4 text-base text-white placeholder:text-subtle outline-none transition focus:border-neon/60 focus:ring-2 focus:ring-neon/20"
				{...props}
			/>
			{hint && <span className="mt-1.5 block text-xs text-subtle">{hint}</span>}
		</label>
	);
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
	const pct = Math.max(0, Math.min(100, value));
	return (
		<div
			role="progressbar"
			aria-valuenow={Math.round(pct)}
			aria-valuemin={0}
			aria-valuemax={100}
			className={cn('h-2.5 w-full overflow-hidden rounded-full bg-white/10', className)}>
			<div
				className="bg-solana h-full rounded-full shadow-[0_0_12px_rgb(20_241_149/0.6)] transition-[width] duration-500"
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

export function FormError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
			{message}
		</p>
	);
}
