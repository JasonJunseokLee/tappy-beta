"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

// 언어 타입 정의
export type Language = "ko" | "en"

// 언어 컨텍스트 타입 정의
type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

// 기본값으로 한국어 설정 (외부 주입 가능)
export const defaultLanguage: Language = "ko"

// 언어 컨텍스트 생성
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// 번역 데이터
const translations = {
  ko: {
    "common": {
      "start": "시작하기",
      "back": "뒤로",
      "save": "저장",
      "cancel": "취소",
      "confirm": "확인",
      "loading": "로딩 중...",
      "processingFile": "파일 처리 중...",
      "processing": "처리 중...",
      "search": "검색",
      "darkMode": "다크 모드로 전환",
      "lightMode": "라이트 모드로 전환",
      "language": "언어",
      "korean": "한국어",
      "english": "영어",
      "home": "홈",
      "settings": "설정",
      "untitled": "제목 없음",
      "text": "텍스트",
      "file": "파일",
      "url": "URL",
      "paste": "붙여넣기",
      "selectAnotherFile": "다른 파일 선택",
      "dragAndDropFile": "파일을 끌어다 놓거나 선택하세요",
      "supportedFileTypes": "TXT, HTML, PDF, EPUB 파일을 지원합니다",
      "selectText": "텍스트 선택",
      "selectTextHeading": "텍스트를 선택하세요",
      "selectTextDescription": "샘플 텍스트를 선택하거나 직접 텍스트를 가져와 타이핑 연습을 시작하세요.",
      "urlImportInDevelopment": "URL 가져오기는 개발 중입니다.",
      "import": "가져오기",
      "urlImportPreview": "URL에서 텍스트를 가져오면 여기에 표시됩니다",
      "pasteTextHere": "여기에 텍스트를 붙여넣으세요...",
      "theme": "테마",
      "themeSelect": "테마 선택",
      "systemSettings": "시스템 설정",
      "showWpm": "WPM 표시",
      "soundSettings": "소리 설정",
      "typingSound": "타이핑 소리",
      "volume": "볼륨",
      "soundTheme": "소리 테마",
      "testSound": "소리 테스트",
      "resetToDefaults": "기본값으로 재설정",
      "ignoreSymbols": "기호 무시",
      "autoAdvance": "자동 줄 이동",
      "keyboardShortcuts": "키보드 단축키",
      "saveShortcut": "저장",
      "tableOfContents": "목차",
      "settingsShortcut": "설정",
      "nextLine": "다음 줄",
      "previousLine": "이전 줄",
      "progress": "진행률",
      "typingSpeed": "타수",
      "accuracy": "정확도",
      "time": "시간",
      "strokesPerMinute": "타/분",
      "seconds": "초",
      "chapterComplete": "챕터 완료",
      "chapterCompleteDesc": "\"{chapter}\" 챕터를 완료했습니다.",
      "lastChapter": "마지막 챕터",
      "alreadyLastChapter": "이미 마지막 챕터입니다.",
      "firstChapter": "처음 챕터",
      "alreadyFirstChapter": "이미 처음 챕터입니다.",
      "previousChapter": "이전 챕터",
      "nextChapter": "다음 챕터",
      "chapterCompleted": "챕터를 완료했습니다",
      "practiceAgain": "다시 연습하기",
      "totalKeystrokes": "총 타수",
      "corrections": "수정",
      "errors": "오류",
      "invalidTocPositions": "일부 목차 항목의 위치 정보가 유효하지 않습니다. 텍스트를 다시 불러오거나 목차를 재생성하세요.",
      "searchToc": "목차 검색...",
      "noTocFound": "이 문서에서 목차를 찾을 수 없습니다.",
      "recalculateToc": "목차 재계산",
      "preview": "미리보기",
      "select": "선택",
      "fileReadError": "파일을 읽는 중 오류가 발생했습니다.",
      "noChapterContent": "챕터 내용이 없습니다. 다른 챕터를 선택하거나 텍스트를 다시 불러오세요.",
      "textProcessingError": "텍스트 처리 오류",
      "textProcessingErrorOccurred": "텍스트 처리 중 오류가 발생했습니다",
      "textFormatting": "텍스트 포맷팅",
      "textFormattingFailed": "텍스트 포맷팅 실패",
      "textFormattingComplete": "텍스트 포맷팅 완료",
      "textFormattingError": "텍스트 포맷팅 오류",
      "noText": "텍스트가 없습니다.",
      "titleRecognizedAndFormatted": "제목이 인식되어 포맷팅되었습니다.",
      "errorOccurredCheckConsole": "오류가 발생했습니다. 콘솔을 확인하세요.",
      "fontSize": "글꼴 크기",
      "font": "글꼴",
      "selectFont": "글꼴 선택",
      "fontMonospace": "고정폭 (Monospace)",
      "fontSansSerif": "Sans-serif",
      "fontSerif": "Serif",
      "soundThemeDefault": "기본 키보드",
      "soundThemeDefaultDesc": "기본 키보드 소리",
      "soundThemeMechanical": "기계식 키보드",
      "soundThemeMechanicalDesc": "다랍거리는 기계식 키보드 소리",
      "soundThemeMembrane": "멤브레인 키보드",
      "soundThemeMembraneDesc": "부드러운 멤브레인 키보드 소리",
      "soundThemeTypewriter": "타자기",
      "soundThemeTypewriterDesc": "클래식한 타자기 소리",
      "soundThemeSoft": "부드러운 타이핑",
      "soundThemeSoftDesc": "조용하고 부드러운 타이핑 소리",
      "fullText": "전체 텍스트",
      "debugTextLength": "텍스트 길이",
      "debugChapterCount": "챕터 수",
      "debugCurrentChapter": "현재 챕터",
      "debugNone": "없음",
      "debugTextLoaded": "텍스트 로드됨",
      "debugYes": "예",
      "debugNo": "아니오",
      "debugInfo": "디버그",
      "errorOccurred": "오류 발생",
      "soundOn": "소리 켜기",
      "soundOff": "소리 끄기",
      "detailedStats": "상세 통계",
      "netTypingSpeed": "순 타수",
      "keyboardShortcutNextChapter": "다음 챕터",
      "keyboardShortcutPrevChapter": "이전 챕터"
    },
    "home": {
      "description": "수동적 읽기를 능동적 학습으로 변환하는 미니멀리스트 타이핑 연습",
      "start": "시작하기",
      "philosophy": {
        "space": {
          "title": "空白",
          "description": "인터페이스는 공백을 부재가 아닌 가능성의 공간으로 받아듭니다."
        },
        "recognition": {
          "title": "再認識",
          "description": "능동적 타이핑을 통해 익숙한 텍스트가 낯설게 되고, 이를 통해 콘텐츠와 더 깊은 연결이 형성됩니다."
        },
        "mui": {
          "title": "無印",
          "description": "디자인은 불필요한 요소를 제거하여 타이핑이라는 본질적 행위에 집중할 수 있는 공간을 창조합니다."
        }
      }
    },
    "practice": {
      "title": "타이핑 연습",
      "importText": "텍스트 가져오기",
      "tableOfContents": "목차",
      "koreanPoems": "한국 글",
      "koreanPoemsTitle": "한국 글 (Korean Texts)",
      "englishPoems": "영어 글",
      "englishPoemsTitle": "영어 글 (English Texts)",
      "poem": {
        "azaleas": {
          "title": "진달래꽃",
          "author": "김소월",
          "text": "나 보기가 역겸워\n가실 때에는\n말없이 고이 보내 드리우리다\n\n영변에 약산\n진달래꽃\n아름 따다 가실 길에 부리우리다\n\n가시는 걸음 걸음\n놓인 그 꽃을\n사부른히 즈려밟고 가시옵소서\n\n나 보기가 역겸워\n가실 때에는\n죽어도 아니 눈물 흐리우리다"
        },
        "foreword": {
          "title": "서시",
          "author": "윤동주",
          "text": "죽는 날까지 하늘을 우러러\n한 점 부끄럼이 없기를,\n잎새에 이는 바람에도\n나는 귀로워했다.\n별을 노래하는 마음으로\n모든 죽어 가는 것을 사랑해야지\n그리고 나한테 주어진 길을\n걸어가야겠다.\n\n오늘 밤에도 별이 바람에 스치운다."
        },
        "thatFlower": {
          "title": "그 꽃",
          "author": "고은",
          "text": "내려갈 때 보았네\n올라갈 때 보지 못한\n그 꽃"
        },
        "greenGrapes": {
          "title": "청포도",
          "author": "이육사",
          "text": "내 고장 칠월은\n청포도가 익어 가는 시절.\n\n이 마을 전설이 주저리주저리 열리고\n먼 데 하늘이 꼬꼬하며 알알이 들어와 박혀.\n\n하늘 밑 푸른 바다가 가슴을 열고\n흰 돌단배가 곡게 밀려서 오면\n\n내가 바라는 손님은 고달픈 몸으로\n청포(青袖)를 입고 찾아온다고 했으니,\n\n내 그를 맞아 이 포도를 따 먹으면\n두 손은 함붉 적셔도 좋으려\n\n아이야 우리 식탁엔 은쟹반에\n하이얀 모시 수건을 마련해 두렴."
        },
        "wildflower": {
          "title": "풀꽃",
          "author": "나태주",
          "text": "자세히 보아야 예쁘다\n오래 보아야 사랑스럽다\n너도 그렇다"
        },
        "독을 차고": {
          "title": "독을 차고",
          "author": "김영랑",
          "text": "나의 마음은 고요한 물결\n바람 한 점 불지 않아도\n소란스러운 파도가 이는 까닭은\n\n그것은 눈에 보이지 않는\n물속 깊은 곳에서\n무엇이 움직이는 까닭이다\n\n나의 마음은 고요한 바다\n나는 그 바다 밑을 헤엄쳐 다니는\n흉칙한 물고기"
        },
        "님의 침묵": {
          "title": "님의 침묵",
          "author": "한용운",
          "text": "님은 갔습니다. 아아, 사랑하는 나의 님은 갔습니다.\n푸른 산빛을 깨치고 단풍나무 숲을 향하여 난 작은 길을 걸어서, 차마 떨치고 갔습니다.\n황금의 꽃같이 굴고 빛나던 옛 맹세는 차디찬 티끼이 되어서 한숨의 미풍에 날아갔습니다.\n날카로운 첫키스의 추억은 나의 운명의 지침을 돌려놓고, 뒤걸음쳐서 사라졌습니다.\n\n나는 향기로운 님의 말소리에 귀먹고, 꽃다운 님의 얼굴에 눈멀었습니다.\n사랑도 사람의 일이라 만날 때에 미리 떠날 것을 염려하고 경계하지 아니한 것은 아니지만,\n이별은 뜻밖의 일이 되고, 놀란 가슴은 새로운 슬픔에 터집니다.\n\n그러나 이별을 쓸데없는 눈물의 원천을 만들고 마는 것은 스스로 사랑을 깨치는 것인 줄 아는 까닭에,\n걸잡을 수 없는 슬픔의 힘을 옮겨서 새 희망의 정수박이에 들어부었습니다.\n\n우리는 만날 때에 떠날 것을 염려하는 것과 같이 떠날 때에 다시 만날 것을 믿습니다.\n아아, 님은 갔지마는 나는 님을 보내지 아니하였습니다.\n제 곡조를 못 이기는 사랑의 노래는 님의 침묵을 휩싸고 둥니다."
        },
        "나그네": {
          "title": "나그네",
          "author": "박목월",
          "text": "강나루 건너서\n밀백 길을\n\n구름에 달 가듯이\n가는 나그네\n\n길은 외줄기\n남도 삼백리\n\n술 익는 마을마다\n타는 저녁놀\n\n구름에 달 가듯이\n가는 나그네"
        },
        "나와 나타샤와 흰 당나귀": {
          "title": "나와 나타샤와 흰 당나귀",
          "author": "백석",
          "text": "눈은 내리고\n나는 흰 당나귀 타고\n\n흰 당나귀는\n그대가 타고\n\n눈길을 걸는다\n\n눈은 내리고\n\n흰 당나귀 타고 그대가 가는 곳\n\n동백꽃 피는 숲으로 가는 바닧길\n\n흰 당나귀 타고 가는 나와 그대는\n\n눈 속에서 만난 연인이 되고\n\n당나귀를 타고 산을 오르는 것은\n\n당나귀가 길을 알고 있는 까닭이다\n\n그대가 웃는 모습은\n\n눈이 와서 참 좋다"
        },
        "봄길": {
          "title": "봄길",
          "author": "윤동주",
          "text": "지금 저기 꿀에 움직이는\n그 봄의 노래에 이끌리운\n작은 생명들을 보라\n\n새로 피어난 생명이 움직이는\n그 생명의 소리\n움직임을 들어보라\n\n이제 곧 여름이 오고\n가을이 오고 겨울이 오고\n또 봄이 오는 것을 생각하라\n\n이 새로운 생명들이 자라\n크고 아름다워지는 것을 생각하라\n\n이 봄에 이 길을 걸으며\n나는 생각한다\n나의 생명도 이렇게 자라\n크고 아름다워진다면\n얼마나 좋을까\n\n이 봄에 이 길을 걸으며\n나는 생각한다\n나의 생명이 이렇게 아름다워진다면\n나는 얼마나 행복할까"
        }
      },
      "settings": "설정",
      "defaultChapter": "전체 텍스트",
      "progress": "진행률",
      "speed": "속도",
      "accuracy": "정확도",
      "wpm": "WPM",
      "time": "시간",
      "chapter": "챕터",
      "restart": "다시 시작",
      "continue": "계속하기",
      "finish": "완료",
      "nextChapter": "다음 챕터",
      "prevChapter": "이전 챕터"
    }
  },
  en: {
    "common": {
      "start": "Start",
      "back": "Back",
      "save": "Save",
      "cancel": "Cancel",
      "confirm": "Confirm",
      "loading": "Loading...",
      "processingFile": "Processing file...",
      "processing": "Processing...",
      "search": "Search",
      "darkMode": "Switch to Dark Mode",
      "lightMode": "Switch to Light Mode",
      "language": "Language",
      "korean": "Korean",
      "english": "English",
      "home": "Home",
      "settings": "Settings",
      "untitled": "Untitled",
      "text": "Text",
      "file": "File",
      "url": "URL",
      "paste": "Paste",
      "selectAnotherFile": "Select Another File",
      "dragAndDropFile": "Drag and drop a file or select one",
      "supportedFileTypes": "Supports TXT, HTML, PDF, and EPUB files",
      "selectFile": "Select File",
      "selectTextHeading": "Select a Text",
      "selectTextDescription": "Choose a sample text or import your own to start typing practice.",
      "urlImportInDevelopment": "URL import is under development.",
      "import": "Import",
      "urlImportPreview": "Text imported from URL will appear here",
      "pasteTextHere": "Paste your text here...",
      "theme": "Theme",
      "themeSelect": "Select Theme",
      "systemSettings": "System Settings",
      "showWpm": "Show WPM",
      "soundSettings": "Sound Settings",
      "typingSound": "Typing Sound",
      "volume": "Volume",
      "soundTheme": "Sound Theme",
      "testSound": "Test Sound",
      "resetToDefaults": "Reset to Defaults",
      "ignoreSymbols": "Ignore Symbols",
      "autoAdvance": "Auto Advance",
      "keyboardShortcuts": "Keyboard Shortcuts",
      "saveShortcut": "Save",
      "tableOfContents": "Table of Contents",
      "settingsShortcut": "Settings",
      "nextLine": "Next Line",
      "previousLine": "Previous Line",
      "progress": "Progress",
      "typingSpeed": "Typing Speed",
      "accuracy": "Accuracy",
      "time": "Time",
      "strokesPerMinute": "strokes/min",
      "seconds": "sec",
      "chapterComplete": "Chapter Complete",
      "chapterCompleteDesc": "You have completed the \"{chapter}\" chapter.",
      "lastChapter": "Last Chapter",
      "alreadyLastChapter": "This is already the last chapter.",
      "firstChapter": "First Chapter",
      "alreadyFirstChapter": "This is already the first chapter.",
      "previousChapter": "Previous Chapter",
      "nextChapter": "Next Chapter",
      "chapterCompleted": "Chapter Completed",
      "practiceAgain": "Practice Again",
      "totalKeystrokes": "Total Keystrokes",
      "corrections": "Corrections",
      "errors": "Errors",
      "invalidTocPositions": "Some table of contents items have invalid position information. Please reload the text or regenerate the table of contents.",
      "searchToc": "Search table of contents...",
      "noTocFound": "No table of contents found in this document.",
      "recalculateToc": "Recalculate TOC",
      "preview": "Preview",
      "select": "Select",
      "fileReadError": "An error occurred while reading the file.",
      "noChapterContent": "No chapter content available. Please select another chapter or reload the text.",
      "textProcessingError": "Text Processing Error",
      "textProcessingErrorOccurred": "An error occurred while processing text",
      "textFormatting": "Text Formatting",
      "textFormattingFailed": "Text Formatting Failed",
      "textFormattingComplete": "Text Formatting Complete",
      "textFormattingError": "Text Formatting Error",
      "noText": "No text available.",
      "titleRecognizedAndFormatted": "Title recognized and text formatted.",
      "errorOccurredCheckConsole": "An error occurred. Please check the console.",
      "fontSize": "Font Size",
      "font": "Font",
      "selectFont": "Select Font",
      "fontMonospace": "Monospace",
      "fontSansSerif": "Sans-serif",
      "fontSerif": "Serif",
      "soundThemeDefault": "Default Keyboard",
      "soundThemeDefaultDesc": "Standard keyboard sounds",
      "soundThemeMechanical": "Mechanical Keyboard",
      "soundThemeMechanicalDesc": "Clicky mechanical keyboard sounds",
      "soundThemeMembrane": "Membrane Keyboard",
      "soundThemeMembraneDesc": "Soft membrane keyboard sounds",
      "soundThemeTypewriter": "Typewriter",
      "soundThemeTypewriterDesc": "Classic typewriter sounds",
      "soundThemeSoft": "Soft Typing",
      "soundThemeSoftDesc": "Quiet and soft typing sounds",
      "fullText": "Full Text",
      "debugTextLength": "Text length",
      "debugChapterCount": "Chapter count",
      "debugCurrentChapter": "Current chapter",
      "debugNone": "None",
      "debugTextLoaded": "Text loaded",
      "debugYes": "Yes",
      "debugNo": "No",
      "debugInfo": "Debug",
      "errorOccurred": "Error Occurred",
      "soundOn": "Turn Sound On",
      "soundOff": "Turn Sound Off",
      "detailedStats": "Detailed Statistics",
      "netTypingSpeed": "Net Typing Speed",
      "keyboardShortcutNextChapter": "Next Chapter",
      "keyboardShortcutPrevChapter": "Previous Chapter"
    },
    "home": {
      "description": "A minimalist typing practice that transforms passive reading into active learning",
      "start": "Get Started",
      "philosophy": {
        "space": {
          "title": "空白 (Space)",
          "description": "Interface embraces whitespace not as absence, but as a space of possibility."
        },
        "recognition": {
          "title": "再認識 (Re-recognition)",
          "description": "Through active typing, familiar text becomes unfamiliar, creating a deeper connection with content."
        },
        "mui": {
          "title": "無印 (Muji)",
          "description": "Design removes unnecessary elements to create a space that focuses on the essential act of typing."
        }
      }
    },
    "practice": {
      "title": "Typing Practice",
      "importText": "Import Text",
      "tableOfContents": "Table of Contents",
      "koreanPoems": "Short Passages",
      "koreanPoemsTitle": "Korean Poems",
      "englishPoems": "English Poems",
      "englishPoemsTitle": "English Poems",
      "poem": {
        "road": {
          "title": "The Road Not Taken",
          "author": "Robert Frost",
          "text": "Two roads diverged in a yellow wood,\nAnd sorry I could not travel both\nAnd be one traveler, long I stood\nAnd looked down one as far as I could\nTo where it bent in the undergrowth;\n\nThen took the other, as just as fair,\nAnd having perhaps the better claim,\nBecause it was grassy and wanted wear;\nThough as for that the passing there\nHad worn them really about the same,\n\nAnd both that morning equally lay\nIn leaves no step had trodden black.\nOh, I kept the first for another day!\nYet knowing how way leads on to way,\nI doubted if I should ever come back.\n\nI shall be telling this with a sigh\nSomewhere ages and ages hence:\nTwo roads diverged in a wood, and I—\nI took the one less traveled by,\nAnd that has made all the difference."
        },
        "fire": {
          "title": "Fire and Ice",
          "author": "Robert Frost",
          "text": "Some say the world will end in fire,\nSome say in ice.\nFrom what I've tasted of desire\nI hold with those who favor fire.\nBut if it had to perish twice,\nI think I know enough of hate\nTo say that for destruction ice\nIs also great\nAnd would suffice."
        },
        "hope": {
          "title": "Hope is the thing with feathers",
          "author": "Emily Dickinson",
          "text": "Hope is the thing with feathers\nThat perches in the soul,\nAnd sings the tune without the words,\nAnd never stops at all,\n\nAnd sweetest in the gale is heard;\nAnd sore must be the storm\nThat could abash the little bird\nThat kept so many warm.\n\nI've heard it in the chillest land,\nAnd on the strangest sea;\nYet, never, in extremity,\nIt asked a crumb of me."
        },
        "stopping": {
          "title": "Stopping by Woods on a Snowy Evening",
          "author": "Robert Frost",
          "text": "Whose woods these are I think I know.\nHis house is in the village though;\nHe will not see me stopping here\nTo watch his woods fill up with snow.\n\nMy little horse must think it queer\nTo stop without a farmhouse near\nBetween the woods and frozen lake\nThe darkest evening of the year.\n\nHe gives his harness bells a shake\nTo ask if there is some mistake.\nThe only other sound's the sweep\nOf easy wind and downy flake.\n\nThe woods are lovely, dark and deep,\nBut I have promises to keep,\nAnd miles to go before I sleep,\nAnd miles to go before I sleep."
        },
        "dream": {
          "title": "A Dream Within A Dream",
          "author": "Edgar Allan Poe",
          "text": "Take this kiss upon the brow!\nAnd, in parting from you now,\nThus much let me avow —\nYou are not wrong, who deem\nThat my days have been a dream;\nYet if hope has flown away\nIn a night, or in a day,\nIn a vision, or in none,\nIs it therefore the less gone?\nAll that we see or seem\nIs but a dream within a dream.\n\nI stand amid the roar\nOf a surf-tormented shore,\nAnd I hold within my hand\nGrains of the golden sand —\nHow few! yet how they creep\nThrough my fingers to the deep,\nWhile I weep — while I weep!\nO God! Can I not grasp\nThem with a tighter clasp?\nO God! can I not save\nOne from the pitiless wave?\nIs all that we see or seem\nBut a dream within a dream?"
        },
        "azaleas": {
          "title": "Azaleas",
          "author": "Kim Sowol",
          "text": "When you leave,\nTired of seeing me,\nI'll gently let you go without a word.\n\nFrom Yongbyun's Yaksan,\nI'll gather armfuls of azaleas\nAnd scatter them on your path.\n\nStep by step,\nAs you go,\nTread softly on those flowers as you depart.\n\nWhen you leave,\nTired of seeing me,\nI won't cry, even in death."
        },
        "foreword": {
          "title": "Foreword",
          "author": "Yoon Dong-ju",
          "text": "Until the day I die, I long to have\nNo speck of shame\nWhen I gaze up toward heaven.\nEven in the wind that stirs the leaves,\nI have felt pain.\nWith a heart that sings of stars,\nI shall love all things that are dying.\nAnd I must walk the path\nThat has been given to me.\n\nTonight, again, the stars are brushed by the wind."
        },
        "thatFlower": {
          "title": "That Flower",
          "author": "Ko Un",
          "text": "On the way down I saw\nWhat I couldn't see\nOn the way up, that flower."
        },
        "greenGrapes": {
          "title": "Green Grapes",
          "author": "Lee Yuksa",
          "text": "July in my hometown\nIs when the green grapes ripen.\n\nThe village legends unfold in abundance,\nAnd the distant sky enters and embeds itself, dreaming, kernel by kernel.\n\nWhen the blue sea beneath the sky opens its heart\nAnd white sailboats are gently pushed in,\n\nThe guest I await, with a weary body,\nWill come dressed in a blue robe, they say.\n\nIf I welcome them and we eat these grapes together,\nIt would be fine if both hands were fully soaked.\n\nChild, on our table, on the silver tray,\nPrepare a white linen napkin."
        },
        "wildflower": {
          "title": "Wildflower",
          "author": "Na Tae-ju",
          "text": "Look closely to see its beauty\nLook long to fall in love\nYou are like that too."
        },
        "독을 차고": {
          "title": "Wearing Poison",
          "author": "Kim Yeong-rang",
          "text": "My heart is a calm wave\nEven without a breeze\nThe reason turbulent waves arise\n\nIs because something moves\nDeep in the water\nInvisible to the eye\n\nMy heart is a calm sea\nI am the hideous fish\nSwimming at the bottom of that sea"
        },
        "님의 침묵": {
          "title": "The Silence of Love",
          "author": "Han Yong-un",
          "text": "My beloved has gone. Ah, my beloved has gone.\nBreaking through the blue mountain light, walking the small path toward the maple forest, finally shaking free and gone.\nThe old vow, firm and bright like a golden flower, has become cold dust, flying away in a sighing breeze.\nThe memory of that sharp first kiss turned the needle of my fate, then stepped backward and disappeared.\n\nI became deaf to my beloved's fragrant voice, blind to that flowery face.\nThough love, being human, made us wary of parting even as we met,\nThe separation came unexpectedly, and my startled heart bursts with new sorrow.\n\nBut knowing that making separation into a useless fountain of tears would be to break love itself,\nI have poured the uncontrollable power of grief into a vessel of new hope.\n\nAs we worry about parting when we meet, we believe in meeting again when we part.\nAh, though my beloved has gone, I have not let them go.\nThe love song that cannot overcome its own melody surrounds and helps my beloved's silence."
        },
        "나그네": {
          "title": "Wanderer",
          "author": "Park Mok-wol",
          "text": "Crossing the river\nAlong the wheat field path\n\nLike the moon through clouds\nGoes the wanderer\n\nThe path is a single thread\nThree hundred miles of southern land\n\nIn every village where wine ripens\nBurns the evening glow\n\nLike the moon through clouds\nGoes the wanderer"
        },
        "나와 나타샤와 흰 당나귀": {
          "title": "Me, Natasha, and the White Donkey",
          "author": "Baek Seok",
          "text": "Snow is falling\nI ride a white donkey\n\nThe white donkey\nYou ride\n\nWe walk the snowy path\n\nSnow is falling\n\nWhere you go riding the white donkey\n\nA sea path to the forest where camellias bloom\n\nYou and I, riding the white donkey\n\nBecome lovers who met in the snow\n\nThe reason we climb mountains on donkeys\n\nIs because the donkey knows the way\n\nYour smiling face\n\nIs so lovely with the falling snow"
        },
        "봄길": {
          "title": "Spring Path",
          "author": "Yoon Dong-ju",
          "text": "Look at the small lives\nDrawn to the song of spring\nMoving there in the honey\n\nListen to the sound\nThe movement of life\nNewly blossomed and stirring\n\nThink of how soon summer will come\nAnd autumn, and winter\nAnd spring again\n\nThink of how these new lives\nWill grow large and beautiful\n\nWalking this path in spring\nI think:\nIf my life could grow like this\nLarge and beautiful\nHow wonderful it would be\n\nWalking this path in spring\nI think:\nIf my life could become this beautiful\nHow happy I would be"
        }
      },
      "settings": "Settings",
      "defaultChapter": "Full Text",
      "progress": "Progress",
      "speed": "Speed",
      "accuracy": "Accuracy",
      "wpm": "WPM",
      "time": "Time",
      "chapter": "Chapter",
      "restart": "Restart",
      "continue": "Continue",
      "finish": "Finish",
      "nextChapter": "Next Chapter",
      "prevChapter": "Previous Chapter"
    }
  }
}

