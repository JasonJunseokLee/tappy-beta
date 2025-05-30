"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import type { TypingStats } from "@/types/typing"
import { normalizeText, isSymbol, calculateKoreanKeystrokes, countErrors } from "@/utils/typing-utils"

interface UseTypingOptions {
  ignoreSymbols?: boolean
  autoAdvance?: boolean
}

export function useTyping(displayLines: string[], initialLineIndex = 0, options: UseTypingOptions = {}) {
  const { ignoreSymbols = true, autoAdvance = true } = options

  // Core state
  const [startTime, setStartTime] = useState<number | null>(null)
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    cpm: 0,
    netWpm: 0,
    netCpm: 0,
    accuracy: 100,
    errorCount: 0,
    correctionCount: 0,
    keyPressCount: 0,
  })
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(initialLineIndex)
  const [typedText, setTypedText] = useState<string>("")
  const [isComposing, setIsComposing] = useState<boolean>(false)
  const [lineComplete, setLineComplete] = useState<boolean>(false)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [typingRhythm, setTypingRhythm] = useState<number[]>([])
  const [lastKeyPressed, setLastKeyPressed] = useState<string>("")
  // 새로운 상태 추가
  const [pendingNextLine, setPendingNextLine] = useState<boolean>(false)
  const [doubleSpaceMode, setDoubleSpaceMode] = useState<boolean>(true)
  const [lastSpaceTime, setLastSpaceTime] = useState<number>(0)

  // Refs
  const lastInputValueRef = useRef<string>("")
  const lastKeyPressTimeRef = useRef<number>(0)
  const lineIndexRef = useRef<number>(initialLineIndex)
  const pendingTextRef = useRef<string>("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update line index ref when it changes
  useEffect(() => {
    lineIndexRef.current = currentLineIndex
  }, [currentLineIndex])

  // Calculate statistics
  useEffect(() => {
    if (startTime && stats.keyPressCount > 0) {
      // 경과 시간(분) - 안정성을 위해 최소값 설정
      const elapsedMinutes = Math.max((Date.now() - startTime) / 60000, 0.01)

      // 타수 계산 - 한글 타자연습기 기준으로 조정
      const calculatedCpm = Math.round(stats.keyPressCount / elapsedMinutes)
      const calculatedWpm = Math.round(calculatedCpm / 2)

      // Net CPM 계산 (오타를 제외한 실제 유효 타수)
      const calculatedNetCpm = Math.round((stats.keyPressCount - stats.errorCount) / elapsedMinutes)
      const calculatedNetWpm = Math.round(calculatedNetCpm / 2)

      // 정확도 계산
      const calculatedAccuracy = Math.round(((stats.keyPressCount - stats.errorCount) / stats.keyPressCount) * 100)

      setStats((prev) => ({
        ...prev,
        cpm: calculatedCpm > 0 ? calculatedCpm : 0,
        wpm: calculatedWpm > 0 ? calculatedWpm : 0,
        netCpm: calculatedNetCpm > 0 ? calculatedNetCpm : 0,
        netWpm: calculatedNetWpm > 0 ? calculatedNetWpm : 0,
        accuracy: calculatedAccuracy > 0 ? calculatedAccuracy : 100,
      }))
    }
  }, [stats.keyPressCount, stats.errorCount, startTime])

  // 타이핑 리듬 업데이트
  const updateTypingRhythm = useCallback(() => {
    const now = Date.now()
    if (lastKeyPressTimeRef.current > 0) {
      const interval = now - lastKeyPressTimeRef.current
      // 타이핑 간격이 2초 이내인 경우만 리듬으로 기록 (긴 일시정지 제외)
      if (interval < 2000) {
        setTypingRhythm((prev) => {
          // 최대 20개 간격만 저장
          const newRhythm = [...prev, interval]
          return newRhythm.length > 20 ? newRhythm.slice(-20) : newRhythm
        })
      }
    }
    lastKeyPressTimeRef.current = now
  }, [])

  // Check if the current line is complete
  const memoizedCheckLineCompletion = useCallback(
    (inputText: string = typedText): boolean => {
      if (currentLineIndex >= displayLines.length) return false

      const currentLineText = displayLines[currentLineIndex]
      if (!currentLineText) return false

      // 정규화된 텍스트 비교
      const normalizedLineText = normalizeText(currentLineText)
      const normalizedTypedText = normalizeText(inputText)

      // 완전히 일치하는 경우
      if (normalizedTypedText === normalizedLineText) {
        if (!lineComplete) {
          setLineComplete(true)
        }
        return true
      }

      // 입력 텍스트가 원본 텍스트의 99% 이상이고, 마지막 부분이 일치하는 경우에만 완료로 간주
      // 더 엄격한 기준 적용 (98%에서 99%로 변경)
      if (normalizedTypedText.length >= normalizedLineText.length * 0.99) {
        const lastCharsCount = Math.max(5, Math.floor(normalizedLineText.length * 0.2))
        const expectedEnd = normalizedLineText.slice(-Math.min(lastCharsCount, normalizedLineText.length))

        if (normalizedTypedText.includes(expectedEnd)) {
          if (!lineComplete) {
            setLineComplete(true)
          }
          return true
        }
      }

      // 완료 조건을 충족하지 않으면 lineComplete 상태를 false로 설정
      if (lineComplete) {
        setLineComplete(false)
      }

      return false
    },
    [currentLineIndex, displayLines, lineComplete, typedText],
  )

  // checkLineCompletion 함수를 메모이제이션된 버전으로 교체
  const checkLineCompletion = memoizedCheckLineCompletion

  // 줄 이동 함수 - 선언 먼저 해서 순환 참조 방지
  const advanceToNextLine = useCallback(() => {
    // 한글 입력 중이면 이동하지 않음
    if (isComposing) return

    // 이미 다음 줄로 이동 중인지 확인 (중복 호출 방지)
    if (lineIndexRef.current !== currentLineIndex) return

    // 현재 줄이 최소 길이 이상 입력되었는지 확인
    const currentLineText = displayLines[currentLineIndex] || ""
    const normalizedLineText = normalizeText(currentLineText)
    const normalizedTypedText = normalizeText(typedText)

    // 줄이 완전히 일치하거나 매우 유사한 경우에만 다음 줄로 이동
    if (
      normalizedTypedText === normalizedLineText ||
      (normalizedTypedText.length >= normalizedLineText.length * 0.99 &&
        normalizedTypedText.includes(normalizedLineText.slice(-5)))
    ) {
      if (currentLineIndex < displayLines.length - 1) {
        // 스페이스바 이후의 텍스트 추출 (있는 경우)
        let pendingText = ""
        const spaceIndex = typedText.lastIndexOf(" ")

        // 스페이스바 이후에 텍스트가 있으면 저장
        if (spaceIndex !== -1 && spaceIndex < typedText.length - 1) {
          pendingText = typedText.substring(spaceIndex + 1)
        }

        // 다음 줄로 이동
        setCurrentLineIndex((prev) => prev + 1)

        // 저장된 텍스트가 있으면 다음 줄에 적용
        if (pendingText) {
          setTimeout(() => {
            setTypedText(pendingText)
            lastInputValueRef.current = pendingText
          }, 10)
        } else {
          // 없으면 초기화
          setTypedText("")
          lastInputValueRef.current = ""
        }

        setLineComplete(false)
      } else {
        // 모든 줄 완료
        setIsCompleted(true)
      }
    }
  }, [isComposing, currentLineIndex, displayLines, typedText])

  // 스페이스바 처리 함수 - 별도로 분리
  const handleSpaceKey = useCallback((inputValue: string) => {
    const now = Date.now()
    const isDoubleSpace = now - lastSpaceTime < 500 // 500ms 이내에 두 번 스페이스바를 누르면 더블 스페이스로 간주

    // 더블 스페이스 모드가 활성화되어 있고, 더블 스페이스가 감지되었을 때만 다음 줄로 이동
    if (doubleSpaceMode && isDoubleSpace && lineComplete) {
      // 스페이스바 이후의 텍스트를 저장
      const afterSpaceText = inputValue.substring(inputValue.lastIndexOf(" ") + 1)
      pendingTextRef.current = afterSpaceText

      // 다음 줄로 이동
      advanceToNextLine()
      return true
    }

    // 더블 스페이스 모드가 비활성화되어 있고, 줄이 완료되었으며, 스페이스바로 끝나는 경우
    if (!doubleSpaceMode && lineComplete && inputValue.endsWith(" ")) {
      // 스페이스바 이후의 텍스트를 저장 (이 경우에는 없음)
      pendingTextRef.current = ""

      // 다음 줄로 이동
      advanceToNextLine()
      return true
    }

    // 스페이스바 시간 업데이트
    setLastSpaceTime(now)
    return false
  }, [doubleSpaceMode, lastSpaceTime, lineComplete, advanceToNextLine])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value

    // 시작 타이머 설정
    if (startTime === null && inputValue.length > 0) {
      setStartTime(Date.now())
    }

    // 새로 추가된 문자 확인
    if (inputValue.length > lastInputValueRef.current.length) {
      const newChar = inputValue.slice(-1)
      setLastKeyPressed(newChar) // 마지막 입력 키 저장

      // 새로 추가된 문자 확인
      const newChars = inputValue.slice(lastInputValueRef.current.length)
      const newKeystrokesCount = calculateKoreanKeystrokes(newChars)

      // 키 입력 횟수 증가
      setStats((prev) => ({
        ...prev,
        keyPressCount: prev.keyPressCount + newKeystrokesCount,
      }))

      // 타이핑 리듬 업데이트
      updateTypingRhythm()
    } else if (inputValue.length < lastInputValueRef.current.length) {
      // 백스페이스 등 수정 동작 감지
      setLastKeyPressed("Backspace") // 백스페이스 감지

      // 삭제된 문자 수만큼 수정 횟수 증가
      const deletedChars = lastInputValueRef.current.length - inputValue.length
      setStats((prev) => ({
        ...prev,
        correctionCount: prev.correctionCount + deletedChars,
      }))
    }

    // 중요: 한글 입력 중에는 스페이스바 처리를 하지 않음
    if (isComposing) {
      setTypedText(inputValue)
      lastInputValueRef.current = inputValue
      return
    }

    // 오류 계산
    const currentLineText = displayLines[currentLineIndex] || ""
    let errors = 0
    for (let i = 0; i < inputValue.length; i++) {
      if (i >= currentLineText.length || inputValue[i] !== currentLineText[i]) {
        // 기호 무시 옵션이 켜져 있고, 예상 문자가 기호인 경우 오류로 간주하지 않음
        if (ignoreSymbols && i < currentLineText.length && isSymbol(currentLineText[i])) {
          continue
        }
        errors++
      }
    }

    // 오류 수 업데이트
    const prevErrors = stats.errorCount
    const newErrors =
      errors -
      (typedText.length > 0 ? countErrors(typedText, currentLineText.substring(0, typedText.length), ignoreSymbols) : 0)

    if (newErrors > 0) {
      setStats((prev) => ({
        ...prev,
        errorCount: prevErrors + newErrors,
      }))
    }

    // 줄 완성 확인
    if (autoAdvance) {
      checkLineCompletion(inputValue)
    }

    // 스페이스바 처리 - 한글 입력 중이 아닐 때만
    if (
      !isComposing &&
      inputValue.endsWith(" ") &&
      lastInputValueRef.current &&
      !lastInputValueRef.current.endsWith(" ")
    ) {
      // 스페이스바가 새로 입력되었고, 줄이 완성된 상태라면
      if (lineComplete) {
        // 다음 줄로 이동하기 전에 현재 입력값 저장
        lastInputValueRef.current = inputValue
        setTypedText(inputValue)

        // 약간의 지연 후 다음 줄로 이동
        setTimeout(() => {
          advanceToNextLine()
        }, 10)
        return
      }
    }

    // 상태 업데이트
    setTypedText(inputValue)
    lastInputValueRef.current = inputValue
  }, [startTime, isComposing, lineComplete, typedText, displayLines, currentLineIndex, ignoreSymbols, autoAdvance, stats.errorCount])

  // setCurrentLineIndex 함수 정의
  const setCurrentLineIndexWithReset = useCallback((index: number) => {
    setCurrentLineIndex(index)
    setTypedText("")
    setLineComplete(false)
    lastInputValueRef.current = ""
    pendingTextRef.current = ""
  }, [])

  // 이 함수는 위에서 이미 선언되었으므로 제거

  // 이전 줄로 이동하는 함수
  const goToPreviousLine = useCallback(() => {
    // 한글 입력 중이면 이동하지 않음
    if (isComposing) return

    // 첫 번째 줄이 아닌 경우에만 이전 줄로 이동
    if (currentLineIndex > 0) {
      setCurrentLineIndexWithReset(currentLineIndex - 1)
      setLineComplete(false)
      lastInputValueRef.current = ""
      pendingTextRef.current = ""
    }
  }, [isComposing, currentLineIndex])

  // 줄 스킵 함수 - 진행도 체크 없이 무조건 다음 줄로 이동
  const skipToNextLine = useCallback(() => {
    // 한글 입력 중이면 이동하지 않음
    if (isComposing) return

    if (currentLineIndex < displayLines.length - 1) {
      // 현재 입력 중인 텍스트를 저장
      const currentInput = typedText

      // 스페이스바 이후의 텍스트가 있으면 저장
      if (currentInput.includes(" ")) {
        pendingTextRef.current = currentInput.substring(currentInput.lastIndexOf(" ") + 1)
      } else {
        pendingTextRef.current = ""
      }

      setCurrentLineIndexWithReset(currentLineIndex + 1)

      // 저장된 텍스트가 있으면 다음 줄에 적용
      if (pendingTextRef.current) {
        setTimeout(() => {
          setTypedText(pendingTextRef.current)
          lastInputValueRef.current = pendingTextRef.current
          pendingTextRef.current = ""
        }, 10)
      } else {
        // 없으면 초기화
        setTypedText("")
        lastInputValueRef.current = ""
      }

      setLineComplete(false)
    } else {
      // 모든 줄 완료
      setIsCompleted(true)
    }
  }, [isComposing, currentLineIndex, displayLines, typedText])

  // Reset function
  const reset = useCallback(() => {
    setStartTime(null)
    setStats({
      wpm: 0,
      cpm: 0,
      netWpm: 0,
      netCpm: 0,
      accuracy: 100,
      errorCount: 0,
      correctionCount: 0,
      keyPressCount: 0,
    })
    setCurrentLineIndexWithReset(initialLineIndex)
    setTypedText("")
    setLineComplete(false)
    setIsCompleted(false)
    setTypingRhythm([])
    lastInputValueRef.current = ""
    lastKeyPressTimeRef.current = 0
    pendingTextRef.current = ""
    setLastSpaceTime(0)
  }, [initialLineIndex])

  // 더블 스페이스 모드 토글 함수
  const toggleDoubleSpaceMode = () => {
    setDoubleSpaceMode((prev) => !prev)
  }

  // Calculate overall progress percentage
  const progress = displayLines.length > 0 ? (currentLineIndex / displayLines.length) * 100 : 0

  const handleCompositionEnd = () => {
    setIsComposing(false)

    // 한글 입력 완료 후 현재 입력값 확인
    if (textareaRef.current) {
      const finalText = textareaRef.current.value

      // 상태 업데이트
      setTypedText(finalText)
      lastInputValueRef.current = finalText

      // 줄 완성 확인
      checkLineCompletion(finalText)

      // 스페이스바로 끝나는 경우 줄 이동 확인
      if (finalText.endsWith(" ") && lineComplete) {
        setTimeout(() => {
          advanceToNextLine()
        }, 10)
      }
    }
  }

  return {
    typedText,
    currentLineIndex,
    lineComplete,
    isComposing,
    isCompleted,
    startTime,
    stats,
    typingRhythm,
    lastKeyPressed,
    doubleSpaceMode,
    handleInputChange,
    setIsComposing,
    checkLineCompletion,
    advanceToNextLine,
    goToPreviousLine,
    skipToNextLine,
    toggleDoubleSpaceMode,
    reset,
    setCurrentLineIndex: setCurrentLineIndexWithReset,
    handleCompositionEnd,
    textareaRef,
  }
}
