# PHASE2 Implementation Plan: Serialized Manga Workflow

## Document Info

| Item | Value |
|------|-------|
| Version | 1.0 |
| Created | 2024-12 |
| Status | Ready for Execution |
| Related Docs | PHASE2_PRD.md, PHASE2_ARCHITECTURE.md |

---

## 1. Implementation Overview

### 1.1 Guiding Principles

1. **Data First**: Fix data structures before building features
2. **Backwards Compatible**: Old data must continue working
3. **Incremental Delivery**: Each sprint produces usable value
4. **Test as You Go**: No sprint complete without API tests

### 1.2 Sprint Summary

| Sprint | Focus | Duration | Deliverables |
|--------|-------|----------|--------------|
| Sprint 1 | Data Structure | 1-2 weeks | Schema migration, data scripts |
| Sprint 2 | Story-Character | 1 week | APIs + basic UI |
| Sprint 3 | Panel-Asset Binding | 1-2 weeks | APIs + panel editor UI |
| Sprint 4 | Batch Generation | 1 week | Batch UI + variants |
| Sprint 5 | Export | 1 week | Export APIs + UI |

---

## 2. Sprint 1: Data Structure Migration

### 2.1 Goals

- Create all new database tables and columns
- Migrate existing data to new structure
- Ensure zero data loss and backwards compatibility

### 2.2 Tasks

#### Task 1.1: Write Prisma Schema Changes

**File:** `prisma/schema.prisma`

**Changes:**
```
[ ] Add StoryCharacter model (complete definition in ARCHITECTURE.md)
[ ] Add Character.reference_image field
[ ] Add Character.style_prompt field
[ ] Add Character.story_characters relation
[ ] Add Character.panels relation
[ ] Add Story.story_characters relation
[ ] Add Panel.character_id field + FK
[ ] Add Panel.expression_type field
[ ] Add Panel.outfit_id field + FK
[ ] Add Panel.scene_id field + FK
[ ] Add Panel.character relation
[ ] Add Panel.outfit relation
[ ] Add Panel.scene relation
[ ] Add CharacterOutfit.panels relation
[ ] Add Scene.panels relation
```

**Verification:**
- `npx prisma validate` passes
- `npx prisma generate` succeeds

---

#### Task 1.2: Create and Run Migration

**Command:**
```bash
npx prisma migrate dev --name phase2_story_character_workflow
```

**Manual SQL Review:**
```
[ ] Verify CREATE TABLE story_characters
[ ] Verify ALTER TABLE characters (2 new columns)
[ ] Verify ALTER TABLE panels (4 new columns)
[ ] Verify all indexes created
[ ] Verify all foreign keys created
```

**Rollback Script:** (save separately)
```sql
-- Rollback: phase2_story_character_workflow
DROP TABLE IF EXISTS story_characters;
ALTER TABLE characters DROP COLUMN IF EXISTS reference_image;
ALTER TABLE characters DROP COLUMN IF EXISTS style_prompt;
ALTER TABLE panels DROP COLUMN IF EXISTS character_id;
ALTER TABLE panels DROP COLUMN IF EXISTS expression_type;
ALTER TABLE panels DROP COLUMN IF EXISTS outfit_id;
ALTER TABLE panels DROP COLUMN IF EXISTS scene_id;
```

---

#### Task 1.3: Create Data Migration Script

**File:** `scripts/migrate-phase2-data.ts`

**Functions:**
```
[ ] migrateStoryCharacters()
    - Read Story.characters JSON
    - Match character names to Character table
    - Create StoryCharacter records

[ ] migratePanelCharacters()
    - Read Panel.character_name
    - Match to Character table
    - Set Panel.character_id

[ ] migrateCharacterReferenceImages()
    - Copy base_image_url to reference_image
```

**Verification:**
```
[ ] Run on dev database with test data
[ ] Verify StoryCharacter count matches expected
[ ] Verify Panel.character_id populated for matching panels
[ ] Verify no data loss in original fields
```

---

#### Task 1.4: Create Type Definitions

**File:** `src/types/phase2.types.ts`

**Types:**
```
[ ] CharacterRole type
[ ] ExpressionType type
[ ] VariantType type
[ ] ExportFormat type
[ ] ExportLayout type
[ ] StoryCharacterWithDetails interface
[ ] CharacterWithAssets interface
[ ] PanelWithAssets interface
[ ] PanelAssets interface (for updates)
```

