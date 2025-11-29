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

# Data locations
CONFIG_DIR="$HOME/.config/theprogram"
DB_FILE="$CONFIG_DIR/data/theprogram.db"
ELECTRON_DATA="$HOME/.config/The Program"

# Confirm before proceeding
read -p "This will DELETE all your data (charts, birth data, settings). Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Resetting user data...${NC}"

# 1. Remove SQLite database
if [ -f "$DB_FILE" ]; then
    rm -f "$DB_FILE"
    echo -e "${GREEN}✓${NC} Removed database: $DB_FILE"
else
    echo -e "${YELLOW}○${NC} No database found at: $DB_FILE"
fi

# 2. Remove Electron app data (includes localStorage)
if [ -d "$ELECTRON_DATA" ]; then
    rm -rf "$ELECTRON_DATA"
    echo -e "${GREEN}✓${NC} Removed Electron data: $ELECTRON_DATA"
else
    echo -e "${YELLOW}○${NC} No Electron data found at: $ELECTRON_DATA"
fi

# 3. Keep config directory structure but remove data files
if [ -d "$CONFIG_DIR/data" ]; then
    rm -rf "$CONFIG_DIR/data"/*
    echo -e "${GREEN}✓${NC} Cleared data directory: $CONFIG_DIR/data"
fi

# 4. Remove any alembic version tracking (forces fresh migrations)
ALEMBIC_DIR="$CONFIG_DIR/data/alembic"
if [ -d "$ALEMBIC_DIR" ]; then
    rm -rf "$ALEMBIC_DIR"
    echo -e "${GREEN}✓${NC} Removed alembic data"
fi

echo ""
echo -e "${GREEN}=== Reset Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Restart the backend server (it will recreate the database)"
echo "  2. Restart the Electron app"
echo "  3. You'll see the password setup screen as a new user"
echo ""
