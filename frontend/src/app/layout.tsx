import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import Header from './components/Header';

export const metadata: Metadata = {
  title: "SkullKing — édition PCR",
  description: "SkullKing — édition PCR",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <Header />
        <main className={`container ${styles.main}`}>{children}</main>
        <footer className={`footer ${styles.footer}`}>&nbsp;</footer>
      </body>
    </html>
  );
}
