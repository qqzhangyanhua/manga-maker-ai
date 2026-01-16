# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Manga Maker AI** - End-to-end AI comic and novel creation platform covering "Story → Script → Storyboard → Image → Layout" workflow with Digital Actor management, style library, workflow orchestration, and image refinement tools.

This is a **hybrid architecture** project combining:
- **Next.js 14 frontend + API** (TypeScript) for comic creation workflow
- **Python FastAPI microservice** for novel generation and RAG (Retrieval-Augmented Generation)

## Tech Stack

### Frontend & Comic Backend
- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Database**: PostgreSQL 14+ + Prisma ORM
- **UI**: TailwindCSS + shadcn/ui (Radix UI) + lucide-react icons
- **3D**: Three.js via @react-three/fiber (pose lab)
- **Storage**: MinIO/S3-compatible object storage
- **Auth**: JWT + bcrypt + Nodemailer SMTP
- **AI/LLM**: OpenAI-compatible APIs configured via `llm_providers` table
- **Testing**: Vitest + React Testing Library

### Novel Backend Microservice (Python)
- **Framework**: FastAPI 0.115.0 + Uvicorn
- **Database**: Shared PostgreSQL (via asyncpg)
- **AI**: OpenAI API (GPT-4 Turbo for text generation)
- **RAG**: ChromaDB + OpenAI Embeddings (text-embedding-3-small)
- **Document Generation**: python-docx, reportlab
- **Communication**: REST + SSE (Server-Sent Events) for streaming

## Package Management

**IMPORTANT**: This project uses **npm** (NOT pnpm). The README mentions pnpm support, but `package-lock.json` is the source of truth.

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build & Production
npm run build
npm run start

# Testing
npm test
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

## Development Commands

### Next.js Application

```bash
# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint

# TypeScript type checking (no emit)
npm run type-check
```

### Database Operations (Prisma)

```bash
# Generate Prisma Client (REQUIRED after schema changes)
npx prisma generate

# Create migration (development)
npx prisma migrate dev --name <migration_name>

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database
npx prisma db seed

# Initialize database (uses migration system)
./scripts/init-db.sh
```

### Testing

```bash
# Run all tests (Vitest)
npm test

# Watch mode
npm run test:watch
```

Test files use Vitest with React Testing Library. Place tests next to source files with `.test.ts` or `.test.tsx` extension.

### Novel Backend Service (Python FastAPI)

**Location**: `services/novel-backend/`

```bash
# First-time setup
cd services/novel-backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env: DATABASE_URL, OPENAI_API_KEY, JWT_SECRET

# Start service (port 8000)
uvicorn app.main:app --reload --port 8000

# Health check
curl http://localhost:8000/health

# API documentation
# http://localhost:8000/docs (Swagger UI)
```

**Subsequent starts** (after initial setup):
```bash
cd services/novel-backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Docker Compose (Full Stack)

```bash
# Start all services (PostgreSQL, MinIO, Redis, Novel Backend)
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f novel-backend
```

## Architecture Overview

### Microservice Communication

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js App (Port 3000)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Frontend Pages (React Components)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/*)                                 │   │
│  │  - /api/auth/*        - Authentication               │   │
│  │  - /api/character/*   - Comic character CRUD         │   │
│  │  - /api/story/*       - Story generation             │   │
│  │  - /api/panel/*       - Storyboard panels            │   │
│  │  - /api/novel/*       - Proxy to Python backend ──┐  │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬────────────────┬─────────┘
                                    │                │
                                    │                └──────────┐
                                    ▼                           ▼
                    ┌───────────────────────────┐   ┌──────────────────────┐
                    │   PostgreSQL (5432)       │   │ Novel Backend (8000) │
                    │   - Shared by both apps   │   │  Python FastAPI      │
                    └───────────────────────────┘   │  ┌────────────────┐  │
                                    ▲               │  │ Novel Gen      │  │
                                    │               │  │ RAG Service    │  │
                                    │               │  │ ChromaDB       │  │
                    ┌───────────────┴───────────┐   │  └────────────────┘  │
                    │   MinIO (9000)            │   └──────────────────────┘
                    │   Object Storage          │               │
                    └───────────────────────────┘               │
                                                                │
                                                                ▼
                                                    ┌──────────────────────┐
                                                    │  PostgreSQL (5432)   │
                                                    │  Same DB, asyncpg    │
                                                    └──────────────────────┘
```

