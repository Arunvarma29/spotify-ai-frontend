// Why this file exists
// ====================
//
// The frame every screen sits in: the sidebar on the left, the logged-in user's bar
// across the top, the screen underneath. Written once here so no screen has to
// think about layout, and none of them has to think about tokens at all - the
// console's own server signs every request (app/api/backend/[...path]/route.ts).

import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import SubjectBar from "@/components/SubjectBar";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Memory console",
  description:
    "Operator views over the Spotify personalized memory system: what is remembered, how it is ranked, and what reaches a prompt.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${dmSans.variable} app-shell flex min-h-screen antialiased`}>
        <Nav />
        <div className="flex min-w-0 flex-1 flex-col">
          <SubjectBar />
          <main className="min-w-0 flex-1 p-4 sm:p-6 xl:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
