# Electron Desktop App - Proof of Concept

## Summary

Successfully created a proof-of-concept Electron desktop application that integrates:

- **Electron Shell** - Cross-platform desktop app framework
- **Python FastAPI Backend** - Spawned as subprocess by Electron
- **React Frontend** - Loaded from Vite dev server (dev mode) or built files (production)

## Architecture

```
┌─────────────────────────────────────────────┐
│           ELECTRON APP                       │
│  ┌────────────────────────────────────────┐ │
│  │  RENDERER PROCESS (React + TypeScript) │ │
│  │  http://localhost:3001 (dev)           │ │
│  └────────────────────────────────────────┘ │
│                    ↕ HTTP                    │
│  ┌────────────────────────────────────────┐ │
│  │  MAIN PROCESS (Electron/Node.js)       │ │
│  │  - Window management                    │ │
│  │  - Python subprocess control            │ │
│  └────────────────────────────────────────┘ │
│                    ↓ spawn                   │
│  ┌────────────────────────────────────────┐ │
│  │  PYTHON SUBPROCESS (FastAPI)           │ │
│  │  http://localhost:8000                  │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## What Was Implemented

### 1. Directory Structure

```
TheProgram/
├── electron/                    # NEW - Electron main process
│   ├── main.ts                 # Main entry point, app lifecycle
│   ├── preload.ts              # Secure IPC bridge
│   ├── python-manager.ts       # Python subprocess controller
│   └── tsconfig.json           # TypeScript config
├── dist/electron/              # Compiled JavaScript files
├── frontend/                   # Existing React app
├── backend/                    # Existing FastAPI app
└── package.json                # Updated with Electron scripts
```

### 2. Core Files Created

**`electron/main.ts`**
- Electron main process entry point
- Creates application window
- Manages app lifecycle (ready, quit, etc.)
- Loads frontend from dev server (dev) or built files (prod)

**`electron/python-manager.ts`**
- Spawns Python backend subprocess
- Monitors stdout/stderr for startup completion
- Implements graceful shutdown with tree-kill
- Handles development vs production mode

**`electron/preload.ts`**
- Secure context bridge between main and renderer
- Exposes safe APIs: getApiUrl, isDev, getVersion, getUserDataPath

**`package.json` (updated)**
- Electron entry point: `dist/electron/main.js`
- New scripts for development and building
- Electron builder configuration for packaging

### 3. Key Features

✅ **Automatic Python Backend Spawning**
- Electron spawns Python/uvicorn on port 8000
- Waits for "Uvicorn running" message before showing window
- 5-second timeout fallback if message not detected

✅ **Development Mode Support**
- Uses system Python + uvicorn in dev mode
- Loads frontend from Vite dev server (localhost:3001)
- Opens DevTools automatically

✅ **Production Mode Ready**
- Will use bundled Python executable (PyInstaller - to be implemented)
- Will load frontend from built files
- No external dependencies needed

✅ **Graceful Shutdown**
- Uses tree-kill to terminate Python and all children
- Prevents orphan processes
- SIGTERM with SIGKILL fallback

✅ **Security**
- Context isolation enabled
- Node integration disabled in renderer
- Sandbox mode enabled

## How to Test the POC

### Prerequisites

```bash
# Frontend dev server must be running
cd frontend && npm run dev
# Should show: http://localhost:3001/

# Port 8000 must be free (no Python backend running)
pkill -f uvicorn
```

### Run Electron App

```bash
# From project root
npm run electron:start
```

This will:
1. Compile TypeScript files to `dist/electron/`
2. Start Electron in development mode
3. Spawn Python backend on port 8000
4. Open window loading frontend from localhost:3001

### Expected Behavior

**Console Output:**
```
[Electron] Main process loaded
[Electron] App ready event
[Electron] Initializing application...
[Electron] Mode: development
[Electron] User data: /home/sylvia/.config/theprogram
[Python] Starting backend (dev mode)...
[Python] Executable: python3
[Python] Working dir: /home/sylvia/ClaudeWork/TheProgram/backend
[Python] Args: -m uvicorn app.main:app --host 0.0.0.0 --port 8000
[Python] INFO:     Uvicorn running on http://0.0.0.0:8000
[Python] Backend started successfully
[Electron] Backend running at: http://localhost:8000
[Electron] Creating main window...
[Electron] Loading frontend from dev server: http://localhost:3001
[Electron] Window ready to show
[Electron] Application initialized successfully
```

**App Window:**
- Desktop window opens with React frontend
- DevTools open on the right
- Backend API calls work (localhost:8000/api)
- No CORS issues (both running on localhost)

### Verify HTTP Communication

```bash
# While Electron is running, test API
curl http://localhost:8000/health

