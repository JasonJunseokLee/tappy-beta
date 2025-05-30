"use client"

import { useEffect, RefObject } from "react"

/**
 * 지정된 요소 외부를 클릭했을 때 콜백 함수를 실행하는 훅
 * @param ref 참조할 요소
 * @param callback 외부 클릭 시 실행할 콜백 함수
 */
export function useClickAway(
  ref: RefObject<HTMLElement>,
  callback: () => void
): void {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [ref, callback])
}
