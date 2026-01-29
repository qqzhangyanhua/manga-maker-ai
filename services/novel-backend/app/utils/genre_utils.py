"""
专题类型（genre）处理工具函数
统一处理 genre 参数的清理逻辑
"""

from typing import Optional


def clean_genre(genre: Optional[str]) -> Optional[str]:
    """
    统一清理 genre 参数
    
    处理规则：
    - None -> None
    - 空字符串/空格 -> None
    - "general" -> None
    - 其他 -> strip() 后的值
    
    Args:
        genre: 原始 genre 参数
        
    Returns:
        清理后的 genre 值，如果为空或 "general" 则返回 None
    """
    if not genre:
        return None
    
    # 转换为字符串并去除首尾空格
    cleaned = genre.strip() if isinstance(genre, str) else str(genre).strip()
    
    # 空字符串或 "general" 都视为 None
    if not cleaned or cleaned.lower() == "general":
        return None
    
    return cleaned
