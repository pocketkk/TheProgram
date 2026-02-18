"""
Simple authentication endpoints for single-user app

Provides password-based authentication with local storage.
Uses app_config table to store password hash.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database_sqlite import get_db
from app.core.auth_simple import (
    hash_password,
    verify_password,
    create_session_token,
    verify_session_token,
    get_token_expiry_seconds,
)
from app.models.app_config import AppConfig
from app.schemas.auth import (
    PasswordSetup,
    LoginRequest,
    LoginResponse,
    TokenVerifyRequest,
    TokenVerifyResponse,
    ChangePasswordRequest,
    DisablePasswordRequest,
    AuthStatus,
    MessageResponse,
    ApiKeySetRequest,
    ApiKeyStatusResponse,
    ApiKeyValidateResponse,
    GoogleApiKeySetRequest,
    NewspaperStyleSetRequest,
    NewspaperStyleResponse,
    GuardianApiKeySetRequest,
    NYTApiKeySetRequest,
    NewsApiKeySetRequest,
    NewsSourcesStatusResponse,
    NewsSourcesPrioritySetRequest,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/status", response_model=AuthStatus)
async def get_auth_status(db: Session = Depends(get_db)):
    """
    Get current authentication status

    Returns whether password is set and if it's required.
    Used on app startup to determine if user needs to set up password.

    Returns:
        AuthStatus with password_set and require_password flags
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        # No config exists, should initialize
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized. Run database init.",
        )

    password_set = config.password_hash is not None
    require_password = password_set  # If password is set, it's required

    message = None
    if not password_set:
        message = "No password set. Please set up a password."
    else:
        message = "Password is configured."

    return AuthStatus(
        password_set=password_set,
        require_password=require_password,
        has_api_key=config.has_api_key,
        has_google_api_key=config.has_google_api_key,
        message=message,
    )


@router.post("/setup", response_model=MessageResponse)
async def setup_password(
    request: PasswordSetup,
    db: Session = Depends(get_db),
):
    """
    Set up password for the first time

    This endpoint should only be called when no password is set.
    It hashes the password and stores it in app_config.

    Args:
        request: PasswordSetup with password field

    Returns:
        Success message

    Raises:
        400: If password is already set
        500: If database error occurs
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    # Check if password already set
    if config.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password already set. Use change-password endpoint to update.",
        )

    # Hash and store password
    config.password_hash = hash_password(request.password)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save password: {str(e)}",
        )

    return MessageResponse(
        message="Password set up successfully",
        success=True,
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with password

    Verifies the password against stored hash and returns
    a session token if successful.

    Args:
        request: LoginRequest with password

    Returns:
        LoginResponse with access token

    Raises:
        401: If password is incorrect or not set
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    # Check if password is set
    if not config.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No password configured. Please set up password first.",
        )

    # Verify password
    if not verify_password(request.password, config.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    # Create session token
    token = create_session_token()
    expires_in = get_token_expiry_seconds()

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
    )


@router.post("/verify", response_model=TokenVerifyResponse)
async def verify_token(request: TokenVerifyRequest):
    """
    Verify if a session token is valid

    Checks token signature, expiry, and type.
    Used by frontend to verify if user is still authenticated.

    Args:
        request: TokenVerifyRequest with token

    Returns:
        TokenVerifyResponse with valid flag and optional message
    """
    is_valid, error_message = verify_session_token(request.token)

    return TokenVerifyResponse(
        valid=is_valid,
        message=error_message if not is_valid else "Token is valid",
    )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Change password

    Verifies old password, then updates to new password.
    Requires user to be authenticated.

    Args:
        request: ChangePasswordRequest with old and new passwords

    Returns:
        Success message

    Raises:
        401: If old password is incorrect
        400: If no password is set
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    # Check if password is set
    if not config.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password configured. Use setup endpoint first.",
        )

    # Verify old password
    if not verify_password(request.old_password, config.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Hash and store new password
    config.password_hash = hash_password(request.new_password)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update password: {str(e)}",
        )

    return MessageResponse(
        message="Password changed successfully",
        success=True,
    )


@router.post("/disable-password", response_model=MessageResponse)
async def disable_password(
    request: DisablePasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Disable password requirement (optional feature)

    Removes password requirement for trusted devices.
    Verifies current password before disabling.

    Args:
        request: DisablePasswordRequest with current password and confirmation

    Returns:
        Success message

    Raises:
        401: If current password is incorrect
        400: If confirmation is False
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    # Check if password is set
    if not config.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No password is set",
        )

    # Verify confirmation
    if not request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation required to disable password",
        )

    # Verify current password
    if not verify_password(request.current_password, config.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Remove password
    config.password_hash = None

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disable password: {str(e)}",
        )

    return MessageResponse(
        message="Password disabled. App is now accessible without authentication.",
        success=True,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """
    Logout endpoint (client-side only)

    Since we use stateless JWT tokens, logout is handled client-side
    by removing the token from storage. This endpoint exists for
    consistency and future stateful session management if needed.

    Returns:
        Success message
    """
    return MessageResponse(
        message="Logged out successfully. Clear token from client storage.",
        success=True,
    )


# =============================================================================
# API Key Management Endpoints
# =============================================================================


@router.get("/api-key/status", response_model=ApiKeyStatusResponse)
async def get_api_key_status(db: Session = Depends(get_db)):
    """
    Get API key configuration status

    Returns whether an Anthropic API key is configured.
    Used by frontend to show/hide AI features.

    Returns:
        ApiKeyStatusResponse with has_api_key flag and message
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    has_api_key = config.has_api_key
    message = (
        "Anthropic API key is configured. AI interpretations are available."
        if has_api_key
        else "No API key configured. Set your Anthropic API key to enable AI interpretations."
    )

    return ApiKeyStatusResponse(
        has_api_key=has_api_key,
        message=message,
    )


