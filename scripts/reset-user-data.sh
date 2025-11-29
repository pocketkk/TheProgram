#!/bin/bash
#
# Reset User Data Script
# Wipes all user data to simulate a fresh install
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== The Program - Reset User Data ===${NC}"
echo ""

# Data location - Electron stores everything here
APP_DATA_DIR="$HOME/.config/theprogram"

# Check if anything exists
if [ ! -d "$APP_DATA_DIR" ]; then
    echo -e "${YELLOW}No user data found at: $APP_DATA_DIR${NC}"
    echo "Nothing to reset."
    exit 0
fi

# Show what will be deleted
echo "This will delete ALL data in: $APP_DATA_DIR"
echo ""
echo "Including:"
echo "  - SQLite database (charts, birth data, settings)"
echo "  - Authentication state"
echo "  - API keys"
echo "  - Local storage & session data"
echo "  - Preferences"
echo ""

# Confirm before proceeding
read -p "Continue with full reset? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Resetting user data...${NC}"

# Remove the entire app data directory
rm -rf "$APP_DATA_DIR"
echo -e "${GREEN}✓${NC} Removed: $APP_DATA_DIR"

echo ""
echo -e "${GREEN}=== Reset Complete ===${NC}"
echo ""
echo "The app will start fresh with:"
echo "  - Password setup screen"
echo "  - No saved charts or birth data"
echo "  - No API key configured"
echo ""
echo "Just launch the app - no server restart needed."
echo ""
