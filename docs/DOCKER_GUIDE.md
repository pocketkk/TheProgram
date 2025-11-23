# Docker Deployment Guide for The Program

**Updated for SQLite Single-User Architecture**

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Development Environment](#development-environment)
6. [Production Deployment](#production-deployment)
7. [Database Management](#database-management)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Configuration](#advanced-configuration)

---

## Overview

The Program now uses a simplified, single-user architecture with SQLite database. This eliminates the need for PostgreSQL and Redis containers, making deployment simpler and more suitable for personal astrology chart analysis.

### Key Changes from Previous Architecture

- **Database**: PostgreSQL → SQLite (file-based)
- **Caching**: Redis removed (single-user doesn't need it)
- **Containers**: 3 → 2 (backend + frontend only)
- **Data Persistence**: Named volumes + host directory for SQLite
- **Complexity**: Significantly reduced

---

## Architecture

### Current Architecture (SQLite)

```
┌─────────────────────────────────────────────┐
│              The Program                    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │   Frontend   │      │     Backend     │ │
│  │   (React +   │─────▶│   (FastAPI +    │ │
│  │    Nginx)    │      │    SQLite)      │ │
│  └──────────────┘      └─────────────────┘ │
│       :3000                  :8000          │
│                                ▼            │
│                         ┌──────────────┐   │
│                         │ SQLite DB    │   │
│                         │ ./data/      │   │
│                         └──────────────┘   │
│                                             │
│  Volumes:                                   │
│  - ./data (SQLite database)                 │
│  - ephemeris_data (astronomical data)       │
│  - logs_data (application logs)             │
│  - storage_data (reports/exports)           │
│                                             │
└─────────────────────────────────────────────┘
```

### Previous Architecture (PostgreSQL)

```
┌─────────────────────────────────────────────┐
│              The Program (OLD)              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐      ┌─────────────────┐ │
│  │   Frontend   │      │     Backend     │ │
│  │   (React)    │─────▶│   (FastAPI)     │ │
│  └──────────────┘      └─────────────────┘ │
│       :3000                  :8000 ▼        │
│                                ┌──────────┐ │
│                                │PostgreSQL│ │
│                                │  :5432   │ │
│                                └──────────┘ │
│                                             │
│  Optional:                                  │
│  ┌──────────────┐                           │
│  │    Redis     │                           │
│  │  (Cache)     │                           │
│  └──────────────┘                           │
│       :6379                                 │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: For cloning the repository

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 2GB for containers + space for database and ephemeris data
- **OS**: Linux, macOS, or Windows with WSL2

### Check Installation

```bash
docker --version          # Should show 20.10+
docker compose version    # Should show 2.0+
```

---

## Quick Start

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd TheProgram

# Copy environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

### 2. Development Mode (Fastest)

```bash
# Start with hot reload
./docker-dev.sh up

# View logs
./docker-dev.sh logs

# Stop when done
./docker-dev.sh stop
```

### 3. Production Mode

```bash
# Start production deployment
./docker-prod.sh start

# Check health
./docker-prod.sh health

# View logs
./docker-prod.sh logs

# Stop when done
./docker-prod.sh stop
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

---

## Development Environment

### Features

- **Hot Reload**: Code changes instantly reflected (no rebuild needed)
- **Debug Mode**: Verbose logging and detailed error messages
- **Source Mounting**: Local code mounted into containers
- **Fast Iteration**: Immediate feedback loop

### Starting Development Environment

```bash
# Foreground (see logs)
./docker-dev.sh start

# Background (detached)
./docker-dev.sh up

# With specific services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up backend
```

### Development Commands

```bash
# View logs
./docker-dev.sh logs              # All services
./docker-dev.sh logs backend      # Backend only
./docker-dev.sh logs frontend     # Frontend only

# Service status
./docker-dev.sh status

# Shell access
./docker-dev.sh shell-backend     # Backend container shell
./docker-dev.sh shell-frontend    # Frontend container shell

# Run tests
./docker-dev.sh test              # Backend tests

# Restart services
./docker-dev.sh restart

# Rebuild containers
./docker-dev.sh rebuild
```

### Development Workflow

1. **Start environment**: `./docker-dev.sh up`
2. **Make code changes**: Edit files in `./backend/app` or `./frontend/src`
3. **See changes**: Automatically reloaded in browser/API
4. **Test**: `./docker-dev.sh test`
5. **Debug**: Check logs with `./docker-dev.sh logs`
6. **Stop**: `./docker-dev.sh stop`

### Database in Development

```bash
# Database location
./data/app.db

# Backup database
./docker-dev.sh backup

# Reset database (delete and recreate)
./docker-dev.sh reset-db

# Run migrations
./docker-dev.sh shell-backend
alembic upgrade head
```

### Environment Variables

Development `.env` should have:

```env
APP_ENV=development
DEBUG=true
LOG_LEVEL=debug
DATABASE_URL=sqlite:///./data/app.db
```

---

## Production Deployment

### Features

- **Optimized Builds**: Multi-stage Docker builds
- **Resource Limits**: CPU and memory constraints
- **Health Checks**: Automatic service monitoring
- **Auto-Restart**: Services restart on failure
- **Workers**: Multiple Gunicorn workers for backend

### Starting Production

```bash
# Start all services
./docker-prod.sh start

# Start with Nginx reverse proxy
./docker-prod.sh nginx

# Check health
./docker-prod.sh health

# View logs
./docker-prod.sh logs

# Restart
./docker-prod.sh restart
```

### Production Commands

```bash
# Service management
./docker-prod.sh start            # Start services
./docker-prod.sh stop             # Stop services
./docker-prod.sh restart          # Restart services
./docker-prod.sh rebuild          # Rebuild and restart

# Monitoring
./docker-prod.sh status           # Show service status
./docker-prod.sh health           # Check health endpoints
./docker-prod.sh logs [service]   # View logs

# Database
./docker-prod.sh backup           # Backup database
```

### Production Environment Variables

Production `.env` should have:

```env
APP_ENV=production
DEBUG=false
LOG_LEVEL=warning
DATABASE_URL=sqlite:///./data/app.db
SECRET_KEY=<generate-secure-key>
ANTHROPIC_API_KEY=<your-key>
```

### Resource Limits

From `docker-compose.prod.yml`:

**Backend**:
- CPU Limit: 2.0 cores
- Memory Limit: 2GB
- CPU Reservation: 0.5 cores
- Memory Reservation: 512MB

**Frontend**:
- CPU Limit: 1.0 core
- Memory Limit: 512MB
- CPU Reservation: 0.25 cores
- Memory Reservation: 128MB

### Health Checks

Both services have automatic health checks:

**Backend**: `http://localhost:8000/health` every 30s
**Frontend**: `http://localhost:3000/` every 30s

### Nginx Reverse Proxy (Optional)

```bash
# Start with Nginx
./docker-prod.sh nginx

# Access via:
# http://localhost (port 80)
# https://localhost (port 443, requires SSL setup)
```

Configure Nginx in `./nginx/nginx.conf`

---

## Database Management

### SQLite Database Location

```
./data/app.db           # Main database file
./data/backups/         # Backup directory
```

### Backup Database

```bash
# Using helper script
./scripts/db-backup.sh

# Or from Docker script
./docker-dev.sh backup
./docker-prod.sh backup

# Manual backup
cp ./data/app.db ./data/backups/app-manual-$(date +%Y%m%d-%H%M%S).db
```

### Restore Database

```bash
# Interactive restore (choose from list)
./scripts/db-restore.sh

# Restore latest backup
./scripts/db-restore.sh latest

# Restore specific backup
./scripts/db-restore.sh file ./data/backups/app-20231115-143022.db

# List available backups
./scripts/db-restore.sh list
```

### Database Migrations

```bash
# Run migrations
docker compose exec backend alembic upgrade head

# Create new migration
docker compose exec backend alembic revision --autogenerate -m "description"

# Check migration status
docker compose exec backend alembic current

# View migration history
docker compose exec backend alembic history
```

### Database Access

```bash
# Open SQLite shell
docker compose exec backend sqlite3 /app/data/app.db

# Common SQLite commands
.tables                 # List tables
.schema users           # Show schema for users table
SELECT * FROM users;    # Query users
.exit                   # Exit
```

### Automated Backups

Create a cron job for regular backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/TheProgram && ./scripts/db-backup.sh
```

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Symptom**: Error starting services, port 8000 or 3000 already bound

**Solution**:
```bash
# Check what's using the port
sudo lsof -i :8000
sudo lsof -i :3000

# Kill the process or change port in .env
BACKEND_PORT=8001
FRONTEND_PORT=3001
```

#### 2. Database Migration Errors

**Symptom**: Backend fails with database errors

**Solution**:
```bash
# Reset and recreate migrations
./docker-dev.sh shell-backend
rm -rf alembic/versions/*.py  # Careful!
alembic revision --autogenerate -m "initial"
alembic upgrade head
```

#### 3. Permission Errors on Database

**Symptom**: Cannot write to database file

**Solution**:
```bash
# Fix permissions on data directory
sudo chown -R $USER:$USER ./data
chmod -R 755 ./data
```

#### 4. Frontend Not Hot Reloading

**Symptom**: Code changes don't reflect in browser

**Solution**:
```bash
# Ensure polling is enabled
# Check docker-compose.dev.yml has:
# CHOKIDAR_USEPOLLING=true

# Restart frontend
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart frontend
```

#### 5. Backend Health Check Failing

**Symptom**: Backend container keeps restarting

**Solution**:
```bash
# Check logs
./docker-dev.sh logs backend

# Common causes:
# - Database migration not run
# - Missing environment variables
# - Port conflict

# Manual health check
curl http://localhost:8000/health
```

#### 6. Database Locked Error

**Symptom**: "Database is locked" error

**Solution**:
```bash
# SQLite doesn't support concurrent writes well
# Ensure only one backend instance is running

# Stop all services
./docker-dev.sh stop

# Start fresh
./docker-dev.sh up
```

### Debugging Commands

```bash
# View all container logs
docker compose logs

# Inspect container
docker inspect theprogram_backend

# Check container resources
docker stats

# View container processes
docker compose top

# Execute commands in container
docker compose exec backend bash
docker compose exec frontend sh

# Check environment variables
docker compose exec backend env

# Test database connection
docker compose exec backend python -c "from app.core.database import engine; print(engine)"
```

### Complete Reset

If everything is broken:

```bash
# Stop all services
./docker-dev.sh stop

# Remove all containers and volumes
./docker-dev.sh cleanup

# Rebuild from scratch
./docker-dev.sh rebuild

# Start fresh
./docker-dev.sh up
```

---

## Advanced Configuration

### Custom Docker Compose Files

```bash
# Create custom overrides
cp docker-compose.yml docker-compose.custom.yml

# Use multiple compose files
docker compose -f docker-compose.yml -f docker-compose.custom.yml up
```

### Environment-Specific Configurations

```env
# .env.development
APP_ENV=development
DEBUG=true

# .env.production
APP_ENV=production
DEBUG=false

# Use with:
docker compose --env-file .env.development up
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect theprogram_ephemeris_data

# Backup volume
docker run --rm -v theprogram_ephemeris_data:/data -v $(pwd):/backup alpine tar czf /backup/ephemeris-backup.tar.gz /data

# Restore volume
docker run --rm -v theprogram_ephemeris_data:/data -v $(pwd):/backup alpine tar xzf /backup/ephemeris-backup.tar.gz -C /
```

### Network Configuration

```bash
# Inspect network
docker network inspect theprogram_theprogram_network

# Connect external container
docker network connect theprogram_theprogram_network other_container
```

### Performance Tuning

**Backend Optimization**:
```yaml
# In docker-compose.prod.yml
command: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
# Adjust workers (-w) based on CPU cores: (2 * cores) + 1
```

**SQLite Optimization**:
```python
# In backend/app/core/database.py
engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,
        "isolation_level": None,
    },
    pool_pre_ping=True,
)
```

### Security Hardening

1. **Change default secrets**:
```bash
# Generate secure SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```

2. **Run as non-root** (already configured):
   - Backend runs as user `appuser` (UID 1000)
   - Frontend runs as user `appuser` (UID 1000)

3. **Limit network exposure**:
```yaml
# Only expose to localhost
ports:
  - "127.0.0.1:8000:8000"
  - "127.0.0.1:3000:3000"
```

4. **Use secrets for sensitive data**:
```yaml
secrets:
  anthropic_key:
    file: ./secrets/anthropic_api_key.txt
```

### Monitoring and Logging

**Centralized Logging**:
```yaml
# In docker-compose.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Log Aggregation**:
```bash
# View all logs
docker compose logs -f

# Export logs
docker compose logs > app-logs-$(date +%Y%m%d).log
```

### Continuous Deployment

```bash
#!/bin/bash
# deploy.sh - Automated deployment script

set -e

echo "Pulling latest changes..."
git pull origin main

echo "Backing up database..."
./scripts/db-backup.sh

echo "Rebuilding containers..."
./docker-prod.sh rebuild

echo "Checking health..."
sleep 10
./docker-prod.sh health

echo "Deployment complete!"
```

---

## File Structure Reference

```
TheProgram/
├── docker-compose.yml              # Main compose file (base)
├── docker-compose.dev.yml          # Development overrides
├── docker-compose.prod.yml         # Production overrides
├── docker-dev.sh                   # Development helper script
├── docker-prod.sh                  # Production helper script
├── .env                            # Environment variables
├── .env.example                    # Environment template
│
├── backend/
│   ├── Dockerfile                  # Backend container definition
│   ├── requirements.txt            # Python dependencies
│   └── app/                        # Application code
│
├── frontend/
│   ├── Dockerfile                  # Frontend production container
│   ├── Dockerfile.dev              # Frontend development container
│   ├── nginx.conf                  # Nginx configuration
│   └── src/                        # React source code
│
├── data/
│   ├── app.db                      # SQLite database
│   └── backups/                    # Database backups
│
├── scripts/
│   ├── db-backup.sh                # Database backup script
│   └── db-restore.sh               # Database restore script
│
└── nginx/
    ├── nginx.conf                  # Reverse proxy config
    └── ssl/                        # SSL certificates
```

---

## Support and Resources

### Documentation

- FastAPI: https://fastapi.tiangolo.com/
- React: https://react.dev/
- Docker Compose: https://docs.docker.com/compose/
- SQLite: https://www.sqlite.org/docs.html

### Useful Commands Cheat Sheet

```bash
# Development
./docker-dev.sh up              # Start development
./docker-dev.sh logs backend    # View backend logs
./docker-dev.sh shell-backend   # Backend shell
./docker-dev.sh test            # Run tests
./docker-dev.sh backup          # Backup database

# Production
./docker-prod.sh start          # Start production
./docker-prod.sh health         # Check health
./docker-prod.sh backup         # Backup database
./docker-prod.sh rebuild        # Rebuild containers

# Database
./scripts/db-backup.sh          # Backup database
./scripts/db-restore.sh         # Restore database
docker compose exec backend alembic upgrade head  # Run migrations

# Debugging
docker compose logs -f          # All logs
docker compose ps               # Service status
docker compose top              # Running processes
docker stats                    # Resource usage
```

---

## Version History

- **v2.0** (Current): SQLite single-user architecture
  - Removed PostgreSQL and Redis containers
  - Simplified to 2 services (backend + frontend)
  - Added database backup/restore scripts
  - Updated documentation for new architecture

- **v1.0**: Multi-user PostgreSQL architecture
  - PostgreSQL database container
  - Redis caching container
  - Complex multi-service setup

---

**For additional help, check the logs and error messages. Most issues can be resolved by checking the troubleshooting section or restarting services.**
