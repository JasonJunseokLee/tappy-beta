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

export default function TypingInterfaceV2({ text, currentPosition, onPositionChange }: TypingInterfaceProps) {
  // Core state
  const [startTime, setStartTime] = useState<number | null>(null)
  const [wpm, setWpm] = useState<number>(0)
  const [accuracy, setAccuracy] = useState<number>(100)
  const [errorCount, setErrorCount] = useState<number>(0)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [showStats, setShowStats] = useState<boolean>(false)
  const [typedText, setTypedText] = useState<string>("")
  const [visibleTextStart, setVisibleTextStart] = useState<number>(0)
  const [visibleTextEnd, setVisibleTextEnd] = useState<number>(500) // Show first 500 chars initially

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const textDisplayRef = useRef<HTMLDivElement>(null)

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  // Update visible text range when current position changes
  useEffect(() => {
    const windowSize = 500 // Characters to show before and after current position
    const newStart = Math.max(0, currentPosition - windowSize / 2)
    const newEnd = Math.min(text.length, currentPosition + windowSize / 2)

    setVisibleTextStart(newStart)
    setVisibleTextEnd(newEnd)

    // Scroll the text display to keep the current position in view
    if (textDisplayRef.current) {
      const currentPosElement = textDisplayRef.current.querySelector(".current-position")
      if (currentPosElement) {
        currentPosElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [currentPosition, text])

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

    // Start timer on first input
    if (startTime === null && inputValue.length > 0) {
      setStartTime(Date.now())
    }

    // Calculate errors by comparing with expected text
    let errors = 0
    for (let i = 0; i < inputValue.length; i++) {
      if (i >= text.length || inputValue[i] !== text[i]) {
        errors++
      }
    }
    setErrorCount(errors)

    // Update typed text and position
    setTypedText(inputValue)
    onPositionChange(inputValue.length)

    // Check if completed
    if (inputValue.length >= text.length) {
      setIsCompleted(true)
    }
  }

  // Reset function
  const handleReset = () => {
    setStartTime(null)
    setWpm(0)
    setAccuracy(100)
    setErrorCount(0)
    setIsCompleted(false)
    setTypedText("")
    onPositionChange(0)

    if (textareaRef.current) {
      textareaRef.current.value = ""
      textareaRef.current.focus()
    }
  }

  // Calculate progress percentage
  const progress = (currentPosition / text.length) * 100

  // Handle container click to focus textarea
  const handleContainerClick = () => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Render text with highlighting for current position
  const renderText = () => {
    // Get visible portion of text
    const visibleText = text.substring(visibleTextStart, visibleTextEnd)

    // Create an array of character spans with appropriate styling
    return visibleText.split("").map((char, index) => {
      const absoluteIndex = visibleTextStart + index

      // Determine character status and styling
      let className = "text-gray-300" // Not yet typed

      if (absoluteIndex < typedText.length) {
        // Character has been typed
        className = typedText[absoluteIndex] === char ? "text-black" : "text-red-500"
      }

      // Current position
      if (absoluteIndex === currentPosition) {
        return (
          <span key={index} className={`${className} current-position bg-gray-100`}>
            {char === " " ? "\u00A0" : char}
          </span>
        )
      }

      return (
        <span key={index} className={className}>
          {char === " " ? "\u00A0" : char}
        </span>
      )
    })
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
          {/* Text display with highlighting */}
          <div
            ref={textDisplayRef}
            className="font-mono text-lg leading-relaxed whitespace-pre-wrap break-all overflow-hidden"
            style={{ height: "300px", overflowY: "auto" }}
          >
            {renderText()}
          </div>

          {/* Hidden textarea for capturing input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              className="w-full py-2 px-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black resize-none"
              onChange={handleInputChange}
              value={typedText}
              disabled={isCompleted}
              autoFocus
              rows={3}
              placeholder="Start typing here..."
            />
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
                <p className="text-xs text-gray-400 mb-1">Words</p>
                <p className="text-lg font-light">{Math.round(currentPosition / 5)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Characters</p>
                <p className="text-lg font-light">{currentPosition}</p>
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
