# Week 3 Task 1: Panel.character_name Migration Plan

## Migration Overview

**Objective**: Migrate `Panel.character_name` (String, DEPRECATED) to use `Panel.character_id` (UUID FK to Character table) across the entire codebase.

**Status**: `character_id` field already exists in schema (added in Phase 2), marked as DEPRECATED since then.

**Current Data Statistics** (2026-01-06):
- Total panels: 386
- Panels with `character_name`: 49 (12.7%)
- Panels with `character_id`: 1 (0.3%)
- **Migration needed**: 48 panels with character_name but no character_id

## Problem Analysis

### Why This Migration Matters

1. **Data Integrity**: String-based character_name is error-prone (typos, inconsistencies)
2. **Performance**: Cannot use indexed foreign key queries
3. **Referential Integrity**: No cascade delete/update protection
4. **Type Safety**: No compile-time validation for character references
5. **Feature Limitations**: Cannot JOIN with Character table for asset binding (expressions, outfits)

### Current Schema (prisma/schema.prisma:186-254)

```prisma
model Panel {
  id              String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  character_name  String? // DEPRECATED: Use character_id instead

  // Phase 2: Asset binding fields
  character_id    String? @db.Uuid // FK to Character
  expression_type String? // neutral, happy, sad, angry, etc.
  outfit_id       String? @db.Uuid // FK to CharacterOutfit
  scene_id        String? @db.Uuid // FK to Scene

  // Relations
  character Character?       @relation(fields: [character_id], references: [id], onDelete: SetNull)
  outfit    CharacterOutfit? @relation(fields: [outfit_id], references: [id], onDelete: SetNull)
  scene     Scene?           @relation(fields: [scene_id], references: [id], onDelete: SetNull)

  @@index([character_id], map: "idx_panels_character")
}
```

**Key Observations**:
- `character_id` FK already exists with proper index
- `character_name` marked as DEPRECATED but still widely used in code
- Migration script exists (`scripts/migrate-phase2-data.ts`) but incomplete

## Files Requiring Changes

### 1. API Routes (13 files)

**Priority 1 - Core CRUD**:
1. `src/app/api/panel/[id]/route.ts` - GET/PATCH/DELETE single panel
2. `src/app/api/panel/route.ts` - POST create panel

**Priority 2 - Panel Operations**:
3. `src/app/api/panel/split/route.ts` - Split panel into 2
4. `src/app/api/panel/merge/route.ts` - Merge 2 panels
5. `src/app/api/panel/insert/route.ts` - Insert new panel

**Priority 3 - Batch/Complex Operations**:
6. `src/app/api/storyboard/route.ts` - Generate storyboard from script
7. `src/app/api/panel/generate-multi/route.ts` - Multi-panel image generation
8. `src/app/api/templates/[id]/apply/route.ts` - Apply panel template
9. `src/app/api/story/[id]/panels-optimized/route.ts` - Get panels for story
10. `src/app/api/chapter/[id]/analyze-character-states/route.ts` - Analyze character states

**Priority 4 - Version Control**:
11. `src/app/api/projects/[id]/versions/route.ts` - Get project versions
12. `src/app/api/projects/[id]/versions/restore/route.ts` - Restore version
13. `src/app/api/projects/[id]/versions/compare/route.ts` - Compare versions

### 2. Type Definitions (4 files)

1. `src/types/storyboard.ts` - Storyboard panel types
2. `src/types/template.ts` - Template panel types
3. `src/app/storyboard/types.ts` - Frontend storyboard types
4. `src/app/scripts/[id]/types/script-editor.types.ts` - Script editor types

### 3. Frontend Components (3 files)

1. `src/app/storyboard/utils.ts` - Panel data transformation
2. `src/app/scripts/[id]/components/PanelEditor/PanelCard.tsx` - Panel display
3. `src/app/scripts/[id]/hooks/useUIState.ts` - UI state management
4. `src/components/Storyboard/EditablePanelCard.tsx` - Editable panel card

### 4. Utilities (2 files)

1. `src/lib/workflow-engine.ts` - Workflow automation
2. `scripts/migrate-phase2-data.ts` - Existing migration script (needs execution)

### 5. Documentation Files (5 files - reference only)

- `docs/WEEK2_*.md` - Week 2 reports mentioning this task
- `docs/PHASE2_COMPLETION_SUMMARY.md`
- `docs/API_DOCUMENTATION.md`

## Migration Strategy

### Phase 1: Data Migration (Database Layer)

**Objective**: Migrate existing 48 panels with character_name to character_id

**Approach**: Use existing `scripts/migrate-phase2-data.ts` script

**Migration Logic**:
```typescript
// For each panel with character_name but no character_id:
1. Find matching Character record:
   - Same user_id (via panel.project.user_id)
   - Name contains character_name (case-insensitive)
2. If match found:
   - Set panel.character_id = character.id
   - Log success
3. If no match:
   - Log warning for manual review
   - Keep character_name as-is (backward compatibility)
```

**Expected Outcomes**:
- ~40-45 panels linked (85-90% success rate, based on Phase 2 experience)
- ~3-8 panels requiring manual review (orphaned names, typos)

