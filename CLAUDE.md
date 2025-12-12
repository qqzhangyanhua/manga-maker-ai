# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Manga/Comic AI Generator** built with Next.js 14, featuring a "Digital Actor" character management system. The app allows users to create manga characters with consistent appearance across different poses, expressions, and outfits using AI image generation.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI**: React, TailwindCSS, shadcn/ui (Radix UI)
- **Auth**: JWT-based authentication with bcrypt
- **AI Integration**: LLM providers (OpenAI-compatible APIs) for prompt generation
- **3D**: Three.js via @react-three/fiber (for pose lab)

## Package Management

**CRITICAL**: Always use `pnpm` for package installation, never `npm`.

```bash
pnpm install <package>  # Install new packages
pnpm dev                # Start development server
pnpm build              # Build for production
pnpm start              # Start production server
pnpm lint               # Run ESLint
pnpm test               # Run Vitest tests
pnpm test:watch         # Run Vitest in watch mode
```

## Development Commands

### Development Server
```bash
pnpm dev
# Runs on http://localhost:3000
```

### Database Operations
```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create and apply migrations
npx prisma migrate dev --name <migration_name>

# Apply migrations in production
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Build & Lint
```bash
pnpm build              # Build Next.js app
pnpm lint               # Run ESLint
```

### Testing
```bash
pnpm test               # Run all tests
pnpm test:watch         # Run tests in watch mode
```

Test files use Vitest with React Testing Library. Place tests next to source files with `.test.ts` or `.test.tsx` extension.

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (REST endpoints)
│   │   ├── auth/          # Authentication endpoints
│   │   ├── character/     # Character CRUD & generation
│   │   ├── scene/         # Scene library management
│   │   ├── story/         # Story generation & management
│   │   ├── panel/         # Panel operations (insert/split/merge)
│   │   ├── project/       # Project management
│   │   ├── admin/         # Admin management
│   │   └── storyboard/    # Storyboard/panel management
│   ├── admin/             # Admin dashboard pages
│   ├── assets/            # Asset library page (characters/scenes)
│   ├── auth/              # Login/register pages
│   ├── scripts/           # Story/script management pages
│   │   ├── page.tsx       # Story list page
│   │   └── [id]/          # Individual story editor
│   ├── storyboard/        # Storyboard editor page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # React Query provider
├── components/
│   ├── AssetLibrary/      # Character & scene management components
│   ├── Storyboard/        # Storyboard editor components
│   ├── PoseLab/           # 3D pose editor components
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
│   ├── use-current-user.ts
│   └── use-toast.ts
├── lib/                   # Shared utilities
│   ├── auth.ts            # JWT signing/verification
│   ├── auth-helpers.ts    # Server-side auth helpers
│   ├── db.ts              # Prisma client singleton
│   ├── llm-provider.ts    # LLM API integration
│   ├── story-generator.ts # Story generation helpers
│   ├── generation-log.ts  # Generation logging utilities
│   ├── usage.ts           # Usage tracking & quota management
│   ├── mailer.ts          # Email verification
│   └── utils.ts           # General utilities (cn, etc.)
└── app/globals.css        # Global styles

prisma/
└── schema.prisma          # Database schema
```

### Database Schema (Prisma)

**Core Models:**
- `User` - User accounts with email verification, role (user/admin), status (active/suspended)
- `EmailVerification` - Email verification codes (bcrypt hashed, single-use with expiry)
- `LlmProvider` - Configurable LLM providers (OpenAI-compatible APIs)
- `ComicStyle` - Comic style library (manga, american, webtoon, etc.) with preview images

**Character System (Digital Actor):**
- `Character` - Main character entity with LoRA training status
- `CharacterView` - Three-view reference images (front/side/back)
- `CharacterExpression` - Expression matrix (9 emotions)
- `CharacterOutfit` - Wardrobe system (multiple outfits per character)
- `CharacterRelationship` - Character positioning on relationship chart (x, y, scale)

