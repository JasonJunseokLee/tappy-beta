import type { ChapterInfo } from "@/types/typing"
import { v4 as uuidv4 } from "uuid"

// EPUB 목차 항목 인터페이스
interface EpubNavPoint {
  id: string
  playOrder?: string
  navLabel: string
  content: {
    src: string
  }
  children?: EpubNavPoint[]
}

/**
 * EPUB의 toc.ncx 파일에서 목차를 추출하는 함수
 */
export async function extractEpubToc(
  zip: any,
  files: string[],
): Promise<{ chapters: ChapterInfo[]; tocFound: boolean }> {
  // 결과 초기화
  const chapters: ChapterInfo[] = []
  let tocFound = false

  try {
    // 1. toc.ncx 파일 찾기 (EPUB2)
    const tocNcxFile = files.find((file) => file.toLowerCase().includes("toc.ncx"))

    // 2. nav.xhtml 파일 찾기 (EPUB3)
    const navFile = files.find(
      (file) => file.toLowerCase().includes("nav.xhtml") || file.toLowerCase().includes("nav.html"),
    )

    // 3. content.opf 파일 찾기 (메타데이터)
    const contentOpfFile = files.find((file) => file.toLowerCase().includes("content.opf"))

    // toc.ncx 파일이 있으면 처리 (EPUB2)
    if (tocNcxFile) {
      console.log("Found toc.ncx file:", tocNcxFile)
      const tocContent = await zip.file(tocNcxFile)?.async("text")

      if (tocContent) {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(tocContent, "text/xml")

        // navMap 요소 찾기
        const navMap = xmlDoc.getElementsByTagName("navMap")[0]

        if (navMap) {
          // 최상위 navPoint 요소들 찾기
          const navPoints = navMap.getElementsByTagName("navPoint")

          // navPoint 요소들을 재귀적으로 처리
          for (let i = 0; i < navPoints.length; i++) {
            const navPoint = navPoints[i]
            if (navPoint.parentNode === navMap) {
              // 최상위 항목만 처리
              const chapterInfo = parseNavPoint(navPoint)
              if (chapterInfo) {
                chapters.push(chapterInfo)
              }
            }
          }

          tocFound = chapters.length > 0
        }
      }
    }

    // nav.xhtml 파일이 있으면 처리 (EPUB3)
    if (!tocFound && navFile) {
      console.log("Found nav.xhtml file:", navFile)
      const navContent = await zip.file(navFile)?.async("text")

      if (navContent) {
        const parser = new DOMParser()
        const htmlDoc = parser.parseFromString(navContent, "text/html")

        // nav 요소 찾기 (epub:type="toc")
        const navElements = htmlDoc.getElementsByTagName("nav")
        let tocNav = null

        for (let i = 0; i < navElements.length; i++) {
          const nav = navElements[i]
          if (nav.getAttribute("epub:type") === "toc" || nav.getAttribute("role") === "doc-toc") {
            tocNav = nav
            break
          }
        }

        if (tocNav) {
          // ol 요소 찾기
          const olElement = tocNav.getElementsByTagName("ol")[0]

          if (olElement) {
            // li 요소들을 재귀적으로 처리
            const epubChapters = parseNavList(olElement, 1)
            chapters.push(...epubChapters)
            tocFound = chapters.length > 0
          }
        }
      }
    }

    // 목차를 찾지 못했다면 content.opf 파일에서 spine 정보 활용
    if (!tocFound && contentOpfFile) {
      console.log("Using content.opf for basic TOC:", contentOpfFile)
      const opfContent = await zip.file(contentOpfFile)?.async("text")

      if (opfContent) {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(opfContent, "text/xml")

        // spine 요소 찾기
        const spine = xmlDoc.getElementsByTagName("spine")[0]

        if (spine) {
          // itemref 요소들 찾기
          const itemrefs = spine.getElementsByTagName("itemref")

          // manifest 요소 찾기
          const manifest = xmlDoc.getElementsByTagName("manifest")[0]
          const items = manifest.getElementsByTagName("item")

          // itemref의 idref를 사용하여 manifest에서 해당 항목 찾기
          let position = 0
          for (let i = 0; i < itemrefs.length; i++) {
            const idref = itemrefs[i].getAttribute("idref")

            // manifest에서 해당 ID를 가진 항목 찾기
            for (let j = 0; j < items.length; j++) {
              const item = items[j]
              if (item.getAttribute("id") === idref) {
                const href = item.getAttribute("href")
                const mediaType = item.getAttribute("media-type")

                // HTML/XHTML 파일만 처리
                if (mediaType && (mediaType.includes("html") || mediaType.includes("xhtml"))) {
                  // 파일 내용 가져오기
                  const filePath = getFullPath(contentOpfFile, href || "")
                  const fileContent = await zip.file(filePath)?.async("text")

                  if (fileContent) {
                    // 제목 추출 시도
                    const titleMatch = fileContent.match(/<title>(.*?)<\/title>/i)
                    const h1Match = fileContent.match(/<h1[^>]*>(.*?)<\/h1>/i)

                    let title = titleMatch ? titleMatch[1] : h1Match ? h1Match[1] : `Chapter ${i + 1}`

                    // HTML 태그 제거
                    title = title.replace(/<[^>]*>/g, "").trim()

                    chapters.push({
                      id: uuidv4(),
                      title,
                      position,
                      level: 1,
                    })

                    // 위치 업데이트 (대략적인 추정)
                    position += fileContent.length
                  }
                }
                break
              }
            }
          }

          tocFound = chapters.length > 0
        }
      }
    }

    return { chapters, tocFound }
  } catch (error) {
    console.error("Error extracting EPUB TOC:", error)
    return { chapters, tocFound: false }
  }
}

