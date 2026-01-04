/**
 * 手动测试脚本：导入文本API端点
 *
 * 使用方法：
 * 1. 确保开发服务器运行：pnpm dev
 * 2. 先登录获取 token（或使用已有的 session cookie）
 * 3. 替换下面的 storyId, projectId, token
 * 4. 在浏览器控制台或 node 中运行
 */

// ============ 配置 ============
const BASE_URL = "http://localhost:3000";
const STORY_ID = "YOUR_STORY_ID";  // 替换为真实的 story ID
const PROJECT_ID = "YOUR_PROJECT_ID";  // 替换为真实的 project ID
const TOKEN = "YOUR_AUTH_TOKEN";  // 替换为真实的 auth token

// ============ 测试文本 ============
const TEST_TEXT = `
在繁华的都市中心，隐藏着一家神秘的咖啡馆。这家咖啡馆只在午夜开放，只招待有缘人。

李墨是一名普通的上班族，某天加班到深夜，偶然发现了这家咖啡馆。推门而入，他看到了一个穿着复古服装的老人在吧台后擦拭着咖啡杯。

"欢迎光临，"老人微笑着说，"你来得正是时候。"

李墨困惑地坐下，点了一杯黑咖啡。当他端起杯子时，突然发现咖啡中浮现出了一幅画面——那是他十年前错过的一次重要机会。

"这咖啡有魔法吗？"李墨惊讶地问。

老人神秘地笑了笑："不是咖啡有魔法，而是你的心有答案。每个人的咖啡中，都会看到自己最需要面对的过去。"

那一夜，李墨在咖啡馆里待到天明，终于理解了自己多年来的困惑。当他走出咖啡馆时，天空已经泛起鱼肚白，而那家咖啡馆也消失在了晨曦中。
`.trim();

// ============ 测试函数 ============

/**
 * 测试 1: 预估积分消耗
 */
async function testEstimate() {
  console.log("🧪 测试 1: 预估积分消耗");

  const response = await fetch(
    `${BASE_URL}/api/story/${STORY_ID}/estimate-import-cost`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `comicai_session=${TOKEN}`
      },
      body: JSON.stringify({ text: TEST_TEXT })
    }
  );

  const data = await response.json();

  if (response.ok) {
    console.log("✅ 预估成功:");
    console.log("  - 字数:", data.estimate.wordCount);
    console.log("  - 预计分镜数:", data.estimate.estimatedPanels);
    console.log("  - 预估积分:", data.estimate.estimatedCredits);
    console.log("  - 当前积分:", data.estimate.currentCredits);
    console.log("  - 积分充足:", data.estimate.hasEnoughCredits ? "是" : "否");
    if (data.estimate.warning) {
      console.log("  ⚠️  警告:", data.estimate.warning);
    }
  } else {
    console.error("❌ 预估失败:", data.error);
  }

  return data;
}

/**
 * 测试 2: 导入文本并生成分镜
 */
async function testImport() {
  console.log("\n🧪 测试 2: 导入文本并生成分镜");

  const response = await fetch(
    `${BASE_URL}/api/story/${STORY_ID}/import-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `comicai_session=${TOKEN}`
      },
      body: JSON.stringify({
        text: TEST_TEXT,
        chapterTitle: "测试：午夜咖啡馆",
        projectId: PROJECT_ID,
        panelCount: 12
      })
    }
  );

  const data = await response.json();

  if (response.ok) {
    console.log("✅ 导入成功:");
    console.log("  - 章节ID:", data.chapterId);
    console.log("  - 章节标题:", data.chapterTitle);
    console.log("  - 生成分镜数:", data.panels.length);
    console.log("  - 消息:", data.message);
    console.log("\n📋 生成的分镜:");
    data.panels.forEach((panel, idx) => {
      console.log(`\n  分镜 ${idx + 1}:`);
      console.log(`    类型: ${panel.panel_type}`);
      console.log(`    描述: ${panel.description.substring(0, 50)}...`);
      console.log(`    对话: ${panel.dialogue || "无"}`);
    });
  } else {
    console.error("❌ 导入失败:", data.error);
  }

  return data;
}

/**
 * 测试 3: 边界情况 - 空文本
 */
async function testEmptyText() {
  console.log("\n🧪 测试 3: 边界情况 - 空文本");

  const response = await fetch(
    `${BASE_URL}/api/story/${STORY_ID}/import-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `comicai_session=${TOKEN}`
      },
      body: JSON.stringify({
        text: "",
        projectId: PROJECT_ID
      })
    }
  );

  const data = await response.json();

  if (response.status === 400) {
    console.log("✅ 正确拒绝空文本:", data.error);
  } else {
    console.error("❌ 应该返回 400 错误");
  }
}

/**
 * 测试 4: 边界情况 - 超长文本
 */
async function testLongText() {
  console.log("\n🧪 测试 4: 边界情况 - 超长文本");

  const longText = "测试文本".repeat(2000);  // 超过 10,000 字

  const response = await fetch(
    `${BASE_URL}/api/story/${STORY_ID}/import-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `comicai_session=${TOKEN}`
      },
      body: JSON.stringify({
        text: longText,
        projectId: PROJECT_ID
      })
    }
  );

  const data = await response.json();

  if (response.status === 400) {
    console.log("✅ 正确拒绝超长文本:", data.error);
    console.log("  - 最大长度:", data.maxLength);
    console.log("  - 当前长度:", data.currentLength);
  } else {
    console.error("❌ 应该返回 400 错误");
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log("================================================");
  console.log("🚀 开始测试导入文本API端点");
  console.log("================================================\n");

  try {
    // 测试 1: 预估
    await testEstimate();

    // 等待 1 秒
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试 2: 实际导入
    await testImport();

    // 等待 1 秒
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试 3: 边界情况
    await testEmptyText();

    // 等待 1 秒
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 测试 4: 超长文本
    await testLongText();

    console.log("\n================================================");
    console.log("✅ 所有测试完成");
    console.log("================================================");
  } catch (error) {
    console.error("\n💥 测试过程中发生错误:", error);
  }
}

// ============ 导出（用于 Node.js 环境）============
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    testEstimate,
    testImport,
    testEmptyText,
    testLongText,
    runAllTests
  };
}

// ============ 使用说明 ============
console.log(`
📝 使用说明:

1. 替换文件顶部的配置项:
   - STORY_ID: 你的故事ID
   - PROJECT_ID: 你的项目ID
   - TOKEN: 你的认证token (从浏览器cookie中获取 comicai_session 的值)

2. 在浏览器控制台中运行:
   runAllTests()

3. 或者单独测试:
   testEstimate()     // 只测试预估
   testImport()       // 只测试导入
   testEmptyText()    // 测试空文本边界情况
   testLongText()     // 测试超长文本边界情况
`);
