# Architecture Decision Records

This document captures key architectural decisions for The Program, explaining the context and rationale behind each choice.

---

## ADR-001: Single-User Desktop Architecture

**Status:** Accepted (November 2024)

**Context:**
The project was originally designed as a multi-user SaaS application with PostgreSQL, user authentication, and cloud deployment. However, the primary use case is personal astrology work, not serving multiple customers.

**Decision:**
Pivot to a single-user Electron desktop application.

**Rationale:**
- Simpler distribution (no server infrastructure)
- Offline-first experience (works without internet)
- No ongoing hosting costs
- User owns their data locally
- Faster startup and response times

**Implications:**
- No `user_id` in database queries
- SQLite instead of PostgreSQL
- Session authentication simplified (optional password)
- All data stored in `~/.config/theprogram/`

---

## ADR-002: SQLite Over PostgreSQL

**Status:** Accepted (November 2024)

**Context:**
The original design used PostgreSQL for its JSONB support, PostGIS potential, and scalability. After deciding on desktop deployment, these features became unnecessary overhead.

**Decision:**
Migrate to SQLite for local data storage.

**Rationale:**
- Zero configuration (embedded database)
- Single file backup/restore
- No separate process to manage
- Sufficient for single-user workloads
- Portable with the application

**Implications:**
- UUIDs stored as TEXT (not native UUID type)
- No array columns (use JSON instead)
- Simpler migration path with Alembic
- Database file at `backend/data/theprogram.db` (dev) or `~/.config/theprogram/data/theprogram.db` (prod)

---

## ADR-003: Feature Module Organization

**Status:** Accepted (October 2024)

**Context:**
React applications can organize code by type (all components together, all hooks together) or by feature (each feature contains its own components, hooks, etc.).

**Decision:**
Use feature-based organization in `frontend/src/features/`.

**Rationale:**
- Each feature is self-contained and cohesive
- Easy to understand the scope of changes
- Reduces cross-feature coupling
- Scales well as features grow
- Clear ownership boundaries

**Structure:**
```
features/[name]/
├── [Name]Page.tsx      # Main page component
├── components/         # Feature-specific components
├── hooks/              # Custom hooks
├── stores/             # Zustand stores
├── contexts/           # React contexts
├── types/              # TypeScript types
└── utils/              # Utilities
```

---

## ADR-004: Zustand + TanStack Query for State

**Status:** Accepted (October 2024)

**Context:**
State management in React has many options: Redux, MobX, Zustand, Jotai, Context API, etc. Server state has additional complexity with caching, refetching, and synchronization.

**Decision:**
Use Zustand for UI state and TanStack Query for server state.

**Rationale:**
- **Zustand**: Minimal boilerplate, TypeScript-friendly, no providers needed
- **TanStack Query**: Handles caching, refetching, loading states automatically
- Clear separation: Zustand for UI concerns, Query for API data
- Both are lightweight compared to Redux

**Patterns:**
- Feature stores in `features/[name]/stores/`
- Global stores in `src/store/`
- Query hooks in `features/[name]/hooks/`

---

## ADR-005: Electron with Python Subprocess

**Status:** Accepted (November 2024)

**Context:**
The backend is written in Python (FastAPI) for Swiss Ephemeris integration. Need to package this with the Electron frontend for desktop distribution.

**Decision:**
Bundle Python backend as a compiled executable that Electron spawns as a subprocess.

**Rationale:**
- Python ecosystem has the best astrology libraries (Swiss Ephemeris)
- PyInstaller creates standalone executables
- Subprocess model keeps frontend/backend cleanly separated
- Communication via localhost HTTP (simple, debuggable)
- Graceful shutdown via tree-kill

**Implementation:**
- `electron/python-manager.ts` handles subprocess lifecycle
- Backend compiled with PyInstaller to `backend/dist/backend`
- Electron waits for "Uvicorn running" before loading UI
- All IPC via `http://localhost:8000`

---

## ADR-006: Swiss Ephemeris for Calculations

**Status:** Accepted (October 2024)

**Context:**
Astrological calculations require precise planetary positions. Options include NASA JPL ephemeris, Swiss Ephemeris, or online APIs.

**Decision:**
Use Swiss Ephemeris via pyswisseph Python bindings.

**Rationale:**
- Industry standard for astrological software
- High precision (sub-arcsecond accuracy)
- Offline calculation (no API calls)
- Supports all required calculations (planets, houses, aspects)
- Open source with permissive licensing for open-source projects

**Implementation:**
- Wrapper in `backend/app/utils/ephemeris.py`
- Ephemeris data files in `backend/ephe/`
- All calculations in UTC, converted for display

---

## ADR-007: Multi-System Astrology Support

**Status:** Accepted (October 2024)

**Context:**
Astrology has multiple traditions: Western (Tropical), Vedic (Sidereal/Jyotish), and Human Design. Each has different calculation methods and interpretive frameworks.

**Decision:**
Support all three major systems with isolated calculation services.

**Rationale:**
- Different users prefer different systems
- Systems have fundamentally different zodiac references
- Separation prevents cross-contamination of logic
- Enables comparative analysis

**Implementation:**
- `chart_calculator.py` - Western (Tropical zodiac)
- `vedic_calculator.py` - Vedic (Sidereal zodiac, ayanamsa)
- `human_design_calculator.py` - Human Design (88° Sun offset)
- Each has dedicated frontend feature module

---

## ADR-008: AI Integration via Anthropic Claude

**Status:** Accepted (November 2024)

**Context:**
Chart interpretation is complex and traditionally requires extensive delineation databases. AI can provide dynamic, personalized interpretations.

**Decision:**
Integrate Claude API for AI-powered interpretations.

**Rationale:**
- High-quality natural language generation
- Understands astrological context with proper prompting
- Can synthesize multiple factors (not just lookup tables)
- Streaming responses for better UX

**Implementation:**
- `backend/app/services/ai_interpreter.py`
- Requires `ANTHROPIC_API_KEY` in environment
- Graceful degradation when offline
- Caches interpretations to reduce API costs

**Trade-offs:**
- Requires internet for AI features
- API costs (mitigated by caching)
- Response quality depends on prompt engineering

---

## Template for New ADRs

```markdown
## ADR-XXX: [Title]

**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
[What is the issue or requirement driving this decision?]

**Decision:**
[What was decided?]

**Rationale:**
[Why was this decision made? What alternatives were considered?]

**Implications:**
[What are the consequences of this decision?]
```
