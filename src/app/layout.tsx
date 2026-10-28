import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VDC Comunidade | Gestão da igreja",
  description:
    "Gestão financeira, patrimônio, agenda e cuidado com as pessoas da igreja.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
