import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import Header from './components/Header';
import { AuthProvider } from '../lib/useAuth';
import { QueryClientProvider, Hydrate } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { DialogProvider } from './components/DialogProvider';
import { ToastProvider } from './components/ToastProvider';

export const metadata: Metadata = {
  title: "SkullKing — édition PCR",
  description: "SkullKing — édition PCR",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <QueryClientProvider client={queryClient}>
          <Hydrate state={undefined}>
            <AuthProvider>
              <ToastProvider>
                <DialogProvider>
                  <Header />
                  <main className={`container ${styles.main}`}>{children}</main>
                </DialogProvider>
              </ToastProvider>
            </AuthProvider>
          </Hydrate>
        </QueryClientProvider>
        <footer className={`footer ${styles.footer}`}>&nbsp;</footer>
      </body>
    </html>
  );
}
