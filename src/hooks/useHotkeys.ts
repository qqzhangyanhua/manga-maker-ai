/**
 * 快捷键 Hook
 * 支持跨平台快捷键（Mac/Windows/Linux）
 */
import { useEffect, useCallback, useRef } from "react"

interface HotkeyOptions {
  enabled?: boolean
  preventDefault?: boolean
  enableOnFormTags?: boolean
  enableOnContentEditable?: boolean
}

/**
 * 使用快捷键
 * 
 * @param keys - 快捷键字符串，如 "mod+s", "ctrl+shift+k", "delete"
 * @param callback - 快捷键触发时的回调函数
 * @param options - 配置选项
 * 
 * @example
 * // 保存快捷键（Mac: ⌘S, Windows: Ctrl+S）
 * useHotkeys('mod+s', handleSave)
 * 
 * // 搜索快捷键
 * useHotkeys('mod+k', () => setSearchOpen(true))
 * 
 * // 删除快捷键（不在表单中触发）
 * useHotkeys('delete', handleDelete, { enableOnFormTags: false })
 */
export function useHotkeys(
  keys: string,
  callback: (event: KeyboardEvent) => void,
  options: HotkeyOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    enableOnFormTags = false,
    enableOnContentEditable = false,
  } = options

  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 检查是否在表单元素中
      if (!enableOnFormTags) {
        const target = event.target as HTMLElement
        const tagName = target.tagName
        if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName)) {
          return
        }
      }

      // 检查是否在可编辑元素中
      if (!enableOnContentEditable) {
        const target = event.target as HTMLElement
        if (target.isContentEditable) {
          return
        }
      }

      // 解析快捷键
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const parts = keys.toLowerCase().split("+").map((p) => p.trim())

      let needsCtrl = false
      let needsShift = false
      let needsAlt = false
      let needsMeta = false
      let key = ""

      for (const part of parts) {
        if (part === "ctrl" || part === "control") {
          needsCtrl = true
        } else if (part === "shift") {
          needsShift = true
        } else if (part === "alt" || part === "option") {
          needsAlt = true
        } else if (part === "meta" || part === "cmd" || part === "command") {
          needsMeta = true
        } else if (part === "mod") {
          // 'mod' 在 Mac 上是 Meta（⌘），在 Windows/Linux 上是 Ctrl
          if (isMac) {
            needsMeta = true
          } else {
            needsCtrl = true
          }
        } else {
          key = part
        }
      }

      // 检查修饰键
      if (needsCtrl && !event.ctrlKey) return
      if (needsShift && !event.shiftKey) return
      if (needsAlt && !event.altKey) return
      if (needsMeta && !event.metaKey) return

      // 检查按键
      const eventKey = event.key.toLowerCase()
      if (eventKey !== key) return

      // 执行回调
      if (preventDefault) {
        event.preventDefault()
      }
      callbackRef.current(event)
    },
    [
      keys,
      enableOnFormTags,
      enableOnContentEditable,
      preventDefault,
    ]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enabled, handleKeyDown])
}

/**
 * 获取快捷键显示文本
 * 
 * @param keys - 快捷键字符串
 * @returns 格式化的快捷键显示文本
 * 
 * @example
 * getHotkeyLabel('mod+s') // Mac: '⌘S', Windows: 'Ctrl+S'
 * getHotkeyLabel('ctrl+shift+k') // 'Ctrl+Shift+K'
 */
export function getHotkeyLabel(keys: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
  const parts = keys.split("+").map((p) => p.trim())

  return parts
    .map((part) => {
      const lower = part.toLowerCase()
      if (lower === "mod") {
        return isMac ? "⌘" : "Ctrl"
      } else if (lower === "ctrl" || lower === "control") {
        return "Ctrl"
      } else if (lower === "shift") {
        return "Shift"
      } else if (lower === "alt" || lower === "option") {
        return isMac ? "⌥" : "Alt"
      } else if (lower === "meta" || lower === "cmd" || lower === "command") {
        return "⌘"
      } else {
        return part.toUpperCase()
      }
    })
    .join(isMac ? "" : "+")
}
