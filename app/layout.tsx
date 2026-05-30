import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daikin Authorized Service Center",
  description:
    "Public service inquiries and internal quotation management for a Daikin Authorized Service Center."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
