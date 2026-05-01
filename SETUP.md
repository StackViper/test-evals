# HealosBench - Setup & Execution Guide

This guide provides step-by-step instructions for running the HealosBench application locally, including setting up the database via Docker, configuring environment variables, and running the evaluation suite.

## Prerequisites
- [Bun](https://bun.sh/) (v1.x or later)
- [Docker](https://www.docker.com/) & Docker Compose
- Node.js (for some tooling fallback)

---

## 1. Environment Setup

First, copy the example environment files into their actual `.env` files.

**Backend Server:**
```bash
cp apps/server/.env.example apps/server/.env
```
Open `apps/server/.env` and insert your API keys:
- Add your `GEMINI_API_KEY` (ensure the key is generated from a project with active billing).
- Optionally add your `ANTHROPIC_API_KEY` if you plan to switch the strategy extractor to Claude.

**Frontend Web:**
```bash
cp apps/web/.env.example apps/web/.env
```

---

## 2. Database Setup (Docker)

The application uses PostgreSQL to store evaluation runs and results. A `docker-compose.yml` file is provided to quickly spin this up.

1. Start the PostgreSQL container in the background:
```bash
docker-compose up -d
```
*(Note: It runs on port `5433` by default to avoid conflicting with existing local Postgres installations. The default `DATABASE_URL` in your `.env` already maps to this).*

2. Push the Drizzle ORM schema to the database:
```bash
bun run db:push
```

---

## 3. Install Dependencies & Build

Install all monorepo dependencies and run a clean typecheck/build.

```bash
bun install
bun run build
```

---

## 4. Running the Application

To run both the Next.js Frontend (port 3001) and the Hono Backend (port 8000) simultaneously in development mode:

```bash
bun run dev
```
You can now access the interactive dashboard at **http://localhost:3001/dashboard** to trigger runs and view results.

---

## 5. Running CLI Evaluations

You can also run the evaluation suite directly from your terminal using the built-in CLI command. This is useful for CI environments or quick testing.

Open a **new terminal window** (while `bun run dev` is running) and execute:

```bash
bun run eval -- --strategy=zero_shot
```

You can change the strategy flag to `--strategy=few_shot` or `--strategy=cot` to test different prompt engineering configurations.

---

## Troubleshooting
- **Zero Scores / 429 Too Many Requests**: If the LLM extraction returns 0% for all fields, your API key is likely hitting free-tier limits. Ensure your Google AI Studio project has an active "Postpay" billing account linked, or switch the model string in `extractor.ts` to `gemini-flash-latest`.
- **Database Connection Errors**: Ensure Docker is running and the `docker-compose up -d` command executed successfully.