**Key Integration Points:**

1. **API Proxy Layer**: `/api/novel/[...path]/route.ts`
   - Forwards all `/api/novel/*` requests to Python backend
   - Handles authentication (extracts JWT from Next.js cookie)
   - Converts cookie auth → Bearer token for FastAPI
   - Supports both JSON and streaming responses

2. **Typed Client**: `src/lib/novel-backend-client.ts`
   - TypeScript wrapper for novel-backend API
   - Automatic retry logic (3 attempts, exponential backoff)
   - Type-safe request/response interfaces
   - Used by Next.js API routes and components

3. **Shared Resources**:
   - PostgreSQL database (same connection string)
   - JWT secret (shared for auth verification)
   - MinIO storage (same bucket configuration)

### Directory Structure

```
.
├── src/                          # Next.js application
│   ├── app/                      # App Router
│   │   ├── api/                  # Next.js API routes
│   │   │   ├── auth/             # Authentication (JWT cookies)
│   │   │   ├── character/        # Comic character CRUD
│   │   │   ├── scene/            # Scene library
│   │   │   ├── story/            # Story generation
│   │   │   ├── chapter/          # Chapter management
│   │   │   ├── panel/            # Storyboard panel operations
│   │   │   ├── project/          # Comic project management
│   │   │   ├── admin/            # Admin endpoints
│   │   │   └── novel/[...path]/  # Proxy to Python backend
│   │   ├── scripts/[id]/         # Story editor pages
│   │   ├── storyboard/           # Storyboard editor
│   │   ├── editor/               # Image refinement
│   │   ├── workflow/             # Workflow orchestration
│   │   ├── assets/               # Asset library
│   │   └── admin/                # Admin dashboard
│   ├── components/               # React components
│   │   ├── Storyboard/           # Storyboard editor components
│   │   ├── ImageEditor/          # Canvas & timeline
│   │   ├── ui/                   # shadcn/ui base components
│   │   └── ...
│   ├── lib/                      # Shared utilities & services
│   │   ├── auth.ts               # JWT signing/verification
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── llm-provider.ts       # LLM API integration
│   │   ├── credits.ts            # Credits system
│   │   ├── novel-backend-client.ts  # Python backend client
│   │   └── ...
│   └── hooks/                    # Custom React hooks
│
├── services/novel-backend/       # Python FastAPI microservice
│   ├── app/
│   │   ├── main.py               # FastAPI application
│   │   ├── config.py             # Settings (pydantic-settings)
│   │   ├── models.py             # SQLAlchemy models
│   │   ├── routers/              # API routes
│   │   │   ├── projects.py       # Novel project CRUD
│   │   │   ├── chapters.py       # Chapter generation (SSE)
│   │   │   ├── progressive.py    # Progressive outline generation
│   │   │   ├── rag.py            # RAG indexing & search
│   │   │   ├── canvas.py         # Script analysis for storyboard
│   │   │   └── ...
│   │   └── services/
│   │       ├── generation_service.py        # Text generation
│   │       ├── rag_service.py               # RAG retrieval
│   │       ├── vector_service.py            # ChromaDB wrapper
│   │       ├── progressive_outline_service.py
│   │       └── prompt_templates.py          # LLM prompt templates
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment template
│   └── chroma_db/                # ChromaDB persistent storage
│
├── prisma/
│   ├── schema.prisma             # Database schema (shared)
│   ├── migrations/               # Prisma migrations
│   └── seed.ts                   # Seed script
│
├── scripts/                      # Utility scripts
│   ├── init-db.sh                # Database initialization
│   └── ...
│
├── docker-compose.yml            # Multi-container setup
└── package.json                  # npm dependencies
```

## Core Database Models

**Shared between Next.js and Python backends via same PostgreSQL instance.**

### User & Auth
- `User` - User accounts with `credits`, `total_credits_used`, role, status
- `EmailVerification` - Email verification codes (bcrypt hashed)
- `CreditTransaction` - Credits transaction history

### LLM Configuration
- `LlmProvider` - Configurable LLM providers (Next.js only)

### Character System (Comic Creation)
- `Character` - Digital actors with reference images
- `CharacterView` - Three-view reference images
- `CharacterExpression` - Expression matrix (9 emotions)
- `CharacterOutfit` - Wardrobe system
- `CharacterRelationship` - Relationship chart positioning