@router.post("/api-key", response_model=MessageResponse)
async def set_api_key(
    request: ApiKeySetRequest,
    db: Session = Depends(get_db),
):
    """
    Set or update Anthropic API key

    Stores the API key in the database for AI interpretation features.
    The key is validated for format but not tested against Anthropic API.
    Use /api-key/validate to test the key.

    Args:
        request: ApiKeySetRequest with api_key field

    Returns:
        Success message

    Raises:
        400: If API key format is invalid
        500: If database error occurs
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    # Store API key
    config.anthropic_api_key = request.api_key

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save API key: {str(e)}",
        )

    return MessageResponse(
        message="Anthropic API key saved successfully. AI interpretations are now available.",
        success=True,
    )


@router.delete("/api-key", response_model=MessageResponse)
async def clear_api_key(db: Session = Depends(get_db)):
    """
    Clear Anthropic API key

    Removes the stored API key from the database.
    AI interpretation features will be disabled.

    Returns:
        Success message

    Raises:
        400: If no API key is set
        500: If database error occurs
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if not config.has_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No API key is currently set",
        )

    # Clear API key
    config.anthropic_api_key = None

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear API key: {str(e)}",
        )

    return MessageResponse(
        message="API key cleared successfully. AI interpretations are now disabled.",
        success=True,
    )


@router.post("/api-key/validate", response_model=ApiKeyValidateResponse)
async def validate_api_key(db: Session = Depends(get_db)):
    """
    Validate Anthropic API key

    Tests the stored API key by making a minimal request to Anthropic API.
    Returns validation status and accessible models if valid.

    Returns:
        ApiKeyValidateResponse with validation status

    Raises:
        400: If no API key is configured
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if not config.has_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No API key configured. Please set an API key first.",
        )

    # Test API key with Anthropic
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=config.anthropic_api_key)

        # Make a minimal test request using Claude Haiku 4.5 (fast & cheap)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=10,
            messages=[{"role": "user", "content": "test"}],
        )

        # If we get here, the API key is valid
        return ApiKeyValidateResponse(
            valid=True,
            message="API key is valid and working correctly.",
            model_access=["claude-haiku-4-5-20251001", "claude-sonnet-4-6"],
        )

    except Exception as e:
        error_msg = str(e)

        # Parse common error messages
        if "authentication" in error_msg.lower() or "api key" in error_msg.lower():
            message = "Invalid API key. Please check your key and try again."
        elif "rate limit" in error_msg.lower():
            message = "API key is valid but rate limited. Try again later."
        elif "insufficient" in error_msg.lower():
            message = "API key is valid but has insufficient credits."
        else:
            message = f"API key validation failed: {error_msg}"

        return ApiKeyValidateResponse(
            valid=False,
            message=message,
            model_access=None,
        )


# =============================================================================
# Google API Key Management Endpoints (for Gemini Image Generation)
# =============================================================================


@router.get("/api-key/google/status", response_model=ApiKeyStatusResponse)
async def get_google_api_key_status(db: Session = Depends(get_db)):
    """
    Get Google API key configuration status

    Returns whether a Google API key is configured for Gemini image generation.
    Used by frontend to show/hide image generation features.

    Returns:
        ApiKeyStatusResponse with has_api_key flag and message
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    has_api_key = config.has_google_api_key
    message = (
        "Google API key is configured. Image generation is available."
        if has_api_key
        else "No Google API key configured. Set your API key to enable image generation."
    )

    return ApiKeyStatusResponse(
        has_api_key=has_api_key,
        message=message,
    )


