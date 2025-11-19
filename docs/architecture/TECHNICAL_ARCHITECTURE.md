# Technical Architecture - The Program

## System Overview

The Program is built as a modern three-tier web application with a clear separation between the presentation layer (React frontend), business logic layer (FastAPI backend), and data layer (PostgreSQL database).

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     React + TypeScript Frontend (SPA)                 │  │
│  │  • Chart Rendering (D3.js/SVG)                        │  │
│  │  • User Interface Components                          │  │
│  │  • State Management (Redux/Zustand)                   │  │
│  │  • API Client Services                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS/REST API
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │       FastAPI Backend (Python)                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  API Routes (REST Endpoints)                    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Business Logic Services                        │  │  │
│  │  │  • Chart Calculation Service                    │  │  │
│  │  │  • Transit Analysis Service                     │  │  │
│  │  │  • Dasha Calculation Service                    │  │  │
│  │  │  • Human Design Service                         │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Calculation Engine                             │  │  │
│  │  │  • Swiss Ephemeris (pyswisseph)                 │  │  │
│  │  │  • Astronomical Algorithms                      │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL/ORM
┌─────────────────────────────────────────────────────────────┐
│                         DATA LAYER                           │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   PostgreSQL     │  │    Redis     │  │  File Storage│  │
│  │  (Primary DB)    │  │   (Cache)    │  │  (Reports)   │  │
│  └──────────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Framework: FastAPI

**Why FastAPI?**
- High performance (comparable to NodeJS and Go)
- Automatic API documentation (Swagger/OpenAPI)
- Built-in data validation (Pydantic)
- Async support for concurrent requests
- Type hints for better IDE support
- Easy integration with Python ecosystem (Swiss Ephemeris)

### Directory Structure

```
backend/
├── app/
│   ├── main.py                 # Application entry point
│   ├── __init__.py
│   │
│   ├── api/                    # API route handlers
│   │   ├── __init__.py
│   │   ├── deps.py            # Shared dependencies (auth, etc.)
│   │   ├── auth.py            # Authentication endpoints
│   │   ├── clients.py         # Client management endpoints
│   │   ├── charts.py          # Chart calculation endpoints
│   │   ├── transits.py        # Transit analysis endpoints
│   │   ├── reports.py         # Report generation endpoints
│   │   └── preferences.py     # User preferences endpoints
│   │
│   ├── core/                   # Core configuration
│   │   ├── __init__.py
│   │   ├── config.py          # Settings and environment variables
│   │   ├── security.py        # JWT, password hashing
│   │   └── database.py        # Database connection setup
│   │
│   ├── models/                 # Database models (SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── user.py            # User model
│   │   ├── client.py          # Client model
│   │   ├── birth_data.py      # Birth data model
│   │   ├── chart.py           # Chart model
│   │   └── interpretation.py  # Interpretation model
│   │
│   ├── schemas/                # Pydantic schemas (validation)
│   │   ├── __init__.py
│   │   ├── user.py            # User input/output schemas
│   │   ├── chart.py           # Chart input/output schemas
│   │   ├── birth_data.py      # Birth data schemas
│   │   └── transit.py         # Transit request/response schemas
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── chart_calculation.py    # Core chart calculations
│   │   ├── western_astrology.py    # Western-specific logic
│   │   ├── vedic_astrology.py      # Vedic-specific logic
│   │   ├── human_design.py         # Human Design logic
│   │   ├── transit_analysis.py     # Transit calculations
│   │   ├── dasha_calculation.py    # Dasha period calculations
│   │   ├── aspect_analysis.py      # Aspect detection & patterns
│   │   ├── report_generator.py     # PDF report generation
│   │   └── atlas_service.py        # Location/timezone lookup
│   │
│   └── utils/                  # Utility functions
│       ├── __init__.py
│       ├── ephemeris.py       # Swiss Ephemeris wrappers
│       ├── timezone_utils.py  # Timezone conversions
│       ├── validators.py      # Custom validators
│       └── helpers.py         # General helper functions
│
├── tests/                      # Test suite
│   ├── __init__.py
│   ├── conftest.py            # Pytest configuration
│   ├── test_api/              # API endpoint tests
│   ├── test_services/         # Service layer tests
│   └── test_utils/            # Utility function tests
│
├── alembic/                    # Database migrations
│   ├── versions/              # Migration scripts
│   └── env.py                 # Alembic configuration
│
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── .env                       # Environment variables (not in git)
└── README.md                  # Backend documentation
```

