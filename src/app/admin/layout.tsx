import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { AdminBodyClass } from "@/components/admin/AdminBodyClass";
import "../admin.css";

// Self-hosted via next/font (like Orbitron/Exo 2 in the root layout) instead of
// a render-blocking Google Fonts <link>. Variable font, so no pinned weights.
// Exposed as a CSS variable consumed by admin.css.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "AndresAI · Ops Console",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminBodyClass fontClassName={jetbrainsMono.variable} />
      <div className={`dark admin-root ${jetbrainsMono.variable}`}>{children}</div>
    </>
  );
}
