import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Friends Included · Finance Desk",
  description: "Wedding Guests for Hire — Day 4 finance system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
