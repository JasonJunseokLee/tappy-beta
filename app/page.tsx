import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground transition-theme">
      {/* 상단 네비게이션 - 미니멀 */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-light tracking-tight">泰披</span>
              <span className="ml-2 text-xl font-extralight tracking-wide">Tappy</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 - 하라켄야 스타일의 여백과 미니멀리즘 */}
      <div className="w-full max-w-5xl px-6 flex flex-col items-center justify-center py-16">
        {/* 히어로 섹션 - 단순하고 기능적인 디자인 */}
        <section className="w-full flex flex-col items-center text-center py-24 space-y-16">
          <div className="space-y-8 max-w-2xl">
            <h1 className="tracking-tight">
              <span className="text-7xl md:text-9xl font-extralight block mb-2 tracking-tighter leading-none">泰披</span>
              <span className="text-4xl md:text-5xl block font-extralight tracking-wide">Tappy</span>
            </h1>
            <p className="text-xl font-light text-muted-foreground max-w-xl mx-auto leading-relaxed">
              수동적 읽기를 능동적 학습으로 변환하는 미니멀리스트 타이핑 연습
            </p>
            <div className="pt-8">
              <Link href="/practice">
                <Button className="rounded-none px-12 py-6 bg-foreground text-background hover:bg-foreground/90 transition-all duration-500">
                  시작하기
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
          
          {/* 시각화 요소 제거됨 */}
        </section>

        {/* 철학 섹션 - 간결하고 여백이 있는 디자인 */}
        <section className="w-full py-24 border-t border-border/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
            <div className="space-y-6">
              <h3 className="text-xl font-light">空白</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                인터페이스는 공백을 부재가 아닌 가능성의 공간으로 받아들입니다.
              </p>
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-light">再認識</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                능동적 타이핑을 통해 익숙한 텍스트가 낯설게 되고, 이를 통해 콘텐츠와 더 깊은 연결이 형성됩니다.
              </p>
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-light">無印</h3>
              <p className="text-muted-foreground leading-relaxed font-light">
                디자인은 불필요한 요소를 제거하여 타이핑이라는 본질적 행위에 집중할 수 있는 공간을 창조합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 푸터 - 미니멀한 디자인 */}
        <footer className="w-full py-12 border-t border-border/10 text-center text-sm text-muted-foreground">
          <p>© 2025 泰披 Tappy</p>
        </footer>
      </div>
    </main>
  )
}
