import { LucideIcon } from "lucide-react";

export interface NavbarProps {
  className?: string;
}

export interface CommandPaletteTriggerProps {
  onClick: () => void;
}

export interface UserStatusPillProps {
  credits: number;
  avatarUrl?: string;
  onLogout: () => void;
}

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: number | null;
  userRole: string | null;
  onOpenCommandPalette: () => void;
  onLogout: () => void;
}

export interface DesktopMenuProps {
  activeDropdown: string | null;
  userRole: string | null;
  onDropdownEnter: (name: string) => void;
  onDropdownLeave: () => void;
}

export interface MenuItem {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

export interface MenuCategory {
  category: string;
  adminOnly?: boolean;
  items: MenuItem[];
}
