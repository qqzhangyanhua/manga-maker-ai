/**
 * 漫画生成应用主程序
 */
class ComicMakerApp {
  constructor() {
    this.config = CONFIG;
    this.storyboardGenerator = new StoryboardGenerator(this.config);
    this.comicGenerator = new ComicGenerator(this.config);
    
    this.originalImageData = null;
    this.storyboard = null;
    this.currentStep = 1; // 1: 输入故事, 2: 生成分镜, 3: 上传图片, 4: 生成漫画
    
    this.initializeElements();
    this.bindEvents();
    this.updateWorkflowStep(1);
  }

  initializeElements() {
    // 上传相关
    this.uploadArea = document.getElementById('uploadArea');
    this.fileInput = document.getElementById('fileInput');
    this.originalImageContainer = document.getElementById('originalImageContainer');
    this.originalImageElement = document.getElementById('originalImage');
    this.originalImageInfo = document.getElementById('originalImageInfo');

    // 描述输入
    this.descriptionInput = document.getElementById('descriptionInput');
    this.panelCountInput = document.getElementById('panelCount');

    // Mock 数据加载
    this.mockStoryboardSelect = document.getElementById('mockStoryboardSelect');
    this.loadMockBtn = document.getElementById('loadMockBtn');

    // 按钮
    this.generateStoryboardBtn = document.getElementById('generateStoryboardBtn');
    this.generateComicBtn = document.getElementById('generateComicBtn');

    // 生成模式选项
    this.outputModeMerged = document.getElementById('outputModeMerged');
    this.outputModeSeparate = document.getElementById('outputModeSeparate');

    // 结果显示
    this.storyboardContainer = document.getElementById('storyboardContainer');
    this.comicContainer = document.getElementById('comicContainer');

    // 加载和消息
    this.loading = document.getElementById('loading');
    this.loadingText = document.getElementById('loadingText');
    this.errorMessage = document.getElementById('errorMessage');
    this.successMessage = document.getElementById('successMessage');

    // 工作流步骤
    this.workflowSteps = document.querySelectorAll('.workflow-step');
  }

  bindEvents() {
    // 文件上传
    this.uploadArea.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

    // 拖拽上传
    this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

    // 输入验证
    this.descriptionInput.addEventListener('input', () => this.validateStep1());

    // Mock 数据加载
    this.loadMockBtn.addEventListener('click', () => this.loadMockStoryboard());

    // 生成按钮
    this.generateStoryboardBtn.addEventListener('click', () => this.generateStoryboard());
    this.generateComicBtn.addEventListener('click', () => this.generateComic());
  }

  // ========== 文件上传处理 ==========
  
  handleDragOver(e) {
    e.preventDefault();
    this.uploadArea.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    this.uploadArea.classList.remove('dragover');
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.processFile(files[0]);
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  processFile(file) {
    // 验证文件类型
    if (!this.config.ALLOWED_FILE_TYPES.includes(file.type)) {
      this.showError('请选择图片文件（JPG、PNG、WebP）！');
      return;
    }

    // 验证文件大小
    if (file.size > this.config.MAX_FILE_SIZE) {
      this.showError(`图片文件不能超过${this.config.MAX_FILE_SIZE / 1024 / 1024}MB！`);
      return;
    }

    this.hideMessages();

    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalImageData = e.target.result.split(',')[1]; // 只保存base64部分
      this.displayOriginalImage(e.target.result, file);
      this.validateStep1();
    };
    reader.readAsDataURL(file);
  }

  displayOriginalImage(dataUrl, file) {
    this.originalImageElement.src = dataUrl;
    this.originalImageContainer.style.display = 'block';

    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    this.originalImageInfo.innerHTML = `
      <div class="info-item">
        <span class="info-label">文件名:</span>
        <span class="info-value">${file.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">文件大小:</span>
        <span class="info-value">${fileSize} MB</span>
      </div>
      <div class="info-item">
        <span class="info-label">用途:</span>
        <span class="info-value" style="color: #667eea;">作为漫画角色参考</span>
      </div>
    `;

    // 上传图片后，检查是否可以生成漫画
    this.validateComicGeneration();

    // 如果已经有分镜，启用所有单个分镜的"生成图片"按钮
    if (this.storyboard && this.storyboard.panels.length > 0) {
      this.storyboard.panels.forEach((panel, index) => {
        const generateBtn = document.getElementById(`panel-generate-btn-${index}`);
        if (generateBtn) {
          generateBtn.disabled = false;
        }
      });
    }

    // 如果已经有分镜，则进入第3步
    if (this.storyboard && this.storyboard.panels.length > 0) {
      this.currentStep = 3;
      this.updateWorkflowStep(3);
      this.hideMessages();
      this.showSuccess('参考图片已上传！现在可以生成漫画了。');
    }
  }