/**
 * navPoint 요소를 재귀적으로 파싱하는 함수 (EPUB2)
 */
function parseNavPoint(navPoint: Element, level = 1): ChapterInfo | null {
  try {
    const id = navPoint.getAttribute("id") || uuidv4()
    const playOrder = navPoint.getAttribute("playOrder")

    // navLabel 요소에서 텍스트 가져오기
    const navLabel = navPoint.getElementsByTagName("navLabel")[0]
    const text = navLabel?.getElementsByTagName("text")[0]?.textContent || `Chapter ${id}`

    // content 요소에서 src 가져오기
    const content = navPoint.getElementsByTagName("content")[0]
    const src = content?.getAttribute("src") || ""

    // 위치 정보 (src에서 앵커 부분 제거)
    const srcWithoutAnchor = src.split("#")[0]

    // 하위 navPoint 요소들 처리
    const childNavPoints = navPoint.getElementsByTagName("navPoint")
    const children: ChapterInfo[] = []

    for (let i = 0; i < childNavPoints.length; i++) {
      const childNavPoint = childNavPoints[i]
      if (childNavPoint.parentNode === navPoint) {
        // 직접적인 자식만 처리
        const childInfo = parseNavPoint(childNavPoint, level + 1)
        if (childInfo) {
          children.push(childInfo)
        }
      }
    }

    // 챕터 정보 생성
    const chapterInfo: ChapterInfo = {
      id,
      title: text,
      position: Number.parseInt(playOrder || "0", 10) * 1000, // 임시 위치 (나중에 조정 필요)
      level,
    }

    if (children.length > 0) {
      chapterInfo.children = children
    }

    return chapterInfo
  } catch (error) {
    console.error("Error parsing navPoint:", error)
    return null
  }
}

/**
 * nav 요소의 ol/li 구조를 재귀적으로 파싱하는 함수 (EPUB3)
 */
function parseNavList(olElement: Element, level: number): ChapterInfo[] {
  const chapters: ChapterInfo[] = []

  // li 요소들 처리
  const liElements = olElement.getElementsByTagName("li")

  for (let i = 0; i < liElements.length; i++) {
    const li = liElements[i]
    if (li.parentNode !== olElement) continue // 직접적인 자식만 처리

    // a 요소 찾기
    const a = li.getElementsByTagName("a")[0]
    if (!a) continue

    const title = a.textContent || `Item ${i + 1}`
    const href = a.getAttribute("href") || ""

    // 하위 ol 요소 찾기
    const childOl = li.getElementsByTagName("ol")[0]
    const children: ChapterInfo[] = childOl ? parseNavList(childOl, level + 1) : []

    // 챕터 정보 생성
    const chapterInfo: ChapterInfo = {
      id: uuidv4(),
      title,
      position: i * 1000, // 임시 위치 (나중에 조정 필요)
      level,
    }

    if (children.length > 0) {
      chapterInfo.children = children
    }

    chapters.push(chapterInfo)
  }

  return chapters
}

/**
 * 상대 경로를 절대 경로로 변환하는 함수
 */
function getFullPath(basePath: string, relativePath: string): string {
  // 기본 디렉토리 추출
  const baseDir = basePath.split("/").slice(0, -1).join("/")

  // 상대 경로가 절대 경로인 경우 그대로 반환
  if (relativePath.startsWith("/")) {
    return relativePath.substring(1) // 맨 앞의 / 제거
  }

  // 상대 경로 처리
  const parts = (baseDir ? baseDir + "/" : "") + relativePath
  const stack: string[] = []

  parts.split("/").forEach((part) => {
    if (part === "..") {
      stack.pop()
    } else if (part !== "" && part !== ".") {
      stack.push(part)
    }
  })

  return stack.join("/")
}

/**
 * EPUB 파일에서 추출한 목차의 위치 정보를 실제 텍스트 위치로 조정하는 함수
 */
