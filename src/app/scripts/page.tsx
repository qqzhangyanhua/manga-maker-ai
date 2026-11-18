import { redirect } from "next/navigation";

// 剧本列表已合并到"我的项目"
export default function LegacyScriptsPage() {
  redirect("/projects");
}
