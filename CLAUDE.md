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

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (REST endpoints)
│   │   ├── auth/          # Authentication endpoints
│   │   ├── character/     # Character CRUD & generation
│   │   ├── admin/         # Admin management
│   │   └── storyboard/    # Storyboard/panel management
│   ├── admin/             # Admin dashboard pages
│   ├── assets/            # Asset library page (characters/scenes)
│   ├── auth/              # Login/register pages
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

**Project Management:**
- `Project` - Comic/manga projects with style and status
- `Panel` - Individual storyboard panels with importance levels and panel types
- `GeneratedImage` - Gallery of generated images with generation params

**Key Relationships:**
- Characters belong to Users
- Views/Expressions/Outfits cascade delete with Character
- Panels cascade delete with Project

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
- `POST /api/character/generate-similar` - Generate similar character variations (NEW)
- `POST /api/character/outfits` - Create new outfit
- `GET/POST /api/character/relationship` - Character relationship chart CRUD

**Projects & Panels:**
- `GET /api/project` - List user's projects
- `POST /api/project` - Create project
- `GET /api/project/[id]` - Get project with panels
- `PATCH /api/project/[id]` - Update project
- `POST /api/panel/generate-image` - Generate panel image using LLM + AI

**Comic Styles (Public):**
- `GET /api/comic-styles` - Get enabled comic styles (no auth required)
- Query param: `?enabled=false` to include disabled styles

**Prompt Optimization:**
- `POST /api/prompt/optimize` - Optimize user prompt using LLM (no auth required)

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
  provider_type: "script_analyzer" | "prompt_optimizer" | "style_generator",
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
- `script_analyzer` - For analyzing comic scripts (if implemented)
- `style_generator` - For generating style-specific prompts (if implemented)
- `image_generation` - Used for AI image generation (Stable Diffusion, etc.)

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

**Generating similar characters (NEW):**
1. Call `POST /api/character/generate-similar` with `character_id`, `variation_prompt`, `count` (1-3)
2. System uses LLM (provider_type: `character_analyzer`) to analyze original character
3. LLM generates optimized prompts based on variation description
4. AI generates 1-3 character images in parallel
5. Returns base64 images for user preview and selection
6. User saves selected images as new characters in the library

**Expression types:**
`neutral`, `happy`, `sad`, `angry`, `surprised`, `shy`, `confident`, `worried`, `determined`

**Outfit types:**
`default`, `school`, `battle`, `casual`, `formal`, `sleepwear`, `sports`, `custom`

## Environment Variables

Required variables in `.env`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
AUTH_SECRET=<random_secret_for_jwt>
EMAIL_HOST=smtp.qq.com
EMAIL_PORT=465
EMAIL_USER=your@qq.com
EMAIL_PASSWORD=your_smtp_key
EMAIL_FROM="ComicAI <your@qq.com>"
```

## Code Style Guidelines

1. **TypeScript Strict Mode**: NO `any` types allowed - all types must be explicitly defined
   - **WARNING**: Current `tsconfig.json` has `"strict": false` - this should be `true` for new code
   - When writing new code, explicitly type all parameters, return values, and variables
   - Use `unknown` instead of `any` when the type is genuinely unknown
2. **Type Definitions**: Extract types to separate `types.ts` files when they're shared across multiple files
3. **File Length**: Single files must not exceed 500 lines - split into sub-components or hooks
4. **Package Manager**: ALWAYS use `pnpm`, NEVER `npm`
5. **No Emojis**: Use proper icons (from `lucide-react`) instead of emoji characters in UI

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

1. **Image Generation**: Placeholder URLs only - needs Stable Diffusion/DALL-E API integration
2. **LoRA Training**: Not implemented - character `training_status` always remains `pending`
3. **File Upload**: No cloud storage (S3/R2/MinIO) - images need external hosting URLs

## Migration Notes

Migrated from Vite to Next.js 14 App Router. When refactoring legacy code, follow Next.js conventions (Server Components by default, use `"use client"` only when necessary).
