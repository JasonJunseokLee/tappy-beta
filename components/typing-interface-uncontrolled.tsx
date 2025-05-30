"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, ChevronUp, ChevronDown } from "lucide-react"
import type { TypingInterfaceProps, VisibleLine } from "@/types/typing"
import { useUncontrolledTyping } from "@/hooks/use-uncontrolled-typing"
import { splitTextIntoLines } from "@/utils/typing-utils"
import { TypingLine } from "@/components/typing/typing-line-uncontrolled"
import { TypingRhythmVisualizer } from "@/components/typing/typing-rhythm-visualizer"
import { useLanguage } from "@/contexts/language-context"

// 인터페이스 확장
interface ExtendedTypingInterfaceProps extends TypingInterfaceProps {
  initialJumpTarget?: number | null
}

export default function TypingInterfaceUncontrolled({
  text,
  currentPosition,
  onPositionChange,
  initialJumpTarget = null,
}: ExtendedTypingInterfaceProps) {
  const { t } = useLanguage()
  // UI state
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(false)
  const [showRhythm, setShowRhythm] = useState<boolean>(false)
  const [fixedWidth, setFixedWidth] = useState<number>(1200) // 기본 고정 너비
  const [displayLines, setDisplayLines] = useState<string[]>([])
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0)
  const [allLines, setAllLines] = useState<string[]>([])
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const CHUNK_SIZE = 1000 // 한 청크당 줄 수
  const VISIBLE_BUFFER = 5 // 위아래로 미리 로드할 줄 수

  // 외부 위치 변경 추적을 위한 ref
  const lastExternalPositionRef = useRef<number>(currentPosition)
  const isInternalPositionChangeRef = useRef<boolean>(false)
  const initialJumpTargetRef = useRef<number | null>(initialJumpTarget)

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

  // 텍스트를 청크로 분할하는 함수
  const processTextIntoChunks = useCallback((text: string, containerWidth: number, measureElement: HTMLElement) => {
    // 전체 텍스트를 줄로 분할
    const allLines = splitTextIntoLines(text, measureElement, containerWidth)

    // 청크로 분할
    const chunks: string[][] = []
    for (let i = 0; i < allLines.length; i += CHUNK_SIZE) {
      chunks.push(allLines.slice(i, i + CHUNK_SIZE))
    }

    return chunks
  }, [])

  // Process text into visual lines on mount
  useEffect(() => {
    // Wait for the component to be mounted to measure text width
    if (!measureRef.current || !textDisplayRef.current || fixedWidth === 0) return

    // 고정 너비 사용 (여백 고려)
    const containerWidth = fixedWidth - 40

    // 측정 요소 생성 (동일한 스타일링 적용)
    const measureElement = measureRef.current
    measureElement.style.position = "absolute"
    measureElement.style.visibility = "hidden"
    measureElement.style.whiteSpace = "nowrap"
    measureElement.style.fontFamily = "var(--font-mono)" // 고정 폰트 사용
    measureElement.style.fontSize = "1.5rem" // text-2xl에 해당하는 크기
    measureElement.style.letterSpacing = "normal"

    // 텍스트를 시각적 줄로 분할
    console.log("Processing text into lines, text length:", text.length)
    if (text.length > 0) {
      const lines = splitTextIntoLines(text, measureElement, containerWidth)
      setAllLines(lines)

      // 현재 활성 청크의 줄만 표시
      updateDisplayLines(0, lines)
    }

    // 초기화 완료 표시
    setIsInitialized(true)

    console.log("Text processed into lines:", allLines.length)
  }, [text, fixedWidth])

  // 현재 활성 청크의 줄 업데이트
  const updateDisplayLines = useCallback(
    (chunkIndex: number, lines: string[] = allLines) => {
      const startIdx = chunkIndex * CHUNK_SIZE
      const endIdx = Math.min(startIdx + CHUNK_SIZE + VISIBLE_BUFFER, lines.length)
      setDisplayLines(lines.slice(startIdx, endIdx))
      setActiveChunkIndex(chunkIndex)
    },
    [allLines, CHUNK_SIZE, VISIBLE_BUFFER],
  )

  // 현재 활성화된 청크의 줄 가져오기
  const activeLines = useMemo(() => {
    if (displayLines.length === 0) return []
    return displayLines || []
  }, [displayLines])

  // 타이핑 로직 훅 사용 - activeLines만 전달
  const typing = useUncontrolledTyping(activeLines, 0, { ignoreSymbols: true, autoAdvance: true })

  // Focus textarea on mount and when line changes
  useEffect(() => {
    if (typing.inputRef.current) {
      typing.inputRef.current.focus()
    }
  }, [typing.currentLineIndex])

  // 줄 인덱스 변경 감지 및 청크 전환
  useEffect(() => {
    // 현재 줄이 청크의 끝에 가까워지면 다음 청크로 전환
    if (
      typing.currentLineIndex >= CHUNK_SIZE - VISIBLE_BUFFER &&
      activeChunkIndex < Math.floor(allLines.length / CHUNK_SIZE)
    ) {
      const nextChunkIndex = activeChunkIndex + 1
      updateDisplayLines(nextChunkIndex)
    }

    // 현재 줄이 청크의 시작에 가까워지면 이전 청크로 전환
    if (typing.currentLineIndex <= VISIBLE_BUFFER && activeChunkIndex > 0) {
      const prevChunkIndex = activeChunkIndex - 1
      updateDisplayLines(prevChunkIndex)
    }
  }, [typing.currentLineIndex, activeChunkIndex, allLines.length, CHUNK_SIZE, VISIBLE_BUFFER, updateDisplayLines])

  // 현재 줄로 스크롤하는 함수를 먼저 정의
  const scrollToCurrentLine = useCallback((lineIndex: number) => {
    setTimeout(() => {
      const currentLineElement = document.querySelector(`.typing-guide div[class*='mb-6']:nth-child(${lineIndex + 1})`)

      if (currentLineElement) {
        currentLineElement.scrollIntoView({ behavior: "smooth", block: "center" })
      } else {
        console.log(`Line element not found for index ${lineIndex}`)
      }
    }, 50)
  }, [])

  // 특정 위치로 이동하는 함수
  const jumpToPosition = useCallback(
    (position: number) => {
      console.log(`jumpToPosition called with position: ${position}`)

      if (position < 0 || !allLines.length) return

      // 위치에 해당하는 줄과 청크 찾기
      let charCount = 0
      let targetChunkIndex = 0
      let targetLineIndex = 0
      let found = false

      // 모든 줄을 순회하며 위치 찾기
      for (let i = 0; i < allLines.length; i++) {
        const lineLength = allLines[i]?.length || 0
        const nextCharCount = charCount + lineLength + 1 // +1 for newline

        // 현재 줄까지의 문자 수 + 현재 줄 길이가 목표 위치보다 크거나 같으면
        // 해당 줄이 목표 위치를 포함하는 줄
        if (charCount <= position && position < nextCharCount) {
          targetChunkIndex = Math.floor(i / CHUNK_SIZE)
          targetLineIndex = i % CHUNK_SIZE
          found = true
          console.log(`Found position ${position} at line ${i} (chunk ${targetChunkIndex}, line ${targetLineIndex})`)
          console.log(`Line content: "${allLines[i]}"`)
          break
        }

        charCount = nextCharCount
      }

      // 목표 위치를 찾지 못했으면 가장 가까운 위치로 이동
      if (!found) {
        // 가장 가까운 위치 찾기
        let closestLine = 0
        let minDistance = Number.MAX_SAFE_INTEGER

        let lineStartPos = 0
        for (let i = 0; i < allLines.length; i++) {
          const distance = Math.abs(lineStartPos - position)
          if (distance < minDistance) {
            minDistance = distance
            closestLine = i
          }
          lineStartPos += (allLines[i]?.length || 0) + 1 // +1 for newline
        }

        targetChunkIndex = Math.floor(closestLine / CHUNK_SIZE)
        targetLineIndex = closestLine % CHUNK_SIZE
        console.log(`Position ${position} not found exactly, moving to closest line ${closestLine}`)
        console.log(`Line content: "${allLines[closestLine]}"`)
      }

      // 청크 업데이트
      updateDisplayLines(targetChunkIndex)

      // 줄 이동 (약간의 지연 필요)
      setTimeout(() => {
        // 타겟 라인이 유효한지 확인
        if (targetLineIndex >= 0 && targetLineIndex < displayLines.length) {
          typing.setCurrentLine(targetLineIndex)

          // 입력 필드에 포커스
          if (typing.inputRef.current) {
            typing.inputRef.current.focus()
            typing.inputRef.current.value = ""
          }

          // 화면 스크롤 조정
          scrollToCurrentLine(targetLineIndex)
        } else {
          console.error(`Invalid target line index: ${targetLineIndex}, display lines length: ${displayLines.length}`)
        }
      }, 200) // 지연 시간 증가
    },
    [allLines, typing, updateDisplayLines, CHUNK_SIZE, scrollToCurrentLine, displayLines.length],
  )

  // 초기 점프 타겟이 있으면 처리
  useEffect(() => {
    if (isInitialized && initialJumpTargetRef.current !== null) {
      console.log(`Processing initial jump target: ${initialJumpTargetRef.current}`)
      jumpToPosition(initialJumpTargetRef.current)
      initialJumpTargetRef.current = null // 한 번만 실행
    }
  }, [isInitialized, jumpToPosition])

  // 외부에서 전달된 currentPosition이 변경될 때 처리
  useEffect(() => {
    // 내부 위치 변경이면 무시
    if (isInternalPositionChangeRef.current) {
      isInternalPositionChangeRef.current = false
      return
    }

    // 위치가 실제로 변경되었는지 확인
    if (currentPosition === lastExternalPositionRef.current) {
      return
    }

    console.log(`External position change detected: ${currentPosition}`)

    // 외부 위치 업데이트 기록
    lastExternalPositionRef.current = currentPosition

    // 초기화가 완료된 경우에만 점프 실행
    if (isInitialized && allLines.length > 0) {
      jumpToPosition(currentPosition)
    } else {
      // 초기화가 완료되지 않았으면 초기 점프 타겟으로 설정
      initialJumpTargetRef.current = currentPosition
    }
  }, [currentPosition, isInitialized, jumpToPosition, allLines.length])

  // Update position when typing changes
  useEffect(() => {
    // 현재 입력된 텍스트 가져오기
    const typedText = typing.getCurrentInputValue()

    // 위치 업데이트
    const globalLineIndex = activeChunkIndex * CHUNK_SIZE + typing.currentLineIndex
    let totalChars = 0

    // 이전 청크의 모든 문자 수 계산
    for (let i = 0; i < activeChunkIndex * CHUNK_SIZE; i++) {
      totalChars += allLines[i]?.length || 0
    }

    // 현재 청크 내 이전 줄의 문자 수 계산
    for (let i = 0; i < typing.currentLineIndex; i++) {
      totalChars += displayLines[i]?.length || 0
    }

    // 현재 타이핑 중인 문자 수 추가
    totalChars += typedText.length

    // 내부 위치 변경 플래그 설정
    isInternalPositionChangeRef.current = true
    onPositionChange(totalChars)
  }, [typing.currentLineIndex, displayLines, activeChunkIndex, allLines, onPositionChange, CHUNK_SIZE, typing])

  // Handle container click to focus textarea
  const handleContainerClick = useCallback(() => {
    if (typing.inputRef.current) {
      typing.inputRef.current.focus()
    }
  }, [typing])

  // Get visible lines (current line and a few before/after)
  const getVisibleLines = useCallback((): VisibleLine[] => {
    if (displayLines.length === 0) return []

    const startIdx = Math.max(0, typing.currentLineIndex - 1)
    const endIdx = Math.min(displayLines.length, typing.currentLineIndex + 4)
    return displayLines.slice(startIdx, endIdx).map((line, idx) => ({
      text: line,
      index: startIdx + idx,
    }))
  }, [displayLines, typing.currentLineIndex])

  // 전체 진행률 계산
  const totalProgress = useMemo(() => {
    return ((activeChunkIndex * CHUNK_SIZE + typing.currentLineIndex) / Math.max(allLines.length, 1)) * 100
  }, [activeChunkIndex, CHUNK_SIZE, typing.currentLineIndex, allLines.length])

  return (
    <div
      ref={containerRef}
      className="min-h-[80vh] flex flex-col items-center justify-center bg-background transition-theme"
      onClick={handleContainerClick}
    >
      {/* Hidden element for measuring text width */}
      <div ref={measureRef} className="absolute invisible" aria-hidden="true"></div>

      <div className="flex justify-center w-full px-4 mx-auto mt-4">
        <div style={{ width: `${fixedWidth}px` }} className="relative">
          {/* Main typing area */}
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

            {/* 타이핑 리듬 시각화 - 토글 가능 */}
            {showRhythm && typing.startTime && !typing.isCompleted && (
              <TypingRhythmVisualizer typingRhythm={typing.typingRhythm} />
            )}
          </div>

          {/* 통합 정보 패널 토글 버튼 */}
          <div className="flex justify-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInfoPanel(!showInfoPanel)}
              className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8 p-0"
            >
              {showInfoPanel ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>

          {/* 통합 정보 패널 - 하단에 배치 */}
          {showInfoPanel && (
            <div className="mb-8 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border/10 shadow-sm transition-all duration-300 ease-in-out">
              {/* 진행률 표시 바 */}
              <div className="w-full mb-4">
                <div className="h-[2px] bg-muted/30 w-full relative overflow-hidden rounded-full">
                  <div
                    className="absolute top-0 left-0 h-full bg-foreground/60 transition-all duration-700 ease-in-out"
                    style={{ width: `${totalProgress}%` }}
                  ></div>
                </div>
              </div>
              {/* 기본 통계 정보 */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("common.progress")}</p>
                  <p className="text-lg font-light">
                    {Math.round(totalProgress)}
                    <span className="text-xs text-muted-foreground ml-1">%</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("common.typingSpeed")}</p>
                  <p className="text-lg font-light">
                    {typing.stats.cpm}
                    <span className="text-xs text-muted-foreground ml-1">{t("common.strokesPerMinute")}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("common.accuracy")}</p>
                  <p className="text-lg font-light">
                    {typing.stats.accuracy}
                    <span className="text-xs text-muted-foreground ml-1">%</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("common.time")}</p>
                  <p className="text-lg font-light">
                    {typing.startTime ? Math.round((Date.now() - typing.startTime) / 1000) : 0}
                    <span className="text-xs text-muted-foreground ml-1">{t("common.seconds")}</span>
                  </p>
                </div>
              </div>

              {/* 키보드 단축키 정보 */}
              <div className="mb-4 p-3 bg-background/80 rounded-md border border-border/10">
                <h3 className="text-xs font-medium mb-2 text-muted-foreground">{t("common.keyboardShortcuts")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("common.nextLine")}</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Tab</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("common.previousLine")}</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Shift+Tab</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">줄 건너뛰기</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd>
                  </div>
                </div>
              </div>

              {/* 추가 통계 정보 */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("common.netTypingSpeed")}</p>
                  <p className="text-lg font-light">
                    {typing.stats.netCpm}
                    <span className="text-xs text-muted-foreground ml-1">{t("common.strokesPerMinute")}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">오류</p>
                  <p className="text-lg font-light">{typing.stats.errorCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">수정</p>
                  <p className="text-lg font-light">{typing.stats.correctionCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">총 타수</p>
                  <p className="text-lg font-light">{typing.stats.keyPressCount}</p>
                </div>
              </div>

              {/* 추가 기능 버튼 */}
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRhythm(!showRhythm)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showRhythm ? "리듬 숨기기" : "리듬 보기"}
                </Button>
              </div>
            </div>
          )}

          {/* Completion message */}
          {typing.isCompleted && (
            <div className="text-cent-center mt-16 mb-16 animate-fade-in">
              <p className="text-lg font-light mb-6 text-muted-foreground">텍스트를 완성했습니다</p>
              <Button
                onClick={typing.reset}
                variant="outline"
                className="rounded-md border-border hover:bg-accent transition-colors"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                다시 연습하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
