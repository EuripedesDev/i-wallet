export default function AuthLayout({ children }: LayoutProps<'/'>) {
	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
			<div className="mb-10 text-center">
				<div className="bg-solana glow mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl text-3xl text-black">
					◎
				</div>
				<h1 className="text-gradient text-4xl font-bold tracking-tight">Metas</h1>
				<p className="mt-2 text-muted">Suas metas, um aporte de cada vez.</p>
			</div>
			<div className="glass rounded-3xl p-6">{children}</div>
		</main>
	);
}
