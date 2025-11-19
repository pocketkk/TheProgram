# Frontend Quick Reference Guide

**Analysis Date:** 2025-11-17  
**Status:** Feature-complete, refinement phase  
**Branch:** `desktop-electron-poc` (Electron POC testing)

---

## At a Glance

| Aspect | Details |
|--------|---------|
| **Framework** | React 18.2.0 + TypeScript 5.3.3 |
| **Build Tool** | Vite 5.0.11 |
| **State Management** | Zustand 4.4.7 |
| **UI Components** | Shadcn/ui + Radix UI |
| **Styling** | TailwindCSS 3.4.1 |
| **3D Graphics** | Three.js + React Three Fiber |
| **Astrological Engine** | astronomy-engine 2.1.19 |
| **Dev Server Port** | 3000 (with HMR) |
| **API Backend** | http://localhost:8000 |

---

## Core Features

### 1. Birth Chart System (Primary)
- **File:** `/features/birthchart/BirthChartPage.tsx` (1,125 lines)
- **Capabilities:**
  - Natal, Transit, and Progressed chart types
  - Interactive zodiac wheel visualization
  - House system (Placidus) display
  - Aspect detection and filtering
  - Pattern recognition (Grand Trine, T-Square, etc.)
  - Element/Modality balance charts (D3.js)
  - PNG/PDF export functionality
  - AI-powered interpretations (Claude API)

### 2. 3D Solar System Visualizer
- **File:** `/features/cosmos/CosmicVisualizerPage.tsx`
- **Capabilities:**
  - Real-time planetary positions (ephemeris)
  - Interactive 3D scene (zoom, rotate)
  - Visibility toggles for all bodies
  - Trail visualization
  - Ecliptic plane footprints
  - Keyboard shortcuts (Shift+M, T, F, arrows)

### 3. Client Management
- **File:** `/features/clients/ClientsPage.tsx`
- **Capabilities:** CRUD operations on client records

### 4. Data Portability
- **File:** `/features/data-portability/BackupDashboard.tsx`
- **Capabilities:**
  - Full backup/restore with conflict resolution
  - Export to JSON, CSV, PDF, ZIP
  - Dry-run validation
  - Automated scheduling

### 5. Authentication (Single-User)
- **Files:** `/features/auth/`
- **Flow:** Setup → Login → Dashboard
- **Token:** JWT stored in `localStorage` as `session_token`
- **Recent Change:** Refactored from multi-user to single-user (Nov 15)

---

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx                    # Main app router
│   ├── features/                  # Feature modules
│   │   ├── auth/                  # Authentication (Login, Setup, Settings)
│   │   ├── birthchart/            # Birth chart tool
│   │   ├── cosmos/                # 3D solar system
│   │   ├── clients/               # Client management
│   │   ├── dashboard/             # Dashboard page
│   │   └── data-portability/      # Backup/export/import
│   ├── components/                # Reusable UI components
│   │   ├── ui/                    # Primitive components (Button, Card, etc.)
│   │   └── layout/                # Layout components (AppLayout, Header, Sidebar)
│   ├── lib/                       # Libraries
│   │   ├── api/                   # API client modules
│   │   ├── astrology/             # Astrological calculations
│   │   └── astronomy/             # Astronomical calculations
│   ├── store/                     # Zustand stores (auth, client, chart)
│   ├── types/                     # TypeScript definitions
│   └── styles/                    # Global styles
├── dist/                          # Build output
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite config
└── index.html                     # HTML entry point
```

---

## Key Technologies & Libraries

### State & Data
- **Zustand** - Lightweight state management
- **Axios** - HTTP client
- **React Hook Form** - Form validation
- **Zod** - Schema validation

### Visualization
- **Three.js** - 3D graphics engine
- **React Three Fiber** - React + Three.js integration
- **D3.js** - 2D data visualization
- **Framer Motion** - Animations

### UI
- **TailwindCSS** - Utility-first CSS
- **Radix UI** - Unstyled accessible components
- **Lucide React** - 300+ SVG icons

### Astrological
- **astronomy-engine** - Precise ephemeris calculations
- Custom libraries in `/lib/astrology/` and `/lib/astronomy/`

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server with HMR
npm run build           # Build for production (tsc + vite)
npm run preview         # Preview production build

# Code Quality
npm run type-check      # TypeScript checking
npm run lint            # ESLint checks
npm run format          # Prettier formatting

# Testing
npm run test            # Run Vitest
npm run test:ui         # Vitest with UI
npm run test:run        # Single run
npm run test:coverage   # Coverage report

# Special
npm run validate-orbits # Validate orbital mechanics
```

