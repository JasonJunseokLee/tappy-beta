"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Volume2, VolumeX } from "lucide-react"
import type { ChapterInfo } from "@/types/typing"
import { useUncontrolledTyping } from "@/hooks/use-uncontrolled-typing"
import { splitTextIntoLines } from "@/utils/typing-utils"
import { TypingLine } from "@/components/typing/typing-line-uncontrolled"
import { TypingRhythmVisualizer } from "@/components/typing/typing-rhythm-visualizer"
import { findNextChapter, findPrevChapter } from "@/utils/chapter-utils"
import { toast } from "@/hooks/use-toast"
import { useTypingSound } from "@/hooks/use-typing-sound"
import { useTypingSettings } from "@/contexts/typing-settings-context"

interface ChapterBasedTypingInterfaceProps {
  chapter: ChapterInfo
  onChapterComplete: (chapterId: string) => void
  onNavigateToChapter: (chapterId: string) => void
  allChapters: ChapterInfo[]
}

export default function ChapterBasedTypingInterface({
  chapter,
  onChapterComplete,
  onNavigateToChapter,
  allChapters,
}: ChapterBasedTypingInterfaceProps) {
  // UI state
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(false)
  const [fixedWidth, setFixedWidth] = useState<number>(1200) // 기본 고정 너비
  const [displayLines, setDisplayLines] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [isProcessingText, setIsProcessingText] = useState<boolean>(false)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const textDisplayRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  // 화면 크기에 따라 고정 너비 설정
  useEffect(() => {
    const updateFixedWidth = () => {
      // 화면 너비의 90%로 설정하되, 최소 800px, 최대 1600px로 제한
      const newWidth = Math.min(Math.max(window.innerWidth * 0.9, 800), 1600)
      setFixedWidth(newWidth)
    }

    // 초기 설정
    updateFixedWidth()

    // 화면 크기 변경 시 업데이트
    window.addEventListener("resize", updateFixedWidth)
    return () => window.removeEventListener("resize", updateFixedWidth)
  }, [])

  // 챕터 내용을 줄로 분할 - 개선된 버전
  useEffect(() => {
    // Wait for the component to be mounted to measure text width
    if (!measureRef.current || !textDisplayRef.current || fixedWidth === 0) return

    // 챕터 내용이 없으면 처리하지 않음
    if (!chapter || !chapter.content) {
      console.warn("챕터 내용이 없습니다:", chapter)
      setProcessingError("챕터 내용이 없습니다. 다른 챕터를 선택하거나 텍스트를 다시 불러오세요.")
      return
    }

    setIsProcessingText(true)
    setProcessingError(null)

    // 비동기 처리를 위한 setTimeout 사용
    setTimeout(() => {
      try {
        console.log(`챕터 "${chapter.title}" 처리 시작, 내용 길이: ${chapter.content?.length || 0}`)

        // 고정 너비 사용 (여백 고려)
        const containerWidth = fixedWidth - 40

        // 측정 요소 생성 (동일한 스타일링 적용)
        const measureElement = measureRef.current
        if (!measureElement) {
          throw new Error("측정 요소가 없습니다.")
        }

        measureElement.style.position = "absolute"
        measureElement.style.visibility = "hidden"
        measureElement.style.whiteSpace = "nowrap"
        measureElement.style.fontFamily = "var(--font-mono)" // 고정 폰트 사용
        measureElement.style.fontSize = "1.5rem" // text-2xl에 해당하는 크기
        measureElement.style.letterSpacing = "normal"

        // 텍스트가 너무 길면 청크로 나누어 처리
        const MAX_CHUNK_SIZE = 50000 // 한 번에 처리할 최대 문자 수
        const chapterContent = chapter.content || ""

        if (chapterContent.length > MAX_CHUNK_SIZE) {
          console.log(`텍스트가 너무 깁니다. 청크로 나누어 처리합니다. 길이: ${chapterContent.length}`)

          // 청크로 나누어 처리
          const allLines: string[] = []
          for (let i = 0; i < chapterContent.length; i += MAX_CHUNK_SIZE) {
            const chunk = chapterContent.substring(i, i + MAX_CHUNK_SIZE)
            const chunkLines = splitTextIntoLines(chunk, measureElement, containerWidth)
            allLines.push(...chunkLines)
          }

          setDisplayLines(allLines)
          console.log(`챕터 "${chapter.title}" 처리 완료, ${allLines.length}개 줄로 분할됨`)
        } else {
          // 일반적인 처리
          const lines = splitTextIntoLines(chapterContent, measureElement, containerWidth)
          setDisplayLines(lines)
          console.log(`챕터 "${chapter.title}" 처리 완료, ${lines.length}개 줄로 분할됨`)
        }

        // 초기화 완료 표시
        setIsInitialized(true)
      } catch (error) {
        console.error("텍스트 처리 오류:", error)
        setProcessingError(
          `텍스트 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
        )
      } finally {
        setIsProcessingText(false)
      }
    }, 10)
  }, [chapter, fixedWidth])

  // 타이핑 로직 훅 사용
  const typing = useUncontrolledTyping(displayLines, 0, { ignoreSymbols: true, autoAdvance: true })

  // 타이핑 소리 및 설정 훅 추가
  const { playKeySound, playLineCompleteSound } = useTypingSound()
  const { settings, updateSettings } = useTypingSettings()

  // 소리 토글 함수 추가
  const toggleSound = useCallback(() => {
    updateSettings({ soundEnabled: !settings.soundEnabled })
  }, [settings.soundEnabled, updateSettings])

  // 챕터 완료 감지
  useEffect(() => {
    if (typing.isCompleted && isInitialized) {
      // 챕터 완료 처리
      onChapterComplete(chapter.id)

      // 토스트 메시지로 알림
      toast({
        title: "챕터 완료",
        description: `"${chapter.title}" 챕터를 완료했습니다.`,
      })
    }
  }, [typing.isCompleted, isInitialized, chapter.id, chapter.title, onChapterComplete])

  // 다음 챕터로 이동
  const navigateToNextChapter = useCallback(() => {
    const nextChapter = findNextChapter(chapter.id, allChapters)
    if (nextChapter) {
      // 다음 챕터로 이동하기 전에 타이핑 상태 초기화
      typing.reset()

      // 약간의 지연 후 다음 챕터로 이동 (UI가 업데이트될 시간 제공)
      setTimeout(() => {
        onNavigateToChapter(nextChapter.id)
      }, 100)
    } else {
      toast({
        title: "마지막 챕터",
        description: "이미 마지막 챕터입니다.",
      })
    }
  }, [chapter.id, allChapters, onNavigateToChapter, typing])

  // 이전 챕터로 이동
  const navigateToPrevChapter = useCallback(() => {
    const prevChapter = findPrevChapter(chapter.id, allChapters)
    if (prevChapter) {
      onNavigateToChapter(prevChapter.id)
    } else {
      toast({
        title: "첫 번째 챕터",
        description: "이미 첫 번째 챕터입니다.",
      })
    }
  }, [chapter.id, allChapters, onNavigateToChapter])

  // 키보드 단축키 - 변경된 부분
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Alt + Right: 다음 챕터
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === "ArrowRight") {
        e.preventDefault()
        navigateToNextChapter()
      }
      // Cmd/Ctrl + Alt + Left: 이전 챕터
      else if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === "ArrowLeft") {
        e.preventDefault()
        navigateToPrevChapter()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [navigateToNextChapter, navigateToPrevChapter])

  // Handle container click to focus textarea
  const handleContainerClick = useCallback(() => {
    if (typing.inputRef.current) {
      typing.inputRef.current.focus()
    }
  }, [typing])

  // Get visible lines (current line and a few before/after)
  const getVisibleLines = useCallback(() => {
    if (displayLines.length === 0) return []

    const startIdx = Math.max(0, typing.currentLineIndex - 1)
    const endIdx = Math.min(displayLines.length, typing.currentLineIndex + 4)
    return displayLines.slice(startIdx, endIdx).map((line, idx) => ({
      text: line,
      index: startIdx + idx,
    }))
  }, [displayLines, typing.currentLineIndex])

  // 챕터 진행률 계산
  const chapterProgress = (typing.currentLineIndex / Math.max(displayLines.length, 1)) * 100

  // 운영체제에 따른 단축키 표시 (Mac은 ⌘, 다른 OS는 Ctrl)
  const isMac = typeof navigator !== "undefined" ? navigator.platform.toUpperCase().indexOf("MAC") >= 0 : false
  const modifierKey = isMac ? "⌘" : "Ctrl"

  return (
    <div
      ref={containerRef}
      className="min-h-[80vh] flex flex-col items-center justify-center bg-background- transition-theme"
      onClick={handleContainerClick}
    >
      {/* 챕터 네비게이션 - 상단에 배치 */}
      <div className="fixed top-[120px] left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/10">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-12">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToPrevChapter}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> 이전 챕터
            </Button>

            <h2 className="text-base font-light">{chapter.title}</h2>

            <Button
              variant="ghost"
              size="sm"
              onClick={navigateToNextChapter}
              className="text-muted-foreground hover:text-foreground"
            >
              다음 챕터 <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
      {/* Hidden element for measuring text width */}
      <div ref={measureRef} className="absolute invisible" aria-hidden="true"></div>

      <div className="flex justify-center w-full px-4 mx-auto mt-4">
        <div style={{ width: `${fixedWidth}px` }} className="relative">
          {/* 진행률 표시 바 */}
          <div className="w-full mb-6">
            <div className="h-[2px] bg-muted/30 w-full relative overflow-hidden rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-foreground/60 transition-all duration-700 ease-in-out"
                style={{ width: `${chapterProgress}%` }}
              ></div>
            </div>
          </div>

          {/* 텍스트 처리 중 로딩 표시 */}
          {isProcessingText && (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mb-4"></div>
                <p className="text-muted-foreground">텍스트 처리 중...</p>
                <p className="text-xs text-muted-foreground mt-2">텍스트가 길면 처리에 시간이 걸릴 수 있습니다.</p>
              </div>
            </div>
          )}

          {/* 처리 오류 표시 */}
          {processingError && (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="inline-flex items-center justify-center rounded-full h-12 w-12 bg-red-100 text-red-500 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-red-500 font-medium mb-2">오류 발생</p>
                <p className="text-muted-foreground text-sm mb-4">{processingError}</p>
                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateToPrevChapter}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    이전 챕터
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={navigateToNextChapter}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    다음 챕터
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main typing area */}
          {!isProcessingText && !processingError && (
            <div className="h-[400px] overflow-hidden relative space-y-10 mb-8 w-full" ref={textDisplayRef}>
              {/* Typing interface with guide text and typed text */}
              <div className="typing-guide">
                {getVisibleLines().map(({ text: line, index: lineIndex }) => {
                  const isCurrentLine = lineIndex === typing.currentLineIndex
                  const isPastLine = lineIndex < typing.currentLineIndex
                  const isFutureLine = lineIndex > typing.currentLineIndex

                  return (
                    <div key={lineIndex} className={`mb-6 ${isPastLine ? "opacity-50" : ""}`}>
                      {/* Guide text */}
                      <TypingLine
                        line={line}
                        typedText={isCurrentLine ? typing.getCurrentInputValue() : ""}
                        isCurrentLine={isCurrentLine}
                        isPastLine={isPastLine}
                        isFutureLine={isFutureLine}
                        isComposing={typing.isComposing}
                      />

                      {/* 타이핑 텍스트 영역 - 현재 줄에만 표시 */}
                      {isCurrentLine && (
                        <div className="h-[1.5em] relative mt-1">
                          <textarea
                            ref={typing.inputRef}
                            className="typing-input"
                            onInput={typing.handleInput}
                            onKeyDown={typing.handleKeyDown}
                            onCompositionStart={typing.handleCompositionStart}
                            onCompositionEnd={typing.handleCompositionEnd}
                            autoFocus
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            data-form-type="other"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 타이핑 리듬 시각화 - 항상 표시 */}
              {typing.startTime && !typing.isCompleted && <TypingRhythmVisualizer typingRhythm={typing.typingRhythm} />}
            </div>
          )}

          {/* 정보 패널 토글 버튼 */}
          <div className="fixed bottom-4 left-0 right-0 flex justify-center z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="rounded-full shadow-md bg-background/80 backdrop-blur-sm border-border/30 hover:bg-background w-10 h-10 p-0"
            >
              {showInfoPanel ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </Button>
          </div>

          {/* 정보 패널 - 화면 하단에 고정 */}
          {showInfoPanel && (
            <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 p-4 bg-background/95 backdrop-blur-md border border-border/30 rounded-lg shadow-lg transition-all duration-300 ease-in-out z-10 max-w-3xl w-[90%]">
              <div className="flex flex-col space-y-4">
                {/* 상단 통계 요약 - 한 줄에 모든 주요 통계 표시 */}
                <div className="flex justify-between items-center px-2 py-1 bg-accent/10 rounded-md">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-foreground/80">진행률</span>
                      <span className="ml-2 text-sm font-medium">{Math.round(chapterProgress)}%</span>
                    </div>
                    <div className="h-4 border-r border-border/30"></div>
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-foreground/80">타수</span>
                      <span className="ml-2 text-sm font-medium">{typing.stats.cpm}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-foreground/80">정확도</span>
                      <span className="ml-2 text-sm font-medium">{typing.stats.accuracy}%</span>
                    </div>
                    <div className="h-4 border-r border-border/30"></div>
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-foreground/80">시간</span>
                      <span className="ml-2 text-sm font-medium">
                        {typing.startTime ? Math.round((Date.now() - typing.startTime) / 1000) : 0}초
                      </span>
                    </div>
                    {/* 소리 토글 버튼 추가 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSound}
                      className="p-0 h-6 w-6 rounded-full"
                      title={settings.soundEnabled ? "소리 끄기" : "소리 켜기"}
                    >
                      {settings.soundEnabled ? (
                        <Volume2 className="h-4 w-4 text-foreground/80" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-foreground/50" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 두 섹션을 나란히 배치 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 키보드 단축키 정보 - 더 컴팩트하게 */}
                  <div className="p-3 bg-background/80 rounded-md border border-border/20">
                    <h3 className="text-xs font-medium mb-2 text-foreground/80">키보드 단축키</h3>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">다음 줄</span>
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Tab</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">이전 줄</span>
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Shift+Tab</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">다음 챕터</span>
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{modifierKey}+Alt+→</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">이전 챕터</span>
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{modifierKey}+Alt+←</kbd>
                      </div>
                    </div>
                  </div>

                  {/* 상세 통계 정보 - 더 구조화된 형태로 */}
                  <div className="p-3 bg-background/80 rounded-md border border-border/20">
                    <h3 className="text-xs font-medium mb-2 text-foreground/80">상세 통계</h3>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">순 타수</span>
                          <span className="text-xs font-medium">{typing.stats.netCpm}</span>
                        </div>
                        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground/60"
                            style={{ width: `${Math.min(100, (typing.stats.netCpm / 400) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">오류</span>
                          <span className="text-xs font-medium">{typing.stats.errorCount}</span>
                        </div>
                        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500/60"
                            style={{ width: `${Math.min(100, (typing.stats.errorCount / 50) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">수정</span>
                          <span className="text-xs font-medium">{typing.stats.correctionCount}</span>
                        </div>
                        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500/60"
                            style={{ width: `${Math.min(100, (typing.stats.correctionCount / 50) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">총 타수</span>
                          <span className="text-xs font-medium">{typing.stats.keyPressCount}</span>
                        </div>
                        <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500/60"
                            style={{ width: `${Math.min(100, (typing.stats.keyPressCount / 500) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Completion message */}
          {typing.isCompleted && (
            <div className="text-center mt-16 mb-16 animate-fade-in">
              <p className="text-lg font-light mb-6 text-muted-foreground">챕터를 완료했습니다</p>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={typing.reset}
                  variant="outline"
                  className="rounded-md border-border hover:bg-accent transition-colors"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  다시 연습하기
                </Button>
                <Button
                  onClick={() => {
                    // 다음 챕터로 이동하기 전에 타이핑 상태 초기화
                    typing.reset()

                    // 약간의 지연 후 다음 챕터로 이동
                    setTimeout(() => {
                      navigateToNextChapter()
                    }, 100)
                  }}
                  variant="default"
                  className="rounded-md transition-colors"
                >
                  다음 챕터 <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
