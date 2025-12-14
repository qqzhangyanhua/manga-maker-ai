# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Manga Maker AI** - End-to-end AI comic creation platform covering "Story → Script → Storyboard → Image → Layout" workflow with Digital Actor management, style library, workflow orchestration, and image refinement tools.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **UI**: TailwindCSS + shadcn/ui (Radix UI) + lucide-react icons
- **3D**: Three.js via @react-three/fiber (pose lab)
- **Storage**: MinIO/S3-compatible object storage
- **Auth**: JWT + bcrypt + Nodemailer SMTP
- **AI/LLM**: OpenAI-compatible APIs configured via `llm_providers` table
- **Testing**: Vitest + React Testing Library

## Package Management

**IMPORTANT**: This project supports both `npm` and `pnpm`. Both lock files exist in the repository.
- Use `pnpm` for faster installs and better disk space efficiency (recommended)
- Use `npm` if pnpm is not available

```bash
# Using pnpm (recommended)
pnpm install <package>
pnpm dev
pnpm build
pnpm test

# Using npm (alternative)
npm install <package>
npm run dev
npm run build
npm test
```

## Development Commands

### Development Server
```bash
pnpm dev  # or npm run dev
# Runs on http://localhost:3000
```

### Database Operations
```bash
# Generate Prisma Client (required after schema changes)
npx prisma generate

# Create and apply migrations (development)
npx prisma migrate dev --name <migration_name>

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database
npx prisma db seed
```

### Build & Lint
```bash
pnpm build  # Build Next.js app
pnpm lint   # Run ESLint
```

### Testing
```bash
pnpm test         # Run all tests
pnpm test:watch   # Run tests in watch mode
```

Test files use Vitest with React Testing Library. Place tests next to source files with `.test.ts` or `.test.tsx` extension.

## Architecture Overview

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (REST endpoints)
│   │   ├── auth/          # Authentication
│   │   ├── character/     # Character CRUD & generation
│   │   ├── scene/         # Scene library
│   │   ├── story/         # Story generation
│   │   ├── chapter/       # Chapter management & panel generation
│   │   ├── panel/         # Panel operations
│   │   ├── project/       # Project management
│   │   ├── admin/         # Admin endpoints
│   │   └── ...
│   ├── scripts/[id]/      # Story/script editor pages
│   ├── storyboard/        # Storyboard editor
│   ├── editor/            # Image refinement center
│   ├── workflow/          # Workflow orchestration
│   ├── assets/            # Asset library
│   └── admin/             # Admin dashboard
├── components/            # React components
│   ├── Storyboard/        # Storyboard editor components
│   ├── ImageEditor/       # Canvas & timeline
│   ├── ui/                # shadcn/ui base components
│   └── ...
├── lib/                   # Shared utilities & services
│   ├── auth.ts            # JWT signing/verification
│   ├── db.ts              # Prisma client singleton
│   ├── llm-provider.ts    # LLM API integration
│   ├── credits.ts         # Credits system
│   ├── unified-image-generation.ts  # Image generation queue
│   ├── panel-generator.ts # Panel generation logic
│   └── ...
└── hooks/                 # Custom React hooks

