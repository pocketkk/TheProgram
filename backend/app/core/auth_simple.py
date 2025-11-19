"""
Simple authentication utilities for single-user app

Provides password hashing, session token creation, and verification
for a local password-based authentication system.
"""
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.core.config import settings

# Password hashing context (using bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session token settings
SESSION_TOKEN_EXPIRE_HOURS = 24  # 24 hours by default


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Bcrypt hashed password

    Example:
        hashed = hash_password("my_password")
        # Store hashed in database
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password

    Args:
        plain_password: Plain text password from user
        hashed_password: Hashed password from database

    Returns:
        True if password matches, False otherwise

    Example:
        if verify_password(user_input, stored_hash):
            print("Password correct!")
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_session_token(expires_hours: int = SESSION_TOKEN_EXPIRE_HOURS) -> str:
    """
    Create a session token for authenticated user

    This creates a simple JWT token with session=True claim.
    No user_id needed since this is single-user app.

    Args:
        expires_hours: Token expiry time in hours (default 24)

    Returns:
        Encoded JWT token string

    Example:
        token = create_session_token()
        # Return to user, they include in Authorization header
    """
    now = datetime.utcnow()
    payload = {
        "session": True,
        "iat": now,  # Issued at
        "exp": now + timedelta(hours=expires_hours),  # Expiry
        "type": "session"
    }

    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return token


def verify_session_token(token: str) -> tuple[bool, Optional[str]]:
    """
    Verify a session token is valid and not expired

    Args:
        token: JWT token string

    Returns:
        Tuple of (is_valid, error_message)
        - (True, None) if valid
        - (False, "error message") if invalid

    Example:
        valid, error = verify_session_token(token)
        if valid:
            # Allow access
        else:
            # Return error
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        # Check if it's a session token
        if not payload.get("session"):
            return False, "Invalid token type"

        # Token is valid (expiry checked automatically by jwt.decode)
        return True, None

    except jwt.ExpiredSignatureError:
        return False, "Token has expired"

    except JWTError as e:
        return False, f"Invalid token: {str(e)}"

    except Exception as e:
        return False, f"Token verification error: {str(e)}"


def get_token_expiry_seconds(expires_hours: int = SESSION_TOKEN_EXPIRE_HOURS) -> int:
    """
    Get token expiry time in seconds

    Args:
        expires_hours: Hours until expiry

    Returns:
        Seconds until expiry

    Example:
        expires_in = get_token_expiry_seconds(24)
        # Returns 86400 (24 * 60 * 60)
    """
    return expires_hours * 60 * 60


def extract_token_from_header(authorization: Optional[str]) -> Optional[str]:
    """
    Extract token from Authorization header

    Args:
        authorization: Authorization header value (e.g., "Bearer <token>")

    Returns:
        Token string or None if invalid format

    Example:
        token = extract_token_from_header("Bearer abc123")
        # Returns "abc123"
    """
    if not authorization:
        return None

    parts = authorization.split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    return parts[1]
