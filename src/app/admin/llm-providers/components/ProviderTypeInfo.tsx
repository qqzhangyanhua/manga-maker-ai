export const ProviderTypeInfo = () => {
  return (
    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
      <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
        📋 系统已知的 provider_type 类型：
      </h3>
      <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <strong className="text-blue-900 dark:text-blue-100">storyboard</strong>
            <p className="text-xs mt-1">
              用于分镜相关功能和提示词生成：剧本分析、分镜生成、分镜合并/拆分/插入、角色三视图/表情/装扮的
              prompt 生成
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              使用位置：/api/storyboard, /api/panel/merge, /api/panel/split, /api/panel/insert,
              /api/character/generate-views (promptProviderType), /api/character/generate-expressions
              (promptProviderType), /api/character/outfits (promptProviderType)
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">story_generator</strong>
            <p className="text-xs mt-1">
              用于故事生成系统：从创意前提生成完整故事大纲、扩展故事章节、设定角色关系等
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              <strong>使用位置：</strong>
              <br />
              • /api/story/generate - 根据创意前提（premise）生成完整故事大纲
              <br />
              • /api/story/expand - 扩展指定章节的详细内容
              <br />
              • /api/story/character-setup - 生成角色性格、背景、关系设定
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">chapter_generator</strong>
            <p className="text-xs mt-1">
              章节生成器：从故事大纲自动生成结构化章节划分和每章梗概
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              <strong>使用位置：</strong>
              <br />
              • /api/story/[id]/generate-chapters - AI生成故事章节结构
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">script_analyzer</strong>
            <p className="text-xs mt-1">
              分镜脚本生成器：从章节梗概生成详细分镜脚本，包含画面描述、对话、镜头设计等
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              <strong>使用位置：</strong>
              <br />
              • /api/chapter/[id]/generate-panels - AI为章节生成分镜
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">workflow</strong>
            <p className="text-xs mt-1">用于自动化工作流：从剧本到完整漫画的端到端自动生成</p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              使用位置：/api/workflow/auto-generate
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">image_generation</strong>
            <p className="text-xs mt-1">
              用于通用 AI 图像生成：分镜图片、角色生成等（无特殊要求时使用）
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              使用位置：/api/panel/generate-image, /api/character/generate-similar,
              /api/character/outfits/[id]/generate
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">image_generation_turnaround</strong>
            <p className="text-xs mt-1">三视图专用：为角色三视图（前、侧、后）生成配置独立的模型</p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              使用位置：/api/character/generate-views (默认 imageProviderType)
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">image_generation_expression</strong>
            <p className="text-xs mt-1">表情专用：角色表情矩阵（9种情绪）的专用模型配置</p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              使用位置：/api/character/generate-expressions (默认 imageProviderType)
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">image_generation_outfit</strong>
            <p className="text-xs mt-1">服装专用：角色换装生成的专用模型配置</p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              使用位置：/api/character/outfits (默认 imageProviderType)
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">image_edit</strong>
            <p className="text-xs mt-1">
              图片编辑/改图：根据用户的修改需求生成 img2img 适用的详细提示词，保持原图主体与构图
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              使用位置：/api/panel/[id]/ai-edit（分镜图片修改，先用 LLM 生成修改提示词再交给图像模型）
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">prompt_optimizer</strong>
            <p className="text-xs mt-1">
              提示词优化器：增强和优化用户输入的提示词质量，优化分镜对话、画面描述和视觉提示词
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              <strong>使用位置：</strong>
              <br />
              • /api/prompt/optimize - 通用提示词优化
              <br />
              • /api/panel/[id]/optimize - AI优化分镜内容（对话、画面描述、视觉提示词）
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">character_analyzer</strong>
            <p className="text-xs mt-1">用于角色分析：分析角色特征并生成相似角色变体</p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              使用位置：/api/character/generate-similar
            </p>
          </div>
          <div>
            <strong className="text-blue-900 dark:text-blue-100">story_character_generator</strong>
            <p className="text-xs mt-1">
              故事角色生成器：分析故事内容自动生成角色描述，包括外貌特征、性格、服装等视觉描述
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              <strong>使用位置：</strong>
              <br />
              • /api/story/[id]/generate-characters - 根据故事内容AI生成角色视觉描述
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};




