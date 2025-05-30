export const normalizeText = (text: string): string => {
  // Replace all whitespace with a single space and trim
  return text.replace(/\s+/g, " ").trim()
}

// 한글 문자 여부 확인
export const isKorean = (char: string): boolean => {
  const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
  return koreanRegex.test(char)
}

// 기호(특수문자, 구두점 등) 여부 확인
export const isSymbol = (char: string): boolean => {
  // 영문자, 숫자, 한글, 공백이 아닌 모든 문자를 기호로 간주
  const symbolRegex = /[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/
  return symbolRegex.test(char)
}

// 한글 타수 계산 함수
export const calculateKoreanKeystrokes = (text: string): number => {
  let count = 0

  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i)

    // 한글 여부 확인
    if (isKorean(char)) {
      // 한글은 글자당 2타로 계산 (일반적인 한글 타자연습기 기준)
      count += 2
    } else if (char === " ") {
      // 공백은 1타
      count += 1
    } else {
      // 영문 및 기타 문자는 1타
      count += 1
    }
  }

  return count
}

// 오류 계산 함수
export const countErrors = (input: string, expected: string, ignoreSymbols = false): number => {
  let errors = 0
  for (let i = 0; i < input.length; i++) {
    // 예상 텍스트 범위를 벗어났거나 문자가 일치하지 않는 경우
    if (i >= expected.length || input[i] !== expected[i]) {
      // 기호 무시 옵션이 켜져 있고, 예상 문자가 기호인 경우 오류로 간주하지 않음
      if (ignoreSymbols && i < expected.length && isSymbol(expected[i])) {
        continue
      }
      errors++
    }
  }
  return errors
}

// 텍스트를 시각적 줄로 분할하는 함수 최적화
export const splitTextIntoLines = (text: string, measureElement: HTMLElement, containerWidth: number): string[] => {
  try {
    // 텍스트가 너무 길면 청크로 나누어 처리
    const MAX_CHUNK_SIZE = 10000 // 한 번에 처리할 최대 문자 수

    if (text.length <= MAX_CHUNK_SIZE) {
      return splitTextChunkIntoLines(text, measureElement, containerWidth)
    }

    // 긴 텍스트는 청크로 나누어 처리
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
      const chunk = text.substring(i, i + MAX_CHUNK_SIZE)
      const chunkLines = splitTextChunkIntoLines(chunk, measureElement, containerWidth)
      chunks.push(...chunkLines)
    }

    return chunks
  } catch (error) {
    console.error("텍스트 분할 오류:", error)

    // 오류 발생 시 간단한 줄 바꿈으로 분할
    return text.split("\n").filter((line) => line.trim() !== "")
  }
}

// 단일 청크를 줄로 분할하는 내부 함수
const splitTextChunkIntoLines = (text: string, measureElement: HTMLElement, containerWidth: number): string[] => {
  try {
    // 전체 텍스트 정규화 - 여러 공백/줄바꿈을 단일 공백으로 대체
    const normalizedText = text.replace(/\s+/g, " ").trim()

    // 줄 바꿈 문자로 먼저 분할
    const paragraphs = normalizedText.split("\n").filter((p) => p.trim() !== "")
    const allLines: string[] = []

    // 각 단락을 너비에 맞게 분할
    for (const paragraph of paragraphs) {
      // 단어 단위로 분할하여 줄 바꿈 처리
      const words = paragraph.split(" ")
      let currentLine = ""

      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        const testLine = currentLine + (currentLine ? " " : "") + word

        // 테스트 줄의 너비 측정
        measureElement.textContent = testLine
        const testWidth = measureElement.offsetWidth

        // 이 단어를 추가하면 컨테이너 너비를 초과하는 경우 새 줄 시작
        if (testWidth > containerWidth && currentLine !== "") {
          allLines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }

      // 마지막 줄 추가
      if (currentLine) {
        allLines.push(currentLine)
      }
    }

    // 빈 줄 필터링
    return allLines.filter((line) => line.trim() !== "")
  } catch (error) {
    console.error("청크 분할 오류:", error)

    // 오류 발생 시 간단한 줄 바꿈으로 분할
    return text.split("\n").filter((line) => line.trim() !== "")
  }
}
