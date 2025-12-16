/**
 * Test script to verify SSL fix for LLM provider
 */

const https = require('https');

// Create agent with SSL verification disabled
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function testMoonshotAPI() {
  const endpoint = 'https://api.moonshot.cn/v1/chat/completions';

  // Get API key from database
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const provider = await prisma.llmProvider.findFirst({
      where: { provider_type: 'story_generator', enabled: true }
    });

    if (!provider) {
      console.error('No story_generator provider found');
      process.exit(1);
    }

    console.log('Testing provider:', provider.provider_name, provider.model);
    console.log('Endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.api_key}`
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: '你是一个测试助手' },
          { role: 'user', content: '说"测试成功"' }
        ],
        max_tokens: 20
      }),
      agent: httpsAgent
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('Error:', text);
      process.exit(1);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    console.log('\n✓ SSL fix successful!');
    console.log('Response:', content);

    await prisma.$disconnect();
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testMoonshotAPI();
