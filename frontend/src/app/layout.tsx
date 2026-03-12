import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sadhya AI Mentor — Realistic AI Agronomist Avatar",
  description:
    "Talk to Sadhya, your realistic AI agronomist avatar powered by D-ID. Upload a farmer photo, speak in Telugu, and get expert farming advice with a lip-synced talking head video response.",
  keywords: ["AI avatar", "D-ID", "talking head", "agronomist", "Telugu", "Sarvam AI"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="te" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
