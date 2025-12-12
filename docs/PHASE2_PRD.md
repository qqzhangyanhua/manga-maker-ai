# PHASE2 PRD: Serialized Manga Workflow

## Document Info

| Item | Value |
|------|-------|
| Version | 1.0 |
| Created | 2024-12 |
| Status | Approved |
| Owner | Product Team |

---

## 1. Executive Summary

### 1.1 Background

Current Manga Maker AI has functional components for character creation, story generation, and panel image generation. However, **the core workflow is disconnected**:

- Character library exists but cannot be bound to panels
- Story generates character descriptions as JSON, not linked to Character table
- Scene library exists but panels cannot reference it
- No way to ensure character consistency across multiple panels

### 1.2 Objective

Build a **complete serialized manga creation workflow** that allows users to:

1. Create reusable character assets (with reference images, expressions, outfits)
2. Bind characters from library to stories
3. Select characters/expressions/outfits/scenes for each panel
4. Generate consistent character images across panels
5. Batch generate and export complete manga

### 1.3 Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Character library usage rate | >60% | 6 months |
| Cross-project character reuse | >40% | 6 months |
| Batch generation usage | >50% | 6 months |
| Character consistency satisfaction | >4/5 | 6 months |
| 7-day retention | >40% | 6 months |

---

## 2. User Stories

### 2.1 Core User Persona

**Creator Chen** - Aspiring webtoon artist
- Creates serialized manga with 3-5 recurring characters
- Produces 10-30 panels per episode
- Needs consistent character appearance across episodes
- Values efficiency but wants creative control

### 2.2 User Stories

#### US-01: Character Library Management
```
As a creator,
I want to create characters in a library with reference images, expressions, and outfits,
So that I can reuse them across multiple stories and episodes.

Acceptance Criteria:
- Can upload/generate character reference image
- Can generate 9 expression variants
- Can create multiple outfits per character
- Characters persist and can be used in any project
```

#### US-02: Story-Character Binding
```
As a creator,
I want to select characters from my library when creating a story,
So that the story's character descriptions are linked to actual character assets.

Acceptance Criteria:
- Can browse character library when editing story
- Can assign roles (protagonist/antagonist/supporting) to characters
- Story displays linked characters with their images
- Characters appear in panel editor's character selector
```

#### US-03: Panel Character Selection
```
As a creator,
I want to select character, expression, outfit, and scene for each panel,
So that generated images use the correct character appearance.

Acceptance Criteria:
- Panel editor shows character dropdown (from story's characters)
- After selecting character, expression grid appears
- Can select outfit from character's outfits
- Can select background scene from scene library
- Prompt is automatically assembled with all selections
```

#### US-04: Batch Generation
```
As a creator,
I want to batch generate images for multiple panels,
So that I can efficiently produce an entire episode.

Acceptance Criteria:
- Can select multiple panels for batch generation
- Progress indicator shows current status
- Failed panels can be retried
- Can pause/cancel batch generation
```

#### US-05: Variant Selection
```
As a creator,
I want to generate multiple variants of a panel and choose the best one,
So that I can pick the highest quality result.

Acceptance Criteria:
- Can generate 3 variants (composition/lighting/angle)
- Variants displayed side by side for comparison
- Can select any variant as the main image
- Selected variant updates the panel
```

#### US-06: Export
```
As a creator,
I want to export my completed manga in various formats,
So that I can publish on different platforms.

Acceptance Criteria:
- Export to PNG (single page grid)
- Export to PDF (multi-page)
- Export to ZIP (individual images)
- Optional watermark
- Configurable resolution
```

---

## 3. Feature Requirements

### 3.1 Character Library Enhancement

| Feature | Priority | Description |
|---------|----------|-------------|
| Reference Image | P0 | Main character image for IP-Adapter consistency |
| Style Prompt | P0 | Text description of character's visual style |
| Expression Matrix | P1 | 9 emotion variants (existing, enhance UI) |
| Outfit System | P1 | Multiple outfits per character (existing, enhance UI) |
| Three Views | P2 | Front/side/back views (existing) |

### 3.2 Story-Character System (NEW)

| Feature | Priority | Description |
|---------|----------|-------------|
| Add Characters to Story | P0 | Select from library, assign role |
| Character Role Assignment | P0 | Protagonist/antagonist/supporting/minor |
| Character Arc Description | P1 | Per-story character development notes |
| Character Order | P2 | Display order in editor |

### 3.3 Panel-Asset Binding (NEW)

| Feature | Priority | Description |
|---------|----------|-------------|
| Character Selector | P0 | Dropdown to select from story's characters |
| Expression Selector | P0 | Grid showing character's 9 expressions |
| Outfit Selector | P1 | Dropdown of character's outfits |
| Scene Selector | P1 | Grid/dropdown of user's scenes |
| Auto Prompt Assembly | P0 | Combine all selections into final prompt |

### 3.4 Generation Enhancement

| Feature | Priority | Description |
|---------|----------|-------------|
| Batch Generation UI | P0 | Select panels, track progress, retry failures |
| Variant Generation | P1 | Generate 3 alternatives for comparison |
| Variant Selection | P1 | Choose best variant as main image |
| Generation Queue | P2 | Background queue management |

### 3.5 Export System (NEW)

| Feature | Priority | Description |
|---------|----------|-------------|
| PNG Export | P1 | Single image with grid layout |
| PDF Export | P2 | Multi-page document |
| ZIP Export | P2 | Individual images in archive |
| Watermark Option | P2 | Optional branding |

---

## 4. Non-Functional Requirements

### 4.1 Performance

- Batch generation: Process up to 30 panels without timeout
- Panel editor: Load character data <500ms
- Export: Generate PNG <10s, PDF <30s

### 4.2 Reliability

- Batch generation failure recovery: Auto-retry up to 3 times
- Data integrity: All FK relationships enforced at DB level
- Backwards compatibility: Old data must continue working

### 4.3 Usability

- Panel editor: Max 3 clicks to assign character+expression
- Batch generation: Clear progress indication
- Mobile: Responsive design for tablet editing

---

## 5. Out of Scope (Phase 2)

The following are explicitly NOT included:

- LoRA training for characters (future phase)
- Real-time collaboration
- AI-powered layout suggestions
- Animation/motion effects
- Direct platform publishing (Webtoon, Tapas, etc.)

---

## 6. Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| IP-Adapter integration | Technical | Available |
| Unified image generation system | Technical | Completed |
| Character library | Feature | Completed |
| Scene library | Feature | Completed |
| Story generation | Feature | Completed |

---

## 7. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration failure | High | Backup + rollback scripts |
| IP-Adapter quality issues | Medium | Fallback to text-only prompts |
| User learning curve | Medium | Guided onboarding + tutorials |
| Batch generation costs | Medium | Quota limits + preview mode |

---

## 8. Timeline

| Sprint | Duration | Focus |
|--------|----------|-------|
| Sprint 1 | 1-2 weeks | Data structure migration |
| Sprint 2 | 1 week | Story-Character system |
| Sprint 3 | 1-2 weeks | Panel-Asset binding |
| Sprint 4 | 1 week | Batch generation + variants |
| Sprint 5 | 1 week | Export system |

**Total: 5-7 weeks**

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Character | A reusable digital actor with consistent appearance |
| Reference Image | Main character image used for visual consistency |
| Expression Matrix | Set of 9 emotion variants for a character |
| Panel | Single frame in a manga/comic |
| Story | Narrative outline containing plot and character setup |
| Project | Container for panels, linked to a story |
