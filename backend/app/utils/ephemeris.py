"""
Swiss Ephemeris wrapper for astronomical calculations
Provides high-level interface for chart calculations
"""
import swisseph as swe
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from app.core.config import settings

# Set ephemeris path on module import
swe.set_ephe_path(settings.EPHEMERIS_PATH)


class EphemerisCalculator:
    """
    Wrapper around Swiss Ephemeris for astrological calculations
    Handles planetary positions, house calculations, and conversions
    """

    # Planet constants mapping
    PLANETS = {
        'sun': swe.SUN,
        'moon': swe.MOON,
        'mercury': swe.MERCURY,
        'venus': swe.VENUS,
        'mars': swe.MARS,
        'jupiter': swe.JUPITER,
        'saturn': swe.SATURN,
        'uranus': swe.URANUS,
        'neptune': swe.NEPTUNE,
        'pluto': swe.PLUTO,
        'true_node': swe.TRUE_NODE,
        'mean_node': swe.MEAN_NODE,
        'chiron': swe.CHIRON,
        'lilith_mean': swe.MEAN_APOG,
        'lilith_true': swe.OSCU_APOG,
    }

    # House system codes
    HOUSE_SYSTEMS = {
        'placidus': b'P',
        'koch': b'K',
        'porphyry': b'O',
        'regiomontanus': b'R',
        'campanus': b'C',
        'equal': b'E',
        'whole_sign': b'W',
        'equal_mc': b'X',
        'meridian': b'M',
        'horizontal': b'H',
        'topocentric': b'T',
        'morinus': b'B',
        'alcabitius': b'B',
        'vehlow_equal': b'V',
    }

    # Ayanamsa systems (for Vedic)
    AYANAMSA_SYSTEMS = {
        'lahiri': swe.SIDM_LAHIRI,
        'raman': swe.SIDM_RAMAN,
        'krishnamurti': swe.SIDM_KRISHNAMURTI,
        'yukteshwar': swe.SIDM_YUKTESHWAR,
        'jn_bhasin': swe.SIDM_JN_BHASIN,
        'fagan_bradley': swe.SIDM_FAGAN_BRADLEY,
        'djwhal_khul': swe.SIDM_DJWHAL_KHUL,
        'true_chitrapaksha': swe.SIDM_TRUE_CITRA,
        'true_revati': swe.SIDM_TRUE_REVATI,
        'true_pushya': swe.SIDM_TRUE_PUSHYA,
    }

    @staticmethod
    def datetime_to_julian_day(dt: datetime, timezone_offset_minutes: int = 0) -> float:
        """
        Convert datetime to Julian Day (Universal Time)

        Args:
            dt: Python datetime object
            timezone_offset_minutes: Timezone offset in minutes from UTC

        Returns:
            Julian Day as float
        """
        # Convert to UTC by subtracting timezone offset
        utc_dt = dt - timedelta(minutes=timezone_offset_minutes)

        # Calculate decimal hour
        hour = utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0

        jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, hour)
        return jd

    @staticmethod
    def julian_day_to_datetime(jd: float) -> datetime:
        """
        Convert Julian Day to Python datetime

        Args:
            jd: Julian Day

        Returns:
            Python datetime object (UTC)
        """
        year, month, day, hour = swe.revjul(jd)

        # Convert decimal hour to hour, minute, second
        hours = int(hour)
        minutes = int((hour - hours) * 60)
        seconds = int(((hour - hours) * 60 - minutes) * 60)

        return datetime(year, month, day, hours, minutes, seconds)

    @staticmethod
    def calculate_planet_position(
        planet: str,
        jd: float,
        flags: int = swe.FLG_SWIEPH,
        zodiac: str = 'tropical'
    ) -> Dict:
        """
        Calculate position of a planet at given Julian Day

        Args:
            planet: Planet name (e.g., 'sun', 'moon', 'venus')
            jd: Julian Day
            flags: Swiss Ephemeris flags
            zodiac: 'tropical' or 'sidereal'

        Returns:
            Dict with planetary data:
            - longitude: Ecliptic longitude (0-360°)
            - latitude: Ecliptic latitude
            - distance: Distance from Earth (AU)
            - speed_longitude: Daily motion in longitude
            - speed_latitude: Daily motion in latitude
            - speed_distance: Daily change in distance
            - retrograde: Boolean, True if retrograde
            - sign: Zodiac sign (0-11, where 0=Aries)
            - degree_in_sign: Degree within sign (0-30)
        """
        planet_id = EphemerisCalculator.PLANETS.get(planet.lower())
        if planet_id is None:
            raise ValueError(f"Unknown planet: {planet}")

        # Add sidereal flag if using sidereal zodiac
        if zodiac == 'sidereal':
            flags |= swe.FLG_SIDEREAL
            # Set ayanamsa (default Lahiri)
            swe.set_sid_mode(swe.SIDM_LAHIRI)

        # Calculate position
        result, ret_flag = swe.calc_ut(jd, planet_id, flags)

        longitude = result[0]
        latitude = result[1]
        distance = result[2]
        speed_longitude = result[3]
        speed_latitude = result[4]
        speed_distance = result[5]

        # Determine sign and degree within sign
        sign = int(longitude / 30)  # 0=Aries, 1=Taurus, etc.
        degree_in_sign = longitude % 30

        # Check if retrograde (negative speed)
        retrograde = speed_longitude < 0

        return {
            'longitude': longitude,
            'latitude': latitude,
            'distance': distance,
            'speed_longitude': speed_longitude,
            'speed_latitude': speed_latitude,
            'speed_distance': speed_distance,
            'retrograde': retrograde,
            'sign': sign,
            'degree_in_sign': degree_in_sign,
            'sign_name': EphemerisCalculator.get_sign_name(sign),
        }

    @staticmethod
    def calculate_all_planets(
        jd: float,
        zodiac: str = 'tropical',
        include_asteroids: bool = False
    ) -> Dict[str, Dict]:
        """
        Calculate positions for all main planets

        Args:
            jd: Julian Day
            zodiac: 'tropical' or 'sidereal'
            include_asteroids: Include main asteroids (Ceres, Pallas, Juno, Vesta)

        Returns:
            Dictionary with planet names as keys and position data as values
        """
        planets = [
            'sun', 'moon', 'mercury', 'venus', 'mars',
            'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
            'true_node', 'chiron', 'lilith_mean'
        ]

        if include_asteroids:
            # TODO: Add asteroid calculations
            pass

        results = {}
        for planet in planets:
            try:
                results[planet] = EphemerisCalculator.calculate_planet_position(
                    planet, jd, zodiac=zodiac
                )
            except Exception as e:
                print(f"Error calculating {planet}: {e}")
                results[planet] = None

        return results

    @staticmethod
    def calculate_houses(
        jd: float,
        latitude: float,
        longitude: float,
        house_system: str = 'placidus'
    ) -> Dict:
        """
        Calculate house cusps and angles

        Args:
            jd: Julian Day
            latitude: Geographic latitude (-90 to +90)
            longitude: Geographic longitude (-180 to +180)
            house_system: House system code (e.g., 'placidus', 'koch', 'whole_sign')

        Returns:
            Dictionary with:
            - cusps: List of 12 house cusp longitudes
            - ascendant: Ascendant degree
            - mc: Midheaven (MC) degree
            - armc: ARMC (sidereal time)
            - vertex: Vertex degree
            - equatorial_ascendant: Equatorial Ascendant
            - co_ascendant: Co-ascendant (Koch)
        """
        house_code = EphemerisCalculator.HOUSE_SYSTEMS.get(house_system.lower())
        if house_code is None:
            raise ValueError(f"Unknown house system: {house_system}")

        # Validate latitude/longitude
        if not -90 <= latitude <= 90:
            raise ValueError(f"Latitude must be between -90 and +90, got {latitude}")
        if not -180 <= longitude <= 180:
            raise ValueError(f"Longitude must be between -180 and +180, got {longitude}")

        # Calculate houses
        cusps, ascmc = swe.houses(jd, latitude, longitude, house_code)

        return {
            'cusps': list(cusps[1:]),  # Skip index 0, use 1-12
            'ascendant': ascmc[0],
            'mc': ascmc[1],
            'armc': ascmc[2],
            'vertex': ascmc[3],
            'equatorial_ascendant': ascmc[4],
            'co_ascendant_koch': ascmc[5],
        }

    @staticmethod
    def get_sign_name(sign_number: int) -> str:
        """
        Get zodiac sign name from number

        Args:
            sign_number: 0-11 (0=Aries, 11=Pisces)

        Returns:
            Sign name as string
        """
        signs = [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ]
        return signs[sign_number % 12]

    @staticmethod
    def format_degree(longitude: float) -> str:
        """
        Format longitude as degree string (e.g., "15°23' Aries")

        Args:
            longitude: Ecliptic longitude (0-360°)

        Returns:
            Formatted string
        """
        sign_num = int(longitude / 30)
        degree_in_sign = longitude % 30
        degrees = int(degree_in_sign)
        minutes = int((degree_in_sign - degrees) * 60)

        return f"{degrees}°{minutes:02d}' {EphemerisCalculator.get_sign_name(sign_num)}"

    @staticmethod
    def calculate_aspect(
        long1: float,
        long2: float,
        aspect_angle: float,
        orb: float
    ) -> Optional[Dict]:
        """
        Check if two positions form an aspect

        Args:
            long1: Longitude of first point
            long2: Longitude of second point
            aspect_angle: Aspect angle (0, 60, 90, 120, 180, etc.)
            orb: Maximum orb (e.g., 8 degrees)

        Returns:
            Dictionary with aspect info if within orb, None otherwise:
            - angle: Actual angle between points
            - orb: Orb from exact (signed)
            - applying: True if applying, False if separating
        """
        # Calculate shortest arc between two longitudes
        diff = (long2 - long1) % 360
        if diff > 180:
            diff = diff - 360

        angle = abs(diff)

        # Check if within orb of aspect
        aspect_diff = abs(angle - aspect_angle)
        if aspect_diff <= orb:
            # TODO: Determine if applying or separating (requires speed data)
            return {
                'angle': angle,
                'orb': angle - aspect_angle,
                'orb_abs': aspect_diff,
                'applying': None,  # Requires speed calculation
            }

        return None

    @staticmethod
    def calculate_ayanamsa(jd: float, ayanamsa_system: str = 'lahiri') -> float:
        """
        Calculate ayanamsa value for given date (Vedic astrology)

        Args:
            jd: Julian Day
            ayanamsa_system: Ayanamsa system name

        Returns:
            Ayanamsa value in degrees
        """
        ayanamsa_id = EphemerisCalculator.AYANAMSA_SYSTEMS.get(ayanamsa_system.lower())
        if ayanamsa_id is None:
            raise ValueError(f"Unknown ayanamsa system: {ayanamsa_system}")

        swe.set_sid_mode(ayanamsa_id)
        ayanamsa_value = swe.get_ayanamsa_ut(jd)

        return ayanamsa_value

    @staticmethod
    def tropical_to_sidereal(tropical_long: float, jd: float, ayanamsa_system: str = 'lahiri') -> float:
        """
        Convert tropical longitude to sidereal

        Args:
            tropical_long: Tropical longitude
            jd: Julian Day
            ayanamsa_system: Ayanamsa system

        Returns:
            Sidereal longitude
        """
        ayanamsa = EphemerisCalculator.calculate_ayanamsa(jd, ayanamsa_system)
        sidereal_long = (tropical_long - ayanamsa) % 360
        return sidereal_long

    @staticmethod
    def sidereal_to_tropical(sidereal_long: float, jd: float, ayanamsa_system: str = 'lahiri') -> float:
        """
        Convert sidereal longitude to tropical

        Args:
            sidereal_long: Sidereal longitude
            jd: Julian Day
            ayanamsa_system: Ayanamsa system

        Returns:
            Tropical longitude
        """
        ayanamsa = EphemerisCalculator.calculate_ayanamsa(jd, ayanamsa_system)
        tropical_long = (sidereal_long + ayanamsa) % 360
        return tropical_long


