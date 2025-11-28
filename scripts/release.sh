#!/bin/bash
# Release script for The Program
# Usage: ./scripts/release.sh [version]
# Example: ./scripts/release.sh 1.1.0

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  The Program - Release Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get version
if [ -n "$1" ]; then
    VERSION="$1"
else
    # Read current version from package.json
    CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*: "\(.*\)".*/\1/')
    echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"
    read -p "Enter new version (or press Enter to keep current): " VERSION
    VERSION="${VERSION:-$CURRENT_VERSION}"
fi

echo -e "\n${BLUE}Preparing release v$VERSION${NC}\n"

# Step 1: Run tests
echo -e "${YELLOW}Step 1: Running tests...${NC}"
echo "  Backend tests..."
cd backend
if source test_venv/bin/activate 2>/dev/null && pytest -q --tb=no; then
    echo -e "  ${GREEN}Backend tests passed${NC}"
else
    echo -e "  ${RED}Backend tests failed${NC}"
    exit 1
fi
cd ..

echo "  Frontend tests..."
cd frontend
if npm run test:run --silent 2>/dev/null; then
    echo -e "  ${GREEN}Frontend tests passed${NC}"
else
    echo -e "  ${RED}Frontend tests failed${NC}"
    exit 1
fi
cd ..

# Step 2: Type checking
echo -e "\n${YELLOW}Step 2: Type checking...${NC}"
cd frontend
if npm run type-check --silent 2>/dev/null; then
    echo -e "  ${GREEN}Type check passed${NC}"
else
    echo -e "  ${RED}Type check failed${NC}"
    exit 1
fi
cd ..

# Step 3: Linting
echo -e "\n${YELLOW}Step 3: Linting...${NC}"
cd frontend
if npm run lint --silent 2>/dev/null; then
    echo -e "  ${GREEN}Lint passed${NC}"
else
    echo -e "  ${YELLOW}Lint warnings (continuing)${NC}"
fi
cd ..

# Step 4: Update version in package.json files
echo -e "\n${YELLOW}Step 4: Updating version to $VERSION...${NC}"

# Root package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
echo "  Updated package.json"

# Frontend package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" frontend/package.json
echo "  Updated frontend/package.json"

# Step 5: Update CHANGELOG.md
echo -e "\n${YELLOW}Step 5: Updating CHANGELOG...${NC}"
TODAY=$(date +%Y-%m-%d)

# Check if there's an Unreleased section with content
if grep -q "## \[Unreleased\]" CHANGELOG.md; then
    # Replace [Unreleased] with version and date, add new Unreleased section
    sed -i "s/## \[Unreleased\]/## [Unreleased]\n\n---\n\n## [$VERSION] - $TODAY/" CHANGELOG.md
    echo "  Updated CHANGELOG.md with version $VERSION"
else
    echo "  ${YELLOW}No Unreleased section found, skipping CHANGELOG update${NC}"
fi

# Step 6: Build
echo -e "\n${YELLOW}Step 6: Building application...${NC}"

echo "  Building frontend..."
cd frontend
npm run build --silent
cd ..
echo -e "  ${GREEN}Frontend built${NC}"

echo "  Building Electron..."
npm run electron:compile --silent
echo -e "  ${GREEN}Electron compiled${NC}"

# Step 7: Package
echo -e "\n${YELLOW}Step 7: Packaging for distribution...${NC}"
npm run dist:linux

# Step 8: Verify outputs
echo -e "\n${YELLOW}Step 8: Verifying outputs...${NC}"
if [ -f "release/The Program-$VERSION.AppImage" ] || [ -f "release/The Program-${VERSION}.AppImage" ]; then
    echo -e "  ${GREEN}AppImage created${NC}"
    ls -lh release/*.AppImage 2>/dev/null
else
    echo -e "  ${YELLOW}AppImage not found (may have different naming)${NC}"
    ls -lh release/*.AppImage 2>/dev/null || true
fi

if [ -f "release/theprogram_${VERSION}_amd64.deb" ] || ls release/*.deb 1>/dev/null 2>&1; then
    echo -e "  ${GREEN}Debian package created${NC}"
    ls -lh release/*.deb 2>/dev/null
else
    echo -e "  ${YELLOW}Debian package not found${NC}"
fi

# Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}Release v$VERSION prepared successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Output files in release/:"
ls -lh release/ 2>/dev/null | grep -E '\.(AppImage|deb)$' || echo "  (check release/ directory)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test the built packages"
echo "  2. Commit version changes: git add -A && git commit -m \"Release v$VERSION\""
echo "  3. Tag the release: git tag -a v$VERSION -m \"Version $VERSION\""
echo "  4. Push: git push && git push --tags"
echo "  5. Create GitHub release with the packages"
echo ""
