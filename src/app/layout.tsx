import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CNV Learning",
  description:
    "Plataforma de aprendizaje de Connected Nutrition Ventures. Diplomado en Medicina Bioeléctrica y Sistema ANI BIS-E.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn(
        "h-full antialiased",
        montserrat.variable,
        inter.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
