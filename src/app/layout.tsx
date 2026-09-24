import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "noonSHOT Ordering",
  description: "Barista ordering system for noonSHOT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="bg-noonYellow text-noonBlack p-4 font-bold text-xl shadow-md">
          <div className="container mx-auto">noonSHOT Ordering</div>
        </header>
        <main className="container mx-auto p-4">{children}</main>
      </body>
    </html>
  );
}
