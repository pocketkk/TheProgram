# Integration Tests for SQLite API Endpoints

## Overview

This directory contains comprehensive integration tests for all SQLite-based API endpoints in the single-user astrology application backend.

## Test Structure

```
tests/
├── integration/
│   ├── __init__.py
│   ├── test_clients_integration.py              # Client CRUD operations
│   ├── test_birth_data_integration.py           # Birth data CRUD operations
│   ├── test_charts_integration.py               # Chart CRUD and calculations
│   └── test_chart_interpretations_integration.py # AI interpretations
├── utils/
│   ├── __init__.py
│   └── test_helpers.py                          # Helper functions and fixtures
└── conftest.py                                   # Shared pytest fixtures

```

## Test Files

### 1. `test_clients_integration.py`
Tests for `/api/clients/` endpoints

**Test Classes:**
- `TestCreateClient` - Client creation with validation
- `TestListClients` - Listing and pagination
- `TestGetClient` - Retrieval with statistics
- `TestUpdateClient` - Update operations
- `TestDeleteClient` - Deletion and cascades

**Coverage:**
- Happy path operations
- Required field validation
- Email validation
- Empty/whitespace handling
- Pagination with skip/limit
- CASCADE deletes to birth_data and charts
- Error cases (404, 422)

**Total Tests:** ~25 tests

---

### 2. `test_birth_data_integration.py`
Tests for `/api/birth-data/` endpoints

**Test Classes:**
- `TestCreateBirthData` - Creation with coordinate validation
- `TestListBirthData` - Listing by client
- `TestGetBirthData` - Retrieval with computed properties
- `TestUpdateBirthData` - Update operations
- `TestDeleteBirthData` - Deletion and cascades
- `TestBirthDataValidation` - Validation rules

**Coverage:**
- Valid and invalid coordinates (lat/lon)
- Birth data with and without time
- Edge cases (poles, date line)
- Rodden rating validation
- Timezone offset validation
- CASCADE deletes to charts
- Computed properties (location_string, is_time_known, data_quality)
- Error cases

**Total Tests:** ~30 tests

---

### 3. `test_charts_integration.py`
Tests for `/api/charts/` endpoints

**Test Classes:**
- `TestCreateChart` - Chart creation with pre-calculated data
- `TestListCharts` - Listing with filtering
- `TestGetChart` - Retrieval and last_viewed tracking
- `TestUpdateChart` - Metadata updates
- `TestDeleteChart` - Deletion
- `TestChartCalculation` - Chart calculation endpoint
- `TestHouseSystems` - Different house systems
- `TestChartTypes` - Different chart types

**Coverage:**
- Pre-calculated chart storage
- Chart calculation (natal, transit, etc.)
- Filtering by type, system, client
- Pagination
- House systems (placidus, koch, equal, whole_sign, etc.)
- Chart types (natal, transit, progression, synastry, composite)
- last_viewed timestamp updates
- Error cases

**Note:** Some calculation tests are marked `@pytest.mark.skip` because they require:
- Swiss Ephemeris data files
- Chart calculation service implementations
- AI API access

**Total Tests:** ~25 tests (excluding skipped)

---

### 4. `test_chart_interpretations_integration.py`
Tests for `/api/charts/{chart_id}/interpretations` and `/api/interpretations/` endpoints

**Test Classes:**
- `TestGetChartInterpretations` - Listing interpretations
- `TestGenerateInterpretations` - AI generation
- `TestGetInterpretation` - Single interpretation retrieval
- `TestUpdateInterpretation` - Update description/approval
- `TestDeleteInterpretation` - Deletion
- `TestInterpretationCascade` - CASCADE delete behavior
- `TestInterpretationValidation` - Validation rules

**Coverage:**
- Listing with filtering by element_type
- AI interpretation generation (skipped - requires API)
- Regenerate vs skip existing
- Approval status workflow (pending, approved, rejected)
- Element types (planet, house, aspect, pattern)
- Version tracking
- CASCADE deletes when chart is deleted
- Error cases

**Note:** Tests requiring AI API calls are marked `@pytest.mark.skip`

**Total Tests:** ~20 tests (excluding skipped)

---

## Test Utilities

### `tests/utils/test_helpers.py`

**Helper Functions:**
- `create_test_client()` - Create test client in database
- `create_test_birth_data()` - Create test birth data
- `create_test_chart()` - Create test chart
- `setup_test_password()` - Set up authentication password
- `get_auth_headers()` - Get authentication headers with token