// 언어 제공자 컴포넌트
export function LanguageProvider({
  children,
  initialLanguage,
}: { children: React.ReactNode; initialLanguage?: Language }) {
  // 언어 상태 관리
  const [language, setLanguageState] = useState<Language>(initialLanguage ?? defaultLanguage)
  const [mounted, setMounted] = useState(false)

  // 클라이언트 사이드에서만 실행되는 코드
  useEffect(() => {
    setMounted(true)
    try {
      const savedLanguage = localStorage.getItem("language") as Language
      if (savedLanguage && (savedLanguage === "ko" || savedLanguage === "en")) {
        console.log(`초기 언어 설정: ${savedLanguage}`)
        setLanguageState(savedLanguage)
      }
    } catch (error) {
      console.error("로컬 스토리지 접근 오류:", error)
    }
  }, [])

  // 언어 변경 함수
  const setLanguage = (newLanguage: Language) => {
    console.log(`언어 변경: ${language} → ${newLanguage}`)
    setLanguageState(newLanguage)
    try {
      localStorage.setItem("language", newLanguage)
      document.documentElement.lang = newLanguage
    } catch (error) {
      console.error("언어 설정 저장 오류:", error)
    }
  }

  // 번역 함수
  const t = (key: string): string => {
    if (!key) return key
    if (!mounted) return key
    
    try {
      const keys = key.split(".")
      let result: any = translations[language]
      
      for (const k of keys) {
        if (result && typeof result === "object" && k in result) {
          result = result[k]
        } else {
          console.log(`번역 키를 찾을 수 없음: ${key}, 현재 언어: ${language}`)
          return key
        }
      }
      
      return typeof result === "string" ? result : key
    } catch (error) {
      console.error(`번역 함수 오류 (키: ${key}):`, error)
      return key
    }
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

// 언어 컨텍스트 사용을 위한 훅
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
