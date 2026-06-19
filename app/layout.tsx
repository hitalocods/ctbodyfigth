import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CT BODY FIGHT",
  description: "Estrutura inicial do sistema CT BODY FIGHT.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="overflow-x-hidden">
      <body className="overflow-x-hidden pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        {children}
      </body>
    </html>
  );
}