**Assertion Helpers:**
- `assert_valid_uuid()` - Validate UUID fields
- `assert_valid_timestamp()` - Validate ISO timestamps
- `assert_response_has_fields()` - Check required fields
- `assert_error_response()` - Validate error responses

**Sample Data:**
- `SAMPLE_CLIENT_DATA` - Complete client data
- `SAMPLE_BIRTH_DATA` - Birth data with time
- `SAMPLE_BIRTH_DATA_NO_TIME` - Birth data without time
- `SAMPLE_CHART_REQUEST` - Chart calculation request

---

## Shared Fixtures (conftest.py)

### Database Fixtures
- `test_db` - Fresh in-memory SQLite database for each test
- `client_with_db` - FastAPI TestClient with database dependency override
- `db_session` - Alias for test_db (backwards compatibility)

### Test Data Fixtures
- `sample_birth_data_1` - January 15, 1990, New York
- `sample_birth_data_2` - July 4, 1985, Los Angeles
- `sample_birth_data_london` - March 21, 2000, London
- `sample_birth_data_mumbai` - November 14, 1988, Mumbai

### Validation Fixtures
- `tolerance` - Float comparison tolerances
- `valid_longitude_range` - Valid longitude range
- `valid_latitude_range` - Valid latitude range

---

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend
pip install -r requirements.txt
```

2. Ensure ephemeris files are available (for calculation tests):
```bash
# Check if ephemeris files exist
ls /home/sylvia/ClaudeWork/TheProgram/backend/ephemeris/
```

### Run All Integration Tests

```bash
# Run all integration tests
pytest tests/integration/ -v

# Run with coverage report
pytest tests/integration/ --cov=app/api/routes_sqlite --cov-report=html

# Run with detailed output
pytest tests/integration/ -vv --tb=long

# Run in parallel (faster)
pytest tests/integration/ -n auto
```

### Run Specific Test Files

```bash
# Run only client tests
pytest tests/integration/test_clients_integration.py -v

# Run only birth data tests
pytest tests/integration/test_birth_data_integration.py -v

# Run only chart tests
pytest tests/integration/test_charts_integration.py -v

# Run only interpretation tests
pytest tests/integration/test_chart_interpretations_integration.py -v
```

### Run Specific Test Classes

```bash
# Run only create client tests
pytest tests/integration/test_clients_integration.py::TestCreateClient -v

# Run only delete tests with cascade
pytest tests/integration/test_clients_integration.py::TestDeleteClient::test_delete_client_cascade_complex -v
```

### Run With Markers

```bash
# Run only non-skipped tests
pytest tests/integration/ -v -m "not skip"

# Run only integration tests
pytest tests/ -v -m integration
```

### Generate Coverage Report

```bash
# Generate HTML coverage report
pytest tests/integration/ \
    --cov=app/api/routes_sqlite \
    --cov=app/core/database_sqlite \
    --cov=app/models_sqlite \
    --cov-report=html \
    --cov-report=term

# View report
firefox htmlcov/index.html
```

---

## Test Markers

Tests use the following pytest markers:

- `@pytest.mark.integration` - Integration test
- `@pytest.mark.skip(reason="...")` - Skip test (requires external dependencies)
- `@pytest.mark.slow` - Slow running test (>1s)
- `@pytest.mark.ephemeris` - Requires ephemeris files
- `@pytest.mark.database` - Requires database connection

---

## Coverage Goals

### Current Coverage (Estimated)

| Module | Coverage | Tests |
|--------|----------|-------|
| `routes_sqlite/clients.py` | ~95% | 25 tests |
| `routes_sqlite/birth_data.py` | ~95% | 30 tests |
| `routes_sqlite/charts.py` | ~70%* | 25 tests |
| `routes_sqlite/chart_interpretations.py` | ~60%* | 20 tests |
| **Overall** | **~80%** | **100+ tests** |

*Lower coverage due to skipped tests requiring external dependencies

### To Achieve 100% Coverage

Add these tests:
1. **Authentication integration tests** - Already exist in `test_auth_simple.py` (complete)
2. **Chart calculation tests** - Require ephemeris files (marked skip)
3. **AI generation tests** - Require AI API access (marked skip)
4. **WebSocket tests** - Require WebSocket client setup
5. **Session note tests** - Need session note endpoints

---

## Test Patterns

### Standard Test Pattern

```python
def test_operation_scenario(self, client_with_db: TestClient, test_db: Session):
    """Test description"""
    # 1. Setup - Create test data
    client = create_test_client(test_db)

    # 2. Execute - Make API request
    response = client_with_db.post("/api/endpoint", json=data)

    # 3. Assert - Check response
    assert response.status_code == 201
    data = response.json()
    assert_valid_uuid(data["id"])

    # 4. Verify - Check database state
    db_record = test_db.query(Model).filter(...).first()
    assert db_record is not None
