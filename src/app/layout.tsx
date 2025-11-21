import './globals.css';
import type { ReactNode } from 'react';
import Providers from './providers';

export const metadata = { ... }; // Keep all existing metadata

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}