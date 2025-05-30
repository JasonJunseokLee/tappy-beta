interface TypingRhythmVisualizerProps {
  typingRhythm: number[]
}

export function TypingRhythmVisualizer({ typingRhythm }: TypingRhythmVisualizerProps) {
  if (typingRhythm.length < 2) return null

  // 간격 값을 정규화 (0-1 사이 값으로)
  const maxInterval = Math.min(1000, Math.max(...typingRhythm)) // 최대 1초까지만 고려
  const normalizedIntervals = typingRhythm.map((interval) => Math.min(1, interval / maxInterval))

  return (
    <div className="h-8 flex items-end space-x-1 mt-4 opacity-60">
      {normalizedIntervals.map((value, index) => (
        <div
          key={index}
          className="w-1 bg-foreground transition-all duration-300"
          style={{
            height: `${Math.max(4, (1 - value) * 32)}px`,
            opacity: index === normalizedIntervals.length - 1 ? 1 : 0.5 + (index / normalizedIntervals.length) * 0.5,
          }}
        />
      ))}
    </div>
  )
}
