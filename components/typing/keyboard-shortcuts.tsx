export function KeyboardShortcuts() {
  return (
    <div className="mt-4 mb-8 text-center">
      <div className="inline-flex items-center space-x-4 text-xs text-muted-foreground bg-background/50 px-4 py-2 rounded-full">
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Tab</kbd> 다음 줄
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Shift+Tab</kbd> 이전 줄
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd> 줄 건너뛰기
        </span>
      </div>
    </div>
  )
}
