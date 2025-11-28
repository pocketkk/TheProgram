# Build for Distribution

Build the complete application for distribution.

## Steps

1. Run type checking:
   ```bash
   cd frontend && npm run type-check
   ```

2. Run linting:
   ```bash
   cd frontend && npm run lint
   ```

3. Build frontend:
   ```bash
   cd frontend && npm run build
   ```

4. Build backend (if needed):
   ```bash
   cd backend && source test_venv/bin/activate
   pyinstaller backend.spec --clean
   ```

5. Build Electron package:
   ```bash
   npm run dist:linux
   ```

6. Verify output in `release/` directory

7. Report:
   - Build success/failure
   - Output file sizes
   - Any warnings to address
