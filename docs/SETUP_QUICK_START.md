# The Program - Quick Start Setup Guide

## Overview

The Program is now a **single-user, SQLite-based personal astrology application**. This guide will get you up and running in minutes.

## Prerequisites

- Python 3.10 or higher
- Node.js 16 or higher (for frontend)
- Git (optional, for cloning)

## Installation Methods

Choose one:

### Method 1: Automated Setup (Recommended)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Run automated setup script
python scripts/setup.py
```

The setup script will:
- Check all dependencies
- Create necessary directories
- Generate `.env` file with secure secret key
- Prompt for optional API keys (Anthropic, GeoNames)
- Initialize SQLite database
- Set up initial password (optional)

### Method 2: Manual Setup

```bash
# 1. Backend setup
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create environment file
cp .env.example .env

# 4. Generate secret key
python scripts/generate_secret_key.py

# 5. Edit .env and add the generated secret key
nano .env  # or your preferred editor

# 6. Initialize database
python -c "from app.db.session_sqlite import init_db; init_db()"

# 7. Frontend setup (in new terminal)
cd frontend
npm install
cp .env.example .env
```

## Configuration

### Required Environment Variables

Edit `backend/.env`:

```bash
# CRITICAL: Set a secure secret key
SECRET_KEY=your-generated-secret-key-here

# Database path (will be created automatically)
SQLITE_DB_PATH=./data/theprogram.db

# Password protection (recommended)
REQUIRE_PASSWORD=true
```

### Optional but Recommended

```bash
# AI-powered interpretations
ANTHROPIC_API_KEY=sk-ant-api03-...

# Location/timezone lookup
GEONAMES_USERNAME=your_username
```

**Getting API Keys:**

1. **Anthropic Claude API:**
   - Visit: https://console.anthropic.com/
   - Create account (free tier available)
   - Generate API key

2. **GeoNames API:**
   - Visit: https://www.geonames.org/login
   - Free registration (20k credits/day)
   - Enable free web services in account settings

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access the application:
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/docs

### Production Mode with Docker

```bash
# Start backend with docker-compose
cd backend
docker-compose up -d

# Start frontend (or build and serve)
cd frontend
npm run build
npm run preview
```

## Verification

Verify your setup is correct:

```bash
cd backend
python scripts/verify_config.py
```

This will check:
- All required environment variables
- Database configuration
- Directory permissions
- Dependencies
- Security settings

## First-Time Usage

### With Password Protection (Default)

1. Start the backend server
2. On first launch, you'll be prompted to set a password
3. This password will be required each time you open the app
4. Password is stored securely (bcrypt hashed) in the database

### Without Password Protection

If you set `REQUIRE_PASSWORD=false`:
- No authentication needed
- **Only use on private, secure devices**
- Not recommended for shared computers

## Troubleshooting

### Database Issues

**Problem:** "Database not found"
- Database is created automatically on first run
- Check `SQLITE_DB_PATH` in `.env`
- Verify write permissions on data directory

**Problem:** "Foreign key constraint failed"
- Ensure `SQLITE_ENABLE_FOREIGN_KEYS=true` in `.env`
- Database might be corrupted - delete and reinitialize

### API Key Issues

**Problem:** "AI interpretations not working"
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check API key is active at console.anthropic.com
- Review usage limits (free tier has restrictions)

**Problem:** "Location lookup fails"
- Set `GEONAMES_USERNAME` in `.env`
- Verify account is active
- Enable free web services in GeoNames account settings

### Import Errors

**Problem:** "ModuleNotFoundError"
```bash
# Reinstall dependencies
pip install -r requirements.txt

# Or install missing package
pip install <package-name>
```

### Port Already in Use

**Problem:** "Address already in use"
```bash
# Backend (change port)
uvicorn app.main:app --port 8001

# Frontend (change port)
npm run dev -- --port 3001
```

## Directory Structure

After setup, you should have:

```
backend/
├── data/               # SQLite database
│   └── theprogram.db
├── ephemeris/          # Astronomical data files
├── logs/               # Application logs
├── storage/            # Generated reports
│   └── reports/
├── .env                # Your configuration
└── app/                # Application code

frontend/
├── src/                # React application
├── .env                # Frontend configuration
└── dist/               # Built files (after npm run build)
```

## Security Recommendations

### For Personal Use (Single Device)

- ✓ Keep `REQUIRE_PASSWORD=true`
- ✓ Use strong password
- ✓ Keep `SECRET_KEY` secret
- ✓ Regular backups of `data/theprogram.db`

### For Shared Computer

- ✓ **Must** use password protection
- ✓ Don't store API keys in environment (use secrets manager)
- ✓ Set `DEBUG=false`
- ✓ Use HTTPS (reverse proxy)

## Backup and Restore

### Backup

```bash
# Backup database
cp backend/data/theprogram.db backup/theprogram-$(date +%Y%m%d).db

# Or use Docker volume
docker run --rm -v theprogram_sqlite_data:/data \
  -v $(pwd)/backup:/backup alpine \
  cp /data/theprogram.db /backup/
```

### Restore

```bash
# Restore from backup
cp backup/theprogram-20231115.db backend/data/theprogram.db

# Or use Docker volume
docker run --rm -v theprogram_sqlite_data:/data \
  -v $(pwd)/backup:/backup alpine \
  cp /backup/theprogram-20231115.db /data/theprogram.db
```

## Next Steps

1. **Explore the API:**
   - Visit http://localhost:8000/docs
   - Try the interactive API documentation

2. **Create Your First Chart:**
   - Open frontend at http://localhost:5173
   - Enter birth data
   - Generate natal chart

3. **Configure Preferences:**
   - Adjust aspect orbs in `.env`
   - Set default house system
   - Customize interpretation settings

4. **Read Full Documentation:**
   - See `backend/CONFIGURATION_GUIDE.md` for all options
   - Check API documentation at `/docs`
   - Review task completion reports in backend directory

## Support and Resources

- Configuration Guide: `backend/CONFIGURATION_GUIDE.md`
- API Documentation: http://localhost:8000/docs
- Environment Variables: `backend/.env.example`
- Setup Scripts: `backend/scripts/`

## Migration from PostgreSQL

If you're migrating from the old PostgreSQL version:

1. Export your data from PostgreSQL
2. Run migration script (if available)
3. Update environment variables (see CONFIGURATION_GUIDE.md)
4. Verify with `scripts/verify_config.py`

Key changes:
- No more `DATABASE_URL`
- Use `SQLITE_DB_PATH` instead
- Remove all `POSTGRES_*` variables
- No Redis/SMTP configuration needed