```

### Error Case Pattern

```python
def test_operation_error_case(self, client_with_db: TestClient):
    """Test error handling"""
    # Setup invalid data
    invalid_data = {"field": "invalid"}

    # Execute
    response = client_with_db.post("/api/endpoint", json=invalid_data)

    # Assert error response
    assert_error_response(response, 422, "validation error")
```

### Cascade Delete Pattern

```python
def test_delete_cascade(self, client_with_db: TestClient, test_db: Session):
    """Test CASCADE delete behavior"""
    # Setup parent and children
    parent = create_parent(test_db)
    child = create_child(test_db, parent.id)
    child_id = child.id

    # Delete parent
    response = client_with_db.delete(f"/api/parent/{parent.id}")
    assert response.status_code == 200

    # Verify child is also deleted
    deleted_child = test_db.query(Child).filter(Child.id == child_id).first()
    assert deleted_child is None
```

---

## Common Issues and Solutions

### Issue: Tests fail with "Module not found"
**Solution:** Ensure virtual environment is activated and dependencies installed
```bash
pip install -r requirements.txt
```

### Issue: Foreign key constraint failures
**Solution:** Ensure `foreign_keys=ON` pragma is set in conftest.py (already configured)

### Issue: Tests are slow
**Solution:** Use pytest-xdist for parallel execution
```bash
pip install pytest-xdist
pytest tests/integration/ -n auto
```

### Issue: Skipped tests
**Solution:** This is expected for tests requiring ephemeris files or AI API access. Run with `-v` to see skip reasons.

### Issue: Database locked errors
**Solution:** Each test uses isolated in-memory database. If seeing this error, check for uncommitted transactions.

---

## Next Steps

### Recommended Additions

1. **Session Note Tests** - Add tests for session notes endpoints
2. **Transit Event Tests** - Add tests for transit tracking
3. **Location Cache Tests** - Add tests for location geocoding cache
4. **User Preferences Tests** - Add tests for user preferences
5. **Performance Tests** - Add tests for performance benchmarks
6. **Load Tests** - Add tests with large datasets

### Integration with CI/CD

Add to `.github/workflows/test.yml`:
```yaml
- name: Run Integration Tests
  run: |
    pytest tests/integration/ \
      --cov=app/api/routes_sqlite \
      --cov-report=xml \
      --junit-xml=test-results.xml

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

---

## Test Statistics

### Total Test Count
- **Clients:** 25 tests
- **Birth Data:** 30 tests
- **Charts:** 25 tests (15 active, 10 skipped)
- **Interpretations:** 20 tests (15 active, 5 skipped)
- **Total:** **100+ integration tests**

### Test Distribution
- **Happy Path:** 40%
- **Validation:** 30%
- **Error Cases:** 20%
- **Edge Cases:** 10%

### Expected Runtime
- **All tests:** ~10-15 seconds (in-memory database)
- **With parallel:** ~5-8 seconds
- **With skipped excluded:** ~8-12 seconds

---

## Maintenance

### Updating Tests

When adding new endpoints:
1. Create test file following naming convention
2. Use existing helpers from `test_helpers.py`
3. Follow standard test patterns
4. Add to this README

### Reviewing Coverage

```bash
# Generate coverage report
pytest tests/integration/ --cov=app/api/routes_sqlite --cov-report=html

# Open in browser
firefox htmlcov/index.html

# Look for uncovered lines
grep -n "0%\|partial" htmlcov/*.html
```

---

## Contact

For questions or issues with tests, refer to:
- Main documentation: `/home/sylvia/ClaudeWork/TheProgram/backend/README.md`
- API documentation: `/home/sylvia/ClaudeWork/TheProgram/backend/docs/API.md`
- Test documentation: This file
