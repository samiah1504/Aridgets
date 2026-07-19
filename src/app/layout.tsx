import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME ?? "Crift Shop",
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME ?? "Crift Shop"}`,
  },
  description: "High-converting COD sales pages for Nigeria.",
  robots: { index: false, follow: false },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
