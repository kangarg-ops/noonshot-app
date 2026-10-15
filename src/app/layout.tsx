import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "noon Cafe Ordering | SHOT & NATIVE",
  description: "Official barista ordering portal for noon SHOT and NATIVE cafes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[#F8F6F2] text-gray-900">
        {children}
      </body>
    </html>
  );
}
