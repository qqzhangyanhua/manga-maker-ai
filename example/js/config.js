// API配置
const CONFIG = {
  // ========== 分镜生成配置（GPT模型） ==========
  STORYBOARD_API_KEY: 'sk-6xmKFtCUO7Z3qJnIoAa8D3lI6DJTfvzSYxMbafNT2FFHFDwd', // GPT API Key
  STORYBOARD_API_BASE: 'https://api.moonshot.cn/v1',
  STORYBOARD_MODEL: 'kimi-k2-0905-preview', // 或 'gpt-4-turbo' / 'gpt-3.5-turbo'
  STORYBOARD_TEMPERATURE: 0.7,

  // ========== 漫画生成配置（图像生成模型） ==========
  // https://api.67.si/
  COMIC_API_KEY: 'sk-JdGshoRJVioK0c9JpUqhhG446nS1NDh9FdoamBIYAkr4F8a6',//'sk-i4o3ljkbX1aqMHM4xP1CgrqGnC2LhqGL1gt1uzoMCklhE3OT',
  COMIC_API_BASE: "https://api.67.si/v1",//'https://duckcoding.com/v1',
  COMIC_MODEL: "jimeng-nano-banana",//'gemini-2.5-flash-image',
  // yourapi.cn
  // COMIC_API_KEY: 'sk-fT0nwWLU30PnhuzfuviHzCGvMUG1VxY9qT1uZ0z7OGfd3AcH',//'sk-i4o3ljkbX1aqMHM4xP1CgrqGnC2LhqGL1gt1uzoMCklhE3OT',
  // COMIC_API_BASE: "https://yourapi.cn/v1",//'https://duckcoding.com/v1',
  // COMIC_MODEL: "nano-banana-2",//'gemini-2.5-flash-image',
  // COMIC_API_KEY: 'sk-PnF9rKpaHkWEDOIM2m9LxrVQro4Df0IwKw2koxB8CybrypPr',//'sk-fT0nwWLU30PnhuzfuviHzCGvMUG1VxY9qT1uZ0z7OGfd3AcH',//'sk-i4o3ljkbX1aqMHM4xP1CgrqGnC2LhqGL1gt1uzoMCklhE3OT',
  // COMIC_API_BASE: "https://ai.xiangcao.de/v1",// "https://yourapi.cn/v1",//'https://duckcoding.com/v1',
  //COMIC_MODEL: 'gemini-3-pro-image-preview',//"nano-banana-2",//'gemini-2.5-flash-image',
  COMIC_SIZE: '1024x1024',
  COMIC_QUALITY: 'standard',
  COMIC_STYLE: 'vivid',

  // ========== 生成模式配置 ==========
  COMIC_GENERATION_MODE: 'single', // 'single'(单图) 或 'multiple'(多图)，默认单图
  SINGLE_IMAGE_GRID_COLS: 3, // 单图模式下每行显示几格

  // ========== 其他配置 ==========
  DEFAULT_PANEL_COUNT: 6,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

