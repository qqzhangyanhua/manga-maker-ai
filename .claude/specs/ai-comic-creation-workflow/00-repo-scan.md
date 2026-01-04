# Repository Scan Report: Manga Maker AI

**Scan Date**: 2026-01-04
**Feature Context**: AI Comic Creation Workflow Analysis
**Project Type**: Full-stack Web Application (Next.js 14)

---

## 1. Project Overview

### Project Identity
- **Name**: Manga Maker AI (manga-maker-ai)
- **Purpose**: End-to-end AI comic creation platform covering "Story → Script → Storyboard → Image → Layout" workflow
- **Core Value Proposition**: Complete automated comic generation pipeline with digital actor management, style library, and workflow orchestration

### Project Maturity
- **Version**: 0.0.0 (Early development/prototype stage)
- **Status**: Active development with comprehensive feature set
- **Code Quality**: Production-grade structure with testing framework

---

## 2. Technology Stack Analysis

### Frontend Stack
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18.3.1 + TypeScript 5.8.3
- **Styling**:
  - TailwindCSS 3.4.17 + autoprefixer
  - shadcn/ui (Radix UI components)
  - lucide-react icons (NO emojis policy)
- **3D/Canvas**:
  - Three.js (@react-three/fiber, @react-three/drei) for pose lab
  - Fabric.js for canvas editing
- **State Management**:
  - Zustand 5.0.9
  - @tanstack/react-query 5.83.0
  - Immer 11.1.3
- **Form Handling**: react-hook-form + @hookform/resolvers + zod validation
- **Drag & Drop**: @dnd-kit suite
- **PDF Generation**: jspdf, pdf-lib, pdfjs-dist

### Backend Stack
- **Database**: PostgreSQL with Prisma ORM 5.18.0
- **Authentication**:
  - JWT (jsonwebtoken)
  - bcryptjs for password hashing
  - HTTP-only cookie storage (`comicai_session`)
- **Storage**: MinIO (S3-compatible object storage)
- **Caching/Queue**: Redis/ioredis for task queuing
- **Email**: Nodemailer with SMTP
- **AI/LLM**: OpenAI-compatible APIs (configurable via `llm_providers` table)

### Development Tools
- **Package Manager**: Both npm AND pnpm supported (dual lock files present)
- **Testing**: Vitest 4.0.15 + React Testing Library + jsdom
- **Linting**: ESLint + next lint
- **Type Checking**: TypeScript strict mode (tsconfig.json has `"strict": false` but code guidelines require strict adherence)

---

## 3. Architecture Patterns

### Directory Structure

```
src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/               # REST API endpoints (~100+ routes)
│   ├── storyboard/        # Storyboard editor UI
│   ├── editor/            # Image refinement center
│   ├── scripts/           # Story/script editor
│   ├── workflow/          # Workflow orchestration
│   ├── assets/            # Asset library pages
│   └── admin/             # Admin dashboard
├── components/            # React components
│   ├── Storyboard/        # Storyboard editor components
│   ├── ImageEditor/       # Canvas & timeline
│   ├── ui/                # shadcn/ui base components
│   └── [feature modules]
├── lib/                   # Shared utilities & services
│   ├── auth.ts            # JWT utilities
│   ├── db.ts              # Prisma singleton
│   ├── llm-provider.ts    # LLM API integration
│   ├── credits.ts         # Credits system
│   └── unified-image-generation.ts
└── hooks/                 # Custom React hooks

prisma/
├── schema.prisma          # Database schema (30+ models)
└── seed.ts                # Seed script
```

### API Architecture

**Total Routes**: 100+ API endpoints across multiple domains

