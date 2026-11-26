import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cardápio | Guto Bebidas 01',
  description:
    'O cardápio da Guto Bebidas 01 em Belo Horizonte. Escolha suas bebidas, monte seu pedido e fale com a gente.',
  icons: { icon: '/images/logo-guto.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0c0b07' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