**Scene Library:**
- `Scene` - Background/environment assets for manga panels with scene types (indoor, outdoor, urban, nature, fantasy, scifi, historical, abstract)

**Story System:**
- `Story` - Story outline and character setup with genre classification (suspense/romance/adventure/scifi/daily/fantasy)
- `StoryTemplate` - Predefined story structures and templates (public or user-owned)
- `Workflow` - Automation workflow tracking for story-to-comic generation pipelines

**Project Management:**
- `Project` - Comic/manga projects with style and status (can be linked to Story)
- `Panel` - Individual storyboard panels with importance levels, panel types, camera angles, shot sizes
- `StoryScript` - Store original script text and segmentation info for script editor
- `GeneratedImage` - Gallery of generated images with generation params

**Usage Tracking & Logging:**
- `GenerationLog` - Detailed logs of all AI generation actions (prompts, responses, errors, duration)
- `UsageStat` - Aggregated daily usage statistics per user and action type

**Key Relationships:**
- Characters belong to Users
- Scenes belong to Users
- Stories belong to Users and can have multiple Projects
- Projects belong to Users and can be linked to a Story (optional)
- Views/Expressions/Outfits cascade delete with Character
- Panels cascade delete with Project
- StoryScript has one-to-one relationship with Project

### API Routes Pattern

All API routes follow this authentication pattern using the `AUTH_COOKIE_NAME` constant:

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

  // Use payload.userId for database queries
}
```

**For admin-only routes**, use the helper:

```typescript
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result; // Error response

  const payload = result; // AuthTokenPayload
  // Use payload.userId for database queries
}
```

**Available Endpoints:**

**Auth:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/send-code` - Send email verification code
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

**Characters:**
- `GET /api/character` - List user's characters
- `POST /api/character` - Create character (auto-creates default outfit)
- `GET /api/character/[id]` - Get character details
- `PATCH /api/character/[id]` - Update character
- `DELETE /api/character/[id]` - Delete character
- `POST /api/character/generate-views` - Generate three-view images
- `POST /api/character/generate-expressions` - Generate expression matrix
- `POST /api/character/generate-similar` - Generate similar character variations
- `POST /api/character/outfits` - Create new outfit
- `POST /api/character/upload-image` - Upload character image to MinIO
- `GET/POST /api/character/relationship` - Character relationship chart CRUD

**Scenes:**
- `GET /api/scene` - List user's scenes
- `POST /api/scene` - Create scene
- `GET /api/scene/[id]` - Get scene details
- `PATCH /api/scene/[id]` - Update scene
- `DELETE /api/scene/[id]` - Delete scene

**Stories:**
- `GET /api/story` - List user's stories with pagination and status filter
- `POST /api/story/generate` - Generate story outline from premise using LLM
- `POST /api/story/expand` - Expand story into detailed script
- `POST /api/story/character-setup` - Set up characters for story
- `GET /api/story/templates` - List story templates
- `POST /api/story/templates` - Create custom story template
- `GET /api/story/templates/[id]` - Get story template details
- `GET /api/story/[id]` - Get story details
- `DELETE /api/story/[id]` - Delete story
- `PATCH /api/story/[id]` - Update story
- `GET /api/story/[id]/panels` - Get panels for story-linked project
- `POST /api/story/[id]/panels` - Create panels from story

**Projects & Panels:**
- `GET /api/project` - List user's projects
- `POST /api/project` - Create project
- `GET /api/project/[id]` - Get project with panels
- `PATCH /api/project/[id]` - Update project
- `DELETE /api/project/[id]` - Delete project
- `POST /api/panel/generate-image` - Generate panel image using LLM + AI
- `POST /api/panel/insert` - Insert new panel between existing panels
- `POST /api/panel/split` - Split panel into multiple panels
- `POST /api/panel/merge` - Merge multiple panels into one
- `PATCH /api/panel/[id]` - Update panel
- `DELETE /api/panel/[id]` - Delete panel

