/**
 * 漫画生成器 - 生成漫画图片
 */
class ComicGenerator {
  constructor(config) {
    this.config = config;
  }

  /**
   * 将多张图片合成为一张漫画
   * @param {Array} imageUrls - 图片URL数组
   * @param {number} columns - 每行几格（默认2）
   * @returns {Promise<string>} - 合成后的图片base64
   */
  async mergeImagesIntoComic(imageUrls, columns = 2) {
    return new Promise(async (resolve, reject) => {
      try {
        // 加载所有图片
        const images = await Promise.all(
          imageUrls.map(url => this.loadImage(url))
        );

        // 计算布局
        const rows = Math.ceil(images.length / columns);
        const imgWidth = images[0].width;
        const imgHeight = images[0].height;
        const padding = 20; // 分镜之间的间距
        const canvasWidth = columns * imgWidth + (columns + 1) * padding;
        const canvasHeight = rows * imgHeight + (rows + 1) * padding;

        // 创建Canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        // 白色背景
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // 绘制每一格
        images.forEach((img, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          const x = padding + col * (imgWidth + padding);
          const y = padding + row * (imgHeight + padding);

          // 绘制图片
          ctx.drawImage(img, x, y, imgWidth, imgHeight);

          // 绘制边框
          ctx.strokeStyle = '#E0E0E0';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, imgWidth, imgHeight);

          // 绘制分镜编号
          ctx.fillStyle = 'rgba(102, 126, 234, 0.9)';
          ctx.font = 'bold 24px Arial';
          ctx.fillText(`${index + 1}`, x + 10, y + 35);
        });

        // 转换为base64
        const mergedImage = canvas.toDataURL('image/png');
        resolve(mergedImage);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 加载图片
   */
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * 根据分镜描述生成单张漫画图片
   * @param {Object} panel - 分镜数据
   * @param {string} referenceImageBase64 - 参考图片的base64数据
   * @param {string} style - 漫画风格
   * @param {boolean} enableText - 是否生成对话文字（默认false，生成空白对话框）
   * @returns {Promise<string>} - 图片URL或base64
   */
  async generatePanelImage(panel, referenceImageBase64, style, enableText = false) {
    try {
      const prompt = this.buildImagePrompt(panel, style, enableText);
      
      // 构建消息内容，包含参考图片
      const messageContent = [];
      
      // 添加参考图片
      if (referenceImageBase64) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${referenceImageBase64}`
          }
        });
      }
      
      // 添加文本提示
      messageContent.push({
        type: "text",
        text: prompt
      });
      
      const requestData = {
        model: this.config.COMIC_MODEL,
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        temperature: 0.7,
        max_tokens: 4096
      };

      const response = await fetch(`${this.config.COMIC_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.COMIC_API_KEY}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API错误: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // 从响应中提取图片URL
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        
        // 检查是否返回的是文字描述而不是图片
        if (content.length > 500 && !content.includes('![image]') && !content.includes('http')) {
          console.warn('API返回了文字描述而不是图片:', content.substring(0, 200));
          throw new Error('API返回了文字描述而不是图片。请在提示词中明确要求"直接生成图片"。');
        }
        
        // 提取markdown格式中的图片URL: ![image](url)
        const imageUrl = this.extractImageUrl(content);
        if (imageUrl) {
          return imageUrl;
        }
        
        // 如果没有找到图片URL，打印完整内容用于调试
        console.error('无法提取图片URL，API返回内容:', content);
      }
      
      throw new Error('图片生成失败：响应中没有找到图片URL');
    } catch (error) {
      console.error(`生成分镜 ${panel.panelNumber} 失败:`, error);
      throw error;
    }
  }

  /**
   * 从markdown内容中提取图片URL
   * @param {string} content - API返回的内容
   * @returns {string|null} - 图片URL
   */
  extractImageUrl(content) {
    // 匹配 ![image](url) 或 ![...](url) 格式
    const match = content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  }

  /**
   * 生成单张完整漫画（所有分镜合并，只调用1次API）
   * @param {Object} storyboard - 完整的分镜数据
   * @param {string} referenceImageBase64 - 参考图片
   * @param {boolean} enableText - 是否生成对话文字（默认false，生成空白对话框）
   * @returns {Promise<string>} - 图片URL或base64
   */
  async generateSingleComicImage(storyboard, referenceImageBase64, enableText = false) {
    try {
      // 合并所有分镜的提示词
      const combinedPrompt = this.buildCombinedPrompt(storyboard, enableText);
      
      // 构建消息内容，包含参考图片
      const messageContent = [];
      
      // 添加参考图片
      if (referenceImageBase64) {
        messageContent.push({
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${referenceImageBase64}`
          }
        });
      }
      
      // 添加文本提示
      messageContent.push({
        type: "text",
        text: combinedPrompt
      });
      
      const requestData = {
        model: this.config.COMIC_MODEL,
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        temperature: 0.7,
        max_tokens: 4096
      };

      const response = await fetch(`${this.config.COMIC_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.COMIC_API_KEY}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API错误: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content;
        
        // 检查是否返回的是文字描述而不是图片
        if (content.length > 500 && !content.includes('![image]') && !content.includes('http')) {
          console.warn('API返回了文字描述而不是图片:', content.substring(0, 200));
          throw new Error('API返回了文字描述而不是图片。请尝试在提示词中更明确地要求"直接生成图片，不要文字描述"。');
        }
        
        // 提取图片URL
        const imageUrl = this.extractImageUrl(content);
        if (imageUrl) {
          return imageUrl;
        }
        
        // 如果没有找到图片URL，打印完整内容用于调试
        console.error('无法提取图片URL，API返回内容:', content);
      }
      
      throw new Error('图片生成失败：响应中没有找到图片URL');
    } catch (error) {
      console.error('生成单张完整漫画失败:', error);
      throw error;
    }
  }

  /**
   * 生成所有分镜的图片
   * @param {Array} panels - 分镜数组
   * @param {string} referenceImageBase64 - 参考图片base64
   * @param {string} style - 漫画风格
   * @param {Function} onProgress - 进度回调
   * @param {boolean} enableText - 是否生成对话文字（默认false，生成空白对话框）
   * @returns {Promise<Array>} - 包含图片URL的分镜数组
   */
  async generateAllPanels(panels, referenceImageBase64, style, onProgress, enableText = false) {
    const results = [];
    const total = panels.length;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      
      try {
        // 通知进度
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: total,
            panel: panel,
            status: 'generating'
          });
        }

        // 生成图片
        const imageUrl = await this.generatePanelImage(panel, referenceImageBase64, style, enableText);
        
        // 添加到结果
        const resultPanel = {
          ...panel,
          imageUrl: imageUrl
        };
        results.push(resultPanel);

        // 通知完成
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: total,
            panel: resultPanel,
            status: 'completed'
          });
        }

