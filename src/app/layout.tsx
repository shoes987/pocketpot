import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PocketPot | Invest in the Future",
  description:
    "PocketPot: A dual-access educational financial application for Key Stage 2 (KS2: Ages 7-11) built for school financial literacy and classroom engagement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={lexend.variable}>
      <body className="bg-canvas text-primaryText font-lexend text-body min-h-screen text-left antialiased selection:bg-brandPrimary/20 selection:text-primaryText">
        {children}
      </body>
    </html>
  );
}
