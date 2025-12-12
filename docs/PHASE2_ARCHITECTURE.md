# PHASE2 Architecture: Serialized Manga Workflow

## Document Info

| Item | Value |
|------|-------|
| Version | 1.0 |
| Created | 2024-12 |
| Status | Approved |
| Related PRD | PHASE2_PRD.md |

---

## 1. Architecture Overview

### 1.1 Current State Problem

```
Current Data Flow (Broken):

User
 |
 +-- Story (characters: JSON blob, no FK)
 |    |
 |    +-- Project (story_id FK OK)
 |         |
 |         +-- Panel (character_name: String, no FK!)
 |              - Cannot reference Character table
 |              - Cannot use expressions/outfits
 |              - No scene binding
 |
 +-- Character (isolated island)
 |    +-- CharacterView
 |    +-- CharacterExpression
 |    +-- CharacterOutfit
 |
 +-- Scene (completely unused)
```

### 1.2 Target State

```
Target Data Flow (Connected):

User
 |
 +-- Story
 |    |
 |    +-- StoryCharacter (NEW: M2M join table)
 |    |    |
 |    |    +-- Character (FK reference)
 |    |
 |    +-- Project
 |         |
 |         +-- Panel
 |              +-- character_id (FK to Character)
 |              +-- expression_type (matches CharacterExpression)
 |              +-- outfit_id (FK to CharacterOutfit)
 |              +-- scene_id (FK to Scene)
 |
 +-- Character
 |    +-- reference_image (NEW)
 |    +-- style_prompt (NEW)
 |    +-- CharacterView
 |    +-- CharacterExpression
 |    +-- CharacterOutfit
 |
 +-- Scene
      +-- panels (reverse relation)
```

---

## 2. Data Model Changes

### 2.1 New Model: StoryCharacter

```prisma
// prisma/schema.prisma

// NEW: Story-Character many-to-many relationship
model StoryCharacter {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  story_id      String   @db.Uuid
  character_id  String   @db.Uuid
  role          String   // "protagonist" | "antagonist" | "supporting" | "minor"
  character_arc String?  @db.Text
  display_order Int      @default(0)
  created_at    DateTime @default(now()) @db.Timestamptz(6)
  updated_at    DateTime @default(now()) @db.Timestamptz(6)

  story     Story     @relation(fields: [story_id], references: [id], onDelete: Cascade)
  character Character @relation(fields: [character_id], references: [id], onDelete: Cascade)

  @@unique([story_id, character_id], map: "unique_story_character")
  @@index([story_id], map: "idx_story_characters_story")
  @@index([character_id], map: "idx_story_characters_character")
  @@map("story_characters")
}
```

### 2.2 Modified Model: Story

```prisma
model Story {
  // ... existing fields ...

  // DEPRECATED: Keep for backwards compatibility, but use story_characters relation
  characters  Json?  // Mark as optional, migrate to StoryCharacter

  // NEW: Real relationship
  story_characters StoryCharacter[]

  // ... rest unchanged ...
}
```

### 2.3 Modified Model: Character

```prisma
model Character {
  // ... existing fields ...

  // NEW fields
  reference_image String?  // Main reference image URL for IP-Adapter
  style_prompt    String?  @db.Text  // Detailed style description

  // NEW relations
  story_characters StoryCharacter[]
  panels           Panel[]

  // ... rest unchanged ...
}
```

### 2.4 Modified Model: Panel

```prisma
model Panel {
  // ... existing fields ...

  // DEPRECATED: Keep for backwards compatibility
  character_name  String?  // Will migrate to character_id

  // NEW: Foreign key relations
  character_id    String?  @db.Uuid
  expression_type String?  // "neutral" | "happy" | "sad" | etc.
  outfit_id       String?  @db.Uuid
  scene_id        String?  @db.Uuid

  // NEW: Relations
  character Character?      @relation(fields: [character_id], references: [id], onDelete: SetNull)
  outfit    CharacterOutfit? @relation(fields: [outfit_id], references: [id], onDelete: SetNull)
  scene     Scene?          @relation(fields: [scene_id], references: [id], onDelete: SetNull)

  // NEW: Indexes
  @@index([character_id], map: "idx_panels_character")
  @@index([scene_id], map: "idx_panels_scene")
  @@index([outfit_id], map: "idx_panels_outfit")

  // ... rest unchanged ...
}
```

### 2.5 Modified Model: CharacterOutfit

