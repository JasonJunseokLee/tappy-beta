"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useTypingSettings } from "@/contexts/typing-settings-context"
import { useTypingSound } from "@/hooks/use-typing-sound"
import { Volume2, Keyboard } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings, resetSettings } = useTypingSettings()
  const { testSounds, getAvailableSoundThemes } = useTypingSound()

  // 사용 가능한 소리 테마 목록
  const soundThemes = getAvailableSoundThemes()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label htmlFor="font-size">글꼴 크기: {settings.fontSize}px</Label>
            <Slider
              id="font-size"
              min={12}
              max={28}
              step={1}
              value={[settings.fontSize]}
              onValueChange={(value) => updateSettings({ fontSize: value[0] })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="font-family">글꼴</Label>
            <Select value={settings.fontFamily} onValueChange={(value) => updateSettings({ fontFamily: value })}>
              <SelectTrigger id="font-family">
                <SelectValue placeholder="글꼴 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mono">고정폭 (Monospace)</SelectItem>
                <SelectItem value="sans">Sans-serif</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">테마</Label>
            <Select
              value={settings.theme}
              onValueChange={(value: "light" | "dark" | "system") => updateSettings({ theme: value })}
            >
              <SelectTrigger id="theme">
                <SelectValue placeholder="테마 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">라이트 모드</SelectItem>
                <SelectItem value="dark">다크 모드</SelectItem>
                <SelectItem value="system">시스템 설정</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="show-wpm">WPM 표시</Label>
            <Switch
              id="show-wpm"
              checked={settings.showWpm}
              onCheckedChange={(checked) => updateSettings({ showWpm: checked })}
            />
          </div>

          {/* 소리 설정 섹션 */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              소리 설정
            </h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="sound-enabled">타이핑 소리</Label>
              <Switch
                id="sound-enabled"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </div>

            {/* 소리 활성화 시 추가 설정 표시 */}
            {settings.soundEnabled && (
              <div className="space-y-4 ml-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sound-volume" className="text-sm">
                      볼륨: {settings.soundVolume}%
                    </Label>
                  </div>
                  <Slider
                    id="sound-volume"
                    min={0}
                    max={100}
                    step={5}
                    value={[settings.soundVolume || 50]}
                    onValueChange={(value) => updateSettings({ soundVolume: value[0] })}
                  />
                </div>

                {/* 소리 테마 선택 */}
                <div className="space-y-2">
                  <Label className="text-sm">소리 테마</Label>
                  <RadioGroup
                    value={settings.soundTheme || "default"}
                    onValueChange={(value) => updateSettings({ soundTheme: value as any })}
                    className="space-y-1"
                  >
                    {soundThemes.map((theme) => (
                      <div key={theme.id} className="flex items-start space-x-2">
                        <RadioGroupItem value={theme.id} id={`theme-${theme.id}`} />
                        <div className="grid gap-0.5">
                          <Label htmlFor={`theme-${theme.id}`} className="text-sm font-medium">
                            {theme.name}
                          </Label>
                          <p className="text-xs text-muted-foreground">{theme.description}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => testSounds()}>
                  소리 테스트
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="ignore-symbols">기호 무시</Label>
            <Switch
              id="ignore-symbols"
              checked={settings.ignoreSymbols}
              onCheckedChange={(checked) => updateSettings({ ignoreSymbols: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-advance">자동 줄 이동</Label>
            <Switch
              id="auto-advance"
              checked={settings.autoAdvance}
              onCheckedChange={(checked) => updateSettings({ autoAdvance: checked })}
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              키보드 단축키
            </h3>
            <div className="text-sm text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>저장</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Ctrl + S</kbd>
              </div>
              <div className="flex justify-between">
                <span>목차</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Ctrl + T</kbd>
              </div>
              <div className="flex justify-between">
                <span>설정</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Ctrl + ,</kbd>
              </div>
              <div className="flex justify-between">
                <span>다음 줄</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Tab</kbd>
              </div>
              <div className="flex justify-between">
                <span>이전 줄</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Shift + Tab</kbd>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={resetSettings}>
              기본값으로 재설정
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
