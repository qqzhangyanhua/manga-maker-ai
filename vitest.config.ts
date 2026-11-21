// @ts-nocheck
import { defineConfig } from "vitest/config";

// Note: crypto is already available in Node.js v22+ as a global

export default defineConfig({
  // tsconfig 的 jsx 是 preserve。Vite 8 的 oxc 不会再转 JSX，组件测试需要 automatic。
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // *.db.test.ts 只属于 pnpm test:db，避免 pnpm test 连上真实数据库。
    exclude: [
      "**/*.db.test.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
    ],
    typecheck: {
      tsconfig: "./tsconfig.vitest.json",
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
