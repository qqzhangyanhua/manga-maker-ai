"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MobileMenuProps } from "./types";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import { UserStatusPill } from "./UserStatusPill";
import { solutionsMenuItems, workspaceMenuItems } from "./menu-data";

export function MobileMenu({
  isOpen,
  onClose,
  userCredits,
  userRole,
  onOpenCommandPalette,
  onLogout,
}: MobileMenuProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 lg:hidden transition-all duration-300",
        isOpen ? "visible" : "invisible"
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div
        className={cn(
          "absolute top-16 left-0 right-0 bottom-0 bg-background/95 backdrop-blur-xl border-t border-zinc-800",
          "overflow-y-auto transition-transform duration-300",
          isOpen ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className="p-4">
          {/* Command Palette - Mobile */}
          <div className="mb-6">
            <CommandPaletteTrigger onClick={onOpenCommandPalette} />
          </div>

          {/* 算力显示 - 移动端 */}
          {userCredits !== null && (
            <div className="mb-6 pb-6 border-b border-zinc-800">
              <div className="text-[10px] font-mono text-zinc-600 mb-2">
                账户状态
              </div>
              <UserStatusPill credits={userCredits} onLogout={onLogout} />
            </div>
          )}

          {/* 登录/注册按钮 - 移动端 */}
          {userCredits === null && (
            <div className="mb-6 pb-6 border-b border-zinc-800 flex flex-col gap-2">
              <Link href="/auth/login" onClick={onClose}>
                <Button variant="ghost" className="w-full text-zinc-400 hover:text-white">
                  登录
                </Button>
              </Link>
              <Link href="/auth/register" onClick={onClose}>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  注册
                </Button>
              </Link>
            </div>
          )}

          {/* 导航 */}
          <nav className="space-y-2">
            {/* 解决方案分类 */}
            <div className="border border-zinc-800">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() =>
                  setExpandedSection(
                    expandedSection === "solutions" ? null : "solutions"
                  )
                }
              >
                <span className="text-white font-medium">解决方案</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-zinc-500 transition-transform",
                    expandedSection === "solutions" && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  expandedSection === "solutions" ? "max-h-[300px]" : "max-h-0"
                )}
              >
                <div className="p-4 pt-0 space-y-1">
                  {solutionsMenuItems.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="flex items-center gap-3 p-3 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                      onClick={onClose}
                    >
                      <item.icon className="w-4 h-4 text-orange-500" />
                      <div>
                        <div className="text-sm text-white">{item.title}</div>
                        <div className="text-xs text-zinc-500">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* 工作台分类 */}
            <div className="border border-zinc-800">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() =>
                  setExpandedSection(
                    expandedSection === "workspace" ? null : "workspace"
                  )
                }
              >
                <span className="text-white font-medium">工作台</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-zinc-500 transition-transform",
                    expandedSection === "workspace" && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  expandedSection === "workspace" ? "max-h-[600px]" : "max-h-0"
                )}
              >
                <div className="p-4 pt-0 space-y-3">
                  {workspaceMenuItems
                    .filter((category) => !category.adminOnly || userRole === "admin")
                    .map((category) => (
                      <div key={category.category}>
                        {/* Category Header */}
                        <div className="px-2 py-1 text-xs font-mono text-orange-500 uppercase tracking-wider">
                          {category.category}
                        </div>
                        {/* Category Items */}
                        <div className="space-y-1">
                          {category.items.map((item) => (
                            <Link
                              key={item.title}
                              href={item.href}
                              className="flex items-center gap-3 p-3 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                              onClick={onClose}
                            >
                              <item.icon className="w-4 h-4 text-orange-500" />
                              <div>
                                <div className="text-sm text-white">{item.title}</div>
                                <div className="text-xs text-zinc-500">
                                  {item.description}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* 画廊链接 */}
            <Link
              href="/gallery"
              className="flex items-center justify-between p-4 border border-zinc-800 text-white font-medium hover:bg-zinc-900 transition-colors"
              onClick={onClose}
            >
              画廊
              <span className="text-xs font-mono text-zinc-500">
                探索作品
              </span>
            </Link>

            {/* 价格链接 */}
            <Link
              href="/pricing"
              className="flex items-center justify-between p-4 border border-zinc-800 text-white font-medium hover:bg-zinc-900 transition-colors"
              onClick={onClose}
            >
              价格
              <span className="text-xs font-mono text-zinc-500">
                查看方案
              </span>
            </Link>
          </nav>

          {/* 页脚 */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-600">
              <span>会话: 活跃</span>
              <span>节点: 华北-1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
