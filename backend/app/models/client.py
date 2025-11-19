"""
Client model for storing client information
"""
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Client(BaseModel):
    """
    Client model

    Represents clients/customers of astrologers
    One user can have many clients
    """
    __tablename__ = "clients"

    # Foreign key to user
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Client information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="clients")

    birth_data = relationship(
        "BirthData",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    charts = relationship(
        "Chart",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    session_notes = relationship(
        "SessionNote",
        back_populates="client",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    def __repr__(self):
        return f"<Client(id={self.id}, name={self.full_name})>"

    @property
    def full_name(self) -> str:
        """Get full name of client"""
        parts = []
        if self.first_name:
            parts.append(self.first_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts) if parts else "Unnamed Client"

    @property
    def primary_birth_data(self):
        """Get primary birth data for this client"""
        return self.birth_data.first()
