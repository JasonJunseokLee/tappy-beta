"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface TypingInterfaceProps {
  text: string
  currentPosition: number
  onPositionChange: (position: number) => void
}

export default function TypingInterfaceV3({ text, currentPosition, onPositionChange }: TypingInterfaceProps) {
  // Core state
  const [startTime, setStartTime] = useState<number | null>(null)
  const [wpm, setWpm] = useState<number>(0)
  const [accuracy, setAccuracy] = useState<number>(100)
  const [errorCount, setErrorCount] = useState<number>(0)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [showStats, setShowStats] = useState<boolean>(false)
  const [typedText, setTypedText] = useState<string>("")
  const [currentLine, setCurrentLine] = useState<number>(0)
  const [lines, setLines] = useState<string[]>([])

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textDisplayRef = useRef<HTMLDivElement>(null)

  // Split text into lines on mount
  useEffect(() => {
    const textLines = text.split("\n").filter((line) => line.trim() !== "")
    setLines(textLines)
  }, [text])

  // Focus textarea on mount and when line changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [currentLine])

  // Calculate statistics
  useEffect(() => {
    if (startTime && currentPosition > 0) {
      // Calculate WPM (assuming 5 chars per word)
      const elapsedMinutes = (Date.now() - startTime) / 60000
      const words = currentPosition / 5
      const calculatedWpm = Math.round(words / elapsedMinutes)
      setWpm(calculatedWpm > 0 ? calculatedWpm : 0)

      // Calculate accuracy
      const calculatedAccuracy = Math.round(((currentPosition - errorCount) / currentPosition) * 100)
      setAccuracy(calculatedAccuracy > 0 ? calculatedAccuracy : 100)
    }
  }, [currentPosition, startTime, errorCount])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = e.target.value
    setTypedText(inputValue)

    // Start timer on first input
    if (startTime === null && inputValue.length > 0) {
      setStartTime(Date.now())
    }

    // Calculate errors by comparing with expected text
    const currentLineText = lines[currentLine]
    let errors = 0
    for (let i = 0; i < inputValue.length; i++) {
      if (i >= currentLineText.length || inputValue[i] !== currentLineText[i]) {
        errors++
      }
    }

    // Update error count
    setErrorCount(
      (prev) =>
        prev +
        errors -
        (typedText.length > 0 ? countErrors(typedText, currentLineText.substring(0, typedText.length)) : 0),
    )
  }

  // Count errors in a string
  const countErrors = (input: string, expected: string) => {
    let errors = 0
    for (let i = 0; i < input.length; i++) {
      if (i >= expected.length || input[i] !== expected[i]) {
        errors++
      }
    }
    return errors
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Enter is pressed and input matches current line, move to next line
    if (e.key === "Enter") {
      e.preventDefault()

      const currentLineText = lines[currentLine]

      // Calculate position change
      const positionChange = currentLineText.length + 1 // +1 for newline

      // Move to next line
      if (currentLine < lines.length - 1) {
        setCurrentLine(currentLine + 1)
        setTypedText("")
        onPositionChange(currentPosition + positionChange)
      } else {
        // Completed all lines
        setIsCompleted(true)
      }
    }
  }

  // Reset function
  const handleReset = () => {
    setStartTime(null)
    setWpm(0)
    setAccuracy(100)
    setErrorCount(0)
    setIsCompleted(false)
    setCurrentLine(0)
    setTypedText("")
    onPositionChange(0)

    if (textareaRef.current) {
      textareaRef.current.value = ""
      textareaRef.current.focus()
    }
  }

  // Calculate overall progress percentage
  const progress = (currentLine / lines.length) * 100

  // Handle container click to focus textarea
  const handleContainerClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[80vh] flex flex-col items-center justify-center bg-white"
      onClick={handleContainerClick}
    >
      <div className="w-full max-w-3xl mx-auto px-4">
        {/* Header with statistics */}
        <div className="mb-8 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {isCompleted ? <span className="text-black">Completed</span> : <span>{Math.round(progress)}%</span>}
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-sm text-gray-400">
              <span className="font-light text-black">{wpm}</span> <span className="text-xs">WPM</span>
            </div>
            <div className="text-sm text-gray-400">
              <span className="font-light text-black">{accuracy}%</span> <span className="text-xs">Accuracy</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showStats ? "Hide" : "Show"} Stats
            </Button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 w-full">
          <div className="h-[2px] bg-gray-100 w-full relative">
            <div
              className="absolute top-0 left-0 h-[2px] bg-black transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Main typing area */}
        <div className="space-y-8 mb-8">
          {/* Previous lines (completed) */}
          <div className="space-y-4">
            {lines.slice(0, currentLine).map((line, index) => (
              <div key={index} className="font-mono text-lg leading-relaxed text-gray-400">
                {line}
              </div>
            ))}
          </div>

          {/* Current line to type */}
          {!isCompleted && lines[currentLine] && (
            <div className="space-y-4">
              <div className="font-mono text-lg leading-relaxed">
                {lines[currentLine].split("").map((char, index) => {
                  let className = "text-gray-300" // Not yet typed

                  if (index < typedText.length) {
                    // Character has been typed
                    className = typedText[index] === char ? "text-black" : "text-red-500"
                  }

                  return (
                    <span key={index} className={className}>
                      {char === " " ? "\u00A0" : char}
                    </span>
                  )
                })}
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  className="w-full py-2 px-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black resize-none"
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  value={typedText}
                  autoFocus
                  rows={1}
                  placeholder="Type the line above, then press Enter..."
                />
                <div className="absolute right-3 top-2 text-xs text-gray-400">Press Enter when finished</div>
              </div>
            </div>
          )}

          {/* Upcoming lines */}
          <div className="space-y-4">
            {lines.slice(currentLine + 1, currentLine + 4).map((line, index) => (
              <div key={index} className="font-mono text-lg leading-relaxed text-gray-200">
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Completion message */}
        {isCompleted && (
          <div className="text-center mt-8 mb-8">
            <p className="text-lg mb-4">You've completed the text!</p>
            <Button onClick={handleReset} variant="outline" className="rounded-md border-gray-200 hover:bg-gray-50">
              <RefreshCw className="mr-2 h-4 w-4" />
              Practice Again
            </Button>
          </div>
        )}

        {/* Detailed statistics */}
        {showStats && (
          <div className="mt-8 p-4 border border-gray-100 rounded-md">
            <h3 className="text-sm font-medium mb-4">Detailed Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Lines Completed</p>
                <p className="text-lg font-light">
                  {currentLine} / {lines.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Words</p>
                <p className="text-lg font-light">{Math.round(currentPosition / 5)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Errors</p>
                <p className="text-lg font-light">{errorCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Time</p>
                <p className="text-lg font-light">{startTime ? Math.round((Date.now() - startTime) / 1000) : 0}s</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
