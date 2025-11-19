# Docker Setup for The Program

This guide explains how to run The Program using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Services](#services)
- [Configuration](#configuration)
- [Management Script](#management-script)
- [Manual Commands](#manual-commands)
- [Development Mode](#development-mode)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 4GB of available RAM
- 10GB of free disk space

### Install Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**Verify installation:**
```bash
docker --version
docker-compose --version
```

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd TheProgram
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   nano .env
   ```

   **IMPORTANT:** Generate a secure secret key for production:
   ```bash
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```
   Copy the output and set it as `SECRET_KEY` in your `.env` file.

3. **Start all services:**
   ```bash
   ./docker-dev.sh up
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Interactive API: http://localhost:8000/redoc

## Services

The Program consists of the following Docker services:

### Core Services (Always Running)

| Service | Port | Description |
|---------|------|-------------|
| **postgres** | 5432 | PostgreSQL 14 database |
| **backend** | 8000 | FastAPI backend application |
| **frontend** | 3000 | React + Vite frontend with Nginx |

### Optional Services (Profile-based)

| Service | Port | Profile | Description |
|---------|------|---------|-------------|
| **redis** | 6379 | `with-redis` | Redis cache for sessions/caching |
| **nginx** | 80, 443 | `with-nginx` | Reverse proxy for production |

To start with optional services:
```bash
./docker-dev.sh up --with-redis
# or
docker-compose --profile with-redis --profile with-nginx up -d
```

## Configuration

### Environment Variables

All configuration is managed through environment variables in the `.env` file:

#### Essential Variables

```bash
# Database
POSTGRES_USER=theprogram
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=theprogram_db

# Security
SECRET_KEY=your_generated_secret_key_here

# Application
APP_ENV=production  # development, staging, production
DEBUG=false
```

#### Optional Variables

```bash
# Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000
POSTGRES_PORT=5432

# Frontend API URL
VITE_API_URL=http://localhost:8000

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=info
```

### Docker Compose Profiles

Use profiles to enable optional services:

```bash
# Start with Redis
docker-compose --profile with-redis up -d

# Start with Nginx reverse proxy
docker-compose --profile with-nginx up -d

# Start with both
docker-compose --profile with-redis --profile with-nginx up -d
```

## Management Script

The `docker-dev.sh` script provides convenient commands for managing services.

### Available Commands

```bash
# Start services
./docker-dev.sh up
./docker-dev.sh up --with-redis

# Stop services
./docker-dev.sh down

# Restart services
./docker-dev.sh restart

# Rebuild everything
./docker-dev.sh rebuild

# View logs
./docker-dev.sh logs              # All services
./docker-dev.sh logs backend      # Specific service
./docker-dev.sh logs frontend

# Container status
./docker-dev.sh ps
./docker-dev.sh status

# Open shell in container
./docker-dev.sh shell backend
./docker-dev.sh shell frontend

# Database operations
./docker-dev.sh db-shell          # PostgreSQL shell
./docker-dev.sh db-migrate        # Run migrations
./docker-dev.sh db-reset          # Reset database (⚠️ deletes data)

# Testing
./docker-dev.sh test-backend
./docker-dev.sh test-frontend

# Cleanup
./docker-dev.sh clean             # Remove all containers and volumes
```

## Manual Commands

If you prefer using `docker-compose` directly:

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres backend

# Start with logs visible
docker-compose up
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last N lines
docker-compose logs --tail=50 backend
```

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec backend sh

# Run migrations
docker-compose exec backend alembic upgrade head

# Database shell
docker-compose exec postgres psql -U theprogram -d theprogram_db

# Frontend shell
docker-compose exec frontend sh
```

### Rebuild Services

```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild without cache
docker-compose build --no-cache
```

## Development Mode

For active development with live code reloading:

1. **Update docker-compose.yml** - Uncomment the volume mounts:

   ```yaml
   backend:
     volumes:
       - ./backend/app:/app/app
       - ./backend/alembic:/app/alembic
   ```

2. **Set environment variables:**

   ```bash
   APP_ENV=development
   DEBUG=true
   LOG_LEVEL=debug
   ```

3. **Start services:**

   ```bash
   docker-compose up
   ```

4. **Make changes** - Code changes will automatically reload!

### Development Tips

- Use `docker-compose up` (without `-d`) to see logs in real-time
- Frontend changes require a rebuild: `docker-compose build frontend`
- Backend changes reload automatically when volumes are mounted
- Use `docker-compose restart backend` after installing new packages

## Production Deployment

### Preparation

1. **Update .env for production:**

   ```bash
   APP_ENV=production
   DEBUG=false
   LOG_LEVEL=info

   # Generate secure keys
   SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
   POSTGRES_PASSWORD=$(python3 -c "import secrets; print(secrets.token_hex(32))")
   REDIS_PASSWORD=$(python3 -c "import secrets; print(secrets.token_hex(32))")
   ```

2. **Configure CORS:**

   ```bash
   CORS_ORIGINS=https://yourdomain.com
   ```

3. **Set production URLs:**

   ```bash
   VITE_API_URL=https://api.yourdomain.com
   ```

### Deployment Steps

1. **Build images:**

   ```bash
   docker-compose build --no-cache
   ```

2. **Start with all profiles:**

   ```bash
   docker-compose --profile with-redis --profile with-nginx up -d
   ```

3. **Run migrations:**

   ```bash
   docker-compose exec backend alembic upgrade head
   ```

4. **Verify health:**

   ```bash
   curl http://localhost:8000/health
   curl http://localhost:3000/health
   ```

### Production Best Practices

- **Use Docker secrets** for sensitive data
- **Set up SSL/TLS** with Let's Encrypt
- **Configure backups** for PostgreSQL volumes
- **Monitor logs** with a logging aggregator
- **Use a reverse proxy** (nginx profile) for better performance
- **Enable Redis** for caching and sessions
- **Set resource limits** in docker-compose.yml:

  ```yaml
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
  ```

## Troubleshooting

### Common Issues

#### Services won't start

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend

# Verify all containers are running
docker-compose ps
```

#### Database connection errors

```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U theprogram

# View database logs
docker-compose logs postgres

# Reset database
./docker-dev.sh db-reset
```

#### Port already in use

```bash
# Find process using port
sudo lsof -i :8000
sudo lsof -i :3000

# Change ports in .env
BACKEND_PORT=8001
FRONTEND_PORT=3001
```

#### Frontend can't connect to backend

1. Check CORS settings in `.env`:
   ```bash
   CORS_ORIGINS=http://localhost:3000
   ```

2. Verify backend is running:
   ```bash
   curl http://localhost:8000/health
   ```

3. Check frontend environment:
   ```bash
   docker-compose exec frontend env | grep VITE_API_URL
   ```

#### Out of disk space

```bash
# Remove unused Docker resources
docker system prune -a --volumes

# Check disk usage
docker system df
```

### Debug Mode

Enable detailed logging:

```bash
# In .env
DEBUG=true
LOG_LEVEL=debug

# Restart services
docker-compose restart
```

### Health Checks

Check service health:

```bash
# Backend
curl http://localhost:8000/health

# Frontend
curl http://localhost:3000/health

# Database
docker-compose exec postgres pg_isready

# All services
docker-compose ps
```

### Reset Everything

If all else fails:

```bash
# Stop and remove everything
./docker-dev.sh clean

# Remove all Docker data (⚠️ nuclear option)
docker system prune -a --volumes

# Start fresh
./docker-dev.sh up
```

## Useful Commands Reference

```bash
# View container resource usage
docker stats

# Inspect a container
docker inspect theprogram_backend

# View container network
docker network inspect theprogram_theprogram_network

# Execute Python in backend
docker-compose exec backend python

# Run alembic commands
docker-compose exec backend alembic history
docker-compose exec backend alembic current
docker-compose exec backend alembic downgrade -1

# Backup database
docker-compose exec postgres pg_dump -U theprogram theprogram_db > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U theprogram -d theprogram_db
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. View logs: `./docker-dev.sh logs`
3. Open an issue in the repository
