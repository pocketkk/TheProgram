# Project Status

Get a quick overview of the project state.

## Steps

1. Git status:
   ```bash
   git status --short
   git log --oneline -5
   ```

2. Check running services:
   ```bash
   lsof -i :8000 2>/dev/null | head -2 || echo "Backend not running"
   lsof -i :5173 2>/dev/null | head -2 || echo "Frontend not running"
   ```

3. Check test status (quick):
   ```bash
   cd backend && source test_venv/bin/activate && pytest --collect-only -q 2>/dev/null | tail -1
   cd frontend && npm run test:run -- --reporter=dot 2>/dev/null | tail -3
   ```

4. Database status:
   ```bash
   ls -lh backend/data/*.db 2>/dev/null || echo "No database found"
   ```

5. Build artifacts:
   ```bash
   ls -lh release/*.AppImage release/*.deb 2>/dev/null || echo "No builds found"
   ```

6. Read current focus from CLAUDE.md

7. Report summary