### Key Components

#### 1. API Layer (`app/api/`)
- **Responsibility**: Handle HTTP requests, validate input, call services, return responses
- **Pattern**: Thin controllers, delegate business logic to services
- **Authentication**: JWT-based authentication middleware
- **Validation**: Automatic via Pydantic schemas

**Example Endpoint Structure:**
```python
# app/api/charts.py
from fastapi import APIRouter, Depends
from app.schemas.chart import ChartRequest, ChartResponse
from app.services.chart_calculation import ChartCalculationService

router = APIRouter()

@router.post("/charts/natal", response_model=ChartResponse)
async def calculate_natal_chart(
    chart_request: ChartRequest,
    current_user: User = Depends(get_current_user)
):
    """Calculate natal chart from birth data"""
    service = ChartCalculationService()
    chart = await service.calculate_natal_chart(chart_request)
    return chart
```

#### 2. Service Layer (`app/services/`)
- **Responsibility**: Business logic, calculations, orchestration
- **Pattern**: Service classes with focused responsibilities
- **Separation**: Western, Vedic, and Human Design in separate modules

**Example Service:**
```python
# app/services/chart_calculation.py
import swisseph as swe
from app.schemas.chart import ChartRequest, ChartData

class ChartCalculationService:
    def __init__(self):
        swe.set_ephe_path('/path/to/ephemeris')

    async def calculate_natal_chart(self, request: ChartRequest) -> ChartData:
        # Convert birth time to Julian Day
        jd = self._calculate_julian_day(request.birth_date, request.birth_time)

        # Calculate planetary positions
        planets = self._calculate_planets(jd)

        # Calculate house cusps
        houses = self._calculate_houses(jd, request.latitude, request.longitude)

        # Calculate aspects
        aspects = self._calculate_aspects(planets)

        return ChartData(planets=planets, houses=houses, aspects=aspects)
```

#### 3. Model Layer (`app/models/`)
- **Responsibility**: Database table definitions
- **ORM**: SQLAlchemy for database interactions
- **Relationships**: Defined between related tables

**Example Model:**
```python
# app/models/chart.py
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class Chart(Base):
    __tablename__ = "charts"

    chart_id = Column(UUID(as_uuid=True), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"))
    birth_data_id = Column(UUID(as_uuid=True), ForeignKey("birth_data.birth_data_id"))
    chart_type = Column(String(50), nullable=False)
    chart_data = Column(JSON, nullable=False)  # Stores calculated chart
    created_at = Column(DateTime, nullable=False)
```

#### 4. Schema Layer (`app/schemas/`)
- **Responsibility**: Input validation and output serialization
- **Library**: Pydantic for data validation
- **Benefits**: Automatic validation, type checking, OpenAPI docs

**Example Schema:**
```python
# app/schemas/chart.py
from pydantic import BaseModel, validator
from datetime import date, time
from typing import Optional

class ChartRequest(BaseModel):
    name: str
    birth_date: date
    birth_time: Optional[time]
    latitude: float
    longitude: float
    timezone: str
    house_system: str = "placidus"

    @validator('latitude')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v
```

---

## Frontend Architecture

### Framework: React + TypeScript

**Why React + TypeScript?**
- Component-based architecture for reusable UI
- Large ecosystem and community support
- Virtual DOM for efficient rendering
- TypeScript for type safety and better developer experience
- Strong tooling (Vite, ESLint, Prettier)

### Directory Structure

