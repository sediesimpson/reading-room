import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "the reading room",
  description: "one article a day, picked by a wheel, read together",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} antialiased`}>
      <body className="font-sans">
        <div className="mx-auto w-full max-w-[680px] px-4 pb-16">
          <Header />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
