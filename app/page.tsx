import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 transition-theme">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl space-y-24">
        <section className="space-y-12">
          <h1 className="text-4xl md:text-6xl font-extralight tracking-tight">Transcribe</h1>
          <p className="text-lg md:text-xl font-light text-muted-foreground max-w-xl leading-relaxed">
            수동적 읽기를 능동적 학습으로 변환하는 미니멀리스트 타이핑 연습
          </p>
          <div className="pt-4">
            <Link href="/practice">
              <Button className="group rounded-full px-8 py-6 bg-foreground text-background hover:bg-foreground/90 transition-colors duration-300">
                시작하기
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-16 pt-16 border-t border-border">
          <div className="space-y-3">
            <h3 className="text-xl font-light">空白</h3>
            <p className="text-muted-foreground leading-relaxed font-light">
              인터페이스는 공백을 부재가 아닌 가능성의 공간으로 받아들입니다.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-light">再認識</h3>
            <p className="text-muted-foreground leading-relaxed font-light">
              능동적 타이핑을 통해 익숙한 텍스트가 낯설게 되고, 이를 통해 콘텐츠와 더 깊은 연결이 형성됩니다.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-light">無印</h3>
            <p className="text-muted-foreground leading-relaxed font-light">
              디자인은 불필요한 요소를 제거하여 타이핑이라는 본질적 행위에 집중할 수 있는 공간을 창조합니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
