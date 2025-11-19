# Backend - The Program

FastAPI-based backend for The Program astrology application with Swiss Ephemeris integration.

## Prerequisites

- Python 3.10 or higher
- PostgreSQL 14 or higher
- Redis (optional, for caching)
- Swiss Ephemeris library and data files

## Installation

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Download Swiss Ephemeris Data Files

```bash
# Create ephemeris directory
mkdir -p ephemeris

# Download ephemeris files (approximately 100MB)
cd ephemeris

# Main planetary files (essential)
wget https://www.astro.com/ftp/swisseph/ephe/seplm18.se1  # Moon
wget https://www.astro.com/ftp/swisseph/ephe/seplm54.se1  # Moon
wget https://www.astro.com/ftp/swisseph/ephe/sepl_18.se1  # Planets
wget https://www.astro.com/ftp/swisseph/ephe/sepl_54.se1  # Planets

# Asteroid files (optional, for advanced features)
wget https://www.astro.com/ftp/swisseph/ephe/seas_18.se1
wget https://www.astro.com/ftp/swisseph/ephe/seas_54.se1

cd ..
```

**Alternative**: You can download all files from https://www.astro.com/ftp/swisseph/ephe/

### 4. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Application
APP_NAME=The Program
APP_ENV=development
DEBUG=True

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/theprogram_db

# Redis (optional)
REDIS_URL=redis://localhost:6379/0

# Swiss Ephemeris
EPHEMERIS_PATH=./ephemeris

# Security
SECRET_KEY=your-secret-key-here-change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS (Frontend URL)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# GeoNames API (for location lookup)
GEONAMES_USERNAME=your_geonames_username
```

### 5. Set Up Database

```bash
# Create PostgreSQL database
createdb theprogram_db

# Or using psql:
psql -U postgres -c "CREATE DATABASE theprogram_db;"
```

### 6. Run Database Migrations

```bash
# Initialize Alembic (if not already done)
alembic init alembic

# Run migrations
alembic upgrade head
```

## Running the Application

### Development Server

```bash
# Standard mode
uvicorn app.main:app --reload

# With specific host/port
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive API docs (Swagger)**: http://localhost:8000/docs
- **Alternative API docs (ReDoc)**: http://localhost:8000/redoc

### Production Server

```bash
# Using Gunicorn with Uvicorn workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── api/                 # API route handlers
│   │   ├── auth.py         # Authentication endpoints
│   │   ├── charts.py       # Chart calculation endpoints
│   │   ├── clients.py      # Client management endpoints
│   │   └── ...
│   ├── core/                # Core configuration
│   │   ├── config.py       # Settings and environment variables
│   │   ├── security.py     # JWT, password hashing
│   │   └── database.py     # Database connection setup
│   ├── models/              # SQLAlchemy database models
│   ├── schemas/             # Pydantic schemas for validation
│   ├── services/            # Business logic
│   │   ├── chart_calculation.py
│   │   ├── western_astrology.py
│   │   ├── vedic_astrology.py
│   │   └── human_design.py
│   └── utils/               # Utility functions
│       └── ephemeris.py    # Swiss Ephemeris wrappers
├── tests/                   # Test suite
├── ephemeris/               # Swiss Ephemeris data files
├── alembic/                 # Database migrations
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables (not in git)
└── .env.example            # Environment variables template
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_services/test_chart_calculation.py

# Run with verbose output
pytest -v
```

## Swiss Ephemeris Integration

### Basic Usage Example

```python
import swisseph as swe
from datetime import datetime

# Set ephemeris path
swe.set_ephe_path('./ephemeris')

# Calculate Julian Day
jd = swe.julday(1990, 1, 15, 14.5)  # Jan 15, 1990, 14:30

# Calculate Sun position
sun = swe.calc_ut(jd, swe.SUN)
print(f"Sun longitude: {sun[0][0]}°")  # e.g., 294.5° (in Capricorn)

# Calculate houses (Placidus)
houses, ascmc = swe.houses(jd, 40.7128, -74.0060, b'P')
print(f"Ascendant: {ascmc[0]}°")
```

