"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Settings, Home, List, Save, FileText, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import TextImportDialog from "@/components/text-import-dialog"
import TableOfContentsDialog from "@/components/table-of-contents-dialog"
import SettingsDialog from "@/components/settings-dialog"
import { useMobile } from "@/hooks/use-mobile"
import { validateAndFixChapterPositions, recalculateChapterPositions } from "@/utils/toc-utils"
import { toast } from "@/hooks/use-toast"
import { formatTextWithHeadings } from "@/utils/text-formatter"
import {
  splitTextByChapters,
  findCurrentChapter,
  calculateOverallProgress,
  findNextChapter,
  findPrevChapter,
} from "@/utils/chapter-utils"
import ChapterBasedTypingInterface from "@/components/chapter-based-typing-interface"
import type { ChapterInfo, ChapterBasedSession } from "@/types/typing"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ChapterPracticePage() {
  const router = useRouter()
  const isMobile = useMobile()
  const [text, setText] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [showTextImport, setShowTextImport] = useState<boolean>(false)
  const [showToc, setShowToc] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [chapters, setChapters] = useState<ChapterInfo[]>([])
  const [currentChapterId, setCurrentChapterId] = useState<string>("")
  const [overallProgress, setOverallProgress] = useState<number>(0)
  const [isRecalculatingToc, setIsRecalculatingToc] = useState<boolean>(false)

  // 운영체제에 따른 단축키 표시 (Mac은 ⌘, 다른 OS는 Ctrl)
  const isMac = typeof navigator !== "undefined" ? navigator.platform.toUpperCase().indexOf("MAC") >= 0 : false
  const modifierKey = isMac ? "⌘" : "Ctrl"

  // Load saved session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("chapterBasedSession")
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession) as ChapterBasedSession
        setText(session.title || "")
        setTitle(session.title || "")
        setChapters(session.chapters || [])
        setCurrentChapterId(session.currentChapterIndex ? session.chapters[session.currentChapterIndex]?.id : "")
        setOverallProgress(session.overallProgress || 0)
      } catch (error) {
        console.error("Error loading saved session:", error)
        // Show text selection dialog if error loading session
        setShowTextImport(true)
      }
    } else {
      // Show text selection dialog if no saved session
      setShowTextImport(true)
    }
  }, [])

  // 현재 챕터 가져오기
  const currentChapter =
    chapters.length > 0 && currentChapterId
      ? findCurrentChapter(
          0,
          chapters.filter((c) => c.id === currentChapterId),
        )
      : chapters.length > 0
        ? chapters[0]
        : null

  // 챕터 완료 처리
  const handleChapterComplete = useCallback(
    (chapterId: string) => {
      setChapters((prevChapters) => {
        // 챕터 완료 상태 업데이트
        const updatedChapters = prevChapters.map((chapter) => {
          if (chapter.id === chapterId) {
            return { ...chapter, completed: true }
          }
          return chapter
        })

        // 전체 진행도 계산
        const newProgress = calculateOverallProgress(updatedChapters)
        setOverallProgress(newProgress)

        // 세션 저장
        const currentChapterIndex = updatedChapters.findIndex((c) => c.id === chapterId)
        const session: ChapterBasedSession = {
          title,
          chapters: updatedChapters,
          currentChapterIndex,
          overallProgress: newProgress,
          lastPosition: 0,
        }
        localStorage.setItem("chapterBasedSession", JSON.stringify(session))

        return updatedChapters
      })
    },
    [title],
  )

  // 챕터 이동 처리
  const handleNavigateToChapter = useCallback(
    (chapterId: string) => {
      setCurrentChapterId(chapterId)

      // 세션 저장
      const currentChapterIndex = chapters.findIndex((c) => c.id === chapterId)
      const session: ChapterBasedSession = {
        title,
        chapters,
        currentChapterIndex,
        overallProgress,
        lastPosition: 0,
      }
      localStorage.setItem("chapterBasedSession", JSON.stringify(session))

      toast({
        title: "챕터 이동",
        description: `"${chapters.find((c) => c.id === chapterId)?.title}" 챕터로 이동했습니다.`,
      })
    },
    [chapters, title, overallProgress],
  )

  const handleImportText = (importedText: string, importedTitle: string, importedChapters: ChapterInfo[]) => {
    try {
      // 텍스트에서 제목을 인식하고 포맷팅 적용
      const formattedText = formatTextWithHeadings(importedText)

      // 목차 위치 검증 및 수정
      const validatedChapters = validateAndFixChapterPositions(importedChapters, formattedText)

      // 목차 기반으로 텍스트 분할
      const chaptersWithContent = splitTextByChapters(formattedText, validatedChapters)

      // 상태 초기화
      setText(formattedText)
      setTitle(importedTitle)
      setChapters(chaptersWithContent)
      setCurrentChapterId(chaptersWithContent.length > 0 ? chaptersWithContent[0].id : "")
      setOverallProgress(0)
      setShowTextImport(false)

      // 세션 저장
      const session: ChapterBasedSession = {
        title: importedTitle,
        chapters: chaptersWithContent,
        currentChapterIndex: 0,
        overallProgress: 0,
        lastPosition: 0,
      }
      localStorage.setItem("chapterBasedSession", JSON.stringify(session))

      toast({
        title: "텍스트 가져오기 완료",
        description: `${chaptersWithContent.length}개의 챕터로 분할되었습니다.`,
      })
    } catch (error) {
      console.error("Error importing text:", error)
      toast({
        title: "텍스트 가져오기 실패",
        description: "오류가 발생했습니다. 콘솔을 확인하세요.",
        variant: "destructive",
      })
    }
  }

  const handleSelectSampleText = (sampleText: string, sampleTitle: string) => {
    try {
      // 텍스트에서 제목을 인식하고 포맷팅 적용
      const formattedText = formatTextWithHeadings(sampleText)

      // 텍스트에서 목차 추출
      const extractedChapters = recalculateChapterPositions([], formattedText)

      // 목차 기반으로 텍스트 분할
      const chaptersWithContent = splitTextByChapters(formattedText, extractedChapters)

      // 상태 초기화
      setText(formattedText)
      setTitle(sampleTitle)
      setChapters(chaptersWithContent)
      setCurrentChapterId(chaptersWithContent.length > 0 ? chaptersWithContent[0].id : "")
      setOverallProgress(0)
      setShowTextImport(false)

      // 세션 저장
      const session: ChapterBasedSession = {
        title: sampleTitle,
        chapters: chaptersWithContent,
        currentChapterIndex: 0,
        overallProgress: 0,
        lastPosition: 0,
      }
      localStorage.setItem("chapterBasedSession", JSON.stringify(session))

      toast({
        title: "샘플 텍스트 가져오기 완료",
        description: `${chaptersWithContent.length}개의 챕터로 분할되었습니다.`,
      })
    } catch (error) {
      console.error("Error importing sample text:", error)
      toast({
        title: "샘플 텍스트 가져오기 실패",
        description: "오류가 발생했습니다. 콘솔을 확인하세요.",
        variant: "destructive",
      })
    }
  }

  const saveSession = () => {
    // 세션 저장
    const currentChapterIndex = chapters.findIndex((c) => c.id === currentChapterId)
    const session: ChapterBasedSession = {
      title,
      chapters,
      currentChapterIndex,
      overallProgress,
      lastPosition: 0,
    }
    localStorage.setItem("chapterBasedSession", JSON.stringify(session))

    toast({
      title: "세션 저장됨",
      description: "현재 진행 상황이 저장되었습니다.",
    })
  }

  // Keyboard shortcuts - 변경된 부분
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Save session
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        saveSession()
      }
      // Ctrl/Cmd + T: Toggle table of contents
      else if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault()
        setShowToc((prev) => !prev)
      }
      // Ctrl/Cmd + ,: Toggle settings
      else if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault()
        setShowSettings((prev) => !prev)
      }
      // Ctrl/Cmd + O: Open import dialog
      else if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault()
        setShowTextImport((prev) => !prev)
      }
      // Cmd/Ctrl + Alt + Right: 다음 챕터
      else if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === "ArrowRight" && currentChapter) {
        e.preventDefault()
        const nextChapter = findNextChapter(currentChapter.id, chapters)
        if (nextChapter) {
          handleNavigateToChapter(nextChapter.id)
        }
      }
      // Cmd/Ctrl + Alt + Left: 이전 챕터
      else if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === "ArrowLeft" && currentChapter) {
        e.preventDefault()
        const prevChapter = findPrevChapter(currentChapter.id, chapters)
        if (prevChapter) {
          handleNavigateToChapter(prevChapter.id)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [chapters, currentChapter, handleNavigateToChapter])

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-theme">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border py-4 bg-background/95 backdrop-blur-md transition-theme">
        <div className="flex justify-center w-full mx-auto">
          <div
            style={{ width: "min(95vw, 1600px)", maxWidth: "1600px", minWidth: "800px" }}
            className="flex justify-between items-center px-4"
          >
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                aria-label="Home"
                className="rounded-full h-9 w-9"
              >
                <Home className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-light tracking-tight truncate max-w-[200px] md:max-w-md">
                {title || "제목 없음"}
              </h1>
            </div>

            <div className="flex items-center space-x-6">
              <ThemeToggle />

              <div className="flex items-center space-x-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTextImport(true)}
                  aria-label="텍스트"
                  title="텍스트 가져오기"
                  className="rounded-full h-9 w-9"
                >
                  <BookOpen className="h-5 w-5" />
                </Button>

                {chapters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowToc(true)}
                    aria-label="목차"
                    title="목차"
                    className="rounded-full h-9 w-9"
                  >
                    <List className="h-5 w-5" />
                  </Button>
                )}

                {chapters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={saveSession}
                    aria-label="저장"
                    title="저장"
                    className="rounded-full h-9 w-9"
                  >
                    <Save className="h-5 w-5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  aria-label="설정"
                  title="설정"
                  className="rounded-full h-9 w-9"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 전체 진행률 표시 */}
      <div className="fixed top-[60px] left-0 right-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex justify-between items-center h-12">
            <div className="text-sm font-light tracking-wide text-foreground/80">
              전체 진행률: {Math.round(overallProgress)}%
            </div>
          </div>
          <div className="w-full">
            <div className="h-[2px] bg-background relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-foreground/40 via-foreground/60 to-foreground/40 transition-all duration-700 ease-in-out"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-background to-background/95 transition-all duration-300 pt-[120px]">
        {/* 배경 장식 요소 추가 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-gradient-radial from-accent/20 to-transparent opacity-30 blur-3xl"></div>
          <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-gradient-radial from-accent/20 to-transparent opacity-30 blur-3xl"></div>
        </div>

        {/* 콘텐츠 컨테이너 */}
        <div className="relative w-full max-w-[1600px] z-10 px-4 py-8 animate-fade-in">
          {currentChapter ? (
            <ChapterBasedTypingInterface
              chapter={currentChapter}
              onChapterComplete={handleChapterComplete}
              onNavigateToChapter={handleNavigateToChapter}
              allChapters={chapters}
            />
          ) : (
            <div className="text-center space-y-8 max-w-md mx-auto p-4 bg-background/50 backdrop-blur-sm rounded-xl border border-border/30 shadow-sm">
              <div className="h-16 w-16 mx-auto border border-border rounded-full flex items-center justify-center bg-background/80">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-light tracking-tight">텍스트를 선택하세요</h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                샘플 텍스트를 선택하거나 직접 텍스트를 가져와 타이핑 연습을 시작하세요.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => setShowTextImport(true)}
                  className="rounded-full px-8 py-6 bg-foreground text-background hover:bg-foreground/90 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  시작하기
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dialogs */}
      <TextImportDialog
        open={showTextImport}
        onOpenChange={setShowTextImport}
        onImport={handleImportText}
        onSelectSample={handleSelectSampleText}
      />

      <TableOfContentsDialog
        open={showToc}
        onOpenChange={setShowToc}
        chapters={chapters}
        currentPosition={0}
        onJumpToChapter={(position) => {
          // 위치에 해당하는 챕터 찾기
          const chapter = findCurrentChapter(position, chapters)
          if (chapter) {
            handleNavigateToChapter(chapter.id)
          }
        }}
        text={text}
      />

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}
