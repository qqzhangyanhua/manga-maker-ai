// 测试环境全局挂载 jest-dom 匹配器
import "@testing-library/jest-dom";

// Note: crypto is already available in Node.js v22+ as a global

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  // 注入测试专用的 Mock
  globalThis.ResizeObserver = ResizeObserverMock;
}
