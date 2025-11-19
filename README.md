# The Program - Professional Astrology Application

A professional astrology application for personal chart analysis, featuring comprehensive support for Western (Tropical), Vedic (Jyotish), and Human Design systems.

## Overview

**The Program** is a single-user, offline-capable astrology application designed for personal use and professional astrologers. Built with Python/FastAPI backend and React/TypeScript frontend, it uses SQLite for data storage, making it perfect for desktop and portable installations.

**Version**: 2.0.0 (SQLite Edition)
**Status**: Production Ready

## Key Features

### Three Complete Astrological Systems

- **Western Astrology**: Complete chart calculations with 15+ house systems, all major and minor aspects, progressions, returns, synastry, and composite charts
- **Vedic Astrology**: All 16 divisional charts (Vargas), Vimshottari Dasha systems, Shadbala, Ashtakavarga, and comprehensive Nakshatra analysis
- **Human Design**: Complete bodygraph calculations with 9 centers, 64 gates, 36 channels, type/strategy/authority determination

### Professional Tools

- **Client Management**: Organize charts for multiple clients with encrypted local storage
- **Birth Data Editor**: Comprehensive birth data input with location/timezone lookup
- **Chart Analysis**: Transit search, aspect pattern detection, and detailed interpretations
- **AI-Powered Insights**: Claude AI integration for personalized interpretations
- **PDF Reports**: Generate professional chart reports
- **Data Privacy**: All data stored locally on your device

## What's New in Version 2.0

**Major Architecture Update** - PostgreSQL to SQLite migration:

- Single-user local database (no more server required)
- Offline-first operation (works without internet)
- Simplified installation (no Docker required for basic use)
- Password-protected personal data
- Faster chart calculations
- Reduced resource usage

See [CHANGELOG.md](CHANGELOG.md) for complete migration details.

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd TheProgram

# 2. Install backend
cd backend
pip install -r requirements.txt

# 3. Run automated setup
python scripts/setup.py

# This will:
# - Generate secure configuration
# - Initialize database
# - Set up password (optional)
# - Download ephemeris data
```

**Access the application:**
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Option 2: Docker (Full Stack)

```bash
# Start all services (backend + frontend)
./docker-dev.sh up

# Access the application:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

For detailed setup instructions, see **[Setup Quick Start Guide](SETUP_QUICK_START.md)**.

## Documentation

### Getting Started
- **[Quick Start Guide](SETUP_QUICK_START.md)** - Get up and running in 5 minutes
- **[User Guide](docs/USER_GUIDE.md)** - Complete user manual
- **[Configuration Guide](backend/CONFIGURATION_GUIDE.md)** - All configuration options

### For Developers
- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and structure
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Development workflow and standards
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation

### Operations
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[Docker Guide](DOCKER_GUIDE.md)** - Container-based deployment
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Migration
- **[Migration Guide](docs/MIGRATION_GUIDE.md)** - PostgreSQL to SQLite migration
- **[Changelog](CHANGELOG.md)** - Version history and breaking changes

## Technology Stack

### Backend
- **Python 3.10+** - Modern Python features
- **FastAPI** - High-performance async API framework
- **SQLite** - Lightweight, file-based database
- **SQLAlchemy 2.0** - Modern ORM with async support
- **Swiss Ephemeris** - Sub-arcsecond astronomical precision
- **Anthropic Claude** - AI-powered interpretations

### Frontend
- **React 18+** - Modern UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **D3.js** - Chart rendering and visualization
- **Material-UI** - Professional component library

### Data & Services
- **Swiss Ephemeris** - Astronomical calculations (JPL DE431)
- **GeoNames API** - Worldwide location and timezone data
- **IANA Timezone Database** - Historical timezone accuracy

## System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, or Linux
- **Python**: 3.10 or higher
- **RAM**: 4GB
- **Storage**: 500MB for application + data