---

#### Task 1.5: Update CLAUDE.md

**File:** `CLAUDE.md`

**Updates:**
```
[ ] Add StoryCharacter model documentation
[ ] Update Panel model documentation (new fields)
[ ] Update Character model documentation (new fields)
[ ] Add Phase 2 API endpoints to Available Endpoints
[ ] Update character workflow documentation
```

---

### 2.3 Sprint 1 Acceptance Criteria

```
[ ] Prisma schema compiles without errors
[ ] Migration runs successfully on clean database
[ ] Migration runs successfully on database with existing data
[ ] Data migration script runs without errors
[ ] All existing functionality continues to work
[ ] Type definitions complete and exported
[ ] Documentation updated
```

---

## 3. Sprint 2: Story-Character System

### 3.1 Goals

- APIs for managing story-character relationships
- UI for adding characters to stories
- Display characters in story editor

### 3.2 Tasks

#### Task 2.1: Story-Character API - Add Character

**File:** `src/app/api/story/[id]/characters/route.ts`

**Endpoints:**
```
[ ] POST /api/story/{id}/characters
    - Validate story ownership
    - Validate character ownership
    - Create StoryCharacter record
    - Return with character details

[ ] GET /api/story/{id}/characters
    - Validate story ownership
    - Return all StoryCharacters with character data
    - Include expressions and outfits for each character
```

**Tests:**
```
[ ] POST returns 201 on success
[ ] POST returns 400 if character already in story
[ ] POST returns 404 if story not found
[ ] POST returns 403 if story not owned by user
[ ] GET returns all characters with details
[ ] GET returns empty array for new story
```

---

#### Task 2.2: Story-Character API - Manage Character

**File:** `src/app/api/story/[id]/characters/[characterId]/route.ts`

**Endpoints:**
```
[ ] DELETE /api/story/{storyId}/characters/{characterId}
    - Validate ownership
    - Delete StoryCharacter record
    - Do NOT delete the Character itself

[ ] PATCH /api/story/{storyId}/characters/{characterId}
    - Update role
    - Update character_arc
    - Update display_order
```

**Tests:**
```
[ ] DELETE returns 200 on success
[ ] DELETE returns 404 if not found
[ ] PATCH updates role correctly
[ ] PATCH updates character_arc correctly
```

---

#### Task 2.3: Story Editor - Character Management UI

**Files:**
- `src/components/StoryCharacter/CharacterSelector.tsx`
- `src/components/StoryCharacter/StoryCharacterList.tsx`
- `src/components/StoryCharacter/StoryCharacterCard.tsx`

**Components:**
```
[ ] CharacterSelector (Modal)
    - Fetch user's characters
    - Grid display with images
    - Click to add to story
    - Role selection dropdown

[ ] StoryCharacterList
    - Display characters in story
    - Drag to reorder
    - Remove button

[ ] StoryCharacterCard
    - Character image
    - Name and role
    - Edit arc button
    - Remove button
```

---

#### Task 2.4: Integrate into Story Editor Page

**File:** `src/app/scripts/[id]/page.tsx`

**Changes:**
```
[ ] Add "Story Characters" section to left panel
[ ] Fetch story characters on page load
[ ] Add "Add Character" button
[ ] Display StoryCharacterList
[ ] Handle add/remove/update actions
```

---

### 3.3 Sprint 2 Acceptance Criteria

```
[ ] Can add character from library to story
[ ] Can remove character from story
[ ] Can update character role in story
[ ] Characters display in story editor
[ ] Character images show in list
[ ] All API tests pass
```

---

## 4. Sprint 3: Panel-Asset Binding

### 4.1 Goals

- Panel editor can select character/expression/outfit/scene
- Prompt builder uses panel's bound assets
- Batch update panels

### 4.2 Tasks

#### Task 3.1: Update Panel API

**File:** `src/app/api/panel/[id]/route.ts`

**Changes:**
```
[ ] PATCH accepts new fields:
    - character_id
    - expression_type
    - outfit_id
    - scene_id

[ ] Validation:
    - character_id must belong to user
    - outfit_id must belong to selected character
    - scene_id must belong to user
    - expression_type must be valid enum
```