```prisma
model CharacterOutfit {
  // ... existing fields ...

  // NEW: Reverse relation
  panels Panel[]

  // ... rest unchanged ...
}
```

### 2.6 Modified Model: Scene

```prisma
model Scene {
  // ... existing fields ...

  // NEW: Reverse relation
  panels Panel[]

  // ... rest unchanged ...
}
```

---

## 3. Database Migration

### 3.1 Migration SQL

```sql
-- Migration: phase2_story_character_workflow
-- Description: Add Story-Character binding and Panel-Asset relations

-- Step 1: Create StoryCharacter table
CREATE TABLE story_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'supporting',
  character_arc TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_story_character UNIQUE (story_id, character_id)
);

CREATE INDEX idx_story_characters_story ON story_characters(story_id);
CREATE INDEX idx_story_characters_character ON story_characters(character_id);

-- Step 2: Add new columns to characters
ALTER TABLE characters ADD COLUMN IF NOT EXISTS reference_image VARCHAR(500);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS style_prompt TEXT;

-- Step 3: Add new columns to panels
ALTER TABLE panels ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE SET NULL;
ALTER TABLE panels ADD COLUMN IF NOT EXISTS expression_type VARCHAR(50);
ALTER TABLE panels ADD COLUMN IF NOT EXISTS outfit_id UUID REFERENCES character_outfits(id) ON DELETE SET NULL;
ALTER TABLE panels ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;

CREATE INDEX idx_panels_character ON panels(character_id);
CREATE INDEX idx_panels_scene ON panels(scene_id);
CREATE INDEX idx_panels_outfit ON panels(outfit_id);

-- Step 4: Add updated_at trigger for story_characters
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_story_characters_updated_at
    BEFORE UPDATE ON story_characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 Data Migration Script

```typescript
// scripts/migrate-phase2-data.ts

import { prisma } from "@/lib/db";

/**
 * Migrate existing data to new schema
 * Run AFTER Prisma migration
 */
async function migratePhase2Data() {
  console.log("Starting Phase 2 data migration...");

  // 1. Migrate Story.characters JSON to StoryCharacter table
  await migrateStoryCharacters();

  // 2. Migrate Panel.character_name to Panel.character_id
  await migratePanelCharacters();

  // 3. Set Character.reference_image from base_image_url
  await migrateCharacterReferenceImages();

  console.log("Phase 2 data migration completed!");
}

async function migrateStoryCharacters() {
  console.log("Migrating story characters...");

  const stories = await prisma.story.findMany({
    where: {
      characters: { not: null }
    },
    select: {
      id: true,
      user_id: true,
      characters: true
    }
  });

  for (const story of stories) {
    const chars = story.characters as Array<{ name: string; role?: string }> | null;
    if (!chars || !Array.isArray(chars)) continue;

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      // Try to find matching character in user's library
      const matchedCharacter = await prisma.character.findFirst({
        where: {
          user_id: story.user_id,
          name: { contains: char.name, mode: "insensitive" }
        }
      });

      if (matchedCharacter) {
        // Create StoryCharacter link
        await prisma.storyCharacter.upsert({
          where: {
            story_id_character_id: {
              story_id: story.id,
              character_id: matchedCharacter.id
            }
          },
          create: {
            story_id: story.id,
            character_id: matchedCharacter.id,
            role: mapRole(char.role),
            display_order: i
          },
          update: {}
        });

        console.log(`  Linked: Story "${story.id}" <-> Character "${matchedCharacter.name}"`);
      }
    }
  }
}

async function migratePanelCharacters() {
  console.log("Migrating panel characters...");

  const panels = await prisma.panel.findMany({
    where: {
      character_name: { not: null },
      character_id: null
    },
    include: {
      project: true
    }
  });

  for (const panel of panels) {
    if (!panel.character_name) continue;

    // Try to find matching character
    const matchedCharacter = await prisma.character.findFirst({
      where: {
        user_id: panel.project.user_id,
        name: { contains: panel.character_name, mode: "insensitive" }
      }
    });

    if (matchedCharacter) {
      await prisma.panel.update({
        where: { id: panel.id },
        data: { character_id: matchedCharacter.id }
      });

      console.log(`  Linked: Panel "${panel.id}" -> Character "${matchedCharacter.name}"`);
    }
  }
}

