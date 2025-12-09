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
   * 根据分镜描述生成单张漫画图片（流式）
   * @param {Object} panel - 分镜数据
   * @param {string} referenceImageBase64 - 参考图片的base64数据
   * @param {string} style - 漫画风格
   * @param {boolean} enableText - 是否生成对话文字（默认false，生成空白对话框）
   * @param {Function} onProgress - 进度回调函数 (progress) => void
   * @returns {Promise<string>} - 图片URL或base64
   */
  async generatePanelImage(panel, referenceImageBase64, style, enableText = false, onProgress = null) {
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
        max_tokens: 4096,
        stream: true // 启用流式响应
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

      // 处理流式响应
      return await this.handleStreamResponse(response, panel.panelNumber, onProgress);
    } catch (error) {
      console.error(`生成分镜 ${panel.panelNumber} 失败:`, error);
      throw error;
    }
  }

  /**
   * 处理流式响应
   * @param {Response} response - fetch响应对象
   * @param {number} panelNumber - 分镜编号
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<string>} - 图片URL
   */
  async handleStreamResponse(response, panelNumber, onProgress) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解码数据块
        buffer += decoder.decode(value, { stream: true });

        // 按行分割处理SSE数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一个不完整的行

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine || trimmedLine === 'data: [DONE]') {
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6); // 去掉 "data: " 前缀
              const data = JSON.parse(jsonStr);

              // 提取增量内容
              if (data.choices && data.choices[0]) {
                const delta = data.choices[0].delta;

                if (delta && delta.content) {
                  fullContent += delta.content;

                  // 调用进度回调
                  if (onProgress) {
                    onProgress({
                      type: 'content',
                      content: fullContent,
                      delta: delta.content,
                      panelNumber: panelNumber
                    });
                  }
                }

                // 检查是否完成
                if (data.choices[0].finish_reason) {
                  if (onProgress) {
                    onProgress({
                      type: 'finish',
                      reason: data.choices[0].finish_reason,
                      panelNumber: panelNumber
                    });
                  }
                }
              }
            } catch (parseError) {
              console.warn('解析流数据失败:', trimmedLine, parseError);
            }
          }
        }
      }

      // 从完整内容中提取图片URL
      if (fullContent.length > 500 && !fullContent.includes('![image]') && !fullContent.includes('http')) {
        console.warn('API返回了文字描述而不是图片:', fullContent.substring(0, 200));
        throw new Error('API返回了文字描述而不是图片。请在提示词中明确要求"直接生成图片"。');
      }

      const imageUrl = this.extractImageUrl(fullContent);
      if (imageUrl) {
        return imageUrl;
      }

      console.error('无法提取图片URL，API返回内容:', fullContent);
      throw new Error('图片生成失败：响应中没有找到图片URL');
    } finally {
      reader.releaseLock();
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
   * 生成单张完整漫画（所有分镜合并，只调用1次API）- 流式版本
   * @param {Object} storyboard - 完整的分镜数据
   * @param {string} referenceImageBase64 - 参考图片
   * @param {boolean} enableText - 是否生成对话文字（默认false，生成空白对话框）
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise<string>} - 图片URL或base64
   */
  async generateSingleComicImage(storyboard, referenceImageBase64, enableText = false, onProgress = null) {
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
        max_tokens: 4096,
        stream: true // 启用流式响应
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

      // 处理流式响应
      return await this.handleStreamResponse(response, 'merged', onProgress);
    } catch (error) {
      console.error('生成单张完整漫画失败:', error);
      throw error;
    }
  }

  /**
   * 生成所有分镜的图片（流式）
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

        // 生成图片，带流式进度回调
        const imageUrl = await this.generatePanelImage(
          panel,
          referenceImageBase64,
          style,
          enableText,
          (streamProgress) => {
            // 转发流式进度到外部回调
            if (onProgress) {
              onProgress({
                current: i + 1,
                total: total,
                panel: panel,
                status: 'streaming',
                streamProgress: streamProgress
              });
            }
          }
        );

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
   * 规则：
   * 1. 中文不超过6字（漫画对话建议长度）
   * 2. 英文不超过15字符
   * 3. 优先使用简短情绪表达
   * 4. 复杂句子提取关键词
   */
  simplifyDialogue(dialogue) {
    if (!dialogue) return null;

    // 去除前后空格
    dialogue = dialogue.trim();

    // 常见对话的简化映射（优先匹配）
    const simplifyMap = {
      // 兔子健身相关
      '我...我真的能变强吗？': '能变强吗？',
      '好重啊...但是我不能放弃！': '不能放弃！',
      '为什么还是没有进步呢...': '没进步啊...',
      '原来是训练方法不对！': '方法不对！',
      '我能感觉到自己在变强！': '在变强！',
      '我做到了！这就是努力的成果！': '我做到了！',

      // 小猫料理相关
      '今天要做出最美味的料理！': '最美味！',
      '呜哇！糟糕了！': '糟了！',
      '我果然不适合当厨师吗...': '不适合吗...',
      '料理的秘诀在于用心和耐心！': '用心耐心！',
      '一步一步，慢慢来...': '慢慢来...',
      '这是我做的第一道成功的料理！': '成功了！',

      // 机器人朋友相关
      '大家都有朋友...只有我一个人...': '好孤单...',
      '对不起...我不是想吓到你们...': '对不起...',
      '你也怕淋雨吗？我们一起躲雨吧！': '一起躲雨！',
      '你是我的第一个朋友！': '第一个朋友！',
      '有了朋友，世界变得好美丽！': '世界真美！',

      // 小龙面包店相关
      '啊！火太大了！': '火太大！',
      '我的火焰总是控制不好...': '控制不好...',
      '没有人要买我的面包...': '没人买...',
      '原来可以用小火慢烤！': '小火慢烤！',
      '小火、慢烤、耐心...': '小火慢烤...',
      '谢谢大家！这是世界上最好吃的龙焰面包！': '最好吃！',

      // 通用情绪表达
      '太好了': '太好了！',
      '太棒了': '棒！',
      '怎么办': '怎么办？',
      '不可能': '不！',
      '完成了': '完成！',
      '终于成功了': '成功！',
      '加油': '加油！',
      '继续努力': '努力！',
      '再试一次': '再试！',
      '这个bug太难了': 'BUG！',
      '代码出错了': 'ERROR！'
    };

    // 检查是否有精确匹配
    if (simplifyMap[dialogue]) {
      return simplifyMap[dialogue];
    }

    // 如果对话已经很短，直接返回（中文6字以内，英文15字符以内）
    const isChinese = /[\u4e00-\u9fa5]/.test(dialogue);
    if (isChinese && dialogue.length <= 6) {
      return dialogue;
    }
    if (!isChinese && dialogue.length <= 15) {
      return dialogue;
    }

    // 提取关键词（移除语气词、连接词等）
    let simplified = dialogue
      .replace(/嗯|啊|呀|哦|哈|唉|吧|呢|吗|的|了|着|过/g, '')
      .trim();

    // 如果简化后太长，截取前6个中文字符或15个英文字符
    if (isChinese) {
      return simplified.substring(0, 6) + (simplified.length > 6 ? '...' : '');
    } else {
      return simplified.substring(0, 15) + (simplified.length > 15 ? '...' : '');
    }
  }

  /**
   * 构建单个分镜的图像生成提示词
   * @param {boolean} enableText - 是否生成对话文字（默认true，如果有对话就生成文字）
   */
  buildImagePrompt(panel, style, enableText = true) {
    let prompt = `You are a professional manga artist. Generate a comic panel image directly.\n\n`;

    // 如果有对话且启用文字，优先级最高
    if (panel.dialogue && enableText) {
      const simplifiedText = this.simplifyDialogue(panel.dialogue);
      prompt += `🎯 TEXT IN SPEECH BALLOON (MOST IMPORTANT!):\n`;
      prompt += `Write exactly these characters in a speech balloon: "${simplifiedText}"\n`;
      prompt += `Speech balloon style:\n`;
      prompt += `- White balloon with black outline\n`;
      prompt += `- Position near character's face/mouth\n`;
      prompt += `- Text: "${simplifiedText}" in bold, clear, black letters\n`;
      prompt += `- Font size must be large and easy to read\n`;
      prompt += `- This is CRITICAL - the text MUST appear in the image!\n\n`;
    } else if (panel.dialogue && !enableText) {
      prompt += `Speech Balloon: Draw empty white speech balloons (no text inside).\n\n`;
    }

    prompt += `Scene Details:\n`;
    prompt += `- Panel ${panel.panelNumber} of manga/comic\n`;
    prompt += `- Style: ${style}\n`;
    prompt += `- Scene: ${panel.sceneDescription}\n`;
    prompt += `- Character: ${panel.characterAction}\n`;
    prompt += `- Details: ${panel.visualPrompt}\n\n`;

    prompt += `Visual Requirements:\n`;
    prompt += `1. Match character appearance from reference image (face, hair, clothes, body)\n`;
    prompt += `2. Clean manga linework with vibrant colors\n`;
    prompt += `3. Dynamic composition and camera angle\n`;

    if (panel.dialogue && enableText) {
      const simplifiedText = this.simplifyDialogue(panel.dialogue);
      prompt += `4. 🎯 CRITICAL: Include speech balloon with text "${simplifiedText}" - this is mandatory!\n`;
    } else {
      prompt += `4. Professional comic panel style\n`;
    }

    prompt += `\n⚠️ Generate the manga panel image now. Output the image directly, do not describe it in text.`;

    return prompt;
  }

  /**
   * 构建合并的提示词（所有分镜在一张图上）
   * @param {boolean} enableText - 是否生成对话文字（默认true）
   */
  buildCombinedPrompt(storyboard, enableText = true) {
    const panelCount = storyboard.panels.length;
    const gridLayout = this.calculateGridLayout(panelCount);

    let prompt = `You are a professional manga artist. Create a complete manga page with ${panelCount} panels.\n\n`;

    // 如果有对话，优先声明文字要求
    const panelsWithDialogue = storyboard.panels.filter(p => p.dialogue);
    if (panelsWithDialogue.length > 0 && enableText) {
      prompt += `🎯 TEXT IN SPEECH BALLOONS (CRITICAL!):\n`;
      panelsWithDialogue.forEach(panel => {
        const simplifiedText = this.simplifyDialogue(panel.dialogue);
        prompt += `Panel ${panel.panelNumber}: Write "${simplifiedText}" in a speech balloon\n`;
      });
      prompt += `\nBalloon style: White background, black outline, bold black text, large and readable.\n`;
      prompt += `⚠️ ALL text above MUST appear in the final image!\n\n`;
    } else if (panelsWithDialogue.length > 0 && !enableText) {
      prompt += `Speech Balloons: Draw empty white balloons (no text inside) where dialogue is indicated.\n\n`;
    }

    prompt += `Page Layout:\n`;
    prompt += `- Title: ${storyboard.title}\n`;
    prompt += `- Style: ${storyboard.style}\n`;
    prompt += `- Grid: ${gridLayout.rows} rows × ${gridLayout.cols} columns\n`;
    prompt += `- Total: ${panelCount} panels\n\n`;

    prompt += `Panel Contents (left to right, top to bottom):\n\n`;

    storyboard.panels.forEach((panel) => {
      prompt += `[Panel ${panel.panelNumber}]\n`;
      prompt += `Scene: ${panel.sceneDescription}\n`;
      prompt += `Character: ${panel.characterAction}\n`;
      if (panel.dialogue && enableText) {
        const simplifiedText = this.simplifyDialogue(panel.dialogue);
        prompt += `🎯 TEXT: "${simplifiedText}" (must appear in balloon)\n`;
      }
      prompt += `\n`;
    });

    prompt += `Requirements:\n`;
    prompt += `1. Draw all ${panelCount} panels in ${gridLayout.rows}×${gridLayout.cols} grid\n`;
    prompt += `2. Black borders between panels\n`;
    prompt += `3. Number each panel (1, 2, 3...)\n`;
    prompt += `4. Match character from reference image (face, hair, clothes)\n`;
    prompt += `5. ${storyboard.style} manga style: clean lines, vibrant colors\n`;

    if (enableText && panelsWithDialogue.length > 0) {
      prompt += `6. 🎯 CRITICAL: Include speech balloons with the specified text in bold, legible letters\n`;
    } else {
      prompt += `6. Professional manga page layout\n`;
    }

    prompt += `\n⚠️ Generate the complete manga page now. Output the image directly.`;

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

