"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronRight, ChevronDown, Search, AlertCircle, CheckCircle2, RefreshCw, FileText, Save } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useState, useEffect, useRef } from "react"
import type { ChapterInfo } from "@/types/typing"
import { Input } from "@/components/ui/input"
import { flattenTableOfContents } from "@/utils/toc-utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

// 인터페이스에 text 속성 추가
interface TableOfContentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chapters: ChapterInfo[]
  currentPosition: number
  onJumpToChapter: (position: number) => void
  text: string
  completedChapters?: string[]
  onRecalculateToc?: () => void
  onFormatText?: () => void
  onSaveSession?: () => void
  isRecalculatingToc?: boolean
}

export default function TableOfContentsDialog({
  open,
  onOpenChange,
  chapters,
  currentPosition,
  onJumpToChapter,
  text,
  completedChapters = [],
  onRecalculateToc,
  onFormatText,
  onSaveSession,
  isRecalculatingToc,
}: TableOfContentsDialogProps) {
  const { t, language } = useLanguage()
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filteredChapters, setFilteredChapters] = useState<ChapterInfo[]>([])
  const [invalidPositions, setInvalidPositions] = useState<boolean>(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 목차 위치 유효성 검사
  useEffect(() => {
    if (open && chapters.length > 0 && text) {
      const flatChapters = flattenTableOfContents(chapters)
      const hasInvalid = flatChapters.some(
        (chapter) => chapter.position === undefined || chapter.position < 0 || chapter.position >= text.length,
      )
      setInvalidPositions(hasInvalid)

      if (hasInvalid) {
        console.warn("Some chapter positions are invalid or out of text bounds")
      }
    }
  }, [open, chapters, text])

  // 현재 위치에 해당하는 챕터 찾기
  const getCurrentChapter = (): ChapterInfo | null => {
    if (!chapters.length) return null

    const flatChapters = flattenTableOfContents(chapters)

    // 현재 위치보다 작거나 같은 위치 중 가장 가까운 챕터 찾기
    let closestChapter: ChapterInfo | null = null
    let minDistance = Number.MAX_SAFE_INTEGER

    for (const chapter of flatChapters) {
      if (chapter.position <= currentPosition) {
        const distance = currentPosition - chapter.position
        if (distance < minDistance) {
          minDistance = distance
          closestChapter = chapter
        }
      }
    }

    return closestChapter
  }

  // 현재 챕터
  const currentChapter = getCurrentChapter()

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChapters(chapters)
      return
    }

    const query = searchQuery.toLowerCase()
    const flat = flattenTableOfContents(chapters)
    const filtered = flat.filter((chapter) => chapter.title.toLowerCase().includes(query))

    setFilteredChapters(filtered)
  }, [searchQuery, chapters])

  // 대화상자가 열릴 때 검색 입력란에 포커스
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // 대화상자가 열릴 때 현재 챕터 확장
  useEffect(() => {
    if (open && currentChapter) {
      // 의존성 배열에서 expandedChapters를 제거하고 함수형 업데이트 사용
      setExpandedChapters((prev) => {
        // 이미 확장되어 있으면 다시 확장하지 않음
        if (prev[currentChapter.id]) return prev

        // 새로운 객체 생성
        const newExpandedChapters = { ...prev }
        newExpandedChapters[currentChapter.id] = true
        return newExpandedChapters
      })
    }
  }, [open, currentChapter]) // expandedChapters 의존성 제거

  // 챕터 확장/축소 토글
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }))
  }

  // 챕터 클릭 처리
  const handleChapterClick = (chapter: ChapterInfo) => {
    console.log(`Clicked chapter at position: ${chapter.position}, title: ${chapter.title}`)

    // 위치가 undefined인 경우 처리
    if (chapter.position === undefined) {
      console.error("Chapter position is undefined:", chapter)
      return
    }

    // 유효한 위치 범위 확인 (텍스트 길이를 초과하지 않도록)
    const validPosition = Math.min(Math.max(0, chapter.position), text.length - 1)

    if (validPosition !== chapter.position) {
      console.warn(`Adjusted chapter position from ${chapter.position} to ${validPosition}`)
    }

    // 대화상자 닫기
    onOpenChange(false)

    // 약간의 지연 후 이동 (UI가 업데이트될 시간 제공)
    setTimeout(() => {
      console.log(`Jumping to chapter position: ${validPosition}`)
      onJumpToChapter(validPosition)
    }, 100)
  }

  // 챕터 렌더링 함수 (재귀적)
  const renderChapter = (chapter: ChapterInfo, isFiltered = false) => {
    const hasChildren = chapter.children && chapter.children.length > 0
    const isExpanded = expandedChapters[chapter.id]
    const isActive = currentChapter?.id === chapter.id
    const isCompleted = completedChapters.includes(chapter.id)

    // 위치 유효성 검사
    const isInvalidPosition = chapter.position === undefined || chapter.position < 0 || chapter.position >= text.length

    return (
      <div key={chapter.id} className="mb-1">
        <div className="flex items-center">
          {hasChildren && !isFiltered ? (
            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 mr-1" onClick={() => toggleChapter(chapter.id)}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-7"></div> // 공간 유지를 위한 빈 div
          )}

          <Button
            variant="ghost"
            className={`w-full justify-start text-left pl-0 ${
              isActive ? "bg-accent/20 text-accent-foreground font-medium" : ""
            } ${isInvalidPosition ? "text-muted-foreground/70" : ""}`}
            onClick={() => handleChapterClick(chapter)}
            disabled={isInvalidPosition}
          >
            <span
              className={`truncate ${isCompleted ? "text-green-500" : ""}`}
              style={{
                paddingLeft: isFiltered ? 0 : `${(chapter.level - 1) * 12}px`,
              }}
            >
              {chapter.title}
            </span>

            {isCompleted && <CheckCircle2 className="h-4 w-4 ml-2 text-green-500" />}
            {isInvalidPosition && <AlertCircle className="h-3 w-3 ml-2 text-muted-foreground/70" />}
          </Button>
        </div>

        {hasChildren && isExpanded && !isFiltered && (
          <div className="ml-6">{chapter.children!.map((child) => renderChapter(child))}</div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{language === "ko" ? "목차" : "Table of Contents"}</DialogTitle>
        </DialogHeader>

        {invalidPositions && (
          <Alert variant="destructive" className="mb-4 py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {language === "ko" ? "목차 위치가 유효하지 않습니다. 목차를 재계산하세요." : "Invalid TOC positions. Please recalculate the table of contents."}
            </AlertDescription>
          </Alert>
        )}

        <div className="relative mb-4">
          <Input
            ref={searchInputRef}
            placeholder={language === "ko" ? "목차 검색..." : "Search table of contents..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-8"
          />
          <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        {chapters.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-1">
              {searchQuery.trim()
                ? // 검색 결과 표시 (평탄화된 목록)
                  filteredChapters.map((chapter) => renderChapter(chapter, true))
                : // 계층 구조로 표시
                  chapters.map((chapter) => renderChapter(chapter))}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-4 text-center text-muted-foreground">{language === "ko" ? "목차를 찾을 수 없습니다" : "No table of contents found"}</div>
        )}

        {/* 완료 상태 표시 */}
        {chapters.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between text-sm">
              <span>{language === "ko" ? "완료된 챕터:" : "Completed Chapters:"}</span>
              <span className="font-medium">
                {completedChapters.length}/{flattenTableOfContents(chapters).length}
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{
                  width: `${(completedChapters.length / Math.max(flattenTableOfContents(chapters).length, 1)) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        )}
        {/* 기능 버튼 영역 */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-2 justify-center">
            {onRecalculateToc && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecalculateToc}
                disabled={isRecalculatingToc}
                className="text-xs px-3"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRecalculatingToc ? "animate-spin" : ""}`} />
                {language === "ko" ? "목차 재계산" : "Recalculate TOC"}
              </Button>
            )}

            {onFormatText && (
              <Button variant="outline" size="sm" onClick={onFormatText} className="text-xs px-3">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                {language === "ko" ? "텍스트 포맷팅" : "Text Formatting"}
              </Button>
            )}
            
            {onSaveSession && (
              <Button variant="outline" size="sm" onClick={onSaveSession} className="text-xs px-3">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {language === "ko" ? "저장" : "Save"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
