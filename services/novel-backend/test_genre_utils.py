"""
测试 genre_utils 工具函数
验证清理逻辑的正确性
"""

from app.utils.genre_utils import clean_genre


def test_clean_genre():
    """测试 clean_genre 函数的各种情况"""
    
    # 测试 None
    assert clean_genre(None) is None, "None should return None"
    
    # 测试空字符串
    assert clean_genre("") is None, "Empty string should return None"
    assert clean_genre("   ") is None, "Whitespace-only string should return None"
    
    # 测试 "general"
    assert clean_genre("general") is None, "'general' should return None"
    assert clean_genre("General") is None, "'General' (capitalized) should return None"
    assert clean_genre("GENERAL") is None, "'GENERAL' (uppercase) should return None"
    assert clean_genre("  general  ") is None, "'  general  ' (with spaces) should return None"
    
    # 测试正常值
    assert clean_genre("玄幻小说") == "玄幻小说", "Normal genre should be preserved"
    assert clean_genre("  玄幻小说  ") == "玄幻小说", "Genre with spaces should be trimmed"
    assert clean_genre("规则怪谈") == "规则怪谈", "Another normal genre should be preserved"
    
    # 测试非字符串类型（转换为字符串）
    assert clean_genre(123) == "123", "Non-string should be converted to string"
    
    print("✅ All tests passed!")


if __name__ == "__main__":
    test_clean_genre()