**File Upload:**
- `POST /api/upload` - Upload files to MinIO storage

**Comic Styles (Public):**
- `GET /api/comic-styles` - Get enabled comic styles (no auth required)
- `GET /api/comic-styles/[id]` - Get specific comic style (no auth required)
- Query param: `?enabled=false` to include disabled styles

**Prompt Optimization:**
- `POST /api/prompt/optimize` - Optimize user prompt using LLM (no auth required)

**LLM Providers (Admin):**
- `GET /api/llm-providers` - List all LLM providers
- `POST /api/llm-providers` - Create LLM provider
- `PATCH /api/llm-providers/[id]` - Update LLM provider
- `DELETE /api/llm-providers/[id]` - Delete LLM provider

**Usage & Analytics:**
- `GET /api/usage` - Get current user's usage statistics
- `GET /api/admin/usage` - Get all users' usage statistics (admin only)

**Admin (requires admin role):**
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/[id]` - Get user details
- `PATCH /api/admin/users/[id]` - Update user (role/status)
- `GET /api/admin/comic-styles` - List all comic styles
- `POST /api/admin/comic-styles` - Create comic style
- `PATCH /api/admin/comic-styles/[id]` - Update comic style
- `DELETE /api/admin/comic-styles/[id]` - Delete comic style

### LLM Provider System

LLM providers are configured in the `llm_providers` database table and selected by `provider_type`:

```typescript
{
  provider_type: "script_analyzer" | "prompt_optimizer" | "style_generator" | "character_analyzer" | "image_generation",
  provider_name: "openai",
  model: "gpt-4",
  base_url: "https://api.openai.com",
  api_key: "sk-...",
  priority: 1,      // Lower number = higher priority
  enabled: true
}
```

**Critical**: The system uses `provider_type` as the lookup key. Multiple providers can have the same type - the one with lowest `priority` (and `enabled=true`) wins.

**Known provider types in use:**
- `prompt_optimizer` - Used by `/api/prompt/optimize` for enhancing user prompts
- `character_analyzer` - Used by `/api/character/generate-similar` for analyzing characters and generating variations
- `story_generator` - Used by `/api/story/generate` for generating story outlines and scripts
- `script_analyzer` - For analyzing comic scripts (if implemented)
- `style_generator` - For generating style-specific prompts (if implemented)
- `image_generation` - Used for AI image generation (Stable Diffusion, DALL-E, etc.)

**Adding a new provider type:**
```sql
INSERT INTO llm_providers (provider_type, provider_name, model, base_url, api_key, priority, enabled)
VALUES ('your_new_type', 'openai', 'gpt-4', 'https://api.openai.com', 'sk-...', 1, true);
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
  maxTokens: 1500
});

const content = result.content; // LLM response text
```

The system expects OpenAI-compatible `/v1/chat/completions` endpoints.

### File Upload System (MinIO)

The app uses MinIO for object storage. Files uploaded through `/api/upload` or `/api/character/upload-image` are stored in MinIO buckets.

**Configuration** (in `.env`):
```bash
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=manga-assets
```

**Upload helpers** are available in `@/lib/upload-helpers.ts`:
- `uploadBase64Image(base64Data, filename)` - Upload base64 image to MinIO
- Returns public URL for the uploaded file

**Usage:**
```typescript
import { uploadBase64Image } from "@/lib/upload-helpers";

const imageUrl = await uploadBase64Image(base64String, "character-123.png");
// Returns: http://localhost:9000/manga-assets/character-123.png
```

### Usage Tracking & Generation Logging

All AI generation actions are automatically logged for analytics and debugging.

**Generation Logging** (`@/lib/generation-log.ts`):
```typescript
import { logGeneration } from "@/lib/generation-log";

