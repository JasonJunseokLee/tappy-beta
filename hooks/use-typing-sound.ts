"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useTypingSettings } from "@/contexts/typing-settings-context"

// 소리 종류 정의
const SOUND_TYPES = {
  NORMAL: "normal", // 일반 타이핑
  SPACE: "space", // 스페이스바
  RETURN: "return", // 엔터/줄바꿈
  ERROR: "error", // 오류
  COMPLETE: "complete", // 줄 완성
}

// 볼륨 설정
const VOLUME_LEVELS = {
  NORMAL: 0.2,
  SPACE: 0.18,
  RETURN: 0.22,
  ERROR: 0.15,
  COMPLETE: 0.25,
}

// 실제 타건음 생성을 위한 유틸리티 함수
function createKeyClickSound(
  ctx: AudioContext,
  options: {
    volume: number
    pitch: number
    sharpness: number
    resonance: number
    duration: number
  },
) {
  const { volume, pitch, sharpness, resonance, duration } = options
  const now = ctx.currentTime

  // 클릭 노이즈 생성 (타건음의 핵심)
  const clickLength = duration
  const bufferSize = ctx.sampleRate * clickLength
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  // 날카로운 클릭 노이즈 생성
  for (let i = 0; i < bufferSize; i++) {
    const t = i / ctx.sampleRate
    // 초기 타격음 (날카로운 부분)
    if (t < 0.005 * sharpness) {
      data[i] = (Math.random() * 2 - 1) * (1 - t / (0.005 * sharpness)) * 0.6
    }
    // 감쇠 부분 (공명)
    else {
      data[i] = (Math.random() * 2 - 1) * 0.15 * Math.exp(-resonance * t)
    }
  }

  const clickSource = ctx.createBufferSource()
  clickSource.buffer = buffer

  // 필터 추가 (키보드 타입에 따라 소리 특성 조정)
  const filter = ctx.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.value = pitch
  filter.Q.value = 1.0

  // 게인 노드로 볼륨 조절
  const gainNode = ctx.createGain()
  gainNode.gain.value = volume

  // 연결 및 재생
  clickSource.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(ctx.destination)
  clickSource.start(now)

  return { clickSource, gainNode, startTime: now }
}

