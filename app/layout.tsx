import './globals.css';
import type { ReactNode } from 'react';
import { Geologica, M_PLUS_Rounded_1c } from 'next/font/google';

const geologica = Geologica({
  subsets: ['latin'],
  variable: '--font-geologica',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const mplus = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  variable: '--font-mplus',
  weight: ['400', '500', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'Testbuds',
  description: 'Synthetic customers that actually use your product.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geologica.variable} ${mplus.variable}`}>
      <body>{children}</body>
    </html>
  );
}
