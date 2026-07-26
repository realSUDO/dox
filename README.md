# Dox - Advanced RAG Workspace

Dox is a powerful, production-ready **Retrieval-Augmented Generation (RAG)** workspace. It allows users to create "Leafs" (workspaces), upload various sources (PDFs, Markdown, Videos/Audio via VTT/SRT, Web Links, and full Codebase ZIPs), and interact with them using conversational AI. 

The system features an asynchronous distributed ingestion pipeline, robust guardrails, and an intelligent ZIP evaluation agent.

---

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **Monorepo** | Turborepo + pnpm workspaces |
| **Frontend** | Next.js (App Router), React, Tailwind CSS, shadcn/ui |
| **Backend API** | Express + tRPC (Type-safe RPCs) |
| **Authentication** | Clerk (`@clerk/nextjs`, `@clerk/express`) |
| **Database** | PostgreSQL via **Prisma ORM** |
| **Vector Database** | Qdrant |
| **Queue/Workers** | BullMQ + Valkey (Redis) |
| **Storage** | S3 API / DigitalOcean Spaces |
| **AI / LLMs** | OpenAI (Embeddings & Chat Completions) |

---

## 📂 Project Structure

```text
.
├── apps/
│   ├── api/          # Express Server (tRPC) & BullMQ Ingestion Workers
│   └── web/          # Next.js Frontend (UI & TRPC Client)
└── packages/
    ├── database/     # Prisma schema, migrations, and db client
    ├── services/     # Core Business Logic (Queues, Extraction, RAG, Qdrant, Auth)
    ├── trpc/         # Shared tRPC routers, API Context, Zod schemas
    ├── logger/       # Shared Winston logging configuration
    └── typescript-config/ 
```

---

## 🧠 Core Architecture & Pipelines

### 1. The Ingestion Pipeline (BullMQ)
Document ingestion is decoupled from the main API thread using a robust BullMQ pipeline. 

1. **Upload**: User uploads a file via pre-signed S3 URL.
2. **Extract Queue**: Downloads the file, parses text based on mimetype (PDF, SRT, VTT, HTML). 
3. **Chunk Queue**: Applies intelligent chunking (sliding window for transcripts, recursive splitting for text/PDFs).
4. **Embed Queue**: Batches chunks, fetches OpenAI embeddings, and indexes them into Qdrant.
5. **OCR Queue** (Images/Scans): Routes image files to an OCR worker before chunking.

### 2. Intelligent ZIP Processing
When a user uploads a `.zip` file (e.g., a codebase or massive dataset):
- The `extract` worker extracts all valid text/code files, skipping unsupported binaries without crashing.
- An **AI Evaluator** (GPT-4o) analyzes the directory tree and file contents.
- It generates a **Repository Summary** and an **Approval Recommendation**.
- The pipeline pauses in a `pending_approval` state.
- The user reviews the AI's recommendation and explicitly approves the dataset in the UI before it is chunked and embedded.
- The repository summary is prepended to every chunk (e.g., `[Leaf Summary: ...]`) to preserve global context for the RAG retriever.

### 3. RAG Retrieval & Guardrails
- **RRF (Reciprocal Rank Fusion)**: Multi-stage retrieval using dense vector search.
- **Context Builder**: Formats the retrieved chunks with citation metadata.
- **Guardrails**: Input and output guardrails to detect prompt injection, PII, and policy violations.

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js** ≥ 18
- **pnpm** ≥ 9
- **Docker** (for running PostgreSQL, Valkey, and Qdrant locally)
- Accounts for **Clerk** (Auth) and **OpenAI** (LLM)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Fill in the necessary keys (specifically `OPENAI_API_KEY`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and S3/Spaces credentials).
Run the setup script to symlink the `.env` across workspaces:
```bash
bash setup.sh
```

### 4. Start Local Infrastructure
Use Docker Compose to spin up Postgres, Valkey (Redis), and Qdrant:
```bash
docker-compose up -d
```

### 5. Setup the Database
Sync the Prisma schema to the database:
```bash
pnpm db:push
```

### 6. Run the Application
Start the Next.js frontend and Express/Worker backend in parallel via Turborepo:
```bash
pnpm dev
```

| Service | Local URL |
|---|---|
| Next.js App | http://localhost:3000 |
| Express API / TRPC | http://localhost:8000/trpc |

---

## 🛠 Useful Commands

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages and apps for production
- `pnpm db:push` - Sync Prisma schema to database (development)
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:studio` - Open Prisma Studio to view the database
