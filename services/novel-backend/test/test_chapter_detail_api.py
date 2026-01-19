#!/usr/bin/env python3
"""
测试脚本: 获取单章索引详情 API
测试 GET /api/novel/rag/chapter/{chapter_id}/detail 端点
"""
import requests
import os
from datetime import datetime, timedelta, timezone
from jose import jwt


def get_auth_token() -> str:
    """生成测试用的 JWT token"""
    jwt_secret = os.getenv("JWT_SECRET", "zhangyanhua12345")
    payload = {
        "userId": "test-user-id-123",
        "email": "test@example.com",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")


def test_get_chapter_detail():
    """测试获取单章索引详情 API"""
    base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    print("=" * 70)
    print("测试 Task 2: 获取单章索引详情 API")
    print("=" * 70)

    # Test 1: 获取不存在的章节 (应返回 404)
    print("\n[Test 1] 获取不存在的章节...")
    response = requests.get(
        f"{base_url}/api/novel/rag/chapter/non-existent-id/detail",
        headers=headers
    )
    print(f"   Status: {response.status_code}")

    if response.status_code == 404:
        print("   ✅ PASS - 正确返回 404")
    else:
        print(f"   ❌ FAIL - 预期 404, 实际: {response.status_code}")
        print(f"   响应: {response.text}")

    # Test 2: 获取真实章节 (需要实际数据)
    print("\n[Test 2] 获取章节详情 (测试数据)...")
    test_chapter_id = "test-chapter-1"
    response = requests.get(
        f"{base_url}/api/novel/rag/chapter/{test_chapter_id}/detail",
        headers=headers
    )
    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"   响应数据: {data}")

        # 验证响应结构
        required_fields = ["chapter_id", "indexed"]
        missing_fields = [f for f in required_fields if f not in data]

        if missing_fields:
            print(f"   ❌ FAIL - 缺少字段: {missing_fields}")
        else:
            print("   ✅ PASS - 响应结构正确")
            print(f"      - chapter_id: {data['chapter_id']}")
            print(f"      - indexed: {data['indexed']}")

            if data["indexed"]:
                print(f"      - embedding_dim: {data.get('embedding_dim')}")
                print(f"      - similarity_test: {data.get('similarity_test')}")
                print(f"      - metadata: {data.get('metadata')}")

            if "error" in data:
                print(f"      - error: {data['error']}")

    elif response.status_code == 404:
        print("   ℹ️  章节不存在 (在测试环境中这是预期的)")
    else:
        print(f"   ❌ FAIL - 意外的状态码: {response.status_code}")
        print(f"   响应: {response.text}")

    print("\n" + "=" * 70)
    print("测试完成")
    print("=" * 70)


if __name__ == "__main__":
    try:
        test_get_chapter_detail()
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败: 请确保后端服务正在运行 (http://localhost:8000)")
    except Exception as e:
        print(f"❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
