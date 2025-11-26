"""
Celestial Body Registry - Single source of truth for all celestial bodies
Supports planets, asteroids, fixed stars, and calculated points
"""
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable
import swisseph as swe


class BodyCategory(Enum):
    """Categories of celestial bodies"""
    LUMINARY = "luminary"           # Sun, Moon
    PLANET = "planet"               # Mercury through Pluto
    ASTEROID = "asteroid"           # Ceres, Pallas, Juno, Vesta
    CENTAUR = "centaur"             # Chiron
    NODE = "node"                   # Lunar nodes
    CALCULATED = "calculated"       # Lilith, Part of Fortune, etc.
    FIXED_STAR = "fixed_star"       # Regulus, Spica, etc.
    HYPOTHETICAL = "hypothetical"   # Transpluto, Vulcan, etc.


@dataclass
class CelestialBody:
    """
    Definition of a celestial body for astrological calculations

    Attributes:
        id: Unique identifier (e.g., 'sun', 'ceres', 'regulus')
        name: Display name (e.g., 'Sun', 'Ceres', 'Regulus')
        symbol: Unicode symbol (e.g., '☉', '⚳', '★')
        category: Body category for grouping and filtering
        swe_id: Swiss Ephemeris constant (None for calculated/fixed points)
        default_enabled: Include in charts by default
        supports_retrograde: Can this body appear retrograde
        color: Default display color (hex)
        fixed_longitude: For fixed stars, ecliptic longitude (degrees)
        precession_rate: Annual precession in arc-seconds (50.3" typical)
    """
    id: str
    name: str
    symbol: str
    category: BodyCategory
    swe_id: Optional[int] = None
    default_enabled: bool = True
    supports_retrograde: bool = True
    color: str = "#FFFFFF"
    fixed_longitude: Optional[float] = None
    precession_rate: Optional[float] = None


# =============================================================================
# CELESTIAL BODIES REGISTRY
# =============================================================================
# To add a new body, simply add an entry here. No other files need modification.