        // 避免API限流，添加延迟
        if (i < panels.length - 1) {
          await this.delay(1000);
        }
      } catch (error) {
        // 通知错误
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: total,
            panel: panel,
            status: 'error',
            error: error.message
          });
        }

        // 添加错误标记的结果
        results.push({
          ...panel,
          imageUrl: null,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 简化对话文字（提高AI生成成功率）
   * 规则：中文不超过4字，复杂内容转为英文短词
   */
  simplifyDialogue(dialogue) {
    if (!dialogue) return null;
    
    // 如果已经很短，直接返回
    if (dialogue.length <= 4) return dialogue;
    
    // 常见情绪/表达的简化映射
    const simplifyMap = {
      '再跑不通我就原地爆炸': 'BUG!!',
      '这个bug太难了': 'BUG!!',
      '代码出错了': 'ERROR',
      '终于成功了': 'YES!',
      '太好了': '好!',
      '怎么办': '啊!',
      '不可能': '不!',
      '太棒了': '棒!',
      '完成了': 'DONE'
    };
    
    // 检查是否有映射
    if (simplifyMap[dialogue]) {
      return simplifyMap[dialogue];
    }
    
    // 如果是长句，截取前4个字
    return dialogue.substring(0, 4);
  }

  /**
   * 构建单个分镜的图像生成提示词
   * @param {boolean} enableText - 是否生成对话文字（false则生成空白对话框）
   */
  buildImagePrompt(panel, style, enableText = false) {
    let prompt = `GENERATE A MANGA/COMIC PANEL IMAGE DIRECTLY. DO NOT give me text descriptions!\n\n`;

    // 对话框处理：优先级最高，放在最前面
    if (panel.dialogue && enableText) {
      const simplifiedText = this.simplifyDialogue(panel.dialogue);
      prompt += `⚠️ CRITICAL TEXT REQUIREMENT (HIGHEST PRIORITY):\n`;
      prompt += `- Draw a WHITE SPEECH BALLOON with CLEAR BLACK BORDER\n`;
      prompt += `- Inside the balloon, write EXACTLY: "${simplifiedText}"\n`;
      prompt += `- Text must be BOLD, BLACK, and LARGE enough to read clearly\n`;
      prompt += `- Use a clean sans-serif font (like Arial or Helvetica)\n`;
      prompt += `- Position the balloon near the character's mouth\n`;
      prompt += `- The text "${simplifiedText}" MUST be visible and legible\n\n`;
    } else if (panel.dialogue && !enableText) {
      prompt += `⚠️ SPEECH BALLOON REQUIREMENT:\n`;
      prompt += `- Draw EMPTY white speech balloons with clear borders\n`;
      prompt += `- Keep balloons completely BLANK inside (no text)\n`;
      prompt += `- Position near character's mouth\n\n`;
    }

    prompt += `PANEL DESCRIPTION:\n`;
    prompt += `Panel #${panel.panelNumber}\n`;
    prompt += `Style: ${style} manga/comic art style\n`;
    prompt += `Scene: ${panel.sceneDescription}\n`;
    prompt += `Character Action: ${panel.characterAction}\n`;
    prompt += `Visual Details: ${panel.visualPrompt}\n\n`;

    prompt += `ARTISTIC REQUIREMENTS:\n`;
    prompt += `1. Use the character design from the reference image (hairstyle, clothing, body type)\n`;
    prompt += `2. Maintain consistent character appearance\n`;
    prompt += `3. Professional manga art: clean linework, vibrant colors, dynamic composition\n`;
    prompt += `4. Clear black panel borders\n`;

    if (panel.dialogue && enableText) {
      const simplifiedText = this.simplifyDialogue(panel.dialogue);
      prompt += `5. ⚠️ REMEMBER: The speech balloon MUST contain the text "${simplifiedText}" in bold, readable letters!\n`;
    }

    prompt += `\nGENERATE THE IMAGE NOW. Do not ask questions.`;

    return prompt;
  }

  /**
   * 构建合并的提示词（所有分镜在一张图上）
   * @param {boolean} enableText - 是否生成对话文字（false则生成空白对话框）
   */
  buildCombinedPrompt(storyboard, enableText = false) {
    const panelCount = storyboard.panels.length;
    const gridLayout = this.calculateGridLayout(panelCount);

    let prompt = `GENERATE A COMPLETE MANGA PAGE IMAGE DIRECTLY. DO NOT give me text descriptions!\n\n`;

    // 如果有对话，优先声明文字要求
    const hasDialogue = storyboard.panels.some(p => p.dialogue);
    if (hasDialogue && enableText) {
      prompt += `⚠️ CRITICAL TEXT REQUIREMENTS (HIGHEST PRIORITY):\n`;
      prompt += `- Each panel with dialogue MUST have WHITE SPEECH BALLOONS with CLEAR BLACK BORDERS\n`;
      prompt += `- Text inside balloons must be BOLD, BLACK, and LARGE enough to read\n`;
      prompt += `- Use clean sans-serif font (Arial/Helvetica)\n`;
      prompt += `- Each balloon's text is specified below with [TEXT: "..."]\n`;
      prompt += `- ALL specified text MUST be visible and legible in the final image\n\n`;
    } else if (hasDialogue && !enableText) {
      prompt += `⚠️ SPEECH BALLOON REQUIREMENT:\n`;
      prompt += `- Draw EMPTY white speech balloons (no text inside)\n`;
      prompt += `- Keep balloons completely BLANK - I will add text later\n\n`;
    }

    prompt += `MANGA PAGE LAYOUT:\n`;
    prompt += `Title: "${storyboard.title}"\n`;
    prompt += `Style: ${storyboard.style} manga/comic art\n`;
    prompt += `Grid: ${gridLayout.rows} rows × ${gridLayout.cols} columns\n`;
    prompt += `Total Panels: ${panelCount}\n\n`;

    prompt += `PANEL CONTENTS (left to right, top to bottom):\n\n`;

    storyboard.panels.forEach((panel) => {
      prompt += `=== PANEL ${panel.panelNumber} ===\n`;
      prompt += `Scene: ${panel.sceneDescription}\n`;
      prompt += `Action: ${panel.characterAction}\n`;
      prompt += `Visual: ${panel.visualPrompt}\n`;

      // 文字指令使用醒目标记
      if (panel.dialogue && enableText) {
        const simplifiedText = this.simplifyDialogue(panel.dialogue);
        prompt += `⚠️ [TEXT: "${simplifiedText}"] - This text MUST appear in a speech balloon in Panel ${panel.panelNumber}\n`;
      }
      prompt += `\n`;
    });

    prompt += `ARTISTIC REQUIREMENTS:\n`;
    prompt += `1. Draw all ${panelCount} panels on ONE image in ${gridLayout.rows}×${gridLayout.cols} grid layout\n`;
    prompt += `2. Add clear BLACK BORDERS between panels\n`;
    prompt += `3. Number each panel (1, 2, 3...)\n`;
    prompt += `4. Use character design from reference image - maintain consistent appearance across ALL panels\n`;
    prompt += `5. Professional ${storyboard.style} manga style: clean linework, vibrant colors, dynamic composition\n`;

    // 再次强调文字要求
    if (enableText) {
      prompt += `6. ⚠️ CRITICAL: Draw white speech balloons with the specified [TEXT: "..."] in BOLD, LEGIBLE letters for each panel\n`;
    } else {
      prompt += `6. Draw EMPTY speech balloons (no text inside)\n`;
    }

    prompt += `7. Make it look like a traditional manga/comic book page\n`;
    prompt += `\nGENERATE THE COMPLETE MANGA PAGE NOW. Do not ask questions.`;

    return prompt;
  }

  /**
   * 计算网格布局
   */
  calculateGridLayout(panelCount) {
    const layouts = {
      1: { rows: 1, cols: 1 },
      2: { rows: 1, cols: 2 },
      3: { rows: 1, cols: 3 },
      4: { rows: 2, cols: 2 },
      5: { rows: 2, cols: 3 },
      6: { rows: 2, cols: 3 },
      7: { rows: 3, cols: 3 },
      8: { rows: 3, cols: 3 },
      9: { rows: 3, cols: 3 }
    };
    
    return layouts[panelCount] || { rows: 3, cols: 3 };
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 下载图片到本地（转base64）
   */
  async downloadImageAsBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('下载图片失败:', error);
      throw error;
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComicGenerator;
}

