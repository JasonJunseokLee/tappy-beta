"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Space } from "lucide-react"
import type { TypingInterfaceProps, VisibleLine } from "@/types/typing"
import { useTyping } from "@/hooks/use-typing"
import { splitTextIntoLines } from "@/utils/typing-utils"
import { ProgressBar } from "@/components/typing/progress-bar"
import { TypingLine } from "@/components/typing/typing-line"
import { TypingRhythmVisualizer } from "@/components/typing/typing-rhythm-visualizer"
import { KeyboardShortcuts } from "@/components/typing/keyboard-shortcuts"
import { DetailedStats } from "@/components/typing/detailed-stats"

export default function TypingInterface({ text, currentPosition, onPositionChange }: TypingInterfaceProps) {
  // UI state
  const [showStats, setShowStats] = useState<boolean>(false)
  const [debugMode, setDebugMode] = useState<boolean>(false)
  const [fixedWidth, setFixedWidth] = useState<number>(1200) // 기본 고정 너비
  const [displayLines, setDisplayLines] = useState<string[]>([])
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0)
  const [allLines, setAllLines] = useState<string[]>([])
  const CHUNK_SIZE = 1000 // 한 청크당 줄 수
  const VISIBLE_BUFFER = 5 // 위아래로 미리 로드할 줄 수

  // 외부 위치 변경 추적을 위한 ref
  const lastExternalPositionRef = useRef<number>(currentPosition)
  const isInternalPositionChangeRef = useRef<boolean>(false)

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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
    const lines = splitTextIntoLines(text, measureElement, containerWidth)
    setAllLines(lines)

    // 현재 활성 청크의 줄만 표시
    updateDisplayLines(0, lines)
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
  const typing = useTyping(activeLines, 0, { ignoreSymbols: true, autoAdvance: true })

  // Focus textarea on mount and when line changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
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

    // 외부 위치 업데이트 기록
    lastExternalPositionRef.current = currentPosition

    // 외부에서 위치가 변경된 경우 (예: 목차 이동)
    if (currentPosition > 0 && allLines.length > 0) {
      // 해당 위치가 속한 청크와 줄 찾기
      let charCount = 0
      let targetChunkIndex = 0
      let targetLineIndex = 0
      let found = false

      // 모든 줄을 순회하며 위치 찾기
      for (let i = 0; i < allLines.length; i++) {
        const lineLength = allLines[i]?.length || 0

        // 현재 줄까지의 문자 수 + 현재 줄 길이가 목표 위치보다 크거나 같으면
        // 해당 줄이 목표 위치를 포함하는 줄
        if (charCount <= currentPosition && currentPosition < charCount + lineLength) {
          targetChunkIndex = Math.floor(i / CHUNK_SIZE)
          targetLineIndex = i % CHUNK_SIZE
          found = true
          break
        }

        charCount += lineLength
      }

      // 목표 위치를 찾았으면 해당 청크와 줄로 이동
      if (found) {
        // 청크가 현재와 다르면 청크 업데이트
        if (targetChunkIndex !== activeChunkIndex) {
          updateDisplayLines(targetChunkIndex)

          // 청크 업데이트 후 줄 이동 (약간의 지연 필요)
          setTimeout(() => {
            typing.setCurrentLineIndex(targetLineIndex)
          }, 0)
        } else {
          // 같은 청크 내에서는 바로 줄 이동
          typing.setCurrentLineIndex(targetLineIndex)
        }
      }
    }
  }, [currentPosition, allLines, activeChunkIndex, CHUNK_SIZE, typing, updateDisplayLines])

  // Update position when typing changes
  useEffect(() => {
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
    totalChars += typing.typedText.length

    // 내부 위치 변경 플래그 설정
    isInternalPositionChangeRef.current = true
    onPositionChange(totalChars)
  }, [
    typing.typedText,
    typing.currentLineIndex,
    displayLines,
    activeChunkIndex,
    allLines,
    onPositionChange,
    CHUNK_SIZE,
  ])

  // Handle composition start
  const handleCompositionStart = () => {
    typing.setIsComposing(true)
  }

  // Handle composition end
  const handleCompositionEnd = () => {
    // 한글 입력 완료 상태로 설정
    typing.setIsComposing(false)

    // 현재 textarea의 값을 가져와서 상태 업데이트
    if (textareaRef.current) {
      const finalText = textareaRef.current.value

      // 줄 완성 확인 및 스페이스바 처리
      setTimeout(() => {
        // 한글 입력 완료 후 처리를 위한 지연 적용
        if (finalText.endsWith(" ") && typing.checkLineCompletion(finalText)) {
          typing.advanceToNextLine()
        }
      }, 10)
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent Enter key from creating a new line
    if (e.key === "Enter") {
      e.preventDefault()
      return
    }

    // 오타가 있어도 다음 줄로 넘어갈 수 있는 단축키 (Ctrl+Enter)
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      // 현재 입력된 텍스트가 최소 길이 이상이면 다음 줄로 강제 이동
      const currentLineText = activeLines[typing.currentLineIndex] || ""
      if (typing.typedText.length >= currentLineText.length * 0.5) {
        // 최소 50% 이상 입력했으면 넘어갈 수 있음
        typing.skipToNextLine()
      }
      return
    }

    // Tab 키로 다음 줄로 이동, Shift+Tab으로 이전 줄로 이동
    if (e.key === "Tab") {
      e.preventDefault()
      if (e.shiftKey) {
        // Shift+Tab: 이전 줄로 이동
        typing.goToPreviousLine()
      } else {
        // Tab: 다음 줄로 이동
        typing.skipToNextLine()
      }
      return
    }

    // Toggle debug mode with Ctrl+D
    if (e.ctrlKey && e.key === "d") {
      e.preventDefault()
      setDebugMode(!debugMode)
      return
    }
  }

  // Handle container click to focus textarea
  const handleContainerClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Get visible lines (current line and a few before/after)
  const getVisibleLines = (): VisibleLine[] => {
    if (displayLines.length === 0) return []

    const startIdx = Math.max(0, typing.currentLineIndex - 1)
    const endIdx = Math.min(displayLines.length, typing.currentLineIndex + 4)
    return displayLines.slice(startIdx, endIdx).map((line, idx) => ({
      text: line,
      index: startIdx + idx,
    }))
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[80vh] flex flex-col items-center justify-center bg-background transition-theme"
      onClick={handleContainerClick}
    >
      {/* Hidden element for measuring text width */}
      <div ref={measureRef} className="absolute invisible" aria-hidden="true"></div>

      {/* 진행률 표시기 */}
      <ProgressBar
        progress={((activeChunkIndex * CHUNK_SIZE + typing.currentLineIndex) / Math.max(allLines.length, 1)) * 100}
        cpm={typing.stats.cpm}
        accuracy={typing.stats.accuracy}
        isCompleted={typing.isCompleted}
        netCpm={typing.stats.netCpm}
        showStats={showStats}
        onToggleStats={() => setShowStats(!showStats)}
      />

      <div className="flex justify-center w-full px-4 mx-auto mt-4">
        <div style={{ width: `${fixedWidth}px` }}>
          {/* 더블 스페이스 모드 토글 */}

          {/* 줄 완성 상태 표시 */}
          {typing.lineComplete && (
            <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-600 dark:text-green-400 flex items-center justify-center">
              <Space className="h-4 w-4 mr-2" />줄 완성! 스페이스바를 누르면 다음 줄로 이동합니다.
            </div>
          )}

          {/* Main typing area */}
          <div className="h-[400px] overflow-hidden relative space-y-10 mb-12 w-full" ref={textDisplayRef}>
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
                      typedText={typing.typedText}
                      isCurrentLine={isCurrentLine}
                      isPastLine={isPastLine}
                      isFutureLine={isFutureLine}
                      isComposing={typing.isComposing}
                    />

                    {/* 타이핑 텍스트 영역 - 현재 줄에만 표시 */}
                    {isCurrentLine && (
                      <div className="h-[1.5em] relative mt-1">
                        <textarea
                          ref={textareaRef}
                          className="typing-input"
                          onChange={typing.handleInputChange}
                          onKeyDown={handleKeyPress}
                          onCompositionStart={handleCompositionStart}
                          onCompositionEnd={handleCompositionEnd}
                          value={typing.typedText}
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

            {/* 타이핑 리듬 시각화 */}
            {typing.startTime && !typing.isCompleted && <TypingRhythmVisualizer typingRhythm={typing.typingRhythm} />}
          </div>

          {/* 키보드 단축키 가이드 */}
          <KeyboardShortcuts />

          {/* Debug information (only shown in debug mode) */}
          {debugMode && (
            <div className="mt-4 p-4 border border-border rounded-md text-xs font-mono">
              <h4 className="font-bold mb-2">Debug Info:</h4>
              <div>Current Line Index: {typing.currentLineIndex}</div>
              <div>Total Lines: {activeLines.length}</div>
              <div>Expected: "{activeLines[typing.currentLineIndex]}"</div>
              <div>Typed: "{typing.typedText}"</div>
              <div>Line Complete: {typing.lineComplete ? "Yes" : "No"}</div>
              <div>Is Composing: {typing.isComposing ? "Yes" : "No"}</div>
              <div>Double Space Mode: {typing.doubleSpaceMode ? "On" : "Off"}</div>
              <div>Fixed Width: {fixedWidth}px</div>
              <div>Current Position: {currentPosition}</div>
              <div>Active Chunk Index: {activeChunkIndex}</div>
              <div>Last Key: {typing.lastKeyPressed}</div>
              <div>
                Completion Percentage:{" "}
                {activeLines[typing.currentLineIndex]
                  ? ((typing.typedText.length / activeLines[typing.currentLineIndex].length) * 100).toFixed(1)
                  : 0}
                %
              </div>
              <div>
                Gross CPM: {typing.stats.cpm} | Gross WPM: {typing.stats.wpm}
              </div>
              <div>
                Net CPM: {typing.stats.netCpm} | Net WPM: {typing.stats.netWpm}
              </div>
              <div>
                Errors: {typing.stats.errorCount} | Corrections: {typing.stats.correctionCount}
              </div>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => typing.advanceToNextLine()} className="mr-2">
                  Force Next Line
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDebugMode(false)}>
                  Hide Debug
                </Button>
              </div>
            </div>
          )}

          {/* Completion message */}
          {typing.isCompleted && (
            <div className="text-center mt-16 mb-16 animate-fade-in">
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

          {/* Detailed statistics */}
          <DetailedStats
            stats={typing.stats}
            currentLineIndex={typing.currentLineIndex}
            totalLines={activeLines.length}
            startTime={typing.startTime}
            showStats={showStats}
          />
        </div>
      </div>
    </div>
  )
}