```
frontend/
├── public/                     # Static files
│   ├── index.html
│   └── favicon.ico
│
├── src/
│   ├── main.tsx               # Application entry point
│   ├── App.tsx                # Root component
│   │
│   ├── components/            # Reusable components
│   │   ├── charts/
│   │   │   ├── WesternChartWheel.tsx
│   │   │   ├── VedicChartDisplay.tsx
│   │   │   ├── HumanDesignBodygraph.tsx
│   │   │   ├── AspectGrid.tsx
│   │   │   └── MultiWheel.tsx
│   │   │
│   │   ├── forms/
│   │   │   ├── BirthDataForm.tsx
│   │   │   ├── ChartOptionsPanel.tsx
│   │   │   └── ClientForm.tsx
│   │   │
│   │   ├── ui/                # Generic UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── DateTimePicker.tsx
│   │   │
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── Footer.tsx
│   │
│   ├── pages/                 # Page components (routes)
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ChartPage.tsx
│   │   ├── ClientsPage.tsx
│   │   ├── TransitsPage.tsx
│   │   └── SettingsPage.tsx
│   │
│   ├── services/              # API client services
│   │   ├── api.ts             # Axios instance configuration
│   │   ├── authService.ts     # Authentication API calls
│   │   ├── chartService.ts    # Chart calculation API calls
│   │   ├── clientService.ts   # Client management API calls
│   │   └── atlasService.ts    # Location lookup API calls
│   │
│   ├── store/                 # State management (Redux/Zustand)
│   │   ├── index.ts           # Store configuration
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── chartSlice.ts
│   │   │   └── uiSlice.ts
│   │   └── hooks.ts           # Typed Redux hooks
│   │
│   ├── types/                 # TypeScript type definitions
│   │   ├── chart.ts
│   │   ├── client.ts
│   │   ├── user.ts
│   │   └── api.ts
│   │
│   ├── utils/                 # Utility functions
│   │   ├── chartRendering.ts  # Chart drawing helpers
│   │   ├── dateUtils.ts       # Date/time utilities
│   │   ├── validators.ts      # Form validation
│   │   └── formatters.ts      # Data formatting
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useChart.ts
│   │   ├── useAuth.ts
│   │   └── useDebounce.ts
│   │
│   ├── assets/                # Static assets
│   │   ├── images/
│   │   ├── fonts/
│   │   └── icons/
│   │
│   └── styles/                # Global styles
│       ├── index.css
│       └── themes.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

### Key Components

#### 1. Chart Rendering Components

**Western Chart Wheel (`WesternChartWheel.tsx`)**:
- Uses D3.js or custom SVG for circular chart rendering
- Configurable house systems
- Interactive elements (hover, click)
- Aspect lines with color coding

**Vedic Chart Display (`VedicChartDisplay.tsx`)**:
- Supports all 4 chart styles (North/South/East Indian, Western)
- Divisional chart selector
- Bhava Chalit overlay option

**Human Design Bodygraph (`HumanDesignBodygraph.tsx`)**:
- SVG-based bodygraph with 9 centers
- Gates and channels visualization
- Color-coded (personality/design)
- Interactive tooltips

#### 2. State Management

**Option A: Redux Toolkit (Recommended for large apps)**
```typescript
// store/slices/chartSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChartData } from '@/types/chart';

interface ChartState {
  currentChart: ChartData | null;
  chartList: ChartData[];
  loading: boolean;
  error: string | null;
}

const chartSlice = createSlice({
  name: 'chart',
  initialState: { currentChart: null, chartList: [], loading: false, error: null },
  reducers: {
    setCurrentChart: (state, action: PayloadAction<ChartData>) => {
      state.currentChart = action.payload;
    },
    // ... other reducers
  },
});
```

**Option B: Zustand (Simpler alternative)**
```typescript
// store/chartStore.ts
import create from 'zustand';
import { ChartData } from '@/types/chart';

interface ChartStore {
  currentChart: ChartData | null;
  setCurrentChart: (chart: ChartData) => void;
}

export const useChartStore = create<ChartStore>((set) => ({
  currentChart: null,
  setCurrentChart: (chart) => set({ currentChart: chart }),
}));
```

#### 3. API Service Layer

```typescript
// services/chartService.ts
import api from './api';
import { ChartRequest, ChartResponse } from '@/types/chart';

export const chartService = {
  calculateNatalChart: async (data: ChartRequest): Promise<ChartResponse> => {
    const response = await api.post('/charts/natal', data);
    return response.data;
  },

  getChart: async (chartId: string): Promise<ChartResponse> => {
    const response = await api.get(`/charts/${chartId}`);
    return response.data;
  },

  // ... other chart-related API calls
};
```

#### 4. Custom Hooks

```typescript
// hooks/useChart.ts
import { useState, useEffect } from 'react';
import { chartService } from '@/services/chartService';
import { ChartData } from '@/types/chart';

