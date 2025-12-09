#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI漫画生成测试脚本
功能：读取图片 → 生成分镜脚本 → 生成漫画图片
"""

import os
import json
import base64
import time
import requests
from pathlib import Path
from typing import List, Dict, Optional


class ComicGenerationConfig:
    """配置类"""
    # 分镜生成配置（GPT模型）
    STORYBOARD_API_KEY = 'sk-6xmKFtCUO7Z3qJnIoAa8D3lI6DJTfvzSYxMbafNT2FFHFDwd'
    STORYBOARD_API_BASE = 'https://api.moonshot.cn/v1'
    STORYBOARD_MODEL = 'kimi-k2-0905-preview'
    STORYBOARD_TEMPERATURE = 0.7
    
    # 漫画生成配置（图像生成模型）
    COMIC_API_KEY = 'sk-PnF9rKpaHkWEDOIM2m9LxrVQro4Df0IwKw2koxB8CybrypPr'
    COMIC_API_BASE = 'https://ai.xiangcao.de/v1'
    COMIC_MODEL = 'gemini-3-pro-image-preview'
    
    # 其他配置
    DEFAULT_PANEL_COUNT = 6
    OUTPUT_DIR = Path(__file__).parent / 'output'


class StoryboardGenerator:
    """分镜生成器"""
    
    def __init__(self, config: ComicGenerationConfig):
        self.config = config
    
    def generate_storyboard(self, image_path: str, description: str, panel_count: int = 6) -> Dict:
        """
        生成分镜脚本
        
        Args:
            image_path: 图片路径
            description: 故事描述
            panel_count: 分镜数量
            
        Returns:
            分镜数据字典
        """
        print(f"\n📝 开始生成分镜脚本...")
        print(f"   图片: {image_path}")
        print(f"   描述: {description}")
        print(f"   分镜数: {panel_count}")
        
        # 构建提示词
        prompt = self._build_storyboard_prompt(description, panel_count)
        
        # 调用API
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.config.STORYBOARD_API_KEY}'
        }
        
        # Moonshot API不支持图片输入，使用纯文本模式
        payload = {
            'model': self.config.STORYBOARD_MODEL,
            'messages': [
                {
                    'role': 'system',
                    'content': '你是一位专业的漫画分镜师，擅长将故事转化为生动的视觉叙事。你需要根据用户提供的故事描述，创建详细的漫画分镜脚本。'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': self.config.STORYBOARD_TEMPERATURE,
            'max_tokens': 2000
        }
        
        try:
            response = requests.post(
                f'{self.config.STORYBOARD_API_BASE}/chat/completions',
                headers=headers,
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            
            data = response.json()
            content = data['choices'][0]['message']['content']
            
            # 解析JSON响应
            # 尝试提取JSON内容（可能被包裹在markdown代码块中）
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0].strip()
            elif '```' in content:
                content = content.split('```')[1].split('```')[0].strip()
            
            storyboard_data = json.loads(content)
            parsed_storyboard = self._parse_storyboard(storyboard_data)
            
            print(f"✅ 分镜脚本生成成功!")
            print(f"   标题: {parsed_storyboard['title']}")
            print(f"   风格: {parsed_storyboard['style']}")
            print(f"   分镜数: {len(parsed_storyboard['panels'])}")
            
            return parsed_storyboard
            
        except Exception as e:
            print(f"❌ 分镜生成失败: {str(e)}")
            raise
    
    def _encode_image(self, image_path: str) -> str:
        """将图片编码为base64"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def _build_storyboard_prompt(self, description: str, panel_count: int) -> str:
        """构建分镜生成提示词"""
        return f"""请根据以下故事描述，创建一个{panel_count}格的漫画分镜脚本：

故事描述：{description}

要求：
1. 创建{panel_count}个连贯的分镜，讲述一个完整的故事
2. 每个分镜需要包含：
   - panel_number: 分镜编号（1-{panel_count}）
   - scene_description: 场景描述（中文，详细描述场景环境、构图、镜头角度）
   - character_action: 角色动作（中文，描述角色的姿态、表情、动作）
   - dialogue: 对话内容（中文，如果有对话，没有则留空）
   - visual_prompt: 视觉提示（英文，用于AI图像生成的详细prompt，包含风格、构图、光影、角色特征等）
3. 确保故事情节有起承转合，富有戏剧性
4. 漫画风格要活泼生动，适合分格漫画
5. visual_prompt要非常详细，包含：
   - 角色外观特征（会从参考图片中提取，但请在prompt中描述期望的角色状态）
   - 表情和动作
   - 场景环境和背景
   - 光线和氛围
   - 构图和镜头角度
   - 漫画风格（manga style, vibrant colors, clean linework等）

请以JSON格式返回，格式如下：
{{
  "title": "故事标题",
  "style": "漫画风格描述（如：日式漫画、美式漫画、可爱风格等）",
  "panels": [
    {{
      "panel_number": 1,
      "scene_description": "场景描述",
      "character_action": "角色动作",
      "dialogue": "对话内容",
      "visual_prompt": "详细的英文视觉提示词"
    }}
  ]
}}"""
    
    def _parse_storyboard(self, data: Dict) -> Dict:
        """解析分镜数据"""
        if 'panels' not in data or not isinstance(data['panels'], list):
            raise ValueError('分镜数据格式错误')
        
        return {
            'title': data.get('title', '未命名故事'),
            'style': data.get('style', '漫画风格'),
            'panels': [
                {
                    'panel_number': panel['panel_number'],
                    'scene_description': panel['scene_description'],
                    'character_action': panel['character_action'],
                    'dialogue': panel.get('dialogue', ''),
                    'visual_prompt': panel['visual_prompt'],
                    'image_url': None
                }
                for panel in data['panels']
            ]
        }