await logGeneration({
  userId: "user-id",
  action: "generate_character_view",
  providerType: "image_generation",
  status: "success",
  durationMs: 1234,
  requestPayload: { prompt: "..." },
  responsePayload: { imageUrl: "..." }
});
```

**Usage Statistics** (`@/lib/usage.ts`):
```typescript
import { incrementUsage } from "@/lib/usage";

await incrementUsage(userId, "generate_expression", "image_generation");
// Or with quota checking
await assertAndIncrementUsage({
  userId,
  action: "story_generation",
  providerType: "story_generator"
});
```

This automatically aggregates daily usage counts in the `usage_stats` table for quota management and billing.

**Common actions tracked:**
- `generate_character_view` - Character view generation
- `generate_expression` - Expression generation
- `generate_similar_character` - Similar character generation
- `story_generation` - Story outline generation
- `panel_generation` - Panel image generation

### Authentication Flow

1. User registers with email
2. System sends verification code via email (stored in `email_verifications` table with bcrypt hash)
3. User verifies code (system marks `used=true`)
4. User logs in → receives JWT token stored in HTTP-only cookie (`comicai_session`)
5. API routes extract token from cookie using `AUTH_COOKIE_NAME` constant
6. API routes verify token using `verifyAuthToken(token)` → returns `AuthTokenPayload` with `userId`, `email`, `role`

**Cookie name**: `comicai_session` (defined as `AUTH_COOKIE_NAME` constant in `@/lib/auth`)

### Character System Workflow

**Creating a character:**
1. User creates character via `POST /api/character`
2. System auto-creates "默认装" (default outfit)
3. Character status: `pending` → `training` → `ready` | `failed`

**Generating three views:**
1. Call `POST /api/character/generate-views` with `character_id`
2. System uses LLM to generate front/side/back prompts
3. (Placeholder) AI image generation → stores URLs in `character_views`

**Generating expressions:**
1. Call `POST /api/character/generate-expressions`
2. Single: `{ expression_type: "happy" }`
3. Batch: `{ generate_all: true }`
4. System generates optimized prompts for each emotion

**Generating similar characters:**
1. Call `POST /api/character/generate-similar` with `character_id`, `variation_prompt`, `count` (1-3)
2. System uses LLM (provider_type: `character_analyzer`) to analyze original character
3. LLM generates optimized prompts based on variation description
4. AI generates 1-3 character images in parallel
5. Returns base64 images for user preview and selection
6. User saves selected images as new characters in the library

**Story Workflow:**
1. Create story via `POST /api/story/generate` with `premise`, `genre`, `characterCount`, `length`
2. System uses LLM (provider_type: `story_generator`) to generate story outline
3. Story includes: title, genre, characters, acts, and plot points
4. Optionally expand story into detailed script via `POST /api/story/expand`
5. Create project from story and generate panels
6. View and manage stories in `/scripts` page
7. Edit story panels in `/scripts/[id]` page

**Scene Library Workflow:**
1. Create scene via `POST /api/scene`
2. Upload scene image via `/api/upload` or store AI-generated scene URL
3. Scenes can be tagged and categorized by scene_type
4. Use scenes as background references in panel generation

**Panel Operations (Storyboard Editor):**
- **Insert**: `POST /api/panel/insert` - Insert new panel at specific position, auto-reorders subsequent panels
- **Split**: `POST /api/panel/split` - Split one panel into multiple panels (e.g., 2 or 3 panels)
- **Merge**: `POST /api/panel/merge` - Merge multiple consecutive panels into one panel
- All operations automatically update `panel_order` for affected panels

**Expression types:**
`neutral`, `happy`, `sad`, `angry`, `surprised`, `shy`, `confident`, `worried`, `determined`

**Outfit types:**
`default`, `school`, `battle`, `casual`, `formal`, `sleepwear`, `sports`, `custom`

**Story genres:**
- `suspense` (悬疑) - Mystery, thriller
- `romance` (爱情) - Romantic stories
- `adventure` (冒险) - Action-adventure
- `scifi` (科幻) - Science fiction
- `daily` (日常) - Slice of life
- `fantasy` (奇幻) - Fantasy, magical

**Story lengths:**
- `short` - Brief story (3-5 acts)
- `medium` - Standard length (5-7 acts)
- `long` - Extended story (7+ acts)

**Workflow statuses:**
`pending`, `running`, `completed`, `failed`, `cancelled`

**Scene types:**
`indoor`, `outdoor`, `urban`, `nature`, `fantasy`, `scifi`, `historical`, `abstract`

**Panel types:**
`wide`, `medium`, `closeup`, `action`, `dialogue`, `transition`

**Camera angles:**
`俯视` (top-down), `仰视` (bottom-up), `平视` (eye-level), `荷兰角` (Dutch angle)

**Shot sizes:**
`特写` (close-up), `近景` (close shot), `中景` (medium shot), `全景` (full shot), `远景` (long shot)

## Environment Variables

Required variables in `.env`:

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
MINIO_BUCKET=manga-assets
```

