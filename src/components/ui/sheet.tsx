'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Bottom sheet built on <dialog>: native focus trap, Esc to close, tap backdrop to close. */
export function Sheet({
	open,
	onClose,
	title,
	children,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
}) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			onClose={onClose}
			onClick={e => e.target === ref.current && onClose()}
			aria-label={title}
			className="sheet m-0 mt-auto w-full max-w-none bg-transparent p-0 text-white sm:m-auto sm:max-w-md">
			<div className="glass pb-safe rounded-t-3xl border-b-0 px-5 pt-3 sm:rounded-3xl sm:border-b">
				<div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20 sm:hidden" />
				<h2 className="mb-4 text-lg font-semibold">{title}</h2>
				{children}
			</div>
		</dialog>
	);
}
