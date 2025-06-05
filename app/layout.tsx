import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { ThemeProvider } from "@/contexts/theme-context"
import { TypingSettingsProvider } from "@/contexts/typing-settings-context"
import { LanguageProvider, defaultLanguage } from "@/contexts/language-context"
import { Analytics } from "@vercel/analytics/react"

export const metadata: Metadata = {
  title: "泰披 Tappy",
  description: "수동적 읽기를 능동적 학습으로 변환하는 미니멀리스트 타이핑 연습",
  openGraph: {
    title: "泰披 Tappy",
    description: "수동적 읽기를 능동적 학습으로 변환하는 미니멀리스트 타이핑 연습",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002',
    siteName: "泰披 Tappy",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Tappy Typing Practice",
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "泰披 Tappy",
    description: "수동적 읽기를 능동적 학습으로 변환하는 미니멀리스트 타이핑 연습",
    images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002'}/og-image.png`],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang={cookies().get('language')?.value || defaultLanguage} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500&family=Noto+Sans+Mono:wght@300;400&family=Noto+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="theme-transition">
        <ThemeProvider>
          <LanguageProvider initialLanguage={cookies().get('language')?.value as any || defaultLanguage}>
            <TypingSettingsProvider>{children}</TypingSettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
