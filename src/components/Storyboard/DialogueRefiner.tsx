import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";

interface DialogueRefinerProps {
  panels: {
    id: string;
    dialogue?: string;
    description: string;
  }[];
  onDialogueUpdate: (panelId: string, newDialogue: string) => void;
}

interface DialogueIssue {
  panelId: string;
  type: "too_long" | "too_short" | "ok";
  original: string;
  suggestion?: string;
  reason?: string;
}

const analyzeDialogue = (dialogue: string): { type: "too_long" | "too_short" | "ok"; suggestion?: string; reason?: string } => {
  if (!dialogue) return { type: "ok" };
  
  const length = dialogue.length;
  
  if (length > 50) {
    // Too long - suggest splitting or shortening
    const shortened = dialogue.substring(0, 30) + "...";
    return {
      type: "too_long",
      suggestion: dialogue.substring(0, 25),
      reason: `文字过长 (${length}字)，会遮挡画面。建议缩减或拆分成多个气泡。`,
    };
  }
  
  if (length < 3) {
    return {
      type: "too_short",
      reason: "对白过短，可能表达不完整。",
    };
  }
  
  return { type: "ok" };
};

const DialogueRefiner = ({ panels, onDialogueUpdate }: DialogueRefinerProps) => {
  const [issues, setIssues] = useState<DialogueIssue[]>([]);
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  useEffect(() => {
    const newIssues: DialogueIssue[] = [];
    panels.forEach((panel) => {
      if (panel.dialogue) {
        const analysis = analyzeDialogue(panel.dialogue);
        newIssues.push({
          panelId: panel.id,
          original: panel.dialogue,
          ...analysis,
        });
      }
    });
    setIssues(newIssues);
  }, [panels]);

  const issuesWithProblems = issues.filter((i) => i.type !== "ok");

  if (issuesWithProblems.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-comic-green/10 border border-comic-green/30 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-comic-green" />
        <div>
          <p className="font-semibold text-foreground">对白检查通过</p>
          <p className="text-sm text-muted-foreground">所有对白长度适中，不会遮挡画面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-comic-yellow" />
        <h4 className="text-sm font-semibold text-foreground">对白智能优化建议</h4>
        <span className="px-2 py-0.5 rounded-full bg-comic-yellow/20 text-comic-yellow text-xs">
          {issuesWithProblems.length} 个问题
        </span>
      </div>

      {issuesWithProblems.map((issue) => {
        const panel = panels.find((p) => p.id === issue.panelId);
        if (!panel) return null;

        return (
          <div
            key={issue.panelId}
            className={cn(
              "p-4 rounded-lg border-2 transition-all cursor-pointer",
              issue.type === "too_long"
                ? "bg-comic-orange/10 border-comic-orange/30"
                : "bg-comic-blue/10 border-comic-blue/30",
              expandedPanel === issue.panelId && "ring-2 ring-primary"
            )}
            onClick={() => setExpandedPanel(expandedPanel === issue.panelId ? null : issue.panelId)}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn(
                "w-5 h-5 mt-0.5",
                issue.type === "too_long" ? "text-comic-orange" : "text-comic-blue"
              )} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">分镜 {panels.indexOf(panel) + 1}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs",
                    issue.type === "too_long"
                      ? "bg-comic-orange/20 text-comic-orange"
                      : "bg-comic-blue/20 text-comic-blue"
                  )}>
                    {issue.type === "too_long" ? "对白过长" : "对白过短"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{issue.reason}</p>

                {expandedPanel === issue.panelId && (
                  <div className="mt-3 space-y-2">
                    <div className="p-2 rounded bg-background/50">
                      <p className="text-xs text-muted-foreground mb-1">原文:</p>
                      <p className="text-sm text-foreground line-through opacity-50">"{issue.original}"</p>
                    </div>
                    {issue.suggestion && (
                      <div className="p-2 rounded bg-comic-green/10 border border-comic-green/30">
                        <p className="text-xs text-comic-green mb-1">建议修改为:</p>
                        <p className="text-sm text-foreground">"{issue.suggestion}"</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDialogueUpdate(issue.panelId, issue.suggestion!);
                          }}
                          className="mt-2 px-3 py-1 rounded bg-comic-green text-background text-xs font-semibold hover:bg-comic-green/90"
                        >
                          应用建议
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DialogueRefiner;