export const useChart = (chartId: string) => {
  const [chart, setChart] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const data = await chartService.getChart(chartId);
        setChart(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChart();
  }, [chartId]);

  return { chart, loading, error };
};
```

---

## Data Layer

### PostgreSQL Database

**Why PostgreSQL?**
- Robust, production-proven relational database
- JSONB support for flexible chart data storage
- Excellent performance with proper indexing
- Strong ACID compliance for data integrity
- PostGIS extension (for astrocartography in future)

### Database Schema Overview

**Core Tables:**
1. `users` - User accounts
2. `clients` - Client/customer records
3. `birth_data` - Birth information (encrypted)
4. `charts` - Calculated chart data
5. `interpretations` - Interpretation library
6. `session_notes` - Session notes per client
7. `user_preferences` - User default settings

**Supporting Tables:**
8. `location_cache` - Geocoded locations (performance)
9. `aspect_patterns` - Auto-detected patterns
10. `transit_events` - Tracked transit events

### Key Design Decisions

**1. JSON Storage for Chart Data:**
- `chart_data` column stores full calculated chart as JSONB
- Benefits: Flexible schema, fast retrieval, no complex joins
- Allows storing different chart types with varying data structures

**2. Separate Birth Data Table:**
- Reusable birth data across multiple chart types
- Easier to manage encryption for sensitive data
- One birth record → many charts

**3. UUID Primary Keys:**
- Better for distributed systems
- No sequential ID leakage
- Harder to guess/enumerate

**4. Timestamps:**
- `created_at` for all records (audit trail)
- `updated_at` where applicable
- `last_viewed` for charts (user experience)

---

## Calculation Engine: Swiss Ephemeris

### Integration Approach

**Library**: `pyswisseph` (Python bindings for Swiss Ephemeris)

**Installation:**
```bash
pip install pyswisseph
```

**Ephemeris Data Files:**
- Download from: https://www.astro.com/ftp/swisseph/ephe/
- Required files:
  - `seplm*.se1` - Moon position files
  - `sepl_*.se1` - Planet position files
  - `seas_*.se1` - Asteroid files (optional)
- Store in `/backend/ephemeris/` directory

### Wrapper Service

```python
# app/utils/ephemeris.py
import swisseph as swe
from datetime import datetime
from app.core.config import settings

# Set ephemeris path on module load
swe.set_ephe_path(settings.EPHEMERIS_PATH)

class EphemerisCalculator:
    """Wrapper around Swiss Ephemeris for astrological calculations"""

    # Planet constants
    PLANETS = {
        'sun': swe.SUN,
        'moon': swe.MOON,
        'mercury': swe.MERCURY,
        'venus': swe.VENUS,
        'mars': swe.MARS,
        'jupiter': swe.JUPITER,
        'saturn': swe.SATURN,
        'uranus': swe.URANUS,
        'neptune': swe.NEPTUNE,
        'pluto': swe.PLUTO,
        'true_node': swe.TRUE_NODE,
        'chiron': swe.CHIRON,
    }

    @staticmethod
    def calculate_julian_day(date: datetime, timezone_offset: int = 0) -> float:
        """Convert datetime to Julian Day"""
        # Adjust for timezone
        utc_time = date - timedelta(minutes=timezone_offset)

        jd = swe.julday(
            utc_time.year,
            utc_time.month,
            utc_time.day,
            utc_time.hour + utc_time.minute / 60.0
        )
        return jd

    @staticmethod
    def calculate_planet_position(planet: str, jd: float, flags: int = swe.FLG_SWIEPH) -> dict:
        """Calculate position of a planet at given Julian Day"""
        planet_id = EphemerisCalculator.PLANETS.get(planet.lower())
        if planet_id is None:
            raise ValueError(f"Unknown planet: {planet}")

        # Calculate position
        result = swe.calc_ut(jd, planet_id, flags)

        return {
            'longitude': result[0][0],
            'latitude': result[0][1],
            'distance': result[0][2],
            'speed_longitude': result[0][3],
            'speed_latitude': result[0][4],
            'speed_distance': result[0][5],
        }

    @staticmethod
    def calculate_houses(jd: float, latitude: float, longitude: float, house_system: str = 'P') -> dict:
        """Calculate house cusps and angles"""
        # House system codes: P=Placidus, K=Koch, O=Porphyry, R=Regiomontanus, etc.
        cusps, ascmc = swe.houses(jd, latitude, longitude, house_system.encode())

        return {
            'cusps': list(cusps),  # House cusps (1-12)
            'ascendant': ascmc[0],
            'mc': ascmc[1],
            'armc': ascmc[2],
            'vertex': ascmc[3],
            'equatorial_asc': ascmc[4],
            'co_ascendant_koch': ascmc[5],
        }
