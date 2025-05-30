import { isKorean, isSymbol } from "@/utils/typing-utils"
import { applyHeadingStyles } from "@/utils/text-formatter"

interface TypingLineProps {
  line: string
  typedText: string
  isCurrentLine: boolean
  isPastLine: boolean
  isFutureLine: boolean
  isComposing: boolean
}

export function TypingLine({ line, typedText, isCurrentLine, isPastLine, isFutureLine, isComposing }: TypingLineProps) {
  // 제목 스타일 적용
  const { isHeading, headingLevel, className: headingClass } = applyHeadingStyles(line, isCurrentLine)

  // 문자에 대한 스타일 결정 (한글 타이핑 중에는 오류 표시 안함)
  const getCharStyle = (char: string, typedChar: string | undefined, isTyped: boolean, isKoreanChar: boolean) => {
    if (!isTyped) {
      return isHeading ? "text-foreground/90" : "text-foreground/80" // 아직 타이핑되지 않은 부분
    }

    // 타이핑된 부분
    if (typedChar === char) {
      return "text-foreground" // 올바르게 타이핑된 부분
    } else {
      // 한글 문자이고 현재 조합 중이면 오류 표시 안함
      if (isKoreanChar && isComposing) {
        return "text-foreground/60" // 한글 조합 중에는 회색으로 표시
      } else if (isSymbol(char)) {
        return "text-foreground/60" // 기호는 오류로 표시하지 않고 회색으로 표시
      } else {
        return "text-error" // 오류는 빨간색으로 표시
      }
    }
  }

  // 기본 라인 스타일 결정
  const baseLineClass = isCurrentLine
    ? "text-foreground/80" // 80% 불투명도
    : isFutureLine
      ? "text-foreground/30"
      : "text-foreground/50"

  return (
    <div className={`${baseLineClass} ${headingClass} transition-colors duration-300`}>
      {isCurrentLine
        ? // 현재 줄은 글자별로 색상 처리
          line
            .split("")
            .map((char, charIndex) => {
              const isTyped = charIndex < typedText.length
              const typedChar = isTyped ? typedText[charIndex] : undefined
              const isKoreanChar = isKorean(char)

              return (
                <span key={charIndex} className={getCharStyle(char, typedChar, isTyped, isKoreanChar)}>
                  {char === " " ? "\u00A0" : char}
                </span>
              )
            })
        : // 이전/이후 줄은 그대로 표시
          line}
    </div>
  )
}
