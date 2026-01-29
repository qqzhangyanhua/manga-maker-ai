# -*- coding: utf-8 -*-
"""测试 TCP 连接延迟"""
import asyncio
import time
import socket
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_tcp():
    print("=" * 60)
    print("TCP 连接延迟测试")
    print("=" * 60)
    
    host = "111.228.37.74"
    port = 5432
    
    # 测试多次 TCP 连接
    times = []
    for i in range(5):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        
        start = time.time()
        sock.connect((host, port))
        latency = (time.time() - start) * 1000
        times.append(latency)
        
        sock.close()
        print(f"  第 {i+1} 次连接: {latency:.2f}ms")
    
    print(f"\n平均延迟: {sum(times)/len(times):.2f}ms")

if __name__ == "__main__":
    test_tcp()