async function migrateCharacterReferenceImages() {
  console.log("Migrating character reference images...");

  await prisma.character.updateMany({
    where: {
      base_image_url: { not: null },
      reference_image: null
    },
    data: {
      // Copy base_image_url to reference_image
      // Note: This needs raw SQL or individual updates
    }
  });

  // Use raw SQL for bulk update
  await prisma.$executeRaw`
    UPDATE characters
    SET reference_image = base_image_url
    WHERE base_image_url IS NOT NULL AND reference_image IS NULL
  `;
}

function mapRole(role?: string): string {
  const roleMap: Record<string, string> = {
    "主角": "protagonist",
    "反派": "antagonist",
    "配角": "supporting",
    "龙套": "minor",
    "protagonist": "protagonist",
    "antagonist": "antagonist",
    "supporting": "supporting",
    "minor": "minor"
  };
  return roleMap[role || ""] || "supporting";
}

// Run migration
migratePhase2Data().catch(console.error);
```

---

## 4. API Specifications

### 4.1 Story-Character APIs (NEW)

#### POST /api/story/{storyId}/characters

Add character to story.

**Request:**
```typescript
{
  character_id: string;  // UUID
  role: "protagonist" | "antagonist" | "supporting" | "minor";
  character_arc?: string;
}
```

**Response:**
```typescript
{
  success: true;
  story_character: {
    id: string;
    story_id: string;
    character_id: string;
    role: string;
    character_arc: string | null;
    display_order: number;
    character: {
      id: string;
      name: string;
      reference_image: string | null;
      // ... basic character info
    }
  }
}
```

#### GET /api/story/{storyId}/characters

Get all characters in story.

**Response:**
```typescript
{
  success: true;
  characters: Array<{
    id: string;  // StoryCharacter.id
    character_id: string;
    role: string;
    character_arc: string | null;
    display_order: number;
    character: {
      id: string;
      name: string;
      reference_image: string | null;
      base_image_url: string | null;
      expressions: Array<{ expression_type: string; image_url: string }>;
      outfits: Array<{ id: string; outfit_name: string; image_url: string }>;
    }
  }>
}
```

#### DELETE /api/story/{storyId}/characters/{characterId}

Remove character from story.

**Response:**
```typescript
{
  success: true;
  message: "Character removed from story"
}
```

#### PATCH /api/story/{storyId}/characters/{characterId}

Update character's role/arc in story.

**Request:**
```typescript
{
  role?: string;
  character_arc?: string;
  display_order?: number;
}
```

---

### 4.2 Panel Asset APIs (MODIFIED)

#### PATCH /api/panel/{panelId}

Update panel with character/expression/outfit/scene bindings.

**Request (Extended):**
```typescript
{
  // ... existing fields ...
  character_id?: string | null;      // NEW
  expression_type?: string | null;   // NEW
  outfit_id?: string | null;         // NEW
  scene_id?: string | null;          // NEW
}
```

#### PATCH /api/panel/batch-update (NEW)

Batch update multiple panels.

**Request:**
```typescript
{
  panel_ids: string[];
  updates: {
    character_id?: string | null;
    expression_type?: string | null;
    outfit_id?: string | null;
    scene_id?: string | null;
  }
}
```

**Response:**
```typescript
{
  success: true;
  updated_count: number;
  panels: Panel[]
}
```

#### POST /api/panel/build-prompt (MODIFIED)

Build prompt from panel's bound assets.

**Request:**
```typescript
{
  panel_id: string;
  // REMOVED: character_id (now read from Panel.character_id)
  style_key?: string;
  soften?: boolean;
  aspect_ratio?: string;
}
```

**Response:**
```typescript
{
  success: true;
  prompt: string;
  negative_prompt: string;
  // NEW: Show what was used
  bindings: {
    character: { id: string; name: string } | null;
    expression: string | null;
    outfit: { id: string; name: string } | null;
    scene: { id: string; name: string } | null;
  };
  blocks: { ... }
}
```

---

### 4.3 Variant APIs (NEW)

#### POST /api/panel/{panelId}/variants

Generate variants for a panel.

**Request:**
```typescript
{
  variant_types: Array<"composition" | "lighting" | "angle">;
}
```

**Response:**
```typescript
{
  success: true;
  task_ids: string[];
  message: "Generating 3 variants"
}
```

#### GET /api/panel/{panelId}/variants

Get all variants for a panel.

**Response:**
```typescript
{
  success: true;
  variants: Array<{
    id: string;
    image_url: string;
    variant_type: string;
    is_selected: boolean;
    created_at: string;
  }>
}
```

#### PATCH /api/panel/variants/{variantId}/select

Select a variant as the main panel image.

**Response:**
```typescript
{
  success: true;
  panel: Panel;  // Updated with new generated_image
}
```

---

### 4.4 Export APIs (NEW)

#### POST /api/project/{projectId}/export

Export project to file.

**Request:**
```typescript
{
  format: "png" | "pdf" | "zip";
  layout: "grid" | "scroll";
  options: {
    watermark?: boolean;
    watermark_text?: string;
    resolution: "high" | "medium" | "low";
    columns?: number;  // For grid layout
    gap?: number;      // Spacing between panels
  }
}
```

**Response:**
```typescript
{
  success: true;
  task_id: string;
  status: "processing";
  message: "Export started"
}
```

#### GET /api/project/{projectId}/export/status

Check export status.

**Response:**
```typescript
{
  success: true;
  status: "processing" | "completed" | "failed";
  progress: number;  // 0-100
  download_url?: string;  // When completed
  error?: string;  // When failed
}
```

---

## 5. Component Architecture

### 5.1 New Components

```
src/components/
├── StoryCharacter/
│   ├── CharacterSelector.tsx       // Select from library modal
│   ├── StoryCharacterList.tsx      // List of characters in story
│   ├── StoryCharacterCard.tsx      // Individual character card
│   └── RoleSelector.tsx            // Role dropdown
│
├── PanelAssets/
│   ├── PanelCharacterSelector.tsx  // Character dropdown for panel
│   ├── ExpressionGrid.tsx          // 3x3 expression selector
│   ├── OutfitSelector.tsx          // Outfit dropdown
│   ├── SceneSelector.tsx           // Scene grid/dropdown
│   └── AssetSummary.tsx            // Show selected assets
│
├── BatchGeneration/
│   ├── BatchGenerationModal.tsx    // Main modal
│   ├── PanelSelector.tsx           // Multi-select panels
│   ├── GenerationProgress.tsx      // Progress tracker
│   └── FailedPanelsList.tsx        // Retry interface
│
├── Variants/
│   ├── VariantGenerator.tsx        // Generate variants modal
│   ├── VariantGallery.tsx          // Compare variants
│   └── VariantSelector.tsx         // Select best variant
│
└── Export/
    ├── ExportModal.tsx             // Export settings modal
    ├── LayoutPreview.tsx           // Preview export layout
    └── ExportProgress.tsx          // Download progress
