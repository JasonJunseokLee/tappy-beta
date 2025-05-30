import type { ChapterInfo } from "@/types/typing"
import { v4 as uuidv4 } from "uuid"

// 제목 패턴 감지를 위한 정규식
const HEADING_PATTERNS = [
  /^(#{1,6})\s+(.+)$/m, // Markdown 스타일 제목
  /^([A-Z0-9][^.]{0,50})\s*$/m, // 짧은 대문자 시작 줄
  /^(제\s*\d+\s*장|제\s*\d+\s*부|Chapter\s*\d+|Part\s*\d+|Section\s*\d+)/i, // 장/부/챕터 표시
  /^(\d+(\.\d+)*)\s+([^\n]+)$/m, // 숫자 계층 (1.2.3 등)
]

// 들여쓰기 패턴 감지
const INDENTATION_PATTERN = /^(\s+)(.+)$/

/**
 * 텍스트에서 목차를 추출하는 함수
 */
export function extractTableOfContents(text: string): ChapterInfo[] {
  const lines = text.split("\n")
  const chapters: ChapterInfo[] = []
  let position = 0
  let lastLevel = 0
  const levelStack: ChapterInfo[][] = [[]] // 계층별 목차 스택

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      position += lines[i].length + 1 // +1 for newline
      continue
    }

    // 제목 패턴 감지
    const level = detectHeadingLevel(lines[i])
    let title = line

    // 제목으로 감지된 경우
    if (level > 0) {
      // 제목에서 마크다운 기호 등 제거
      title = cleanTitle(lines[i], level)

      // 새 챕터 정보 생성
      const chapter: ChapterInfo = {
        title,
        position, // 현재 줄의 시작 위치
        level,
        id: uuidv4(),
      }

      // 계층 구조 처리
      if (level > lastLevel) {
        // 새로운 하위 레벨 추가
        for (let j = lastLevel + 1; j < level; j++) {
          levelStack[j] = []
        }
        levelStack[level] = []
      } else if (level < lastLevel) {
        // 상위 레벨로 돌아감
        for (let j = lastLevel; j > level; j--) {
          if (levelStack[j - 1].length > 0 && levelStack[j].length > 0) {
            const lastParent = levelStack[j - 1][levelStack[j - 1].length - 1]
            lastParent.children = levelStack[j]
          }
          levelStack[j] = []
        }
      }

      // 현재 레벨에 챕터 추가
      levelStack[level].push(chapter)
      lastLevel = level
    }

    position += lines[i].length + 1 // +1 for newline
  }

  // 남은 계층 구조 처리
  for (let j = lastLevel; j > 0; j--) {
    if (j > 1 && levelStack[j - 1].length > 0 && levelStack[j].length > 0) {
      const lastParent = levelStack[j - 1][levelStack[j - 1].length - 1]
      lastParent.children = levelStack[j]
    }
  }

  return levelStack[1] || []
}

/**
 * 제목 레벨을 감지하는 함수
 */