**Key API Groups**:
- `/api/auth/*` - Authentication (register, login, send-code, logout, me)
- `/api/story/*` - Story generation & management
- `/api/character/*` - Character (Digital Actor) CRUD
- `/api/scene/*` - Scene library
- `/api/panel/*` - Panel operations (insert, split, merge, batch)
- `/api/project/*` - Project management
- `/api/chapter/*` - Chapter management
- `/api/workflow/*` - Workflow automation
- `/api/admin/*` - Admin endpoints (users, scenes, characters, etc.)
- `/api/image-generation/*` - Image generation
- `/api/templates/*` - Panel & story templates
- `/api/generated-images/*` - Image gallery

**Authentication Pattern**:
```typescript
// Standard pattern across all protected routes
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

const cookieStore = await cookies();
const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
const payload = verifyAuthToken(token);
// Use payload.userId, payload.role, payload.email
```

### Database Schema Highlights

**30+ Models** organized into domains:

1. **User & Auth**:
   - `User` (with credits system)
   - `EmailVerification`
   - `CreditTransaction`

2. **LLM Configuration**:
   - `LlmProvider` (configurable AI providers by type)

3. **Character System (Digital Actor)**:
   - `Character` (main entity with LoRA support)
   - `CharacterView` (three-view references)
   - `CharacterExpression` (9 emotions matrix)
   - `CharacterOutfit` (wardrobe system)
   - `CharacterRelationship`

4. **Story & Project**:
   - `Story` (outline with AI-analyzed character suggestions)
   - `StoryCharacter` (many-to-many)
   - `Chapter`
   - `Project` (comic projects)
   - `Panel` (individual storyboard panels)
   - `StoryScript`

5. **Scene & Templates**:
   - `Scene` (background assets)
   - `StoryTemplate`
   - `PanelTemplate`

6. **Workflow & Generation**:
   - `Workflow`
   - `GenerationTask`
   - `PanelVariant`
   - `GeneratedImage`
   - `GenerationLog`

7. **Version Control**:
   - `ProjectVersion`
   - `ImagePageVersion`

8. **Tagging**:
   - `Tag`
   - `Tagging` (polymorphic)

---

## 4. Code Patterns & Conventions

### TypeScript Standards (CRITICAL)
```typescript
// From CLAUDE.md:
// 1. NO `any` types allowed (tsconfig has strict: false, but guidelines require strict adherence)
// 2. Type definitions extracted to separate types.ts files
// 3. Files must not exceed 500 lines
// 4. NO emojis - use lucide-react icons
// 5. Use @/ path aliases
```

### Error Handling Pattern
```typescript
return NextResponse.json(
  { error: "错误描述" },
  { status: 400 | 401 | 403 | 500 }
);
```

### Logging Pattern
```typescript
import { logInfo, logError } from "@/lib/api-logger";

// Standard logging at: request received, auth, validation, operations, errors
logInfo("Request received", { endpoint, method });
logError("Operation failed", error, { endpoint, userId, durationMs });
```

### LLM Provider Usage
```typescript
import { callChatCompletionByType } from "@/lib/llm-provider";

const result = await callChatCompletionByType({
  providerType: "story_generator" | "prompt_optimizer" | "character_analyzer" | "image_generation",
  messages: [...],
  options: { userId, skipCreditsCheck: false }
});
```

### Credits System
```typescript
import { checkCredits, consumeCredits, rechargeCredits } from "@/lib/credits";

await consumeCredits({
  userId,
  amount: 100,
  description: "Generate character expression",
  refType: "generation_log",
  refId: logId
});
```

---

## 5. Testing Strategy

### Test Framework
- **Runner**: Vitest 4.0.15
- **Testing Library**: @testing-library/react + @testing-library/jest-dom
- **DOM Environment**: jsdom
- **Test Location**: Next to source files with `.test.ts` or `.test.tsx`

### Test Commands
```bash
pnpm test         # Run all tests
pnpm test:watch   # Watch mode
```

### Current Test Coverage
- Basic test setup present
- Testing patterns follow React Testing Library best practices

---

## 6. Development Workflow