---

#### Task 3.2: Batch Update API

**File:** `src/app/api/panel/batch-update/route.ts`

**Endpoint:**
```
[ ] PATCH /api/panel/batch-update
    - Accept panel_ids array
    - Accept updates object
    - Validate all panels belong to user
    - Update all panels in transaction
    - Return updated panels
```

---

#### Task 3.3: Update Prompt Builder

**File:** `src/lib/prompt-builder.ts`

**Changes:**
```
[ ] Read character from panel.character relation (not parameter)
[ ] Include character.style_prompt
[ ] Include expression.prompt_suffix
[ ] Include outfit.prompt_modifier
[ ] Include scene.prompt
[ ] Return bindings info in response
```

---

#### Task 3.4: Update Build-Prompt API

**File:** `src/app/api/panel/build-prompt/route.ts`

**Changes:**
```
[ ] Remove character_id from request body
[ ] Load panel with character/outfit/scene relations
[ ] Pass to buildPanelPrompt
[ ] Return bindings info
```

---

#### Task 3.5: Panel Asset Selector Components

**Files:**
- `src/components/PanelAssets/PanelCharacterSelector.tsx`
- `src/components/PanelAssets/ExpressionGrid.tsx`
- `src/components/PanelAssets/OutfitSelector.tsx`
- `src/components/PanelAssets/SceneSelector.tsx`

**Components:**
```
[ ] PanelCharacterSelector
    - Dropdown showing story's characters
    - On change: update panel.character_id
    - Show character image next to name

[ ] ExpressionGrid
    - 3x3 grid of expression images
    - Fetch from selected character's expressions
    - Highlight selected expression
    - On click: update panel.expression_type

[ ] OutfitSelector
    - Dropdown showing character's outfits
    - On change: update panel.outfit_id

[ ] SceneSelector
    - Grid/dropdown of user's scenes
    - On change: update panel.scene_id
    - Show scene preview
```

---

#### Task 3.6: Integrate into Panel Editor

**File:** `src/app/scripts/[id]/components/PanelCard.tsx`

**Changes:**
```
[ ] Add character selector above description
[ ] Add expression grid (conditional on character selected)
[ ] Add outfit selector (conditional on character selected)
[ ] Add scene selector
[ ] Show selected assets summary
[ ] Update panel on selection change
```

---

### 4.3 Sprint 3 Acceptance Criteria

```
[ ] Can select character for panel from story's characters
[ ] Expression grid shows after character selected
[ ] Can select expression for panel
[ ] Can select outfit for panel
[ ] Can select scene for panel
[ ] Prompt builder uses all selected assets
[ ] Batch update works for multiple panels
[ ] All API tests pass
```

---

## 5. Sprint 4: Batch Generation & Variants

### 5.1 Goals

- Batch generate images for multiple panels
- Generate variants for comparison
- Select best variant

### 5.2 Tasks

#### Task 4.1: Batch Generation UI

**Files:**
- `src/components/BatchGeneration/BatchGenerationModal.tsx`
- `src/components/BatchGeneration/PanelSelector.tsx`
- `src/components/BatchGeneration/GenerationProgress.tsx`

**Components:**
```
[ ] BatchGenerationModal
    - Open from toolbar button
    - Contains PanelSelector and GenerationProgress
    - Settings: style, quality, failure mode

[ ] PanelSelector
    - Checkbox list of panels
    - "Select all without image" option
    - Show panel thumbnail and description

[ ] GenerationProgress
    - Progress bar
    - Current panel indicator
    - Success/failure list
    - Pause/cancel buttons
```

---

#### Task 4.2: Variant Generation API

**File:** `src/app/api/panel/[id]/variants/route.ts`

**Endpoints:**
```
[ ] POST /api/panel/{id}/variants
    - Generate 1-3 variants
    - Use different prompts for each type
    - Return task IDs

[ ] GET /api/panel/{id}/variants
    - Return all variants for panel
    - Include image URLs and types
```

---

#### Task 4.3: Variant Selection API

**File:** `src/app/api/panel/variants/[id]/select/route.ts`

**Endpoint:**
```
[ ] PATCH /api/panel/variants/{id}/select
    - Set variant.is_selected = true
    - Update panel.generated_image = variant.image_url
    - Unselect other variants for same panel
```

