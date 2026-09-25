'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { buttonClass, type ButtonVariant } from './styles';

export function SubmitButton({
	children,
	pendingText,
	variant = 'primary',
	className,
	pending: pendingOverride,
}: {
	children: ReactNode;
	pendingText?: string;
	/** For forms submitted via onSubmit + startTransition, where useFormStatus can't see the action. */
	pending?: boolean;
	variant?: ButtonVariant;
	className?: string;
}) {
	const status = useFormStatus();
	const pending = pendingOverride ?? status.pending;
	return (
		<button type="submit" disabled={pending} className={buttonClass(variant, className)}>
			{pending ? (pendingText ?? 'Salvando…') : children}
		</button>
	);
}

export function Switch({
	name,
	label,
	description,
	checked,
	defaultChecked,
	onChange,
}: {
	name: string;
	label: string;
	description?: string;
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: (checked: boolean) => void;
}) {
	return (
		<label className="glass flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl px-4 py-3">
			<span>
				<span className="block text-base">{label}</span>
				{description && <span className="block text-xs text-subtle">{description}</span>}
			</span>
			<input
				type="checkbox"
				name={name}
				role="switch"
				checked={checked}
				defaultChecked={defaultChecked}
				onChange={onChange ? e => onChange(e.target.checked) : undefined}
				className="peer sr-only"
			/>
			<span
				aria-hidden
				className="relative h-7 w-12 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-neon peer-focus-visible:ring-2 peer-focus-visible:ring-neon/50 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-black"
			/>
		</label>
	);
}
