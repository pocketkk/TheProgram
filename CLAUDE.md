# CLAUDE.md - The Program

Instructions for Claude Code when working on this project.

## Project Identity

**The Program** is a desktop astrology application built with Electron, featuring Western, Vedic, and Human Design systems with AI-powered interpretations.

- **Architecture**: Single-user desktop app (not SaaS)
- **Target**: Shareable product for practitioners and enthusiasts
- **Status**: Functional, actively developed

## Decision Principles

1. **Quality over velocity** - Write maintainable, well-tested code
2. **Follow existing patterns** - Don't invent new approaches; extend what exists
3. **YAGNI** - Don't over-engineer; solve the current problem
4. **Offline-first** - Internet only required for AI features

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand (UI), TanStack Query (server) |
| Styling | Tailwind CSS |
| Backend | Python 3.10+, FastAPI, SQLAlchemy |
| Database | SQLite (local file) |
| Calculations | Swiss Ephemeris (pyswisseph) |
| AI | Anthropic Claude, Google Gemini (image generation) |

## Project Structure

```
TheProgram/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── core/            # Config, database
│   │   └── utils/           # Helpers, ephemeris
│   ├── tests/
│   └── data/                # SQLite database
├── frontend/
│   ├── src/
│   │   ├── features/        # Feature modules
│   │   ├── components/      # Shared components
│   │   ├── lib/api/         # API clients
│   │   ├── store/           # Global stores
│   │   └── types/           # TypeScript types
│   └── package.json
├── electron/                # Desktop wrapper
└── package.json             # Root (Electron build)
```

## Key Conventions

### Backend

**Adding an API endpoint:**
1. Create/update route in `backend/app/api/routes/`
2. Add service logic in `backend/app/services/`
3. Define schemas in `backend/app/schemas/`
4. Register route in `backend/app/api/routes/__init__.py`

**Patterns:**
- Routes are thin controllers; logic goes in services
- Use `Depends(get_db)` for database sessions
- Three schema types: `EntityCreate`, `EntityUpdate`, `EntityResponse`
- Models use `UUIDMixin` and `TimestampMixin`

### Frontend

**Adding a feature:**
1. Create directory `frontend/src/features/[feature-name]/`
2. Structure:
   ```
   [feature-name]/
   ├── [FeatureName]Page.tsx
   ├── components/
   ├── hooks/
   ├── stores/
   └── types/
   ```
3. Add route in `App.tsx`

**Patterns:**
- Feature-specific state: Zustand store in `features/[name]/stores/`
- Server state: TanStack Query in hooks
- API calls: `frontend/src/lib/api/[resource].ts`
- Shared UI: `frontend/src/components/ui/`

### Testing

**Backend:**
```bash
cd backend && source test_venv/bin/activate && pytest
```

**Frontend:**
```bash
cd frontend && npm run test:run
```

## Common Tasks

### Run Development

```bash
# Backend (Terminal 1)
cd backend && source test_venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (Terminal 2)
cd frontend && npm run dev

# Electron (Terminal 3)
npm run electron:start
```

### Build for Distribution

```bash
# Automated build (recommended) - auto-detects OS
./scripts/build-release.sh              # Builds for current platform
./scripts/build-release.sh --linux      # Force Linux build
./scripts/build-release.sh --mac        # macOS build (requires macOS)

# Platform-specific builds
npm run release:mac                     # macOS: DMG + ZIP (requires macOS)
npm run release:linux                   # Linux: AppImage + deb

# macOS options
./scripts/build-mac.sh --no-sign        # Skip code signing
./scripts/build-mac.sh --arch arm64     # Build for Apple Silicon only
./scripts/build-mac.sh --universal      # Build universal binary

# Auto-build on commit: Add [build] tag to commit message
git commit -m "Your message [build]"    # Triggers post-commit hook
```

**macOS Code Signing** (optional, recommended for distribution):
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password
./scripts/build-mac.sh
```

### Reset for Testing

```bash
./scripts/reset-user-data.sh  # Clears all app data + kills backend on port 8000
```

### Database Migrations

```bash
cd backend && source test_venv/bin/activate
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### GitHub CLI

When using `gh` commands (e.g., creating PRs), unset GITHUB_TOKEN first:
```bash
unset GITHUB_TOKEN && gh pr create --title "..." --body "..." --base main
```

The GITHUB_TOKEN environment variable interferes with gh's own authentication.

## What NOT To Do

- **Don't add user_id** - This is a single-user app
- **Don't use PostgreSQL features** - SQLite only (TEXT for UUIDs, no arrays)
- **Don't create new state patterns** - Use Zustand for UI, TanStack Query for server
- **Don't add multi-tenancy** - No tenant isolation needed
- **Don't skip tests** - Backend needs pytest, frontend needs Vitest

## Astrological Systems

| System | Status | Key Files |
|--------|--------|-----------|
| Western | Complete | `chart_calculator.py`, `BirthChartPage.tsx` |
| Vedic | Complete | `vedic_calculator.py`, `VedicPage.tsx` |
| Human Design | Complete | `human_design_calculator.py`, `HumanDesignPage.tsx` |
| Transits | Complete | `transit_calculator.py`, `TransitDashboard.tsx` |
| AI Interpret | Complete | `ai_interpreter.py`, `useChartInterpretations.ts` |
| Studio | Complete | `gemini_image_service.py`, `StudioPage.tsx` |

## Studio Feature

The Studio provides AI-powered image generation for custom tarot decks and planet sets using Google Gemini.

**Architecture:**
- **Prompt Domains**: Subject (what), Style (art rendering), Frame (border/composition) - assembled at generation time
- **Collections**: Decks (78 tarot cards) and Sets (15 celestial bodies) with shared style settings
- **Generation**: WebSocket-based batch generation with real-time progress
- **Refinement**: Individual image regeneration with prompt editing

**Key Files:**
- Backend: `gemini_image_service.py`, `image_storage_service.py`, `images.py`, `image_ws.py`
- Frontend: `features/tarot-generator/`, `features/planet-generator/`, `features/studio/`
- API: `lib/api/images.ts`

## Current Focus

_Updated as work progresses_

- Guide agent with screenshot capability for visual chart assistance
- Automated build pipeline with `[build]` commit tag triggers

---

**See also:**
- `docs/ARCHITECTURE_DECISIONS.md` - Why decisions were made
- `docs/ROADMAP.md` - Future direction
- `docs/architecture/TECHNICAL_ARCHITECTURE.md` - Detailed architecture
