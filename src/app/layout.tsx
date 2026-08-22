import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XOLUM Sales",
  description: "Menos captura. Más ventas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