export function detectHeadingLevel(line: string): number {
  // 빈 줄은 제목이 아님
  if (!line.trim()) return 0

  // CSS, HTML, JavaScript 코드로 보이는 줄은 제목이 아님
  if (line.includes("{") && line.includes("}")) return 0
  if (line.includes("<") && line.includes(">")) return 0
  if (line.includes("function(") || line.includes("function ")) return 0
  if (line.includes("var ") || line.includes("let ") || line.includes("const ")) return 0
  if (line.includes("import ") || line.includes("export ")) return 0
  if (line.includes("html") && line.includes("body") && line.includes("height")) return 0

  // 마크다운 스타일 제목 (#, ##, 등)
  const markdownMatch = line.match(/^(#{1,6})\s+/)
  if (markdownMatch) {
    return markdownMatch[1].length
  }

  // 들여쓰기 기반 레벨 감지
  const indentMatch = line.match(INDENTATION_PATTERN)
  if (indentMatch) {
    const indentation = indentMatch[1]
    // 들여쓰기 2칸 또는 4칸을 1레벨로 계산
    const indentLevel = Math.ceil(indentation.length / 2)

    // 들여쓰기가 있고 짧은 텍스트(50자 미만)인 경우 제목으로 간주
    if (indentLevel > 0 && indentMatch[2].length < 50 && !indentMatch[2].endsWith(".")) {
      return indentLevel + 1 // 기본 레벨 1에 들여쓰기 레벨 추가
    }
  }

  // 숫자 계층 (1.2.3 등)
  const numberMatch = line.match(/^(\d+(\.\d+)*)\s+([^\n]+)$/)
  if (numberMatch) {
    // 점의 개수로 레벨 결정 (1 -> 레벨 1, 1.2 -> 레벨 2, 1.2.3 -> 레벨 3)
    const dots = (numberMatch[1].match(/\./g) || []).length
    return dots + 1
  }

  // 장/부/챕터 표시
  const chapterMatch = line.match(/^(제\s*\d+\s*장|제\s*\d+\s*부|Chapter\s*\d+|Part\s*\d+|Section\s*\d+)/i)
  if (chapterMatch) {
    // "부"는 "장"보다 상위 레벨
    if (chapterMatch[1].includes("부") || chapterMatch[1].toLowerCase().includes("part")) {
      return 1
    }
    return 2
  }

  // 짧은 대문자 시작 줄 (50자 미만)
  if (/^[A-Z0-9]/.test(line) && line.length < 50 && !line.endsWith(".")) {
    // 추가 필터링: 코드나 기술적 내용으로 보이는 경우 제외
    if (line.includes("=") || line.includes(":") || line.includes(";")) return 0
    return 1
  }

  // 제목으로 감지되지 않음
  return 0
}

/**
 * 제목에서 마크다운 기호 등을 제거하는 함수
 */
function cleanTitle(line: string, level: number): string {
  // 마크다운 스타일 제목 (#, ##, 등)
  const markdownMatch = line.match(/^(#{1,6})\s+(.+)$/)
  if (markdownMatch) {
    return markdownMatch[2].trim()
  }

  // 들여쓰기 제거
  const indentMatch = line.match(INDENTATION_PATTERN)
  if (indentMatch) {
    return indentMatch[2].trim()
  }

  // 숫자 계층 (1.2.3 등) 제거
  const numberMatch = line.match(/^(\d+(\.\d+)*)\s+(.+)$/)
  if (numberMatch) {
    return numberMatch[3].trim()
  }

  return line.trim()
}

/**
 * 계층 구조의 목차를 평탄화하는 함수 (UI 표시용)
 */
export function flattenTableOfContents(chapters: ChapterInfo[]): ChapterInfo[] {
  const result: ChapterInfo[] = []

  function traverse(items: ChapterInfo[]) {
    for (const item of items) {
      result.push(item)
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    }
  }

  traverse(chapters)
  return result
}

/**
 * 목차 항목의 위치 정보를 검증하고 필요시 수정하는 함수
 */
export function validateAndFixChapterPositions(chapters: ChapterInfo[], text: string): ChapterInfo[] {
  if (!chapters.length || !text) return chapters

  // 먼저 목차 위치 재계산
  const recalculatedChapters = recalculateChapterPositions(chapters, text)

  // 깊은 복사를 통해 원본 데이터 보존
  const validatedChapters = JSON.parse(JSON.stringify(recalculatedChapters)) as ChapterInfo[]

  // 모든 챕터를 평탄화하여 처리
  const flatChapters = flattenTableOfContents(validatedChapters)

  // 위치 정보 유효성 검사 및 수정
  for (const chapter of flatChapters) {
    // 위치가 없거나 유효하지 않은 경우 처리
    if (chapter.position === undefined || chapter.position < 0) {
      chapter.position = 0
    }

    // 텍스트 길이를 초과하는 경우 처리
    if (chapter.position >= text.length) {
      chapter.position = Math.max(0, text.length - 1)
    }
  }

  // 평탄화된 챕터 정보를 원본 계층 구조에 반영
  function updatePositions(items: ChapterInfo[]) {
    for (const item of items) {
      const flatItem = flatChapters.find((c) => c.id === item.id)
      if (flatItem) {
        item.position = flatItem.position
      }

      if (item.children && item.children.length > 0) {
        updatePositions(item.children)
      }
    }
  }

  updatePositions(validatedChapters)
  return validatedChapters
}

/**
 * 목차 위치를 정확하게 계산하는 함수
 * 텍스트 내에서 제목을 찾아 위치를 계산합니다
 */
export function recalculateChapterPositions(chapters: ChapterInfo[], text: string): ChapterInfo[] {
  if (!chapters.length || !text) return chapters

  // 깊은 복사를 통해 원본 데이터 보존
  const updatedChapters = JSON.parse(JSON.stringify(chapters)) as ChapterInfo[]

  // 텍스트를 줄 단위로 분할
  const lines = text.split("\n")
  const linePositions: number[] = []
  let currentPos = 0

  // 각 줄의 시작 위치 계산
  for (const line of lines) {
    linePositions.push(currentPos)
    currentPos += line.length + 1 // +1 for newline
  }

  // 모든 챕터를 평탄화하여 처리
  const flatChapters = flattenTableOfContents(updatedChapters)

  // 각 챕터에 대해 텍스트 내에서 제목을 찾아 위치 업데이트
  for (const chapter of flatChapters) {
    const title = chapter.title.trim()

    // 제목이 비어있으면 건너뛰기
    if (!title) continue

    // 텍스트 내에서 제목과 일치하는 줄 찾기
    let foundPosition = -1
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 제목과 정확히 일치하거나 제목을 포함하는 줄 찾기
      if (line === title || line.includes(title)) {
        foundPosition = linePositions[i]
        console.log(`Found title "${title}" at position ${foundPosition} (line ${i})`)
        break
      }
    }

    // 위치를 찾지 못했으면 기존 위치 유지
    if (foundPosition >= 0) {
      chapter.position = foundPosition
    }
  }

  // 평탄화된 챕터 정보를 원본 계층 구조에 반영
  function updatePositions(items: ChapterInfo[]) {
    for (const item of items) {
      const flatItem = flatChapters.find((c) => c.id === item.id)
      if (flatItem) {
        item.position = flatItem.position
      }

      if (item.children && item.children.length > 0) {
        updatePositions(item.children)
      }
    }
  }

  updatePositions(updatedChapters)
  return updatedChapters
}