class ComicGenerator:
    """漫画生成器"""
    
    def __init__(self, config: ComicGenerationConfig):
        self.config = config
    
    def generate_all_panels(
        self, 
        panels: List[Dict], 
        reference_image_path: str, 
        style: str,
        enable_text: bool = False
    ) -> List[Dict]:
        """
        生成所有分镜的图片
        
        Args:
            panels: 分镜数组
            reference_image_path: 参考图片路径
            style: 漫画风格
            enable_text: 是否生成对话文字
            
        Returns:
            包含图片URL的分镜数组
        """
        print(f"\n🎨 开始生成漫画图片...")
        print(f"   总分镜数: {len(panels)}")
        print(f"   风格: {style}")
        print(f"   生成文字: {'是' if enable_text else '否'}")
        
        # 读取参考图片
        reference_base64 = self._encode_image(reference_image_path)
        
        results = []
        for i, panel in enumerate(panels):
            try:
                print(f"\n   [{i+1}/{len(panels)}] 生成分镜 {panel['panel_number']}...")
                
                # 生成图片
                image_url = self._generate_panel_image(
                    panel, 
                    reference_base64, 
                    style,
                    enable_text
                )
                
                # 添加到结果
                result_panel = {**panel, 'image_url': image_url}
                results.append(result_panel)
                
                print(f"   ✅ 分镜 {panel['panel_number']} 生成成功")
                
                # 避免API限流
                if i < len(panels) - 1:
                    time.sleep(2)
                    
            except Exception as e:
                print(f"   ❌ 分镜 {panel['panel_number']} 生成失败: {str(e)}")
                results.append({**panel, 'image_url': None, 'error': str(e)})
        
        return results
    
    def _generate_panel_image(
        self, 
        panel: Dict, 
        reference_base64: str, 
        style: str,
        enable_text: bool
    ) -> str:
        """生成单个分镜图片"""
        prompt = self._build_image_prompt(panel, style, enable_text)
        
        # 构建消息内容
        message_content = [
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{reference_base64}"
                }
            },
            {
                "type": "text",
                "text": prompt
            }
        ]
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.config.COMIC_API_KEY}'
        }
        
        payload = {
            'model': self.config.COMIC_MODEL,
            'messages': [
                {
                    'role': 'user',
                    'content': message_content
                }
            ],
            'temperature': 0.7,
            'max_tokens': 4096
        }
        
        response = requests.post(
            f'{self.config.COMIC_API_BASE}/chat/completions',
            headers=headers,
            json=payload,
            timeout=120
        )
        response.raise_for_status()
        
        data = response.json()
        content = data['choices'][0]['message']['content']
        
        # 提取图片URL
        image_url = self._extract_image_url(content)
        if not image_url:
            raise ValueError(f"无法从响应中提取图片URL: {content[:200]}")
        
        return image_url
    
    def _build_image_prompt(self, panel: Dict, style: str, enable_text: bool) -> str:
        """构建图像生成提示词"""
        prompt = "You are a professional manga artist. Generate a comic panel image directly.\n\n"
        
        # 如果有对话且启用文字
        if panel['dialogue'] and enable_text:
            prompt += f"🎯 TEXT IN SPEECH BALLOON (MOST IMPORTANT!):\n"
            prompt += f"Write exactly these characters in a speech balloon: \"{panel['dialogue']}\"\n"
            prompt += f"Speech balloon style:\n"
            prompt += f"- White balloon with black outline\n"
            prompt += f"- Position near character's face/mouth\n"
            prompt += f"- Text: \"{panel['dialogue']}\" in bold, clear, black letters\n"
            prompt += f"- Font size must be large and easy to read\n"
            prompt += f"- This is CRITICAL - the text MUST appear in the image!\n\n"
        elif panel['dialogue'] and not enable_text:
            prompt += "Speech Balloon: Draw empty white speech balloons (no text inside).\n\n"
        
        prompt += f"Scene Details:\n"
        prompt += f"- Panel {panel['panel_number']} of manga/comic\n"
        prompt += f"- Style: {style}\n"
        prompt += f"- Scene: {panel['scene_description']}\n"
        prompt += f"- Character: {panel['character_action']}\n"
        prompt += f"- Details: {panel['visual_prompt']}\n\n"
        
        prompt += f"Visual Requirements:\n"
        prompt += f"1. Match character appearance from reference image (face, hair, clothes, body)\n"
        prompt += f"2. Clean manga linework with vibrant colors\n"
        prompt += f"3. Dynamic composition and camera angle\n"
        
        if panel['dialogue'] and enable_text:
            prompt += f"4. 🎯 CRITICAL: Include speech balloon with text \"{panel['dialogue']}\" - this is mandatory!\n"
        else:
            prompt += f"4. Professional comic panel style\n"
        
        prompt += f"\n⚠️ Generate the manga panel image now. Output the image directly, do not describe it in text."
        
        return prompt
    
    def _encode_image(self, image_path: str) -> str:
        """将图片编码为base64"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def _extract_image_url(self, content: str) -> Optional[str]:
        """从markdown内容中提取图片URL"""
        import re
        match = re.search(r'!\[.*?\]\((https?://[^\)]+)\)', content)
        if match:
            return match.group(1)
        return None


class ComicGenerationWorkflow:
    """漫画生成工作流"""
    
    def __init__(self, config: ComicGenerationConfig):
        self.config = config
        self.storyboard_generator = StoryboardGenerator(config)
        self.comic_generator = ComicGenerator(config)
        
        # 创建输出目录
        self.config.OUTPUT_DIR.mkdir(exist_ok=True)
    
    def run(
        self, 
        image_path: str, 
        story_description: str, 
        panel_count: int = 6,
        enable_text: bool = False
    ):
        """
        运行完整的漫画生成流程
        
        Args:
            image_path: 输入图片路径
            story_description: 故事描述
            panel_count: 分镜数量
            enable_text: 是否生成对话文字
        """
        print("=" * 60)
        print("🎬 AI漫画生成工作流")
        print("=" * 60)
        
        # 步骤1: 生成分镜脚本
        storyboard = self.storyboard_generator.generate_storyboard(
            image_path, 
            story_description, 
            panel_count
        )
        
        # 保存分镜脚本
        storyboard_file = self.config.OUTPUT_DIR / 'storyboard.json'
        with open(storyboard_file, 'w', encoding='utf-8') as f:
            json.dump(storyboard, f, ensure_ascii=False, indent=2)
        print(f"\n💾 分镜脚本已保存: {storyboard_file}")
        
        # 打印分镜详情
        print("\n" + "=" * 60)
        print("📋 分镜脚本详情")
        print("=" * 60)
        for panel in storyboard['panels']:
            print(f"\n【分镜 {panel['panel_number']}】")
            print(f"场景: {panel['scene_description']}")
            print(f"动作: {panel['character_action']}")
            if panel['dialogue']:
                print(f"对话: {panel['dialogue']}")
            print(f"视觉提示: {panel['visual_prompt'][:100]}...")
        
        # 步骤2: 生成漫画图片
        print("\n" + "=" * 60)
        results = self.comic_generator.generate_all_panels(
            storyboard['panels'],
            image_path,
            storyboard['style'],
            enable_text
        )
        
        # 保存结果
        results_data = {
            'title': storyboard['title'],
            'style': storyboard['style'],
            'panels': results
        }
        
        results_file = self.config.OUTPUT_DIR / 'comic_results.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, ensure_ascii=False, indent=2)
        
        # 下载图片
        print("\n" + "=" * 60)
        print("💾 下载生成的图片...")
        print("=" * 60)
        
        for panel in results:
            if panel.get('image_url'):
                try:
                    image_file = self.config.OUTPUT_DIR / f"panel_{panel['panel_number']}.png"
                    self._download_image(panel['image_url'], image_file)
                    print(f"   ✅ 分镜 {panel['panel_number']} 已保存: {image_file}")
                except Exception as e:
                    print(f"   ❌ 分镜 {panel['panel_number']} 下载失败: {str(e)}")
        
        print("\n" + "=" * 60)
        print("🎉 漫画生成完成!")
        print("=" * 60)
        print(f"📁 输出目录: {self.config.OUTPUT_DIR}")
        print(f"📄 分镜脚本: {storyboard_file}")
        print(f"📄 生成结果: {results_file}")
        print("=" * 60)
    
    def _download_image(self, url: str, save_path: Path):
        """下载图片"""
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            f.write(response.content)


def main():
    """主函数"""
    # 配置
    config = ComicGenerationConfig()
    
    # 输入参数
    image_path = str(Path(__file__).parent / 'Gemini_Generated_Image_2djzjd2djzjd2djz.png')
    story_description = """
    一个可爱的卡通角色的奇幻冒险故事。
    从平凡的日常生活开始，意外发现了一个神奇的世界。
    经历了惊险刺激的冒险，遇到了新朋友，克服了困难，
    最终成长为一个勇敢的冒险家。
    故事要充满想象力、幽默感和正能量。
    """
    panel_count = 6
    enable_text = False  # 设置为True可以在对话框中生成文字
    
    # 检查图片是否存在
    if not os.path.exists(image_path):
        print(f"❌ 错误: 图片不存在 - {image_path}")
        print(f"请确保图片文件在正确的位置")
        return
    
    # 运行工作流
    workflow = ComicGenerationWorkflow(config)
    workflow.run(image_path, story_description, panel_count, enable_text)


if __name__ == '__main__':
    main()