BODIES: Dict[str, CelestialBody] = {
    # =========================================================================
    # LUMINARIES
    # =========================================================================
    'sun': CelestialBody(
        id='sun', name='Sun', symbol='☉',
        category=BodyCategory.LUMINARY, swe_id=swe.SUN,
        default_enabled=True, supports_retrograde=False,
        color='#FFD700'
    ),
    'moon': CelestialBody(
        id='moon', name='Moon', symbol='☽',
        category=BodyCategory.LUMINARY, swe_id=swe.MOON,
        default_enabled=True, supports_retrograde=False,
        color='#C0C0C0'
    ),

    # =========================================================================
    # PLANETS
    # =========================================================================
    'mercury': CelestialBody(
        id='mercury', name='Mercury', symbol='☿',
        category=BodyCategory.PLANET, swe_id=swe.MERCURY,
        default_enabled=True, supports_retrograde=True,
        color='#B5A642'
    ),
    'venus': CelestialBody(
        id='venus', name='Venus', symbol='♀',
        category=BodyCategory.PLANET, swe_id=swe.VENUS,
        default_enabled=True, supports_retrograde=True,
        color='#FFC0CB'
    ),
    'mars': CelestialBody(
        id='mars', name='Mars', symbol='♂',
        category=BodyCategory.PLANET, swe_id=swe.MARS,
        default_enabled=True, supports_retrograde=True,
        color='#FF4500'
    ),
    'jupiter': CelestialBody(
        id='jupiter', name='Jupiter', symbol='♃',
        category=BodyCategory.PLANET, swe_id=swe.JUPITER,
        default_enabled=True, supports_retrograde=True,
        color='#FFA500'
    ),
    'saturn': CelestialBody(
        id='saturn', name='Saturn', symbol='♄',
        category=BodyCategory.PLANET, swe_id=swe.SATURN,
        default_enabled=True, supports_retrograde=True,
        color='#8B7355'
    ),
    'uranus': CelestialBody(
        id='uranus', name='Uranus', symbol='♅',
        category=BodyCategory.PLANET, swe_id=swe.URANUS,
        default_enabled=True, supports_retrograde=True,
        color='#40E0D0'
    ),
    'neptune': CelestialBody(
        id='neptune', name='Neptune', symbol='♆',
        category=BodyCategory.PLANET, swe_id=swe.NEPTUNE,
        default_enabled=True, supports_retrograde=True,
        color='#4169E1'
    ),
    'pluto': CelestialBody(
        id='pluto', name='Pluto', symbol='♇',
        category=BodyCategory.PLANET, swe_id=swe.PLUTO,
        default_enabled=True, supports_retrograde=True,
        color='#8B0000'
    ),

    # =========================================================================
    # LUNAR NODES
    # =========================================================================
    'north_node': CelestialBody(
        id='north_node', name='North Node', symbol='☊',
        category=BodyCategory.NODE, swe_id=swe.TRUE_NODE,
        default_enabled=True, supports_retrograde=True,
        color='#9932CC'
    ),
    'south_node': CelestialBody(
        id='south_node', name='South Node', symbol='☋',
        category=BodyCategory.NODE, swe_id=None,  # Calculated as opposite of north
        default_enabled=True, supports_retrograde=True,
        color='#9932CC'
    ),
    'mean_node': CelestialBody(
        id='mean_node', name='Mean Node', symbol='☊',
        category=BodyCategory.NODE, swe_id=swe.MEAN_NODE,
        default_enabled=False, supports_retrograde=True,
        color='#9932CC'
    ),

    # =========================================================================
    # CENTAURS
    # =========================================================================
    'chiron': CelestialBody(
        id='chiron', name='Chiron', symbol='⚷',
        category=BodyCategory.CENTAUR, swe_id=swe.CHIRON,
        default_enabled=True, supports_retrograde=True,
        color='#20B2AA'
    ),

    # =========================================================================
    # ASTEROIDS (Big 4)
    # =========================================================================
    'ceres': CelestialBody(
        id='ceres', name='Ceres', symbol='⚳',
        category=BodyCategory.ASTEROID, swe_id=swe.CERES,
        default_enabled=False, supports_retrograde=True,
        color='#8B4513'
    ),
    'pallas': CelestialBody(
        id='pallas', name='Pallas', symbol='⚴',
        category=BodyCategory.ASTEROID, swe_id=swe.PALLAS,
        default_enabled=False, supports_retrograde=True,
        color='#4682B4'
    ),
    'juno': CelestialBody(
        id='juno', name='Juno', symbol='⚵',
        category=BodyCategory.ASTEROID, swe_id=swe.JUNO,
        default_enabled=False, supports_retrograde=True,
        color='#DA70D6'
    ),
    'vesta': CelestialBody(
        id='vesta', name='Vesta', symbol='⚶',
        category=BodyCategory.ASTEROID, swe_id=swe.VESTA,
        default_enabled=False, supports_retrograde=True,
        color='#FF6347'
    ),

    # =========================================================================
    # CALCULATED POINTS
    # =========================================================================
    'lilith': CelestialBody(
        id='lilith', name='Lilith', symbol='⚸',
        category=BodyCategory.CALCULATED, swe_id=swe.MEAN_APOG,
        default_enabled=True, supports_retrograde=True,
        color='#800080'
    ),
    'lilith_true': CelestialBody(
        id='lilith_true', name='True Lilith', symbol='⚸',
        category=BodyCategory.CALCULATED, swe_id=swe.OSCU_APOG,
        default_enabled=False, supports_retrograde=True,
        color='#800080'
    ),

    # =========================================================================
    # FIXED STARS (Initial Set)
    # Longitudes are for J2000 epoch, precession rate ~50.3"/year
    # =========================================================================
    'regulus': CelestialBody(
        id='regulus', name='Regulus', symbol='★',
        category=BodyCategory.FIXED_STAR, swe_id=None,
        default_enabled=False, supports_retrograde=False,
        color='#87CEEB',
        fixed_longitude=149.83,  # ~0° Virgo (J2000)
        precession_rate=50.3
    ),
    'spica': CelestialBody(
        id='spica', name='Spica', symbol='★',
        category=BodyCategory.FIXED_STAR, swe_id=None,
        default_enabled=False, supports_retrograde=False,
        color='#E6E6FA',
        fixed_longitude=203.83,  # ~24° Libra (J2000)
        precession_rate=50.3
    ),
    'algol': CelestialBody(
        id='algol', name='Algol', symbol='★',
        category=BodyCategory.FIXED_STAR, swe_id=None,
        default_enabled=False, supports_retrograde=False,
        color='#FF0000',
        fixed_longitude=56.17,   # ~26° Taurus (J2000)
        precession_rate=50.3
    ),
}


