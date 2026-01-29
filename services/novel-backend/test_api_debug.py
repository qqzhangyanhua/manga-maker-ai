# -*- coding: utf-8 -*-
"""测试 FastAPI 端点直接调用"""
import asyncio
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from httpx import AsyncClient, ASGITransport
from app.main import app

# Mock auth
import app.middleware.auth as auth_module
original_get_current_user_id = auth_module.get_current_user_id

async def mock_get_current_user_id():
    return "test-user-" + "a" * 20  # 32 chars total, valid UUID-like

# Monkey patch
auth_module.get_current_user_id = mock_get_current_user_id

async def test():
    print("=" * 60)
    print("测试 FastAPI 端点")
    print("=" * 60)
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 测试1: genre=null
        print("\n[1] genre=null:")
        response = await client.post(
            "/workflow/start",
            json={"genre": None},
            headers={"Authorization": "Bearer test"}
        )
        print(f"  状态: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  available_templates: {len(data.get('available_templates', []))} 个")
        else:
            print(f"  错误: {response.text[:200]}")
        
        # 测试2: genre='狗血女文'
        print("\n[2] genre='狗血女文':")
        response = await client.post(
            "/workflow/start",
            json={"genre": "狗血女文"},
            headers={"Authorization": "Bearer test"}
        )
        print(f"  状态: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  available_templates: {len(data.get('available_templates', []))} 个")
            if data.get('available_templates'):
                for t in data['available_templates']:
                    print(f"    - {t['name']}")
        else:
            print(f"  错误: {response.text[:500]}")

if __name__ == "__main__":
    asyncio.run(test())
