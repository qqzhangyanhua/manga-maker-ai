const fs = require('fs');

const filePath = 'src/components/SerialChapterList.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 使用字符串替换而不是行替换，以确保能匹配到原始内容
const replacements = [
  // Line 196 - 发布状态
  { from: /title: currentStatus === "published" \? "宸插彇娑堝彂甯? : "鍙戝竷鎴愬姛",/, to: 'title: currentStatus === "published" ? "已取消发布" : "发布成功",' },

  // Line 276-277 - 批量发布
  { from: /title: "娌℃湁鍙彂甯冪殑章节",/, to: 'title: "没有可发布的章节",' },
  { from: /description: "鎵€閫夌珷鑺傞兘宸插彂甯冩垨涓嶇鍚堝彂甯冩潯浠?,/, to: 'description: "所选章节都已发布或不符合发布条件",' },

  // Line 329-330 - 已发布/草稿统计
  { from: /宸插彂甯?\s\{publishedCount\}\s章\s路\s\s草稿\s\{draftCount\}\s章/, to: '已发布 {publishedCount} 章 · 草稿 {draftCount} 章' },
  { from: /\{isBatchMode && `\s\s路\s\s宸查€?\$\{selectedChapters\.size\}\s绔燻\}/, to: '{isBatchMode && <> · 已选 {selectedChapters.size} 章</>}' },

  // Line 401 - 还没有章节
  { from: /<p className="mb-4">杩樻病鏈夌珷鑺?<\/p>/, to: '<p className="mb-4">还没有章节</p>' },

  // Line 404 - 创建第一章
  { from: /鍒涘缓绗竴章/, to: '创建第一章' },

  // Line 409 - 批量操作工具栏
  { from: /\{\/\* 批量操作宸ュ叿鏍?\*\/\}/, to: '{/* 批量操作工具栏 */}' },

  // Line 418 - 已选/全选 (最关键的修复)
  { from: /\{isBatchMode \? `宸查€?\$\{selectedChapters\.size\}\s绔燻\s:\s"鍏ㄩ€?\}/, to: '{isBatchMode ? <>已选 {selectedChapters.size} 章</> : "全选"}' },

  // Line 423 - 提示勾选
  { from: /鎻愮ず锛氬嬀閫夌珷鑺傚彲鎵归噺鎿嶄綔/, to: '提示：勾选章节可批量操作' },

  // Line 594 - 确定要发布吗
  { from: /璇ョ珷鑺傚瓨鍦ㄤ互涓嬮棶棰橈紝纭畾瑕佸彂甯冨悧锛?/, to: '该章节存在以下问题，确定要发布吗？' },
];

let fixCount = 0;
replacements.forEach(({ from, to }) => {
  if (content.match(from)) {
    content = content.replace(from, to);
    fixCount++;
  }
});

// 写回文件
fs.writeFileSync(filePath, content, 'utf-8');

console.log(`✓ 修复了 ${fixCount} 处编码问题`);

