import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Old Stables — Browser Playtest",
  description:
    "Play the Old Stables brewery-management vertical slice in your browser.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
