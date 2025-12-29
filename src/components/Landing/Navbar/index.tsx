"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { CommandPalette } from "../CommandPalette";
import { NavbarProps } from "./types";
import { CommandPaletteTrigger } from "./CommandPaletteTrigger";
import { UserStatusPill } from "./UserStatusPill";
import { DesktopMenu } from "./DesktopMenu";
import { MobileMenu } from "./MobileMenu";

export function Navbar({ className }: NavbarProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use React Query hook for user data
  const { data: user } = useCurrentUser();

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

  // Handle logout
  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        // Redirect to home page
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
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
              <DesktopMenu
                activeDropdown={activeDropdown}
                userRole={user?.role ?? null}
                onDropdownEnter={handleDropdownEnter}
                onDropdownLeave={handleDropdownLeave}
              />
            </div>

            {/* Center: Command Palette Trigger */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <CommandPaletteTrigger onClick={() => setCommandPaletteOpen(true)} />
            </div>

            {/* Right: User Status Pill + Mobile Menu Button */}
            <div className="flex items-center gap-4">
              {/* User Status Pill - Desktop (Logged in) */}
              {user && (
                <div className="hidden lg:block">
                  <UserStatusPill credits={user.credits} onLogout={handleLogout} />
                </div>
              )}

              {/* Login/Register Buttons - Desktop (Not logged in) */}
              {!user && (
                <div className="hidden lg:flex items-center gap-2">
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                      登录
                    </Button>
                  </Link>
                  <Link href="/auth/register">
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                      注册
                    </Button>
                  </Link>
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
        userCredits={user?.credits ?? null}
        userRole={user?.role ?? null}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onLogout={handleLogout}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        userRole={user?.role ?? null}
      />
    </>
  );
}