# Should return:
# {"status":"ok","message":"The Program API is running"}
```

### Test Graceful Shutdown

1. Close the Electron window (X button or Cmd/Ctrl+Q)
2. Check console output:
```
[Electron] Before quit event
[Electron] Shutting down...
[Python] Stopping backend (PID xxxxx)...
[Python] Stopped successfully
[Electron] Backend stopped
[Electron] Will quit event
```
3. Verify no orphan processes:
```bash
ps aux | grep uvicorn  # Should show nothing
ss -tlnp | grep :8000   # Should show nothing
```

## Available Scripts

```bash
# Compile TypeScript
npm run electron:compile

# Start Electron (dev mode)
npm run electron:dev

# Compile + start
npm run electron:start

# Full development (watch mode + frontend + backend + electron)
npm run dev:all

# Build everything for production
npm run build:all

# Package desktop app (Linux)
npm run dist:linux
```

## Next Steps

### Phase 2: Production Bundling (Not Yet Implemented)

1. **PyInstaller Setup**
   - Create `backend/main.spec`
   - Bundle Python + FastAPI + dependencies
   - Include Swiss Ephemeris data files
   - Test standalone executable

2. **Frontend Building**
   - Build React app with Vite
   - Electron loads from `frontend/dist/`
   - Update asset paths for file:// protocol

3. **Electron Builder Configuration**
   - Package app with electron-builder
   - Create AppImage and .deb for Linux
   - Include bundled Python + frontend
   - Set up auto-updater

4. **Testing**
   - Test on clean system without Python
   - Verify all dependencies bundled
   - Test database creation in user data dir
   - Verify ephemeris data loads correctly

### Phase 3: Cross-Platform Support

1. **Windows Support**
   - PyInstaller .exe generation
   - NSIS installer
   - Windows-specific paths

2. **macOS Support**
   - PyInstaller macOS bundle
   - .app package
   - Code signing (requires Apple Developer)

## Current Status

✅ **Completed:**
- Branch created: `desktop-electron-poc`
- Electron dependencies installed
- Directory structure created
- Main process implementation
- Python subprocess manager
- Preload security bridge
- TypeScript compilation
- Development mode configuration

⏳ **In Progress:**
- Testing Electron launch with Python backend
- Verifying HTTP communication
- Testing frontend loading
- Testing graceful shutdown

🔲 **Not Started:**
- PyInstaller bundling
- Production mode implementation
- electron-builder packaging
- Cross-platform testing
- Distribution setup

## Known Issues

1. **Frontend Import Errors**: The ClientsPage has import errors for ExportButton/ImportWizard from data-portability feature. This doesn't prevent the app from running but should be fixed.

2. **Many Background Processes**: Previous testing sessions left many background Python/frontend processes running. These should be cleaned up.

## Benefits Over Docker Approach

✅ **No CORS Issues** - Everything runs on localhost
✅ **No Port Mapping** - Simple localhost:8000 and localhost:3001
✅ **No Container Complexity** - Direct Python subprocess
✅ **Faster Startup** - No container overhead
✅ **Simpler Development** - Standard npm scripts
✅ **Cross-Platform** - Same app on Linux/Windows/macOS
✅ **Offline Capable** - No network dependencies
✅ **Single Executable** - Eventually bundles everything

## Technical Details

**Python Subprocess Environment:**
- `PYTHONUNBUFFERED=1` - Disable output buffering
- `USER_DATA_DIR` - Points to Electron's userData path
- `PORT` - Backend port (8000)
- `APP_ENV` - development or production
- `LOG_LEVEL` - debug (dev) or info (prod)

**Process Management:**
- Uses `tree-kill` npm package for reliable termination
- SIGTERM for graceful shutdown
- SIGKILL fallback after 3 seconds
- Monitors process exit codes

**Security:**
- Context isolation prevents renderer access to Node.js
- Preload script provides safe, controlled API
- No direct IPC from renderer
- Sandbox mode enabled

## File Sizes (POC)

```
dist/electron/
├── main.js          5.8K
├── preload.js       987B
└── python-manager.js 6.1K

Total compiled JS: ~13KB
```

Future bundled app (estimated):
- Electron runtime: ~150MB
- Python + dependencies: ~100MB
- Frontend built files: ~5MB
- Swiss Ephemeris data: ~20MB
- **Total**: ~275MB (typical for Electron+Python apps)
