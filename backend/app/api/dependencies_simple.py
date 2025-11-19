"""
Simple authentication dependencies for FastAPI

Provides dependencies for protecting routes with authentication.
"""
from typing import Annotated
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.core.auth_simple import verify_session_token, extract_token_from_header
from app.models_sqlite.app_config import AppConfig


async def verify_auth(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> bool:
    """
    Verify user is authenticated via session token

    This dependency can be used to protect endpoints that require authentication.
    It checks for a valid session token in the Authorization header.

    Args:
        authorization: Authorization header (format: "Bearer <token>")
        db: Database session

    Returns:
        True if authenticated

    Raises:
        401: If not authenticated or token is invalid

    Example:
        @router.get("/protected")
        async def protected_route(
            authenticated: bool = Depends(verify_auth),
            db: Session = Depends(get_db)
        ):
            # Only runs if user is authenticated
            return {"message": "You are authenticated!"}
    """
    # Check if password is required
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    # If no password is set, allow access
    if not config.password_hash:
        return True

    # Password is set, verify token
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Authorization header required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract token from "Bearer <token>" format
    token = extract_token_from_header(authorization)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token
    is_valid, error_message = verify_session_token(token)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_message or "Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True


async def optional_auth(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> bool:
    """
    Optional authentication - doesn't raise error if not authenticated

    This dependency can be used for endpoints that have different behavior
    for authenticated vs unauthenticated users, but don't require auth.

    Args:
        authorization: Authorization header (format: "Bearer <token>")
        db: Database session

    Returns:
        True if authenticated, False otherwise

    Example:
        @router.get("/data")
        async def get_data(
            is_authenticated: bool = Depends(optional_auth),
            db: Session = Depends(get_db)
        ):
            if is_authenticated:
                # Return full data
                return {"data": "full"}
            else:
                # Return limited data
                return {"data": "limited"}
    """
    # Check if password is required
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        return False

    # If no password is set, consider authenticated
    if not config.password_hash:
        return True

    # Password is set, check token
    if not authorization:
        return False

    # Extract token
    token = extract_token_from_header(authorization)

    if not token:
        return False

    # Verify token
    is_valid, _ = verify_session_token(token)

    return is_valid


async def require_no_password(db: Session = Depends(get_db)) -> bool:
    """
    Require that no password is set (for setup endpoints)

    Used to protect password setup endpoint to ensure it's only
    accessible when no password is configured.

    Args:
        db: Database session

    Returns:
        True if no password is set

    Raises:
        400: If password is already set

    Example:
        @router.post("/setup")
        async def setup(
            _: bool = Depends(require_no_password),
            db: Session = Depends(get_db)
        ):
            # Only runs if no password is set
            ...
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if config.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password already configured. Use change-password endpoint.",
        )

    return True


async def require_password_set(db: Session = Depends(get_db)) -> bool:
    """
    Require that a password is set

    Used to protect endpoints that require password to be configured.

    Args:
        db: Database session

    Returns:
        True if password is set

    Raises:
        400: If no password is set

    Example:
        @router.post("/login")
        async def login(
            _: bool = Depends(require_password_set),
            db: Session = Depends(get_db)
        ):
            # Only runs if password is configured
            ...
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if not config.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password configured. Use setup endpoint first.",
        )

    return True
