<div align="center">
  <br />
  <a href="https://dox.sud-o.app">
    <img src="./apps/web/public/dox.svg" alt="Dox Logo" width="120" />
  </a>
  <br />
  
  <h1>Dox</h1>
  <p><b><a href="https://dox.sud-o.app">dox.sud-o.app</a></b></p>

  <img src="https://readme-typing-svg.herokuapp.com?font=Inter&weight=500&size=20&pause=1000&color=144637&center=true&vCenter=true&width=600&lines=The+Intelligent+Knowledge+Workspace;Semantic+Search+for+Your+Documents;Built+for+Speed+and+Clarity" alt="Typing SVG" />
  
  <p>
    <b>Transform your scattered documents into a cohesive, instantly searchable semantic engine.</b>
  </p>

  <p>
    <a href="https://dox.sud-o.app"><img src="https://img.shields.io/badge/Live_Preview-dox.sud--o.app-144637?style=for-the-badge&logo=vercel" alt="Live Demo" /></a>
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/tRPC-2596BE?style=for-the-badge&logo=trpc&logoColor=white" alt="tRPC" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  </p>
</div>

<br />

## About Dox

Dox is a premium knowledge management workspace designed for modern engineering and research teams. Built with exceptional attention to detail, Dox allows you to upload PDFs, text files, and web links, and instantly synthesizes them into an intelligent, conversational interface. 

Rather than relying on basic keyword matching, Dox utilizes state-of-the-art vector embeddings to understand the semantic intent behind your queries. We built Dox for absolute speed, clarity, and reliability.

## Features

* **Intelligent Semantic Search:** Converse with your documents in natural language. Our custom chunking and embedding pipelines ensure highly accurate context retrieval.
* **Premium User Experience:** A meticulously crafted, responsive interface featuring dynamic loading states, asymptotic progress curves, and seamless dark mode support.
* **Real-time Processing:** Upload large documents and watch as background workers extract, chunk, and index your knowledge in seconds.
* **Modular Workspaces (Leafs):** Isolate contexts into separate 'Leafs', allowing specialized AI interactions for different projects or domains.
* **Scalable Architecture:** Engineered with a robust monorepo structure, separating the Next.js frontend, Node.js background workers, and PostgreSQL/Prisma database layers.

## Technology Stack

Dox relies on a cutting-edge, type-safe ecosystem:

* **Frontend:** Next.js (App Router), React, Tailwind CSS v4, Framer Motion
* **Backend:** Node.js, tRPC, Prisma ORM
* **Data Storage:** PostgreSQL (Relational), Qdrant (Vector Database), Valkey/Redis (Queueing)
* **Infrastructure:** DigitalOcean Spaces (S3-compatible blob storage), Docker, Turborepo

## System Architecture

<div align="center">
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NextJS-Dark.svg" width="48" alt="Next.js" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TypeScript.svg" width="48" alt="TypeScript" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/TailwindCSS-Dark.svg" width="48" alt="Tailwind CSS" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NodeJS-Dark.svg" width="48" alt="Node.js" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/PostgreSQL-Dark.svg" width="48" alt="PostgreSQL" />
  <img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/Docker.svg" width="48" alt="Docker" />
</div>

<br />

## Getting Started

To run the Dox environment locally, you will need Node.js, pnpm, and Docker installed on your machine.

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/dox.git
   cd dox
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment**
   Copy the example environment files and fill in your necessary API keys (OpenAI, Clerk, DigitalOcean Spaces).
   ```bash
   cp .env.example .env
   ```

4. **Start Infrastructure**
   Launch the required databases (PostgreSQL, Qdrant, Valkey) using Docker Compose.
   ```bash
   docker compose up -d
   ```

5. **Run the Development Server**
   Start the Turborepo development pipeline.
   ```bash
   pnpm dev
   ```

Visit `http://localhost:3000` to interact with your local instance.

## Deployment

Dox is fully containerized for production deployment. The repository includes `docker-compose.prod.yml` and highly optimized, multi-stage Dockerfiles for both the API workers and the Next.js web client.

For a live demonstration of the production environment, visit [dox.sud-o.app](https://dox.sud-o.app).

---

<div align="center">
  <i>Engineered for clarity. Built for the future.</i>
</div>
