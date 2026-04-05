import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SessionWrapper from "@/components/SessionWrapper";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Command Center — TruePath Studios",
  description: "Business Operations Orchestration Platform",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <SessionWrapper>
          <div className="flex min-h-screen relative">
            {/* Diagonal watermark background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
              <div className="absolute inset-0 w-full h-full opacity-[0.03] flex items-center justify-center"
                style={{ transform: 'rotate(-30deg)' }}>
                <img src="/images/Logo.png" alt="" className="w-[80vw] max-w-[1200px]"
                  style={{ filter: 'brightness(0) invert(1)' }} />
              </div>
            </div>
            <Sidebar />
            <main className="flex-1 p-6 ml-20 overflow-auto relative z-[1]">
              {children}
            </main>
          </div>
        </SessionWrapper>
      </body>
    </html>
  );
}
