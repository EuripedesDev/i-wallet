export function cn(...classes: (string | false | null | undefined)[]) {
	return classes.filter(Boolean).join(' ');
}

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

const buttonVariants: Record<ButtonVariant, string> = {
	primary: 'bg-solana text-black font-semibold glow hover:brightness-110',
	ghost: 'glass text-white hover:bg-white/10',
	danger: 'border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
};

export function buttonClass(variant: ButtonVariant = 'primary', extra?: string) {
	return cn(
		'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-base transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
		buttonVariants[variant],
		extra,
	);
}
