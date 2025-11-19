# The Program - Configuration Guide

## Overview

The Program is now a **single-user, SQLite-based personal astrology application**. This guide covers all configuration options for setting up and customizing your installation.

## Quick Start

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Generate secret key:**
   ```bash
   openssl rand -hex 32
   ```
   Update `SECRET_KEY` in `.env` with the generated value.

3. **Configure Anthropic API (Optional but Recommended):**
   - Get your API key from: https://console.anthropic.com/
   - Update `ANTHROPIC_API_KEY` in `.env`

4. **Run setup script:**
   ```bash
   python scripts/setup.py
   ```

## Configuration Files

### Environment Files

| File | Purpose |
|------|---------|
| `.env.example` | Template with all configuration options and documentation |
| `.env` | Your actual configuration (never commit to git) |
| `.env.docker` | Docker-specific configuration (if using containers) |

### Code Configuration

| File | Purpose |
|------|---------|
| `app/core/config.py` | Legacy PostgreSQL config (deprecated) |
| `app/core/config_sqlite.py` | SQLite-specific configuration class |
| `app/models_sqlite/app_config.py` | Runtime configuration storage in database |

## Essential Configuration

### Database Configuration

```bash
# Path to SQLite database file
SQLITE_DB_PATH=./data/theprogram.db

# Can use absolute path for shared storage:
# SQLITE_DB_PATH=/home/user/.local/share/theprogram/theprogram.db
```

**Database will be created automatically** on first run if it doesn't exist.

### Security Configuration

```bash
# CRITICAL: Use a strong random key
SECRET_KEY=your-secret-key-here

# JWT token settings
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Optional password protection
REQUIRE_PASSWORD=true  # Set to false for trusted single-user devices
```

**Password Protection Options:**

1. **Enabled (Recommended):**
   - Set `REQUIRE_PASSWORD=true`
   - Configure password requirements
   - User must authenticate on first launch

2. **Disabled (Trusted Device Only):**
   - Set `REQUIRE_PASSWORD=false`
   - No authentication required
   - Use only on private, secure devices

### API Keys

```bash
# Anthropic Claude API (for AI interpretations)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# GeoNames API (for location/timezone lookup)
GEONAMES_USERNAME=your_username
```

**Getting API Keys:**

1. **Anthropic:**
   - Visit: https://console.anthropic.com/
   - Create account and generate API key
   - Free tier available with usage limits

2. **GeoNames:**
   - Visit: https://www.geonames.org/login
   - Free account with 20,000 credits/day

## Advanced Configuration

### SQLite Performance Tuning

```bash
# Foreign key constraints (CRITICAL - do not disable)
SQLITE_ENABLE_FOREIGN_KEYS=true

# Journal mode (WAL recommended for best performance)
SQLITE_JOURNAL_MODE=WAL  # Options: DELETE, TRUNCATE, WAL

# Synchronous mode (balance safety vs speed)
SQLITE_SYNCHRONOUS=NORMAL  # Options: OFF, NORMAL, FULL, EXTRA

# Cache size (negative = KB, positive = pages)
SQLITE_CACHE_SIZE=-2000  # 2MB cache

# Connection pool
SQLITE_POOL_SIZE=5
SQLITE_MAX_OVERFLOW=10
```

**Recommendations by Use Case:**

| Use Case | Journal | Sync | Cache |
|----------|---------|------|-------|
| Desktop App | WAL | NORMAL | -2000 |
| High Safety | WAL | FULL | -4000 |
| Maximum Speed | WAL | NORMAL | -8000 |
| Embedded Device | DELETE | NORMAL | -1000 |

### Chart Calculation Defaults

```bash
# House system
DEFAULT_HOUSE_SYSTEM=placidus  # placidus, koch, whole_sign, equal

# Zodiac type
DEFAULT_ZODIAC=tropical  # tropical, sidereal

# For Vedic astrology:
DEFAULT_AYANAMSA=lahiri  # lahiri, raman, krishnamurti

# Node calculation
DEFAULT_NODE_TYPE=true  # true (true node), mean (mean node)
```

### Aspect Orbs

Customize tolerance for planetary aspects (in degrees):

```bash
ASPECT_ORB_CONJUNCTION=10
ASPECT_ORB_OPPOSITION=10
ASPECT_ORB_TRINE=8
ASPECT_ORB_SQUARE=7
ASPECT_ORB_SEXTILE=6
ASPECT_ORB_QUINCUNX=3
# ... etc
```

### CORS Configuration

For frontend access from different origins:

```bash
# Comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000

# Allow credentials (cookies, auth headers)
CORS_ALLOW_CREDENTIALS=true
```

Add your frontend URLs here if running on different ports or domains.

## Production Configuration

### Recommended Production Settings