### Story & Projects
- `Story` - Story outlines (used by both systems)
- `StoryCharacter` - Many-to-many Story ↔ Character
- `Chapter` - Story chapters
- `Project` - Comic projects
- `Panel` - Storyboard panels with asset bindings

### Novel System (Python Backend)
- `NovelProject` - Novel-specific projects
- `NovelChapter` - Novel chapters with content
- `NovelScene` - Scene/location definitions
- `NovelCharacter` - Novel character profiles
- `NovelTimeline` - Infinite canvas timeline nodes

### Scene Library
- `Scene` - Background/environment assets

### Templates & Workflows
- `StoryTemplate` - Predefined story structures
- `PanelTemplate` - Reusable storyboard layouts
- `Workflow` - Automation workflow tracking

## Authentication Architecture

**Cross-Service Authentication Flow:**

1. **User Login** (Next.js):
   - `POST /api/auth/login`
   - Returns JWT in HTTP-only cookie (`comicai_session`)
   - Cookie domain: Next.js app only

2. **Next.js API Routes**:
   ```typescript
   import { cookies } from "next/headers";
   import { verifyAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

   const cookieStore = await cookies();
   const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
   const payload = verifyAuthToken(token);
   // payload.userId, payload.role, payload.email
   ```

3. **Novel Backend Proxy** (`/api/novel/[...path]/route.ts`):
   - Extracts JWT from Next.js cookie
   - Forwards as `Authorization: Bearer <token>` header
   - Python backend validates using shared `JWT_SECRET`

4. **Python Backend**:
   ```python
   from fastapi import Header
   from jose import jwt

   def verify_token(authorization: str = Header(...)):
       token = authorization.replace("Bearer ", "")
       payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
       return payload["userId"]
   ```

**Admin-only routes**:
```typescript
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;
  const payload = result; // AuthTokenPayload
}
```

## Code Style Guidelines

### TypeScript Strict Mode Enforcement

**CRITICAL**: `tsconfig.json` has `"strict": false`, but you MUST write code as if it were `true`.

1. **NO `any` types allowed**
   - Explicitly type all parameters, return values, variables
   - Use `unknown` instead of `any` when type is genuinely unknown

2. **Type Definitions**
   - Extract shared types to separate `types.ts` files
   - Example: `src/lib/novel-backend-client.ts` has comprehensive type definitions

3. **File Length Limit**: 500 lines maximum
   - Split into sub-components or extract hooks if exceeded

4. **No Emojis in UI**
   - Use lucide-react icons instead
   ```typescript
   import { IconName } from "lucide-react";
   ```

5. **Path Aliases**: Always use `@/` for imports
   ```typescript
   import { prisma } from "@/lib/db";
   import { Button } from "@/components/ui/button";
   ```

6. **Error Handling**: Consistent format
   ```typescript
   return NextResponse.json(
     { error: "错误描述" },
     { status: 400 | 401 | 403 | 500 }
   );
   ```

## Testing Strategy

### Frontend Tests (Vitest)
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

- Test files: `*.test.ts`, `*.test.tsx` next to source files
- Config: `vitest.config.ts`
- Setup: `vitest.setup.ts`
- Separate tsconfig: `tsconfig.vitest.json`

### Python Backend Tests
```bash
cd services/novel-backend
python test_rag.py          # RAG service tests
```

## Environment Variables

### Next.js (.env.local)
```bash
# Database
DATABASE_URL=postgresql://manga:manga123@localhost:5432/manga

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

# Novel Backend Service
NOVEL_SERVICE_URL=http://localhost:8000

# Optional Quotas
QUOTA_STORYBOARD_DAILY=20
QUOTA_STORY_DAILY=30
QUOTA_IMAGE_DAILY=50
```

### Python Backend (services/novel-backend/.env)
```bash
# Database (shared with Next.js)
DATABASE_URL=postgresql://manga:manga123@localhost:5432/manga

# JWT (MUST match Next.js AUTH_SECRET)
JWT_SECRET=<same_as_nextjs_auth_secret>
JWT_ALGORITHM=HS256

# OpenAI API
OPENAI_API_KEY=your-openai-api-key
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4-turbo-preview

# Embedding Model (RAG)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
# Optional: Separate embedding endpoint
# OPENAI_EMBEDDING_API_BASE=https://custom-embedding-api.com/v1

# ChromaDB (RAG)
CHROMA_PERSIST_DIR=./chroma_db
CHROMA_COLLECTION_NAME=novel_chapters
RAG_TOP_K=3
RAG_ENABLE_VECTOR_SEARCH=true

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
LOG_LEVEL=INFO
```

