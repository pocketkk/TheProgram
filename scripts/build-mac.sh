#!/bin/bash
# Build script for The Program - macOS release
# Builds Python backend (PyInstaller) and Electron app for macOS
#
# Requirements:
# - macOS (for native builds)
# - Python 3.10+ with virtual environment
# - Node.js 18+
# - Xcode Command Line Tools
#
# Optional for code signing:
# - Apple Developer account
# - Set CSC_LINK and CSC_KEY_PASSWORD environment variables

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
SKIP_SIGN=false
ARCH=""  # Build for current architecture by default

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-sign)
            SKIP_SIGN=true
            shift
            ;;
        --arch)
            ARCH="$2"
            shift 2
            ;;
        --universal)
            ARCH="universal"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--no-sign] [--arch x64|arm64|universal]"
            exit 1
            ;;
    esac
done

echo "======================================"
echo "  Building The Program for macOS"
echo "======================================"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "ERROR: This script must be run on macOS"
    echo "For cross-platform builds, consider using GitHub Actions or a CI service."
    exit 1
fi

cd "$PROJECT_ROOT"

# Step 0: Generate icons if missing
if [ ! -f "build/icon.icns" ]; then
    echo "[0/4] Generating icons..."
    ./scripts/generate-icons.sh
    echo ""
fi

# Step 1: Build Python backend with PyInstaller
echo "[1/4] Building Python backend..."
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

# Build with PyInstaller
pyinstaller --clean --noconfirm main.spec 2>&1 | grep -E "(INFO: Build|ERROR|WARNING:)" || true
echo "      Backend build complete."
cd "$PROJECT_ROOT"

# Copy backend dist to project root for electron-builder
rm -rf dist/backend
mkdir -p dist
cp -r backend/dist/backend dist/backend
echo "      Backend copied to dist/backend."

# Step 2: Build frontend (Vite)
echo "[2/4] Building frontend..."
cd frontend
npm run build 2>&1 | tail -5
echo "      Frontend build complete."
cd "$PROJECT_ROOT"

# Step 3: Compile Electron TypeScript
echo "[3/4] Compiling Electron..."
npm run build:electron 2>&1 | tail -3 || true
echo "      Electron compiled."

# Step 4: Package with Electron Builder
echo "[4/4] Packaging macOS app..."

# Set architecture flag if specified
ARCH_FLAG=""
if [ -n "$ARCH" ]; then
    case $ARCH in
        x64)
            ARCH_FLAG="--x64"
            ;;
        arm64)
            ARCH_FLAG="--arm64"
            ;;
        universal)
            ARCH_FLAG="--universal"
            ;;
    esac
fi

# Handle code signing
if [ "$SKIP_SIGN" = true ]; then
    echo "      Skipping code signing (--no-sign specified)"
    export CSC_IDENTITY_AUTO_DISCOVERY=false
elif [ -z "$CSC_LINK" ]; then
    echo "      Note: No code signing certificate found (CSC_LINK not set)"
    echo "      Building unsigned app. For distribution, set up code signing."
    export CSC_IDENTITY_AUTO_DISCOVERY=false
fi

# Run electron-builder
npm run dist:mac -- $ARCH_FLAG 2>&1 | grep -E "(packaging|building|target=|Built)" || true

echo ""
echo "======================================"
echo "  Build Complete!"
echo "======================================"
echo ""
echo "Output files:"
ls -lh release/*.dmg release/*.zip 2>/dev/null || echo "  (checking for app bundles...)"
ls -lh release/mac*/*.app 2>/dev/null || echo ""
echo ""

# Print next steps
if [ -z "$CSC_LINK" ] && [ "$SKIP_SIGN" = false ]; then
    echo "NOTE: The app is not code signed."
    echo "Users may need to right-click and 'Open' on first launch."
    echo ""
    echo "For proper distribution, set up code signing:"
    echo "  1. Enroll in Apple Developer Program"
    echo "  2. Create a Developer ID Application certificate"
    echo "  3. Export as .p12 and set:"
    echo "     export CSC_LINK=/path/to/certificate.p12"
    echo "     export CSC_KEY_PASSWORD=your-password"
    echo ""
fi

echo "To install: Drag 'The Program.app' to Applications"
