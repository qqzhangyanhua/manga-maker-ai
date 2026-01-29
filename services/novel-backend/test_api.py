"""直接测试 FastAPI 端点"""
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

async def test_api():
    # 使用 ASGITransport 直接测试 FastAPI
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 模拟已认证用户（需要 JWT token）
        # 先测试不需要认证的健康检查
        print("1. 测试健康检查:")
        response = await client.get("/health")
        print(f"  状态: {response.status_code}")
        print(f"  响应: {response.json()}")
        
        # 测试需要认证的端点（会返回 401）
        print("\n2. 测试 /workflow/start (无认证):")
        response = await client.post("/workflow/start", json={"genre": None})
        print(f"  状态: {response.status_code}")
        if response.status_code != 200:
            print(f"  错误: {response.text[:200]}")

if __name__ == "__main__":
    asyncio.run(test_api())
