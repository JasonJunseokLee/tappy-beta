import type { TypingStats } from "@/types/typing"

interface DetailedStatsProps {
  stats: TypingStats
  currentLineIndex: number
  totalLines: number
  startTime: number | null
  showStats: boolean
}

export function DetailedStats({ stats, currentLineIndex, totalLines, startTime, showStats }: DetailedStatsProps) {
  if (!showStats) return null

  return (
    <div className="mt-8 p-6 border-t border-border animate-fade-in">
      <h3 className="text-sm font-medium mb-6 text-muted-foreground">상세 통계</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-2">완료한 줄</p>
          <p className="text-xl font-light">
            {currentLineIndex} / {totalLines}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">타수</p>
          <div>
            <p className="text-xl font-light">{stats.cpm} 타/분</p>
            <p className="text-xs text-muted-foreground">({stats.wpm} WPM)</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">순 타수</p>
          <div>
            <p className="text-xl font-light">{stats.netCpm} 타/분</p>
            <p className="text-xs text-muted-foreground">({stats.netWpm} WPM)</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">오류/수정</p>
          <p className="text-xl font-light">
            {stats.errorCount}/{stats.correctionCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">정확도</p>
          <p className="text-xl font-light">{stats.accuracy}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">시간</p>
          <p className="text-xl font-light">{startTime ? Math.round((Date.now() - startTime) / 1000) : 0}초</p>
        </div>
      </div>
    </div>
  )
}
