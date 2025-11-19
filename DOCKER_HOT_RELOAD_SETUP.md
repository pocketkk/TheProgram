# Docker Hot Reload Development Setup

**Date**: November 1, 2025
**Status**: ✅ Complete
**Time Spent**: ~20 minutes

---

## Overview

The Docker environment has been configured with **hot reload** for both frontend and backend, allowing you to see changes instantly without rebuilding containers.

---

## Quick Start

### Start Development Environment (with hot reload)
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Stop Development Environment
```bash
docker compose down
```

### View Logs
```bash
# Frontend (Vite dev server)
docker logs theprogram_frontend --tail 50 -f

# Backend (FastAPI with --reload)
docker logs theprogram_backend --tail 50 -f

# All containers
docker compose logs -f
```

### Rebuild After Dependency Changes
```bash
# Rebuild specific service
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build frontend

# Rebuild all services
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

---

## What Was Changed

### 1. Created Development Docker Compose Override
**File**: `docker-compose.dev.yml`

This file extends the base `docker-compose.yml` with development-specific configuration:

**Frontend Changes:**
- Uses `Dockerfile.dev` instead of production Dockerfile
- Mounts source code as volumes for hot reload
- Runs `npm run dev` (Vite dev server) instead of serving production build
- Enables `CHOKIDAR_USEPOLLING` for better file watching in Docker
- Sets `NODE_ENV=development`

**Backend Changes:**
- Mounts `app/` and `alembic/` directories for hot reload
- Runs uvicorn with `--reload` flag
- Sets `DEBUG=true` and `LOG_LEVEL=debug`

### 2. Created Development Dockerfile for Frontend
**File**: `frontend/Dockerfile.dev`

Lightweight Dockerfile that:
- Installs dependencies
- Runs Vite dev server (port 3000)
- Allows volume mounts to override source files

### 3. Updated Vite Configuration
**File**: `frontend/vite.config.ts`

**Added:**
```typescript
server: {
  host: '0.0.0.0', // Allow external connections (required for Docker)
  port: 3000,
  watch: {
    usePolling: true, // Required for file watching in Docker
    interval: 1000,
  },
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL || 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

**Why these settings matter:**
- `host: '0.0.0.0'` - Allows connections from outside the container
- `usePolling: true` - Docker can't use native file watching, polling is required
- `interval: 1000` - Check for file changes every second

---

## How It Works

### Frontend Hot Reload

1. **Volume Mounts**: Source code directories are mounted from your local machine:
   ```yaml
   volumes:
     - ./frontend/src:/app/src
     - ./frontend/public:/app/public
     - ./frontend/index.html:/app/index.html
     # ... config files
   ```

2. **Vite Dev Server**: Runs inside the container on port 3000
   - Watches mounted directories for changes
   - Uses polling to detect file changes
   - Hot Module Replacement (HMR) enabled by default

3. **Workflow**:
   - Edit files locally (e.g., `frontend/src/App.tsx`)
   - Vite detects change via polling
   - Browser automatically updates (HMR)
   - No rebuild needed!

### Backend Hot Reload

1. **Volume Mounts**: Python code is mounted:
   ```yaml
   volumes:
     - ./backend/app:/app/app
     - ./backend/alembic:/app/alembic
   ```

2. **Uvicorn --reload**: Watches for `.py` file changes
   - Automatically restarts the server when files change
   - Uses native file watching (works in Docker)

3. **Workflow**:
   - Edit files locally (e.g., `backend/app/main.py`)
   - Uvicorn detects change
   - Server restarts automatically (~1-2 seconds)
   - API updated instantly

---

## File Structure

```
TheProgram/
├── docker-compose.yml          # Base configuration
├── docker-compose.dev.yml      # Development overrides (NEW)
├── frontend/
│   ├── Dockerfile              # Production build
│   ├── Dockerfile.dev          # Development mode (NEW)
│   ├── vite.config.ts          # Updated for Docker (MODIFIED)
│   └── src/                    # Hot reload enabled
└── backend/
    ├── Dockerfile              # Production build
    └── app/                    # Hot reload enabled
```

---

## Port Mapping

| Service | Port | URL | Mode |
|---------|------|-----|------|
| **Frontend** | 3000 | http://localhost:3000 | Vite Dev Server (HMR) |
| **Backend** | 8000 | http://localhost:8000 | FastAPI (auto-reload) |
| **Database** | 5433 | postgresql://localhost:5433 | PostgreSQL 14 |

---

## Testing Hot Reload

### Test Frontend Hot Reload

1. **Edit a component:**
   ```bash
   # Edit any React component
   nano frontend/src/App.tsx
   ```

2. **Make a visible change:**
   ```typescript
   // Add a test message
   <h1>Hot Reload Test - Updated!</h1>
   ```

3. **Save the file**
   - Browser should update within 1-2 seconds
   - Check browser console for "HMR update" messages

4. **Verify in Docker logs:**
   ```bash
   docker logs theprogram_frontend --tail 20
   ```
   Look for: `hmr update /src/App.tsx`

### Test Backend Hot Reload

1. **Edit an API endpoint:**
   ```bash
   nano backend/app/main.py
   ```

2. **Make a change:**
   ```python
   @app.get("/test-reload")
   def test_reload():
       return {"message": "Backend hot reload works!"}
   ```

3. **Save the file**
   - Check logs for server restart

4. **Verify in Docker logs:**
   ```bash
   docker logs theprogram_backend --tail 20
   ```
   Look for: `Application startup complete`

5. **Test the endpoint:**
   ```bash
   curl http://localhost:8000/test-reload
   ```

---

## Troubleshooting

### Hot Reload Not Working

**Issue**: Changes don't appear in browser

**Solutions**:
1. **Check Vite is using polling:**
   ```bash
   docker logs theprogram_frontend --tail 50
   # Should see: "VITE v5.4.20 ready in XXX ms"
   ```

2. **Verify volume mounts:**
   ```bash
   docker exec theprogram_frontend ls -la /app/src
   # Should show your local files
   ```

3. **Check for file permission issues:**
   ```bash
   # Ensure files are readable
   chmod -R 755 frontend/src/
   ```

4. **Hard refresh browser:**
   - Chrome/Firefox: `Ctrl+Shift+R` or `Cmd+Shift+R`
   - Clear browser cache if needed

### Backend Reload Not Working

**Issue**: Python code changes don't restart server

**Solutions**:
1. **Check uvicorn is using --reload:**
   ```bash
   docker logs theprogram_backend --tail 100 | grep reload
   # Should see: "uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
   ```

2. **Verify volume mounts:**
   ```bash
   docker exec theprogram_backend ls -la /app/app
   # Should show your local Python files
   ```

3. **Check for syntax errors:**
   ```bash
   docker logs theprogram_backend --tail 50
   # Look for Python errors
   ```

### Port Already in Use

**Issue**: `Error: port 3000 already allocated`

**Solutions**:
1. **Stop conflicting processes:**
   ```bash
   # Kill other dev servers
   lsof -ti:3000 | xargs kill -9
   lsof -ti:8000 | xargs kill -9
   ```

2. **Or change ports in `.env`:**
   ```bash
   FRONTEND_PORT=3001
   BACKEND_PORT=8001
   ```

### Changes Take Too Long to Appear

**Issue**: 10+ second delay for hot reload

**Solutions**:
1. **Reduce polling interval** (in `vite.config.ts`):
   ```typescript
   watch: {
     usePolling: true,
     interval: 500, // Faster, but more CPU usage
   }
   ```

2. **Check Docker resource limits:**
   - Ensure Docker has enough CPU/RAM allocated
   - Docker Desktop: Settings → Resources

---

## Performance Optimization

### Faster File Watching

**Current Configuration:**
- Polling interval: 1000ms (1 second)
- Trade-off: Balance between CPU usage and responsiveness

**Faster (more CPU):**
```typescript
// frontend/vite.config.ts
watch: {
  usePolling: true,
  interval: 500, // Check every 500ms
}
```

**Slower (less CPU):**
```typescript
watch: {
  usePolling: true,
  interval: 2000, // Check every 2 seconds
}
```

### Exclude Unnecessary Files

Add to `vite.config.ts`:
```typescript
server: {
  watch: {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/coverage/**',
    ],
  },
}
```

---

## Production vs Development

### Development Mode (Current Setup)
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```
- ✅ Hot reload enabled
- ✅ Source maps available
- ✅ Detailed error messages
- ✅ Debug logging
- ⚠️ Larger bundle size
- ⚠️ Slower performance
- ⚠️ NOT suitable for production

### Production Mode (Original Setup)
```bash
docker compose -f docker-compose.yml up -d --build
```
- ✅ Optimized bundle (minified)
- ✅ Fast performance
- ✅ Small bundle size
- ❌ No hot reload
- ❌ Requires rebuild for changes
- ✅ Production-ready

---

## Workflow Recommendations

### Daily Development

1. **Start containers once:**
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

2. **Edit code normally** - changes auto-update

3. **View logs when needed:**
   ```bash
   docker compose logs -f frontend backend
   ```

4. **Stop at end of day:**
   ```bash
   docker compose down
   ```

### After Dependency Changes

Rebuild when you:
- Add/remove npm packages (`package.json` changes)
- Add/remove Python packages (`requirements.txt` changes)
- Change Dockerfile or docker-compose config

```bash
# Rebuild only the service that changed
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build frontend

# Or rebuild everything
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Testing Production Build

Before deploying, test the production build:

```bash
# Stop dev environment
docker compose down

# Start production environment
docker compose -f docker-compose.yml up -d --build

# Test at http://localhost:3000

# Switch back to dev
docker compose down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

---

## Environment Variables

Create `.env` file in project root to customize:

```bash
# Frontend
FRONTEND_PORT=3000
VITE_API_URL=http://localhost:8000

# Backend
BACKEND_PORT=8000
DEBUG=true
LOG_LEVEL=debug

# Database
POSTGRES_PORT=5432
POSTGRES_DB=theprogram_db
POSTGRES_USER=theprogram
POSTGRES_PASSWORD=your_secure_password_here
```

---

## Summary

**What You Get:**
- ✅ Instant frontend updates via Vite HMR
- ✅ Automatic backend reloads via uvicorn --reload
- ✅ Full development environment in Docker
- ✅ Consistent environment across team members
- ✅ Easy switch between dev and production modes

**How to Use:**
```bash
# Start dev mode (hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Edit code → See changes instantly

# View logs
docker compose logs -f

# Stop
docker compose down
```

**Access:**
- Frontend: http://localhost:3000 (Vite dev server with HMR)
- Backend: http://localhost:8000 (FastAPI with auto-reload)
- API Docs: http://localhost:8000/docs

---

## Next Steps

1. **Try it out**: Make a change to any file and watch it update
2. **Check logs**: Monitor the hot reload messages
3. **Customize**: Adjust polling intervals if needed
4. **Share**: Team members can use the same setup

**🎉 Development environment with hot reload is now ready!**
