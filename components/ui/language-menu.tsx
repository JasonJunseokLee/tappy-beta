"use client"

import * as React from "react"
import { useLanguage } from "@/contexts/language-context"
import { Check, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LanguageMenu() {
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  
  // 클라이언트 사이드에서만 렌더링하기 위한 처리
  const [mounted, setMounted] = React.useState(false)

  // 외부 클릭 처리
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuRef])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // 언어 변경 핸들러
  const handleLanguageChange = (newLanguage: "ko" | "en") => {
    console.log(`Language change clicked: ${newLanguage}`);
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  if (!mounted) {
    return <div className="w-9 h-9" />
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full h-9 w-9 transition-all duration-500"
        aria-label={t("common.language")}
        aria-expanded={isOpen}
      >
        <Globe className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-500" />
        <span className="sr-only">{t("common.language")}</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-background border border-border rounded-md shadow-md z-50">
          <div className="py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 flex items-center justify-between"
              onClick={() => handleLanguageChange("ko")}
              type="button"
            >
              <span>{t("common.korean")}</span>
              {language === "ko" && <Check className="h-4 w-4 ml-2" />}
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 flex items-center justify-between"
              onClick={() => handleLanguageChange("en")}
              type="button"
            >
              <span>{t("common.english")}</span>
              {language === "en" && <Check className="h-4 w-4 ml-2" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
