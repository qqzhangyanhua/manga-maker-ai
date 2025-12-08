/**
 * 测试 LLM Provider 复制功能
 *
 * 测试步骤：
 * 1. 创建一个测试 provider（enabled: true）
 * 2. 复制该 provider
 * 3. 验证复制后的 provider enabled 为 false
 * 4. 清理测试数据
 */

const BASE_URL = 'http://localhost:3000';

async function testCopyProvider() {
  console.log('开始测试 LLM Provider 复制功能...\n');

  // 你需要先登录并获取管理员 cookie
  console.log('⚠️  注意：此测试需要管理员权限，请确保已登录管理员账号\n');

  try {
    // 1. 创建一个测试 provider
    console.log('步骤 1: 创建测试 provider...');
    const createRes = await fetch(`${BASE_URL}/api/llm-providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        provider_type: 'test_copy_type',
        provider_name: 'openai',
        model: 'gpt-4',
        base_url: 'https://api.openai.com',
        api_key: 'sk-test-key',
        priority: 1,
        enabled: true,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error(`创建失败: ${createData.message}`);
    }

    const originalProvider = createData.data.provider;
    console.log(`✓ 创建成功，ID: ${originalProvider.id}, enabled: ${originalProvider.enabled}\n`);

    // 2. 复制该 provider
    console.log('步骤 2: 复制 provider...');
    const copyRes = await fetch(`${BASE_URL}/api/llm-providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        provider_type: originalProvider.provider_type,
        provider_name: originalProvider.provider_name,
        model: originalProvider.model,
        base_url: originalProvider.base_url,
        api_key: originalProvider.api_key,
        priority: originalProvider.priority,
        enabled: false, // 复制后默认关闭
      }),
    });

    const copyData = await copyRes.json();
    if (!copyRes.ok) {
      throw new Error(`复制失败: ${copyData.message}`);
    }

    const copiedProvider = copyData.data.provider;
    console.log(`✓ 复制成功，ID: ${copiedProvider.id}, enabled: ${copiedProvider.enabled}\n`);

    // 3. 验证结果
    console.log('步骤 3: 验证复制结果...');
    if (copiedProvider.enabled === false) {
      console.log('✓ 验证通过：复制后的 provider enabled 为 false\n');
    } else {
      throw new Error('验证失败：复制后的 provider enabled 应该为 false');
    }

    // 4. 清理测试数据
    console.log('步骤 4: 清理测试数据...');
    await fetch(`${BASE_URL}/api/llm-providers/${originalProvider.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    await fetch(`${BASE_URL}/api/llm-providers/${copiedProvider.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    console.log('✓ 清理完成\n');

    console.log('🎉 所有测试通过！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testCopyProvider();
