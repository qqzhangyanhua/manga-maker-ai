-- 将所有现有故事设置为连载模式
-- 执行时间: 2024-01-XX

-- 1. 更新所有故事为连载模式
UPDATE stories
SET is_serialized = true
WHERE is_serialized = false;

-- 2. 验证更新结果
DO $$
DECLARE
  total_stories INTEGER;
  serialized_stories INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_stories FROM stories;
  SELECT COUNT(*) INTO serialized_stories FROM stories WHERE is_serialized = true;

  RAISE NOTICE '总故事数: %', total_stories;
  RAISE NOTICE '连载模式故事数: %', serialized_stories;

  IF total_stories > 0 AND serialized_stories = total_stories THEN
    RAISE NOTICE '✅ 所有故事已成功设置为连载模式';
  ELSIF total_stories > 0 THEN
    RAISE WARNING '⚠️ 部分故事未设置为连载模式';
  ELSE
    RAISE NOTICE 'ℹ️ 数据库中暂无故事';
  END IF;
END $$;
