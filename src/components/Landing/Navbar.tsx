"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Search,
  Settings,
  ChevronDown,
  Fingerprint,
  FileCode,
  LayoutGrid,
  Layers,
  Cpu,
  Zap,
  BookOpen,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  className?: string;
}

// Product Mega Menu Items
const productMenuItems = [
  {
    icon: Fingerprint,
    title: "Entity Persistence",
    description: "ID-locking for character consistency",
    href: "#features",
  },
  {
    icon: FileCode,
    title: "Script Parsing",
    description: "NLP-powered screenplay extraction",
    href: "#features",
  },
  {
    icon: LayoutGrid,
    title: "Auto-Layout",
    description: "Dynamic panel composition",
    href: "#features",
  },
  {
    icon: Layers,
    title: "PSD Export",
    description: "Full layer separation output",
    href: "#features",
  },
  {
    icon: Cpu,
    title: "Render Pipeline",
    description: "Parallel GPU acceleration",
    href: "#features",
  },
  {
    icon: Zap,
    title: "Real-time Preview",
    description: "Instant generation feedback",
    href: "#features",
  },
];

// Solutions Menu Items
const solutionsMenuItems = [
  {
    icon: Users,
    title: "For Creators",
    description: "Individual manga artists",
    href: "/creators",
  },
  {
    icon: Building2,
    title: "For Studios",
    description: "Production teams",
    href: "/studios",
  },
  {
    icon: BookOpen,
    title: "For Publishers",
    description: "Manga publishers",
    href: "/publishers",
  },
];

export function Navbar({ className }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
                {/* Product Dropdown */}
                <div
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter("product")}
                  onMouseLeave={handleDropdownLeave}
                >
                  <button
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors",
                      activeDropdown === "product"
                        ? "text-orange-500"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Product
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        activeDropdown === "product" && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Mega Menu */}
                  <div
                    className={cn(
                      "absolute top-full left-0 pt-2 transition-all duration-200",
                      activeDropdown === "product"
                        ? "opacity-100 visible translate-y-0"
                        : "opacity-0 invisible -translate-y-2"
                    )}
                  >
                    <div className="w-[500px] bg-[#0a0a0a] border border-zinc-800 p-4">
                      <div className="text-[10px] font-mono text-zinc-600 mb-3 px-2">
                        SYSTEM_MODULES
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {productMenuItems.map((item) => (
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
                      <div className="mt-3 pt-3 border-t border-zinc-800 px-2">
                        <Link
                          href="/docs"
                          className="text-xs font-mono text-zinc-500 hover:text-orange-500 transition-colors"
                        >
                          VIEW_FULL_DOCS →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Solutions Dropdown */}
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
                    Solutions
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        activeDropdown === "solutions" && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Solutions Menu */}
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

                {/* Pricing Link */}
                <Link
                  href="#pricing"
                  className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </nav>
            </div>

            {/* Center: Command Palette Trigger */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <CommandPaletteTrigger />
            </div>

            {/* Right: User Status Pill + Mobile Menu Button */}
            <div className="flex items-center gap-4">
              {/* User Status Pill - Desktop */}
              <div className="hidden lg:block">
                <UserStatusPill credits={2400} />
              </div>

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
      />
    </>
  );
}

// Command Palette Trigger Component
function CommandPaletteTrigger() {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2",
        "bg-zinc-900/50 border border-zinc-800",
        "hover:border-zinc-700 hover:bg-zinc-900",
        "transition-colors group"
      )}
      onClick={() => {
        // TODO: Open command palette
        console.log("Open command palette");
      }}
    >
      <Search className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400" />
      <span className="flex-1 text-left text-sm text-zinc-500 group-hover:text-zinc-400">
        Search or type command...
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

      {/* Credits Display */}
      <div className="flex items-center gap-1 px-2 border-l border-zinc-800">
        <span className="text-sm font-mono font-bold text-emerald-500">
          {formattedCredits}
        </span>
        <span className="text-[10px] font-mono text-zinc-500">CREDITS</span>
      </div>

      {/* Settings Button */}
      <button
        className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
        aria-label="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
    </div>
  );
}

// Mobile Menu Component
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
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
            <CommandPaletteTrigger />
          </div>

          {/* User Status Pill - Mobile */}
          <div className="mb-6 pb-6 border-b border-zinc-800">
            <div className="text-[10px] font-mono text-zinc-600 mb-2">
              ACCOUNT_STATUS
            </div>
            <UserStatusPill credits={2400} />
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {/* Product Section */}
            <div className="border border-zinc-800">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() =>
                  setExpandedSection(
                    expandedSection === "product" ? null : "product"
                  )
                }
              >
                <span className="text-white font-medium">Product</span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-zinc-500 transition-transform",
                    expandedSection === "product" && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  expandedSection === "product" ? "max-h-[500px]" : "max-h-0"
                )}
              >
                <div className="p-4 pt-0 space-y-1">
                  {productMenuItems.map((item) => (
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

            {/* Solutions Section */}
            <div className="border border-zinc-800">
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() =>
                  setExpandedSection(
                    expandedSection === "solutions" ? null : "solutions"
                  )
                }
              >
                <span className="text-white font-medium">Solutions</span>
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

            {/* Pricing Link */}
            <Link
              href="#pricing"
              className="flex items-center justify-between p-4 border border-zinc-800 text-white font-medium hover:bg-zinc-900 transition-colors"
              onClick={onClose}
            >
              Pricing
              <span className="text-xs font-mono text-zinc-500">
                VIEW_PLANS
              </span>
            </Link>
          </nav>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-600">
              <span>SESSION: ACTIVE</span>
              <span>NODE: US-WEST-2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
