import type { ChapterInfo } from "@/types/typing"
import { flattenTableOfContents } from "./toc-utils"
import { v4 as uuidv4 } from "uuid"

/**
 * 전체 텍스트를 목차 기반으로 분할하는 함수
 */
export function splitTextByChapters(text: string, chapters: ChapterInfo[], fullTextLabel: string = "전체 텍스트"): ChapterInfo[] {
  if (!text || !chapters || !chapters.length) {
    console.warn("splitTextByChapters: 텍스트 또는 챕터가 없습니다.")

    // 텍스트만 있고 챕터가 없는 경우 기본 챕터 생성
    if (text && (!chapters || chapters.length === 0)) {
      const defaultChapter: ChapterInfo = {
        id: "default",
        title: fullTextLabel,
        position: 0,
        level: 1,
        content: text,
      }
      return [defaultChapter]
    }

    return chapters
  }

  try {
    // 모든 챕터를 평탄화하고 위치 기준으로 정렬
    const flatChapters = flattenTableOfContents(chapters)
    flatChapters.sort((a, b) => a.position - b.position)

    // 텍스트를 줄 단위로 분할
    const lines = text.split("\n")
    const linePositions: number[] = []
    let currentPos = 0

    // 각 줄의 시작 위치 계산
    for (const line of lines) {
      linePositions.push(currentPos)
      currentPos += line.length + 1 // +1 for newline
    }

    // 각 챕터의 시작/끝 줄 번호와 내용 설정
    for (let i = 0; i < flatChapters.length; i++) {
      const chapter = flatChapters[i]
      const nextChapter = i < flatChapters.length - 1 ? flatChapters[i + 1] : null

      // 챕터 위치가 유효한지 확인
      if (chapter.position === undefined || chapter.position < 0) {
        chapter.position = 0
      }
      if (chapter.position >= text.length) {
        chapter.position = Math.max(0, text.length - 1)
      }

      // 챕터 시작 위치에 해당하는 줄 찾기
      let startLineIndex = 0
      while (startLineIndex < linePositions.length && linePositions[startLineIndex] < chapter.position) {
        startLineIndex++
      }
      // 정확한 시작 줄 찾기 (이전 줄로 조정)
      startLineIndex = Math.max(0, startLineIndex - 1)

      // 챕터 끝 위치 계산
      const endPosition = nextChapter ? nextChapter.position : text.length

      // 챕터 끝 위치에 해당하는 줄 찾기
      let endLineIndex = startLineIndex
      while (endLineIndex < linePositions.length && linePositions[endLineIndex] < endPosition) {
        endLineIndex++
      }
      // 정확한 끝 줄 찾기
      endLineIndex = Math.min(lines.length - 1, endLineIndex)

      // 챕터 내용 추출
      const chapterLines = lines.slice(startLineIndex, endLineIndex + 1)
      const chapterContent = chapterLines.join("\n")

      // 챕터 정보 업데이트
      chapter.content = chapterContent
      chapter.startLine = startLineIndex
      chapter.endLine = endLineIndex
      chapter.completed = false

      // 내용이 없는 경우 처리
      if (!chapterContent || chapterContent.trim() === "") {
        console.warn(`챕터 "${chapter.title}"의 내용이 없습니다. 위치: ${chapter.position}`)

        // 최소한의 내용 할당
        if (startLineIndex < lines.length) {
          chapter.content = lines[startLineIndex]
        } else if (lines.length > 0) {
          chapter.content = lines[0]
        } else {
          chapter.content = "내용이 없습니다."
        }
      }
    }

    // 원본 계층 구조 유지를 위해 깊은 복사 수행
    const processedChapters = JSON.parse(JSON.stringify(chapters))

    // 평탄화된 목록의 정보를 원본 계층 구조에 반영
    const updateChapterInfo = (items: ChapterInfo[]): void => {
      for (const item of items) {
        const flatItem = flatChapters.find((c) => c.id === item.id)
        if (flatItem) {
          item.content = flatItem.content
          item.startLine = flatItem.startLine
          item.endLine = flatItem.endLine
          item.completed = flatItem.completed
        }

        if (item.children && item.children.length > 0) {
          updateChapterInfo(item.children)
        }
      }
    }

    updateChapterInfo(processedChapters)

    // 모든 챕터에 내용이 있는지 확인
    const allChaptersHaveContent = flattenTableOfContents(processedChapters).every((chapter) => !!chapter.content)

    if (!allChaptersHaveContent) {
      console.warn("splitTextByChapters: 일부 챕터에 내용이 없습니다.")

      // 내용이 없는 챕터가 있으면 기본 챕터 생성
      if (processedChapters.length === 0) {
        const defaultChapter: ChapterInfo = {
          id: uuidv4(),
          title: fullTextLabel,
          position: 0,
          level: 1,
          content: text,
        }
        return [defaultChapter]
      }
    }

    return processedChapters
  } catch (error) {
    console.error("splitTextByChapters 오류:", error)

    // 오류 발생 시 기본 챕터 생성
    const defaultChapter: ChapterInfo = {
      id: uuidv4(),
      title: fullTextLabel,
      position: 0,
      level: 1,
      content: text,
    }
    return [defaultChapter]
  }
}

