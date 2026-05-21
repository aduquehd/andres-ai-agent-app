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
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Exo+2:wght@300;400;500;600&display=swap"
      />
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
