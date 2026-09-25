'use client';

import { cn } from '@/components/ui/styles';
import { logoutAction } from '@/server/actions/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const itemClass = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs transition';

export function BottomNav() {
	const pathname = usePathname();
	const isHome = pathname === '/';

	return (
		<nav className="glass pb-safe fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0">
			<div className="mx-auto flex max-w-md items-center px-6 pt-2">
				<Link
					href="/"
					className={cn(itemClass, isHome ? 'text-neon' : 'text-muted')}
					aria-current={isHome ? 'page' : undefined}>
					<svg
						viewBox="0 0 24 24"
						className="h-6 w-6"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden>
						<path d="M3 11l9-8 9 8M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
					Início
				</Link>
				<Link
					href="/cofre/novo"
					aria-label="Nova meta"
					className="bg-solana glow -mt-8 grid h-16 w-16 place-items-center rounded-full text-black transition active:scale-95">
					<svg
						viewBox="0 0 24 24"
						className="h-7 w-7"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						aria-hidden>
						<path d="M12 5v14M5 12h14" strokeLinecap="round" />
					</svg>
				</Link>
				<form action={logoutAction} className="flex flex-1">
					<button type="submit" className={cn(itemClass, 'text-muted')}>
						<svg
							viewBox="0 0 24 24"
							className="h-6 w-6"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-hidden>
							<path
								d="M15 17l5-5-5-5M20 12H9M12 21H5a1 1 0 01-1-1V4a1 1 0 011-1h7"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
						Sair
					</button>
				</form>
			</div>
		</nav>
	);
}
