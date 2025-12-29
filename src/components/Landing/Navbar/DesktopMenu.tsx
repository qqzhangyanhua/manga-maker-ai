"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DesktopMenuProps } from "./types";
import { solutionsMenuItems, workspaceMenuItems } from "./menu-data";

export function DesktopMenu({
  activeDropdown,
  userRole,
  onDropdownEnter,
  onDropdownLeave,
}: DesktopMenuProps) {
  return (
    <nav className="hidden lg:flex items-center gap-1">
      {/* 解决方案下拉菜单 */}
      <div
        className="relative"
        onMouseEnter={() => onDropdownEnter("solutions")}
        onMouseLeave={onDropdownLeave}
      >
        <button
          className={cn(
            "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
            activeDropdown === "solutions"
              ? "text-orange-500"
              : "text-zinc-400 hover:text-white"
          )}
        >
          解决方案
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              activeDropdown === "solutions" && "rotate-180"
            )}
          />
        </button>

        {/* 解决方案菜单 */}
        <div
          className={cn(
            "absolute top-full left-0 pt-2 transition-all duration-200",
            activeDropdown === "solutions"
              ? "opacity-100 visible translate-y-0"
              : "opacity-0 invisible -translate-y-2"
          )}
        >
          <div className="w-[280px] bg-[#0a0a0a] border border-zinc-800 p-2">
            {solutionsMenuItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="flex items-center gap-3 p-3 hover:bg-zinc-900 transition-colors group"
              >
                <div className="p-2 bg-zinc-900 group-hover:bg-orange-500/10 text-zinc-500 group-hover:text-orange-500 transition-colors">
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-orange-500 transition-colors">
                    {item.title}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 工作台下拉菜单 */}
      <div
        className="relative"
        onMouseEnter={() => onDropdownEnter("workspace")}
        onMouseLeave={onDropdownLeave}
      >
        <button
          className={cn(
            "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
            activeDropdown === "workspace"
              ? "text-orange-500"
              : "text-zinc-400 hover:text-white"
          )}
        >
          工作台
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              activeDropdown === "workspace" && "rotate-180"
            )}
          />
        </button>

        {/* 工作台 Mega Menu */}
        <div
          className={cn(
            "absolute top-full left-0 pt-2 transition-all duration-200",
            activeDropdown === "workspace"
              ? "opacity-100 visible translate-y-0"
              : "opacity-0 invisible -translate-y-2"
          )}
        >
          <div className="w-[480px] bg-[#0a0a0a] border border-zinc-800 p-4">
            <div className="text-[10px] font-mono text-zinc-600 mb-3 px-2">
              工作区快速入口
            </div>

            <div className="space-y-3">
              {workspaceMenuItems
                .filter((category) => !category.adminOnly || userRole === "admin")
                .map((category) => (
                <div key={category.category}>
                  {/* Category Header */}
                  <div className="px-2 py-1 text-xs font-mono text-orange-500 uppercase tracking-wider">
                    {category.category}
                  </div>

                  {/* Category Items */}
                  <div className="grid grid-cols-2 gap-1">
                    {category.items.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="flex items-start gap-3 p-3 hover:bg-zinc-900 transition-colors group"
                      >
                        <div className="p-2 bg-zinc-900 group-hover:bg-orange-500/10 text-zinc-500 group-hover:text-orange-500 transition-colors">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white group-hover:text-orange-500 transition-colors">
                            {item.title}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
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
      </div>

      {/* 画廊链接 */}
      <Link
        href="/gallery"
        className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
      >
        画廊
      </Link>

      {/* 价格链接 */}
      <Link
        href="/pricing"
        className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
      >
        价格
      </Link>
    </nav>
  );
}