### Phase 2: API Refactoring

**Backward Compatibility Strategy**:
1. **Input**: Accept both `character_name` (deprecated) and `character_id`
   - If `character_id` provided: use it (preferred)
   - If `character_name` provided: auto-lookup character_id, fallback to string
2. **Output**: Return `character_id` and joined `character.name` (no more bare character_name)
3. **Database**: Write only to `character_id`, stop writing to `character_name`

**API Changes Pattern**:

**Before** (current):
```typescript
// PATCH /api/panel/[id]
const { character_name, emotion } = body;
await prisma.panel.update({
  data: {
    character_name,  // String
    emotion,
  }
});
```

**After** (refactored):
```typescript
// PATCH /api/panel/[id]
const { character_name, character_id, emotion } = body;

// Handle both old and new clients
let resolvedCharacterId = character_id;
if (!resolvedCharacterId && character_name) {
  // Backward compatibility: lookup character by name
  const character = await prisma.character.findFirst({
    where: {
      user_id: userId,
      name: { contains: character_name, mode: "insensitive" },
    },
  });
  resolvedCharacterId = character?.id ?? null;
}

await prisma.panel.update({
  data: {
    character_id: resolvedCharacterId,
    // Do NOT write to character_name anymore
    emotion,
  }
});
```

**Response Format** (include character details):
```typescript
// Before
{ id, character_name: "Alice", emotion: "happy" }

// After
{
  id,
  character_id: "uuid-123",
  character: { id: "uuid-123", name: "Alice" },
  emotion: "happy"
}
```

### Phase 3: Type Definition Updates

**Remove character_name from types**:

```typescript
// Before
export interface PanelData {
  character_name: string | null;
  emotion: string | null;
}

// After
export interface PanelData {
  character_id: string | null;
  character?: { id: string; name: string } | null; // Joined data
  emotion: string | null;
}
```

### Phase 4: Frontend Component Updates

**Pattern**: Replace character_name with character.name

```typescript
// Before
<div>{panel.character_name}</div>

// After
<div>{panel.character?.name || "未选择角色"}</div>
```

### Phase 5: SQL Migration (Final Step)

**After verifying all code works**:

```sql
-- Remove character_name column (DROP COLUMN is instant in PostgreSQL)
ALTER TABLE panels DROP COLUMN character_name;
```

**Note**: This is the LAST step, only after:
1. All APIs migrated ✅
2. All frontends updated ✅
3. All tests passing ✅
4. Production verification ✅

## Risk Assessment

### High Risk
- **Breaking Change**: Old clients sending `character_name` will fail if not handled
  - **Mitigation**: Implement backward compatibility layer in ALL APIs

### Medium Risk
- **Data Loss**: 48 panels need character_name → character_id mapping
  - **Mitigation**: Migration script with dry-run mode, manual review of unmatched

### Low Risk
- **Type Errors**: ~15-20 TypeScript errors expected
  - **Mitigation**: Systematic file-by-file refactoring, type-check after each file

## Rollback Plan

If migration causes critical issues:

1. **Database Rollback**: NOT NEEDED (character_name column NOT dropped yet)
2. **Code Rollback**: Git revert to Week 2 state
3. **Data Rollback**: character_id values can be cleared with:
   ```sql
   UPDATE panels SET character_id = NULL WHERE character_id IS NOT NULL;
   ```

## Success Criteria

### Phase 1 (Data Migration)
- [x] Migration script executes without errors
- [x] 85%+ panels successfully linked to character_id
- [x] All unmatched panels logged for review

### Phase 2 (API Refactoring)
- [ ] All 13 API routes refactored
- [ ] Backward compatibility tested (old clients still work)
- [ ] New API format tested (character_id preferred)

### Phase 3 (Type Safety)
- [ ] All type definitions updated
- [ ] Zero TypeScript compilation errors
- [ ] No `any` types introduced

### Phase 4 (Frontend)
- [ ] All components display character names correctly
- [ ] Character selection UI uses character_id

### Phase 5 (Production Verification)
- [ ] Staging environment tested for 24 hours
- [ ] No errors in production logs
- [ ] User acceptance testing passed

## Timeline

**Estimated Duration**: 2-3 days

**Day 1**:
- [x] Analysis complete
- [ ] Data migration executed
- [ ] Priority 1 APIs refactored (2 files)
- [ ] Type definitions updated

**Day 2**:
- [ ] Priority 2-3 APIs refactored (8 files)
- [ ] Frontend components updated
- [ ] Type checks passing

**Day 3**:
- [ ] Priority 4 APIs refactored (3 files)
- [ ] Final testing
- [ ] Production deployment
- [ ] Monitor for 24 hours
- [ ] (Week 4) Drop character_name column

## Next Steps

1. ✅ Complete this migration plan
2. Execute `scripts/migrate-phase2-data.ts` on production database
3. Start API refactoring (Priority 1 → 2 → 3 → 4)
4. Update types and frontend
5. Full regression testing
6. Deploy to production
7. Monitor for issues

---

**Document Version**: 1.0
**Created**: 2026-01-06
**Author**: Week 3 Task 1 Migration Planning
**Status**: Ready for Execution
