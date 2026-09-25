import { cn } from '@/components/ui/styles';

/** Cofre picture, or a gradient monogram when none was uploaded. */
export function CofreImage({ src, name, className }: { src: string | null; name: string; className?: string }) {
	if (src) {
		// Plain <img>: uploads are served by our own authenticated route, no optimization needed.
		// eslint-disable-next-line @next/next/no-img-element
		return <img src={src} alt="" className={cn('object-cover', className)} />;
	}
	return (
		<div className={cn('bg-solana grid place-items-center font-bold text-black/80', className)} aria-hidden>
			{name.trim().charAt(0).toUpperCase() || '◎'}
		</div>
	);
}
