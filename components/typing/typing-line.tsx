"use client"

import type React from "react"
import { cn } from "@/lib/utils"

interface TypingLineProps {
  line: string
  typedText: string
  isCurrentLine: boolean
  isPastLine: boolean
  isFutureLine: boolean
  isComposing: boolean
}

/**
 * 타이핑 줄 컴포넌트 - 현재 타이핑 중인 줄을 표시하고 타이핑 진행 상황을 시각화합니다.
 */
export const TypingLine: React.FC<TypingLineProps> = ({
  line,
  typedText,
  isCurrentLine,
  isPastLine,
  isFutureLine,
  isComposing,
}) => {
  // 현재 줄의 각 문자를 렌더링하는 함수
  const renderCharacters = () => {
    // 줄이 비어있으면 빈 배열 반환
    if (!line) return [];

    return line.split("").map((char: string, index: number) => {
      // 타이핑된 문자인지 여부
      const isTyped = index < typedText.length;
      // 현재 타이핑 중인 문자인지 여부
      const isCurrent = index === typedText.length;
      // 타이핑이 올바른지 여부
      const isCorrect = isTyped && typedText[index] === char;
      // 타이핑이 잘못되었는지 여부
      const isIncorrect = isTyped && typedText[index] !== char;

      // 클래스 이름 생성
      const charClass = cn(
        "inline-block",
        // 기본 스타일
        {
          // 정확하게 타이핑된 문자
          "text-green-600 dark:text-green-400": isCorrect,
          // 잘못 타이핑된 문자
          "text-red-600 dark:text-red-400": isIncorrect,
          // 현재 타이핑 중인 문자 (커서 표시)
          "border-b-2 border-primary animate-pulse": isCurrent && isCurrentLine && !isComposing,
          // 한글 입력 중일 때는 표시 안 함
          "border-b-2 border-primary": isCurrent && isCurrentLine && isComposing,
          // 아직 타이핑하지 않은 문자
          "text-foreground/70": !isTyped && !isCurrent,
          // 이전 줄의 문자
          "opacity-60": isPastLine,
          // 미래 줄의 문자
          "opacity-40": isFutureLine,
        }
      );

      // 공백 문자 처리
      if (char === " ") {
        return (
          <span key={index} className={charClass} aria-hidden="true">
            &nbsp;
          </span>
        );
      }

      return (
        <span key={index} className={charClass}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className={cn(
      "font-mono text-xl md:text-2xl leading-relaxed tracking-wide",
      {
        "font-bold": isCurrentLine,
        "opacity-70": isPastLine,
        "opacity-50": isFutureLine,
      }
    )}>
      {renderCharacters()}
    </div>
  );
};

