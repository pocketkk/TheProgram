# The Program - Desktop Astrology Application

A professional desktop astrology application for personal chart analysis, featuring Western (Tropical), Vedic (Jyotish), and Human Design systems.

## Overview

**The Program** is an Electron-based desktop app with a Python/FastAPI backend and React/TypeScript frontend. All data is stored locally in SQLite.

**Version**: 1.0.0
**Platforms**: Linux, Windows, macOS

## Download

Get the latest release from [GitHub Releases](https://github.com/pocketkk/TheProgram/releases):

| Platform | Download |
|----------|----------|
| **Linux** | `.AppImage` (universal) or `.deb` (Debian/Ubuntu) |
| **Windows** | `.exe` installer |
| **macOS** | `.dmg` (Apple Silicon) |

> **Note**: macOS users may need to right-click → Open the first time (unsigned app).

## Features

- **Western Astrology**: 15+ house systems, aspects, progressions, returns, synastry, composites
- **Vedic Astrology**: 16 divisional charts, Vimshottari Dasha, Shadbala, Ashtakavarga
- **Human Design**: 9 centers, 64 gates, 36 channels, type/strategy/authority
- **AI Interpretations**: Claude AI integration for personalized readings
- **3D Cosmic Visualizer**: Real-time solar system visualization
- **PDF Reports**: Professional chart exports
- **Offline-First**: Works without internet (except AI features)

## Quick Start

### Install from Release

Download from [Releases](https://github.com/pocketkk/TheProgram/releases), then:

- **Linux AppImage**: `chmod +x *.AppImage && ./The\ Program-*.AppImage`
- **Linux .deb**: `sudo dpkg -i theprogram_*.deb`
- **Windows**: Run the `.exe` installer
- **macOS**: Open the `.dmg`, drag to Applications, right-click → Open first time

### Development Setup

**Prerequisites:**
- Node.js 18+
- Python 3.10+

```bash
# 1. Clone and install
git clone <repo-url>
cd TheProgram

# 2. Backend setup
cd backend
python -m venv test_venv
source test_venv/bin/activate
pip install -r requirements.txt

# 3. Frontend setup
cd ../frontend
npm install

# 4. Root electron deps
cd ..
npm install
```

### Running in Development

**Option A: Three terminals**
```bash
# Terminal 1: Backend
cd backend && source test_venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend (Vite dev server)
cd frontend && npm run dev

# Terminal 3: Electron
npm run electron:start
```

**Option B: All-in-one** (if configured)
```bash
npm run dev:all
```

### Building for Distribution

```bash
# Build everything and package
npm run dist

# Or step by step:
npm run build:frontend    # Build React app
npm run build:backend     # Bundle Python with PyInstaller
npm run build:electron    # Compile Electron TypeScript
npm run dist:linux        # Create AppImage and .deb
```

Output appears in `release/`.

## Project Structure

```
TheProgram/
├── backend/           # Python FastAPI server
│   ├── app/           # Application code
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, database
│   │   ├── models_sqlite/  # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # Business logic
│   ├── data/          # SQLite database
│   └── requirements.txt
│
├── frontend/          # React TypeScript app
│   ├── src/
│   │   ├── components/
│   │   ├── features/  # Feature modules
│   │   ├── lib/       # API clients, utilities
│   │   └── types/
│   └── package.json
│
├── electron/          # Desktop wrapper
│   ├── main.ts        # Main process
│   ├── preload.ts     # Preload script
│   └── python-manager.ts  # Backend subprocess manager
│
├── release/           # Built packages
├── build/             # App icons
└── package.json       # Electron build config
```

## Configuration

Create `backend/.env`:
```bash
SECRET_KEY=your-random-secret-key
ANTHROPIC_API_KEY=sk-ant-...  # Optional, for AI features
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Desktop Shell | Electron |
| Frontend | React 18, TypeScript, Vite, Three.js |
| Backend | Python 3.10+, FastAPI, SQLAlchemy |
| Database | SQLite |
| Calculations | Swiss Ephemeris |
| AI | Anthropic Claude |

## Testing

```bash
# Frontend tests
cd frontend && npm run test:run

# Backend tests
cd backend && source test_venv/bin/activate && pytest
```

## License

Uses Swiss Ephemeris (AGPL for open source, commercial license available from Astrodienst AG).

## Data Storage

All data stored locally:
- **Development**: `backend/data/app.db`
- **Packaged App**: `~/.config/theprogram/data/theprogram.db`
