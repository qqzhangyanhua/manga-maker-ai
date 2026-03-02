import {
  Users,
  Building2,
  BookOpen,
  BookText,
  Sparkles,
  FileCode,
  FolderOpen,
  Image,
  UserCircle,
  MapPin,
  Shield,
  Workflow,
  Palette,
  LayoutTemplate,
  LayoutDashboard,
} from "lucide-react";
import { MenuItem, MenuCategory } from "./types";

export const solutionsMenuItems: MenuItem[] = [
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

export const workspaceMenuItems: MenuCategory[] = [
  {
    category: "创作中心",
    items: [
      {
        icon: LayoutDashboard,
        title: "创作工作台",
        description: "统一创作入口与最近作品",
        href: "/workspace",
      },
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
      {
        icon: BookOpen,
        title: "分镜编辑",
        description: "编辑分镜和面板",
        href: "/storyboard",
      },
      {
        icon: BookText,
        title: "小说创作",
        description: "AI 辅助小说写作与管理",
        href: "/novel",
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
      {
        icon: Workflow,
        title: "一键生成",
        description: "自动化工作流程",
        href: "/workflow",
      },
      {
        icon: Palette,
        title: "画面精炼",
        description: "图像编辑和优化",
        href: "/editor",
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
      {
        icon: LayoutTemplate,
        title: "模板市场",
        description: "浏览和使用模板",
        href: "/templates",
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
