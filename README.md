# The Program

A personal desktop astrology application with Western, Vedic, and Human Design systems and an AI guide who sees your chart as you navigate it.

**No prebuilt binaries are provided.** Build from source — it takes about 5 minutes.

---

## Features

- **Western Astrology** — 15+ house systems, aspects, progressions, solar returns, synastry, composite charts, Human Design Gates overlaid
- **Vedic Astrology** — 16 divisional charts, Vimshottari Dasha, Shadbala, Ashtakavarga, North/South Indian styles, Lahiri and True Chitrapaksha ayanamsa
- **Human Design** — 9 centers, 64 gates, 36 channels, type/strategy/authority, transit body graph
- **AI Guide** — Claude-powered assistant that sees whatever page you're on and reads your chart across all three systems simultaneously
- **3D Cosmic Visualizer** — Real-time solar system with your natal placements, step forward or back through time
- **Tarot & I Ching** — Daily cards, spreads, hexagrams with AI interpretation
- **Numerology & Gematria** — Daily number, life path, full gematria analysis
- **Journal** — Chart-aware journaling connected to transits
- **Studio** — AI-generated custom tarot decks and planet imagery via Gemini
- **PDF Reports** — Professional chart exports
- **Offline-first** — Everything runs locally; internet only needed for AI features

---

## Requirements

- **Node.js** 18+
- **Python** 3.10+
- **npm** 9+

---

## Setup

```bash
git clone https://github.com/pocketkk/TheProgram.git
cd TheProgram
```

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create your `.env`:

```bash
cp .env.example .env
```

Open `.env` and set your secret key:

```bash
# Generate a secure key:
openssl rand -hex 32

# Paste the output as:
SECRET_KEY=<your-generated-key>
```

That's the only required change. Everything else in `.env.example` has working defaults.

### 2. Frontend

```bash
cd ../frontend
npm install
```

### 3. Electron (desktop shell)

```bash
cd ..
npm install
```

---

## Running

Open three terminals:

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

**Terminal 3 — Electron**
```bash
npm run electron:start
```

The app opens as a desktop window. You can also use it in the browser at `http://localhost:3001`.

On first launch you'll be asked to set a password and enter your birth data.

---

## API Keys

API keys are stored in the app's database — not in `.env`. After setup:

1. Open **Settings** in the app
2. Enter your **Anthropic API key** (required for the AI Guide) — get one at [console.anthropic.com](https://console.anthropic.com)
3. Optionally enter a **Google Gemini key** for Studio image generation

The Guide typically costs $1–5/month with normal use.

---

## Project Structure

```
TheProgram/
├── backend/               # Python FastAPI server
│   ├── app/
│   │   ├── api/routes/    # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── core/          # Config, database
│   ├── data/              # SQLite database
│   └── requirements.txt
├── frontend/              # React TypeScript app
│   ├── src/
│   │   ├── features/      # Feature modules
│   │   ├── components/    # Shared UI components
│   │   └── lib/api/       # API clients
│   └── package.json
├── electron/              # Desktop wrapper
│   ├── main.ts
│   └── preload.ts
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron |
| Frontend | React 18, TypeScript, Vite, Three.js |
| Backend | Python 3.10+, FastAPI, SQLAlchemy |
| Database | SQLite (local file) |
| Calculations | Swiss Ephemeris (pyswisseph) |
| AI | Anthropic Claude, Google Gemini |

---

## Testing

```bash
# Backend
cd backend && source venv/bin/activate && pytest

# Frontend
cd frontend && npm run test:run
```

---

## Hosted Option

Don't want to run it yourself? I personally host a small number of instances on solar-powered infrastructure in the Oregon Cascades — $25/month, your own private instance, Guide included, no API key needed. Email [hello@theprogram.us](mailto:hello@theprogram.us).

---

## License

Uses Swiss Ephemeris — AGPL for open source use. Commercial license available from [Astrodienst AG](https://www.astro.com/swisseph/) if needed.
