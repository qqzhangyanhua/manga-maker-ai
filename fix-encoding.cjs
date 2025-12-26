const fs = require('fs');

// 完整的乱码映射表
const encodingFixes = {
  // 完整短语 - 优先匹配
  '鍓ф湰宸蹭繚瀛?': '剧本已保存',
  '鍒嗛暅宸插垹闄?': '分镜已删除',
  '瑙掕壊宸叉坊鍔犲埌鏁呬簨': '角色已添加到故事',
  '瑙掕壊宸蹭粠鏁呬簨绉婚櫎': '角色已从故事移除',
  '瑙掕壊绫诲瀷宸叉洿鏂?': '角色类型已更新',
  '鏁呬簨涓嶅瓨鍦?': '故事不存在',
  '鍒犻櫎鍒嗛暅澶辫触': '删除分镜失败',
  'AI鐢熸垚鐨勬极鐢婚」鐩?': 'AI生成的漫画项目',
  '鍒嗛暅鐢熸垚瀹屾垚': '分镜生成完成',
  'AI 宸叉垚鍔熼噸鏂扮敓鎴愬垎闀滆剼鏈?': 'AI 已成功重新生成分镜脚本',
  'AI 宸叉垚鍔熻拷鍔犳柊鐨勫垎闀滆剼鏈?': 'AI 已成功追加新的分镜脚本',
  '鏈壘鍒板墽鏈?': '未找到剧本',
  '杩斿洖鍒楄〃': '返回列表',
  '鍒嗛暅鍒楄〃': '分镜列表',
  '鐢熸垚鍥惧簱': '生成图库',
  '杩炶浇绠＄悊': '连载管理',
  '鍒囨崲鍒板垎闀滃垪琛?': '切换到分镜列表',
  '鍥剧墖鐢熸垚鎴愬姛': '图片生成成功',
  '宸插彇娑堝彂甯?': '已取消发布',
  '鍙戝竷鎴愬姛': '发布成功',
  '绔犺妭杩樻病鏈夌敓鎴愬垎闀滐紝璇峰厛鐢熸垚鍒嗛暅': '章节还没有生成分镜，请先生成分镜',
  '鍒嗛暅鍥剧墖鏈叏閮ㄧ敓鎴?': '分镜图片未全部生成',
  '鎿嶄綔澶辫触': '操作失败',
  '鏈煡閿欒': '未知错误',
  '娌℃湁鍙敓鎴愮殑绔犺妭': '没有可生成的章节',
  '鎵€閫夌珷鑺傞兘宸叉湁鍒嗛暅': '所选章节都已有分镜',
  '鎵归噺鐢熸垚鍒嗛暅': '批量生成分镜',
  '姝e湪涓?': '正在为',
  '涓珷鑺傜敓鎴愬垎闀?': '个章节生成分镜',
  '娌℃湁鍙彂甯冪殑绔犺妭': '没有可发布的章节',
  '鎵€閫夌珷鑺傞兘宸插彂甯冩垨涓嶇鍚堝彂甯冩潯浠?': '所选章节都已发布或不符合发布条件',
  '鎵归噺鍙戝竷瀹屾垚': '批量发布完成',
  '鎴愬姛鍙戝竷': '成功发布',
  '璇ョ珷鑺傚瓨鍦ㄤ互涓嬮棶棰橈紝纭畾瑕佸彂甯冨悧': '该章节存在以下问题，确定要发布吗',
  '鍙戝竷鎻愮ず': '发布提示',
  '纭鍙戝竷': '确认发布',
  '鎻愮ず锛氬嬀閫夌珷鑺傚彲鎵归噺鎿嶄綔': '提示：勾选章节可批量操作',
  '杩炶浇绔犺妭': '连载章节',
  '宸ュ叿鏍?': '工具栏',
  '鍒涘缓绗竴': '创建第一',
  '杩樻病鏈?': '还没有',

  // 单字和双字 - 后匹配
  '鍓ф湰': '剧本',
  '淇濆瓨': '保存',
  '鍒嗛暅': '分镜',
  '鍒犻櫎': '删除',
  '澶辫触': '失败',
  '瑙掕壊': '角色',
  '娣诲姞': '添加',
  '鏁呬簨': '故事',
  '绉婚櫎': '移除',
  '绫诲瀷': '类型',
  '鏇存柊': '更新',
  '瀛樺湪': '存在',
  '鐢熸垚': '生成',
  '瀹屾垚': '完成',
  '閲嶆柊': '重新',
  '杩芥坊鍔?': '追加',
  '鑴氭湰': '脚本',
  '鏈壘鍒?': '未找到',
  '杩斿洖': '返回',
  '鍒楄〃': '列表',
  '鍥惧簱': '图库',
  '杩炶浇': '连载',
  '绠＄悊': '管理',
  '鍒囨崲': '切换',
  '閿欒': '错误',
  '鍥剧墖': '图片',
  '鎴愬姛': '成功',
  '鍙栨秷': '取消',
  '鍙戝竷': '发布',
  '鑽夌': '草稿',
  '褰掓': '归档',
  '鏃犳硶': '无法',
  '绔犺妭': '章节',
  '娌℃湁': '没有',
  '鍏ㄩ儴': '全部',
  '鎿嶄綔': '操作',
  '鏈煡': '未知',
  '鍙敓鎴?': '可生成',
  '鎵€閫?': '所选',
  '閮?': '都',
  '鎵归噺': '批量',
  '姝e湪': '正在',
  '涓珷鑺?': '个章节',
  '鍙彂甯?': '可发布',
  '涓嶇鍚?': '不符合',
  '鏉′欢': '条件',
  '鎻愮ず': '提示',
  '鍕鹃€?': '勾选',
  '鍏ㄩ€?': '全选',
  '宸查€?': '已选',
  '纭': '确',
  '瀹氳': '定要',
  '璇?': '请',
  '鍏?': '先',
  '宸?': '已',
  '涓?': '不',
  '涓?': '为',
  '涓?': '个',
  '绗?': '第',
  '绔?': '章',
  '鍙?': '可',
  '闂': '问',
  '棰?': '题',
  '浠ヤ笅': '以下',
  '瀛?': '存',
  '鍦?': '在',
  '杩?': '还',
  '路': ' · ',
  'AI': 'AI',
};