## Key API Endpoints

### Comic Creation APIs (Next.js)

**Auth**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (sets HTTP-only cookie)
- `POST /api/auth/send-code` - Email verification
- `GET /api/auth/me` - Current user info
- `POST /api/auth/logout` - Logout

**Characters**:
- `GET /api/character` - List characters
- `POST /api/character` - Create character (auto-creates default outfit)
- `POST /api/character/[id]/regenerate-image` - Regenerate character image
- `POST /api/character/generate-views` - Generate three-view images
- `POST /api/character/generate-expressions` - Generate expression matrix

**Stories & Panels**:
- `POST /api/story/generate` - Generate story outline
- `POST /api/chapter/[id]/generate-panels` - Generate storyboard panels
- `POST /api/panel/insert` - Insert panel at position
- `POST /api/panel/split` - Split panel into multiple
- `POST /api/panel/merge` - Merge consecutive panels

### Novel Generation APIs (Python Backend)

**Access via Next.js proxy**: `/api/novel/*` → forwarded to Python backend

**Projects**:
- `POST /api/novel/projects` - Create novel project
- `GET /api/novel/projects` - List projects
- `GET /api/novel/projects/{id}` - Get project details

**Progressive Outline Generation** (10-step workflow):
- `POST /api/novel/progressive/concept` - Step 1: Generate one-sentence concept
- `POST /api/novel/progressive/structure` - Step 2: Three-act structure
- `POST /api/novel/progressive/detailed-outline` - Step 3: Detailed chapter outline
- `POST /api/novel/progressive/analyze` - Step 4: Analyze quality (爽点密度/节奏)

**Chapter Generation**:
- `POST /api/novel/chapters/generate/stream` - Generate chapter with SSE streaming
- `POST /api/novel/chapters/regenerate` - Regenerate existing chapter

**RAG (Retrieval-Augmented Generation)**:
- `POST /api/novel/rag/index-chapter` - Index single chapter
- `POST /api/novel/rag/batch-index` - Batch index project chapters
- `DELETE /api/novel/rag/chapter/{id}` - Remove chapter from index
- `GET /api/novel/rag/stats` - RAG system statistics

**Canvas Integration** (Script → Storyboard):
- `POST /api/novel/canvas/analyze-script` - Analyze chapter text into script segments
- `POST /api/novel/canvas/generate-shots` - Generate camera shots from segments
- `POST /api/novel/canvas/generate-scenes` - Generate scene images
- `POST /api/novel/canvas/generate-finals` - Generate final comic panels

## Novel Backend Architecture Details

### Progressive Outline Generation (10-Step Workflow)

**Design Philosophy**: "网文爽文" style (Chinese web novel with high engagement)

1. **Step 1: Concept** - One-sentence premise
2. **Step 2: Structure** - Three-act structure (5 sentences)
3. **Step 3: Detailed Outline** - Chapter-by-chapter outline with "爽点" (pleasure points) markers
4. **Step 4-10: Quality Analysis**:
   - 爽点密度 (pleasure point density)
   - 节奏分析 (pacing analysis)
   - 开篇吸引力 (opening hook strength)
   - 主角吸引力 (protagonist appeal)
   - 冲突强度 (conflict intensity)

### RAG System (Retrieval-Augmented Generation)

**Purpose**: Context-aware chapter generation using vector search

**Stack**:
- **Vector DB**: ChromaDB (persistent storage in `chroma_db/`)
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Retrieval**: Cosine similarity with top-k=3

**Workflow**:
1. When chapter is created/updated → auto-index to ChromaDB
2. When generating new chapter → retrieve similar chapters as context
3. LLM uses retrieved context for consistent style/continuity

**Cost Optimization**:
- `text-embedding-3-small`: $0.02 per 1M tokens (80% cheaper than ada-002)
- Fallback to keyword search if embedding fails

### Prompt Engineering

**Location**: `services/novel-backend/app/services/prompt_templates.py`