export function adjustChapterPositions(chapters: ChapterInfo[], text: string): ChapterInfo[] {
  // 텍스트가 없으면 그대로 반환
  if (!text || !chapters.length) return chapters

  // 텍스트 길이
  const textLength = text.length

  // 텍스트를 줄 단위로 분할
  const lines = text.split("\n")

  // 줄 단위 위치 정보 계산 - 각 줄의 시작 위치를 저장
  const linePositions: number[] = []
  let currentPos = 0

  for (const line of lines) {
    linePositions.push(currentPos)
    currentPos += line.length + 1 // +1 for newline character
  }

  console.log(`Text has ${lines.length} lines, total length: ${textLength}`)
  console.log(`First few line positions:`, linePositions.slice(0, 5))

  // 모든 챕터를 평탄화
  const flatChapters = flattenTableOfContents(chapters)

  // 각 챕터의 제목을 텍스트에서 찾아 위치 업데이트
  for (const chapter of flatChapters) {
    const title = chapter.title.trim()
    if (!title) continue

    // 제목이 포함된 줄 찾기
    let bestMatchIndex = -1
    let bestMatchScore = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 정확한 일치
      if (line === title || line.includes(title)) {
        bestMatchIndex = i
        break
      }

      // 부분 일치 (제목의 단어들이 줄에 포함되는지)
      const titleWords = title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
      if (titleWords.length > 0) {
        const lineLower = line.toLowerCase()
        const matchCount = titleWords.filter((word) => lineLower.includes(word)).length
        const score = matchCount / titleWords.length

        if (score > bestMatchScore) {
          bestMatchScore = score
          bestMatchIndex = i
        }
      }
    }

    // 일치하는 줄을 찾았으면 위치 업데이트
    if (bestMatchIndex >= 0 && bestMatchScore > 0.5) {
      chapter.position = linePositions[bestMatchIndex]
      console.log(`Updated position for "${title}": ${chapter.position} (line ${bestMatchIndex})`)
    }
  }

  // 일치하는 줄을 찾지 못한 챕터들에 대해 균등 분배
  const chaptersWithoutPosition = flatChapters.filter((c) => c.position === undefined || c.position < 0)
  if (chaptersWithoutPosition.length > 0) {
    // 챕터 위치 조정 함수 (재귀) - 화살표 함수로 변경하여 ES5 호환성 확보
    const adjustPositions = (items: ChapterInfo[], startIdx: number, endIdx: number): void => {
      const itemCount = items.length

      if (itemCount === 0) return

      // 각 항목의 위치를 균등하게 분배하되, 가능하면 줄 시작 위치에 맞춤
      const segmentLength = Math.max(1, Math.floor((endIdx - startIdx) / itemCount))

      for (let i = 0; i < itemCount; i++) {
        const item = items[i]

        // 이미 위치가 설정된 경우 건너뛰기
        if (item.position !== undefined && item.position >= 0) continue

        // 챕터 위치 계산 - 균등 분배 기준
        const rawPosition = Math.floor(startIdx + i * segmentLength)

        // 가장 가까운 줄 시작 위치 찾기
        let closestLinePos = 0
        let minDistance = Number.MAX_SAFE_INTEGER

        for (const linePos of linePositions) {
          const distance = Math.abs(linePos - rawPosition)
          if (distance < minDistance) {
            minDistance = distance
            closestLinePos = linePos
          }
        }

        // 위치 업데이트 - 가장 가까운 줄 시작 위치 사용
        // 텍스트 길이를 초과하지 않도록 제한
        item.position = Math.min(closestLinePos, textLength - 1)

        // 디버깅 정보
        console.log(`Chapter "${item.title}" position adjusted: ${rawPosition} -> ${item.position}`)

        // 다음 항목의 시작 위치 계산
        const itemEndIdx = i === itemCount - 1 ? endIdx : Math.floor(startIdx + (i + 1) * segmentLength)

        // 하위 항목이 있으면 재귀적으로 처리
        if (item.children && item.children.length > 0) {
          adjustPositions(item.children, item.position, Math.min(itemEndIdx, textLength))
        }
      }
    }

    // 위치가 설정되지 않은 최상위 챕터들의 위치 조정
    const topLevelChaptersWithoutPosition = chapters.filter((c) => c.position === undefined || c.position < 0)
    adjustPositions(topLevelChaptersWithoutPosition, 0, textLength)
  }

  // 원본 계층 구조 유지를 위해 깊은 복사 수행
  const fixedChapters = JSON.parse(JSON.stringify(chapters))

  // 평탄화된 목록의 위치 정보를 원본 계층 구조에 반영
  function updatePositions(items: ChapterInfo[]) {
    for (const item of items) {
      const flatItem = flatChapters.find((c) => c.id === item.id)
      if (flatItem) {
        // 텍스트 길이를 초과하지 않도록 제한
        item.position = Math.min(flatItem.position, textLength - 1)
      }

      if (item.children && item.children.length > 0) {
        updatePositions(item.children)
      }
    }
  }

  updatePositions(fixedChapters)

  // 디버깅 정보 출력
  console.log(
    "Adjusted chapter positions:",
    fixedChapters.map((c) => ({ title: c.title, position: c.position })),
  )

  return fixedChapters
}

// flattenTableOfContents 함수 추가 (toc-utils.ts에 있는 함수와 동일)
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