// 소리 테마 설정
const SOUND_THEMES = {
  // 기본 테마 - 일반적인 키보드 타건음
  default: {
    name: "기본 타건음",
    description: "일반적인 키보드 타건음",
    createSound: (ctx: AudioContext, type: string, volume: number) => {
      const now = ctx.currentTime

      switch (type) {
        case SOUND_TYPES.NORMAL:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.NORMAL * volume,
            pitch: 2000 + Math.random() * 500,
            sharpness: 1.0,
            resonance: 40,
            duration: 0.08,
          })

        case SOUND_TYPES.SPACE:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.SPACE * volume,
            pitch: 1500,
            sharpness: 0.8,
            resonance: 35,
            duration: 0.1,
          })

        case SOUND_TYPES.RETURN:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.RETURN * volume,
            pitch: 1800,
            sharpness: 1.2,
            resonance: 30,
            duration: 0.12,
          })

        case SOUND_TYPES.ERROR:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.ERROR * volume,
            pitch: 1200,
            sharpness: 1.5,
            resonance: 50,
            duration: 0.1,
          })

        case SOUND_TYPES.COMPLETE:
          // 줄 완성 소리는 약간 다르게 처리
          const sound = createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.COMPLETE * volume * 0.7,
            pitch: 2200,
            sharpness: 1.0,
            resonance: 25,
            duration: 0.15,
          })

          // 추가 완료음 (약간 높은 음)
          setTimeout(() => {
            createKeyClickSound(ctx, {
              volume: VOLUME_LEVELS.COMPLETE * volume,
              pitch: 2600,
              sharpness: 0.9,
              resonance: 20,
              duration: 0.12,
            })
          }, 100)

          return sound
      }
    },
  },

  // 기계식 키보드 테마 - 딸깍거리는 기계식 키보드 소리
  mechanical: {
    name: "기계식 키보드",
    description: "딸깍거리는 기계식 키보드 소리",
    createSound: (ctx: AudioContext, type: string, volume: number) => {
      const now = ctx.currentTime

      switch (type) {
        case SOUND_TYPES.NORMAL:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.NORMAL * volume * 1.1,
            pitch: 2500 + Math.random() * 500,
            sharpness: 1.5,
            resonance: 60,
            duration: 0.06,
          })

        case SOUND_TYPES.SPACE:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.SPACE * volume * 1.2,
            pitch: 2000,
            sharpness: 1.3,
            resonance: 50,
            duration: 0.08,
          })

        case SOUND_TYPES.RETURN:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.RETURN * volume * 1.2,
            pitch: 2200,
            sharpness: 1.6,
            resonance: 45,
            duration: 0.1,
          })

        case SOUND_TYPES.ERROR:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.ERROR * volume,
            pitch: 1500,
            sharpness: 1.8,
            resonance: 70,
            duration: 0.08,
          })

        case SOUND_TYPES.COMPLETE:
          // 줄 완성 소리는 약간 다르게 처리
          const sound = createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.COMPLETE * volume * 0.8,
            pitch: 2600,
            sharpness: 1.4,
            resonance: 40,
            duration: 0.12,
          })

          // 추가 완료음 (약간 높은 음)
          setTimeout(() => {
            createKeyClickSound(ctx, {
              volume: VOLUME_LEVELS.COMPLETE * volume * 1.1,
              pitch: 3000,
              sharpness: 1.2,
              resonance: 35,
              duration: 0.1,
            })
          }, 80)

          return sound
      }
    },
  },

  // 멤브레인 키보드 테마 - 부드러운 멤브레인 키보드 소리
  membrane: {
    name: "멤브레인 키보드",
    description: "부드러운 멤브레인 키보드 소리",
    createSound: (ctx: AudioContext, type: string, volume: number) => {
      const now = ctx.currentTime

      switch (type) {
        case SOUND_TYPES.NORMAL:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.NORMAL * volume * 0.8,
            pitch: 1800 + Math.random() * 300,
            sharpness: 0.7,
            resonance: 50,
            duration: 0.1,
          })

        case SOUND_TYPES.SPACE:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.SPACE * volume * 0.8,
            pitch: 1500,
            sharpness: 0.6,
            resonance: 45,
            duration: 0.12,
          })

        case SOUND_TYPES.RETURN:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.RETURN * volume * 0.8,
            pitch: 1700,
            sharpness: 0.8,
            resonance: 40,
            duration: 0.14,
          })

        case SOUND_TYPES.ERROR:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.ERROR * volume * 0.7,
            pitch: 1200,
            sharpness: 1.0,
            resonance: 60,
            duration: 0.1,
          })

        case SOUND_TYPES.COMPLETE:
          // 줄 완성 소리는 약간 다르게 처리
          const sound = createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.COMPLETE * volume * 0.7,
            pitch: 2000,
            sharpness: 0.7,
            resonance: 35,
            duration: 0.15,
          })

          // 추가 완료음 (약간 높은 음)
          setTimeout(() => {
            createKeyClickSound(ctx, {
              volume: VOLUME_LEVELS.COMPLETE * volume * 0.8,
              pitch: 2400,
              sharpness: 0.6,
              resonance: 30,
              duration: 0.14,
            })
          }, 120)

          return sound
      }
    },
  },

  // 타자기 테마 - 클래식한 타자기 소리
  typewriter: {
    name: "타자기",
    description: "클래식한 타자기 소리",
    createSound: (ctx: AudioContext, type: string, volume: number) => {
      const now = ctx.currentTime

      switch (type) {
        case SOUND_TYPES.NORMAL:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.NORMAL * volume * 1.2,
            pitch: 3000 + Math.random() * 500,
            sharpness: 2.0,
            resonance: 80,
            duration: 0.07,
          })

        case SOUND_TYPES.SPACE:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.SPACE * volume * 1.3,
            pitch: 2500,
            sharpness: 1.8,
            resonance: 70,
            duration: 0.09,
          })

        case SOUND_TYPES.RETURN:
          // 타자기 리턴 소리 - 두 부분으로 구성
          const sound = createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.RETURN * volume * 1.3,
            pitch: 2800,
            sharpness: 2.2,
            resonance: 65,
            duration: 0.08,
          })

          // 두 번째 부분 - 종이 이동 소리
          setTimeout(() => {
            createKeyClickSound(ctx, {
              volume: VOLUME_LEVELS.RETURN * volume * 0.9,
              pitch: 1500,
              sharpness: 1.0,
              resonance: 30,
              duration: 0.2,
            })
          }, 100)

          return sound

        case SOUND_TYPES.ERROR:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.ERROR * volume * 1.1,
            pitch: 2000,
            sharpness: 2.5,
            resonance: 90,
            duration: 0.08,
          })

        case SOUND_TYPES.COMPLETE:
          // 타자기 종이 빼는 소리
          const completeSound = createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.COMPLETE * volume * 0.9,
            pitch: 2200,
            sharpness: 1.5,
            resonance: 50,
            duration: 0.15,
          })

          // 종이 빼는 소리 추가
          setTimeout(() => {
            createKeyClickSound(ctx, {
              volume: VOLUME_LEVELS.COMPLETE * volume * 1.1,
              pitch: 2600,
              sharpness: 1.3,
              resonance: 40,
              duration: 0.2,
            })
          }, 150)

          return completeSound
      }
    },
  },

  // 노트북 키보드 테마 - 얇은 노트북 키보드 소리
  laptop: {
    name: "노트북 키보드",
    description: "얇은 노트북 키보드 소리",
    createSound: (ctx: AudioContext, type: string, volume: number) => {
      const now = ctx.currentTime

      switch (type) {
        case SOUND_TYPES.NORMAL:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.NORMAL * volume * 0.7,
            pitch: 2200 + Math.random() * 300,
            sharpness: 0.9,
            resonance: 70,
            duration: 0.06,
          })

        case SOUND_TYPES.SPACE:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.SPACE * volume * 0.7,
            pitch: 1900,
            sharpness: 0.8,
            resonance: 65,
            duration: 0.08,
          })

        case SOUND_TYPES.RETURN:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.RETURN * volume * 0.7,
            pitch: 2100,
            sharpness: 1.0,
            resonance: 60,
            duration: 0.09,
          })

        case SOUND_TYPES.ERROR:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.ERROR * volume * 0.6,
            pitch: 1600,
            sharpness: 1.2,
            resonance: 80,
            duration: 0.07,
          })

        case SOUND_TYPES.COMPLETE:
          // 줄 완성 소리
          const sound = createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.COMPLETE * volume * 0.6,
            pitch: 2400,
            sharpness: 0.9,
            resonance: 55,
            duration: 0.1,
          })

          // 추가 완료음
          setTimeout(() => {
            createKeyClickSound(ctx, {
              volume: VOLUME_LEVELS.COMPLETE * volume * 0.7,
              pitch: 2800,
              sharpness: 0.8,
              resonance: 50,
              duration: 0.09,
            })
          }, 100)

          return sound
      }
    },
  },

  // 조용한 타건음 테마
  quiet: {
    name: "조용한 타건음",
    description: "부드럽고 조용한 타건음",
    createSound: (ctx: AudioContext, type: string, volume: number) => {
      const now = ctx.currentTime

      switch (type) {
        case SOUND_TYPES.NORMAL:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.NORMAL * volume * 0.5,
            pitch: 1800 + Math.random() * 200,
            sharpness: 0.6,
            resonance: 60,
            duration: 0.07,
          })

        case SOUND_TYPES.SPACE:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.SPACE * volume * 0.5,
            pitch: 1600,
            sharpness: 0.5,
            resonance: 55,
            duration: 0.09,
          })

        case SOUND_TYPES.RETURN:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.RETURN * volume * 0.5,
            pitch: 1700,
            sharpness: 0.7,
            resonance: 50,
            duration: 0.1,
          })

        case SOUND_TYPES.ERROR:
          return createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.ERROR * volume * 0.4,
            pitch: 1400,
            sharpness: 0.8,
            resonance: 70,
            duration: 0.08,
          })

        case SOUND_TYPES.COMPLETE:
          // 줄 완성 소리
          const sound = createKeyClickSound(ctx, {
            volume: VOLUME_LEVELS.COMPLETE * volume * 0.4,
            pitch: 2000,
            sharpness: 0.6,
            resonance: 45,
            duration: 0.12,
          })

          // 추가 완료음
          setTimeout(() => {
            createKeyClickSound(ctx, {
              volume: VOLUME_LEVELS.COMPLETE * volume * 0.5,
              pitch: 2300,
              sharpness: 0.5,
              resonance: 40,
              duration: 0.11,
            })
          }, 120)

          return sound
      }
    },
  },
}

