export interface TypingInterfaceProps {
  text: string
  currentPosition: number
  onPositionChange: (position: number) => void
}

export interface TypingStats {
  wpm: number
  cpm: number
  netWpm: number
  netCpm: number
  accuracy: number
  errorCount: number
  correctionCount: number
  keyPressCount: number
}

export interface VisibleLine {
  text: string
  index: number
}

export interface ChapterInfo {
  title: string
  position: number
  level: number
  children?: ChapterInfo[]
  id: string
  // 새로운 필드 추가
  content?: string // 이 챕터의 내용
  startLine?: number // 이 챕터가 시작하는 줄 번호
  endLine?: number // 이 챕터가 끝나는 줄 번호
  completed?: boolean // 이 챕터 완료 여부
}

// 소리 테마 타입 정의 - 새로운 테마 추가
export type SoundTheme = "default" | "mechanical" | "membrane" | "typewriter" | "laptop" | "quiet"

// TypingSettings 인터페이스에 소리 테마 선택 옵션 추가
export interface TypingSettings {
  fontSize: number
  fontFamily: string
  showWpm: boolean
  soundEnabled: boolean
  soundVolume: number
  soundTheme: SoundTheme // 소리 테마 추가
  ignoreSymbols: boolean
  autoAdvance: boolean
  theme: "light" | "dark" | "system"
}

// 목차 기반 세션 관리를 위한 새로운 타입
export interface ChapterBasedSession {
  title: string
  chapters: ChapterInfo[]
  currentChapterIndex: number
  overallProgress: number
  lastPosition: number
}
