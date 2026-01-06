-- Add background fields to chapters table
ALTER TABLE chapters 
  ADD COLUMN IF NOT EXISTS scene_id UUID,
  ADD COLUMN IF NOT EXISTS background_image_url TEXT,
  ADD COLUMN IF NOT EXISTS background_prompt TEXT;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chapters_scene_id_fkey'
  ) THEN
    ALTER TABLE chapters 
      ADD CONSTRAINT chapters_scene_id_fkey 
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_chapters_scene ON chapters(scene_id);
