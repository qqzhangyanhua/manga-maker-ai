// API配置示例文件
// 使用方法：
// 1. 复制本文件并重命名为 config.js
// 2. 填入你的实际API密钥
// 3. 根据需要调整其他配置

const CONFIG = {
  // ========== 分镜生成配置（GPT模型） ==========
  
  // GPT API密钥（必填）
  // 获取方式：https://platform.openai.com/api-keys
  // 可以与DALL-E使用相同的密钥，也可以使用不同账号的密钥
  STORYBOARD_API_KEY: 'sk-your-openai-api-key-for-gpt',
  
  // GPT API基础地址
  // 国内用户如果需要使用代理，可以修改此地址
  STORYBOARD_API_BASE: 'https://api.openai.com/v1',
  // 示例代理：'https://your-proxy.com/v1'
  
  // 使用的GPT模型
  // 选项：
  //   - 'gpt-4o' (推荐) - 最新最强模型，效果最好
  //   - 'gpt-4-turbo' - 平衡性能与成本
  //   - 'gpt-4' - GPT-4标准版
  //   - 'gpt-3.5-turbo' - 最经济实惠
  STORYBOARD_MODEL: 'gpt-4o',
  
  // 创意温度 (0-1)
  // 越高越有创意，但可能偏离主题
  // 推荐值：0.7
  STORYBOARD_TEMPERATURE: 0.7,
  
  // ========== 漫画生成配置（DALL-E模型） ==========
  
  // DALL-E API密钥（必填）
  // 可以与GPT使用相同的密钥，也可以使用不同账号的密钥
  // 分开配置的好处：不同的限额管理、不同的代理地址
  COMIC_API_KEY: 'sk-your-openai-api-key-for-dalle',
  
  // DALL-E API基础地址
  // 国内用户如果需要使用代理，可以修改此地址
  COMIC_API_BASE: 'https://api.openai.com/v1',
  // 示例代理：'https://your-proxy.com/v1'
  
  // 使用的DALL-E模型
  // 选项：
  //   - 'dall-e-3' (推荐) - 质量最高，支持更多尺寸
  //   - 'dall-e-2' - 较经济的选择
  COMIC_MODEL: 'dall-e-3',
  
  // 图片尺寸
  // DALL-E 3支持的尺寸：
  //   - '1024x1024' (推荐) - 正方形，适合大多数场景
  //   - '1792x1024' - 横向宽幅，适合全景场景
  //   - '1024x1792' - 纵向长幅，适合竖版漫画
  // DALL-E 2支持的尺寸：
  //   - '1024x1024', '512x512', '256x256'
  COMIC_SIZE: '1024x1024',
  
  // 图片质量（仅DALL-E 3支持）
  // 选项：
  //   - 'standard' (推荐) - 标准质量
  //   - 'hd' - 高清质量（价格翻倍）
  COMIC_QUALITY: 'standard',
  
  // 图片风格（仅DALL-E 3支持）
  // 选项：
  //   - 'vivid' (推荐) - 鲜艳生动，适合漫画
  //   - 'natural' - 自然风格，适合写实
  COMIC_STYLE: 'vivid',
  
  // ========== 其他配置 ==========
  
  // 默认分镜数量
  // 推荐：6格（完整故事）
  // 可选：4-9格
  DEFAULT_PANEL_COUNT: 6,
  
  // 文件上传限制（字节）
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // 允许的文件类型
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// ========== 成本参考 ==========

// GPT模型定价（截至2024年）：
// - gpt-4o: $5.00 / 1M input tokens, $15.00 / 1M output tokens
// - gpt-4-turbo: $10.00 / 1M input tokens, $30.00 / 1M output tokens
// - gpt-3.5-turbo: $0.50 / 1M input tokens, $1.50 / 1M output tokens

// DALL-E定价：
// - DALL-E 3 (1024×1024, standard): $0.040 / 张
// - DALL-E 3 (1024×1024, hd): $0.080 / 张
// - DALL-E 3 (1792×1024, standard): $0.080 / 张
// - DALL-E 2 (1024×1024): $0.020 / 张

// 示例：生成6格漫画的成本
// 配置1（推荐）：GPT-4o + DALL-E 3 (standard)
//   - 分镜生成：约$0.10
//   - 图片生成：6 × $0.04 = $0.24
//   - 总计：约$0.34

// 配置2（经济）：GPT-3.5-turbo + DALL-E 2
//   - 分镜生成：约$0.01
//   - 图片生成：6 × $0.02 = $0.12
//   - 总计：约$0.13

// 配置3（高质量）：GPT-4o + DALL-E 3 (hd)
//   - 分镜生成：约$0.10
//   - 图片生成：6 × $0.08 = $0.48
//   - 总计：约$0.58

// ========== 国内用户注意事项 ==========

// 1. 网络访问
//    OpenAI API在中国大陆可能需要使用代理
//    可以使用以下方案：
//    - VPN/代理服务
//    - API转发服务
//    - 修改OPENAI_API_BASE为代理地址

// 2. 支付问题
//    - 需要国际信用卡（Visa/Mastercard）
//    - 或使用第三方充值服务
//    - 注意账户余额

// 3. 合规使用
//    - 遵守OpenAI使用政策
//    - 不生成违规内容
//    - 注意内容审核

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