```

### 5.2 Modified Components

```
src/app/scripts/[id]/
├── page.tsx                        // Add character management section
└── components/
    ├── PanelCard.tsx               // Add asset selectors
    └── PanelListView.tsx           // Add batch operations

src/components/AssetLibrary/
├── CharacterLibrary.tsx            // Add reference_image field
└── CharacterCard.tsx               // Show reference image
```

---

## 6. Prompt Assembly System

### 6.1 Sandwich Prompt Structure

```
[Style Prefix] + [Character Block] + [Scene Block] + [Action Block] + [Quality Suffix]
```

### 6.2 Updated buildPanelPrompt Function

```typescript
// src/lib/prompt-builder.ts

interface PromptBuildInput {
  panel: Panel & {
    character?: Character & {
      expressions: CharacterExpression[];
      outfits: CharacterOutfit[];
    };
    outfit?: CharacterOutfit;
    scene?: Scene;
  };
  style?: ComicStyle | null;
  soften?: boolean;
  aspectRatio?: string;
}

export function buildPanelPrompt(input: PromptBuildInput): PromptResult {
  const { panel, style, soften = true } = input;
  const blocks: string[] = [];

  // 1. Style prefix
  if (style?.prompt_prefix) {
    blocks.push(style.prompt_prefix);
  }

  // 2. Character block (from Panel.character relation)
  if (panel.character) {
    // Use LoRA trigger word if available
    if (panel.character.lora_trigger_word) {
      blocks.push(panel.character.lora_trigger_word);
    }

    // Add style prompt
    if (panel.character.style_prompt) {
      blocks.push(panel.character.style_prompt);
    }

    // Add expression
    if (panel.expression_type) {
      const expr = panel.character.expressions?.find(
        e => e.expression_type === panel.expression_type
      );
      if (expr?.prompt_suffix) {
        blocks.push(expr.prompt_suffix);
      } else {
        blocks.push(`${panel.expression_type} expression`);
      }
    }

    // Add outfit
    if (panel.outfit?.prompt_modifier) {
      blocks.push(panel.outfit.prompt_modifier);
    }
  }

  // 3. Scene block (from Panel.scene relation)
  if (panel.scene?.prompt) {
    blocks.push(panel.scene.prompt);
  }

  // 4. Action/description block
  if (panel.visual_prompt) {
    blocks.push(panel.visual_prompt);
  } else if (panel.description) {
    blocks.push(panel.description);
  }

  // 5. Camera/composition
  if (panel.camera_angle) {
    blocks.push(`${panel.camera_angle} angle`);
  }
  if (panel.shot_size) {
    blocks.push(`${panel.shot_size} shot`);
  }

  // 6. Quality suffix
  blocks.push("high quality, detailed, professional");

  return {
    prompt: blocks.join(", "),
    negativePrompt: buildNegativePrompt(style),
    blocks: { style, character, scene, action, quality }
  };
}
```

---

## 7. State Management

### 7.1 Story Editor State

```typescript
// src/app/scripts/[id]/hooks/useStoryEditor.ts

