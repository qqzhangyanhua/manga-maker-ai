#!/usr/bin/env node
/**
 * 场景库 API 测试脚本
 * 测试所有 CRUD 操作
 */

const BASE_URL = "http://localhost:3000";
let authCookie = "";
let testSceneId = "";

async function makeRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authCookie) {
    headers.Cookie = authCookie;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 保存认证 cookie
  const setCookie = response.headers.get("set-cookie");
  if (setCookie && setCookie.includes("comicai_session")) {
    authCookie = setCookie.split(";")[0];
  }

  return response;
}

async function test() {
  console.log("🧪 开始测试场景库 API...\n");

  try {
    // 1. 登录（需要先有测试账号）
    console.log("1️⃣  测试登录...");
    const loginRes = await makeRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com", // 替换为实际的测试账号
        password: "password123",
      }),
    });

    if (!loginRes.ok) {
      console.log("❌ 登录失败，请先创建测试账号或使用已有账号");
      console.log("   修改此脚本中的 email 和 password");
      return;
    }
    console.log("✅ 登录成功\n");

    // 2. 创建场景
    console.log("2️⃣  测试创建场景...");
    const createRes = await makeRequest("/api/scene", {
      method: "POST",
      body: JSON.stringify({
        name: "测试咖啡厅",
        description: "温馨的现代咖啡厅场景",
        scene_type: "indoor",
        tags: ["咖啡厅", "温馨", "现代"],
        prompt: "A cozy modern cafe with warm lighting",
      }),
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      console.log("❌ 创建失败:", error.error);
      return;
    }

    const createdScene = await createRes.json();
    testSceneId = createdScene.id;
    console.log("✅ 场景创建成功");
    console.log("   ID:", testSceneId);
    console.log("   名称:", createdScene.name);
    console.log("");

    // 3. 获取场景列表
    console.log("3️⃣  测试获取场景列表...");
    const listRes = await makeRequest("/api/scene");

    if (!listRes.ok) {
      console.log("❌ 获取列表失败");
      return;
    }

    const scenes = await listRes.json();
    console.log(`✅ 获取成功，共 ${scenes.length} 个场景\n`);

    // 4. 获取场景详情
    console.log("4️⃣  测试获取场景详情...");
    const detailRes = await makeRequest(`/api/scene/${testSceneId}`);

    if (!detailRes.ok) {
      console.log("❌ 获取详情失败");
      return;
    }

    const sceneDetail = await detailRes.json();
    console.log("✅ 详情获取成功");
    console.log("   场景类型:", sceneDetail.scene_type);
    console.log("   标签:", sceneDetail.tags.join(", "));
    console.log("");

    // 5. 更新场景
    console.log("5️⃣  测试更新场景...");
    const updateRes = await makeRequest(`/api/scene/${testSceneId}`, {
      method: "PATCH",
      body: JSON.stringify({
        description: "更新后的描述：超级温馨的咖啡厅",
        tags: ["咖啡厅", "温馨", "现代", "文艺"],
      }),
    });

    if (!updateRes.ok) {
      console.log("❌ 更新失败");
      return;
    }

    const updatedScene = await updateRes.json();
    console.log("✅ 更新成功");
    console.log("   新描述:", updatedScene.description);
    console.log("   新标签:", updatedScene.tags.join(", "));
    console.log("");

    // 6. 删除场景
    console.log("6️⃣  测试删除场景...");
    const deleteRes = await makeRequest(`/api/scene/${testSceneId}`, {
      method: "DELETE",
    });

    if (!deleteRes.ok) {
      console.log("❌ 删除失败");
      return;
    }

    console.log("✅ 删除成功\n");

    // 7. 验证删除
    console.log("7️⃣  验证场景已删除...");
    const verifyRes = await makeRequest(`/api/scene/${testSceneId}`);

    if (verifyRes.status === 404) {
      console.log("✅ 确认已删除\n");
    } else {
      console.log("⚠️  场景似乎仍然存在\n");
    }

    console.log("🎉 所有测试通过！");
  } catch (error) {
    console.error("❌ 测试过程中发生错误:", error.message);
  }
}

// 运行测试
test();