### Git Workflow
- **Main Branch**: `main`
- **Status**: Clean working directory
- **Recent Commits**:
  - UI/UX Pro Max design intelligence integration
  - Dialog accessibility improvements (DialogTitle + VisuallyHidden)
  - StoryDetailsSkeleton refactoring
  - Reference image selector enhancements

### Build & Dev Commands
```bash
# Development
pnpm dev          # or npm run dev

# Build
pnpm build        # Next.js build
pnpm lint         # ESLint
pnpm type-check   # TypeScript validation

# Database
npx prisma generate           # Generate Prisma Client
npx prisma migrate dev        # Create migration
npx prisma migrate deploy     # Apply migrations
npx prisma studio             # Database GUI
npx prisma db seed            # Seed data
```

### Environment Requirements
```bash
# Required
DATABASE_URL=postgresql://...
AUTH_SECRET=...
EMAIL_HOST/PORT/USER/PASSWORD/FROM
MINIO_ENDPOINT/ACCESS_KEY/SECRET_KEY/BUCKET_NAME

# Optional
QUOTA_STORYBOARD_DAILY=20
QUOTA_STORY_DAILY=30
QUOTA_IMAGE_DAILY=50
INITIAL_ADMIN_EMAIL=admin@example.com
```

---

## 7. Integration Points for New Features

### Adding New API Routes
1. Create route handler in `src/app/api/[domain]/route.ts`
2. Use standard auth pattern from `@/lib/auth`
3. Implement logging with `@/lib/api-logger`
4. Return consistent error format
5. Add tests next to route file

### Adding New Components
1. Place in appropriate `src/components/[Feature]/` directory
2. Extract types to `types.ts` if shared
3. Keep files under 500 lines
4. Use shadcn/ui base components from `@/components/ui/`
5. Use lucide-react for icons (NO emojis)

