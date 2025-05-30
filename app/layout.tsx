import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { ThemeProvider } from "@/contexts/theme-context"
import { TypingSettingsProvider } from "@/contexts/typing-settings-context"
import { LanguageProvider } from "@/contexts/language-context"

export const metadata: Metadata = {
  title: "Transcribe - 미니멀 타이핑 연습",
  description: "하라 켄야의 디자인 원칙을 적용한 미니멀리스트 타이핑 연습 서비스",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
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
          <LanguageProvider>
            <TypingSettingsProvider>{children}</TypingSettingsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