prisma/
├── schema.prisma          # Database schema
└── seed.ts                # Seed script
```

### Core Database Models

**User & Auth:**
- `User` - User accounts with `credits` (算力余额), `total_credits_used`, role (user/admin), status (active/suspended)
- `EmailVerification` - Email verification codes (bcrypt hashed, single-use)
- `CreditTransaction` - Credits transaction history (recharge/consume/refund)

**LLM Configuration:**
- `LlmProvider` - Configurable LLM providers with `provider_type`, `credits_cost`, `priority`, `enabled`

**Character System (Digital Actor):**
- `Character` - Main character entity with `reference_image`, `style_prompt`, LoRA training status
- `CharacterView` - Three-view reference images (front/side/back)
- `CharacterExpression` - Expression matrix (9 emotions)
- `CharacterOutfit` - Wardrobe system with `is_default` flag
- `CharacterRelationship` - Character positioning on relationship chart

**Scene Library:**
- `Scene` - Background/environment assets with `scene_type`, tags, prompt

**Story & Project:**
- `Story` - Story outline with genre, premise, outline JSON
- `StoryCharacter` - Many-to-many Story ↔ Character with `role`, `character_arc`
- `Chapter` - Story chapters with `chapter_order`, summary
- `Project` - Comic projects linked to Story (optional)
- `Panel` - Individual storyboard panels with:
  - `character_id`, `expression_type`, `outfit_id`, `scene_id` (asset bindings)
  - `script_segment_id`, `script_start`, `script_end` (script linking)
  - `camera_angle`, `shot_size`, `panel_type`, `importance`
  - `layout_hint` (for multi-panel layouts: 2镜/4镜/6镜)
  - `is_shared`, `show_prompt` (gallery sharing)
- `StoryScript` - Original script text with segmentation info

**Templates & Workflows:**
- `StoryTemplate` - Predefined story structures
- `PanelTemplate` - Reusable storyboard layouts
- `Workflow` - Automation workflow tracking

**Generation & Analytics:**
- `GenerationTask` - Batch generation progress tracking
- `PanelVariant` - Alternative versions of panels
- `GeneratedImage` - Gallery of generated images
- `GenerationLog` - Detailed logs of AI generation actions
- `UsageStat` - Aggregated daily usage statistics

**Version Control:**
- `ProjectVersion` - Incremental snapshots with `is_pinned`, `is_auto`
- `ImagePageVersion` - Image refinement versions

**Tagging System:**
- `Tag` - Universal tags with `type` (system/user), `category`
- `Tagging` - Polymorphic tagging relationship

## Authentication Pattern

All API routes use JWT stored in HTTP-only cookie:

```typescript
import { cookies } from "next/headers";
import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "无效的token" }, { status: 401 });
  }

  // Use payload.userId, payload.role, payload.email
}
```

**For admin-only routes:**
```typescript
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result; // Error response

  const payload = result; // AuthTokenPayload
}
```

**Cookie name**: `comicai_session` (defined as `AUTH_COOKIE_NAME` in `@/lib/auth`)

## LLM Provider System

LLM providers are configured in `llm_providers` table and selected by `provider_type`:

```typescript
{
  provider_type: "story_generator" | "prompt_optimizer" | "character_analyzer" | "image_generation" | ...,
  provider_name: "openai",
  model: "gpt-4",
  base_url: "https://api.openai.com",
  api_key: "sk-...",
  credits_cost: 10,    // Credits consumed per call (0 = free)
  priority: 1,         // Lower = higher priority
  enabled: true
}
```

**Usage in code:**
```typescript
import { callChatCompletionByType } from "@/lib/llm-provider";

const result = await callChatCompletionByType({
  providerType: "prompt_optimizer",
  messages: [
    { role: "system", content: "You are a prompt optimization expert" },
    { role: "user", content: userInput }
  ],
  temperature: 0.6,
  maxTokens: 1500,
  options: {
    userId: "user-id",  // Required if credits_cost > 0
    skipCreditsCheck: false
  }
});

const content = result.content;
const creditsCost = result.creditsCost; // Credits consumed
```

**Streaming API:**
```typescript
import { callChatCompletionStreamByType } from "@/lib/llm-provider";

for await (const chunk of callChatCompletionStreamByType({
  providerType: "story_generator",
  messages: [...],
  options: { userId }
})) {
  // Process text chunk
}
```

**Known provider types:**
- `story_generator` - Story outline & script generation
- `prompt_optimizer` - Prompt enhancement
- `character_analyzer` - Character analysis & variations
- `image_generation` - AI image generation
- `script_analyzer` - Script analysis
- `style_generator` - Style-specific prompts

## Credits System (算力系统)

Users have `credits` (current balance) and `total_credits_used` (lifetime consumption).

**Check credits:**
```typescript
import { checkCredits } from "@/lib/credits";

