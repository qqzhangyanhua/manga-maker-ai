import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type ScriptSegment = {
  id: string;
  text: string;
  start: number;
  end: number;
};

type Script = {
  id: string;
  content: string;
  segments: ScriptSegment[];
} | null;

interface ScriptEditorPaneProps {
  script: Script;
  selectedSegmentId: string | null;
  onSegmentClick: (segmentId: string) => void;
  segmentRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

const ScriptEditorPane = ({
  script,
  selectedSegmentId,
  onSegmentClick,
  segmentRefs,
}: ScriptEditorPaneProps) => {
  if (!script) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground text-sm">
          此项目未保存剧本信息
        </p>
        <p className="text-muted-foreground/70 text-xs mt-2">
          从自由创作模式生成的项目不包含剧本分段
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="font-comic text-lg text-foreground">原始剧本</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          点击文本片段可高亮对应分镜
        </p>
      </div>

      {/* Script Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {script.segments && script.segments.length > 0 ? (
          <div className="space-y-3">
            {script.segments.map((segment) => (
              <div
                key={segment.id}
                ref={(el) => {
                  segmentRefs.current[segment.id] = el;
                }}
                onClick={() => onSegmentClick(segment.id)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer",
                  "hover:border-primary/50 hover:bg-primary/5",
                  selectedSegmentId === segment.id
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-background"
                )}
              >
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {segment.text}
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  字符位置: {segment.start} - {segment.end}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {script.content}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              （未分段的完整剧本）
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScriptEditorPane;