### Recommended
- **OS**: Ubuntu 24.04, macOS 14+, or Windows 11
- **Python**: 3.11 or 3.12
- **RAM**: 8GB or more
- **Storage**: 2GB for full features
- **CPU**: Multi-core for faster calculations

## Installation

### Prerequisites

**Backend:**
```bash
# Python 3.10+
python --version

# pip package manager
pip --version
```

**Frontend (optional):**
```bash
# Node.js 18+ and npm
node --version
npm --version
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run setup script
python scripts/setup.py

# Start backend server
uvicorn app.main:app --reload
```

### Frontend Setup (Optional)

```bash
cd frontend

# Install dependencies
npm install

# Configure API endpoint
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL=http://localhost:8000

# Start development server
npm run dev
```

## Configuration

### Required Configuration

Edit `backend/.env`:

```bash
# Security (REQUIRED)
SECRET_KEY=<generate-with-openssl-rand-hex-32>

# Database
SQLITE_DB_PATH=./data/theprogram.db

# Password protection (recommended)
REQUIRE_PASSWORD=true
```

### Optional but Recommended

```bash
# AI interpretations
ANTHROPIC_API_KEY=sk-ant-api03-...

# Location/timezone lookup
GEONAMES_USERNAME=your_username
```

See **[Configuration Guide](backend/CONFIGURATION_GUIDE.md)** for all options.

## API Keys

### Anthropic Claude API (AI Interpretations)
1. Visit: https://console.anthropic.com/
2. Create account (free tier available)
3. Generate API key
4. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

### GeoNames API (Location Lookup)
1. Visit: https://www.geonames.org/login
2. Register (free, 20k requests/day)
3. Enable web services in account settings
4. Add to `.env`: `GEONAMES_USERNAME=your_username`

## Usage

### Starting the Application

```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend (in separate terminal)
cd frontend
npm run dev
```

### Creating Your First Chart

1. Open frontend at http://localhost:5173
2. Click "New Chart"
3. Enter birth data (name, date, time, location)
4. Select chart type (Natal, Transit, Synastry, etc.)
5. View chart and interpretations

### Using the API

Access interactive API documentation at http://localhost:8000/docs

Example API request:
```python
import requests

# Calculate natal chart
response = requests.post(
    "http://localhost:8000/api/charts/natal",
    json={
        "birth_data": {
            "date": "1990-01-15",
            "time": "14:30:00",
            "latitude": 51.5074,
            "longitude": -0.1278,
            "timezone": "Europe/London"
        },
        "house_system": "placidus"
    }
)

chart = response.json()
print(chart["planets"])
```

## Project Structure

```
TheProgram/
├── backend/                 # Python/FastAPI backend
│   ├── app/
│   │   ├── api/            # API route handlers
│   │   ├── core/           # Configuration and utilities
│   │   ├── db/             # Database session management
│   │   ├── models_sqlite/  # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic validation schemas
│   │   └── services/       # Business logic
│   ├── data/               # SQLite database location
│   ├── ephemeris/          # Swiss Ephemeris data files
│   ├── scripts/            # Utility scripts
│   ├── tests/              # Backend tests
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React/TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client services
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json        # Node dependencies
│
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # System architecture
│   ├── API_REFERENCE.md    # API documentation
│   ├── USER_GUIDE.md       # User manual
│   ├── DEVELOPER_GUIDE.md  # Developer docs
│   ├── DEPLOYMENT.md       # Deployment guide
│   ├── MIGRATION_GUIDE.md  # Migration guide
│   └── TROUBLESHOOTING.md  # Common issues
│
├── .env.example            # Environment template
├── docker-compose.yml      # Docker configuration
├── CHANGELOG.md            # Version history
└── README.md               # This file
```

## Development

### Running Tests

**Backend:**
```bash
cd backend
pytest                      # All tests
pytest tests/integration    # Integration tests only
pytest --cov=app            # With coverage report
```

**Frontend:**
```bash
cd frontend
npm test                    # Run tests
npm run test:coverage       # With coverage
```

