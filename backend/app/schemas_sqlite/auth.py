"""
Pydantic schemas for simple authentication

These schemas handle request/response validation for the
simple password-based authentication system.
"""
from pydantic import BaseModel, Field, field_validator


class PasswordSetup(BaseModel):
    """Request to set up password for the first time"""
    password: str = Field(
        ...,
        min_length=4,
        description="Password (minimum 4 characters)"
    )

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        """Ensure password is not just whitespace"""
        if not v or not v.strip():
            raise ValueError("Password cannot be empty or whitespace")
        return v


class LoginRequest(BaseModel):
    """Request to login with password"""
    password: str = Field(..., description="User password")


class LoginResponse(BaseModel):
    """Response after successful login"""
    access_token: str = Field(..., description="JWT session token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry time in seconds")


class TokenVerifyRequest(BaseModel):
    """Request to verify a token"""
    token: str = Field(..., description="Session token to verify")


class TokenVerifyResponse(BaseModel):
    """Response for token verification"""
    valid: bool = Field(..., description="Whether token is valid")
    message: str | None = Field(default=None, description="Optional message")


class ChangePasswordRequest(BaseModel):
    """Request to change password"""
    old_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ...,
        min_length=4,
        description="New password (minimum 4 characters)"
    )

    @field_validator("new_password")
    @classmethod
    def new_password_not_empty(cls, v: str) -> str:
        """Ensure new password is not just whitespace"""
        if not v or not v.strip():
            raise ValueError("New password cannot be empty or whitespace")
        return v

    @field_validator("new_password")
    @classmethod
    def passwords_different(cls, v: str, info) -> str:
        """Ensure new password is different from old password"""
        if "old_password" in info.data and v == info.data["old_password"]:
            raise ValueError("New password must be different from old password")
        return v


class DisablePasswordRequest(BaseModel):
    """Request to disable password requirement"""
    current_password: str = Field(..., description="Current password for verification")
    confirm: bool = Field(
        ...,
        description="Confirmation that user wants to disable password"
    )


class AuthStatus(BaseModel):
    """Current authentication status"""
    password_set: bool = Field(..., description="Whether a password has been set")
    require_password: bool = Field(
        ...,
        description="Whether password is required for access"
    )
    has_api_key: bool = Field(
        default=False,
        description="Whether Anthropic API key is configured"
    )
    message: str | None = Field(
        default=None,
        description="Optional status message"
    )


class MessageResponse(BaseModel):
    """Generic message response"""
    message: str = Field(..., description="Response message")
    success: bool = Field(default=True, description="Whether operation succeeded")


class ApiKeySetRequest(BaseModel):
    """Request to set or update Anthropic API key"""
    api_key: str = Field(
        ...,
        min_length=10,
        description="Anthropic API key (starts with sk-ant-)"
    )

    @field_validator("api_key")
    @classmethod
    def validate_api_key_format(cls, v: str) -> str:
        """Ensure API key is not just whitespace and has valid prefix"""
        if not v or not v.strip():
            raise ValueError("API key cannot be empty or whitespace")

        # Basic format validation
        v = v.strip()
        if not v.startswith("sk-ant-"):
            raise ValueError("Invalid API key format. Must start with 'sk-ant-'")

        return v


class ApiKeyStatusResponse(BaseModel):
    """Response for API key status"""
    has_api_key: bool = Field(..., description="Whether API key is configured")
    message: str | None = Field(default=None, description="Optional status message")


class ApiKeyValidateResponse(BaseModel):
    """Response for API key validation"""
    valid: bool = Field(..., description="Whether API key is valid")
    message: str = Field(..., description="Validation result message")
    model_access: list[str] | None = Field(
        default=None,
        description="List of accessible models if valid"
    )
