"""
Common schemas shared across all endpoints
"""
from pydantic import BaseModel, Field


class Message(BaseModel):
    """Standard message response"""
    message: str = Field(..., description="Response message")
    detail: str = Field(None, description="Additional details")