class CelestialRegistry:
    """
    Registry for accessing celestial body definitions
    Provides filtering, lookup, and compatibility methods
    """

    @classmethod
    def get(cls, body_id: str) -> Optional[CelestialBody]:
        """Get a body by its ID"""
        return BODIES.get(body_id)

    @classmethod
    def get_all(cls) -> List[CelestialBody]:
        """Get all registered bodies"""
        return list(BODIES.values())

    @classmethod
    def get_all_ids(cls) -> List[str]:
        """Get all body IDs"""
        return list(BODIES.keys())

    @classmethod
    def get_default(cls) -> List[CelestialBody]:
        """Get bodies enabled by default"""
        return [b for b in BODIES.values() if b.default_enabled]

    @classmethod
    def get_default_ids(cls) -> List[str]:
        """Get IDs of bodies enabled by default"""
        return [b.id for b in BODIES.values() if b.default_enabled]

    @classmethod
    def get_by_category(cls, category: BodyCategory) -> List[CelestialBody]:
        """Get all bodies in a category"""
        return [b for b in BODIES.values() if b.category == category]

    @classmethod
    def get_with_swe_id(cls) -> List[CelestialBody]:
        """Get bodies that have Swiss Ephemeris IDs (can be calculated directly)"""
        return [b for b in BODIES.values() if b.swe_id is not None]

    @classmethod
    def get_fixed_stars(cls) -> List[CelestialBody]:
        """Get all fixed stars"""
        return cls.get_by_category(BodyCategory.FIXED_STAR)

    @classmethod
    def get_asteroids(cls) -> List[CelestialBody]:
        """Get all asteroids (including centaurs)"""
        asteroids = cls.get_by_category(BodyCategory.ASTEROID)
        centaurs = cls.get_by_category(BodyCategory.CENTAUR)
        return asteroids + centaurs

    @classmethod
    def get_swe_mapping(cls) -> Dict[str, int]:
        """
        Get Swiss Ephemeris ID mapping (backward compatible with old PLANETS dict)
        Returns dict of body_id -> swe constant
        """
        return {b.id: b.swe_id for b in BODIES.values() if b.swe_id is not None}

    @classmethod
    def get_planets_for_calculation(cls, include_asteroids: bool = False) -> List[str]:
        """
        Get list of body IDs for chart calculation
        Backward compatible with old calculate_all_planets() behavior
        """
        ids = []
        for body in BODIES.values():
            if body.swe_id is None:
                continue
            if body.category in (BodyCategory.LUMINARY, BodyCategory.PLANET,
                                 BodyCategory.NODE, BodyCategory.CENTAUR,
                                 BodyCategory.CALCULATED):
                if body.default_enabled:
                    ids.append(body.id)
            elif body.category == BodyCategory.ASTEROID:
                if include_asteroids:
                    ids.append(body.id)
        return ids


# Convenience instance
registry = CelestialRegistry()
