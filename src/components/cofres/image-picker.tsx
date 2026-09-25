'use client';

import { useEffect, useState } from 'react';

export function ImagePicker({
	initialUrl,
	allowRemove = false,
}: {
	initialUrl?: string | null;
	allowRemove?: boolean;
}) {
	const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
	const [removed, setRemoved] = useState(false);

	// Revoke object URLs we created to avoid leaking memory.
	useEffect(() => {
		return () => {
			if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
		};
	}, [preview]);

	return (
		<div className="flex items-center gap-4">
			<label className="glass relative grid h-24 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-3xl border-dashed text-muted transition hover:border-neon/50">
				{preview ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={preview} alt="Pré-visualização" className="h-full w-full object-cover" />
				) : (
					<svg
						viewBox="0 0 24 24"
						className="h-8 w-8"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						aria-hidden>
						<path d="M4 16l4-4 4 4 3-3 5 5M4 6h16v12H4z" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				)}
				<input
					type="file"
					name="image"
					accept="image/jpeg,image/png,image/webp,image/gif"
					className="sr-only"
					onChange={e => {
						const file = e.target.files?.[0];
						if (file) {
							setPreview(URL.createObjectURL(file));
							setRemoved(false);
						}
					}}
				/>
			</label>
			<div className="text-sm text-muted">
				<p className="text-white">Imagem da meta</p>
				<p className="text-xs text-subtle">JPG, PNG, WEBP ou GIF até 4 MB.</p>
				{allowRemove && preview && (
					<button
						type="button"
						className="mt-2 text-xs text-red-300 underline-offset-4 hover:underline"
						onClick={() => {
							setPreview(null);
							setRemoved(true);
						}}>
						Remover imagem
					</button>
				)}
				{removed && <input type="hidden" name="removeImage" value="on" />}
			</div>
		</div>
	);
}
