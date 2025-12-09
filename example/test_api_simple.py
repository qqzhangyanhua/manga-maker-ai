#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化版测试脚本 - 用于调试API连接
"""

import os
import json
import base64
import requests
from pathlib import Path


def test_storyboard_api():
    """测试分镜生成API"""
    print("=" * 60)
    print("🧪 测试分镜生成API")
    print("=" * 60)
    
    # 配置
    api_key = 'sk-6xmKFtCUO7Z3qJnIoAa8D3lI6DJTfvzSYxMbafNT2FFHFDwd'
    api_base = 'https://api.moonshot.cn/v1'
    model = 'kimi-k2-0905-preview'
    
    # 读取图片
    image_path = Path(__file__).parent / 'Gemini_Generated_Image_2djzjd2djzjd2djz.png'
    
    if not image_path.exists():
        print(f"❌ 图片不存在: {image_path}")
        return
    
    print(f"✅ 找到图片: {image_path}")
    
    # 编码图片
    with open(image_path, 'rb') as f:
        image_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    print(f"✅ 图片已编码 (大小: {len(image_base64)} 字符)")
    
    # 构建请求
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    payload = {
        'model': model,
        'messages': [
            {
                'role': 'system',
                'content': '你是一位专业的漫画分镜师。'
            },
            {
                'role': 'user',
                'content': [
                    {
                        'type': 'image_url',
                        'image_url': {
                            'url': f'data:image/png;base64,{image_base64}'
                        }
                    },
                    {
                        'type': 'text',
                        'text': '请描述这张图片中的角色特征。'
                    }
                ]
            }
        ],
        'temperature': 0.7,
        'max_tokens': 500
    }
    
    print(f"\n📤 发送请求到: {api_base}/chat/completions")
    print(f"   模型: {model}")
    
    try:
        response = requests.post(
            f'{api_base}/chat/completions',
            headers=headers,
            json=payload,
            timeout=60
        )
        
        print(f"\n📥 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            content = data['choices'][0]['message']['content']
            print(f"\n✅ API调用成功!")
            print(f"\n响应内容:")
            print("-" * 60)
            print(content)
            print("-" * 60)
        else:
            print(f"\n❌ API调用失败!")
            print(f"状态码: {response.status_code}")
            print(f"响应内容:")
            print("-" * 60)
            print(response.text)
            print("-" * 60)
            
    except Exception as e:
        print(f"\n❌ 请求失败: {str(e)}")
        import traceback
        traceback.print_exc()


def test_comic_api():
    """测试漫画生成API"""
    print("\n" + "=" * 60)
    print("🧪 测试漫画生成API")
    print("=" * 60)
    
    # 配置
    api_key = 'sk-PnF9rKpaHkWEDOIM2m9LxrVQro4Df0IwKw2koxB8CybrypPr'
    api_base = 'https://ai.xiangcao.de/v1'
    model = 'gemini-3-pro-image-preview'
    
    # 读取图片
    image_path = Path(__file__).parent / 'Gemini_Generated_Image_2djzjd2djzjd2djz.png'
    
    if not image_path.exists():
        print(f"❌ 图片不存在: {image_path}")
        return
    
    print(f"✅ 找到图片: {image_path}")
    
    # 编码图片
    with open(image_path, 'rb') as f:
        image_base64 = base64.b64encode(f.read()).decode('utf-8')
    
    print(f"✅ 图片已编码 (大小: {len(image_base64)} 字符)")
    
    # 构建请求
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    payload = {
        'model': model,
        'messages': [
            {
                'role': 'user',
                'content': [
                    {
                        'type': 'image_url',
                        'image_url': {
                            'url': f'data:image/png;base64,{image_base64}'
                        }
                    },
                    {
                        'type': 'text',
                        'text': 'Generate a manga-style comic panel based on this character. The character is happy and waving. Output the image directly.'
                    }
                ]
            }
        ],
        'temperature': 0.7,
        'max_tokens': 4096
    }
    
    print(f"\n📤 发送请求到: {api_base}/chat/completions")
    print(f"   模型: {model}")
    
    try:
        response = requests.post(
            f'{api_base}/chat/completions',
            headers=headers,
            json=payload,
            timeout=120
        )
        
        print(f"\n📥 响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            content = data['choices'][0]['message']['content']
            print(f"\n✅ API调用成功!")
            print(f"\n响应内容 (前500字符):")
            print("-" * 60)
            print(content[:500])
            print("-" * 60)
            
            # 尝试提取图片URL
            import re
            match = re.search(r'!\[.*?\]\((https?://[^\)]+)\)', content)
            if match:
                print(f"\n🖼️ 找到图片URL: {match.group(1)}")
            else:
                print(f"\n⚠️ 未找到图片URL")
        else:
            print(f"\n❌ API调用失败!")
            print(f"状态码: {response.status_code}")
            print(f"响应内容:")
            print("-" * 60)
            print(response.text)
            print("-" * 60)
            
    except Exception as e:
        print(f"\n❌ 请求失败: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    print("🔍 API连接测试工具\n")
    
    # 测试分镜生成API
    test_storyboard_api()
    
    # 测试漫画生成API
    test_comic_api()
    
    print("\n" + "=" * 60)
    print("✅ 测试完成")
    print("=" * 60)
