# PromptVault

A personal LLM prompt library with execution tracking and a usage dashboard.

Save prompts, run them against Groq or OpenRouter, and track every execution — latency, token counts, costs — in one place.

## Stack

- **Backend:** Django 5 + Django REST Framework + PostgreSQL + SimpleJWT
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS
- **LLM Providers:** Groq, OpenRouter (both free tier, OpenAI-compatible)
- **Infra:** Docker Compose + GitHub Actions CI

## Architecture

See [removed files] for a full phase-by-phase build plan.

```mermaid
graph LR
    UI[React SPA] -->|JWT| API[Django API]
    API --> DB[(PostgreSQL)]
    API -->|httpx async| Groq
    API -->|httpx async| OpenRouter
```

PromptVault is intentionally a **monolith**. One Django project, one database, one React SPA. The scope (single user, one bounded context) does not justify distributed complexity.
