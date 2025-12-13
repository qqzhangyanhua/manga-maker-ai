"use client";

import { ArrowRight, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorkflowStep } from "./WorkflowStep";
import { WorkflowProgressBar } from "./WorkflowProgressBar";
import { useWorkflowProgress } from "./hooks/useWorkflowProgress";
import { WORKFLOW_STEPS } from "./types";

interface WorkflowGuideProps {
  className?: string;
}

export function WorkflowGuide({ className }: WorkflowGuideProps) {
  const { progress, loading } = useWorkflowProgress();

  // 确定当前步骤的跳转链接
  const getCurrentStepHref = () => {
    const currentConfig = WORKFLOW_STEPS.find(
      (s) => s.step === progress.currentStep
    );
    // 如果已有故事，跳转到故事详情页
    if (
      progress.currentStep === 2 &&
      progress.steps.story.storyId
    ) {
      return `/scripts/${progress.steps.story.storyId}`;
    }
    return currentConfig?.href || "/story";
  };

  const getStepStatus = (stepNumber: number) => {
    const isCompleted = stepNumber < progress.currentStep;
    const isActive = stepNumber === progress.currentStep;
    const isLocked = stepNumber > progress.currentStep + 1; // 只锁定超过下一步的
    return { isCompleted, isActive, isLocked };
  };

  return (
    <section className={className}>
      <div className="max-w-4xl mx-auto">
        <div className="comic-card p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 className="font-comic text-2xl md:text-3xl text-foreground mb-1">
                创作流程引导
              </h2>
              <p className="text-muted-foreground text-sm">
                按照步骤完成你的第一个漫画作品
              </p>
            </div>

            {!loading && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>预计 10 分钟完成 4 格漫画</span>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Progress Bar (Desktop) */}
              <div className="hidden md:block mb-10 px-8">
                <WorkflowProgressBar
                  currentStep={progress.currentStep}
                  totalSteps={4}
                />
              </div>

              {/* Steps Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                {WORKFLOW_STEPS.map((config) => {
                  const { isCompleted, isActive, isLocked } = getStepStatus(
                    config.step
                  );
                  return (
                    <WorkflowStep
                      key={config.step}
                      config={config}
                      progress={progress}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      isLocked={isLocked}
                    />
                  );
                })}
              </div>

              {/* Mobile Progress */}
              <div className="md:hidden mb-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>进度</span>
                  <span>{progress.currentStep - 1}/4 步已完成</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-primary transition-all duration-500"
                    style={{
                      width: `${((progress.currentStep - 1) / 4) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button variant="comic" size="lg" asChild className="w-full sm:w-auto">
                  <Link href={getCurrentStepHref()}>
                    {progress.currentStep === 1
                      ? "开始创作故事"
                      : `继续第 ${progress.currentStep} 步`}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>

                {progress.steps.story.storyTitle && (
                  <div className="text-sm text-muted-foreground">
                    当前项目：
                    <span className="text-foreground font-medium">
                      {progress.steps.story.storyTitle}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
