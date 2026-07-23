import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: { default: "TotalScope Intelligence", template: "%s | TotalScope Intelligence" },
    description: "Unified property intelligence for decisive insurance operations.",
    openGraph: { title: "TotalScope Intelligence", description: "See the entire risk. Act with precision.", images: ["/og.png"], type: "website" },
    twitter: { card: "summary_large_image", title: "TotalScope Intelligence", description: "See the entire risk. Act with precision.", images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body>{children}</body></html>;
}
