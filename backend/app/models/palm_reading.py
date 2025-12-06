"""
Palm Reading SQLAlchemy Model

Stores palm reading analyses and their associated data.
"""
from sqlalchemy import Column, String, Text, Integer, Boolean

from app.models.base import BaseModel


class PalmReading(BaseModel):
    """
    Palm reading record storing analysis results

    Attributes:
        id: UUID primary key
        hand_type: Type of hand analyzed ('left', 'right', 'both')
        full_reading: Complete AI-generated palm reading text
        sections_json: JSON string of parsed reading sections
        image_path: Path to the stored palm image file
        additional_context: Optional user-provided context
        model_used: AI model used for the analysis
        tokens_input: Number of input tokens used
        tokens_output: Number of output tokens used
        notes: User's personal notes on the reading
        is_favorite: Whether the user has marked this as a favorite
        created_at: Timestamp of creation
        updated_at: Timestamp of last update
    """
    __tablename__ = 'palm_readings'

    # Reading data
    hand_type = Column(String(20), nullable=False, default='both')
    full_reading = Column(Text, nullable=False)
    sections_json = Column(Text, nullable=True)  # JSON string of parsed sections

    # Image reference
    image_path = Column(String(500), nullable=True)

    # Context
    additional_context = Column(String(500), nullable=True)

    # AI metadata
    model_used = Column(String(100), nullable=True)
    tokens_input = Column(Integer, nullable=True)
    tokens_output = Column(Integer, nullable=True)

    # User interaction
    notes = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False, nullable=False)

    def __repr__(self):
        return f"<PalmReading(id={self.id}, hand_type={self.hand_type}, created_at={self.created_at})>"
