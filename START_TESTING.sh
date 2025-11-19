#!/bin/bash

echo "=========================================="
echo "Phase 2: Data Portability Testing"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Your backup password: NewLife123${NC}"
echo ""

echo "Quick Test Options:"
echo ""
echo "1. Run Automated Tests (Recommended First)"
echo "   cd backend && source test_venv/bin/activate"
echo "   python test_export_standalone.py"
echo "   python test_import_standalone.py"
echo ""
echo "2. Start Backend Server"
echo "   cd backend && source test_venv/bin/activate"
echo "   uvicorn app.main:app --reload --port 8000"
echo "   Then access API docs at: http://localhost:8000/docs"
echo ""
echo "3. Start Frontend (in separate terminal)"
echo "   cd frontend"
echo "   npm run dev"
echo "   Then access app at: http://localhost:5173"
echo ""
echo "4. Test Backup from CLI"
echo "   cd backend && source test_venv/bin/activate"
echo "   python scripts/backup.py create --encrypt --compress"
echo "   python scripts/backup.py list"
echo ""
echo "See TEST_PHASE_2_GUIDE.md for complete testing instructions"
echo ""
