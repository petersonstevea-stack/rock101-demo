import type { Metadata } from "next";
import { Oswald, Roboto, Big_Shoulders, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-big-shoulders",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["900"],
  style: ["italic"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: "STAGE READY",
  description: "School of Rock Rock 101 progress tracking app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${oswald.variable} ${roboto.variable} ${bigShoulders.variable} ${barlowCondensed.variable} bg-black text-white`}>
        {children}
      </body>
    </html>
  );
}