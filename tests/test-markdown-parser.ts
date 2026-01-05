/**
 * 测试 Markdown 图片链接解析
 */

const testCases = [
  {
    name: "Standard Markdown format",
    input: "\n![Image](https://pro.filesystem.site/cdn/20260105/1158ce721af7264e42b46b9d6d57d5.png)\n",
    expected: "https://pro.filesystem.site/cdn/20260105/1158ce721af7264e42b46b9d6d57d5.png",
  },
  {
    name: "Markdown with alt text",
    input: "![Book Cover](https://example.com/cover.jpg)",
    expected: "https://example.com/cover.jpg",
  },
  {
    name: "Markdown with extra whitespace",
    input: "\n\n  ![Image](https://test.com/image.png)  \n\n",
    expected: "https://test.com/image.png",
  },
];

console.log("Testing Markdown URL extraction:\n");

testCases.forEach((testCase) => {
  const regex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/;
  const match = testCase.input.match(regex);
  const result = match && match[1] ? match[1] : null;

  const passed = result === testCase.expected;
  console.log(`${passed ? "✓" : "✗"} ${testCase.name}`);
  console.log(`  Input:    "${testCase.input.replace(/\n/g, "\\n")}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got:      "${result}"`);
  console.log();
});

export {};
