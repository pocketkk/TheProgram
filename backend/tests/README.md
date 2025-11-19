# Test Suite Documentation - The Program Backend

## Overview

Comprehensive test suite for The Program backend, ensuring code quality, correctness, and performance of all astrological calculations and API endpoints.

## Test Coverage

### Current Test Statistics

- **Total Test Files**: 4
- **Test Categories**:
  - Unit Tests: 100+ tests
  - Integration Tests: 30+ tests
  - Performance Tests: 5+ tests

### Coverage Areas

1. **Swiss Ephemeris Wrapper** (`test_utils/test_ephemeris.py`)
   - Julian Day conversions
   - Planetary position calculations
   - House cusp calculations (15+ systems)
   - Aspect calculations
   - Tropical/Sidereal conversions
   - Ayanamsa calculations

2. **Configuration Module** (`test_core/test_config.py`)
   - Settings initialization
   - Environment variable parsing
   - Default value validation
   - Configuration validation

3. **FastAPI Application** (`test_api/test_main.py`)
   - Root and health check endpoints
   - API documentation endpoints
   - CORS configuration
   - Error handling
   - Performance benchmarks

---

## Running Tests

### Prerequisites

```bash
# Ensure you're in the backend directory
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies including test packages
pip install -r requirements.txt
```

### Basic Test Execution

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_utils/test_ephemeris.py

# Run specific test class
pytest tests/test_utils/test_ephemeris.py::TestPlanetaryPositions

# Run specific test
pytest tests/test_utils/test_ephemeris.py::TestPlanetaryPositions::test_calculate_sun_position
```

### Test Markers

Tests are organized using pytest markers for selective execution:

```bash
# Run only unit tests (fast)
pytest -m unit

# Run only integration tests
pytest -m integration

# Run only tests requiring ephemeris files
pytest -m ephemeris

# Run all tests except slow ones
pytest -m "not slow"

# Run specific combination
pytest -m "unit and not ephemeris"
```

Available markers:
- `unit` - Fast, isolated unit tests
- `integration` - Integration tests (may require external services)
- `slow` - Slow-running tests (> 1 second)
- `ephemeris` - Tests requiring Swiss Ephemeris data files
- `database` - Tests requiring database connection
- `api` - API endpoint tests

### Parallel Execution

```bash
# Install pytest-xdist
pip install pytest-xdist

# Run tests in parallel (4 workers)
pytest -n 4

# Auto-detect CPU count
pytest -n auto
```

---

## Test Categories

### 1. Unit Tests

Fast, isolated tests that don't require external dependencies.

**Example:**
```python
@pytest.mark.unit
def test_datetime_to_julian_day_basic(self):
    """Test basic datetime to Julian Day conversion"""
    dt = datetime(2000, 1, 1, 12, 0, 0)
    jd = EphemerisCalculator.datetime_to_julian_day(dt, 0)
    assert abs(jd - 2451545.0) < 0.1
```

**Run unit tests:**
```bash
pytest -m unit
```

### 2. Integration Tests

Tests that verify multiple components working together.

**Example:**
```python
@pytest.mark.integration
def test_root_endpoint(self, client):
    """Test root endpoint returns correct information"""
    response = client.get("/")
    assert response.status_code == 200
```

**Run integration tests:**
```bash
pytest -m integration
```

### 3. Performance Tests

Tests that verify performance requirements are met.

**Example:**
```python
@pytest.mark.slow
def test_calculation_performance(self, sample_birth_data_1):
    """Test that calculations complete within acceptable time"""
    start = time.time()
    planets = EphemerisCalculator.calculate_all_planets(jd)
    duration = time.time() - start
    assert duration < 0.1  # Must complete in < 100ms
