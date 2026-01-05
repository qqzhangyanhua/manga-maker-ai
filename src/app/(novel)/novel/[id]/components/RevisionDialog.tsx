"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface RevisionDialogProps {
  chapterId: string
  selectedText: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAccept: (revisedText: string) => void
}

const PRESET_INSTRUCTIONS = [
  { value: "optimize", label: "优化语言", prompt: "请优化这段文字，使其更加生动流畅" },
  { value: "grammar", label: "修正语法", prompt: "请修正这段文字的语法错误" },
  { value: "style", label: "调整风格", prompt: "请调整这段文字的风格，使其更符合角色性格" },
  { value: "expand", label: "扩写", prompt: "请扩写这段文字，增加更多细节描写" },
  { value: "condense", label: "缩写", prompt: "请精简这段文字，保留核心内容" },
  { value: "dialogue", label: "改为对话", prompt: "请将这段文字改写为对话形式" },
  { value: "description", label: "改为描写", prompt: "请将这段文字改写为场景描写" },
]

export function RevisionDialog({
  chapterId,
  selectedText,
  open,
  onOpenChange,
  onAccept,
}: RevisionDialogProps) {
  const [instruction, setInstruction] = useState("")
  const [customInstruction, setCustomInstruction] = useState("")
  const [revisedText, setRevisedText] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRevise = async () => {
    setLoading(true)
    setRevisedText("")

    try {
      const finalInstruction =
        instruction === "custom"
          ? customInstruction
          : PRESET_INSTRUCTIONS.find((p) => p.value === instruction)?.prompt || ""

      if (!finalInstruction.trim()) {
        toast.error("请选择修订类型或输入自定义指令")
        setLoading(false)
        return
      }

      const response = await fetch(`/api/novel/chapters/${chapterId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_text: selectedText,
          instruction: finalInstruction,
        }),
      })

      if (!response.ok) {
        throw new Error("修订失败")
      }

      const data = await response.json()
      setRevisedText(data.revised_text || "")
      toast.success("修订完成！")
    } catch (error) {
      console.error("Revision error:", error)
      toast.error("修订失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    if (!revisedText) {
      toast.error("没有可接受的修订内容")
      return
    }
    onAccept(revisedText)
    onOpenChange(false)
    toast.success("已应用修订")
  }

  const handleReset = () => {
    setRevisedText("")
    setInstruction("")
    setCustomInstruction("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            AI 修订
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 原文 */}
          <div>
            <label className="text-sm font-medium">原文</label>
            <div className="mt-1 p-3 rounded-lg bg-muted text-sm max-h-[150px] overflow-y-auto">
              {selectedText}
            </div>
          </div>

          {/* 修订指令 */}
          <div>
            <label className="text-sm font-medium">修订类型</label>
            <Select value={instruction} onValueChange={setInstruction}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="选择修订类型" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_INSTRUCTIONS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">自定义指令</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 自定义指令 */}
          {instruction === "custom" && (
            <div>
              <label className="text-sm font-medium">自定义指令</label>
              <Textarea
                className="mt-1"
                placeholder="输入具体的修订要求..."
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* 修订结果 */}
          {revisedText && (
            <div>
              <label className="text-sm font-medium">修订后</label>
              <div className="mt-1 p-3 rounded-lg border text-sm bg-background max-h-[200px] overflow-y-auto">
                {revisedText}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <div>
              {revisedText && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  重新修订
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              {!revisedText ? (
                <Button onClick={handleRevise} disabled={loading || !instruction}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "修订中..." : "开始修订"}
                </Button>
              ) : (
                <Button onClick={handleAccept}>
                  接受修订
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
