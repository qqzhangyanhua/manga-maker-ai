const fs = require('fs');

const filePath = 'src/app/scripts/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Step 1: 修复编码问题
const encodingFixes = {
  '鍓ф湰宸蹭繚瀛?': '剧本已保存',
  '鍒嗛暅宸插垹闄?': '分镜已删除',
  '瑙掕壊宸叉坊鍔犲埌鏁呬簨': '角色已添加到故事',
  '瑙掕壊宸蹭粠鏁呬簨绉婚櫎': '角色已从故事移除',
  '瑙掕壊绫诲瀷宸叉洿鏂?': '角色类型已更新',
  '鏁呬簨涓嶅瓨鍦?': '故事不存在',
  '鍒犻櫎鍒嗛暅澶辫触': '删除分镜失败',
  'AI鐢熸垚鐨勬极鐢婚」鐩?': 'AI生成的漫画项目',
  '鍒涘缓椤圭洰': '创建项目',
  'AI 宸叉垚鍔熼噸鏂扮敓鎴愬垎闀滆剼鏈?': 'AI 已成功重新生成分镜脚本',
  'AI 宸叉垚鍔熻拷鍔犳柊鐨勫垎闀滆剼鏈?': 'AI 已成功追加新的分镜脚本',
  '鏈壘鍒板墽鏈?': '未找到剧本',
  '鍥剧墖鐢熸垚鎴愬姛': '图片生成成功',
  '閿欒': '错误',
  '杩斿洖鍒楄〃': '返回列表',
};

Object.entries(encodingFixes).forEach(([from, to]) => {
  content = content.split(from).join(to);
});

// Step 2: 修复 useCallback 中的换行符
content = content.replace(
  /useCallback\(async \(\) => \{`r`n    await Promise\.all\(\[refetchStory\(\), refetchPanels\(\)\]\);`r`n  \}, \[refetchStory, refetchPanels\]\);/g,
  'useCallback(async () => {\n    await Promise.all([refetchStory(), refetchPanels()]);\n  }, [refetchStory, refetchPanels]);'
);

// Step 3: 修复所有未闭合的 successMessage 字符串
content = content.replace(/successMessage: "([^"]+) \}/g, 'successMessage: "$1" }');

// Step 4: 修复 toast title 字符串
content = content.replace(/toast\(\{ title: "([^"]+), variant:/g, 'toast({ title: "$1", variant:');

// Step 5: 修复未闭合的 description 字符串
content = content.replace(/description: data\.story\.premise \|\| "([^"]+),/g, 'description: data.story.premise || "$1",');

// Step 6: 修复 throw new Error 中的字符串
content = content.replace(/throw new Error\(error\.error \|\| "([^"]+)"\);/g, 'throw new Error(error.error || "$1");');

// Step 7: 修复三元运算符中的字符串
content = content.replace(/\? "([^"]+)"\s*:\s*"([^"]+),/g, '? "$1"\n          : "$2",');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('✓ Fixed page.tsx');
