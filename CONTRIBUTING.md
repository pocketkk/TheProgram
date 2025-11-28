# Contributing to The Program

Thank you for your interest in contributing to The Program! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

---

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Git

### Fork and Clone

```bash
# Fork on GitHub, then:
git clone https://github.com/YOUR-USERNAME/TheProgram.git
cd TheProgram
```

---

## Development Setup

### Backend

```bash
cd backend
python -m venv test_venv
source test_venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

### Root (Electron)

```bash
npm install
```

### Running Development Servers

**Terminal 1 - Backend:**
```bash
cd backend && source test_venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
```

**Terminal 3 - Electron (optional):**
```bash
npm run electron:start
```

---

## Project Structure

```
TheProgram/
├── backend/                 # Python FastAPI
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── models_sqlite/   # Database models
│   │   └── schemas_sqlite/  # Pydantic schemas
│   └── tests/
├── frontend/                # React TypeScript
│   ├── src/
│   │   ├── features/        # Feature modules
│   │   ├── components/      # Shared components
│   │   └── lib/api/         # API clients
│   └── package.json
├── electron/                # Desktop wrapper
└── docs/                    # Documentation
```

### Key Documentation

- `CLAUDE.md` - Development conventions
- `docs/ARCHITECTURE_DECISIONS.md` - Design rationale
- `docs/ROADMAP.md` - Planned features

---

## Making Changes

### Branch Naming

```
feature/short-description
fix/issue-description
docs/what-changed
```

### Commit Messages

Use clear, descriptive commit messages:

```
Add solar return calculation to Western astrology

- Implement return chart calculation in chart_calculator.py
- Add API endpoint for solar returns
- Create frontend component for display
```

---

## Coding Standards

### Backend (Python)

- Follow PEP 8
- Use type hints
- Write docstrings for public functions
- Keep functions focused and small

```python
def calculate_aspect(
    planet1_longitude: float,
    planet2_longitude: float,
    orb: float = 8.0
) -> Optional[Aspect]:
    """
    Calculate aspect between two planetary positions.

    Args:
        planet1_longitude: First planet's ecliptic longitude
        planet2_longitude: Second planet's ecliptic longitude
        orb: Maximum orb in degrees

    Returns:
        Aspect object if within orb, None otherwise
    """
    ...
```

### Frontend (TypeScript)

- Use TypeScript strictly (no `any`)
- Use functional components
- Follow existing patterns in the codebase

```typescript
interface ChartProps {
  chartId: string
  onUpdate?: (chart: Chart) => void
}

export function ChartDisplay({ chartId, onUpdate }: ChartProps) {
  // ...
}
```

### File Organization

- One component per file
- Group related files in feature directories
- Keep shared utilities in `lib/` or `utils/`

---

## Testing

### Backend Tests

```bash
cd backend
source test_venv/bin/activate
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest tests/test_file.py # Specific file
pytest -k "test_name"     # Specific test
```

### Frontend Tests

```bash
cd frontend
npm run test:run          # Run all tests
npm run test:coverage     # With coverage report
```

### Before Submitting

Run the full test suite:

```bash
# Backend
cd backend && source test_venv/bin/activate && pytest

# Frontend
cd frontend && npm run test:run && npm run type-check
```

---

## Submitting Changes

### Pull Request Process

1. **Create a branch** from `main`
2. **Make your changes** with clear commits
3. **Run tests** and ensure they pass
4. **Update documentation** if needed
5. **Submit PR** with description

### PR Description Template

```markdown
## Summary
Brief description of changes.

## Changes
- Added X
- Fixed Y
- Updated Z

## Testing
How was this tested?

## Screenshots
(if applicable)
```

### Review Process

- PRs require review before merging
- Address feedback constructively
- Keep changes focused (one feature/fix per PR)

---

## Feature Requests

Before implementing a major feature:

1. Check existing issues/PRs
2. Open an issue to discuss
3. Get feedback on approach
4. Then implement

---

## Questions?

- Open a GitHub issue
- Check existing documentation in `docs/`

---

Thank you for contributing!
