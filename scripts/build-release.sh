#!/bin/bash
# Build script for The Program release
# Automatically detects OS and builds for the current platform
#
# Usage:
#   ./scripts/build-release.sh              # Build for current platform
#   ./scripts/build-release.sh --linux      # Force Linux build
#   ./scripts/build-release.sh --mac        # Force macOS build (requires macOS)
#   ./scripts/build-release.sh --no-sign    # macOS: skip code signing

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
FORCE_PLATFORM=""
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --linux)
            FORCE_PLATFORM="linux"
            shift
            ;;
        --mac|--macos)
            FORCE_PLATFORM="mac"
            shift
            ;;
        --no-sign)
            EXTRA_ARGS="$EXTRA_ARGS --no-sign"
            shift
            ;;
        *)
            EXTRA_ARGS="$EXTRA_ARGS $1"
            shift
            ;;
    esac
done

# Detect platform
if [ -n "$FORCE_PLATFORM" ]; then
    PLATFORM="$FORCE_PLATFORM"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="mac"
elif [[ "$OSTYPE" == "linux"* ]]; then
    PLATFORM="linux"
else
    echo "ERROR: Unsupported platform: $OSTYPE"
    echo "Supported: macOS (darwin), Linux"
    exit 1
fi

echo "======================================"
echo "  Building The Program for ${PLATFORM^}"
echo "======================================"
echo ""

cd "$PROJECT_ROOT"

# For macOS, use the dedicated build script
if [ "$PLATFORM" = "mac" ]; then
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo "ERROR: macOS builds must be performed on macOS"
        echo "Use GitHub Actions or a macOS CI service for cross-platform builds."
        exit 1
    fi
    exec "$SCRIPT_DIR/build-mac.sh" $EXTRA_ARGS
fi

# Linux build follows below

# Step 0: Generate icons if missing
if [ ! -f "build/icon.png" ]; then
    echo "[0/3] Generating icons..."
    ./scripts/generate-icons.sh || echo "      (icon generation skipped)"
    echo ""
fi

# Step 1: Build Python backend with PyInstaller
echo "[1/3] Building Python backend..."
cd backend
if [ -d "test_venv" ]; then
    source test_venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "ERROR: Virtual environment not found."
    echo "Please create one with: python3 -m venv test_venv && source test_venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

pyinstaller --clean --noconfirm main.spec 2>&1 | grep -E "(INFO: Build|ERROR|WARNING:)" || true
echo "      Backend build complete."
cd "$PROJECT_ROOT"

# Copy backend dist to project root for electron-builder
rm -rf dist/backend
mkdir -p dist
cp -r backend/dist/backend dist/backend
echo "      Backend copied to dist/backend."

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