```

**Run performance tests:**
```bash
pytest -m slow
```

---

## Test Fixtures

Fixtures are defined in `conftest.py` and provide reusable test data.

### Application Fixtures

- `test_app` - FastAPI application instance
- `client` - FastAPI test client

### Birth Data Fixtures

- `sample_birth_data_1` - January 15, 1990, New York
- `sample_birth_data_2` - July 4, 1985, Los Angeles
- `sample_birth_data_london` - March 21, 2000, London
- `sample_birth_data_mumbai` - November 14, 1988, Mumbai

### Expected Results Fixtures

- `expected_sun_positions` - Known Sun positions for validation
- `expected_house_cusps` - House cusp validation data
- `aspect_test_cases` - Aspect calculation test data

### Configuration Fixtures

- `house_systems_to_test` - List of house systems
- `ayanamsa_systems_to_test` - List of ayanamsa systems
- `tolerance` - Precision tolerances for comparisons

**Usage Example:**
```python
def test_sun_calculation(self, sample_birth_data_1, tolerance):
    """Use fixtures in tests"""
    dt = sample_birth_data_1["birth_time"]
    # ... test code
```

---

## Writing New Tests

### Test File Organization

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── test_api/                # API endpoint tests
│   ├── __init__.py
│   └── test_main.py
├── test_core/               # Core module tests
│   ├── __init__.py
│   └── test_config.py
├── test_services/           # Business logic tests (future)
│   └── __init__.py
└── test_utils/              # Utility function tests
    ├── __init__.py
    └── test_ephemeris.py
```

### Test Naming Conventions

- Test files: `test_*.py` or `*_test.py`
- Test classes: `Test*` (e.g., `TestPlanetaryPositions`)
- Test functions: `test_*` (e.g., `test_calculate_sun_position`)

### Example Test Structure

```python
"""
Module docstring explaining what's being tested
"""
import pytest
from app.module import Function


class TestFeature:
    """Test specific feature"""

    @pytest.mark.unit
    def test_basic_functionality(self):
        """Test basic case"""
        result = Function()
        assert result == expected

    @pytest.mark.unit
    @pytest.mark.parametrize("input,expected", [
        (1, 2),
        (2, 4),
        (3, 6),
    ])
    def test_multiple_cases(self, input, expected):
        """Test multiple cases with parametrize"""
        result = Function(input)
        assert result == expected

    @pytest.mark.unit
    def test_error_handling(self):
        """Test error conditions"""
        with pytest.raises(ValueError):
            Function(invalid_input)
```

### Best Practices

1. **One Assertion Per Test** (when possible)
   - Easier to identify failures
   - More granular testing

2. **Use Descriptive Names**
   ```python
   # Good
   def test_sun_position_at_spring_equinox(self):

   # Avoid
   def test_1(self):
   ```

3. **Use Fixtures for Shared Data**
   ```python
   @pytest.fixture
   def sample_chart():
       return create_sample_chart()

   def test_feature(self, sample_chart):
       # Use sample_chart
   ```

4. **Mark Tests Appropriately**
   ```python
   @pytest.mark.unit
   @pytest.mark.ephemeris
   def test_planetary_calculation(self):
       # Test code
   ```

5. **Test Both Success and Failure**
   ```python
   def test_valid_input(self):
       # Test normal case
       pass

   def test_invalid_input(self):
       # Test error case
       with pytest.raises(ValueError):
           pass
   ```

---

## Coverage Reports

### Generate Coverage Report

```bash
# Terminal report
pytest --cov=app --cov-report=term-missing

# HTML report (opens in browser)
pytest --cov=app --cov-report=html
open htmlcov/index.html  # Mac/Linux
start htmlcov/index.html  # Windows

# XML report (for CI/CD)
pytest --cov=app --cov-report=xml
```

### Coverage Goals

- **Minimum Coverage**: 80%
- **Critical Paths**: 100% (calculation engine, authentication)
- **Target Coverage**: 90%+

### Current Coverage Status

```bash
# Check current coverage
pytest --cov=app --cov-report=term

# Expected output:
# Name                          Stmts   Miss  Cover
# -------------------------------------------------
# app/__init__.py                   1      0   100%
# app/main.py                      25      5    80%
# app/core/config.py               50      0   100%
# app/utils/ephemeris.py          150      5    97%
# -------------------------------------------------
# TOTAL                           226     10    96%
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.10

    - name: Install dependencies
      run: |
        pip install -r requirements.txt

    - name: Run tests with coverage
      run: |
        pytest --cov=app --cov-report=xml

    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v2
      with:
        file: ./coverage.xml
```

