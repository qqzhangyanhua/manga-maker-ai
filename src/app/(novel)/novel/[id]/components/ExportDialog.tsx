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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Download, FileText, FileType, File, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { novelTheme } from "../../theme";

interface ExportDialogProps {
  projectId: string
  projectTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ExportFormat = "txt" | "markdown" | "epub" | "docx" | "pdf"

interface ExportConfig {
  include_metadata: boolean
  chapter_separator: boolean
  font_size: number
}

const FORMAT_OPTIONS = [
  {
    value: "txt" as const,
    label: "纯文本 (TXT)",
    description: "适合上传到网文平台",
    icon: FileText,
  },
  {
    value: "markdown" as const,
    label: "Markdown (MD)",
    description: "适合二次编辑和版本控制",
    icon: FileText,
  },
  {
    value: "epub" as const,
    label: "电子书 (EPUB)",
    description: "适合电子阅读器和移动设备",
    icon: File,
  },
  {
    value: "docx" as const,
    label: "Word 文档 (DOCX)",
    description: "适合投稿和编辑",
    icon: FileType,
  },
  {
    value: "pdf" as const,
    label: "PDF 文档",
    description: "适合阅读和分享",
    icon: File,
  },
]

export function ExportDialog({
  projectId,
  projectTitle,
  open,
  onOpenChange,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("txt")
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [chapterSeparator, setChapterSeparator] = useState(true)
  const [fontSize, setFontSize] = useState(12)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const selectedFormat = FORMAT_OPTIONS.find((f) => f.value === format)

  const handleExport = async () => {
    setExporting(true)
    setProgress(0)

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      // 构建导出配置
      const config: ExportConfig = {
        include_metadata: includeMetadata,
        chapter_separator: chapterSeparator,
        font_size: fontSize,
      }

      // 调用导出 API
      const response = await fetch(`/api/novel/export/projects/${projectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format,
          config,
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.detail || "导出失败")
      }

      // 获取文件
      const blob = await response.blob()
      setProgress(100)

      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${projectTitle}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`导出成功！文件已下载：${projectTitle}.${format}`)

      // 延迟关闭对话框
      setTimeout(() => {
        onOpenChange(false)
        setProgress(0)
      }, 1000)
    } catch (error) {
      console.error("Export error:", error)
      toast.error(error instanceof Error ? error.message : "导出失败，请重试")
      setProgress(0)
    } finally {
      setExporting(false)
    }
  }

  const handleReset = () => {
    setFormat("txt")
    setIncludeMetadata(true)
    setChapterSeparator(true)
    setFontSize(12)
    setProgress(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900/95 border-purple-500/20 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            导出小说
          </DialogTitle>
          <DialogDescription>
            选择导出格式和配置选项，将小说导出为文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 格式选择 */}
          <div className="space-y-2">
            <Label htmlFor="format">导出格式</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              disabled={exporting}
            >
              <SelectTrigger id="format">
                <SelectValue placeholder="选择导出格式" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {selectedFormat && (
              <p className="text-sm text-muted-foreground">
                {selectedFormat.description}
              </p>
            )}
          </div>

          {/* 配置选项 */}
          <div className="space-y-4">
            <Label>导出选项</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="metadata"
                checked={includeMetadata}
                onCheckedChange={(checked) =>
                  setIncludeMetadata(checked as boolean)
                }
                disabled={exporting}
              />
              <label
                htmlFor="metadata"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                包含元数据
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              包含标题、作者、简介等信息
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="separator"
                checked={chapterSeparator}
                onCheckedChange={(checked) =>
                  setChapterSeparator(checked as boolean)
                }
                disabled={exporting}
              />
              <label
                htmlFor="separator"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                章节分隔
              </label>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              在章节之间添加分隔符或分页
            </p>

            {format === "pdf" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fontSize">字体大小</Label>
                  <Select
                    value={fontSize.toString()}
                    onValueChange={(value) => setFontSize(parseInt(value))}
                    disabled={exporting}
                  >
                    <SelectTrigger id="fontSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10pt（小）</SelectItem>
                      <SelectItem value="12">12pt（标准）</SelectItem>
                      <SelectItem value="14">14pt（大）</SelectItem>
                      <SelectItem value="16">16pt（超大）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* 进度条 */}
          {exporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">导出进度</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={exporting}
          >
            重置
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            取消
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                开始导出
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