```

### Calculation Flow

```
User Input (Birth Data)
        ↓
Convert to Julian Day (UTC)
        ↓
Calculate Planetary Positions ← Swiss Ephemeris
        ↓
Calculate House Cusps ← Swiss Ephemeris
        ↓
Calculate Aspects (geometric angles)
        ↓
Detect Aspect Patterns
        ↓
Generate Chart Data (JSON)
        ↓
Store in Database
        ↓
Return to Frontend
```

---

## API Design

### RESTful Principles

- **Resource-oriented URLs**: `/api/clients/{id}/charts`
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Status Codes**: 200, 201, 400, 401, 404, 500
- **JSON Payload**: All requests/responses in JSON format

### Authentication Flow

```
1. User Login
   POST /api/auth/login
   → Returns JWT access token + refresh token

2. Authenticated Request
   GET /api/charts
   Headers: Authorization: Bearer <access_token>
   → Returns user's charts

3. Token Refresh
   POST /api/auth/refresh-token
   Body: { refresh_token }
   → Returns new access token
```

### Versioning

- URL-based versioning: `/api/v1/charts`
- Allows backward compatibility when API changes

### Error Handling

**Standard Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid birth date",
    "details": {
      "field": "birth_date",
      "reason": "Date cannot be in the future"
    }
  }
}
```

---

## Security Architecture

### Authentication & Authorization

**JWT (JSON Web Tokens):**
- Access token (short-lived, 15-60 minutes)
- Refresh token (long-lived, 7-30 days)
- Stored in HTTP-only cookies or local storage

**Password Security:**
- Hashing: bcrypt or argon2
- Minimum password strength requirements
- Password reset via email token

### Data Encryption

**At Rest:**
- PostgreSQL encryption for sensitive columns (birth data)
- AES-256 encryption for PII

