import type { Metadata } from "next";
import Script from "next/script";
import "../chat.css";

export const metadata: Metadata = {
  title: "AndresAI Agent by aduquehd - Intelligent AI Assistant",
  description:
    "AndresAI Agent by aduquehd - An intelligent AI assistant powered by advanced language models. Get help with coding, writing, analysis, and more through natural conversation.",
};

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID;

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Fonts are self-hosted via next/font in the root layout — no external
          Google Fonts request needed here. */}
      {GA_TRACKING_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}');
          `}</Script>
        </>
      ) : null}
      {children}
    </>
  );
}
