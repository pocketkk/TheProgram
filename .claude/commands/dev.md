# Start Development Environment

Start all development servers for local development.

## Steps

1. Check if ports are available:
   ```bash
   lsof -i :8000 2>/dev/null || echo "Port 8000 available"
   lsof -i :5173 2>/dev/null || echo "Port 5173 available"
   ```

2. Provide commands to run in separate terminals:

   **Terminal 1 - Backend:**
   ```bash
   cd /home/sylvia/ClaudeWork/TheProgram/backend
   source test_venv/bin/activate
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd /home/sylvia/ClaudeWork/TheProgram/frontend
   npm run dev
   ```

   **Terminal 3 - Electron (optional):**
   ```bash
   cd /home/sylvia/ClaudeWork/TheProgram
   npm run electron:start
   ```

3. Verify services are running:
   - Backend: http://localhost:8000/docs
   - Frontend: http://localhost:5173

4. Report status and useful URLs
