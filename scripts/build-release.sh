#!/bin/bash
# Build script for The Program release testing
# Builds both the Python backend (PyInstaller) and Electron app

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "======================================"
echo "  Building The Program for Release"
echo "======================================"
echo ""

cd "$PROJECT_ROOT"

# Step 1: Build Python backend with PyInstaller
echo "[1/3] Building Python backend..."
cd backend
if [ -d "test_venv" ]; then
    source test_venv/bin/activate
else
    echo "ERROR: test_venv not found. Please set up the backend environment first."
    exit 1
fi

pyinstaller --clean --noconfirm main.spec 2>&1 | grep -E "(INFO: Build|ERROR|WARNING:)" || true
echo "      Backend build complete."
cd "$PROJECT_ROOT"

# Step 2: Build frontend (Vite)
echo "[2/3] Building frontend..."
cd frontend
npm run build 2>&1 | tail -5
echo "      Frontend build complete."
cd "$PROJECT_ROOT"

# Step 3: Package with Electron Builder
echo "[3/3] Packaging Electron app..."
npm run dist:linux 2>&1 | grep -E "(packaging|building|target=)" || true

echo ""
echo "======================================"
echo "  Build Complete!"
echo "======================================"
echo ""
echo "Output files:"
ls -lh release/*.AppImage release/*.deb 2>/dev/null || echo "  (no release files found)"
echo ""
echo "Run with: ./release/The\\ Program-1.0.0.AppImage"