/**
 * 현재 위치에 해당하는 챕터를 찾는 함수
 */
export function findCurrentChapter(position: number, chapters: ChapterInfo[]): ChapterInfo | null {
  if (!chapters || !chapters.length) return null

  try {
    // 모든 챕터를 평탄화
    const flatChapters = flattenTableOfContents(chapters)

    // 현재 위치보다 작거나 같은 위치 중 가장 가까운 챕터 찾기
    let currentChapter: ChapterInfo | null = null
    let minDistance = Number.MAX_SAFE_INTEGER

    for (const chapter of flatChapters) {
      if (chapter.position <= position) {
        const distance = position - chapter.position
        if (distance < minDistance) {
          minDistance = distance
          currentChapter = chapter
        }
      }
    }

    // 챕터를 찾지 못했으면 첫 번째 챕터 반환
    if (!currentChapter && flatChapters.length > 0) {
      return flatChapters[0]
    }

    return currentChapter
  } catch (error) {
    console.error("findCurrentChapter 오류:", error)

    // 오류 발생 시 첫 번째 챕터 반환
    if (chapters && chapters.length > 0) {
      return chapters[0]
    }

    return null
  }
}

/**
 * 다음 챕터를 찾는 함수
 */
export function findNextChapter(currentChapterId: string, chapters: ChapterInfo[]): ChapterInfo | null {
  if (!chapters || !chapters.length) return null

  try {
    // 평탄화 후 내용이 있는 챕터만 필터링 (중첩 순서 유지)
    const flatChapters = flattenTableOfContents(chapters)
      .filter((c) => c.content && c.content.trim().length > 0)
     
    // 현재 챕터의 인덱스 찾기
    const currentIndex = flatChapters.findIndex((chapter) => chapter.id === currentChapterId)

    // 다음 챕터가 있으면 반환
    if (currentIndex >= 0 && currentIndex < flatChapters.length - 1) {
      return flatChapters[currentIndex + 1]
    }

    return null
  } catch (error) {
    console.error("findNextChapter 오류:", error)
    return null
  }
}

/**
 * 이전 챕터를 찾는 함수
 */
export function findPrevChapter(currentChapterId: string, chapters: ChapterInfo[]): ChapterInfo | null {
  if (!chapters || !chapters.length) return null

  try {
    // 평탄화 후 내용이 있는 챕터만 필터링 (중첩 순서 유지)
    const flatChapters = flattenTableOfContents(chapters)
      .filter((c) => c.content && c.content.trim().length > 0)

    // 현재 챕터의 인덱스 찾기
    const currentIndex = flatChapters.findIndex((chapter) => chapter.id === currentChapterId)

    // 이전 챕터가 있으면 반환
    if (currentIndex > 0) {
      return flatChapters[currentIndex - 1]
    }

    return null
  } catch (error) {
    console.error("findPrevChapter 오류:", error)
    return null
  }
}

/**
 * 전체 진행도를 계산하는 함수
 */
export function calculateOverallProgress(chapters: ChapterInfo[], completedChapters: string[] = []): number {
  if (!chapters || !chapters.length) return 0

  try {
    // 모든 챕터를 평탄화
    const flatChapters = flattenTableOfContents(chapters)

    // 완료된 챕터 수 계산
    const completedCount = completedChapters.length

    // 전체 진행도 계산
    return (completedCount / flatChapters.length) * 100
  } catch (error) {
    console.error("calculateOverallProgress 오류:", error)
    return 0
  }
}
