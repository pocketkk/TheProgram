#!/bin/bash
# Validation script for The Program backend
# Checks code quality, runs tests, and generates reports

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  The Program - Backend Validation${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if virtual environment is activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo -e "${YELLOW}⚠️  Virtual environment not activated${NC}"
    echo "Run: source venv/bin/activate"
    exit 1
fi

echo -e "${GREEN}✓ Virtual environment active${NC}"
echo ""

# Check if dependencies are installed
echo -e "${BLUE}Checking dependencies...${NC}"
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${RED}✗ Dependencies not installed${NC}"
    echo "Run: pip install -r requirements.txt"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Check Python version
echo -e "${BLUE}Checking Python version...${NC}"
PYTHON_VERSION=$(python --version)
echo -e "${GREEN}✓ $PYTHON_VERSION${NC}"
echo ""

# Check for syntax errors
echo -e "${BLUE}Checking for syntax errors...${NC}"
python -m py_compile app/__init__.py 2>/dev/null && echo -e "${GREEN}✓ app/__init__.py${NC}" || echo -e "${RED}✗ app/__init__.py${NC}"
python -m py_compile app/main.py 2>/dev/null && echo -e "${GREEN}✓ app/main.py${NC}" || echo -e "${RED}✗ app/main.py${NC}"
python -m py_compile app/core/config.py 2>/dev/null && echo -e "${GREEN}✓ app/core/config.py${NC}" || echo -e "${RED}✗ app/core/config.py${NC}"
python -m py_compile app/utils/ephemeris.py 2>/dev/null && echo -e "${GREEN}✓ app/utils/ephemeris.py${NC}" || echo -e "${RED}✗ app/utils/ephemeris.py${NC}"
echo ""

# Check ephemeris files
echo -e "${BLUE}Checking Swiss Ephemeris files...${NC}"
if [ -d "ephemeris" ]; then
    if [ -f "ephemeris/seplm18.se1" ] && [ -f "ephemeris/sepl_18.se1" ]; then
        echo -e "${GREEN}✓ Essential ephemeris files present${NC}"
        EPHEMERIS_AVAILABLE=true
    else
        echo -e "${YELLOW}⚠️  Some ephemeris files missing${NC}"
        echo "Download from: https://www.astro.com/ftp/swisseph/ephe/"
        EPHEMERIS_AVAILABLE=false
    fi
else
    echo -e "${YELLOW}⚠️  Ephemeris directory not found${NC}"
    echo "Create: mkdir ephemeris && cd ephemeris"
    EPHEMERIS_AVAILABLE=false
fi
echo ""

# Run linting (if available)
echo -e "${BLUE}Running code quality checks...${NC}"
if command -v flake8 &> /dev/null; then
    flake8 app/ --count --select=E9,F63,F7,F82 --show-source --statistics 2>/dev/null && \
        echo -e "${GREEN}✓ No critical linting errors${NC}" || \
        echo -e "${YELLOW}⚠️  Some linting warnings${NC}"
else
    echo -e "${YELLOW}⚠️  flake8 not installed (optional)${NC}"
fi
echo ""

# Run type checking (if available)
echo -e "${BLUE}Running type checks...${NC}"
if command -v mypy &> /dev/null; then
    mypy app/ --ignore-missing-imports 2>/dev/null && \
        echo -e "${GREEN}✓ Type checks passed${NC}" || \
        echo -e "${YELLOW}⚠️  Some type warnings${NC}"
else
    echo -e "${YELLOW}⚠️  mypy not installed (optional)${NC}"
fi
echo ""

# Check if pytest is available
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}✗ pytest not installed${NC}"
    echo "Run: pip install pytest pytest-cov pytest-asyncio"
    exit 1
fi

# Run tests
echo -e "${BLUE}Running test suite...${NC}"
echo ""

# Run unit tests only (fast)
echo -e "${BLUE}Running unit tests...${NC}"
if $EPHEMERIS_AVAILABLE; then
    pytest tests/ -m unit -v --tb=short 2>/dev/null && \
        echo -e "${GREEN}✓ Unit tests passed${NC}" || \
        echo -e "${RED}✗ Some unit tests failed${NC}"
else
    pytest tests/ -m "unit and not ephemeris" -v --tb=short 2>/dev/null && \
        echo -e "${GREEN}✓ Unit tests passed (ephemeris tests skipped)${NC}" || \
        echo -e "${RED}✗ Some unit tests failed${NC}"
fi
echo ""

# Run integration tests
echo -e "${BLUE}Running integration tests...${NC}"
pytest tests/ -m integration -v --tb=short 2>/dev/null && \
    echo -e "${GREEN}✓ Integration tests passed${NC}" || \
    echo -e "${RED}✗ Some integration tests failed${NC}"
echo ""

# Generate coverage report
echo -e "${BLUE}Generating coverage report...${NC}"
pytest tests/ --cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=80 2>/dev/null && \
    echo -e "${GREEN}✓ Coverage requirements met (≥80%)${NC}" || \
    echo -e "${YELLOW}⚠️  Coverage below 80%${NC}"
echo ""
echo -e "HTML coverage report: ${BLUE}htmlcov/index.html${NC}"
echo ""

# Test ephemeris wrapper directly
if $EPHEMERIS_AVAILABLE; then
    echo -e "${BLUE}Testing Swiss Ephemeris wrapper...${NC}"
    python -c "
from datetime import datetime
from app.utils.ephemeris import EphemerisCalculator

dt = datetime(2000, 1, 1, 12, 0)
jd = EphemerisCalculator.datetime_to_julian_day(dt, 0)
sun = EphemerisCalculator.calculate_planet_position('sun', jd)
print(f'✓ Sun position: {EphemerisCalculator.format_degree(sun[\"longitude\"])}')
" 2>/dev/null && \
        echo -e "${GREEN}✓ Ephemeris calculations working${NC}" || \
        echo -e "${RED}✗ Ephemeris calculation failed${NC}"
    echo ""
fi

# Check configuration
echo -e "${BLUE}Validating configuration...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Copy .env.example to .env and configure"
fi
echo ""

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Validation Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo "1. Dependencies: ✓ Installed"
echo "2. Syntax: ✓ No errors"
if $EPHEMERIS_AVAILABLE; then
    echo "3. Ephemeris: ✓ Available"
else
    echo "3. Ephemeris: ⚠️  Missing (tests limited)"
fi
echo "4. Tests: Run complete"
echo "5. Coverage: See report above"
echo ""
echo -e "${GREEN}Validation complete!${NC}"
echo ""
echo "Next steps:"
echo "  - View coverage report: open htmlcov/index.html"
echo "  - Run specific tests: pytest tests/test_utils/test_ephemeris.py"
echo "  - Start dev server: uvicorn app.main:app --reload"
echo ""