@router.post("/api-key/google", response_model=MessageResponse)
async def set_google_api_key(
    request: GoogleApiKeySetRequest,
    db: Session = Depends(get_db),
):
    """
    Set or update Google API key

    Stores the API key in the database for Gemini image generation features.
    Use /api-key/google/validate to test the key.

    Args:
        request: ApiKeySetRequest with api_key field

    Returns:
        Success message

    Raises:
        500: If database error occurs
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    # Store API key
    config.google_api_key = request.api_key

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save API key: {str(e)}",
        )

    return MessageResponse(
        message="Google API key saved successfully. Image generation is now available.",
        success=True,
    )


@router.delete("/api-key/google", response_model=MessageResponse)
async def clear_google_api_key(db: Session = Depends(get_db)):
    """
    Clear Google API key

    Removes the stored API key from the database.
    Image generation features will be disabled.

    Returns:
        Success message

    Raises:
        400: If no API key is set
        500: If database error occurs
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if not config.has_google_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Google API key is currently set",
        )

    # Clear API key
    config.google_api_key = None

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear API key: {str(e)}",
        )

    return MessageResponse(
        message="Google API key cleared successfully. Image generation is now disabled.",
        success=True,
    )


@router.post("/api-key/google/validate", response_model=ApiKeyValidateResponse)
async def validate_google_api_key(db: Session = Depends(get_db)):
    """
    Validate Google API key

    Tests the stored API key by making a minimal request to Google Gemini API.
    Returns validation status and accessible models if valid.

    Returns:
        ApiKeyValidateResponse with validation status

    Raises:
        400: If no API key is configured
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if not config.has_google_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Google API key configured. Please set an API key first.",
        )

    # Test API key with Google Gemini
    try:
        from google import genai

        client = genai.Client(api_key=config.google_api_key)

        # Make a minimal test request
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents="test",
            config={"max_output_tokens": 10},
        )

        # If we get here, the API key is valid
        return ApiKeyValidateResponse(
            valid=True,
            message="Google API key is valid and working correctly.",
            model_access=["gemini-2.0-flash", "gemini-2.0-flash-exp-image-generation"],
        )

    except ImportError:
        return ApiKeyValidateResponse(
            valid=False,
            message="google-genai package not installed. Install with: pip install google-genai",
            model_access=None,
        )

    except Exception as e:
        error_msg = str(e)

        # Parse common error messages
        if "api key" in error_msg.lower() or "invalid" in error_msg.lower():
            message = "Invalid API key. Please check your key and try again."
        elif "quota" in error_msg.lower() or "rate" in error_msg.lower():
            message = "API key is valid but quota exceeded. Try again later."
        else:
            message = f"API key validation failed: {error_msg}"

        return ApiKeyValidateResponse(
            valid=False,
            message=message,
            model_access=None,
        )


# =============================================================================
# Preferences Endpoints
# =============================================================================


@router.get("/preferences/newspaper-style", response_model=NewspaperStyleResponse)
async def get_newspaper_style(db: Session = Depends(get_db)):
    """
    Get current newspaper style preference

    Returns the user's preferred newspaper style for the Timeline feature.

    Returns:
        NewspaperStyleResponse with current style setting
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    return NewspaperStyleResponse(
        style=config.newspaper_style or 'modern'
    )


@router.post("/preferences/newspaper-style", response_model=MessageResponse)
async def set_newspaper_style(
    request: NewspaperStyleSetRequest,
    db: Session = Depends(get_db),
):
    """
    Set newspaper style preference

    Updates the user's preferred newspaper style for the Timeline feature.

    Args:
        request: NewspaperStyleSetRequest with style ('victorian' or 'modern')

    Returns:
        Success message

    Raises:
        400: Invalid style value
        500: Database error
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    # Update newspaper style
    config.newspaper_style = request.style

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save newspaper style preference: {str(e)}",
        )

    style_name = "Victorian (Classic)" if request.style == "victorian" else "Modern"
    return MessageResponse(
        message=f"Newspaper style set to {style_name}",
        success=True,
    )


# =============================================================================
# News API Keys Management (Guardian, NYT, NewsAPI)
# =============================================================================


@router.get("/api-key/news/status", response_model=NewsSourcesStatusResponse)
async def get_news_sources_status(db: Session = Depends(get_db)):
    """
    Get news sources configuration status

    Returns which news API keys are configured and the source priority.
    Used by frontend to show/hide news source features.

    Returns:
        NewsSourcesStatusResponse with status for each source
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    configured_count = sum([
        config.has_guardian_api_key,
        config.has_nyt_api_key,
        config.has_newsapi_api_key,
    ])

    if configured_count == 0:
        message = "No news API keys configured. Wikipedia will be used as fallback."
    else:
        message = f"{configured_count} news source(s) configured."

    return NewsSourcesStatusResponse(
        guardian_configured=config.has_guardian_api_key,
        nyt_configured=config.has_nyt_api_key,
        newsapi_configured=config.has_newsapi_api_key,
        sources_priority=config.newspaper_sources_priority or "guardian,nyt,wikipedia",
        message=message,
    )


