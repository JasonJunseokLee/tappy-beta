"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useTypingSound } from "@/hooks/use-typing-sound"

interface TypingLineProps {
  text: string
  onLineComplete: () => void
}

const TypingLine: React.FC<TypingLineProps> = ({ text, onLineComplete }) => {
  const [typedText, setTypedText] = useState("")
  const [errorIndex, setErrorIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { playKeySound, playLineCompleteSound } = useTypingSound()

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentIndex = typedText.length

    if (e.key === "Backspace") {
      setTypedText((prev) => prev.slice(0, -1))
      setErrorIndex(null)
      return
    }

    if (currentIndex < text.length) {
      if (e.key === text[currentIndex]) {
        setTypedText((prev) => prev + e.key)
        setErrorIndex(null)
        playKeySound(e.key, false) // 키 입력 시 소리 재생
      } else {
        setErrorIndex(currentIndex)
        playKeySound(e.key, true) // 오류 발생 시 소리 재생
      }
    }
  }

  useEffect(() => {
    if (typedText === text) {
      playLineCompleteSound() // 줄 완성 시 소리 재생
      onLineComplete()
    }
  }, [typedText, text, onLineComplete, playLineCompleteSound])

  return (
    <div>
      <input
        type="text"
        ref={inputRef}
        value={typedText}
        onKeyDown={handleKeyDown}
        style={{ opacity: 0, position: "absolute" }}
      />
      <div>
        {text.split("").map((char, index) => (
          <span
            key={index}
            style={{
              color: index < typedText.length ? (index === errorIndex ? "red" : "green") : "black",
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  )
}

export default TypingLine
