"use client";

import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserStatusPillProps } from "./types";

export function UserStatusPill({ credits, avatarUrl, onLogout }: UserStatusPillProps) {
  const formattedCredits = credits.toLocaleString();

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1.5",
        "bg-zinc-900/50 border border-zinc-800",
        "hover:border-zinc-700 transition-colors"
      )}
    >
      {/* Avatar */}
      <div className="relative">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="User avatar"
            className="w-7 h-7 rounded-full border border-zinc-700"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <span className="text-xs font-bold text-black">U</span>
          </div>
        )}
        {/* Online indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#09090b]" />
      </div>

      {/* 算力显示 */}
      <div className="flex items-center gap-1 px-2 border-l border-zinc-800">
        <span className="text-sm font-mono font-bold text-emerald-500">
          {formattedCredits}
        </span>
        <span className="text-[10px] font-mono text-zinc-500">算力</span>
      </div>

      {/* 设置按钮 */}
      <Link href="/profile">
        <button
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </Link>

      {/* 退出登录按钮 */}
      <button
        onClick={onLogout}
        className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 transition-colors"
        aria-label="退出登录"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}
