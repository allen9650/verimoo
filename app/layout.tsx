import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers";
import { ThemeProvider, themeInitScript } from "./theme-provider";
import { ChangelogModal } from "@/components/changelog-modal";

const inter = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext", "greek", "greek-ext", "vietnamese", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VeriMoo — Certificate Management & Verification",
  description: "Create, manage, and verify digital certificates for webinars, workshops, training, and more.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/verimoo.png", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/verimoo.png",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VeriMoo",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Sets the `.dark` class before paint so there's no light-mode flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="VeriMoo" />
        <link rel="icon" href="/verimoo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.className} font-sans min-h-screen bg-[#F8FAFC] dark:bg-black text-[#111827] dark:text-[#F8FAFC] antialiased`}>
        <Providers>
          <ThemeProvider>
            {children}
            <ChangelogModal />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
