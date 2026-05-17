import type { Metadata } from "next";
import { Navigation } from "@/components/layout/Navigation";
import "./globals.css";

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
    <html lang="en">
      <body>
        <Navigation />
        <main className="mx-auto max-w-content px-6 py-10 md:px-12">
          {children}
        </main>
      </body>
    </html>
  );
}