# Example usage (for testing)
if __name__ == "__main__":
    # Example: Calculate chart for January 15, 1990, 14:30 in New York
    birth_datetime = datetime(1990, 1, 15, 14, 30)
    timezone_offset = -5 * 60  # EST is UTC-5
    latitude = 40.7128  # New York
    longitude = -74.0060

    # Calculate Julian Day
    jd = EphemerisCalculator.datetime_to_julian_day(birth_datetime, timezone_offset)
    print(f"Julian Day: {jd}")

    # Calculate Sun position
    sun = EphemerisCalculator.calculate_planet_position('sun', jd)
    print(f"\nSun: {EphemerisCalculator.format_degree(sun['longitude'])}")
    print(f"Retrograde: {sun['retrograde']}")

    # Calculate all planets
    planets = EphemerisCalculator.calculate_all_planets(jd)
    print("\nAll Planets:")
    for planet, data in planets.items():
        if data:
            print(f"{planet.title()}: {EphemerisCalculator.format_degree(data['longitude'])}")

    # Calculate houses
    houses = EphemerisCalculator.calculate_houses(jd, latitude, longitude, 'placidus')
    print(f"\nAscendant: {EphemerisCalculator.format_degree(houses['ascendant'])}")
    print(f"MC: {EphemerisCalculator.format_degree(houses['mc'])}")

    # Calculate ayanamsa
    ayanamsa = EphemerisCalculator.calculate_ayanamsa(jd, 'lahiri')
    print(f"\nLahiri Ayanamsa: {ayanamsa:.2f}°")
