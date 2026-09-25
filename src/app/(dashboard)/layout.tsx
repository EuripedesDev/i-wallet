import { BottomNav } from '@/components/layout/bottom-nav';

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
	return (
		<>
			<main className="mx-auto min-h-dvh max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32">
				{children}
			</main>
			<BottomNav />
		</>
	);
}
