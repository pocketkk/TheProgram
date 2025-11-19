# Integration Tests - Quick Start Guide

## Run All Tests (Recommended)

```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend

# Run all active integration tests (skips tests requiring external deps)
pytest tests/integration/ -v -m "not skip"

# Expected: ~115 passed, 28 skipped in 10-15s
```

## Run Specific Test Module

```bash
# Authentication (32 tests)
pytest tests/integration/test_auth_integration.py -v

# Clients (26 tests)
pytest tests/integration/test_clients_integration.py -v

# Birth Data (26 tests)
pytest tests/integration/test_birth_data_integration.py -v

# Charts (26 tests, some skipped)
pytest tests/integration/test_charts_integration.py -v

# Interpretations (18 tests, some skipped)
pytest tests/integration/test_chart_interpretations_integration.py -v

# WebSocket (15 tests, all skipped - requires special setup)
pytest tests/integration/test_websocket_integration.py -v
```

## Coverage Report

```bash
# Generate HTML coverage report
pytest tests/integration/ \
    --cov=app/api/routes_sqlite \
    --cov=app/core/database_sqlite \
    --cov=app/models_sqlite \
    --cov-report=html \
    -v -m "not skip"

# Open report
firefox htmlcov/index.html
```

## Run Single Test

```bash
# Run specific test function
pytest tests/integration/test_auth_integration.py::TestLogin::test_login_success -vv

# With full traceback
pytest tests/integration/test_clients_integration.py::TestDeleteClient::test_delete_client_cascade_complex -vv --tb=long
```

## Common Options

```bash
# Show print statements
pytest tests/integration/ -s

# Stop on first failure
pytest tests/integration/ -x

# Run in parallel (faster)
pytest tests/integration/ -n auto

# Only failed tests from last run
pytest tests/integration/ --lf
```

## Expected Results

✅ **115 tests should PASS** (active tests)
⏭️ **28 tests should SKIP** (require external dependencies)
❌ **0 tests should FAIL** (if setup correct)

## Troubleshooting

### "ModuleNotFoundError: No module named 'fastapi'"

```bash
pip install -r requirements.txt
```

### "Foreign key constraint failed"

This is expected if CASCADE tests are working correctly. Check test output for PASSED status.

### All tests skipped

You may be running only skipped tests. Use `-m "not skip"` to run active tests.

### Slow tests

Normal. First run may be slower due to database initialization. Subsequent runs are faster.

## Test Structure

```
tests/integration/
├── test_auth_integration.py          # 32 auth tests
├── test_clients_integration.py       # 26 client tests
├── test_birth_data_integration.py    # 26 birth data tests
├── test_charts_integration.py        # 26 chart tests
├── test_chart_interpretations_integration.py  # 18 interpretation tests
└── test_websocket_integration.py     # 15 WebSocket tests (skipped)
```

## Next Steps

1. **Run tests:** `pytest tests/integration/ -v`
2. **Check coverage:** Generate HTML report
3. **Add to CI/CD:** See GitHub Actions example in TASK_008_FINAL_REPORT.md
4. **Complete skipped tests:** Set up ephemeris files and AI API mocking

## Full Documentation

See `/home/sylvia/ClaudeWork/TheProgram/backend/tests/TASK_008_FINAL_REPORT.md` for:
- Detailed test breakdown
- Coverage analysis
- CI/CD integration
- Future enhancements