**In Transit:**
- HTTPS/TLS 1.3 for all communications
- SSL certificates (Let's Encrypt)

### Input Validation

- Backend: Pydantic schemas for automatic validation
- Frontend: Form validation before submission
- SQL Injection prevention: SQLAlchemy ORM (parameterized queries)

### CORS Configuration

```python
# app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Performance Optimization

### Backend

**1. Caching (Redis):**
- Cache frequently-requested charts
- Cache ephemeris calculations for common dates
- Cache location lookups
- TTL: 1-24 hours depending on data type

**2. Database Optimization:**
- Indexes on frequently-queried columns (user_id, chart_id, created_at)
- Connection pooling (SQLAlchemy)
- Query optimization (avoid N+1 queries)

**3. Async Operations:**
- FastAPI async/await for I/O operations
- Background tasks for report generation

### Frontend

**1. Code Splitting:**
- Lazy load routes: `React.lazy()` and `Suspense`
- Smaller initial bundle size

**2. Memoization:**
- `React.memo()` for expensive components
- `useMemo()` and `useCallback()` hooks

**3. Virtualization:**
- For long lists (client list, transit events)
- Libraries: react-window or react-virtualized

**4. Asset Optimization:**
- Image compression
- SVG minification
- Font subsetting

---

## Deployment Architecture

### Development Environment
```
localhost:3000    → Frontend (Vite dev server)
localhost:8000    → Backend (Uvicorn)
localhost:5432    → PostgreSQL
localhost:6379    → Redis
```

### Production Environment (Example: Cloud Hosting)

```
┌─────────────────────────────────────────────────┐
│              Load Balancer / CDN                 │
│            (CloudFlare, AWS ALB)                 │
└───────────────────┬─────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐      ┌───────────────┐
│  Frontend     │      │   Backend     │
│  (Vercel/     │      │   (Docker on  │
│   Netlify)    │      │   AWS/GCP)    │
└───────────────┘      └────────┬──────┘
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            ┌───────────────┐      ┌───────────────┐
            │  PostgreSQL   │      │     Redis     │
            │  (RDS/         │      │   (ElastiCache│
            │   Supabase)   │      │    /Upstash)  │
            └───────────────┘      └───────────────┘
```

### Containerization (Docker)

**Backend Dockerfile:**
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY ephemeris/ ./ephemeris/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Docker Compose (Development):**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://user:pass@db:5432/theprogram
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: theprogram
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## Monitoring & Logging

### Application Monitoring
- **Sentry**: Error tracking and crash reporting
- **Prometheus + Grafana**: Metrics and dashboards
- **New Relic / Datadog**: APM (Application Performance Monitoring)

### Logging
- **Structured logging**: JSON format
- **Log levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Centralized logs**: CloudWatch, Elasticsearch, or similar

**Example:**
```python
import logging
import json

logger = logging.getLogger(__name__)

def log_chart_calculation(chart_id, duration_ms):
    logger.info(json.dumps({
        "event": "chart_calculated",
        "chart_id": chart_id,
        "duration_ms": duration_ms,
        "timestamp": datetime.utcnow().isoformat()
    }))
```

---

## Testing Strategy

### Backend Testing

**1. Unit Tests (pytest):**
- Test individual functions and services
- Mock external dependencies (database, ephemeris)

**2. Integration Tests:**
- Test API endpoints with test database
- Verify database operations

**3. Test Coverage Target:**
- Minimum 80% code coverage
- Critical calculation paths: 100% coverage

**Example:**
```python
# tests/test_services/test_chart_calculation.py
import pytest
from app.services.chart_calculation import ChartCalculationService

def test_natal_chart_calculation():
    service = ChartCalculationService()
    chart_data = service.calculate_natal_chart(
        date="1990-01-15",
        time="14:30:00",
        latitude=40.7128,
        longitude=-74.0060
    )

    assert chart_data.sun_position is not None
    assert 0 <= chart_data.sun_position <= 360
```

### Frontend Testing

**1. Component Tests (Jest + React Testing Library):**
- Test component rendering
- Test user interactions

**2. E2E Tests (Cypress/Playwright):**
- Test critical user workflows
- Chart calculation flow
- User login/logout

---

## Scalability Considerations

### Horizontal Scaling
- **Stateless backend**: Multiple FastAPI instances behind load balancer
- **Session storage**: Redis for shared session data
- **Database read replicas**: For read-heavy operations

### Caching Strategy
- **Level 1**: Browser cache (static assets)
- **Level 2**: CDN cache (frontend files)
- **Level 3**: Redis cache (API responses, calculations)
- **Level 4**: Database query cache

### Rate Limiting
- Prevent abuse of calculation-heavy endpoints
- Per-user limits (e.g., 100 charts/hour)

---

## Technology Decision Matrix

| Requirement | Technology Choice | Alternatives Considered | Reason for Choice |
|------------|-------------------|------------------------|-------------------|
| Backend Framework | FastAPI | Django, Flask | Performance, async support, auto-docs |
| Frontend Framework | React | Vue, Angular, Svelte | Ecosystem, community, job market |
| Database | PostgreSQL | MySQL, MongoDB | JSONB support, reliability, PostGIS |
| Calculation Engine | Swiss Ephemeris | JPL DE ephemeris directly | Industry standard, high precision |
| State Management | Redux Toolkit | Zustand, MobX, Context | Debugging tools, middleware support |
| Chart Rendering | D3.js + SVG | Canvas, Three.js | Scalability, interactivity, print quality |
| Authentication | JWT | Session cookies | Stateless, mobile-friendly |
| Caching | Redis | Memcached | Data structures, persistence options |

---

## Next Steps for Implementation

1. **Environment Setup**:
   - Install Python 3.10+, Node.js 18+, PostgreSQL 14+
   - Download and configure Swiss Ephemeris data files
   - Set up GeoNames database

2. **Backend Skeleton**:
   - Initialize FastAPI project structure
   - Configure database connection (SQLAlchemy)
   - Create initial models and migrations
   - Implement authentication system

3. **Frontend Skeleton**:
   - Initialize React + TypeScript project (Vite)
   - Set up routing and state management
   - Create component structure
   - Configure API client

4. **Core Features (Phase 1)**:
   - Implement natal chart calculation
   - Create basic chart wheel renderer
   - Build birth data input form
   - Integrate atlas service for location lookup

---

**Document Version**: 1.0
**Last Updated**: October 19, 2025
**Status**: Architecture Defined, Ready for Implementation
