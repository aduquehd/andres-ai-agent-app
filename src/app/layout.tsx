import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AndresAI Agent by aduquehd - Intelligent AI Assistant",
  description:
    "AndresAI Agent - An intelligent AI assistant designed to serve as a personal professional assistant.",
  keywords: ["AndresAI", "Andres AI", "AndresAI Agent", "Andres AI Agent", "aduquehd"],
  authors: [{ name: "aduquehd" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "https://andresai.aduquehd.com" },
  openGraph: {
    title: "AndresAI Agent by aduquehd - Intelligent AI Assistant",
    description:
      "AndresAI Agent by aduquehd - An intelligent AI assistant powered by advanced language models. Get help with coding, writing, analysis, and more through natural conversation.",
    type: "website",
    url: "https://andresai.aduquehd.com",
    images: ["/aduquehd-logo-sm.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AndresAI Agent by aduquehd - Intelligent AI Assistant",
    description:
      "AndresAI Agent by aduquehd - An intelligent AI assistant powered by advanced language models.",
    images: ["/aduquehd-logo-sm.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
