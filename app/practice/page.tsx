"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Settings, Home, List, FileText, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import TextImportDialog from "@/components/text-import-dialog"
import ChapterBasedTypingInterface from "@/components/chapter-based-typing-interface"
import TableOfContentsDialog from "@/components/table-of-contents-dialog"
import SettingsDialog from "@/components/settings-dialog"
import { useMobile } from "@/hooks/use-mobile"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLanguage } from "@/contexts/language-context"
import { validateAndFixChapterPositions, recalculateChapterPositions, flattenTableOfContents } from "@/utils/toc-utils"
import { toast } from "@/hooks/use-toast"
import { formatTextWithHeadings } from "@/utils/text-formatter"
import { findCurrentChapter, splitTextByChapters } from "@/utils/chapter-utils"
import type { ChapterInfo } from "@/types/typing"

export default function PracticePage() {
  const { t } = useLanguage()
  const router = useRouter()
  const isMobile = useMobile()
  const [text, setText] = useState<string>("")
  const [title, setTitle] = useState<string>("")
  const [currentPosition, setCurrentPosition] = useState<number>(0)
  const [showTextImport, setShowTextImport] = useState<boolean>(false)
  const [showToc, setShowToc] = useState<boolean>(false)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [chapters, setChapters] = useState<ChapterInfo[]>([])
  const [isRecalculatingToc, setIsRecalculatingToc] = useState<boolean>(false)
  const [currentChapter, setCurrentChapter] = useState<ChapterInfo | null>(null)
  const [completedChapters, setCompletedChapters] = useState<string[]>([])

  // 텍스트 로딩 상태 추적
  const [isTextLoaded, setIsTextLoaded] = useState<boolean>(false)

  // 디버깅 상태 추가
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Load saved session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem("typingSession")
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        setText(session.text || "")
        setTitle(session.title || "")
        setCurrentPosition(session.position || 0)
        setCompletedChapters(session.completedChapters || [])
        setIsTextLoaded(true)

        // 목차 위치 검증 및 수정
        if (session.text && session.chapters && session.chapters.length > 0) {
          // 챕터 내용 분할 처리
          const processedChapters = splitTextByChapters(session.text, session.chapters, t("common.fullText"))
          setChapters(processedChapters)

          // 현재 위치에 해당하는 챕터 찾기
          const chapter = findCurrentChapter(session.position || 0, processedChapters)
          setCurrentChapter(chapter)

          // 디버깅 정보 설정
          setDebugInfo(
            `세션 로드: 텍스트 길이=${session.text.length}, 챕터 수=${processedChapters.length}, 현재 챕터=${chapter?.title || "없음"}`,
          )
        } else {
          setChapters(session.chapters || [])

          // 디버깅 정보 설정
          setDebugInfo(`세션 로드: 텍스트 길이=${session.text?.length || 0}, 챕터 없음`)

          // 텍스트만 있고 챕터가 없는 경우 기본 챕터 생성
          if (session.text && (!session.chapters || session.chapters.length === 0)) {
            const defaultChapter: ChapterInfo = {
              id: "default",
              title: "전체 텍스트",
              position: 0,
              level: 1,
              content: session.text,
            }
            setChapters([defaultChapter])
            setCurrentChapter(defaultChapter)
          }
        }
      } catch (error) {
        console.error("Error loading saved session:", error)
        setDebugInfo(`세션 로드 오류: ${error}`)
        // Show text selection dialog if error loading session
        setShowTextImport(true)
      }
    } else {
      // Show text selection dialog if no saved session
      setShowTextImport(true)
    }
  }, [])

  // 현재 위치가 변경될 때 현재 챕터 업데이트
  useEffect(() => {
    if (text && chapters.length > 0) {
      const chapter = findCurrentChapter(currentPosition, chapters)
      setCurrentChapter(chapter)

      // 디버깅 정보 업데이트
      setDebugInfo(`위치 변경: 현재 위치=${currentPosition}, 현재 챕터=${chapter?.title || "없음"}`)
    }
  }, [currentPosition, chapters, text])

  // Save session when text or position changes
  useEffect(() => {
    if (text) {
      const session = {
        text,
        title,
        position: currentPosition,
        chapters,
        completedChapters,
      }
      localStorage.setItem("typingSession", JSON.stringify(session))

      // Calculate progress
      if (text.length > 0) {
        setProgress((currentPosition / text.length) * 100)
      }
    }
  }, [text, currentPosition, title, chapters, completedChapters])

  const handleImportText = (
    importedText: string,
    importedTitle: string,
    importedChapters: { title: string; position: number; level: number; id: string }[],
  ) => {
    try {
      // 텍스트에서 제목을 인식하고 포맷팅 적용
      const formattedText = formatTextWithHeadings(importedText)

      // 목차 위치 검증 및 수정 - 텍스트 내용 기반으로 위치 재계산
      const validatedChapters = validateAndFixChapterPositions(importedChapters, formattedText)

      // 챕터 내용 분할 처리
      const processedChapters = splitTextByChapters(formattedText, validatedChapters, t("common.fullText"))

      // 챕터가 없는 경우 기본 챕터 생성
      let finalChapters = processedChapters
      if (!processedChapters || processedChapters.length === 0) {
        const defaultChapter: ChapterInfo = {
          id: "default",
          title: t("common.fullText"),
          position: 0,
          level: 1,
          content: formattedText,
        }
        finalChapters = [defaultChapter]
      }

      // 상태 초기화
      setText(formattedText)
      setTitle(importedTitle)
      setCurrentPosition(0)
      setChapters(finalChapters)
      setCompletedChapters([])
      setShowTextImport(false)
      setIsTextLoaded(true)

      // 현재 챕터 설정
      const chapter = findCurrentChapter(0, finalChapters) || finalChapters[0]
      setCurrentChapter(chapter)

      // 디버깅 정보 설정
      setDebugInfo(
        `텍스트 가져오기: 텍스트 길이=${formattedText.length}, 챕터 수=${finalChapters.length}, 현재 챕터=${chapter?.title || "없음"}`,
      )

      // 세션 저장 데이터 초기화 및 저장
      const session = {
        text: formattedText,
        title: importedTitle,
        position: 0,
        chapters: finalChapters,
        completedChapters: [],
      }
      localStorage.setItem("typingSession", JSON.stringify(session))

      toast({
        title: "텍스트 가져오기 완료",
        description: `${finalChapters.length}개의 목차 항목이 있습니다.`,
      })
    } catch (error) {
      console.error("Error importing text:", error)
      setDebugInfo(`텍스트 가져오기 오류: ${error}`)
      toast({
        title: "텍스트 가져오기 실패",
        description: "오류가 발생했습니다. 콘솔을 확인하세요.",
        variant: "destructive",
      })
    }
  }

  const handleSelectSampleText = (sampleText: string, sampleTitle: string) => {
    try {
      // 상태 초기화
      setText(sampleText)
      setTitle(sampleTitle)
      setCurrentPosition(0)
      setCompletedChapters([])
      setShowTextImport(false)
      setIsTextLoaded(true)

      // 샘플 텍스트에 대한 기본 챕터 생성
      const defaultChapter: ChapterInfo = {
        id: "default",
        title: "전체 텍스트",
        position: 0,
        level: 1,
        content: sampleText,
      }

      setChapters([defaultChapter])
      setCurrentChapter(defaultChapter)

      // 디버깅 정보 설정
      setDebugInfo(`샘플 텍스트: 텍스트 길이=${sampleText.length}, 기본 챕터 생성됨`)

      // 세션 저장 데이터 초기화 및 저장
      const session = {
        text: sampleText,
        title: sampleTitle,
        position: 0,
        chapters: [defaultChapter],
        completedChapters: [],
      }
      localStorage.setItem("typingSession", JSON.stringify(session))

      toast({
        title: "샘플 텍스트 가져오기 완료",
        description: "타이핑을 시작하세요.",
      })
    } catch (error) {
      console.error("Error selecting sample text:", error)
      setDebugInfo(`샘플 텍스트 선택 오류: ${error}`)
      toast({
        title: "샘플 텍스트 가져오기 실패",
        description: "오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handlePositionChange = (newPosition: number) => {
    setCurrentPosition(newPosition)
  }

  // 목차 위치 재계산 함수
  const recalculateTocPositions = useCallback(() => {
    if (!text || chapters.length === 0) {
      toast({
        title: "목차 재계산 실패",
        description: "텍스트나 목차가 없습니다.",
        variant: "destructive",
      })
      return
    }

    setIsRecalculatingToc(true)

    // 비동기 처리를 위한 setTimeout 사용
    setTimeout(() => {
      try {
        // 목차 위치 재계산
        const recalculatedChapters = recalculateChapterPositions(chapters, text)

        // 챕터 내용 분할 처리
        const processedChapters = splitTextByChapters(text, recalculatedChapters, t("common.fullText"))

        setChapters(processedChapters)

        // 현재 위치에 해당하는 챕터 업데이트
        const chapter = findCurrentChapter(currentPosition, processedChapters)
        setCurrentChapter(chapter)

        // 디버깅 정보 업데이트
        setDebugInfo(`목차 재계산: 챕터 수=${processedChapters.length}, 현재 챕터=${chapter?.title || "없음"}`)

        // 세션 저장
        const session = {
          text,
          title,
          position: currentPosition,
          chapters: processedChapters,
          completedChapters,
        }
        localStorage.setItem("typingSession", JSON.stringify(session))

        toast({
          title: "목차 재계산 완료",
          description: `${processedChapters.length}개의 목차 항목이 업데이트되었습니다.`,
        })
      } catch (error) {
        console.error("Error recalculating TOC positions:", error)
        setDebugInfo(`목차 재계산 오류: ${error}`)
        toast({
          title: "목차 재계산 실패",
          description: "오류가 발생했습니다. 콘솔을 확인하세요.",
          variant: "destructive",
        })
      } finally {
        setIsRecalculatingToc(false)
      }
    }, 100)
  }, [text, chapters, title, currentPosition, completedChapters])

  // 목차 이동 함수
  const handleJumpToChapter = useCallback(
    (position: number) => {
      console.log(`Jumping to chapter at position: ${position}`)

      // 유효한 위치인지 확인
      if (position < 0) {
        console.error(`Invalid negative position: ${position}`)
        position = 0
      }

      if (position >= text.length) {
        console.error(`Invalid position: ${position}, text length: ${text.length}`)
        position = Math.max(0, text.length - 1)
      }

      // 목차 대화상자 닫기
      setShowToc(false)

      // 현재 위치 업데이트
      setCurrentPosition(position)

      // 디버깅 정보 업데이트
      setDebugInfo(`챕터 이동: 위치=${position}`)

      // 세션 저장
      const currentSession = {
        text,
        title,
        position: position,
        chapters,
        completedChapters,
      }
      localStorage.setItem("typingSession", JSON.stringify(currentSession))

      // 토스트 메시지로 이동 알림
      toast({
        title: "위치 이동",
        description: `텍스트 내 ${position}번 위치로 이동했습니다.`,
      })
    },
    [text, title, chapters, completedChapters],
  )

  // 챕터 완료 처리 함수
  const handleChapterComplete = useCallback((chapterId: string) => {
    setCompletedChapters((prev) => {
      if (prev.includes(chapterId)) return prev
      return [...prev, chapterId]
    })

    // 디버깅 정보 업데이트
    setDebugInfo(`챕터 완료: ID=${chapterId}`)
  }, [])

  // 특정 챕터로 이동하는 함수
  const handleNavigateToChapter = useCallback(
    (chapterId: string) => {
      const flatChapters = flattenTableOfContents(chapters)
      const targetChapter = flatChapters.find((chapter) => chapter.id === chapterId)

      if (targetChapter && targetChapter.position !== undefined) {
        handleJumpToChapter(targetChapter.position)

        // 디버깅 정보 업데이트
        setDebugInfo(`챕터 이동: ID=${chapterId}, 위치=${targetChapter.position}`)
      }
    },
    [chapters, handleJumpToChapter],
  )

  const saveSession = () => {
    // Already saving automatically, but this provides user feedback
    toast({
      title: "세션 저장됨",
      description: "현재 진행 상황이 저장되었습니다.",
    })
  }

  // 텍스트 포맷팅 함수 추가
  const formatText = useCallback(() => {
    if (!text) {
      toast({
        title: t("common.textFormattingFailed"),
        description: t("common.noText"),
        variant: "destructive",
      })
      return
    }

    try {
      // 텍스트에서 제목을 인식하고 포맷팅 적용
      const formattedText = formatTextWithHeadings(text)

      // 목차 위치 재계산
      const recalculatedChapters = recalculateChapterPositions(chapters, formattedText)

      // 챕터 내용 분할 처리
      const processedChapters = splitTextByChapters(formattedText, recalculatedChapters, t("common.fullText"))

      // 상태 업데이트
      setText(formattedText)
      setChapters(processedChapters)

      // 현재 위치에 해당하는 챕터 업데이트
      const chapter = findCurrentChapter(currentPosition, processedChapters)
      setCurrentChapter(chapter)

      // 디버깅 정보 업데이트
      setDebugInfo(`텍스트 포맷팅: 챕터 수=${processedChapters.length}, 현재 챕터=${chapter?.title || "없음"}`)

      // 세션 저장
      const session = {
        text: formattedText,
        title,
        position: currentPosition,
        chapters: processedChapters,
        completedChapters,
      }
      localStorage.setItem("typingSession", JSON.stringify(session))

      toast({
        title: t("common.textFormattingComplete"),
        description: t("common.titleRecognizedAndFormatted"),
      })
    } catch (error) {
      console.error("Error formatting text:", error)
      setDebugInfo(`${t("common.textFormattingError")}: ${error}`)
      toast({
        title: t("common.textFormattingFailed"),
        description: t("common.errorOccurredCheckConsole"),
        variant: "destructive",
      })
    }
  }, [text, title, currentPosition, chapters, completedChapters])

  // Keyboard shortcuts
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
      // Ctrl/Cmd + R: Recalculate TOC positions
      else if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault()
        recalculateTocPositions()
      }
      // Ctrl/Cmd + F: Format text
      else if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault()
        formatText()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [recalculateTocPositions, formatText])

  // 텍스트가 있지만 챕터가 없는 경우 기본 챕터 생성
  useEffect(() => {
    if (text && (!chapters || chapters.length === 0) && isTextLoaded) {
      const defaultChapter: ChapterInfo = {
        id: "default",
        title: "전체 텍스트",
        position: 0,
        level: 1,
        content: text,
      }
      setChapters([defaultChapter])
      setCurrentChapter(defaultChapter)
      setDebugInfo(`기본 챕터 생성: 텍스트 길이=${text.length}`)
    }
  }, [text, chapters, isTextLoaded])

  // 디버깅 정보 로깅
  useEffect(() => {
    if (debugInfo) {
      console.log("[DEBUG]", debugInfo)
    }
  }, [debugInfo])

  // 렌더링 조건 확인
  const shouldRenderTypingInterface = isTextLoaded && text && (currentChapter || (chapters && chapters.length > 0))

  // 렌더링 조건 로깅
  useEffect(() => {
    console.log("[RENDER CONDITIONS]", {
      isTextLoaded,
      hasText: !!text,
      hasCurrentChapter: !!currentChapter,
      chaptersLength: chapters?.length || 0,
      shouldRender: shouldRenderTypingInterface,
    })
  }, [isTextLoaded, text, currentChapter, chapters, shouldRenderTypingInterface])

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
                aria-label={t("common.home")}
                className="rounded-full h-9 w-9"
              >
                <Home className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-light tracking-tight truncate max-w-[200px] md:max-w-md">
                {title || t("common.untitled")}
              </h1>
            </div>

            <div className="flex items-center space-x-6">
              <ThemeToggle />

              <div className="flex items-center space-x-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTextImport(true)}
                  aria-label={t("common.text")}
                  title={t("practice.importText")}
                  className="rounded-full h-9 w-9"
                >
                  <BookOpen className="h-5 w-5" />
                </Button>

                {text && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowToc(true)}
                    aria-label={t("practice.tableOfContents")}
                    title={t("practice.tableOfContents")}
                    className="rounded-full h-9 w-9"
                  >
                    <List className="h-5 w-5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  aria-label={t("common.settings")}
                  title={t("common.settings")}
                  className="rounded-full h-9 w-9"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-background to-background/95 transition-all duration-300 pt-[120px]">
        {/* 배경 장식 요소 추가 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-gradient-radial from-accent/20 to-transparent opacity-30 blur-3xl"></div>
          <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-gradient-radial from-accent/20 to-transparent opacity-30 blur-3xl"></div>
        </div>

        {/* 콘텐츠 컨테이너 */}
        <div className="relative w-full max-w-[1600px] z-10 px-4 py-8 animate-fade-in">
          {shouldRenderTypingInterface ? (
            <>
              {currentChapter ? (
                <ChapterBasedTypingInterface
                  chapter={currentChapter}
                  onChapterComplete={handleChapterComplete}
                  onNavigateToChapter={handleNavigateToChapter}
                  allChapters={chapters}
                />
              ) : (
                // 챕터는 있지만 현재 챕터가 없는 경우 첫 번째 챕터 사용
                chapters.length > 0 && (
                  <ChapterBasedTypingInterface
                    chapter={chapters[0]}
                    onChapterComplete={handleChapterComplete}
                    onNavigateToChapter={handleNavigateToChapter}
                    allChapters={chapters}
                  />
                )
              )}
            </>
          ) : (
            <div className="text-center space-y-8 max-w-md mx-auto p-4 bg-background/50 backdrop-blur-sm rounded-xl border border-border/30 shadow-sm">
              <div className="h-16 w-16 mx-auto border border-border rounded-full flex items-center justify-center bg-background/80">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-light tracking-tight">{t("common.selectTextHeading")}</h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                {t("common.selectTextDescription")}
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => setShowTextImport(true)}
                  className="rounded-full px-8 py-6 bg-foreground text-background hover:bg-foreground/90 shadow-md hover:shadow-lg transition-all duration-300"
                >
                  {t("common.start")}
                </Button>
              </div>

              {/* 디버깅 정보 표시 (개발 중에만 사용) */}
              {process.env.NODE_ENV === "development" && (
                <div className="mt-8 p-4 bg-muted/30 rounded-md text-xs text-left">
                  <p className="font-mono">{t("common.debugTextLength")}: {text?.length || 0}</p>
                  <p className="font-mono">{t("common.debugChapterCount")}: {chapters?.length || 0}</p>
                  <p className="font-mono">{t("common.debugCurrentChapter")}: {currentChapter?.title || t("common.debugNone")}</p>
                  <p className="font-mono">{t("common.debugTextLoaded")}: {isTextLoaded ? t("common.debugYes") : t("common.debugNo")}</p>
                  <p className="font-mono">{t("common.debugInfo")}: {debugInfo}</p>
                </div>
              )}
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
        currentPosition={currentPosition}
        onJumpToChapter={handleJumpToChapter}
        text={text}
        completedChapters={completedChapters}
        onRecalculateToc={recalculateTocPositions}
        onFormatText={formatText}
        onSaveSession={saveSession}
        isRecalculatingToc={isRecalculatingToc}
      />

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}
