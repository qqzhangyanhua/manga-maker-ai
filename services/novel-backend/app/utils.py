"""
通用工具函数
"""

import json
import re
import logging
from typing import Any

logger = logging.getLogger(__name__)


def extract_json_from_llm_response(content: str) -> Any:
    """
    从 LLM 响应中提取 JSON 内容。

    处理以下情况：
    1. 纯 JSON 字符串
    2. Markdown 代码块包裹的 JSON (```json ... ``` 或 ``` ... ```)
    3. 带有前导/尾随文本的 JSON

    Args:
        content: LLM 响应的原始内容

    Returns:
        解析后的 JSON 对象

    Raises:
        json.JSONDecodeError: 如果无法提取或解析 JSON
    """
    if not content:
        raise json.JSONDecodeError("Empty content", "", 0)

    content = content.strip()

    # 尝试 1: 直接解析（纯 JSON 情况）
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 尝试 2: 提取 markdown 代码块中的 JSON
    # 匹配 ```json ... ``` 或 ``` ... ```
    code_block_pattern = r"```(?:json)?\s*\n?([\s\S]*?)\n?```"
    matches = re.findall(code_block_pattern, content)

    for match in matches:
        try:
            return json.loads(match.strip())
        except json.JSONDecodeError:
            continue

    # 尝试 3: 查找第一个 [ 或 { 到最后一个 ] 或 } 的内容
    # 处理 JSON 数组
    array_match = re.search(r"\[[\s\S]*\]", content)
    if array_match:
        try:
            return json.loads(array_match.group())
        except json.JSONDecodeError:
            pass

    # 处理 JSON 对象
    object_match = re.search(r"\{[\s\S]*\}", content)
    if object_match:
        try:
            return json.loads(object_match.group())
        except json.JSONDecodeError:
            pass

    # 所有尝试都失败
    raise json.JSONDecodeError(
        f"无法从 LLM 响应中提取有效 JSON",
        content[:200],
        0
    )
