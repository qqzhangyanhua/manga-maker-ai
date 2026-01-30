/**
 * 会话过期界面
 */

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { novelTheme } from "../../../theme";
import { StageProps } from "../types";

export function SessionExpired({ dispatch }: StageProps) {
  const handleRestart = () => {
    dispatch({ type: "SET_SESSION", payload: null });
    dispatch({ type: "SET_STAGE", payload: "genre_select" });
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-amber-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">会话已过期</h3>
        <p className="text-sm text-zinc-400 mt-1">
          创作会话已超时（24小时），请重新开始
        </p>
      </div>
      <Button onClick={handleRestart} className={novelTheme.button.primary}>
        <RefreshCw className="mr-2 h-4 w-4" />
        重新开始
      </Button>
    </div>
  );
}