**Key Components**:
- `BASE_PERSONA` - "新人网文作家" (new web novel author persona)
- `ANTI_AI_RULES` - Rules to avoid AI-like writing
- `GOLDEN_THREE_RULES` - First 3 chapters must hook readers
- `WEB_NOVEL_CORE` - Core requirements (6000 chars/chapter, fast pacing)

**Template Methods**:
```python
NovelPromptTemplates.get_chapter_generation_prompt(
    chapter_number=1,
    outline="...",
    character_profiles=[...],
    previous_context="...",
    rag_context=[...]  # Retrieved similar chapters
)
```

## Common Workflows

### 1. Comic Creation Workflow
```
Story Generation → Character Assignment → Script Generation →
Panel Generation → Image Generation → Layout & Export
```

1. `POST /api/story/generate` - Generate story outline
2. `POST /api/story/[id]/characters` - Add characters from library
3. `POST /api/story/expand` - Expand into detailed script
4. `POST /api/project` - Create comic project
5. `POST /api/chapter/[id]/generate-panels` - Generate storyboard panels
6. `POST /api/panel/[id]/variants` - Generate panel variants

### 2. Novel Creation Workflow (Progressive Mode)
```
Concept → Structure → Detailed Outline → Analysis →
Chapter Generation (6000 chars) → RAG Indexing
```

1. `POST /api/novel/progressive/concept` - One-sentence concept
2. `POST /api/novel/progressive/structure` - Three-act structure
3. `POST /api/novel/progressive/detailed-outline` - Chapter outlines
4. `POST /api/novel/progressive/analyze` - Quality analysis
5. **User reviews and refines outline**
6. `POST /api/novel/chapters/generate/stream` - Generate chapters with SSE
7. **Auto-indexed to RAG** for context in subsequent chapters

### 3. Novel → Comic Conversion (Canvas Integration)
```
Novel Chapter Text → Script Segments → Camera Shots →
Scene Images → Final Comic Panels
```

1. `POST /api/novel/canvas/analyze-script` - Split chapter into segments
2. `POST /api/novel/canvas/generate-shots` - Generate camera directions
3. `POST /api/novel/canvas/generate-scenes` - Generate scene images
4. `POST /api/novel/canvas/generate-finals` - Add speech bubbles & effects

## Known Limitations

1. **Image Generation**: Requires external AI service (Stable Diffusion, DALL-E)
2. **LoRA Training**: Not implemented - `training_status` remains `pending`
3. **MinIO Storage**: Requires MinIO server or S3-compatible storage running
4. **Python Service**: Must run separately from Next.js app (different ports)

## Docker Deployment

```bash
# Start all services (recommended for production)
docker-compose up -d

# Services started:
# - PostgreSQL (5432)
# - MinIO (9000, 9001 console)
# - Redis (6379)
# - Novel Backend (8000)

# Next.js app runs separately:
npm run build
npm run start
```

## Troubleshooting

### Novel Backend Connection Issues
```bash
# 1. Check if service is running
curl http://localhost:8000/health

# 2. Check Next.js environment variable
echo $NOVEL_SERVICE_URL  # Should be http://localhost:8000

# 3. Check Python backend logs
cd services/novel-backend
tail -f app.log
```

### RAG Not Working
```bash
# 1. Check ChromaDB initialization
curl http://localhost:8000/api/novel/rag/stats

# 2. Verify environment variables
cd services/novel-backend
grep RAG_ENABLE_VECTOR_SEARCH .env  # Should be true

# 3. Test embedding API
python test_rag.py
```

### Database Migration Issues
```bash
# Reset database (WARNING: destroys data)
npx prisma migrate reset

# Apply pending migrations
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

## Important Notes

1. **Shared JWT Secret**: `AUTH_SECRET` (Next.js) MUST equal `JWT_SECRET` (Python)
2. **Database Schema**: Managed by Prisma migrations, Python uses same schema
3. **File Limit**: 500 lines per file - split if exceeded
4. **TypeScript**: Write as if `strict: true` even though it's `false`
5. **Package Manager**: Use `npm` (not pnpm) - `package-lock.json` is canonical

## Exclusions

**DO NOT modify**:
- `example/` directory - Contains standalone demo application
- Files in `.git/`, `node_modules/`, `.next/`, `dist/`
