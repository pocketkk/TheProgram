"""
SessionNote model for storing consultation session notes
"""
from sqlalchemy import Column, Date, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SessionNote(BaseModel):
    """
    Session note model

    Stores notes from consultation sessions with clients
    """
    __tablename__ = "session_notes"

    # Foreign keys
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Session information
    note_date = Column(Date, nullable=False, index=True)
    note_content = Column(Text, nullable=True)

    # Relationships
    client = relationship("Client", back_populates="session_notes")
    user = relationship("User", back_populates="session_notes")

    def __repr__(self):
        return f"<SessionNote(id={self.id}, client_id={self.client_id}, date={self.note_date})>"
