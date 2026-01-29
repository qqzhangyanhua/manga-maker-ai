# -*- coding: utf-8 -*-
"""使用 requests 测试 HTTP API"""
import requests
import json
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test():
    url = "http://localhost:8000/workflow/start"
    headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZTZlZGE4NC1lMDYwLTRlMzQtOTNlYS1jMGNiMTUwNmVkMTIiLCJlbWFpbCI6Inlhbno1NzIxM0BnbWFpbC5jb20iLCJuYW1lIjoiemhhbmd5YW5odWEiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3Njk2OTIzMzcsImV4cCI6MTc3MDI5NzEzN30.pKx2IEWjkashxmQ2qpes1pr29C4LmzxkXGzKBAqV_mQ",
        "Content-Type": "application/json",
    }
    
    print("=" * 60)
    print("测试 HTTP API")
    print("=" * 60)
    
    # 测试1: genre='狗血女文'
    print("\n[1] genre='狗血女文':")
    data = {"genre": "狗血女文"}
    print(f"  请求体: {json.dumps(data, ensure_ascii=False)}")
    
    response = requests.post(url, headers=headers, json=data, timeout=120)
    print(f"  状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"  available_templates: {len(result.get('available_templates', []))} 个")
        if result.get('available_templates'):
            for t in result['available_templates']:
                print(f"    - {t['name']}")
    else:
        print(f"  错误: {response.text[:500]}")
    
    # 测试2: genre=None
    print("\n[2] genre=None:")
    data = {"genre": None}
    response = requests.post(url, headers=headers, json=data, timeout=120)
    print(f"  状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"  available_templates: {len(result.get('available_templates', []))} 个")

if __name__ == "__main__":
    test()