---

## Current Issues & Status

### TypeScript Compilation (~70 non-critical errors)
1. **Unused imports/variables** (~40) - Low priority cleanup
2. **Type import violations** (~20) - In data-portability module
3. **Type mismatches** (~8) - Geocoding array indexing

**Impact:** None - all errors are warnings, app functions correctly

### Build Artifacts
- `dist/` folder exists but may be out of date
- Latest build output: minimal (index.html only)
- Needs fresh build before deployment

---

## API Integration

### Backend Connection
- **Base URL:** `http://localhost:8000` (configurable via `VITE_API_URL`)
- **Authentication:** JWT tokens in `Authorization` header
- **Error Handling:** Auto-redirect to login on 401

### API Modules
- `/lib/api/auth.ts` - Authentication
- `/lib/api/clients.ts` - Client CRUD
- `/lib/api/charts.ts` - Chart operations
- `/lib/api/birthData.ts` - Birth data
- `/lib/api/interpretations.ts` - AI interpretations
- `/lib/api/backup.ts` - Backups
- `/lib/api/export.ts` - Data export
- `/lib/api/import.ts` - Data import

---

## Performance & Optimization

### Code Splitting (Vite)
- `react-vendor` - React libraries
- `router` - TanStack Router
- `query` - React Query
- `ui` - Animations + Icons
- `d3` - D3.js

### Asset Strategies
- SVG charts (vector, scalable)
- Three.js LOD system for 3D
- CSS tree-shaking via Tailwind
- Lazy-loaded dialogs/modals

### Bundle Size Notes
- Three.js: ~500KB
- D3.js: ~200KB
- Mitigated by code splitting + gzip compression

---

## Configuration

### Environment Variables
```bash
# .env
VITE_API_URL=http://localhost:8000  # Backend URL
```

### TypeScript Paths
```
@ → src/
@/components → src/components/
@/features → src/features/
@/lib → src/lib/
@/store → src/store/
@/types → src/types/
@/styles → src/styles/
@/assets → src/assets/
```

### Docker Support
- ✓ Configured with polling for file watching
- ✓ Server binding: 0.0.0.0 (external connections)
- ✓ Can run in containerized environment

---

## Recent Changes (Nov 2025)

1. **Electron POC** (Nov 16)
   - Proof of concept for desktop application
   - Files: `/electron/main.ts`, `/python-manager.ts`

2. **Auth Refactoring** (Nov 15)
   - Converted: Multi-user → Single-user
   - Removed: Email-based login, user accounts
   - Added: Simple password setup

3. **Data Portability** (Nov 16)
   - Complete backup/restore system
   - Conflict detection and resolution
   - Multiple export formats

4. **Chart Interpretations** (Recent)
   - AI-powered readings via Claude API
   - Cached in InterpretationsContext

---

## Common Tasks

### Running the App
```bash
# Terminal 1: Backend
cd ../backend
python run.py

# Terminal 2: Frontend
npm run dev
# Visit http://localhost:3000
```

### Building for Production
```bash
npm run build
# Output in dist/ folder
```

### Fixing TypeScript Errors
```bash
# Run checker first
npm run type-check

# Then auto-fix with ESLint
npm run lint

# Format code
npm run format
```

### Testing
```bash
# Development mode (watch)
npm run test

# Single run
npm run test:run

# With coverage
npm run test:coverage
```

---

## Next Steps for Development

1. **Fix TypeScript warnings** before production
2. **Migrate to TanStack Router** (already installed)
3. **Add unit/integration tests** (Vitest ready)
4. **Complete test coverage**
5. **Consider PWA features** (offline support)
6. **Electron integration** (POC in progress)

---

## Resources

- **Full Analysis:** `FRONTEND_ANALYSIS_REPORT.md`
- **Auth Details:** `AUTHENTICATION_SUMMARY.md`
- **Recent Features:** `AUTHENTICATION_REFACTORING_REPORT.md`
- **Electron POC:** `ELECTRON_POC.md`
- **Data Portability:** `TASK_209_FRONTEND_BACKUP_UI_COMPLETE.md`

---

**Status:** Ready for development and testing  
**Last Updated:** 2025-11-17
