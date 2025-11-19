"""
Client-related Pydantic schemas (single-user mode)

No user_id fields - all clients belong to "the user"
"""
from typing import Optional
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from uuid import UUID


class ClientBase(BaseModel):
    """Base client schema with common fields"""
    first_name: Optional[str] = Field(None, max_length=100, description="Client first name")
    last_name: Optional[str] = Field(None, max_length=100, description="Client last name")
    email: Optional[EmailStr] = Field(None, description="Client email address")
    phone: Optional[str] = Field(None, max_length=50, description="Client phone number")
    notes: Optional[str] = Field(None, description="Free-form notes about the client")


class ClientCreate(ClientBase):
    """Schema for creating a new client"""
    pass


class ClientUpdate(BaseModel):
    """Schema for updating client information"""
    first_name: Optional[str] = Field(None, max_length=100, description="Client first name")
    last_name: Optional[str] = Field(None, max_length=100, description="Client last name")
    email: Optional[EmailStr] = Field(None, description="Client email address")
    phone: Optional[str] = Field(None, max_length=50, description="Client phone number")
    notes: Optional[str] = Field(None, description="Free-form notes")


class ClientResponse(ClientBase):
    """Schema for client response (no user_id)"""
    id: UUID = Field(..., description="Client ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class ClientWithStats(ClientResponse):
    """Client response with statistics"""
    birth_data_count: int = Field(0, description="Number of birth data records")
    chart_count: int = Field(0, description="Number of charts")
    session_notes_count: int = Field(0, description="Number of session notes")
