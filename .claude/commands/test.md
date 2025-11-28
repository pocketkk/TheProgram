# Run Tests

Run the full test suite for both backend and frontend. Fix any failures encountered.

## Steps

1. Run backend tests:
   ```bash
   cd backend && source test_venv/bin/activate && pytest -v
   ```

2. Run frontend tests:
   ```bash
   cd frontend && npm run test:run
   ```

3. If any tests fail:
   - Analyze the failure
   - Fix the issue
   - Re-run to confirm the fix

4. Report summary:
   - Total tests passed/failed
   - Any fixes applied
   - Coverage if available