## Code Style Guidelines

1. **TypeScript Strict Mode**: NO `any` types allowed - all types must be explicitly defined
   - **WARNING**: Current `tsconfig.json` has `"strict": false` but you MUST write code as if it were `true`
   - When writing new code, explicitly type all parameters, return values, and variables
   - Use `unknown` instead of `any` when the type is genuinely unknown
   - This is a critical requirement that overrides the tsconfig setting
2. **Type Definitions**: Extract types to separate `types.ts` files when they're shared across multiple files
3. **File Length**: Single files must not exceed 500 lines
   - If a file exceeds 500 lines, split into sub-components or extract hooks
   - This applies to both component files and utility files
4. **Package Manager**: ALWAYS use `pnpm`, NEVER `npm`
   - Run `pnpm install <package>` to add dependencies
   - Never use `npm` commands
5. **No Emojis**: Use proper icons (from `lucide-react`) instead of emoji characters in UI
   - Import icons: `import { IconName } from "lucide-react"`
   - Replace all emoji usage with semantic icons

## Testing & Validation

1. Test endpoints with actual HTTP requests (curl/Postman/REST client)
2. Verify database changes using `npx prisma studio`
3. Check error handling for edge cases (missing auth, invalid IDs, etc.)

## Common Patterns

### Path Aliases
Use `@/` for imports from `src/`:
```typescript
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
```

### Prisma Client Usage
```typescript
import { prisma } from "@/lib/db";

// Always use the singleton instance
const user = await prisma.user.findUnique({ where: { id } });
```

### shadcn/ui Components
All UI components are in `src/components/ui/`. Import like:
```typescript
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
```

### Error Handling
API routes should return consistent error format:
```typescript
return NextResponse.json(
  { error: "错误描述" },
  { status: 400 | 401 | 403 | 500 }
);
```

## Known Limitations

1. **Image Generation**: Currently uses placeholder URLs - production deployment requires integration with:
   - Stable Diffusion API (ComfyUI, Automatic1111, etc.)
   - DALL-E API
   - Other image generation services
2. **LoRA Training**: Not implemented - character `training_status` always remains `pending`
3. **MinIO Storage**: Requires MinIO server running locally or cloud instance (S3-compatible storage can also be used)

## Example Application

The `example/` directory contains a standalone photo-to-manga web app that demonstrates the AI generation workflow:
- Converts photos to manga-style storyboards
- Uses OpenAI GPT for script generation
- Uses DALL-E for image generation
- Pure HTML/CSS/JavaScript (no framework)

This is separate from the main Next.js app and serves as a reference implementation.

## Migration Notes

Migrated from Vite to Next.js 14 App Router. When refactoring legacy code, follow Next.js conventions (Server Components by default, use `"use client"` only when necessary).

## Important Exclusions

**DO NOT read or modify files in the `example/` directory unless explicitly requested by the user.**
- The `example/` directory contains a standalone demo application
- It is separate from the main Next.js application
- It serves as reference implementation only