/**
 * 分镜生成器 - 使用OpenAI生成漫画分镜描述
 */
class StoryboardGenerator {
  constructor(config) {
    this.config = config;
  }

  /**
   * 根据描述生成分镜（不需要图片）
   * @param {string} description - 用户输入的故事描述
   * @param {number} panelCount - 分镜数量
   * @returns {Promise<Array>} - 分镜数组
   */
  async generateStoryboard(description, panelCount = 6) {
    try {
      const prompt = this.buildStoryboardPrompt(description, panelCount);
      
      const requestData = {
        model: this.config.STORYBOARD_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的漫画分镜师，擅长将故事转化为生动的视觉叙事。你需要根据用户提供的故事描述，创建详细的漫画分镜脚本，包括场景、动作、对话和详细的视觉提示。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.config.STORYBOARD_TEMPERATURE,
        max_tokens: 2000
      };

      const response = await fetch(`${this.config.STORYBOARD_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.STORYBOARD_API_KEY}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API错误: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // 解析JSON响应
      const storyboardData = JSON.parse(content);
      return this.parseStoryboard(storyboardData);
    } catch (error) {
      console.error('生成分镜失败:', error);
      throw error;
    }
  }

  /**
   * 构建分镜生成提示词
   */
  buildStoryboardPrompt(description, panelCount) {
    return `请根据以下故事描述，创建一个${panelCount}格的漫画分镜脚本：

故事描述：${description}

要求：
1. 创建${panelCount}个连贯的分镜，讲述一个完整的故事
2. 每个分镜需要包含：
   - panel_number: 分镜编号（1-${panelCount}）
   - scene_description: 场景描述（中文，详细描述场景环境、构图、镜头角度）
   - character_action: 角色动作（中文，描述角色的姿态、表情、动作）
   - dialogue: 对话内容（中文，如果有对话，没有则留空）
   - visual_prompt: 视觉提示（英文，用于AI图像生成的详细prompt，包含风格、构图、光影、角色特征等）
3. 确保故事情节有起承转合，富有戏剧性
4. 漫画风格要活泼生动，适合分格漫画
5. visual_prompt要非常详细，包含：角色外观、表情、动作、场景环境、光线、构图、漫画风格等

请以JSON格式返回，格式如下：
{
  "title": "故事标题",
  "style": "漫画风格描述（如：日式漫画、美式漫画、可爱风格等）",
  "panels": [
    {
      "panel_number": 1,
      "scene_description": "场景描述",
      "character_action": "角色动作",
      "dialogue": "对话内容",
      "visual_prompt": "详细的英文视觉提示词"
    }
  ]
}`;
  }

  /**
   * 解析分镜数据
   */
  parseStoryboard(data) {
    if (!data.panels || !Array.isArray(data.panels)) {
      throw new Error('分镜数据格式错误');
    }

    return {
      title: data.title || '未命名故事',
      style: data.style || '漫画风格',
      panels: data.panels.map(panel => ({
        panelNumber: panel.panel_number,
        sceneDescription: panel.scene_description,
        characterAction: panel.character_action,
        dialogue: panel.dialogue || '',
        visualPrompt: panel.visual_prompt,
        imageUrl: null, // 将在生成图片后填充
        isEditing: false // 是否正在编辑
      }))
    };
  }

  /**
   * 流式生成分镜（如果需要实时反馈）
   */
  async generateStoryboardStream(imageBase64, description, panelCount, onProgress) {
    // 这里可以实现流式API调用，实时返回生成进度
    // 暂时使用普通方式
    return this.generateStoryboard(imageBase64, description, panelCount);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StoryboardGenerator;
}

