import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'Metas',
	description: 'Metas financeiras com aportes e rendimento CDI.',
	appleWebApp: { capable: true, title: 'Metas', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
	themeColor: '#000000',
	width: 'device-width',
	initialScale: 1,
	viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
			<body className="min-h-full font-sans">{children}</body>
		</html>
	);
}