const filesToFix = [
  'src/app/scripts/[id]/page.tsx',
  'src/components/SerialChapterList.tsx'
];

filesToFix.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');

    // 移除BOM如果存在
    content = content.replace(/^\uFEFF/, '');

    // 按长度降序排序，确保先替换长字符串
    const entries = Object.entries(encodingFixes).sort((a, b) => b[0].length - a[0].length);

    // 应用所有修复
    entries.forEach(([from, to]) => {
      content = content.split(from).join(to);
    });

    // 特殊修复：将模板字符串转换为 JSX Fragment
    if (filePath.includes('SerialChapterList')) {
      // 修复第 418 行的模板字符串
      content = content.replace(
        /\{isBatchMode \? `已选\$\{selectedChapters\.size\} 章` : "全选"\}/g,
        '{isBatchMode ? <>已选 {selectedChapters.size} 章</> : "全选"}'
      );

      // 修复第 330 行的模板字符串
      content = content.replace(
        /\{isBatchMode && `  ·  已选\$\{selectedChapters\.size\} 章`\}/g,
        '{isBatchMode && <> · 已选 {selectedChapters.size} 章</>}'
      );
    }

    // 修复 page.tsx 中的 useCallback 格式问题
    if (filePath.includes('page.tsx')) {
      // 修复第 51 行的 useCallback 换行问题
      content = content.replace(
        /useCallback\(async \(\) => \{\`r\`n    await Promise\.all\(\[refetchStory\(\), refetchPanels\(\)\]\);\`r\`n  \}, \[refetchStory, refetchPanels\]\);/g,
        'useCallback(async () => {\n    await Promise.all([refetchStory(), refetchPanels()]);\n  }, [refetchStory, refetchPanels]);'
      );

      // 修复所有未闭合的 successMessage 字符串
      content = content.replace(/\{ successMessage: "([^"]+) \}/g, '{ successMessage: "$1" }');
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
  }
});

console.log('\nEncoding fix complete!');

