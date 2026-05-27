-- 给 characters 表添加 usage_count 字段
ALTER TABLE characters ADD COLUMN usage_count integer NOT NULL DEFAULT 0;

-- 创建视图：从 works.characters jsonb 数组统计每个角色的引用次数
CREATE OR REPLACE VIEW character_usage_counts AS
SELECT
  c.id AS character_id,
  COUNT(w.id) AS usage_count
FROM characters c
LEFT JOIN works w ON w.characters @> jsonb_build_array(jsonb_build_object('id', c.id::text))
GROUP BY c.id;

-- 创建触发器函数：works 插入/更新时自动更新 characters.usage_count
CREATE OR REPLACE FUNCTION update_character_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  char_id text;
BEGIN
  -- 处理旧数据（UPDATE / DELETE）
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.characters IS NOT NULL THEN
    FOR char_id IN
      SELECT elem->>'id' FROM jsonb_array_elements(OLD.characters) AS elem
      WHERE elem->>'id' IS NOT NULL
    LOOP
      UPDATE characters
      SET usage_count = GREATEST(0, usage_count - 1)
      WHERE id = char_id::uuid;
    END LOOP;
  END IF;

  -- 处理新数据（INSERT / UPDATE）
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.characters IS NOT NULL THEN
    FOR char_id IN
      SELECT elem->>'id' FROM jsonb_array_elements(NEW.characters) AS elem
      WHERE elem->>'id' IS NOT NULL
    LOOP
      UPDATE characters
      SET usage_count = usage_count + 1
      WHERE id = char_id::uuid;
    END LOOP;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- 绑定触发器到 works 表
CREATE TRIGGER trg_update_character_usage_count
AFTER INSERT OR UPDATE OF characters OR DELETE
ON works
FOR EACH ROW
EXECUTE FUNCTION update_character_usage_count();