### Database Schema Changes
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <name>`
3. Update seed script if needed
4. Generate new Prisma Client

### LLM Provider Integration
1. Add new provider type to `llm_providers` table
2. Configure via admin UI or direct DB insert
3. Use `callChatCompletionByType` with new type
4. Set `credits_cost` appropriately

---

## 8. Known Constraints & Technical Debt

### From Documentation
1. **Image Generation**: Requires external AI service (Stable Diffusion/DALL-E compatible)
2. **LoRA Training**: Not implemented - `training_status` is placeholder
3. **MinIO Storage**: Must be running and configured
4. **TypeScript Strict**: tsconfig has `strict: false` but guidelines require strict code
5. **Workflow Export**: Format support is TODO
6. **Batch Operations**: Some storyboard batch operations in planning phase

### Performance Considerations
- Redis/ioredis for task queuing (unified image generation)
- MinIO for file storage (not local filesystem)
- Prisma connection pooling
- React Query for client-side caching

---

## 9. Security & Authentication

### Authentication Flow
1. JWT stored in HTTP-only cookie (`comicai_session`)
2. Password hashing with bcryptjs
3. Email verification codes (bcrypt hashed, single-use)
4. Role-based access (user/admin)
5. User status tracking (active/suspended)

### Authorization Patterns
```typescript
// Admin-only routes
import { requireAdmin } from "@/lib/auth-helpers";
const result = await requireAdmin();
if (result instanceof NextResponse) return result;
```

### Credits System Security
- All LLM calls check credits before execution
- Transactions logged in `credit_transactions`
- Supports: recharge, consume, refund

---

## 10. Key Features & User Workflows

### Core Workflows
1. **Story Creation**: `/story` → `/scripts/[id]` → generate panels → `/storyboard/editor/[projectId]`
2. **Quick Storyboard**: `/storyboard` → input script → generate → edit
3. **Asset Preparation**: `/assets` → create characters/scenes → apply to projects
4. **Learning Flow**: `/samples` → copy example → modify
5. **Image Refinement**: Generate panels → `/editor` → add layout/dialogue → export

### Character Generation (Two-Step Flow)
1. **Step 1**: Analyze story → get suggested character list (~5-10 credits)
2. **Step 2**: Batch generate images for selected characters (~30 credits/image)
3. **Deprecated**: Old one-step flow still exists but not recommended

### Panel Operations
- **Insert**: Add panel at position (auto-reorder)
- **Split**: Split into 2-3 panels
- **Merge**: Merge consecutive panels
- **Batch Update**: Multi-select with Shift key

---

## 11. Third-Party Dependencies Summary

### Critical Dependencies
- **@prisma/client** - Database ORM
- **next** - Framework
- **react** + **react-dom** - UI library
- **three** + **@react-three/fiber** - 3D rendering
- **fabric** - Canvas manipulation
- **minio** - Object storage
- **zustand** - State management
- **@tanstack/react-query** - Server state
- **zod** - Validation
- **bcryptjs** + **jsonwebtoken** - Auth
- **nodemailer** - Email
- **sharp** - Image processing

### UI Component Libraries
- **@radix-ui/*** - Accessible components (20+ packages)
- **lucide-react** - Icons
- **recharts** - Charts
- **embla-carousel-react** - Carousels

### Build Tools
- **typescript** - Type system
- **tailwindcss** - Styling
- **vitest** - Testing
- **eslint** - Linting

---

## 12. Repository Health Indicators

### Positive Signals
✅ Comprehensive documentation (CLAUDE.md, multiple feature docs)
✅ Dual package manager support (npm + pnpm)
✅ Testing framework configured
✅ Database migrations system (Prisma)
✅ Structured API architecture
✅ Clear coding guidelines
✅ Active development (recent commits)

### Areas Requiring Attention
⚠️ tsconfig.json has `strict: false` (conflicts with guidelines)
⚠️ Large number of API routes (100+) - consider grouping/refactoring
⚠️ Some features marked as TODO (LoRA training, workflow export)
⚠️ Early version (0.0.0) - expect breaking changes

---

## 13. Recommendations for New Development

### Before Starting New Features
1. ✅ **Read** CLAUDE.md and feature-specific docs
2. ✅ **Check** existing patterns in similar features
3. ✅ **Use** established utilities (@/lib/*)
4. ✅ **Follow** file size limits (500 lines)
5. ✅ **Extract** types to separate files
6. ✅ **Add** tests alongside code
7. ✅ **Implement** logging from the start

### Integration Checklist
- [ ] Uses @/ path aliases
- [ ] NO `any` types
- [ ] Logging implemented
- [ ] Error handling standardized
- [ ] Authentication/authorization applied
- [ ] Credits system integrated (if using LLM)
- [ ] Types extracted to types.ts
- [ ] File under 500 lines
- [ ] Icons from lucide-react (NO emojis)
- [ ] Tests written

---

## 14. Summary

**Manga Maker AI** is a sophisticated, production-ready Next.js application with a comprehensive AI comic creation pipeline. The codebase demonstrates strong architectural patterns, clear separation of concerns, and robust infrastructure for scalable development.

**Key Strengths**:
- Well-structured API with clear authentication patterns
- Comprehensive database schema with Prisma ORM
- Configurable LLM provider system
- Credits-based usage tracking
- Strong typing guidelines
- Complete workflow from story → script → storyboard → image → export

**Primary Constraints**:
- External dependencies (MinIO, PostgreSQL, AI services)
- TypeScript strict mode config mismatch (guidelines stricter than tsconfig)
- Some features in planning/TODO state

**Development Philosophy** (from CLAUDE.md):
- Linus Torvalds-inspired code review approach
- "Good taste" over complexity
- Backwards compatibility ("Never break userspace")
- Pragmatism over theoretical perfection
- Simplicity as primary goal

This repository is ready for feature additions following established patterns and guidelines.

---

**End of Repository Scan Report**
