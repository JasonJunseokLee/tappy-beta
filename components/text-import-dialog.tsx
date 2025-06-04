"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useLanguage } from "@/contexts/language-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Loader2, ArrowRight, Globe, ClipboardCopy, BookOpen, Check } from "lucide-react"
import { extractTableOfContents } from "@/utils/toc-utils"
import { extractEpubToc, adjustChapterPositions } from "@/utils/epub-utils"
import { formatTextWithHeadings } from "@/utils/text-formatter"

interface TextImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (text: string, title: string, chapters: { title: string; position: number; level: number; id: string }[]) => void
  onSelectSample: (text: string, title: string) => void
}

export default function TextImportDialog({
  open,
  onOpenChange,
  onImport,
  onSelectSample,
}: TextImportDialogProps) {
  const { t, language } = useLanguage()
  
  // 샘플 텍스트를 위한 상태 관리
  const [koreanPoems, setKoreanPoems] = useState<Array<{id: string; title: string; author: string; text: string}>>([]);
  const [englishPoems, setEnglishPoems] = useState<Array<{id: string; title: string; author: string; text: string}>>([]);
  const [samplesLoaded, setSamplesLoaded] = useState<boolean>(false);
  
  // 개별 JSON 파일에서 샘플 텍스트 로드
  useEffect(() => {
    const loadSampleTexts = async () => {
      try {
        // 한국어 글 파일 목록
        const koTexts = [
          'azaleas', 'foreword', 'thatFlower', 'greenGrapes', 'wildflower',
          'hong_gildong_jeon', 'chunhyang_jeon', 'simcheong_jeon', 'heungbu_nolbu_jeon',
          'janghwa_hongryeon_jeon', 'guunmong', 'onyeong_jeon', 'sassinamjeonggi',
          'byuljubujeon', 'nanjung_ilgi', 'mokminsimseo', 'eouyadam', 'hoejaejip',
          'woo_eon_yeojam', 'bom_bom', 'buckwheat_season', 'a_lucky_day', 'sonagi', 'wings'
        ];
        const loadedKoPoems = [];
        
        // 각 한국어 글 파일 로드
        for (const textId of koTexts) {
          try {
            const response = await fetch(`/samples/ko/texts/${textId}.json`);
            const textData = await response.json();
            loadedKoPoems.push(textData);
          } catch (err) {
            console.error(`Error loading Korean text ${textId}:`, err);
          }
        }
        
        setKoreanPoems(loadedKoPoems);
        
        // 영어 글 파일 목록
        const enTexts = [
          'road', 'fire', 'hope', 'stopping', 'dream',
          'the_raven', 'to_be_or_not_to_be', 'gettysburg_address'
        ];
        const loadedEnPoems = [];
        
        // 각 영어 글 파일 로드
        for (const textId of enTexts) {
          try {
            const response = await fetch(`/samples/en/texts/${textId}.json`);
            const textData = await response.json();
            loadedEnPoems.push(textData);
          } catch (err) {
            console.error(`Error loading English text ${textId}:`, err);
          }
        }
        
        setEnglishPoems(loadedEnPoems);
        setSamplesLoaded(true);
      } catch (error) {
        console.error('Error loading sample texts:', error);
      }
    };
    
    loadSampleTexts();
  }, []);
  
  // 현재 언어에 따라 적절한 샘플 텍스트 선택
  const sampleTexts = {
    poems: language === "ko" ? koreanPoems : englishPoems
  }
  
  // Primary state - what method is being used to import text
  const [importMethod, setImportMethod] = useState<"samples" | "file" | "url" | "paste">("samples")

  // Content state
  const [title, setTitle] = useState<string>("")
  const [text, setText] = useState<string>("")
  const [url, setUrl] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [previewText, setPreviewText] = useState<string>("")
  const [selectedSample, setSelectedSample] = useState<{ title: string; text: string; author?: string } | null>(null)
  const [extractedChapters, setExtractedChapters] = useState<any[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset preview when import method changes
  useEffect(() => {
    setPreviewText("")
    setSelectedSample(null)
    setExtractedChapters([])
  }, [importMethod])

  // Load necessary libraries
  useEffect(() => {
    if (!open) return

    // Only load libraries if file import is selected
    if (importMethod === "file") {
      // PDF.js preload
      const preloadPdfJs = () => {
        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"
        script.async = true
        document.head.appendChild(script)

        script.onload = () => {
          if ((window as any).pdfjsLib) {
            ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
          }
        }
      }

      // JSZip preload
      const preloadJsZip = () => {
        const script = document.createElement("script")
        script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
        script.async = true
        document.head.appendChild(script)
      }

      preloadPdfJs()
      preloadJsZip()
    }
  }, [open, importMethod])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setTitle(selectedFile.name.split(".")[0])
      setIsLoading(true)
      setError("")
      setExtractedChapters([])

      try {
        const { content: fileContent, chapters } = await readFile(selectedFile)
        console.log("File content loaded, length:", fileContent.length)
        setText(fileContent)
        setPreviewText(fileContent.substring(0, 300) + (fileContent.length > 300 ? "..." : ""))

        if (chapters && chapters.length > 0) {
          console.log("Extracted chapters:", chapters)
          setExtractedChapters(chapters)
        } else {
          // 목차가 추출되지 않았으면 텍스트에서 추출 시도
          const extractedFromText = extractTableOfContents(fileContent)
          console.log("Chapters extracted from text:", extractedFromText)
          setExtractedChapters(extractedFromText)
        }
      } catch (err) {
        setError(t("common.fileReadError"))
        console.error("Error reading file:", err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // 파일 읽기 함수 수정
  const readFile = async (file: File): Promise<{ content: string; chapters?: any[] }> => {
    return new Promise((resolve, reject) => {
      const fileType = file.type.toLowerCase()
      const fileName = file.name.toLowerCase()

      // 텍스트 파일 처리
      if (fileType === "text/plain" || fileName.endsWith(".txt")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            const content = event.target.result as string
            console.log("Loaded text file content:", content.substring(0, 100) + "...")
            resolve({ content })
          } else {
            reject(new Error("파일을 읽을 수 없습니다."))
          }
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
      }
      // PDF 파일 처리
      else if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
        setIsLoading(true)

        // PDF.js 라이브러리 동적 로드
        const loadPdfJs = async () => {
          if (!(window as any).pdfjsLib) {
            // PDF.js 라이브러리 로드
            const pdfjsScript = document.createElement("script")
            pdfjsScript.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"
            document.head.appendChild(pdfjsScript)

            // 라이브러리 로드 완료 대기
            await new Promise<void>((resolve) => {
              pdfjsScript.onload = () => resolve()
            })

            // 워커 설정
            ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js"
          }

          return (window as any).pdfjsLib
        }

        loadPdfJs()
          .then(async (pdfjsLib) => {
            try {
              // 파일을 ArrayBuffer로 읽기
              const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as ArrayBuffer)
                reader.onerror = reject
                reader.readAsArrayBuffer(file)
              })

              // PDF 문서 로드
              const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
              const pdf = await loadingTask.promise

              // 목차 추출 시도
              const outline = await pdf.getOutline()
              const chapters: any[] = []

              if (outline && outline.length > 0) {
                // PDF 목차 항목을 챕터 정보로 변환
                const processOutlineItem = (item: any, level = 1): any => {
                  const dest = item.dest
                  let position = 0

                  // 위치 정보가 있으면 사용
                  if (typeof dest === "string") {
                    // 문자열 형태의 목적지는 페이지 번호로 대략적인 위치 추정
                    position = Number.parseInt(dest.replace(/[^0-9]/g, "")) * 1000 || 0
                  } else if (Array.isArray(dest) && dest.length > 0) {
                    // 배열 형태의 목적지에서 페이지 참조 추출
                    const pageRef = dest[0]
                    if (pageRef && typeof pageRef === "object" && "num" in pageRef) {
                      position = (pageRef as any).num * 1000
                    }
                  }

                  const chapter = {
                    id: Math.random().toString(36).substring(2, 9),
                    title: item.title,
                    position,
                    level,
                    children: [] as any[],
                  }

                  if (item.items && item.items.length > 0) {
                    chapter.children = item.items.map((child: any) => processOutlineItem(child, level + 1))
                  }

                  return chapter
                }

                outline.forEach((item: any) => {
                  chapters.push(processOutlineItem(item))
                })
              }

              // 모든 페이지의 텍스트 추출
              let fullText = ""
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items.map((item: any) => item.str).join(" ")

                fullText += pageText + "\n\n"
              }

              // 목차가 없으면 텍스트에서 추출 시도
              if (chapters.length === 0) {
                const extractedChapters = extractTableOfContents(fullText)
                resolve({ content: fullText, chapters: extractedChapters })
              } else {
                resolve({ content: fullText, chapters })
              }
            } catch (error) {
              console.error("PDF 처리 중 오류:", error)
              reject(new Error("PDF 파일을 처리하는 중 오류가 발생했습니다."))
            } finally {
              setIsLoading(false)
            }
          })
          .catch((error) => {
            console.error("PDF.js 로드 중 오류:", error)
            setIsLoading(false)
            reject(new Error("PDF 처리 라이브러리를 로드하는 중 오류가 발생했습니다."))
          })
      }
      // EPUB 파일 처리 - 개선된 버전
      else if (fileName.endsWith(".epub")) {
        setIsLoading(true)

        // JSZip 라이브러리 동적 로드
        const loadJsZip = async () => {
          if (!(window as any).JSZip) {
            // JSZip 라이브러리 로드
            const jsZipScript = document.createElement("script")
            jsZipScript.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
            document.head.appendChild(jsZipScript)

            // 라이브러리 로드 완료 대기
            await new Promise<void>((resolve) => {
              jsZipScript.onload = () => resolve()
            })
          }

          return (window as any).JSZip
        }

        loadJsZip()
          .then(async (JSZip) => {
            try {
              // 파일을 ArrayBuffer로 읽기
              const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result as ArrayBuffer)
                reader.onerror = reject
                reader.readAsArrayBuffer(file)
              })

              // EPUB 파일 압축 해제 (EPUB는 기본적으로 ZIP 파일)
              const zip = new JSZip()
              const contents = await zip.loadAsync(arrayBuffer)

              // 모든 파일 목록 가져오기
              const fileList = Object.keys(contents.files)
              console.log("EPUB files:", fileList)

              // 목차 추출 시도
              const { chapters, tocFound } = await extractEpubToc(contents, fileList)

              // 콘텐츠 파일 찾기 (XHTML 파일)
              let fullText = ""
              const contentFiles: string[] = []

              // EPUB 파일 내의 모든 파일 검사
              await Promise.all(
                Object.keys(contents.files).map(async (filename) => {
                  if (filename.endsWith(".xhtml") || filename.endsWith(".html") || filename.endsWith(".xml")) {
                    contentFiles.push(filename)
                  }
                }),
              )

              // 콘텐츠 파일에서 텍스트 추출
              for (const filename of contentFiles) {
                const content = await contents.file(filename)?.async("text")
                if (content) {
                  // HTML 태그 제거
                  const tempDiv = document.createElement("div")
                  tempDiv.innerHTML = content
                  fullText += tempDiv.textContent || tempDiv.innerText || ""
                  fullText += "\n\n"
                }
              }

              // 목차 위치 조정
              let finalChapters = chapters
              if (chapters.length > 0) {
                finalChapters = adjustChapterPositions(chapters, fullText)
              } else {
                // 목차가 추출되지 않았으면 텍스트에서 추출 시도
                finalChapters = extractTableOfContents(fullText)
              }

              resolve({ content: fullText, chapters: finalChapters })
            } catch (error) {
              console.error("EPUB 처리 중 오류:", error)
              reject(new Error("EPUB 파일을 처리하는 중 오류가 발생했습니다."))
            } finally {
              setIsLoading(false)
            }
          })
          .catch((error) => {
            console.error("JSZip 로드 중 오류:", error)
            setIsLoading(false)
            reject(new Error("EPUB 처리 라이브러리를 로드하는 중 오류가 발생했습니다."))
          })
      }
      // HTML 파일 처리
      else if (fileType === "text/html" || fileName.endsWith(".html") || fileName.endsWith(".htm")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            // HTML에서 텍스트만 추출하는 간단한 방법
            const htmlContent = event.target.result as string
            const tempDiv = document.createElement("div")
            tempDiv.innerHTML = htmlContent
            const content = tempDiv.textContent || tempDiv.innerText || ""

            // 목차 추출 시도
            const chapters = extractTableOfContents(content)

            resolve({ content, chapters })
          } else {
            reject(new Error("HTML 파일을 읽을 수 없습니다."))
          }
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
      }
      // 지원하지 않는 파일 형식
      else {
        reject(new Error("지원하지 않는 파일 형식입니다. TXT, HTML, PDF, EPUB 파일만 지원합니다."))
      }
    })
  }

  const handlePasteText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const pastedText = e.target.value
    setText(pastedText)
    setPreviewText(pastedText.substring(0, 300) + (pastedText.length > 300 ? "..." : ""))

    // 목차 추출 시도
    const chapters = extractTableOfContents(pastedText)
    setExtractedChapters(chapters)
  }

  // handleImport 함수 수정
  const handleImport = () => {
    if (!text) return

    console.log("Importing text, length:", text.length)
    // 추출된 목차가 있으면 사용, 없으면 텍스트에서 추출
    const chapters = extractedChapters.length > 0 ? extractedChapters : extractTableOfContents(text)

    console.log("Importing with chapters:", chapters)
    onImport(text, title || "제목 없음", chapters)
    resetForm()
  }

  const resetForm = () => {
    setTitle("")
    setText("")
    setUrl("")
    setFile(null)
    setError("")
    setPreviewText("")
    setSelectedSample(null)
    setExtractedChapters([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)
      setTitle(droppedFile.name.split(".")[0])
      setIsLoading(true)
      setError("")
      setExtractedChapters([])

      try {
        const { content: fileContent, chapters } = await readFile(droppedFile)
        setText(fileContent)
        setPreviewText(fileContent.substring(0, 300) + (fileContent.length > 300 ? "..." : ""))

        if (chapters && chapters.length > 0) {
          console.log("Extracted chapters from drop:", chapters)
          setExtractedChapters(chapters)
        } else {
          // 목차가 추출되지 않았으면 텍스트에서 추출 시도
          const extractedFromText = extractTableOfContents(fileContent)
          console.log("Chapters extracted from text after drop:", extractedFromText)
          setExtractedChapters(extractedFromText)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.fileReadError"))
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Select a sample text
  const handleSelectSample = (sample: { title: string; text: string; author?: string }) => {
    setTitle(`${sample.title} - ${sample.author || ""}`)
    setText(sample.text)
    setPreviewText(sample.text.substring(0, 300) + (sample.text.length > 300 ? "..." : ""))
    setSelectedSample(sample)

    // 샘플 텍스트에서 목차 추출 시도
    const chapters = extractTableOfContents(sample.text)
    setExtractedChapters(chapters)
  }

  const handleImportText = (
    importedText: string,
    importedTitle: string,
    importedChapters: { title: string; position: number; level: number; id: string }[],
  ) => {
    try {
      // 텍스트에서 제목을 인식하고 포맷팅 적용
      const formattedText = formatTextWithHeadings(importedText)

      // 목차 위치 검증 및 수정 - 포맷팅된 텍스트 기반으로 위치 재계산
      // const validatedChapters = validateAndFixChapterPositions(importedChapters, formattedText)

      // 목차 위치 정보 로깅
      console.log(
        "Chapters after validation:",
        importedChapters.map((c) => ({ title: c.title, position: c.position })),
      )

      // 상태 초기화
      setText(formattedText)
      setTitle(importedTitle)
      // setCurrentPosition(0)
      // setChapters(validatedChapters)
      // setShowTextImport(false)

      // 세션 저장 데이터 초기화 및 저장
      const session = {
        text: formattedText,
        title: importedTitle,
        position: 0,
        chapters: importedChapters,
      }
      localStorage.setItem("typingSession", JSON.stringify(session))
    } catch (error) {
      console.error("Error formatting text:", error)
      // 오류 발생 시 원본 텍스트 사용
      // 기존 처리 로직...
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm()
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="sm:max-w-[700px] bg-background border-border shadow-lg p-0 overflow-hidden rounded-lg">
        <div className="flex h-[600px]">
          {/* Left sidebar - Import methods */}
          <div className="w-[200px] border-r border-border/10 bg-muted/30 p-6 flex flex-col">
            <DialogHeader className="mb-8 text-left">
              <DialogTitle className="text-2xl font-extralight tracking-tight">{t("practice.importText")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-1 flex-1">
              <Button
                variant="ghost"
                className={`w-full justify-start px-2 py-6 rounded-md text-left transition-all duration-200 ${
                  importMethod === "samples"
                    ? "bg-background shadow-sm border-l-2 border-foreground pl-[6px] font-normal"
                    : "text-muted-foreground font-light hover:text-foreground"
                }`}
                onClick={() => setImportMethod("samples")}
              >
                <BookOpen
                  className={`h-5 w-5 mr-3 ${importMethod === "samples" ? "text-foreground" : "text-muted-foreground/70"}`}
                />
                <span>{t("practice.koreanPoems")}</span>
              </Button>

              <Button
                variant="ghost"
                className={`w-full justify-start px-2 py-6 rounded-md text-left transition-all duration-200 ${
                  importMethod === "file"
                    ? "bg-background shadow-sm border-l-2 border-foreground pl-[6px] font-normal"
                    : "text-muted-foreground font-light hover:text-foreground"
                }`}
                onClick={() => setImportMethod("file")}
              >
                <FileText
                  className={`h-5 w-5 mr-3 ${importMethod === "file" ? "text-foreground" : "text-muted-foreground/70"}`}
                />
                <span>{t("common.file")}</span>
              </Button>

              <Button
                variant="ghost"
                className={`w-full justify-start px-2 py-6 rounded-md text-left transition-all duration-200 ${
                  importMethod === "url"
                    ? "bg-background shadow-sm border-l-2 border-foreground pl-[6px] font-normal"
                    : "text-muted-foreground font-light hover:text-foreground"
                }`}
                onClick={() => setImportMethod("url")}
              >
                <Globe
                  className={`h-5 w-5 mr-3 ${importMethod === "url" ? "text-foreground" : "text-muted-foreground/70"}`}
                />
                <span>{t("common.url")}</span>
              </Button>

              <Button
                variant="ghost"
                className={`w-full justify-start px-2 py-6 rounded-md text-left transition-all duration-200 ${
                  importMethod === "paste"
                    ? "bg-background shadow-sm border-l-2 border-foreground pl-[6px] font-normal"
                    : "text-muted-foreground font-light hover:text-foreground"
                }`}
                onClick={() => setImportMethod("paste")}
              >
                <ClipboardCopy
                  className={`h-5 w-5 mr-3 ${importMethod === "paste" ? "text-foreground" : "text-muted-foreground/70"}`}
                />
                <span>{t("common.paste")}</span>
              </Button>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col">
            {/* Content area */}
            <div className="flex-1 p-8 overflow-auto">
              {/* Samples */}
              {importMethod === "samples" && (
                <div className="h-full flex flex-col">
                  <h2 className="text-lg font-medium mb-6">{t("practice.koreanPoemsTitle")}</h2>

                  {/* Sample list */}
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {sampleTexts.poems.map((item: { id: string; title: string; author: string; text: string }, index: number) => (
                        <div
                          key={index}
                          className={`group border border-border/10 rounded-md transition-all duration-200 ${
                            selectedSample?.title === item.title
                              ? "bg-accent/10 border-accent"
                              : "hover:bg-accent/5 hover:border-accent/30"
                          }`}
                        >
                          <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h3 className="font-normal text-lg leading-tight">{t(`practice.poem.${item.id}.title`)}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">{t(`practice.poem.${item.id}.author`)}</p>
                                </div>
                              {selectedSample?.title === item.title && (
                                <Check className="h-4 w-4 text-accent-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                              {item.text.split("\n")[0]}
                            </p>
                            <div className="flex justify-between items-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSelectSample(item)}
                                className="text-xs font-light px-0 hover:bg-transparent hover:text-foreground"
                              >
                                {t("common.preview")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  onSelectSample(item.text, `${item.title} - ${item.author}`)
                                  onOpenChange(false)
                                }}
                                className={`text-xs px-3 py-1 h-7 transition-all duration-200 ${
                                  selectedSample?.title === item.title
                                    ? "bg-accent/20 text-accent-foreground"
                                    : "opacity-0 group-hover:opacity-100"
                                }`}
                              >
                                {t("common.select")} <ArrowRight className="ml-1 h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* File import */}
              {importMethod === "file" && (
                <div className="h-full flex flex-col">
                  <div
                    className={`border-2 border-dashed border-border/40 rounded-md p-10 text-center flex-1 flex flex-col items-center justify-center transition-all duration-200 ${
                      file ? "bg-accent/5 border-accent/40" : "hover:bg-accent/5 hover:border-accent/30"
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    {isLoading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-10 w-10 animate-spin text-accent mb-6" />
                        <p className="text-sm mb-2">{t("common.processingFile")}</p>
                        {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
                      </div>
                    ) : file ? (
                      <div className="flex flex-col items-center">
                        <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
                          <FileText className="h-8 w-8 text-accent-foreground" />
                        </div>
                        <p className="text-base font-medium mb-1">{file.name}</p>
                        <p className="text-xs text-muted-foreground mb-6">{(file.size / 1024).toFixed(1)} KB</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFile(null)
                            setText("")
                            setPreviewText("")
                            setExtractedChapters([])
                            if (fileInputRef.current) fileInputRef.current.value = ""
                          }}
                          className="text-xs border-border/30 hover:bg-accent/5 hover:text-foreground"
                        >
                          {t("common.selectAnotherFile")}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-base font-medium mb-4">{t("common.dragAndDropFile")}</p>
                        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                          {t("common.supportedFileTypes")}
                        </p>
                        <input
                          ref={fileInputRef}
                          id="file-upload"
                          type="file"
                          accept=".txt,.html,.htm,.pdf,.epub"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm border-border/30 hover:bg-accent/5 hover:text-foreground"
                        >
                          {t("common.selectFile")}
                        </Button>
                        {error && (
                          <p className="text-xs text-error mt-4 p-2 bg-error/5 rounded-sm border border-error/20">
                            {error}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* URL import */}
              {importMethod === "url" && (
                <div className="h-full flex flex-col">
                  <div className="space-y-4 mb-6">
                    <Label htmlFor="url-input" className="text-sm font-medium">
                      URL
                    </Label>
                    <div className="flex space-x-4">
                      <Input
                        id="url-input"
                        placeholder="https://example.com/article.html"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="bg-background border-border/40 rounded-md focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          // 실제 앱에서는 URL에서 텍스트를 가져오는 기능 구현
                          alert(t("common.urlImportInDevelopment"))
                        }}
                        className="rounded-md border-border/40 hover:bg-accent/5 hover:text-foreground hover:border-accent/40"
                      >
                        {t("common.import")}
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border/30 rounded-md">
                    <div className="text-center p-8">
                      <Globe className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                      <p className="text-muted-foreground">{t("common.urlImportPreview")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Paste text */}
              {importMethod === "paste" && (
                <div className="h-full flex flex-col">
                  <div className="space-y-4 flex-1">
                    <Label htmlFor="paste-input" className="text-sm font-medium">
                      {t("common.text")}
                    </Label>
                    <Textarea
                      id="paste-input"
                      placeholder={t("common.pasteTextHere")}
                      rows={15}
                      value={text}
                      onChange={handlePasteText}
                      className="bg-background border-border/40 rounded-md focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent resize-none flex-1 min-h-[300px]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Preview and action area */}
            <div className="border-t border-border/10 p-6 bg-muted/20">
              {previewText ? (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="title-input" className="text-sm font-medium">
                      제목
                    </Label>
                    <div className="flex items-center space-x-4">
                      <p className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                        {text.length.toLocaleString()} 글자
                      </p>
                      <p className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
                        목차 {extractedChapters.length}개
                      </p>
                    </div>
                  </div>
                  <Input
                    id="title-input"
                    placeholder="문서 제목"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-background border-border/40 rounded-md focus-visible:ring-1 focus-visible:ring-accent focus-visible:border-accent mb-4"
                  />

                  <div className="bg-background border border-border/20 rounded-md p-4 max-h-[100px] overflow-auto text-sm text-muted-foreground">
                    <p className="whitespace-pre-line">{previewText}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end space-x-6">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-sm font-light hover:bg-transparent hover:text-foreground"
                >
                  {t("common.cancel")}
                </Button>

                {previewText ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (importMethod === "samples" && selectedSample) {
                        onSelectSample(selectedSample.text, `${selectedSample.title} - ${selectedSample.author || ""}`)
                        onOpenChange(false)
                      } else {
                        handleImport()
                      }
                    }}
                    disabled={!text || isLoading}
                    className="rounded-md border-border/40 bg-accent/5 hover:bg-accent/10 hover:text-foreground hover:border-accent/40 transition-all duration-200"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("common.processing")}
                      </>
                    ) : (
                      <>
                        {t("common.import")} <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
