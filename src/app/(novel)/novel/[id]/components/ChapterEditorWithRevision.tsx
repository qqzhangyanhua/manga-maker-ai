"use client"

/**
 * 章节编辑器（集成内容修订功能）
 * 
 * 功能：
 * 1. 文本编辑
 * 2. 选中文本触发修订
 * 3. 右键菜单集成
 * 4. 快捷键支持 (Ctrl/⌘ + R)
 */

import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RevisionDialog } from "./RevisionDialog"
import { Sparkles, Save } from "lucide-react"
import { toast } from "sonner"

interface ChapterEditorWithRevisionProps {
  chapterId: string
  initialContent: string
  onSave: (content: string) => Promise<void>
}

export function ChapterEditorWithRevision({
  chapterId,
  initialContent,
  onSave,
}: ChapterEditorWithRevisionProps) {
  const [content, setContent] = useState(initialContent)
  const [selectedText, setSelectedText] = useState("")
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  // 监听文本选择
  const handleTextSelect = () => {
    if (!editorRef.current) return

    const textarea = editorRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = content.substring(start, end).trim()

    if (text && text.length > 0) {
      setSelectedText(text)
      setSelectionStart(start)
      setSelectionEnd(end)
    }
  }

  // 右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    if (selectedText) {
      e.preventDefault()
      setRevisionDialogOpen(true)
    }
  }

  // 快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/⌘ + R 触发修订
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault()
        if (selectedText) {
          setRevisionDialogOpen(true)
        } else {
          toast.info("请先选中要修订的文本")
        }
      }

      // Ctrl/⌘ + S 保存
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedText, content])

  // 接受修订
  const handleAcceptRevision = (revisedText: string) => {
    if (!editorRef.current) return

    // 替换选中的文本
    const newContent =
      content.substring(0, selectionStart) +
      revisedText +
      content.substring(selectionEnd)

    setContent(newContent)
    setSelectedText("")
    toast.success("修订已应用")
  }

  // 保存内容
  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(content)
      toast.success("保存成功")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("保存失败，请重试")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {selectedText && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRevisionDialogOpen(true)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              AI 修订
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>R
              </kbd>
            </Button>
          )}
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <span className="animate-spin">⏳</span>
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              保存
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>S
              </kbd>
            </>
          )}
        </Button>
      </div>

      {/* 编辑器 */}
      <div className="relative">
        <Textarea
          ref={editorRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onSelect={handleTextSelect}
          onContextMenu={handleContextMenu}
          className="min-h-[500px] font-mono text-sm"
          placeholder="开始编写章节内容..."
        />

        {/* 提示文本 */}
        {!selectedText && (
          <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
            选中文本后右键或按 ⌘R 进行 AI 修订
          </div>
        )}
      </div>

      {/* 修订对话框 */}
      <RevisionDialog
        chapterId={chapterId}
        selectedText={selectedText}
        open={revisionDialogOpen}
        onOpenChange={setRevisionDialogOpen}
        onAccept={handleAcceptRevision}
      />
    </div>
  )
}