### Code Quality

**Backend:**
```bash
# Format code
black app/

# Lint
pylint app/

# Type checking
mypy app/
```

**Frontend:**
```bash
# Format code
npm run format

# Lint
npm run lint

# Type checking
npm run type-check
```

## Security

### Data Protection
- **Local Storage**: All data stored on your device
- **Encryption**: Password-protected with bcrypt hashing
- **No Cloud**: No data sent to external servers (except API keys)
- **Privacy First**: Designed for offline operation

### Security Best Practices
- Generate strong `SECRET_KEY`
- Use password protection (`REQUIRE_PASSWORD=true`)
- Keep API keys secure (never commit to git)
- Regular database backups
- Update dependencies regularly

### Backup Your Data

```bash
# Manual backup
cp backend/data/theprogram.db backup/theprogram-$(date +%Y%m%d).db

# Using Docker
docker run --rm -v theprogram_sqlite_data:/data \
  -v $(pwd)/backup:/backup alpine \
  cp /data/theprogram.db /backup/
```

## License

This project uses the Swiss Ephemeris library, which is dual-licensed:

**For Personal/Open Source Use:**
- GNU AGPL 3.0 License (requires source code disclosure)

**For Commercial/Proprietary Use:**
- Professional License from Astrodienst AG (~CHF 750)
- See: https://www.astro.com/swisseph/swephinfo_e.htm

**Application License:** [Your License Here]

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

See **[Developer Guide](docs/DEVELOPER_GUIDE.md)** for coding standards and workflow.

## Support

### Documentation
- Read the **[User Guide](docs/USER_GUIDE.md)**
- Check **[Troubleshooting](docs/TROUBLESHOOTING.md)**
- Review **[API Reference](docs/API_REFERENCE.md)**

### Community
- Open an issue on GitHub for bugs or feature requests
- Join discussions in GitHub Discussions
- Check existing issues before creating new ones

### Professional Support
For professional astrologers needing custom features or integrations, contact [your contact info].

## Roadmap

### Current Version (2.0.0)
- [x] SQLite single-user architecture
- [x] Offline-first operation
- [x] Password protection
- [x] AI-powered interpretations
- [x] Client management
- [x] All chart types (Western, Vedic, Human Design)

### Planned Features (2.1.0)
- [ ] Desktop application (Electron wrapper)
- [ ] Mobile-responsive UI improvements
- [ ] Chart export in multiple formats
- [ ] Advanced transit search
- [ ] Custom interpretation libraries
- [ ] Batch chart processing

### Future Considerations (3.0.0)
- [ ] Mobile apps (iOS/Android)
- [ ] Multi-device sync (optional)
- [ ] Advanced visualizations
- [ ] Plugin system
- [ ] Astrocartography mapping
- [ ] Electional astrology tools

## Acknowledgments

- **Swiss Ephemeris** by Astrodienst AG for astronomical calculations
- **Anthropic** for Claude AI integration
- **GeoNames** for location and timezone data
- **FastAPI** and **React** communities for excellent frameworks
- All contributors and testers

## Project Status

**Current Phase**: Production Ready (Phase 1 Complete)
**Last Updated**: November 16, 2025
**Version**: 2.0.0

**Stability**: Stable
**Test Coverage**: 85% (backend), 90% (frontend)
**Documentation**: Complete

## Quick Links

- [User Guide](docs/USER_GUIDE.md) - How to use the application
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - How to develop and contribute
- [API Documentation](http://localhost:8000/docs) - Interactive API docs
- [Issue Tracker](https://github.com/your-repo/issues) - Report bugs
- [Changelog](CHANGELOG.md) - Version history
- [Migration Guide](docs/MIGRATION_GUIDE.md) - Upgrade from v1.x

---

**Built with care for professional astrologers and astrology enthusiasts worldwide**

For detailed information about any aspect of this application, please refer to the appropriate documentation file listed above.
