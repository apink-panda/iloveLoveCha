import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/pado-love-wave.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title: "파도 i love LOVE Vocal Challenge",
    description: "跟著 01:28–01:59 的同步歌詞，一起完成 31 秒跟唱練習。",
    icons: {
      icon: "/icon.png",
      apple: "/icon.png",
    },
    openGraph: {
      title: "파도 i love LOVE Vocal Challenge",
      description: "戴上耳機，跟著亮起的歌詞完成 31 秒跟唱挑戰。",
      images: [{ url: socialImage, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "파도 i love LOVE Vocal Challenge",
      description: "31 秒，跟著浪唱進愛裡。",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
