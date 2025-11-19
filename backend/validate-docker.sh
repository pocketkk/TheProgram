#!/bin/bash

# ============================================================================
# Docker Setup Validation Script for The Program
# ============================================================================
# This script validates the Docker configuration before deployment
# Usage: ./validate-docker.sh
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Docker Setup Validation${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Track validation status
ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
    else
        echo -e "${RED}✗${NC} $1 missing"
        ERRORS=$((ERRORS + 1))
    fi
}

# Function to check if file is executable
check_executable() {
    if [ -x "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 is executable"
    else
        echo -e "${RED}✗${NC} $1 is not executable"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "1. Checking Docker files..."
echo "----------------------------"
check_file "Dockerfile"
check_file "docker-compose.yml"
check_file "docker-compose.dev.yml"
check_file ".dockerignore"
check_file ".env.docker"
check_file "docker-dev.sh"
check_file "nginx/nginx.conf"
check_file "DOCKER.md"
echo ""

echo "2. Checking executables..."
echo "----------------------------"
check_executable "docker-dev.sh"
echo ""

echo "3. Validating docker-compose.yml syntax..."
echo "----------------------------"
if docker-compose -f docker-compose.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} docker-compose.yml syntax is valid"
else
    echo -e "${RED}✗${NC} docker-compose.yml has syntax errors"
    ERRORS=$((ERRORS + 1))
fi
echo ""

echo "4. Validating development configuration..."
echo "----------------------------"
if docker-compose -f docker-compose.yml -f docker-compose.dev.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Development configuration is valid"
else
    echo -e "${RED}✗${NC} Development configuration has errors"
    ERRORS=$((ERRORS + 1))
fi
echo ""

echo "5. Checking .env file..."
echo "----------------------------"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"

    # Check for placeholder values
    if grep -q "CHANGE_ME" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC}  .env contains placeholder passwords (change for production)"
        WARNINGS=$((WARNINGS + 1))
    fi

    if grep -q "GENERATE_A_SECURE" .env 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC}  SECRET_KEY needs to be generated (use: openssl rand -hex 32)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC}  .env file not found (will be created from .env.docker on first run)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo "6. Checking Docker daemon..."
echo "----------------------------"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
    DOCKER_VERSION=$(docker --version)
    echo -e "  ${DOCKER_VERSION}"
else
    echo -e "${RED}✗${NC} Docker daemon is not running"
    ERRORS=$((ERRORS + 1))
fi
echo ""

echo "7. Checking Docker Compose..."
echo "----------------------------"
if docker-compose --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker Compose is installed"
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "  ${COMPOSE_VERSION}"
else
    echo -e "${RED}✗${NC} Docker Compose is not installed"
    ERRORS=$((ERRORS + 1))
fi
echo ""

echo "8. Checking application files..."
echo "----------------------------"
check_file "app/main.py"
check_file "app/core/config.py"
check_file "requirements.txt"
check_file "alembic.ini"
echo ""

echo "9. Checking directory structure..."
echo "----------------------------"
if [ -d "app" ]; then
    echo -e "${GREEN}✓${NC} app/ directory exists"
else
    echo -e "${RED}✗${NC} app/ directory missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "alembic" ]; then
    echo -e "${GREEN}✓${NC} alembic/ directory exists"
else
    echo -e "${RED}✗${NC} alembic/ directory missing"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "tests" ]; then
    echo -e "${GREEN}✓${NC} tests/ directory exists"
else
    echo -e "${YELLOW}⚠${NC}  tests/ directory missing"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo "Validation Summary"
echo -e "${GREEN}========================================${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your Docker setup is ready to use."
    echo ""
    echo "Next steps:"
    echo "  1. Create .env file: cp .env.docker .env"
    echo "  2. Edit .env and set your passwords"
    echo "  3. Generate SECRET_KEY: openssl rand -hex 32"
    echo "  4. Start development: ./docker-dev.sh up"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Validation passed with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Your Docker setup is functional but has some warnings."
    echo "Review the warnings above before deploying to production."
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo ""
    echo "Please fix the errors above before using the Docker setup."
    exit 1
fi
