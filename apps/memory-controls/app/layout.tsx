// Why this file exists
// ====================
//
// The frame for the listener-facing app. Deliberately plainer than the console:
// no sidebar, no subject picker, no operator language.
//
// abc.md:253 names this app "Review, correction, deletion UI", and the Product
// Design Lead in the transcript is specific about the tone: "Users should not see
// a technical graph. They need a clear experience: 'Spotify remembered this
// preference,' with the ability to correct or remove it."

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Your memory controls",
  description:
    "Review, correct, remove or pause what Spotify's AI remembers about you.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${dmSans.variable} min-h-full antialiased`}>
        <header className="listener-header">
          <div className="listener-brand">
            <span className="brand-mark" aria-hidden="true">M</span>
            <div>
              <p className="eyebrow">Your personal space</p>
              <h1>Your memory controls</h1>
            </div>
          </div>
          <p className="listener-header-copy">
            Review, correct, or remove what the assistant remembers about you.
            You can pause memory whenever you like.
          </p>
        </header>
        <main className="listener-main">{children}</main>
      </body>
    </html>
  );
}