### Available Calculations

- **Planetary positions**: Sun through Pluto, Moon's Nodes, Chiron
- **House systems**: Placidus, Koch, Whole Sign, Equal, Campanus, Regiomontanus, etc.
- **Asteroids**: Ceres, Pallas, Juno, Vesta, and custom asteroids by number
- **Fixed stars**: Major fixed stars with positions
- **Tropical & Sidereal**: Support for both zodiacs with multiple ayanamsa systems

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/refresh` - Refresh access token

### Charts
- `POST /api/charts/natal` - Calculate natal chart
- `POST /api/charts/transits` - Calculate transit chart
- `POST /api/charts/progressions` - Calculate progressed chart
- `GET /api/charts/{id}` - Get saved chart
- `DELETE /api/charts/{id}` - Delete chart

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Create new client
- `GET /api/clients/{id}` - Get client details
- `PUT /api/clients/{id}` - Update client
- `DELETE /api/clients/{id}` - Delete client

For complete API documentation, visit http://localhost:8000/docs after starting the server.

## Database Migrations

### Create New Migration

```bash
# After modifying models in app/models/
alembic revision --autogenerate -m "Description of changes"
```

### Apply Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Downgrade one version
alembic downgrade -1

# View current version
alembic current
```

## Troubleshooting

### Swiss Ephemeris Errors

**Error**: `swisseph.Error: jpl file not found`
**Solution**: Ensure ephemeris files are downloaded to the correct directory and `EPHEMERIS_PATH` is set correctly.

**Error**: `swisseph.Error: year -291 not covered by jpl file`
**Solution**: Download additional ephemeris files for the date range you need.

### Database Connection Errors

**Error**: `psycopg2.OperationalError: could not connect to server`
**Solution**: Ensure PostgreSQL is running and connection details in `.env` are correct.

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Import Errors

**Error**: `ModuleNotFoundError: No module named 'app'`
**Solution**: Ensure virtual environment is activated and you're running from the `backend/` directory.

## Development Tips

### Enable Auto-Reload

The `--reload` flag with uvicorn enables auto-reload when code changes:
```bash
uvicorn app.main:app --reload
```

### Database GUI Tools

Use tools like pgAdmin, DBeaver, or DataGrip to inspect the database during development.

### API Testing Tools

- **Swagger UI**: http://localhost:8000/docs (built-in)
- **Postman**: Import OpenAPI schema from http://localhost:8000/openapi.json
- **httpie**: Command-line HTTP client

```bash
# Example API calls with httpie
http POST localhost:8000/api/auth/login email=user@example.com password=secret
http POST localhost:8000/api/charts/natal Authorization:"Bearer <token>" < chart_data.json
```

## Performance Optimization

### Redis Caching

Enable Redis to cache frequently-accessed data:
```python
# In app/core/config.py
REDIS_ENABLED = True
REDIS_URL = "redis://localhost:6379/0"
```

### Database Connection Pooling

SQLAlchemy handles connection pooling automatically. Adjust pool size in production:
```python
# In app/core/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10
)
```

## Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Change SECRET_KEY** - Generate strong secret key for production
3. **Use HTTPS** - Always use HTTPS in production
4. **Validate all inputs** - Pydantic schemas handle this automatically
5. **Rate limiting** - Implement rate limiting for production
6. **Regular updates** - Keep dependencies updated for security patches

```bash
# Check for security vulnerabilities
pip install safety
safety check
```

## License

This backend uses Swiss Ephemeris which is dual-licensed under AGPL 3.0 or Professional License. See PROJECT_PLAN.md for details.

## Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Swiss Ephemeris Documentation**: https://www.astro.com/swisseph/swisseph.htm
- **SQLAlchemy Documentation**: https://docs.sqlalchemy.org/
- **Pydantic Documentation**: https://docs.pydantic.dev/

## Support

For issues or questions, please open an issue on GitHub or refer to the main PROJECT_PLAN.md documentation.
