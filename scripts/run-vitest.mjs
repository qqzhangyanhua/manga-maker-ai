import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Note: crypto is already available in Node.js v22+ as a global

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cliPath = resolve(__dirname, "../node_modules/vitest/vitest.mjs");
await import(pathToFileURL(cliPath).href);