---

#### Task 4.4: Variant UI Components

**Files:**
- `src/components/Variants/VariantGenerator.tsx`
- `src/components/Variants/VariantGallery.tsx`

**Components:**
```
[ ] VariantGenerator
    - Button to generate variants
    - Loading state while generating

[ ] VariantGallery
    - Side-by-side comparison
    - Click to select
    - Show variant type label
```

---

### 5.3 Sprint 4 Acceptance Criteria

```
[ ] Can open batch generation modal
[ ] Can select panels for batch generation
[ ] Progress shows during generation
[ ] Failed panels shown with retry option
[ ] Can generate variants for single panel
[ ] Variants display in gallery
[ ] Can select variant as main image
```

---

## 6. Sprint 5: Export System

### 6.1 Goals

- Export project to PNG/PDF/ZIP
- Preview export layout
- Download generated files

### 6.2 Tasks

#### Task 5.1: Export API

**File:** `src/app/api/project/[id]/export/route.ts`

**Endpoints:**
```
[ ] POST /api/project/{id}/export
    - Queue export job
    - Return task ID

[ ] GET /api/project/{id}/export/status
    - Return job status
    - Return download URL when complete
```

---

#### Task 5.2: Export Engine

**File:** `src/lib/export-engine.ts`

**Functions:**
```
[ ] exportToPng(project, options)
    - Fetch all panel images
    - Arrange in grid layout
    - Render to canvas
    - Export as PNG

[ ] exportToPdf(project, options)
    - Use pdf-lib or similar
    - Multiple pages if needed

[ ] exportToZip(project, options)
    - Download all images
    - Create ZIP archive
```

---

#### Task 5.3: Export UI

**Files:**
- `src/components/Export/ExportModal.tsx`
- `src/components/Export/LayoutPreview.tsx`
- `src/components/Export/ExportProgress.tsx`

**Components:**
```
[ ] ExportModal
    - Format selector (PNG/PDF/ZIP)
    - Layout options
    - Resolution setting
    - Watermark toggle
    - Start export button

[ ] LayoutPreview
    - Preview how export will look
    - Show grid arrangement

[ ] ExportProgress
    - Progress bar
    - Download button when complete
```

---

### 6.3 Sprint 5 Acceptance Criteria

```
[ ] Can configure export settings
[ ] Can preview export layout
[ ] PNG export generates correct grid
[ ] PDF export creates multi-page document
[ ] ZIP export includes all images
[ ] Can download exported file
```

---

## 7. Testing Strategy

### 7.1 API Testing

Each API endpoint must have tests covering:
- Happy path (200/201 response)
- Authentication (401 without token)
- Authorization (403 for wrong user)
- Validation (400 for invalid input)
- Not found (404 for missing resources)

**Test File Pattern:** `src/app/api/[endpoint]/__tests__/route.test.ts`

### 7.2 Component Testing

Critical components need tests:
- CharacterSelector
- ExpressionGrid
- BatchGenerationModal
- VariantGallery
- ExportModal

**Test File Pattern:** `src/components/[Component]/__tests__/[Component].test.tsx`

### 7.3 Integration Testing

End-to-end flows to test:
1. Create character -> Add to story -> Assign to panel -> Generate image
2. Select multiple panels -> Batch generate -> Retry failed
3. Generate variants -> Compare -> Select best
4. Configure export -> Generate -> Download

---

## 8. Deployment Checklist

### 8.1 Pre-Deployment

```
[ ] All tests passing
[ ] Database backup completed
[ ] Migration tested on staging
[ ] Rollback script prepared
[ ] Feature flags configured (if using)
```

### 8.2 Deployment Steps

```
1. [ ] Enable maintenance mode (optional)
2. [ ] Backup production database
3. [ ] Run Prisma migration
4. [ ] Run data migration script
5. [ ] Deploy new code
6. [ ] Verify API health checks
7. [ ] Test critical flows manually
8. [ ] Disable maintenance mode
```

### 8.3 Post-Deployment

```
[ ] Monitor error rates
[ ] Check database performance
[ ] Verify user reports
[ ] Document any issues
```

---

## 9. Risk Mitigation

### 9.1 Migration Failure

**Risk:** Data migration corrupts existing data