```bash
# Application
APP_ENV=production
DEBUG=false
LOG_LEVEL=INFO

# Security
REQUIRE_PASSWORD=true
SECRET_KEY=<generate-new-key>

# Database
SQLITE_DB_PATH=/var/lib/theprogram/theprogram.db
SQLITE_SYNCHRONOUS=NORMAL

# Performance
ENABLE_GZIP=true
SQLITE_CACHE_SIZE=-4000  # 4MB cache

# Logging
LOG_FORMAT=json
LOG_FILE=/var/log/theprogram/app.log
```

### Security Checklist

- [ ] Generate new `SECRET_KEY` (never use example/default)
- [ ] Set `DEBUG=false` in production
- [ ] Enable `REQUIRE_PASSWORD=true`
- [ ] Use HTTPS for production deployments
- [ ] Restrict `CORS_ORIGINS` to actual frontend URLs
- [ ] Set proper file permissions on database file
- [ ] Enable error tracking (Sentry) for monitoring
- [ ] Regular database backups

### File Permissions

```bash
# Database file (read/write for app user only)
chmod 600 /path/to/theprogram.db

# Database directory (read/write/execute for app user)
chmod 700 /path/to/data/

# Configuration file (read-only for app user)
chmod 400 .env
```

## Environment Variables Reference

### Application Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | The Program | Application name |
| `APP_ENV` | development | Environment: development, staging, production |
| `DEBUG` | true | Enable debug mode |
| `LOG_LEVEL` | INFO | Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL |

### Server Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | 0.0.0.0 | Server bind address |
| `PORT` | 8000 | Server port |
| `API_V1_STR` | /api | API prefix |

### Database Settings (SQLite)

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SQLITE_DB_PATH` | ./data/theprogram.db | Yes | Database file path |
| `SQLITE_ENABLE_FOREIGN_KEYS` | true | Yes | Enforce referential integrity |
| `SQLITE_JOURNAL_MODE` | WAL | No | Journal mode |
| `SQLITE_SYNCHRONOUS` | NORMAL | No | Synchronous level |
| `SQLITE_CACHE_SIZE` | -2000 | No | Cache size (KB) |
| `SQLITE_POOL_SIZE` | 5 | No | Connection pool size |
| `SQLITE_AUTO_CREATE_DIR` | true | No | Auto-create DB directory |

### Security Settings

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `SECRET_KEY` | - | **Yes** | JWT signing key (generate with openssl) |
| `JWT_ALGORITHM` | HS256 | No | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 30 | No | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | No | Refresh token lifetime |
| `REQUIRE_PASSWORD` | true | No | Require password authentication |
| `PASSWORD_MIN_LENGTH` | 8 | No | Minimum password length |

### API Keys

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Recommended | Claude API for interpretations |
| `ANTHROPIC_MODEL` | No | Model to use (default: claude-3-5-sonnet-20241022) |
| `GEONAMES_USERNAME` | Optional | GeoNames API username |

### Swiss Ephemeris

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `EPHEMERIS_PATH` | ./ephemeris | Yes | Path to ephemeris data files |

### CORS Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | localhost URLs | Comma-separated allowed origins |
| `CORS_ALLOW_CREDENTIALS` | true | Allow cookies/auth headers |

## Troubleshooting

### Database Issues

**Problem:** Database not created
- Check `SQLITE_AUTO_CREATE_DIR=true`
- Verify write permissions on parent directory
- Check path in `SQLITE_DB_PATH`

**Problem:** Database locked errors
- Enable WAL mode: `SQLITE_JOURNAL_MODE=WAL`
- Check no other process has file open
- Reduce connection pool if needed

**Problem:** Foreign key constraint violations
- Ensure `SQLITE_ENABLE_FOREIGN_KEYS=true`
- Check data integrity
- Review migration scripts

### Authentication Issues

**Problem:** JWT token expired
- Increase `ACCESS_TOKEN_EXPIRE_MINUTES`
- Frontend should handle refresh tokens

**Problem:** Invalid password
- Check password requirements match settings
- Verify `PASSWORD_*` environment variables

### API Key Issues

**Problem:** AI interpretations not working
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check API key is active at console.anthropic.com
- Review API rate limits

**Problem:** Location lookup fails
- Set `GEONAMES_USERNAME`
- Verify account is active
- Check daily API limits (20k free tier)

## Migration from PostgreSQL

If migrating from old PostgreSQL configuration:

### Environment Variables to Remove

```bash
# No longer needed:
DATABASE_URL
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_PORT
REDIS_ENABLED
REDIS_URL
REDIS_PASSWORD
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
```

### Environment Variables to Add

```bash
# New SQLite config:
SQLITE_DB_PATH=./data/theprogram.db
SQLITE_ENABLE_FOREIGN_KEYS=true
SQLITE_JOURNAL_MODE=WAL

# New auth config:
REQUIRE_PASSWORD=true
ANTHROPIC_API_KEY=your-key-here
```

### Data Migration

1. Export data from PostgreSQL
2. Run migration script: `python scripts/migrate_from_postgres.py`
3. Verify data integrity
4. Update configuration files

## Support

For configuration help:
- Check `.env.example` for latest options
- Review this guide
- See `/docs` API documentation when server is running
- Check logs at path specified in `LOG_FILE`
