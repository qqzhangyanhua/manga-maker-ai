"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Search,
  Settings,
  ChevronDown,
  Zap,
  BookOpen,
  Users,
  Building2,
  Sparkles,
  FolderOpen,
  Image,
  UserCircle,
  MapPin,
  Shield,
  BarChart3,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";

interface NavbarProps {
  className?: string;
}

// 解决方案菜单项
const solutionsMenuItems = [
  {
    icon: Users,
    title: "面向创作者",
    description: "独立漫画艺术家",
    href: "/creators",
  },
  {
    icon: Building2,
    title: "面向工作室",
    description: "制作团队",
    href: "/studios",
  },
  {
    icon: BookOpen,
    title: "面向出版社",
    description: "漫画出版商",
    href: "/publishers",
  },
];

// 工作台菜单项
const workspaceMenuItems = [
  {
    category: "创作中心",
    items: [
      {
        icon: Sparkles,
        title: "创作新故事",
        description: "从零开始创作漫画",
        href: "/story",
      },
      {
        icon: FileCode,
        title: "剧本管理",
        description: "查看和编辑剧本",
        href: "/scripts",
      },
    ],
  },
  {
    category: "项目管理",
    items: [
      {
        icon: FolderOpen,
        title: "分镜项目",
        description: "管理所有分镜项目",
        href: "/projects",
      },
      {
        icon: Image,
        title: "生成图库",
        description: "浏览生成的图片",
        href: "/generated",
      },
    ],
  },
  {
    category: "资产库",
    items: [
      {
        icon: UserCircle,
        title: "角色库",
        description: "管理角色素材",
        href: "/assets?tab=characters",
      },
      {
        icon: MapPin,
        title: "场景库",
        description: "管理场景素材",
        href: "/assets?tab=scenes",
      },
    ],
  },
  {
    category: "管理中心",
    adminOnly: true,
    items: [
      {
        icon: Shield,
        title: "管理中心",
        description: "系统管理与配置",
        href: "/admin",
      },
    ],
  },
];

export function Navbar({ className }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user credits and role
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const result = await response.json();
        if (result.success && result.data.user) {
          setUserCredits(result.data.user.credits);
          setUserRole(result.data.user.role);
        }
      } catch (error) {
        // User not logged in or error, ignore
      }
    };
    fetchUserInfo();
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const handleDropdownEnter = (name: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(name);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  // Handle Command Palette keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          "border-b border-zinc-800",
          isScrolled
            ? "bg-[#09090b]/95 backdrop-blur-md"
            : "bg-[#09090b]/80 backdrop-blur-sm",
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Links */}
            <div className="flex items-center gap-8">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-orange-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <span className="font-bold text-white group-hover:text-orange-500 transition-colors">
                  COMICAI
                </span>
                <span className="text-[10px] font-mono text-zinc-600 hidden sm:block">
                  v2.1
                </span>
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden lg:flex items-center gap-1">
                {/* 解决方案下拉菜单 */}
                <div
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter("solutions")}
                  onMouseLeave={handleDropdownLeave}
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
                  onMouseEnter={() => handleDropdownEnter("workspace")}
                  onMouseLeave={handleDropdownLeave}
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
                  href="#pricing"
                  className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  价格
                </Link>
              </nav>
            </div>

            {/* Center: Command Palette Trigger */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <CommandPaletteTrigger onClick={() => setCommandPaletteOpen(true)} />
            </div>

            {/* Right: User Status Pill + Mobile Menu Button */}
            <div className="flex items-center gap-4">
              {/* User Status Pill - Desktop */}
              {userCredits !== null && (
                <div className="hidden lg:block">
                  <UserStatusPill credits={userCredits} />
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        userCredits={userCredits}
        userRole={userRole}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        userRole={userRole}
      />
    </>
  );
}

// Command Palette Trigger Component
interface CommandPaletteTriggerProps {
  onClick: () => void;
}

function CommandPaletteTrigger({ onClick }: CommandPaletteTriggerProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2",
        "bg-zinc-900/50 border border-zinc-800",
        "hover:border-zinc-700 hover:bg-zinc-900",
        "transition-colors group"
      )}
      onClick={onClick}
    >
      <Search className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400" />
      <span className="flex-1 text-left text-sm text-zinc-500 group-hover:text-zinc-400">
        搜索或输入命令...
      </span>
      <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

// User Status Pill Component
interface UserStatusPillProps {
  credits: number;
  avatarUrl?: string;
}

function UserStatusPill({ credits, avatarUrl }: UserStatusPillProps) {
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
    </div>
  );
}

// Mobile Menu Component
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: number | null;
  userRole: string | null;
  onOpenCommandPalette: () => void;
}

function MobileMenu({ isOpen, onClose, userCredits, userRole, onOpenCommandPalette }: MobileMenuProps) {
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
          "absolute top-16 left-0 right-0 bottom-0 bg-[#09090b] border-t border-zinc-800",
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
              <UserStatusPill credits={userCredits} />
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
              href="#pricing"
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
