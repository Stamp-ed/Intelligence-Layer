import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { Navigation } from "@/components/layout/Navigation";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import "./globals.css";

const themeInitScript = `
(function () {
  try {
    var k = "stamped-theme";
    var t = localStorage.getItem(k);
    var dark = t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {}
})();
`;

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
    <html lang="en" className={playfair.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Navigation />
          <main className="w-full px-5 py-8 sm:px-8 lg:px-10 xl:px-12">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
