import type { Metadata } from "next";
import { AdminBodyClass } from "@/components/admin/AdminBodyClass";
import "../admin.css";

export const metadata: Metadata = {
  title: "AndresAI · Ops Console",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;800&family=Exo+2:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
      />
      <AdminBodyClass />
      <div className="dark admin-root">{children}</div>
    </>
  );
}
