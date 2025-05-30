import { detectHeadingLevel } from "./toc-utils"

/**
 * 텍스트에서 제목을 인식하고 전후에 줄바꿈을 추가하여 포맷팅하는 함수
 */
export function formatTextWithHeadings(text: string): string {
  // 줄 단위로 분할
  const lines = text.split("\n")
  const formattedLines: string[] = []

  // 이전 줄이 제목이었는지 추적
  let prevLineWasHeading = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // 빈 줄 처리
    if (!trimmedLine) {
      formattedLines.push("")
      prevLineWasHeading = false
      continue
    }

    // 코드 블록이나 기술적 내용 필터링
    const isCodeOrTechnical =
      (trimmedLine.includes("{") && trimmedLine.includes("}")) ||
      (trimmedLine.includes("<") && trimmedLine.includes(">")) ||
      trimmedLine.includes("function(") ||
      trimmedLine.includes("function ") ||
      trimmedLine.includes("var ") ||
      trimmedLine.includes("let ") ||
      trimmedLine.includes("const ") ||
      trimmedLine.includes("import ") ||
      trimmedLine.includes("export ") ||
      (trimmedLine.includes("html") && trimmedLine.includes("body") && trimmedLine.includes("height"))

    if (isCodeOrTechnical) {
      // 코드나 기술적 내용은 그대로 추가
      formattedLines.push(line)
      prevLineWasHeading = false
      continue
    }

    // 제목 레벨 감지
    const headingLevel = detectHeadingLevel(line)

    if (headingLevel > 0) {
      // 제목인 경우

      // 이전 줄이 제목이 아니고, 바로 앞 줄이 빈 줄이 아니면 빈 줄 추가
      if (!prevLineWasHeading && (formattedLines.length === 0 || formattedLines[formattedLines.length - 1] !== "")) {
        formattedLines.push("")
      }

      // 제목 줄 추가
      formattedLines.push(line)

      // 제목 다음에 빈 줄 추가 (다음 줄이 이미 빈 줄이 아닌 경우)
      if (i + 1 < lines.length && lines[i + 1].trim() !== "") {
        formattedLines.push("")
      }

      prevLineWasHeading = true
    } else {
      // 일반 텍스트인 경우
      formattedLines.push(line)
      prevLineWasHeading = false
    }
  }

  return formattedLines.join("\n")
}

/**
 * 텍스트에서 제목 스타일을 적용하는 함수
 * 타이핑 인터페이스에서 사용
 */
export function applyHeadingStyles(
  line: string,
  isCurrentLine: boolean,
): {
  text: string
  isHeading: boolean
  headingLevel: number
  className: string
} {
  // 코드나 기술적 내용 필터링
  const isCodeOrTechnical =
    (line.includes("{") && line.includes("}")) ||
    (line.includes("<") && line.includes(">")) ||
    line.includes("function(") ||
    line.includes("function ") ||
    line.includes("var ") ||
    line.includes("let ") ||
    line.includes("const ") ||
    line.includes("import ") ||
    line.includes("export ") ||
    (line.includes("html") && line.includes("body") && line.includes("height"))

  if (isCodeOrTechnical) {
    return {
      text: line,
      isHeading: false,
      headingLevel: 0,
      className: "",
    }
  }

  const headingLevel = detectHeadingLevel(line)
  let className = ""

  if (headingLevel > 0) {
    // 제목 스타일 적용 - 크기를 더 크게 수정
    switch (headingLevel) {
      case 1:
        className = "text-2xl font-medium" // 크기 증가
        break
      case 2:
        className = "text-xl font-medium" // 크기 증가
        break
      default:
        className = "text-lg font-medium" // 크기 증가
        break
    }

    // 현재 타이핑 중인 줄이면 스타일 조정
    if (isCurrentLine) {
      className += " text-foreground" // 완전 불투명하게 변경
    } else {
      className += " text-foreground/80"
    }
  }

  return {
    text: line,
    isHeading: headingLevel > 0,
    headingLevel,
    className,
  }
}