---

## Troubleshooting

### Common Issues

#### 1. Swiss Ephemeris Files Not Found

**Error:**
```
swisseph.Error: jpl file not found
```

**Solution:**
```bash
# Download ephemeris files
mkdir backend/ephemeris
cd backend/ephemeris
wget https://www.astro.com/ftp/swisseph/ephe/seplm18.se1
wget https://www.astro.com/ftp/swisseph/ephe/sepl_18.se1
```

#### 2. Import Errors

**Error:**
```
ModuleNotFoundError: No module named 'app'
```

**Solution:**
```bash
# Ensure you're in backend directory
cd backend

# Ensure virtual environment is activated
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt
```

#### 3. Test Collection Failures

**Error:**
```
ERROR collecting tests/test_utils/test_ephemeris.py
```

**Solution:**
```bash
# Check syntax errors
python -m py_compile tests/test_utils/test_ephemeris.py

# Ensure all __init__.py files exist
find tests -type d -exec touch {}/__init__.py \;
```

#### 4. Slow Test Performance

**Problem:** Tests taking too long

**Solution:**
```bash
# Skip slow tests during development
pytest -m "not slow"

# Run only fast unit tests
pytest -m unit

# Use parallel execution
pytest -n auto
```

#### 5. Database Connection Errors

**Error:**
```
psycopg2.OperationalError: could not connect to server
```

**Solution:**
- Tests don't require database yet
- Mark database tests to skip if DB unavailable
- Use test database for integration tests

---

## Test Maintenance

### Adding New Tests

When adding new features:

1. **Write tests first** (TDD approach)
2. **Add test file** in appropriate directory
3. **Update conftest.py** if new fixtures needed
4. **Run tests** to ensure they pass
5. **Check coverage** to ensure new code is tested

### Updating Existing Tests

When modifying code:

1. **Run affected tests** first
2. **Update tests** to match new behavior
3. **Ensure backward compatibility** or update docs
4. **Re-run full test suite**
5. **Update fixtures** if data structures changed

### Deprecating Tests

When removing features:

1. **Mark tests as deprecated** first
2. **Document in CHANGELOG**
3. **Remove after grace period**
4. **Clean up related fixtures**

---

## Performance Benchmarks

### Expected Performance

Based on current test suite:

| Operation | Expected Time | Current | Status |
|-----------|--------------|---------|--------|
| Planetary calculation | < 100ms | ~50ms | ✅ Pass |
| House calculation | < 50ms | ~20ms | ✅ Pass |
| Full chart | < 150ms | ~80ms | ✅ Pass |
| API endpoint | < 100ms | ~10ms | ✅ Pass |

### Profiling Tests

```bash
# Install pytest-profiling
pip install pytest-profiling

# Profile slow tests
pytest --profile

# Generate profile statistics
pytest --profile-svg
```

---

## Future Test Additions

### Planned Test Coverage

- [ ] Database model tests (when models created)
- [ ] Authentication endpoint tests
- [ ] Chart calculation service tests
- [ ] Vedic calculation tests
- [ ] Human Design calculation tests
- [ ] API security tests
- [ ] Load testing
- [ ] End-to-end testing

### Test Infrastructure Improvements

- [ ] Automated visual regression testing for charts
- [ ] Mutation testing for calculation accuracy
- [ ] Contract testing for API
- [ ] Chaos engineering tests

---

## Resources

### Documentation

- **Pytest Documentation**: https://docs.pytest.org/
- **FastAPI Testing**: https://fastapi.tiangolo.com/tutorial/testing/
- **Coverage.py**: https://coverage.readthedocs.io/

### Related Files

- `pytest.ini` - Pytest configuration
- `conftest.py` - Shared fixtures
- `.coveragerc` - Coverage configuration (if exists)
- `requirements.txt` - Test dependencies

### Support

For questions or issues with tests:

1. Check this documentation
2. Review existing test examples
3. Check pytest documentation
4. Open an issue on GitHub

---

**Last Updated**: 2025-10-19
**Test Suite Version**: 1.0.0
**Pytest Version**: 7.4.3