**Mitigation:**
1. Complete database backup before migration
2. Run migration on staging first
3. Keep rollback script ready
4. Migration script logs all changes for audit

### 9.2 Performance Degradation

**Risk:** New joins slow down panel queries

**Mitigation:**
1. Proper indexes on all FK columns
2. Selective includes (don't fetch all relations)
3. Monitor query times post-deployment

### 9.3 User Confusion

**Risk:** New UI elements confuse existing users

**Mitigation:**
1. Keep old workflow functional
2. Add tooltips/help text
3. Provide migration guide
4. Character selection optional (not forced)

---

## 10. Success Metrics Tracking

### 10.1 Sprint 1 Metrics

- Migration success rate: 100%
- Data migration accuracy: 100%
- Existing test suite passing: 100%

### 10.2 Sprint 2 Metrics

- Story-Character API latency: <200ms
- UI component load time: <500ms

### 10.3 Sprint 3 Metrics

- Panel update latency: <200ms
- Prompt build time: <100ms

### 10.4 Sprint 4 Metrics

- Batch generation success rate: >85%
- Variant generation time: <30s per variant

### 10.5 Sprint 5 Metrics

- PNG export time: <10s
- PDF export time: <30s

---

## Appendix A: File Checklist

### New Files to Create

```
prisma/
└── migrations/
    └── YYYYMMDD_phase2_story_character_workflow/
        └── migration.sql

scripts/
└── migrate-phase2-data.ts

src/types/
└── phase2.types.ts

src/app/api/
├── story/
│   └── [id]/
│       └── characters/
│           ├── route.ts
│           └── [characterId]/
│               └── route.ts
├── panel/
│   ├── batch-update/
│   │   └── route.ts
│   └── [id]/
│       └── variants/
│           └── route.ts
│   └── variants/
│       └── [id]/
│           └── select/
│               └── route.ts
└── project/
    └── [id]/
        └── export/
            └── route.ts

src/components/
├── StoryCharacter/
│   ├── CharacterSelector.tsx
│   ├── StoryCharacterList.tsx
│   ├── StoryCharacterCard.tsx
│   ├── RoleSelector.tsx
│   └── types.ts
├── PanelAssets/
│   ├── PanelCharacterSelector.tsx
│   ├── ExpressionGrid.tsx
│   ├── OutfitSelector.tsx
│   ├── SceneSelector.tsx
│   ├── AssetSummary.tsx
│   └── types.ts
├── BatchGeneration/
│   ├── BatchGenerationModal.tsx
│   ├── PanelSelector.tsx
│   ├── GenerationProgress.tsx
│   ├── FailedPanelsList.tsx
│   └── types.ts
├── Variants/
│   ├── VariantGenerator.tsx
│   ├── VariantGallery.tsx
│   ├── VariantSelector.tsx
│   └── types.ts
└── Export/
    ├── ExportModal.tsx
    ├── LayoutPreview.tsx
    ├── ExportProgress.tsx
    └── types.ts

src/lib/
└── export-engine.ts
```

### Files to Modify

```
prisma/
└── schema.prisma (add models and fields)

src/lib/
└── prompt-builder.ts (read from panel relations)

src/app/api/panel/
├── [id]/
│   └── route.ts (accept new fields)
└── build-prompt/
    └── route.ts (read character from panel)

src/app/scripts/[id]/
├── page.tsx (add character management)
└── components/
    └── PanelCard.tsx (add asset selectors)

CLAUDE.md (documentation updates)
```

---

## Appendix B: Estimated Effort

| Sprint | Backend | Frontend | Testing | Total |
|--------|---------|----------|---------|-------|
| Sprint 1 | 3 days | 0 days | 1 day | 4 days |
| Sprint 2 | 2 days | 3 days | 1 day | 6 days |
| Sprint 3 | 2 days | 4 days | 1 day | 7 days |
| Sprint 4 | 2 days | 3 days | 1 day | 6 days |
| Sprint 5 | 3 days | 2 days | 1 day | 6 days |
| **Total** | **12 days** | **12 days** | **5 days** | **29 days** |

---

## Ready for Execution

This implementation plan is ready for the architecture team to execute. Start with Sprint 1 and proceed sequentially. Each sprint builds on the previous one.

**First Step:** Run `npx prisma validate` after adding schema changes to verify syntax.
