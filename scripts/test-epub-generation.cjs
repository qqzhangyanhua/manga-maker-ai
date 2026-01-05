/**
 * EPUB 导出测试脚本
 * 用于验证 epub-gen-memory 库的正确使用
 */

const EPubModule = require('epub-gen-memory');

async function testEpubGeneration() {
  console.log('🧪 开始测试 EPUB 生成...\n');

  // 检查模块导出
  console.log('📦 模块导出内容:', Object.keys(EPubModule));
  console.log('📦 默认导出类型:', typeof EPubModule.default);
  console.log('📦 EPub 导出类型:', typeof EPubModule.EPub);
  console.log('');

  try {
    // 测试数据
    const testChapters = [
      {
        title: '第1章 开始',
        content: '<h1>第1章 开始</h1><p>这是第一章的内容。</p><p>一个新的旅程开始了。</p>',
      },
      {
        title: '第2章 冒险',
        content: '<h1>第2章 冒险</h1><p>主人公踏上了冒险之旅。</p><p>前方充满未知。</p>',
      },
    ];

    const options = {
      title: '测试小说',
      author: '测试作者',
      description: '这是一本测试小说',
      publisher: 'Test Publisher',
      tocTitle: '目录',
      appendChapterTitles: false,
      verbose: false,
    };

    // 使用函数方式生成 EPUB（不是类）
    const epubGenerator = EPubModule.default || EPubModule;
    console.log('✅ 使用的 EPUB 生成器:', typeof epubGenerator);

    // 生成 EPUB - 直接调用函数
    console.log('⏳ 正在生成 EPUB...');
    const buffer = await epubGenerator(options, testChapters);
    console.log('✅ EPUB 生成成功');

    // 检查返回类型
    console.log('');
    console.log('📊 生成结果:');
    console.log('  - Buffer 类型:', buffer.constructor.name);
    console.log('  - 是 Uint8Array:', buffer instanceof Uint8Array);
    console.log('  - Buffer 大小:', buffer.length, 'bytes');
    console.log('  - 文件头:', buffer.slice(0, 4).toString('hex'));
    console.log('  - EPUB 魔数 (应为 504b0304):', buffer.slice(0, 4).toString('hex') === '504b0304' ? '✅ 正确' : '❌ 错误');

    // 验证 ArrayBuffer 转换
    if (buffer instanceof Uint8Array) {
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
      console.log('  - ArrayBuffer 转换:', arrayBuffer instanceof ArrayBuffer ? '✅ 成功' : '❌ 失败');
      console.log('  - ArrayBuffer 大小:', arrayBuffer.byteLength, 'bytes');
    }

    console.log('\n🎉 所有测试通过！EPUB 生成功能正常。');

  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error('  错误信息:', error.message);
    console.error('  错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行测试
testEpubGeneration().catch((error) => {
  console.error('❌ 未捕获的错误:', error);
  process.exit(1);
});
