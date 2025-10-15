import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import Providers from './Providers'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fleet Management",
  description: "Transport and Fleet Management Solution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body 
        className={`${inter.className} min-h-full bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100`}
        suppressHydrationWarning={true}
      >
        <div className="w-full px-2 sm:px-4 lg:px-0">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}