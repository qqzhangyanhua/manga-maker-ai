import {
  Users,
  Building2,
  BookOpen,
  BookText,
  Sparkles,
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
    category: "创作",
    items: [
      {
        icon: LayoutDashboard,
        title: "创作工作台",
        description: "统一创作入口与最近项目",
        href: "/workspace",
      },
      {
        icon: FolderOpen,
        title: "我的项目",
        description: "剧本、角色、分镜都在项目里",
        href: "/projects",
      },
      {
        icon: Sparkles,
        title: "新建项目",
        description: "从故事构思开始一个新项目",
        href: "/story",
      },
      {
        icon: BookText,
        title: "小说",
        description: "AI 辅助小说写作，可改编为项目",
        href: "/novel",
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
    category: "工具",
    items: [
      {
        icon: BookOpen,
        title: "快速分镜",
        description: "粘贴文本直接生成分镜项目",
        href: "/storyboard",
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
