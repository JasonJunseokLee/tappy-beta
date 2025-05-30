"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import type { TypingStats } from "@/types/typing"
import { normalizeText, isSymbol, calculateKoreanKeystrokes, countErrors } from "@/utils/typing-utils"

// 소리 관련 import 추가
import { useTypingSound } from "@/hooks/use-typing-sound"

interface UseUncontrolledTypingOptions {
  ignoreSymbols?: boolean
  autoAdvance?: boolean
}

// 훅 내부에 소리 관련 코드 추가
export function useUncontrolledTyping(
  displayLines: string[],
  initialLineIndex = 0,
  options: UseUncontrolledTypingOptions = {},
) {
  const { ignoreSymbols = true, autoAdvance = true } = options

  // 타이핑 소리 훅 추가
  const { playKeySound, playLineCompleteSound } = useTypingSound()

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
  const [isComposing, setIsComposing] = useState<boolean>(false)
  const [lineComplete, setLineComplete] = useState<boolean>(false)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [typingRhythm, setTypingRhythm] = useState<number[]>([])
  const [lastKeyPressed, setLastKeyPressed] = useState<string>("")

  // 현재 입력된 텍스트를 상태로 관리하지 않고 ref로 관리
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const lastInputValueRef = useRef<string>("")
  const lastKeyPressTimeRef = useRef<number>(0)
  const lineIndexRef = useRef<number>(initialLineIndex)
  const isProcessingRef = useRef<boolean>(false)

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
  const updateTypingRhythm = () => {
    const now = Date.now()
    if (lastKeyPressTimeRef.current > 0) {
      const interval = now - lastKeyPressTimeRef.current
      // 타이핑 간격이 2초 이내인 경우만 리듬으로 기록 (긴 일시정지 제외)
      if (interval < 2000) {
        setTypingRhythm((prev) => {
          // 최대 20개 간격만 저장
          const newRhythm = [...prev, interval]
          if (newRhythm.length > 20) {
            return newRhythm.slice(-20)
          }
          return newRhythm
        })
      }
    }
    lastKeyPressTimeRef.current = now
  }

  // 현재 입력된 텍스트 가져오기
  const getCurrentInputValue = (): string => {
    return inputRef.current?.value || ""
  }

  // Check if the current line is complete
  const checkLineCompletion = useCallback((): boolean => {
    if (currentLineIndex >= displayLines.length) return false

    const currentLineText = displayLines[currentLineIndex]
    if (!currentLineText) return false

    // 현재 입력된 텍스트 가져오기
    const inputValue = getCurrentInputValue()

    // 정규화된 텍스트 비교
    const normalizedLineText = normalizeText(currentLineText)
    const normalizedTypedText = normalizeText(inputValue)

    // 완전히 일치하는 경우
    if (normalizedTypedText === normalizedLineText) {
      if (!lineComplete) {
        setLineComplete(true)
      }
      return true
    }

    // 입력 텍스트 길이가 원본 텍스트 길이와 같거나 더 길면 완료로 간주
    if (normalizedTypedText.length >= normalizedLineText.length) {
      if (!lineComplete) {
        setLineComplete(true)
      }
      return true
    }

    // 입력 텍스트가 원본 텍스트의 95% 이상이고, 마지막 부분이 일치하는 경우에도 완료로 간주
    if (normalizedTypedText.length >= normalizedLineText.length * 0.95) {
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
  }, [currentLineIndex, displayLines, lineComplete])

  // 줄 이동 함수
  const advanceToNextLine = useCallback(() => {
    // 이미 처리 중이면 이동하지 않음
    if (isProcessingRef.current) return

    // 처리 중 플래그 설정
    isProcessingRef.current = true

    // 이미 다음 줄로 이동 중인지 확인 (중복 호출 방지)
    if (lineIndexRef.current !== currentLineIndex) {
      isProcessingRef.current = false
      return
    }

    // 줄 완성 여부 확인 - 이미 완성된 상태라면 확인 생략
    const isLineComplete = lineComplete || checkLineCompletion()

    if (isLineComplete && currentLineIndex < displayLines.length - 1) {
      // 다음 줄로 이동하기 전에 현재 입력 필드의 값을 저장
      const currentValue = inputRef.current?.value || ""

      // 마지막 입력값 초기화 (오류 계산 방지)
      lastInputValueRef.current = ""

      // 다음 줄로 이동
      setCurrentLineIndex((prev) => prev + 1)
      setLineComplete(false)

      // 입력 필드 초기화 및 포커스
      if (inputRef.current) {
        // 입력 필드를 즉시 비우기 (스페이스바 입력 전에)
        inputRef.current.value = ""

        // 포커스 유지
        setTimeout(() => {
          if (inputRef.current) {
            // 다시 한번 입력 필드가 비어있는지 확인하고 포커스
            inputRef.current.value = ""
            inputRef.current.focus()
          }
        }, 0)
      }

      // 처리 완료 플래그 해제
      setTimeout(() => {
        isProcessingRef.current = false
      }, 10)
    } else if (currentLineIndex >= displayLines.length - 1) {
      // 모든 줄 완료
      setIsCompleted(true)
      isProcessingRef.current = false
    } else {
      // 줄이 완성되지 않았으면 처리 완료 플래그 해제
      isProcessingRef.current = false
    }
  }, [checkLineCompletion, currentLineIndex, displayLines.length, lineComplete])

  // 이전 줄로 이동하는 함수
  const goToPreviousLine = useCallback(() => {
    // 한글 입력 중이면 이동하지 않음
    if (isComposing) return

    // 첫 번째 줄이 아닌 경우에만 이전 줄로 이동
    if (currentLineIndex > 0) {
      setCurrentLineIndex((prev) => prev - 1)
      setLineComplete(false)

      // 입력 필드 초기화 및 포커스
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.value = ""
          inputRef.current.focus()

          // 마지막 입력값 업데이트
          lastInputValueRef.current = ""
        }
      }, 10)
    }
  }, [currentLineIndex, isComposing])

  // 줄 스킵 함수 - 진행도 체크 없이 무조건 다음 줄로 이동
  const skipToNextLine = useCallback(() => {
    // 한글 입력 중이면 이동하지 않음
    if (isComposing) return

    if (currentLineIndex < displayLines.length - 1) {
      // 현재 입력값 가져오기
      const currentInput = getCurrentInputValue()

      // 스페이스바 이후의 텍스트 추출 (있는 경우)
      let pendingText = ""
      const spaceIndex = currentInput.lastIndexOf(" ")

      // 스페이스바 이후에 텍스트가 있으면 저장
      if (spaceIndex !== -1 && spaceIndex < currentInput.length - 1) {
        pendingText = currentInput.substring(spaceIndex + 1)
      }

      // 다음 줄로 이동 전에 마지막 입력값 초기화 (오류 계산 방지)
      lastInputValueRef.current = ""

      // 다음 줄로 이동
      setCurrentLineIndex((prev) => prev + 1)
      setLineComplete(false)

      // 입력 필드 초기화 및 포커스
      setTimeout(() => {
        if (inputRef.current) {
          // 저장된 텍스트가 있으면 다음 줄에 적용
          inputRef.current.value = pendingText
          inputRef.current.focus()

          // 마지막 입력값 업데이트
          lastInputValueRef.current = pendingText
        }
      }, 10)
    } else {
      // 모든 줄 완료
      setIsCompleted(true)
    }
  }, [currentLineIndex, displayLines.length, isComposing])

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
    setCurrentLineIndex(initialLineIndex)
    setLineComplete(false)
    setIsCompleted(false)
    setTypingRhythm([])

    // 입력 필드 초기화 및 포커스
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.focus()
    }

    // 모든 참조 변수 초기화
    lastInputValueRef.current = ""
    lastKeyPressTimeRef.current = 0
    isProcessingRef.current = false

    // 추가 상태 초기화 확인
    console.log("타이핑 상태 완전 초기화 완료")
  }, [initialLineIndex])

  // Calculate overall progress percentage
  const progress = displayLines.length > 0 ? (currentLineIndex / displayLines.length) * 100 : 0

  // 이벤트 핸들러 - 키 입력
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // 키 입력 소리 재생
      playKeySound(e.key)

      // Prevent Enter key from creating a new line
      if (e.key === "Enter") {
        e.preventDefault()
        return
      }

      // 오타가 있어도 다음 줄로 넘어갈 수 있는 단축키 (Ctrl+Enter)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        skipToNextLine()
        return
      }

      // Tab 키로 다음 줄로 이동, Shift+Tab으로 이전 줄로 이동
      if (e.key === "Tab") {
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+Tab: 이전 줄로 이동
          goToPreviousLine()
        } else {
          // Tab: 다음 줄로 이동
          skipToNextLine()
        }
        return
      }

      // 스페이스바 처리 - 줄이 완성되었으면 즉시 다음 줄로 이동
      if (e.key === " ") {
        // 줄 완성 여부 확인 (이미 완성된 상태이거나 현재 입력으로 완성되는 경우)
        const isComplete = lineComplete || checkLineCompletion()

        if (isComplete) {
          e.preventDefault() // 스페이스바 기본 동작 방지

          // 현재 입력 필드의 값을 저장하고 스페이스를 제거
          if (inputRef.current) {
            const currentValue = inputRef.current.value
            // 스페이스바 입력 전의 값으로 설정 (마지막 스페이스 제거)
            if (currentValue.endsWith(" ")) {
              inputRef.current.value = currentValue.slice(0, -1)
            }
          }

          // 즉시 다음 줄로 이동
          advanceToNextLine()
          return // 추가 처리 중단
        }
      }

      // 마지막 키 저장
      setLastKeyPressed(e.key)
    },
    [advanceToNextLine, goToPreviousLine, lineComplete, skipToNextLine, checkLineCompletion, playKeySound],
  )

  // 이벤트 핸들러 - 입력 변경
  const handleInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement
      const inputValue = target.value

      // 시작 타이머 설정
      if (startTime === null && inputValue.length > 0) {
        setStartTime(Date.now())
      }

      // 새로 추가된 문자 확인
      if (inputValue.length > lastInputValueRef.current.length) {
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
        // 삭제된 문자 수만큼 수정 횟수 증가
        const deletedChars = lastInputValueRef.current.length - inputValue.length
        setStats((prev) => ({
          ...prev,
          correctionCount: prev.correctionCount + deletedChars,
        }))
      }

      // 오류 계산 - 사용자가 직접 입력한 경우에만 오류 계산
      // 줄 이동이나 챕터 이동으로 인한 변경은 오류로 간주하지 않음
      if (
        !isComposing && // 한글 조합 중이 아닐 때만 오류 계산
        inputValue.length > 0 &&
        lastInputValueRef.current.length > 0 &&
        Math.abs(inputValue.length - lastInputValueRef.current.length) < 5
      ) {
        // 급격한 변화는 탭이나 다음 챕터 이동으로 간주
        const currentLineText = displayLines[currentLineIndex] || ""
        let errors = 0

        // 현재 입력된 텍스트와 예상 텍스트 비교
        for (let i = 0; i < inputValue.length; i++) {
          if (i >= currentLineText.length || inputValue[i] !== currentLineText[i]) {
            // 기호 무시 옵션이 켜져 있고, 예상 문자가 기호인 경우 오류로 간주하지 않음
            if (ignoreSymbols && i < currentLineText.length && isSymbol(currentLineText[i])) {
              continue
            }
            errors++
          }
        }

        // 이전 입력과 비교하여 새로 추가된 오류만 계산
        const prevErrors = stats.errorCount
        const previousErrors =
          lastInputValueRef.current.length > 0
            ? countErrors(
                lastInputValueRef.current,
                currentLineText.substring(0, lastInputValueRef.current.length),
                ignoreSymbols,
              )
            : 0

        const newErrors = errors - previousErrors

        // 실제 새로운 오류가 있는 경우에만 카운트 증가
        if (newErrors > 0) {
          setStats((prev) => ({
            ...prev,
            errorCount: prevErrors + newErrors,
          }))
        }
      }

      // 마지막 입력값 업데이트
      lastInputValueRef.current = inputValue

      // 스페이스바 입력 감지 및 처리
      if (inputValue.endsWith(" ")) {
        // 줄 완성 여부 확인
        const isComplete = lineComplete || checkLineCompletion()
        if (isComplete) {
          // 스페이스바 입력 전의 값으로 설정 (마지막 스페이스 제거)
          if (inputRef.current) {
            inputRef.current.value = inputValue.slice(0, -1)
            lastInputValueRef.current = inputValue.slice(0, -1)
          }

          // 즉시 다음 줄로 이동
          advanceToNextLine()
          return
        }
      }

      // 줄 완성 여부 확인 및 소리 재생
      if (autoAdvance) {
        const isComplete = checkLineCompletion()
        if (isComplete && !lineComplete) {
          // 줄 완성 소리 재생
          playLineCompleteSound()
        }
      }
    },
    [
      autoAdvance,
      checkLineCompletion,
      currentLineIndex,
      displayLines,
      ignoreSymbols,
      startTime,
      stats.errorCount,
      advanceToNextLine,
      lineComplete,
      isComposing,
      playLineCompleteSound,
    ],
  )

  // 이벤트 핸들러 - 한글 입력 시작
  const handleCompositionStart = useCallback(() => {
    setIsComposing(true)
  }, [])

  // 이벤트 핸들러 - 한글 입력 완료
  const handleCompositionEnd = useCallback(() => {
    // 한글 입력 완료 상태로 설정
    setIsComposing(false)

    // 현재 입력값 가져오기
    const inputValue = getCurrentInputValue()
    const currentLineText = displayLines[currentLineIndex] || ""

    // 한글 입력 완료 후 오류 체크
    if (inputValue.length > 0) {
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

      // 이전 입력과 비교하여 새로 추가된 오류만 계산
      const prevErrors = stats.errorCount
      const previousErrors =
        lastInputValueRef.current.length > 0
          ? countErrors(
              lastInputValueRef.current,
              currentLineText.substring(0, lastInputValueRef.current.length),
              ignoreSymbols,
            )
          : 0

      const newErrors = errors - previousErrors

      // 실제 새로운 오류가 있는 경우에만 카운트 증가
      if (newErrors > 0) {
        setStats((prev) => ({
          ...prev,
          errorCount: prevErrors + newErrors,
        }))
      }
    }

    // 줄 완성 여부 즉시 확인
    const isComplete = checkLineCompletion()

    // 줄이 완성되었고 스페이스바로 끝나면 즉시 다음 줄로 이동
    if (isComplete && inputValue.endsWith(" ")) {
      // 스페이스바 입력 전의 값으로 설정 (마지막 스페이스 제거)
      if (inputRef.current) {
        inputRef.current.value = inputValue.slice(0, -1)
        lastInputValueRef.current = inputValue.slice(0, -1)
      }

      // 약간의 지연 후 다음 줄로 이동 (한글 입력 완료 처리를 위해)
      setTimeout(() => {
        advanceToNextLine()
      }, 0)
    }

    // 한글 입력 완료 후 추가 키 입력을 위한 준비
    // 포커스 유지 및 입력 필드 상태 업데이트
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [advanceToNextLine, checkLineCompletion, currentLineIndex, displayLines, ignoreSymbols, stats.errorCount])

  // 현재 줄 인덱스 설정 함수
  const setCurrentLine = useCallback((index: number) => {
    setCurrentLineIndex(index)
    setLineComplete(false)

    // 입력 필드 초기화 및 포커스
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.value = ""
        inputRef.current.focus()

        // 마지막 입력값 업데이트
        lastInputValueRef.current = ""
      }
    }, 10)
  }, [])

  return {
    currentLineIndex,
    lineComplete,
    isCompleted,
    isComposing,
    progress,
    stats,
    typingRhythm,
    startTime,
    lastKeyPressed,
    inputRef,
    getCurrentInputValue,
    handleKeyDown,
    handleInput,
    handleCompositionStart,
    handleCompositionEnd,
    advanceToNextLine,
    goToPreviousLine,
    skipToNextLine,
    checkLineCompletion,
    setCurrentLine,
    reset,
  }
}