const hasEnough = await checkCredits(userId, 100); // Check if user has 100 credits
```

**Consume credits:**
```typescript
import { consumeCredits } from "@/lib/credits";

await consumeCredits({
  userId,
  amount: 100,
  description: "Generate character expression",
  refType: "generation_log",
  refId: logId
});
```

**Recharge credits:**
```typescript
import { rechargeCredits } from "@/lib/credits";

await rechargeCredits({
  userId,
  amount: 1000,
  description: "Monthly subscription",
  refType: "order",
  refId: orderId
});
```

All transactions are logged in `credit_transactions` table.

## Key API Endpoints

### Auth
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/send-code` - Send email verification code
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Characters
- `GET /api/character` - List user's characters
- `POST /api/character` - Create character (auto-creates default outfit)
- `GET /api/character/[id]` - Get character details
- `PATCH /api/character/[id]` - Update character
- `DELETE /api/character/[id]` - Delete character
- `POST /api/character/generate-views` - Generate three-view images
- `POST /api/character/generate-expressions` - Generate expression matrix
- `POST /api/character/generate-similar` - Generate similar character variations
- `POST /api/character/upload-image` - Upload character image to MinIO

### Scenes
- `GET /api/scene` - List user's scenes
- `POST /api/scene` - Create scene
- `PATCH /api/scene/[id]` - Update scene
- `DELETE /api/scene/[id]` - Delete scene

### Stories & Chapters
- `GET /api/story` - List user's stories (pagination, status filter)
- `POST /api/story/generate` - Generate story outline from premise
- `POST /api/story/expand` - Expand story into detailed script
- `GET /api/story/[id]` - Get story details
- `PATCH /api/story/[id]` - Update story
- `DELETE /api/story/[id]` - Delete story
- `POST /api/story/[id]/characters` - Add character to story
- `GET /api/story/[id]/characters` - Get story characters
- `DELETE /api/story/[id]/characters/[characterId]` - Remove character from story
- `PATCH /api/story/[id]/characters/[characterId]` - Update character role/arc
- `GET /api/chapter/[id]` - Get chapter details
- `POST /api/chapter/[id]/generate-panels` - Generate panels for chapter
- `POST /api/chapter/[id]/generate-panels-stream` - Generate panels with streaming

### Projects & Panels
- `GET /api/project` - List user's projects
- `POST /api/project` - Create project
- `GET /api/project/[id]` - Get project with panels
- `PATCH /api/project/[id]` - Update project
- `DELETE /api/project/[id]` - Delete project
- `POST /api/project/[id]/export` - Export project (PNG/PDF/ZIP)
- `POST /api/panel/insert` - Insert panel at position
- `POST /api/panel/split` - Split panel into multiple
- `POST /api/panel/merge` - Merge panels
- `PATCH /api/panel/[id]` - Update panel
- `DELETE /api/panel/[id]` - Delete panel
- `PATCH /api/panel/batch-update` - Batch update panels
- `POST /api/panel/[id]/variants` - Generate panel variants
- `PATCH /api/panel/variants/[id]/select` - Select variant as main

### Templates & Workflows
- `GET /api/templates` - List panel templates
- `POST /api/templates/[id]/apply` - Apply template to project
- `GET /api/workflow` - List workflows
- `POST /api/workflow/auto-generate` - Create auto-generation workflow
- `GET /api/workflow/[id]/status` - Get workflow status

### Admin
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/[id]` - Update user (role/status/credits)
- `GET /api/admin/comic-styles` - Manage comic styles
- `GET /api/admin/usage` - View all users' usage statistics
- `GET /api/admin/generation-logs` - View generation logs

## File Upload (MinIO)

```bash
# .env configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=input-image
```

**Upload helpers:**
```typescript
import { uploadBase64Image } from "@/lib/upload-helpers";

