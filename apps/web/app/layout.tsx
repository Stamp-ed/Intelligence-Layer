import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { Navigation } from "@/components/layout/Navigation";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Stamped Intelligence",
  description: "Internal organizational knowledge and retrieval",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>
        <Navigation />
        <main className="w-full px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
          {children}
        </main>
      </body>
    </html>
  );
}
