/**
 * 텍스트를 정규화합니다. 모든 공백 문자를 단일 공백으로 변환하고 앞뒤 공백을 제거합니다.
 * @param text 정규화할 텍스트
 * @returns 정규화된 텍스트
 */
export const normalizeText = (text: string): string => {
  return text.replace(/\s+/g, " ").trim()
}

/**
 * 주어진 문자가 한글인지 확인합니다.
 * @param char 확인할 문자
 * @returns 한글 여부 (true/false)
 */
export const isKorean = (char: string): boolean => {
  // 한글 유니코드 범위: 한글 완성형(AC00-D7AF), 한글 자모(1100-11FF), 한글 호환 자모(3130-318F)
  const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/
  return koreanRegex.test(char)
}

/**
 * 주어진 문자가 기호(특수문자, 구두점 등)인지 확인합니다.
 * @param char 확인할 문자
 * @returns 기호 여부 (true/false)
 */
export const isSymbol = (char: string): boolean => {
  // 영문자, 숫자, 한글, 공백이 아닌 모든 문자를 기호로 간주
  const symbolRegex = /[^\w\sㄱ-ㆎ가-힣]/
  return symbolRegex.test(char)
}

/**
 * 한글 타수를 계산합니다. 한글은 2타, 영문 및 기타 문자는 1타로 계산합니다.
 * @param text 타수를 계산할 텍스트
 * @returns 계산된 타수
 */
export const calculateKoreanKeystrokes = (text: string): number => {
  if (!text) return 0;
  
  let count = 0;
  const length = text.length;
  
  for (let i = 0; i < length; i++) {
    const char = text.charAt(i);
    
    // 한글은 글자당 2타로 계산 (일반적인 한글 타자연습기 기준)
    count += isKorean(char) ? 2 : 1;
  }
  
  return count;
}

/**
 * 입력된 텍스트와 예상 텍스트 사이의 오류 수를 계산합니다.
 * @param input 사용자가 입력한 텍스트
 * @param expected 예상되는 정확한 텍스트
 * @param ignoreSymbols 기호(특수문자, 구두점 등)를 무시할지 여부
 * @returns 오류 수
 */
export const countErrors = (input: string, expected: string, ignoreSymbols = false): number => {
  if (!input || !expected) return 0;
  
  let errors = 0;
  const inputLength = input.length;
  
  for (let i = 0; i < inputLength; i++) {
    // 예상 텍스트 범위를 벗어났거나 문자가 일치하지 않는 경우
    if (i >= expected.length || input[i] !== expected[i]) {
      // 기호 무시 옵션이 켜져 있고, 예상 문자가 기호인 경우 오류로 간주하지 않음
      if (ignoreSymbols && i < expected.length && isSymbol(expected[i])) {
        continue;
      }
      errors++;
    }
  }
  
  return errors;
}

/**
 * 텍스트를 시각적 줄로 분할합니다. 컨테이너 너비에 맞게 텍스트를 여러 줄로 나눕니다.
 * @param text 분할할 텍스트
 * @param measureElement 텍스트 너비를 측정하기 위한 HTML 요소
 * @param containerWidth 컨테이너 너비(픽셀)
 * @returns 분할된 텍스트 줄 배열
 */
export const splitTextIntoLines = (text: string, measureElement: HTMLElement, containerWidth: number): string[] => {
  if (!text || !measureElement || containerWidth <= 0) {
    return [];
  }
  
  try {
    // 텍스트가 너무 길면 청크로 나누어 처리
    const MAX_CHUNK_SIZE = 10000; // 한 번에 처리할 최대 문자 수

    if (text.length <= MAX_CHUNK_SIZE) {
      return splitTextChunkIntoLines(text, measureElement, containerWidth);
    }

    // 긴 텍스트는 청크로 나누어 처리
    const result: string[] = [];
    for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
      const chunk = text.substring(i, i + MAX_CHUNK_SIZE);
      const chunkLines = splitTextChunkIntoLines(chunk, measureElement, containerWidth);
      result.push(...chunkLines);
    }

    return result;
  } catch (error) {
    console.error("텍스트 분할 오류:", error);

    // 오류 발생 시 간단한 줄 바꿈으로 분할
    return text.split("\n").filter((line) => line.trim() !== "");
  }
}

/**
 * 단일 청크를 시각적 줄로 분할하는 내부 함수입니다.
 * @param text 분할할 텍스트 청크
 * @param measureElement 텍스트 너비를 측정하기 위한 HTML 요소
 * @param containerWidth 컨테이너 너비(픽셀)
 * @returns 분할된 텍스트 줄 배열
 */
const splitTextChunkIntoLines = (text: string, measureElement: HTMLElement, containerWidth: number): string[] => {
  try {
    // 전체 텍스트 정규화 - 여러 공백/줄바꿈을 단일 공백으로 대체
    const normalizedText = text.replace(/\s+/g, " ").trim();

    // 줄 바꿈 문자로 먼저 분할
    const paragraphs = normalizedText.split("\n").filter((p) => p.trim() !== "");
    const allLines: string[] = [];

    // 각 단락을 너비에 맞게 분할
    for (const paragraph of paragraphs) {
      // 단어 단위로 분할하여 줄 바꿈 처리
      const words = paragraph.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;

        // 테스트 줄의 너비 측정
        measureElement.textContent = testLine;
        const testWidth = measureElement.offsetWidth;
        
        // 여백 버퍼 추가 (20px 정도의 여유 공간 확보)
        const bufferWidth = containerWidth - 20;

        // 이 단어를 추가하면 컨테이너 너비를 초과하는 경우 새 줄 시작
        if (testWidth > bufferWidth && currentLine !== "") {
          allLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      // 마지막 줄 추가
      if (currentLine) {
        allLines.push(currentLine);
      }
    }

    // 빈 줄 필터링
    return allLines.filter((line) => line.trim() !== "");
  } catch (error) {
    console.error("청크 분할 오류:", error);

    // 오류 발생 시 간단한 줄 바꿈으로 분할
    return text.split("\n").filter((line) => line.trim() !== "");
  }
}
