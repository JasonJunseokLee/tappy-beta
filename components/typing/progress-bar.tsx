"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"

interface ProgressBarProps {
  progress: number
  cpm: number
  accuracy: number
  isCompleted: boolean
  netCpm: number
  showStats: boolean
  onToggleStats: () => void
}

export function ProgressBar({
  progress,
  cpm,
  accuracy,
  isCompleted,
  netCpm,
  showStats,
  onToggleStats,
}: ProgressBarProps) {
  const progressBarRef = useRef<HTMLDivElement>(null)

  return (
    <div className="w-full fixed top-[60px] left-0 right-0 z-40 bg-background/80 backdrop-blur-md transition-all duration-500 border-b border-border/10">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex justify-between items-center h-12">
          <div className="flex items-center space-x-4 text-sm font-light tracking-wide">
            {isCompleted ? (
              <span className="text-foreground/90 animate-pulse">완료됨</span>
            ) : (
              <span className="text-foreground/80">{Math.round(progress)}%</span>
            )}

            <span className="text-foreground/30">•</span>

            <span className="font-light tracking-wide text-foreground/80">
              {netCpm} <span className="text-xs text-foreground/50">순타/분</span>
            </span>
          </div>

          <div className="flex items-center space-x-8 text-sm">
            <span className="font-light tracking-wide text-foreground/80">
              {cpm} <span className="text-xs text-foreground/50">타/분</span>
            </span>
            <span className="text-foreground/30">•</span>
            <span className="font-light tracking-wide text-foreground/80">
              {accuracy}% <span className="text-xs text-foreground/50">정확도</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleStats}
              className="text-muted-foreground hover:text-foreground p-0 h-auto transition-colors"
            >
              {showStats ? "통계 숨기기" : "통계 보기"}
            </Button>
          </div>
        </div>
        <div className="w-full" ref={progressBarRef}>
          <div className="h-[2px] bg-background relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-foreground/40 via-foreground/60 to-foreground/40 transition-all duration-700 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  )
}
