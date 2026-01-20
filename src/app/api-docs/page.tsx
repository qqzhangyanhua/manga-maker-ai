"use client";

/**
 * API Documentation Page - Swagger UI
 * Next.js API 文档展示页面
 */
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { useEffect, useState } from "react";

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">加载 API 文档中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 自定义头部 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 shadow-lg">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-2 text-3xl font-bold text-white">
            Manga Maker AI - API Documentation
          </h1>
          <p className="text-blue-100">
            漫画创作平台 Next.js API 文档 | Comic Creation Platform API Reference
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <a
              href="/api/doc"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/20 px-4 py-2 text-white transition hover:bg-white/30"
            >
              📄 OpenAPI JSON
            </a>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/20 px-4 py-2 text-white transition hover:bg-white/30"
            >
              🐍 Novel Backend API (FastAPI)
            </a>
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="mx-auto max-w-7xl p-6">
        <SwaggerUI
          url="/api/doc"
          persistAuthorization={true}
          displayRequestDuration={true}
          docExpansion="list"
          defaultModelsExpandDepth={1}
          filter={true}
          tryItOutEnabled={true}
        />
      </div>

      {/* 自定义底部 */}
      <div className="mt-12 border-t border-gray-200 bg-white p-6">
        <div className="mx-auto max-w-7xl text-center text-sm text-gray-600">
          <p className="mb-2">
            💡 <strong>提示</strong>: 本页面仅展示 Next.js API endpoints。
          </p>
          <p>
            小说生成相关的 API 请访问{" "}
            <a
              href="http://localhost:8000/docs"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Novel Backend API 文档
            </a>
          </p>
          <p className="mt-4 text-gray-400">
            Powered by Swagger UI | Generated from Zod Schemas
          </p>
        </div>
      </div>
    </div>
  );
}
