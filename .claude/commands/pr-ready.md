# Prepare for Pull Request

Ensure code is ready for review/merge.

## Steps

1. Run linting and fix issues:
   ```bash
   cd frontend && npm run lint -- --fix
   ```

2. Run type checking:
   ```bash
   cd frontend && npm run type-check
   ```

3. Run all tests:
   ```bash
   cd backend && source test_venv/bin/activate && pytest
   cd frontend && npm run test:run
   ```

4. Check for uncommitted changes:
   ```bash
   git status
   git diff --stat
   ```

5. Review changes since branch creation:
   ```bash
   git log --oneline main..HEAD
   git diff main..HEAD --stat
   ```

6. Generate summary of changes:
   - Files modified
   - Features added/changed
   - Tests added
   - Breaking changes (if any)

7. Suggest commit message if uncommitted changes exist

8. Suggest PR title and description based on changes