interface StoryEditorState {
  story: Story | null;
  storyCharacters: StoryCharacter[];  // NEW
  panels: Panel[];
  selectedPanelId: string | null;

  // Actions
  addCharacterToStory: (characterId: string, role: string) => Promise<void>;
  removeCharacterFromStory: (characterId: string) => Promise<void>;
  updatePanelAssets: (panelId: string, assets: PanelAssets) => Promise<void>;
  batchUpdatePanels: (panelIds: string[], assets: PanelAssets) => Promise<void>;
}

interface PanelAssets {
  character_id?: string | null;
  expression_type?: string | null;
  outfit_id?: string | null;
  scene_id?: string | null;
}
```

---

## 8. Error Handling

### 8.1 Migration Errors

- **FK constraint violation**: Log and skip, continue migration
- **Duplicate entries**: Use upsert, ignore duplicates
- **Missing references**: Set to null, log for manual review

### 8.2 Runtime Errors

- **Character deleted but Panel still references**: OnDelete SetNull handles this
- **Batch generation partial failure**: Mark failed panels, allow retry
- **Export timeout**: Background job with status polling

---

## 9. Performance Considerations

### 9.1 Query Optimization

```typescript
// Load panel with all related assets in single query
const panel = await prisma.panel.findUnique({
  where: { id: panelId },
  include: {
    character: {
      include: {
        expressions: true,
        outfits: true
      }
    },
    outfit: true,
    scene: true,
    project: true
  }
});
```

### 9.2 Caching Strategy

- Cache character expressions/outfits during panel editing session
- Cache comic styles (rarely change)
- No cache for panels (frequently modified)

---

## 10. Security Considerations

### 10.1 Authorization

All APIs must verify:
1. User is authenticated
2. User owns the Story/Panel/Character being accessed
3. Panel belongs to user's project

### 10.2 Data Validation

- Validate character_id belongs to user before binding
- Validate expression_type is valid enum value
- Validate outfit_id belongs to selected character

---

## Appendix A: Full Prisma Schema Diff

See `prisma/migrations/YYYYMMDD_phase2_workflow/migration.sql` after generation.

## Appendix B: Type Definitions

```typescript
// src/types/phase2.types.ts

export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "minor";

export type ExpressionType =
  | "neutral" | "happy" | "sad" | "angry" | "surprised"
  | "shy" | "confident" | "worried" | "determined";

export type VariantType = "composition" | "lighting" | "angle";

export type ExportFormat = "png" | "pdf" | "zip";

export type ExportLayout = "grid" | "scroll";

export interface StoryCharacterWithDetails {
  id: string;
  story_id: string;
  character_id: string;
  role: CharacterRole;
  character_arc: string | null;
  display_order: number;
  character: CharacterWithAssets;
}

export interface CharacterWithAssets {
  id: string;
  name: string;
  reference_image: string | null;
  base_image_url: string | null;
  style_prompt: string | null;
  expressions: CharacterExpression[];
  outfits: CharacterOutfit[];
}

export interface PanelWithAssets {
  id: string;
  // ... existing panel fields
  character_id: string | null;
  expression_type: ExpressionType | null;
  outfit_id: string | null;
  scene_id: string | null;
  character: CharacterWithAssets | null;
  outfit: CharacterOutfit | null;
  scene: Scene | null;
}
```