export function useTypingSound() {
  const { settings } = useTypingSettings()
  const [isLoaded, setIsLoaded] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastPlayedTimeRef = useRef<Record<string, number>>({})
  const isPlayingRef = useRef<boolean>(false)

  // 오디오 컨텍스트 초기화
  useEffect(() => {
    if (!settings.soundEnabled) return

    // AudioContext 생성
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        setIsLoaded(true)
      } catch (error) {
        console.error("Web Audio API is not supported in this browser", error)
        return
      }
    }

    // 클린업 함수
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [settings.soundEnabled])

  // 소리 재생 함수
  const playSound = useCallback(
    (type: string = SOUND_TYPES.NORMAL) => {
      if (!settings.soundEnabled || !isLoaded || !audioContextRef.current) return

      // 너무 빠른 연속 재생 방지 (디바운싱)
      const now = Date.now()
      const lastPlayed = lastPlayedTimeRef.current[type] || 0
      if (now - lastPlayed < 10) return // 10ms 내에 같은 종류의 소리는 재생하지 않음

      lastPlayedTimeRef.current[type] = now

      // 현재 선택된 테마 가져오기
      const theme = SOUND_THEMES[settings.soundTheme || "default"]

      // 소리 생성 및 재생
      try {
        const sound = theme.createSound(audioContextRef.current, type, settings.soundVolume / 100)
        if (!sound) return

        isPlayingRef.current = true

        // 재생 완료 시 플래그 해제
        setTimeout(() => {
          isPlayingRef.current = false
        }, 500)
      } catch (error) {
        console.error("Error playing sound", error)
      }
    },
    [settings.soundEnabled, settings.soundTheme, settings.soundVolume, isLoaded],
  )

  // 키 입력에 따른 소리 재생 함수
  const playKeySound = useCallback(
    (key: string, isError = false) => {
      if (isError) {
        playSound(SOUND_TYPES.ERROR)
        return
      }

      // 키에 따라 다른 소리 재생
      switch (key) {
        case " ":
          playSound(SOUND_TYPES.SPACE)
          break
        case "Enter":
        case "Tab":
          playSound(SOUND_TYPES.RETURN)
          break
        default:
          playSound(SOUND_TYPES.NORMAL)
      }
    },
    [playSound],
  )

  // 줄 완성 소리 재생 함수
  const playLineCompleteSound = useCallback(() => {
    playSound(SOUND_TYPES.COMPLETE)
  }, [playSound])

  // 소리 테스트 함수
  const testSounds = useCallback(() => {
    const types = Object.values(SOUND_TYPES)
    let index = 0

    const playNext = () => {
      if (index < types.length) {
        playSound(types[index])
        index++
        setTimeout(playNext, 500)
      }
    }

    playNext()
  }, [playSound])

  // 사용 가능한 소리 테마 목록 반환
  const getAvailableSoundThemes = useCallback(() => {
    return Object.entries(SOUND_THEMES).map(([id, theme]) => ({
      id,
      name: theme.name,
      description: theme.description,
    }))
  }, [])

  return {
    playKeySound,
    playLineCompleteSound,
    testSounds,
    isLoaded,
    getAvailableSoundThemes,
  }
}

// 소리 타입 상수 내보내기
export const SoundType = SOUND_TYPES