# Guardian API Key Endpoints
@router.get("/api-key/guardian/status", response_model=ApiKeyStatusResponse)
async def get_guardian_api_key_status(db: Session = Depends(get_db)):
    """Get Guardian API key configuration status"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    has_api_key = config.has_guardian_api_key
    message = (
        "Guardian API key is configured. News from 1999-present available."
        if has_api_key
        else "No Guardian API key configured. Get one at open-platform.theguardian.com"
    )

    return ApiKeyStatusResponse(has_api_key=has_api_key, message=message)


@router.post("/api-key/guardian", response_model=MessageResponse)
async def set_guardian_api_key(
    request: GuardianApiKeySetRequest,
    db: Session = Depends(get_db),
):
    """Set or update Guardian API key"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    config.guardian_api_key = request.api_key

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save API key: {str(e)}",
        )

    return MessageResponse(
        message="Guardian API key saved. News from 1999-present now available.",
        success=True,
    )


@router.delete("/api-key/guardian", response_model=MessageResponse)
async def clear_guardian_api_key(db: Session = Depends(get_db)):
    """Clear Guardian API key"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if not config.has_guardian_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Guardian API key is currently set",
        )

    config.guardian_api_key = None

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear API key: {str(e)}",
        )

    return MessageResponse(
        message="Guardian API key cleared.",
        success=True,
    )


# NYT API Key Endpoints
@router.get("/api-key/nyt/status", response_model=ApiKeyStatusResponse)
async def get_nyt_api_key_status(db: Session = Depends(get_db)):
    """Get NYT API key configuration status"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    has_api_key = config.has_nyt_api_key
    message = (
        "NYT API key is configured. News from 1851-present available."
        if has_api_key
        else "No NYT API key configured. Get one at developer.nytimes.com"
    )

    return ApiKeyStatusResponse(has_api_key=has_api_key, message=message)


@router.post("/api-key/nyt", response_model=MessageResponse)
async def set_nyt_api_key(
    request: NYTApiKeySetRequest,
    db: Session = Depends(get_db),
):
    """Set or update NYT API key"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    config.nyt_api_key = request.api_key

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save API key: {str(e)}",
        )

    return MessageResponse(
        message="NYT API key saved. News from 1851-present now available.",
        success=True,
    )


@router.delete("/api-key/nyt", response_model=MessageResponse)
async def clear_nyt_api_key(db: Session = Depends(get_db)):
    """Clear NYT API key"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if not config.has_nyt_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No NYT API key is currently set",
        )

    config.nyt_api_key = None

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear API key: {str(e)}",
        )

    return MessageResponse(
        message="NYT API key cleared.",
        success=True,
    )


# NewsAPI.org Key Endpoints (for future use)
@router.get("/api-key/newsapi/status", response_model=ApiKeyStatusResponse)
async def get_newsapi_api_key_status(db: Session = Depends(get_db)):
    """Get NewsAPI.org API key configuration status"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    has_api_key = config.has_newsapi_api_key
    message = (
        "NewsAPI.org API key is configured."
        if has_api_key
        else "No NewsAPI.org API key configured."
    )

    return ApiKeyStatusResponse(has_api_key=has_api_key, message=message)


@router.post("/api-key/newsapi", response_model=MessageResponse)
async def set_newsapi_api_key(
    request: NewsApiKeySetRequest,
    db: Session = Depends(get_db),
):
    """Set or update NewsAPI.org API key"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    config.newsapi_api_key = request.api_key

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save API key: {str(e)}",
        )

    return MessageResponse(
        message="NewsAPI.org API key saved.",
        success=True,
    )


@router.delete("/api-key/newsapi", response_model=MessageResponse)
async def clear_newsapi_api_key(db: Session = Depends(get_db)):
    """Clear NewsAPI.org API key"""
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    if not config.has_newsapi_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No NewsAPI.org API key is currently set",
        )

    config.newsapi_api_key = None

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear API key: {str(e)}",
        )

    return MessageResponse(
        message="NewsAPI.org API key cleared.",
        success=True,
    )


# News Sources Priority Endpoint
@router.post("/preferences/news-sources-priority", response_model=MessageResponse)
async def set_news_sources_priority(
    request: NewsSourcesPrioritySetRequest,
    db: Session = Depends(get_db),
):
    """
    Set news sources priority order

    Determines which sources are tried first when fetching news for the timeline.

    Args:
        request: NewsSourcesPrioritySetRequest with sources_priority

    Returns:
        Success message
    """
    config = db.query(AppConfig).filter_by(id=1).first()

    if not config:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Application not initialized",
        )

    config.newspaper_sources_priority = request.sources_priority

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save sources priority: {str(e)}",
        )

    return MessageResponse(
        message=f"News sources priority set to: {request.sources_priority}",
        success=True,
    )
