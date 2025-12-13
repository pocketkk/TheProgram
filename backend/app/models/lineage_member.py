"""
LineageMember model for storing family/ancestor connections

Enables the Lineage Mode feature - showing family members' ages
and life events on historical dates, creating a personal timeline
that extends beyond the user's own life.
"""
from sqlalchemy import Column, String, Float, Integer, Boolean, Index, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel
from app.core.json_helpers import JSONEncodedList


class LineageMember(BaseModel):
    """
    Family member or significant person for Lineage Mode.

    Stores birth (and optionally death) data for family members,
    ancestors, and significant people in the user's life. Used to
    calculate their age at any historical date and show life events.

    Fields:
        name: Person's name
        relationship: Relationship to user (mother, father, grandmother, friend, etc.)
        birth_date: Birth date (YYYY-MM-DD)
        birth_year: Birth year (for quick calculations)
        death_date: Death date if deceased (YYYY-MM-DD)
        death_year: Death year if deceased
        birth_location: Birth location name
        latitude: Birth latitude (for ancestor weather)
        longitude: Birth longitude (for ancestor weather)
        timezone: Birth timezone
        notes: Personal notes about this person
        life_events: Key life events with dates
            [{"date": "1965-06-15", "event": "Married your grandfather", "age": 23}]
        generation: Generation relative to user (-2=grandparent, -1=parent, 0=sibling, 1=child)
        is_ancestor: Whether this is an ancestor (for ancestor weather)
        birth_data_id: Optional link to full BirthData if user has their chart

    Example:
        grandmother = LineageMember(
            name="Mary Ellen Johnson",
            relationship="maternal grandmother",
            birth_date="1925-03-15",
            birth_year=1925,
            death_date="2010-11-22",
            death_year=2010,
            birth_location="Dublin, Ireland",
            generation=-2,
            is_ancestor=True,
            life_events=[
                {"date": "1945-06-15", "event": "Married", "age": 20},
                {"date": "1950-01-10", "event": "Emigrated to America", "age": 24},
                {"date": "1952-08-03", "event": "Your mother was born", "age": 27}
            ]
        )
    """
    __tablename__ = 'lineage_members'

    # Identity
    name = Column(
        String(255),
        nullable=False,
        comment="Person's full name"
    )

    relationship = Column(
        String(100),
        nullable=False,
        comment="Relationship to user: mother, father, grandmother, friend, mentor, etc."
    )

    # Dates
    birth_date = Column(
        String(10),
        nullable=True,
        index=True,
        comment="Birth date (YYYY-MM-DD) - null if unknown"
    )

    birth_year = Column(
        Integer,
        nullable=True,
        index=True,
        comment="Birth year for quick age calculations"
    )

    death_date = Column(
        String(10),
        nullable=True,
        comment="Death date (YYYY-MM-DD) - null if still living"
    )

    death_year = Column(
        Integer,
        nullable=True,
        comment="Death year if deceased"
    )

    # Location (for ancestor weather feature)
    birth_location = Column(
        String(255),
        nullable=True,
        comment="Birth location name"
    )

    latitude = Column(
        Float,
        nullable=True,
        comment="Birth location latitude (for ancestor weather)"
    )

    longitude = Column(
        Float,
        nullable=True,
        comment="Birth location longitude (for ancestor weather)"
    )

    timezone = Column(
        String(50),
        nullable=True,
        comment="Birth timezone"
    )

    # Personal details
    notes = Column(
        Text,
        nullable=True,
        comment="Personal notes and memories about this person"
    )

    life_events = Column(
        JSONEncodedList,
        nullable=True,
        default=list,
        comment='Key life events: [{"date": "YYYY-MM-DD", "event": "description", "age": 25}]'
    )

    # Classification
    generation = Column(
        Integer,
        nullable=True,
        default=0,
        comment="Generation relative to user: -2=grandparent, -1=parent, 0=sibling/self, 1=child"
    )

    is_ancestor = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether to include in ancestor weather feature"
    )

    is_living = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether person is currently living"
    )

    # Optional link to full birth chart
    birth_data_id = Column(
        String,
        ForeignKey('birth_data.id', ondelete='SET NULL'),
        nullable=True,
        comment="Optional link to full birth data for chart calculations"
    )

    # Relationships
    birth_data = relationship(
        'BirthData',
        foreign_keys=[birth_data_id],
        lazy='select'
    )

    # Indexes
    __table_args__ = (
        Index('idx_lineage_relationship', 'relationship'),
        Index('idx_lineage_birth_year', 'birth_year'),
        Index('idx_lineage_generation', 'generation'),
        Index('idx_lineage_is_ancestor', 'is_ancestor'),
    )

    def __repr__(self):
        years = f"{self.birth_year}" if self.birth_year else "?"
        if self.death_year:
            years += f"-{self.death_year}"
        return f"<LineageMember(name='{self.name}', relationship='{self.relationship}', years={years})>"

    def get_age_at_date(self, year: int, month: int = 1, day: int = 1) -> int | None:
        """
        Calculate age at a specific date.

        Returns None if birth year unknown or date is before birth.
        Returns negative age for dates before person was born.
        """
        if not self.birth_year:
            return None

        age = year - self.birth_year

        # Adjust for birth month/day if known
        if self.birth_date:
            birth_parts = self.birth_date.split('-')
            if len(birth_parts) >= 2:
                birth_month = int(birth_parts[1])
                birth_day = int(birth_parts[2]) if len(birth_parts) > 2 else 1
                if month < birth_month or (month == birth_month and day < birth_day):
                    age -= 1

        return age

    def was_alive_at(self, year: int, month: int = 1, day: int = 1) -> bool | None:
        """
        Check if person was alive at a specific date.

        Returns None if dates are unknown.
        """
        if not self.birth_year:
            return None

        # Check if before birth
        if year < self.birth_year:
            return False
        if year == self.birth_year and self.birth_date:
            parts = self.birth_date.split('-')
            if len(parts) >= 2:
                birth_month = int(parts[1])
                birth_day = int(parts[2]) if len(parts) > 2 else 1
                if month < birth_month or (month == birth_month and day < birth_day):
                    return False

        # Check if after death
        if self.death_year:
            if year > self.death_year:
                return False
            if year == self.death_year and self.death_date:
                parts = self.death_date.split('-')
                if len(parts) >= 2:
                    death_month = int(parts[1])
                    death_day = int(parts[2]) if len(parts) > 2 else 31
                    if month > death_month or (month == death_month and day > death_day):
                        return False

        return True

    def get_life_events_near_date(self, year: int, month: int, day: int, days_range: int = 30) -> list:
        """
        Get life events that occurred near a specific date (month/day match).

        This is for the "on this day in their life" feature.
        """
        if not self.life_events:
            return []

        matching = []
        for event in self.life_events:
            event_date = event.get('date', '')
            if not event_date:
                continue
            parts = event_date.split('-')
            if len(parts) >= 2:
                event_month = int(parts[1])
                event_day = int(parts[2]) if len(parts) > 2 else 1
                # Check if within range (simple month/day comparison)
                if event_month == month and abs(event_day - day) <= days_range:
                    matching.append(event)

        return matching

    def to_dict(self):
        """Convert to dictionary with computed fields"""
        result = super().to_dict()
        result['has_location'] = self.latitude is not None and self.longitude is not None
        return result

    def to_timeline_dict(self, target_year: int, target_month: int = 1, target_day: int = 1) -> dict:
        """
        Get dictionary representation for timeline display.

        Includes age at target date and relevant life events.
        """
        age = self.get_age_at_date(target_year, target_month, target_day)
        was_alive = self.was_alive_at(target_year, target_month, target_day)
        events = self.get_life_events_near_date(target_year, target_month, target_day)

        return {
            "id": self.id,
            "name": self.name,
            "relationship": self.relationship,
            "age_at_date": age,
            "was_alive": was_alive,
            "is_living_now": self.is_living,
            "generation": self.generation,
            "nearby_life_events": events,
            "birth_year": self.birth_year,
            "death_year": self.death_year,
            "notes": self.notes
        }
