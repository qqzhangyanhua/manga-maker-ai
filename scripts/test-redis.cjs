const { createClient } = require('redis');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const REDIS_URL = process.env.REDIS_URL || 'redis://:zhangyanhua123@111.228.37.74:6379/0';

async function testRedis() {
  console.log('🔄 正在连接 Redis...');
  console.log('📍 Redis URL:', REDIS_URL.replace(/:[^:@]+@/, ':****@'));
  
  const client = createClient({ 
    url: REDIS_URL,
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: false
    }
  });

  client.on('error', (err) => console.error('❌ Redis Client Error:', err.message));
  client.on('connect', () => console.log('🔌 Redis 客户端正在连接...'));
  client.on('ready', () => console.log('✅ Redis 客户端准备就绪'));

  try {
    await client.connect();
    console.log('✅ Redis 连接成功！');

    // 测试 PING 命令
    const pong = await client.ping();
    console.log('✅ PING 测试通过:', pong);

    // 测试 SET/GET 命令
    const testKey = 'test_key_' + Date.now();
    await client.set(testKey, 'test_value', { EX: 10 }); // 10秒过期
    console.log('✅ SET 命令成功');
    
    const value = await client.get(testKey);
    console.log('✅ GET 命令成功, 值:', value);

    // 测试 DEL 命令
    await client.del(testKey);
    console.log('✅ DEL 命令成功');

    // 测试 INFO 命令获取服务器信息
    const info = await client.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    if (versionMatch) {
      console.log('📊 Redis 版本:', versionMatch[1]);
    }

    await client.disconnect();
    console.log('✅ Redis 已断开连接');
    console.log('\n🎉 所有测试通过！Redis 运行正常。');
  } catch (error) {
    console.error('\n❌ Redis 连接失败:', error.message);
    if (error.code) {
      console.error('错误代码:', error.code);
    }
    process.exit(1);
  }
}

testRedis();
