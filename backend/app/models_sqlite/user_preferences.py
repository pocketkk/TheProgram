"""
UserPreferences model for user's default chart settings

Singleton table - contains exactly ONE row (id=1)
Stores default calculation settings and UI preferences
"""
from sqlalchemy import Column, String

from app.models_sqlite.base import SingletonModel
from app.core.json_helpers import JSONEncodedDict, JSONEncodedList


class UserPreferences(SingletonModel):
    """
    User preferences singleton

    This table contains exactly one row with id=1.
    Stores user's default chart calculation settings and display preferences.

    Fields:
        id: Always 1 (singleton)
        default_house_system: Default house system (placidus, koch, etc.)
        default_ayanamsa: Default ayanamsa for Vedic (lahiri, raman, etc.)
        default_zodiac: Default zodiac type (tropical, sidereal)
        aspect_orbs: Aspect orb settings (JSON dict)
        color_scheme: UI color scheme (light, dark)
        displayed_points: Points to show in charts (JSON array)
        created_at: When preferences were created
        updated_at: Last update time (auto-updated)

    Example:
        # Get user preferences (there's always exactly one)
        prefs = db.query(UserPreferences).filter_by(id='1').first()

        # Update house system
        prefs.default_house_system = 'whole_sign'
        db.commit()

        # Update aspect orbs
        prefs.aspect_orbs = {
            'conjunction': 10,
            'opposition': 10,
            'trine': 8,
            'square': 8,
            'sextile': 6
        }
        db.commit()
    """
    __tablename__ = 'user_preferences'

    # Default chart calculation settings
    default_house_system = Column(
        String,
        nullable=False,
        default='placidus',
        comment="Default house system (placidus, koch, whole_sign, equal, etc.)"
    )

    default_ayanamsa = Column(
        String,
        nullable=False,
        default='lahiri',
        comment="Default ayanamsa for Vedic charts (lahiri, raman, krishnamurti, etc.)"
    )

    default_zodiac = Column(
        String,
        nullable=False,
        default='tropical',
        comment="Default zodiac type (tropical, sidereal)"
    )

    # Aspect orb settings (stored as JSON)
    aspect_orbs = Column(
        JSONEncodedDict,
        nullable=True,
        comment="Aspect orb settings as JSON dict: {'conjunction': 10, 'trine': 8, ...}"
    )

    # Display preferences
    color_scheme = Column(
        String,
        nullable=False,
        default='light',
        comment="UI color scheme (light, dark)"
    )

    # Points to display in charts (stored as JSON array)
    displayed_points = Column(
        JSONEncodedList,
        nullable=True,
        comment="Points to show in charts: ['sun', 'moon', 'mercury', 'venus', ...]"
    )

    def __repr__(self):
        """String representation"""
        return (
            f"<UserPreferences("
            f"house={self.default_house_system}, "
            f"zodiac={self.default_zodiac}, "
            f"theme={self.color_scheme}"
            f")>"
        )

    @property
    def default_orbs(self) -> dict:
        """
        Get aspect orbs with fallback to standard orbs

        Returns:
            Dictionary of aspect orbs
        """
        if self.aspect_orbs:
            return self.aspect_orbs

        # Standard orbs if not set
        return {
            'conjunction': 10,
            'opposition': 10,
            'trine': 8,
            'square': 8,
            'sextile': 6,
            'quincunx': 3,
            'semisextile': 3,
            'semisquare': 3,
            'sesquisquare': 3,
        }

    @property
    def default_points(self) -> list:
        """
        Get displayed points with fallback to standard planets

        Returns:
            List of point identifiers
        """
        if self.displayed_points:
            return self.displayed_points

        # Standard planets if not set
        return [
            'sun', 'moon', 'mercury', 'venus', 'mars',
            'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
            'north_node', 'south_node', 'chiron',
        ]
