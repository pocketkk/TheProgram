# Simple Authentication System - Quick Start Guide

## Overview

TASK-005 is complete! A simple, secure password-based authentication system has been implemented for your single-user app.

## What Was Built

### 1. Core Components

- **Password Hashing**: Bcrypt with automatic salts
- **Session Tokens**: JWT tokens with 24-hour expiry
- **Validation**: Pydantic schemas with security checks
- **Dependencies**: FastAPI dependencies for protecting routes

### 2. API Endpoints

All endpoints are prefixed with `/api/auth`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/status` | GET | Check if password is set |
| `/setup` | POST | First-time password setup |
| `/login` | POST | Login and get token |
| `/verify` | POST | Verify token validity |
| `/change-password` | POST | Change password |
| `/disable-password` | POST | Remove password (optional) |
| `/logout` | POST | Logout (client-side) |

### 3. Files Created

```
backend/
├── app/
│   ├── core/
│   │   └── auth_simple.py              ✓ Hash, verify, create/verify tokens
│   ├── schemas_sqlite/
│   │   └── auth.py                     ✓ Pydantic request/response models
│   ├── api/
│   │   ├── routes_sqlite/
│   │   │   ├── __init__.py             ✓ Router registration
│   │   │   └── auth_simple.py          ✓ 7 auth endpoints
│   │   └── dependencies_simple.py       ✓ Auth dependencies
├── tests/
│   └── test_auth_simple.py             ✓ 30+ comprehensive tests
├── docs/
│   └── TASK-005-AUTH-IMPLEMENTATION.md ✓ Full documentation
└── verify_auth_implementation.py       ✓ Verification script
```

## Quick Start

### 1. Install Dependencies (if not already done)

```bash
cd /home/sylvia/ClaudeWork/TheProgram/backend
pip install -r requirements.txt
```

### 2. Verify Implementation

```bash
python3 verify_auth_implementation.py
```

Expected output: All checks pass ✓

### 3. Initialize Database

```bash
python3 -c "from app.core.database_sqlite import init_db; init_db()"
```

### 4. Start Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Test Endpoints

```bash
# Check status (no password set initially)
curl http://localhost:8000/api/auth/status

# Setup password
curl -X POST http://localhost:8000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"password": "my_secure_password"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "my_secure_password"}'

# Response includes: access_token, token_type, expires_in
```

### 6. Run Tests

```bash
pytest tests/test_auth_simple.py -v
```

## Using in Frontend

### React Example (TypeScript)

```typescript
// 1. Check auth status on app load
const checkAuthStatus = async () => {
  const res = await fetch('/api/auth/status');
  const data = await res.json();

  if (!data.password_set) {
    // Show password setup screen
    showPasswordSetup();
  } else {
    // Show login screen
    showLogin();
  }
};

// 2. Setup password (first run)
const setupPassword = async (password: string) => {
  const res = await fetch('/api/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  if (res.ok) {
    // Password set, now login
    await login(password);
  }
};

// 3. Login
const login = async (password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  if (res.ok) {
    const { access_token } = await res.json();
    localStorage.setItem('auth_token', access_token);
    // Redirect to main app
  } else {
    // Show error: incorrect password
  }
};

// 4. Use token in API calls
const fetchProtectedData = async () => {
  const token = localStorage.getItem('auth_token');

  const res = await fetch('/api/protected-endpoint', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return res.json();
};

// 5. Logout
const logout = () => {
  localStorage.removeItem('auth_token');
  // Redirect to login
};
```

## Protecting Routes

### In Backend

```python
from fastapi import Depends
from app.api.dependencies_simple import verify_auth

@router.get("/protected-data")
async def get_protected_data(
    _: bool = Depends(verify_auth),  # Requires authentication
    db: Session = Depends(get_db)
):
    # Only authenticated users can access this
    return {"data": "sensitive information"}
```

### Optional Authentication

```python
from app.api.dependencies_simple import optional_auth

@router.get("/public-data")
async def get_public_data(
    is_authenticated: bool = Depends(optional_auth),
    db: Session = Depends(get_db)
):
    if is_authenticated:
        return {"data": "full details"}
    else:
        return {"data": "limited preview"}
```

## Password Requirements

Current settings:
- Minimum length: 4 characters
- No complexity requirements (user choice)
- Bcrypt hashing (industry standard)

To change minimum length, edit `/home/sylvia/ClaudeWork/TheProgram/backend/app/schemas_sqlite/auth.py`:

```python
class PasswordSetup(BaseModel):
    password: str = Field(..., min_length=8)  # Change to 8
```

## Token Expiry

Default: 24 hours

To change, edit `/home/sylvia/ClaudeWork/TheProgram/backend/app/core/auth_simple.py`:

```python
SESSION_TOKEN_EXPIRE_HOURS = 168  # Change to 7 days
```

## Security Notes

### What This Protects
- Unauthorized local access (if password is set)
- Basic privacy for personal data
- Prevents casual snooping

### What This Does NOT Protect
- Physical access to SQLite database file
- OS-level user access
- Network attacks (app is local-only anyway)

**This is appropriate for a personal single-user application!**

## Optional Features

### Disable Password (No-Auth Mode)

For trusted devices, users can disable password requirement:

```bash
curl -X POST http://localhost:8000/api/auth/disable-password \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "my_password",
    "confirm": true
  }'
```

After disabling, the app is accessible without login.

## Troubleshooting

### Import Errors
```bash
# Install dependencies
pip install passlib[bcrypt] python-jose[cryptography] fastapi sqlalchemy pydantic
```

### Database Not Initialized
```bash
python3 -c "from app.core.database_sqlite import init_db; init_db()"
```

### 401 Unauthorized
- Check token is included in Authorization header
- Verify token hasn't expired (24 hours default)
- Re-login to get fresh token

### Password Validation Failed
- Check minimum length (4 chars default)
- Ensure not just whitespace

## File Locations

All absolute paths for easy reference:

- **Core Auth**: `/home/sylvia/ClaudeWork/TheProgram/backend/app/core/auth_simple.py`
- **Schemas**: `/home/sylvia/ClaudeWork/TheProgram/backend/app/schemas_sqlite/auth.py`
- **Endpoints**: `/home/sylvia/ClaudeWork/TheProgram/backend/app/api/routes_sqlite/auth_simple.py`
- **Dependencies**: `/home/sylvia/ClaudeWork/TheProgram/backend/app/api/dependencies_simple.py`
- **Tests**: `/home/sylvia/ClaudeWork/TheProgram/backend/tests/test_auth_simple.py`
- **Docs**: `/home/sylvia/ClaudeWork/TheProgram/backend/docs/TASK-005-AUTH-IMPLEMENTATION.md`

## Next Steps

1. **TASK-006**: Frontend auth implementation
   - Create password setup screen
   - Create login screen
   - Implement token storage and management
   - Add protected route wrappers

2. **TASK-004**: Apply auth to existing endpoints
   - Identify which endpoints need protection
   - Add `Depends(verify_auth)` to sensitive routes

3. **Optional Enhancements**:
   - Biometric authentication
   - Remember me (longer token expiry)
   - Token refresh mechanism
   - Password strength meter in UI

## Success!

The simple authentication system is complete and ready to use. All files have been created, tested, and documented.

To verify: `python3 verify_auth_implementation.py`

Questions? Check `/home/sylvia/ClaudeWork/TheProgram/backend/docs/TASK-005-AUTH-IMPLEMENTATION.md`
