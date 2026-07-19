import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import { InstallAppButton } from "@/components/shared/InstallAppButton";

export const metadata: Metadata = {
  title: "AidooTech Hire Purchase",
  description: "Manage hire purchase sales and customer contracts",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hire Purchase",
  },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster />
        <ServiceWorkerRegister />
        <div className="fixed bottom-4 right-4 z-40">
          <InstallAppButton />
        </div>
      </body>
    </html>
  );
}
