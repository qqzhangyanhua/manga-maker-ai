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
- `User` - User accounts with email verification
- `EmailVerification` - Email verification codes
- `LlmProvider` - Configurable LLM providers (OpenAI-compatible APIs)

**Character System (Digital Actor):**
- `Character` - Main character entity with LoRA training status
- `CharacterView` - Three-view reference images (front/side/back)
- `CharacterExpression` - Expression matrix (9 emotions)
- `CharacterOutfit` - Wardrobe system (multiple outfits per character)

**Project Management:**
- `Project` - Comic/manga projects
- `Panel` - Individual storyboard panels
- `GeneratedImage` - Gallery of generated images

**Key Relationships:**
- Characters belong to Users
- Views/Expressions/Outfits cascade delete with Character
- Panels cascade delete with Project

### API Routes Pattern

All API routes follow this authentication pattern:

```typescript
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

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

**Available Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/send-code` - Send email verification code
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

- `GET /api/character` - List user's characters
- `POST /api/character` - Create character (auto-creates default outfit)
- `GET /api/character/[id]` - Get character details
- `PATCH /api/character/[id]` - Update character
- `DELETE /api/character/[id]` - Delete character

- `POST /api/character/generate-views` - Generate three-view images
- `POST /api/character/generate-expressions` - Generate expression matrix
- `POST /api/character/outfits` - Create new outfit

### LLM Provider System

LLM providers are configured in the `llm_providers` database table:

```typescript
{
  provider_type: "script_analyzer" | "prompt_optimizer" | etc.,
  provider_name: "openai",
  model: "gpt-4",
  base_url: "https://api.openai.com",
  api_key: "sk-...",
  priority: 1,      // Lower = higher priority
  enabled: true
}
```

**Usage in code:**
```typescript
import { callChatCompletionByType } from "@/lib/llm-provider";

const result = await callChatCompletionByType({
  providerType: "script_analyzer",
  messages: [
    { role: "system", content: "You are a helpful assistant" },
    { role: "user", content: "Generate a prompt for..." }
  ],
  temperature: 0.6,
  maxTokens: 1500
});

const content = result.content; // LLM response text
```

### Authentication Flow

1. User registers with email
2. System sends verification code via email (stored in `email_verifications` table)
3. User verifies email
4. User logs in → receives JWT token stored in `token` cookie
5. Frontend reads token, passes in `Authorization: Bearer <token>` or cookie
6. API routes verify token using `verifyAuthToken(token)`

**Cookie name**: `token` (not `comicai_session` as defined in auth.ts - check actual usage)

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

1. **File Length**: Single files should not exceed 500 lines - split if necessary
2. **Type Definitions**: Keep types inline with business logic, not in separate type files
3. **Validation**: Write test cases for all API endpoints
4. **No Emojis**: Avoid emojis in code unless explicitly requested

## Testing & Validation

After modifying API routes:
1. Test the endpoint manually or write a test case
2. Verify database changes in Prisma Studio
3. Check error handling for edge cases

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

1. **Image Generation**: Currently uses placeholder URLs. Need to integrate actual Stable Diffusion API
2. **LoRA Training**: Training logic is not implemented (status remains `pending`)
3. **File Upload**: No cloud storage integration yet (S3/OSS/R2)

## Migration Notes

This project was migrated from Vite to Next.js 14. Some legacy patterns may exist. When refactoring, follow Next.js App Router conventions.

## Resources

- Main documentation: `CHARACTER_SYSTEM_README.md` - Details on the Digital Actor system
- UI improvements: `DIALOG_IMPROVEMENTS.md` - Dialog component patterns
- Prisma schema: `prisma/schema.prisma` - Full database structure
