/**
 * 设计方案预览页面
 *
 * 使用方式：
 * 1. 将此文件复制到 src/app/design-preview/page.tsx
 * 2. 访问 http://localhost:3000/design-preview
 * 3. 使用顶部切换按钮查看三种风格
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// 导入三个方案（实际使用时需要调整导入路径）
// import ScriptsPageVercel from "@/../../design-proposals/vercel-style-scripts";
// import ScriptsPageLinear from "@/../../design-proposals/linear-style-scripts";
// import ScriptsPageApple from "@/../../design-proposals/apple-style-scripts";

export default function DesignPreviewPage() {
    const [activeStyle, setActiveStyle] = useState<"vercel" | "linear" | "apple">("vercel");

    return (
        <div className="min-h-screen">
            {/* 固定顶部切换栏 */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">设计方案预览</h1>
                        <p className="text-sm text-gray-500">点击下方按钮切换不同风格</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => setActiveStyle("vercel")}
                            variant={activeStyle === "vercel" ? "default" : "outline"}
                            className={activeStyle === "vercel" ? "bg-orange-500 hover:bg-orange-600" : ""}
                        >
                            Vercel 风格
                        </Button>
                        <Button
                            onClick={() => setActiveStyle("linear")}
                            variant={activeStyle === "linear" ? "default" : "outline"}
                            className={activeStyle === "linear" ? "bg-gradient-to-r from-purple-600 to-blue-500" : ""}
                        >
                            Linear 风格
                        </Button>
                        <Button
                            onClick={() => setActiveStyle("apple")}
                            variant={activeStyle === "apple" ? "default" : "outline"}
                            className={activeStyle === "apple" ? "bg-blue-500 hover:bg-blue-600" : ""}
                        >
                            Apple 风格
                        </Button>
                    </div>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="pt-24">
                {activeStyle === "vercel" && (
                    <div className="text-center py-20">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Vercel 风格</h2>
                        <p className="text-gray-600 mb-8">深色极客风 - 适合技术向产品</p>
                        <div className="bg-gray-100 rounded-lg p-8 max-w-4xl mx-auto">
                            <p className="text-gray-500">请将 vercel-style-scripts.tsx 的内容集成到此处预览</p>
                            {/* <ScriptsPageVercel /> */}
                        </div>
                    </div>
                )}

                {activeStyle === "linear" && (
                    <div className="text-center py-20">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Linear 风格</h2>
                        <p className="text-gray-600 mb-8">现代渐变美学 - 适合创意工具</p>
                        <div className="bg-gray-100 rounded-lg p-8 max-w-4xl mx-auto">
                            <p className="text-gray-500">请将 linear-style-scripts.tsx 的内容集成到此处预览</p>
                            {/* <ScriptsPageLinear /> */}
                        </div>
                    </div>
                )}

                {activeStyle === "apple" && (
                    <div className="text-center py-20">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Apple 风格</h2>
                        <p className="text-gray-600 mb-8">极简明亮 - 适合高端品牌</p>
                        <div className="bg-gray-100 rounded-lg p-8 max-w-4xl mx-auto">
                            <p className="text-gray-500">请将 apple-style-scripts.tsx 的内容集成到此处预览</p>
                            {/* <ScriptsPageApple /> */}
                        </div>
                    </div>
                )}
            </div>

            {/* 详细对比 */}
            <div className="max-w-7xl mx-auto px-6 py-16 space-y-12 bg-white">
                <h2 className="text-3xl font-bold text-gray-900">设计对比</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Vercel 风格卡片 */}
                    <div className="border border-gray-200 rounded-2xl p-6 space-y-4 hover:shadow-lg transition-all">
                        <div className="w-full h-32 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-xl flex items-center justify-center">
                            <span className="text-2xl font-bold text-orange-600">Vercel</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">深色极客风</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>✓ 背景：#0a0a0a + 渐变叠加</li>
                            <li>✓ 强调色：橙色渐变</li>
                            <li>✓ 玻璃态模糊效果</li>
                            <li>✓ 中等留白</li>
                        </ul>
                        <div className="pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                <strong>适用场景：</strong>技术向产品、开发者工具、需要长时间使用的应用
                            </p>
                        </div>
                    </div>

                    {/* Linear 风格卡片 */}
                    <div className="border border-gray-200 rounded-2xl p-6 space-y-4 hover:shadow-lg transition-all">
                        <div className="w-full h-32 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-xl flex items-center justify-center">
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                Linear
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">现代渐变美学</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>✓ 背景：深蓝紫渐变</li>
                            <li>✓ 强调色：紫/蓝双色</li>
                            <li>✓ 多层径向光晕</li>
                            <li>✓ 宽松留白</li>
                        </ul>
                        <div className="pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                <strong>适用场景：</strong>创意工具、设计平台、年轻用户群体
                            </p>
                        </div>
                    </div>

                    {/* Apple 风格卡片 */}
                    <div className="border border-gray-200 rounded-2xl p-6 space-y-4 hover:shadow-lg transition-all">
                        <div className="w-full h-32 bg-gradient-to-br from-blue-500/20 to-gray-200 rounded-xl flex items-center justify-center">
                            <span className="text-2xl font-semibold text-blue-600">Apple</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">极简明亮</h3>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li>✓ 背景：极浅灰 bg-gray-50</li>
                            <li>✓ 强调色：Apple 蓝</li>
                            <li>✓ 微妙阴影 + 纯白卡片</li>
                            <li>✓ 超大留白</li>
                        </ul>
                        <div className="pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                                <strong>适用场景：</strong>消费级应用、高端品牌、注重可读性的产品
                            </p>
                        </div>
                    </div>
                </div>

                {/* 技术细节对比表 */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="text-left py-4 px-4 font-semibold text-gray-900">维度</th>
                                <th className="text-left py-4 px-4 font-semibold text-orange-600">Vercel</th>
                                <th className="text-left py-4 px-4 font-semibold text-purple-600">Linear</th>
                                <th className="text-left py-4 px-4 font-semibold text-blue-600">Apple</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4 font-medium text-gray-700">标题字号</td>
                                <td className="py-3 px-4 text-gray-600">text-4xl</td>
                                <td className="py-3 px-4 text-gray-600">text-5xl</td>
                                <td className="py-3 px-4 text-gray-600">text-5xl</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4 font-medium text-gray-700">容器留白</td>
                                <td className="py-3 px-4 text-gray-600">px-6 py-12</td>
                                <td className="py-3 px-4 text-gray-600">px-8 py-16</td>
                                <td className="py-3 px-4 text-gray-600">px-12 py-20</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4 font-medium text-gray-700">圆角大小</td>
                                <td className="py-3 px-4 text-gray-600">rounded-xl</td>
                                <td className="py-3 px-4 text-gray-600">rounded-2xl</td>
                                <td className="py-3 px-4 text-gray-600">rounded-3xl</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4 font-medium text-gray-700">hover 动效</td>
                                <td className="py-3 px-4 text-gray-600">scale-[1.02]</td>
                                <td className="py-3 px-4 text-gray-600">scale-[1.03]</td>
                                <td className="py-3 px-4 text-gray-600">-translate-y-1</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                                <td className="py-3 px-4 font-medium text-gray-700">卡片间距</td>
                                <td className="py-3 px-4 text-gray-600">gap-6</td>
                                <td className="py-3 px-4 text-gray-600">gap-8</td>
                                <td className="py-3 px-4 text-gray-600">gap-8</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
