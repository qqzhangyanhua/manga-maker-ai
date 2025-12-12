// 测试环境全局挂载 jest-dom 匹配器
import "@testing-library/jest-dom";

import { webcrypto } from "node:crypto";

globalThis.crypto = webcrypto as unknown as Crypto;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  // 注入测试专用的 Mock
  globalThis.ResizeObserver = ResizeObserverMock;
}
