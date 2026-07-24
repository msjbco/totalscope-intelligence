import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: { default: "TotalScope Intelligence", template: "%s | TotalScope Intelligence" },
    description: "Restoration estimating and property-claim intelligence for decisive operations.",
    openGraph: { title: "TotalScope Intelligence", description: "Turn every file into operational clarity.", images: ["/og.png"], type: "website" },
    twitter: { card: "summary_large_image", title: "TotalScope Intelligence", description: "Turn every file into operational clarity.", images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning><body>
    <Script id="theme-initializer" strategy="beforeInteractive">{`
      (() => {
        try {
          const saved = localStorage.getItem("totalscope-theme");
          const theme = saved === "light" || saved === "dark"
            ? saved
            : (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
          document.documentElement.dataset.theme = theme;
          document.documentElement.classList.toggle("dark", theme === "dark");
          document.documentElement.style.colorScheme = theme;
        } catch (_) {}
      })();
    `}</Script>
    {children}
    <ThemeToggle/>
  </body></html>;
}