  validateStep1() {
    // 分镜生成只需要描述，不需要图片
    const hasDescription = this.descriptionInput.value.trim().length > 0;
    this.generateStoryboardBtn.disabled = !hasDescription;
  }

  // ========== Mock 数据加载 ==========

  loadMockStoryboard() {
    const selectedKey = this.mockStoryboardSelect.value;

    if (!selectedKey) {
      this.showError('请先选择一个预设故事！');
      return;
    }

    this.hideMessages();

    try {
      // 从 mock-data.js 获取数据
      const mockData = getMockStoryboard(selectedKey);

      if (!mockData) {
        this.showError('找不到该预设数据！');
        return;
      }

      // 直接设置分镜数据
      this.storyboard = mockData;

      // 显示分镜
      this.displayStoryboard(this.storyboard);
      this.showSuccess(`已加载预设故事「${this.storyboard.title}」（${this.storyboard.panels.length}格分镜）`);

      // 检查是否有参考图片来决定是否启用漫画生成按钮
      this.validateComicGeneration();
      this.currentStep = 2;
      this.updateWorkflowStep(2);

      // 滚动到分镜区域
      setTimeout(() => {
        this.storyboardContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (error) {
      console.error('加载 Mock 数据失败:', error);
      this.showError(`加载失败: ${error.message}`);
    }
  }

  // ========== 分镜生成 ==========
  
  async generateStoryboard() {
    if (!this.descriptionInput.value.trim()) {
      this.showError('请先输入故事描述！');
      return;
    }

    this.hideMessages();
    this.showLoading(true, '正在生成分镜脚本...');
    this.generateStoryboardBtn.disabled = true;
    this.updateWorkflowStep(2);

    try {
      const description = this.descriptionInput.value.trim();
      const panelCount = parseInt(this.panelCountInput.value) || this.config.DEFAULT_PANEL_COUNT;

      // 调用分镜生成器（不需要图片）
      this.storyboard = await this.storyboardGenerator.generateStoryboard(
        description,
        panelCount
      );

      // 显示分镜
      this.displayStoryboard(this.storyboard);
      this.showSuccess(`成功生成${this.storyboard.panels.length}格分镜！可以编辑或重新生成。`);
      
      // 检查是否有参考图片来决定是否启用漫画生成按钮
      this.validateComicGeneration();
      this.currentStep = 2;
      this.updateWorkflowStep(2);
    } catch (error) {
      console.error('生成分镜失败:', error);
      this.showError(`生成分镜失败: ${error.message}`);
      this.updateWorkflowStep(1);
    } finally {
      this.showLoading(false);
      this.generateStoryboardBtn.disabled = false;
    }
  }

  validateComicGeneration() {
    // 漫画生成需要：分镜脚本 + 参考图片
    const hasStoryboard = this.storyboard && this.storyboard.panels.length > 0;
    const hasImage = this.originalImageData !== null;
    this.generateComicBtn.disabled = !(hasStoryboard && hasImage);
    
    // 显示提示信息
    if (hasStoryboard && !hasImage) {
      this.showError('请上传参考图片后再生成漫画！');
    }
  }

  displayStoryboard(storyboard) {
    this.storyboardContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <div class="section-title">📝 ${storyboard.title}</div>
          <div style="color: #666;">
            <strong>风格:</strong> ${storyboard.style}
          </div>
        </div>
        <button class="action-button" onclick="app.regenerateStoryboard()" style="padding: 10px 20px;">
          🔄 重新生成分镜
        </button>
      </div>
      <div class="storyboard-grid">
        ${storyboard.panels.map((panel, index) => `
          <div class="storyboard-panel" data-panel-index="${index}">
            <div class="panel-number">第 ${panel.panelNumber} 格</div>
            <div class="panel-description" id="panel-display-${index}">
              <strong>场景:</strong> ${this.escapeHtml(panel.sceneDescription)}<br>
              <strong>动作:</strong> ${this.escapeHtml(panel.characterAction)}<br>
              ${panel.dialogue ? `<strong>对话:</strong> "${this.escapeHtml(panel.dialogue)}"<br>` : ''}
              <small style="color: #999;">提示词: ${this.escapeHtml(panel.visualPrompt).substring(0, 50)}...</small>
            </div>
            <div class="panel-edit-form" id="panel-edit-${index}" style="display: none;">
              <textarea class="prompt-input" id="panel-scene-${index}" style="min-height: 60px; margin-bottom: 5px;">${this.escapeHtml(panel.sceneDescription)}</textarea>
              <textarea class="prompt-input" id="panel-action-${index}" style="min-height: 60px; margin-bottom: 5px;">${this.escapeHtml(panel.characterAction)}</textarea>
              <input type="text" class="prompt-input" id="panel-dialogue-${index}" placeholder="对话内容（可选）" value="${this.escapeHtml(panel.dialogue)}" style="min-height: 40px; margin-bottom: 5px;">
              <textarea class="prompt-input" id="panel-prompt-${index}" style="min-height: 80px; margin-bottom: 10px;">${this.escapeHtml(panel.visualPrompt)}</textarea>
              <div style="display: flex; gap: 5px;">
                <button class="action-button success" onclick="app.savePanelEdit(${index})" style="flex: 1;">
                  ✓ 保存
                </button>
                <button class="action-button" onclick="app.cancelPanelEdit(${index})" style="flex: 1; background: #6c757d;">
                  ✕ 取消
                </button>
              </div>
            </div>
            <div style="display: flex; gap: 5px; margin-top: 10px;">
              <button class="action-button" onclick="app.editPanel(${index})" id="panel-edit-btn-${index}" style="flex: 1;">
                ✏️ 编辑
              </button>
              <button class="action-button" onclick="app.generateSinglePanel(${index})" id="panel-generate-btn-${index}" style="flex: 1; background: ${panel.imageUrl ? '#ff9800' : '#28a745'};" ${!this.originalImageData ? 'disabled' : ''}>
                ${panel.imageUrl ? '🔄 重新生成' : '🎨 生成图片'}
              </button>
            </div>
            <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; margin-top: 10px; font-size: 0.85rem; color: #666;" id="panel-status-${index}">
              ${panel.imageUrl ? '<div style="color: #28a745;">✓ 已生成图片</div>' : '等待生成图片...'}
            </div>
            <div id="panel-image-${index}" style="margin-top: 10px;">
              ${panel.imageUrl ? `<img src="${panel.imageUrl}" style="width: 100%; border-radius: 8px; border: 2px solid #28a745;" alt="分镜 ${panel.panelNumber}">` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  editPanel(index) {
    const panel = this.storyboard.panels[index];
    document.getElementById(`panel-display-${index}`).style.display = 'none';
    document.getElementById(`panel-edit-${index}`).style.display = 'block';
    document.getElementById(`panel-edit-btn-${index}`).style.display = 'none';
  }

  cancelPanelEdit(index) {
    document.getElementById(`panel-display-${index}`).style.display = 'block';
    document.getElementById(`panel-edit-${index}`).style.display = 'none';
    document.getElementById(`panel-edit-btn-${index}`).style.display = 'block';
  }

  savePanelEdit(index) {
    const panel = this.storyboard.panels[index];
    const oldImageUrl = panel.imageUrl; // 保存已生成的图片
    const hadImage = !!oldImageUrl;

    panel.sceneDescription = document.getElementById(`panel-scene-${index}`).value;
    panel.characterAction = document.getElementById(`panel-action-${index}`).value;
    panel.dialogue = document.getElementById(`panel-dialogue-${index}`).value;
    panel.visualPrompt = document.getElementById(`panel-prompt-${index}`).value;
    panel.imageUrl = oldImageUrl; // 恢复已生成的图片

    if (hadImage) {
      this.showSuccess(`第 ${panel.panelNumber} 格已更新！提示：内容已修改，建议重新生成图片。`);
    } else {
      this.showSuccess(`第 ${panel.panelNumber} 格已更新！`);
    }

    this.displayStoryboard(this.storyboard);
  }

  async regenerateStoryboard() {
    if (!confirm('确定要重新生成分镜吗？当前分镜内容将被覆盖。')) {
      return;
    }
    await this.generateStoryboard();
  }

  // ========== 单个分镜生成图片 ==========

  async generateSinglePanel(index) {
    if (!this.storyboard || !this.storyboard.panels[index]) {
      this.showError('分镜不存在！');
      return;
    }

    if (!this.originalImageData) {
      this.showError('请先上传参考图片！');
      return;
    }

    const panel = this.storyboard.panels[index];

    // 如果已经有图片，确认是否重新生成
    if (panel.imageUrl) {
      if (!confirm(`第 ${panel.panelNumber} 格已经生成过图片，确定要重新生成吗？`)) {
        return;
      }
    }

    const statusDiv = document.getElementById(`panel-status-${index}`);
    const imageDiv = document.getElementById(`panel-image-${index}`);
    const generateBtn = document.getElementById(`panel-generate-btn-${index}`);

    this.hideMessages();
    generateBtn.disabled = true;

    try {
      // 显示生成中状态
      statusDiv.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 10px auto;"></div><div>生成中...</div>';

      // 调用生成器生成单个分镜图片（带流式进度回调）
      const imageUrl = await this.comicGenerator.generatePanelImage(
        panel,
        this.originalImageData,
        this.storyboard.style,
        true, // 启用对话文字生成
        (progress) => {
          // 实时更新流式进度
          if (progress.type === 'content') {
            const contentLength = progress.content.length;
            statusDiv.innerHTML = `
              <div class="spinner" style="width: 20px; height: 20px; margin: 10px auto;"></div>
              <div>生成中...</div>
              <div style="font-size: 0.8rem; color: #999; margin-top: 5px;">
                已接收: ${contentLength} 字符
              </div>
            `;
          } else if (progress.type === 'finish') {
            statusDiv.innerHTML = `
              <div class="spinner" style="width: 20px; height: 20px; margin: 10px auto;"></div>
              <div>处理完成，解析图片...</div>
            `;
          }
        }
      );

      // 更新分镜数据
      this.storyboard.panels[index].imageUrl = imageUrl;

      // 显示生成的图片
      imageDiv.innerHTML = `
        <img src="${imageUrl}"
             style="width: 100%; border-radius: 8px; border: 2px solid #28a745;"
             alt="分镜 ${panel.panelNumber}"
             onerror="this.alt='图片加载失败'">
      `;

      // 更新状态
      statusDiv.innerHTML = '<div style="color: #28a745; font-weight: 600;">✓ 已生成图片</div>';

      // 更新按钮文字和颜色
      generateBtn.innerHTML = '🔄 重新生成';
      generateBtn.style.background = '#ff9800';

      this.showSuccess(`第 ${panel.panelNumber} 格图片生成成功！`);

      // 平滑滚动到图片位置
      setTimeout(() => {
        imageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    } catch (error) {
      console.error(`生成第 ${panel.panelNumber} 格失败:`, error);
      statusDiv.innerHTML = `<div style="color: #dc3545;">生成失败: ${error.message}</div>`;
      this.showError(`生成第 ${panel.panelNumber} 格失败: ${error.message}`);
    } finally {
      generateBtn.disabled = false;
    }
  }

  // ========== 漫画生成 ==========
  
  async generateComic() {
    if (!this.storyboard) {
      this.showError('请先生成分镜！');
      return;
    }

    if (!this.originalImageData) {
      this.showError('请先上传参考图片！参考图片将用于漫画角色的生成。');
      return;
    }

    this.hideMessages();
    this.generateComicBtn.disabled = true;
    this.updateWorkflowStep(3);

    try {
      // 检查生成模式
      const isMergedMode = this.outputModeMerged.checked;

      if (isMergedMode) {
        // ===== 合成为1张图模式：只调用1次API（流式） =====
        this.showLoading(true, '正在生成完整漫画（单次API调用）...');

        const imageContent = await this.comicGenerator.generateSingleComicImage(
          this.storyboard,
          this.originalImageData,
          true, // 启用对话文字生成
          (progress) => {
            // 实时更新流式进度
            if (progress.type === 'content') {
              const contentLength = progress.content.length;
              this.loadingText.textContent = `正在生成完整漫画... (已接收: ${contentLength} 字符)`;
            } else if (progress.type === 'finish') {
              this.loadingText.textContent = '处理完成，解析图片...';
            }
          }
        );

        // 显示单张完整漫画
        this.displaySingleComicResult(imageContent);
        this.showSuccess('成功生成完整漫画（1张图片）！');

      } else {
        // ===== 多张独立图模式：每个分镜调用1次API（流式） =====
        this.showLoading(true, '正在生成漫画图片... 0/' + this.storyboard.panels.length);

        const results = await this.comicGenerator.generateAllPanels(
          this.storyboard.panels,
          this.originalImageData,
          this.storyboard.style,
          (progress) => {
            this.updateGenerationProgress(progress);
          },
          true // 启用对话文字生成
        );

        // 更新分镜数据
        this.storyboard.panels = results;

        // 显示多张独立图
        this.displayComic(results);

        const successCount = results.filter(p => p.imageUrl).length;
        this.showSuccess(`成功生成 ${successCount}/${results.length} 格漫画！`);
      }

      this.currentStep = 4;
      this.updateWorkflowStep(4);
    } catch (error) {
      console.error('生成漫画失败:', error);
      this.showError(`生成漫画失败: ${error.message}`);
      this.updateWorkflowStep(2);
    } finally {
      this.showLoading(false);
      this.validateComicGeneration();
    }
  }

  displaySingleComicResult(imageContent) {
    // imageContent可能是URL或base64
    const isBase64 = imageContent.startsWith('data:image');
    const imageSrc = isBase64 ? imageContent : imageContent;
    
    this.comicContainer.innerHTML = `
      <div class="section-title">🎨 完整漫画（单张图片）</div>
      <div style="text-align: center; background: white; padding: 20px; border-radius: 10px;">
        <img src="${imageSrc}" class="result-image" alt="完整漫画" style="max-width: 100%; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" onerror="this.alt='图片加载失败'">
        <div class="image-info" style="margin-top: 20px;">
          <div class="info-item">
            <span class="info-label">故事标题:</span>
            <span class="info-value">${this.escapeHtml(this.storyboard.title)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">漫画风格:</span>
            <span class="info-value">${this.escapeHtml(this.storyboard.style)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">分镜数量:</span>
            <span class="info-value">${this.storyboard.panels.length} 格</span>
          </div>
          <div class="info-item">
            <span class="info-label">API调用:</span>
            <span class="info-value" style="color: #28a745; font-weight: 600;">仅1次 ✓</span>
          </div>
          <div class="info-item">
            <span class="info-label">生成时间:</span>
            <span class="info-value">${new Date().toLocaleString()}</span>
          </div>
        </div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <button class="action-button" id="downloadSingleComicBtn">
            📥 下载漫画
          </button>
          <button class="action-button" onclick="app.regenerateComic()">
            🔄 重新生成
          </button>
        </div>
      </div>
    `;

    // 绑定下载按钮
    setTimeout(() => {
      const btn = document.getElementById('downloadSingleComicBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          if (isBase64) {
            this.downloadBase64Image(imageSrc, `${this.storyboard.title || '漫画'}.png`);
          } else {
            window.open(imageSrc, '_blank');
          }
        });
      }
    }, 100);
  }

  downloadBase64Image(base64Data, filename) {
    try {
      const link = document.createElement('a');
      link.href = base64Data;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showSuccess('下载成功！');
    } catch (error) {
      this.showError('下载失败: ' + error.message);
    }
  }

  async regenerateComic() {
    if (!confirm('确定要重新生成漫画吗？')) {
      return;
    }
    await this.generateComic();
  }

  async displayMergedComic(panels) {
    // 保留原有的客户端合成功能（备用）
    const successPanels = panels.filter(p => p.imageUrl);
    const failedPanels = panels.filter(p => !p.imageUrl);

    if (successPanels.length === 0) {
      this.showError('没有成功生成的图片，无法合成！');
      return;
    }

    try {
      const imageUrls = successPanels.map(p => p.imageUrl);
      const columns = successPanels.length <= 4 ? 2 : 3;
      const mergedImage = await this.comicGenerator.mergeImagesIntoComic(imageUrls, columns);
      
      this.comicContainer.innerHTML = `
        <div class="section-title">🎨 完整漫画（客户端合成）</div>
        ${failedPanels.length > 0 ? `
          <div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
            ⚠️ ${failedPanels.length} 格生成失败，未包含在合成图中
          </div>
        ` : ''}
        <div style="text-align: center; background: #f8f9fa; padding: 20px; border-radius: 10px;">
          <img src="${mergedImage}" style="max-width: 100%; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);" alt="完整漫画">
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <button class="action-button" onclick="app.downloadMergedComic('${mergedImage}')" style="padding: 12px 30px; font-size: 1rem;">
            📥 下载漫画
          </button>
        </div>
      `;
    } catch (error) {
      console.error('合成失败:', error);
      this.showError(`合成失败: ${error.message}`);
    }
  }

  downloadMergedComic(base64Image) {
    this.downloadBase64Image(base64Image, `${this.storyboard.title || '漫画'}.png`);
  }

  updateGenerationProgress(progress) {
    const { current, total, panel, status } = progress;

    // 更新加载文字
    if (status === 'streaming' && progress.streamProgress) {
      // 流式进度更新
      const streamProg = progress.streamProgress;
      if (streamProg.type === 'content') {
        this.loadingText.textContent = `正在生成第 ${current}/${total} 格... (已接收: ${streamProg.content.length} 字符)`;
      } else if (streamProg.type === 'finish') {
        this.loadingText.textContent = `正在生成第 ${current}/${total} 格... (解析图片中)`;
      }
    } else if (status === 'generating') {
      this.loadingText.textContent = `正在生成第 ${current}/${total} 格漫画...`;
    }

    // 更新对应的分镜显示
    const statusDiv = document.getElementById(`panel-status-${current - 1}`);
    if (statusDiv) {
      if (status === 'generating') {
        statusDiv.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 10px auto;"></div><div>生成中...</div>';
      } else if (status === 'streaming' && progress.streamProgress) {
        // 显示流式进度
        const streamProg = progress.streamProgress;
        if (streamProg.type === 'content') {
          statusDiv.innerHTML = `
            <div class="spinner" style="width: 20px; height: 20px; margin: 10px auto;"></div>
            <div>生成中...</div>
            <div style="font-size: 0.8rem; color: #999; margin-top: 5px;">
              已接收: ${streamProg.content.length} 字符
            </div>
          `;
        } else if (streamProg.type === 'finish') {
          statusDiv.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 10px auto;"></div><div>解析图片中...</div>';
        }
      } else if (status === 'completed' && panel.imageUrl) {
        statusDiv.outerHTML = `<img src="${panel.imageUrl}" class="panel-image" alt="分镜 ${panel.panelNumber}" style="width: 100%; border-radius: 8px; margin-top: 10px;">`;
      } else if (status === 'error') {
        statusDiv.innerHTML = `<div style="color: #c33;">生成失败: ${progress.error}</div>`;
      }
    }
  }

  async displayMergedComic(panels) {
    const successPanels = panels.filter(p => p.imageUrl);
    const failedPanels = panels.filter(p => !p.imageUrl);

    if (successPanels.length === 0) {
      this.showError('没有成功生成的图片，无法合成！');
      return;
    }

    try {
      // 提取所有成功的图片URL
      const imageUrls = successPanels.map(p => p.imageUrl);
      
      // 计算每行显示几格（根据总数自动调整）
      const columns = successPanels.length <= 4 ? 2 : 3;
      
      // 合成图片
      const mergedImage = await this.comicGenerator.mergeImagesIntoComic(imageUrls, columns);
      
      this.comicContainer.innerHTML = `
        <div class="section-title">🎨 完整漫画（已合成）</div>
        ${failedPanels.length > 0 ? `
          <div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
            ⚠️ ${failedPanels.length} 格生成失败，未包含在合成图中
          </div>
        ` : ''}
        <div style="text-align: center; background: #f8f9fa; padding: 20px; border-radius: 10px;">
          <img src="${mergedImage}" style="max-width: 100%; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);" alt="完整漫画">
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <button class="action-button" onclick="app.downloadMergedComic('${mergedImage}')" style="padding: 12px 30px; font-size: 1rem; margin-right: 10px;">
            📥 下载完整漫画
          </button>
          <button class="action-button" onclick="app.viewSeparatePanels()" style="padding: 12px 30px; font-size: 1rem; background: #6c757d;">
            👁️ 查看分格
          </button>
        </div>
      `;
      
      // 保存合成的图片
      this.mergedComicImage = mergedImage;
    } catch (error) {
      console.error('合成图片失败:', error);
      this.showError('合成图片失败: ' + error.message);
      // 降级显示独立图片
      this.displayComic(panels);
    }
  }

  displayComic(panels) {
    const successPanels = panels.filter(p => p.imageUrl);
    const failedPanels = panels.filter(p => !p.imageUrl);

    this.comicContainer.innerHTML = `
      <div class="section-title">🎨 完整漫画（分格模式）</div>
      ${failedPanels.length > 0 ? `
        <div style="background: #fff3cd; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
          ⚠️ ${failedPanels.length} 格生成失败
        </div>
      ` : ''}
      <div class="comic-result">
        ${panels.map(panel => `
          <div style="text-align: center;">
            <div style="font-weight: bold; color: #667eea; margin-bottom: 10px;">
              第 ${panel.panelNumber} 格
            </div>
            ${panel.imageUrl ? `
              <img src="${panel.imageUrl}" class="result-image" alt="分镜 ${panel.panelNumber}">
              ${panel.dialogue ? `
                <div style="background: white; padding: 10px; margin-top: 10px; border-radius: 5px; border: 2px solid #667eea;">
                  💬 ${panel.dialogue}
                </div>
              ` : ''}
            ` : `
              <div style="background: #f8d7da; color: #721c24; padding: 30px; border-radius: 10px;">
                生成失败<br>
                <small>${panel.error || '未知错误'}</small>
              </div>
            `}
          </div>
        `).join('')}
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <button class="action-button" onclick="app.downloadAllPanels()" style="padding: 12px 30px; font-size: 1rem;">
          📥 下载所有分格
        </button>
      </div>
    `;
  }

  viewSeparatePanels() {
    this.displayComic(this.storyboard.panels);
  }

  downloadMergedComic(imageBase64) {
    const link = document.createElement('a');
    link.href = imageBase64;
    link.download = `漫画_${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showSuccess('已开始下载完整漫画！');
  }

  downloadAllPanels() {
    const successPanels = this.storyboard.panels.filter(p => p.imageUrl);
    
    successPanels.forEach((panel, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = panel.imageUrl;
        link.download = `漫画_第${panel.panelNumber}格_${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 500); // 每个下载间隔500ms，避免浏览器阻止
    });
    
    this.showSuccess(`开始下载 ${successPanels.length} 个分格！`);
  }

  // ========== 辅助方法 ==========
  
  updateWorkflowStep(step) {
    this.workflowSteps.forEach((el, index) => {
      if (index < step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  showLoading(show, text = '处理中...') {
    if (show) {
      this.loading.classList.add('show');
      this.loadingText.textContent = text;
    } else {
      this.loading.classList.remove('show');
    }
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.add('show');
    this.successMessage.classList.remove('show');
  }

  showSuccess(message) {
    this.successMessage.textContent = message;
    this.successMessage.classList.add('show');
    this.errorMessage.classList.remove('show');
  }

  hideMessages() {
    this.errorMessage.classList.remove('show');
    this.successMessage.classList.remove('show');
  }

  async downloadComic() {
    if (!this.storyboard || !this.storyboard.panels) {
      this.showError('没有可下载的漫画！');
      return;
    }

    // 这里可以实现下载功能，例如：
    // 1. 将所有图片合成一张大图
    // 2. 或者打包下载所有图片
    this.showSuccess('下载功能开发中...');
  }
}

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new ComicMakerApp();
});

