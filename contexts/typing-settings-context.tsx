"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { TypingSettings } from "@/types/typing"

// 타이핑 설정 인터페이스에 소리 테마 옵션 추가
const defaultSettings: TypingSettings = {
  fontSize: 18,
  fontFamily: "mono",
  showWpm: true,
  soundEnabled: false,
  soundVolume: 50, // 기본 볼륨을 50%로 설정
  soundTheme: "default", // 기본 테마를 실제 타건음으로 설정
  ignoreSymbols: true,
  autoAdvance: true,
  theme: "system",
}

type TypingSettingsContextType = {
  settings: TypingSettings
  updateSettings: (newSettings: Partial<TypingSettings>) => void
  resetSettings: () => void
}

const TypingSettingsContext = createContext<TypingSettingsContextType | undefined>(undefined)

export function TypingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TypingSettings>(defaultSettings)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("typingSettings")
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings({ ...defaultSettings, ...parsedSettings })
      } catch (error) {
        console.error("Error parsing saved settings:", error)
      }
    }
  }, [])

  // Save settings to localStorage when changed
  useEffect(() => {
    localStorage.setItem("typingSettings", JSON.stringify(settings))

    // Apply font settings to document
    document.documentElement.style.setProperty("--font-size", `${settings.fontSize}px`)

    // Apply theme
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark")
    } else if (settings.theme === "light") {
      document.documentElement.classList.remove("dark")
    } else {
      // System theme
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (prefersDark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }
  }, [settings])

  const updateSettings = (newSettings: Partial<TypingSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  const resetSettings = () => {
    setSettings(defaultSettings)
  }

  return (
    <TypingSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </TypingSettingsContext.Provider>
  )
}

export const useTypingSettings = () => {
  const context = useContext(TypingSettingsContext)
  if (context === undefined) {
    throw new Error("useTypingSettings must be used within a TypingSettingsProvider")
  }
  return context
}