const imageUrl = await uploadBase64Image(base64String, "character-123.png");
// Returns: http://localhost:9000/input-image/character-123.png
```

## Code Style Guidelines

1. **TypeScript Strict Mode**: NO `any` types allowed
   - **WARNING**: `tsconfig.json` has `"strict": false` but you MUST write code as if it were `true`
   - Explicitly type all parameters, return values, and variables
   - Use `unknown` instead of `any` when type is genuinely unknown

2. **Type Definitions**: Extract shared types to separate `types.ts` files

3. **File Length**: Single files must not exceed 500 lines
   - Split into sub-components or extract hooks if exceeded

4. **No Emojis**: Use lucide-react icons instead
   ```typescript
   import { IconName } from "lucide-react";
   ```

5. **Path Aliases**: Use `@/` for imports from `src/`
   ```typescript
   import { prisma } from "@/lib/db";
   import { Button } from "@/components/ui/button";
   ```

6. **Error Handling**: Return consistent error format
   ```typescript
   return NextResponse.json(
     { error: "错误描述" },
     { status: 400 | 401 | 403 | 500 }
   );
   ```

## Common Workflows

### Character Creation
1. `POST /api/character` - Create character (auto-creates default outfit)
2. `POST /api/character/generate-views` - Generate three-view images
3. `POST /api/character/generate-expressions` - Generate expression matrix
4. Character status: `pending` → `training` → `ready` | `failed`

### Story to Comic
1. `POST /api/story/generate` - Generate story outline
2. `POST /api/story/[id]/characters` - Add characters from library
3. `POST /api/story/expand` - Expand into detailed script
4. `POST /api/project` - Create project linked to story
5. `POST /api/chapter/[id]/generate-panels` - Generate panels for chapters
6. `POST /api/panel/[id]/variants` - Generate variants for refinement

### Panel Operations
- **Insert**: Insert new panel at position, auto-reorders subsequent panels
- **Split**: Split one panel into 2-3 panels
- **Merge**: Merge consecutive panels into one
- All operations automatically update `panel_order`

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Authentication
AUTH_SECRET=<random_secret_for_jwt>

# Email (SMTP)
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=465
EMAIL_USER=your@qq.com
EMAIL_PASSWORD=your_smtp_key
EMAIL_FROM="ComicAI <your@qq.com>"

# MinIO Object Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=input-image

# (Optional) Usage Quotas
QUOTA_STORYBOARD_DAILY=20
QUOTA_STORY_DAILY=30
QUOTA_IMAGE_DAILY=50
```

## Enums & Constants

**Expression types:**
`neutral`, `happy`, `sad`, `angry`, `surprised`, `shy`, `confident`, `worried`, `determined`

**Outfit types:**
`default`, `school`, `battle`, `casual`, `formal`, `sleepwear`, `sports`, `custom`

**Character roles:**
`protagonist` (主角), `antagonist` (反派), `supporting` (配角), `minor` (龙套)

**Story genres:**
`suspense` (悬疑), `romance` (爱情), `adventure` (冒险), `scifi` (科幻), `daily` (日常), `fantasy` (奇幻)

**Story lengths:**
`short` (3-5 acts), `medium` (5-7 acts), `long` (7+ acts)

**Scene types:**
`indoor`, `outdoor`, `urban`, `nature`, `fantasy`, `scifi`, `historical`, `abstract`

**Panel types:**
`wide`, `medium`, `closeup`, `action`, `dialogue`, `transition`

**Camera angles:**
`俯视` (top-down), `仰视` (bottom-up), `平视` (eye-level), `荷兰角` (Dutch angle)

**Shot sizes:**
`特写` (close-up), `近景` (close shot), `中景` (medium shot), `全景` (full shot), `远景` (long shot)

**Workflow statuses:**
`pending`, `running`, `completed`, `failed`, `cancelled`

## Known Limitations

1. **Image Generation**: Requires external AI service integration (Stable Diffusion, DALL-E, etc.)
2. **LoRA Training**: Not implemented - `training_status` remains `pending`
3. **MinIO Storage**: Requires MinIO server or S3-compatible storage running

## Important Exclusions

**DO NOT read or modify files in the `example/` directory unless explicitly requested.**
- Contains standalone demo application separate from main Next.js app
- Serves as reference implementation only
