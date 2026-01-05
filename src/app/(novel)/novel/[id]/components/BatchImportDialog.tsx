"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface BatchImportDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ParsedChapter {
  chapter_number: number
  title: string
  content_preview: string
  content_length: number
}

export function BatchImportDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: BatchImportDialogProps) {
  const [text, setText] = useState("")
  const [autoParse, setAutoParse] = useState(true)
  const [startNumber, setStartNumber] = useState(1)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewChapters, setPreviewChapters] = useState<ParsedChapter[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setText(content)
      toast.success(`文件已加载：${file.name}`)
    }
    reader.onerror = () => {
      toast.error("文件读取失败")
    }
    reader.readAsText(file)
  }

  const handlePreview = async () => {
    if (!text.trim()) {
      toast.error("请输入要导入的文本")
      return
    }

    setPreviewing(true)
    setShowPreview(false)

    try {
      const response = await fetch("/api/novel/batch/preview-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "预览失败")
      }

      const data = await response.json()
      setPreviewChapters(data.chapters || [])
      setShowPreview(true)
      toast.success(`识别到 ${data.total} 个章节`)
    } catch (error) {
      console.error("Preview error:", error)
      toast.error(error instanceof Error ? error.message : "预览失败")
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!text.trim()) {
      toast.error("请输入要导入的文本")
      return
    }

    setImporting(true)

    try {
      const response = await fetch("/api/novel/batch/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          text,
          auto_parse: autoParse,
          start_number: startNumber,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "导入失败")
      }

      const data = await response.json()
      toast.success(`成功导入 ${data.chapters_created} 个章节！`)
      
      // 重置状态
      setText("")
      setPreviewChapters([])
      setShowPreview(false)
      
      // 关闭对话框
      onOpenChange(false)
      
      // 触发成功回调
      onSuccess?.()
    } catch (error) {
      console.error("Import error:", error)
      toast.error(error instanceof Error ? error.message : "导入失败")
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setText("")
    setAutoParse(true)
    setStartNumber(1)
    setPreviewChapters([])
    setShowPreview(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            批量导入章节
          </DialogTitle>
          <DialogDescription>
            粘贴或上传文本文件，自动识别章节并批量导入
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 文本输入区 */}
          {!showPreview && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="text">文本内容</Label>
                  <div className="flex gap-2">
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer text-sm text-primary hover:underline"
                    >
                      <FileText className="w-4 h-4 inline mr-1" />
                      上传文件
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".txt,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                <Textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="粘贴文本内容，支持以下格式：&#10;&#10;第一章 标题&#10;内容...&#10;&#10;第二章 标题&#10;内容..."
                  className="min-h-[200px] font-mono text-sm"
                  disabled={importing || previewing}
                />
                <p className="text-xs text-muted-foreground">
                  支持格式：第X章、Chapter X、X. 等
                </p>
              </div>

              {/* 配置选项 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-parse"
                    checked={autoParse}
                    onCheckedChange={(checked) => setAutoParse(checked as boolean)}
                    disabled={importing || previewing}
                  />
                  <label
                    htmlFor="auto-parse"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    自动识别章节
                  </label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  自动识别章节分隔符并拆分章节
                </p>

                <div className="space-y-2">
                  <Label htmlFor="start-number">起始章节号</Label>
                  <Input
                    id="start-number"
                    type="number"
                    min={1}
                    value={startNumber}
                    onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                    disabled={importing || previewing}
                    className="w-32"
                  />
                </div>
              </div>
            </>
          )}

          {/* 预览区 */}
          {showPreview && previewChapters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>识别结果（共 {previewChapters.length} 章）</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  返回编辑
                </Button>
              </div>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-3">
                  {previewChapters.map((chapter, index) => (
                    <div
                      key={index}
                      className="rounded-lg border p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="font-medium">
                            第 {chapter.chapter_number} 章
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {chapter.content_length} 字
                        </span>
                      </div>
                      <p className="text-sm font-medium">{chapter.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {chapter.content_preview}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* 提示信息 */}
          {showPreview && previewChapters.length === 0 && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-yellow-50 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">
                未能识别到章节，请检查文本格式或关闭"自动识别章节"选项
              </p>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={importing || previewing}
          >
            重置
          </Button>
          {!showPreview && (
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!text.trim() || importing || previewing}
            >
              {previewing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  预览中...
                </>
              ) : (
                "预览"
              )}
            </Button>
          )}
          <Button
            onClick={handleImport}
            disabled={!text.trim() || importing || previewing}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                开始导入
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
