"""
Client model for storing client information

Clients can have multiple birth data records and charts.
Even in single-user mode, allows organizing multiple people's charts.
"""
from sqlalchemy import Column, String, Index
from sqlalchemy.orm import relationship

from app.models_sqlite.base import BaseModel


class Client(BaseModel):
    """
    Client information model

    Stores basic information about clients (people whose charts are being read).
    In single-user mode, all clients belong to "the user".

    Fields:
        id: UUID primary key (inherited from BaseModel)
        first_name: Client's first name
        last_name: Client's last name
        email: Contact email
        phone: Contact phone number
        notes: General notes about client
        created_at: When client was created (inherited)
        updated_at: Last update time (inherited)

    Relationships:
        birth_data: List of birth data records for this client
        charts: List of charts for this client
        session_notes: List of session notes for this client

    Example:
        # Create a client
        client = Client(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="+1-555-0123"
        )
        db.add(client)
        db.commit()

        # Query with relationships
        client = db.query(Client).first()
        print(f"Charts: {len(client.charts)}")
        print(f"Birth records: {len(client.birth_data)}")
    """
    __tablename__ = 'clients'

    # Client information
    first_name = Column(
        String,
        nullable=True,
        comment="Client's first name"
    )

    last_name = Column(
        String,
        nullable=True,
        index=True,
        comment="Client's last name (indexed for search)"
    )

    email = Column(
        String,
        nullable=True,
        comment="Contact email address"
    )

    phone = Column(
        String,
        nullable=True,
        comment="Contact phone number"
    )

    # Notes
    notes = Column(
        String,
        nullable=True,
        comment="General notes about the client"
    )

    # Relationships
    birth_data = relationship(
        'BirthData',
        back_populates='client',
        cascade='all, delete-orphan',
        lazy='select'
    )

    charts = relationship(
        'Chart',
        back_populates='client',
        cascade='all, delete-orphan',
        lazy='select'
    )

    session_notes = relationship(
        'SessionNote',
        back_populates='client',
        cascade='all, delete-orphan',
        lazy='select'
    )

    # Additional table arguments for indexes
    __table_args__ = (
        Index('idx_clients_last_name', 'last_name'),
        Index('idx_clients_created_at', 'created_at'),
    )

    def __repr__(self):
        """String representation"""
        name = self.full_name or "Unnamed Client"
        return f"<Client(id={self.id[:8]}..., name='{name}')>"

    @property
    def full_name(self) -> str:
        """
        Get client's full name

        Returns:
            Full name (first + last) or empty string
        """
        parts = []
        if self.first_name:
            parts.append(self.first_name)
        if self.last_name:
            parts.append(self.last_name)
        return ' '.join(parts)

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation with full_name added
        """
        result = super().to_dict()
        result['full_name'] = self.full_name
        # Don't include relationships in basic dict
        return result
