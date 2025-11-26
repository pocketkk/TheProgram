"""
Vedic astrology calculation service
Handles divisional charts, nakshatras, and Vedic-specific features
"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from app.utils.ephemeris import EphemerisCalculator


class VedicChartCalculator:
    """
    Service for calculating Vedic (Jyotish) astrological charts
    Includes divisional charts, nakshatras, and planetary strengths
    """

    # 27 Nakshatras with their ruling planets
    NAKSHATRAS = [
        {'name': 'Ashwini', 'lord': 'ketu', 'start': 0, 'end': 13.333333},
        {'name': 'Bharani', 'lord': 'venus', 'start': 13.333333, 'end': 26.666667},
        {'name': 'Krittika', 'lord': 'sun', 'start': 26.666667, 'end': 40},
        {'name': 'Rohini', 'lord': 'moon', 'start': 40, 'end': 53.333333},
        {'name': 'Mrigashira', 'lord': 'mars', 'start': 53.333333, 'end': 66.666667},
        {'name': 'Ardra', 'lord': 'rahu', 'start': 66.666667, 'end': 80},
        {'name': 'Punarvasu', 'lord': 'jupiter', 'start': 80, 'end': 93.333333},
        {'name': 'Pushya', 'lord': 'saturn', 'start': 93.333333, 'end': 106.666667},
        {'name': 'Ashlesha', 'lord': 'mercury', 'start': 106.666667, 'end': 120},
        {'name': 'Magha', 'lord': 'ketu', 'start': 120, 'end': 133.333333},
        {'name': 'Purva Phalguni', 'lord': 'venus', 'start': 133.333333, 'end': 146.666667},
        {'name': 'Uttara Phalguni', 'lord': 'sun', 'start': 146.666667, 'end': 160},
        {'name': 'Hasta', 'lord': 'moon', 'start': 160, 'end': 173.333333},
        {'name': 'Chitra', 'lord': 'mars', 'start': 173.333333, 'end': 186.666667},
        {'name': 'Swati', 'lord': 'rahu', 'start': 186.666667, 'end': 200},
        {'name': 'Vishakha', 'lord': 'jupiter', 'start': 200, 'end': 213.333333},
        {'name': 'Anuradha', 'lord': 'saturn', 'start': 213.333333, 'end': 226.666667},
        {'name': 'Jyeshtha', 'lord': 'mercury', 'start': 226.666667, 'end': 240},
        {'name': 'Mula', 'lord': 'ketu', 'start': 240, 'end': 253.333333},
        {'name': 'Purva Ashadha', 'lord': 'venus', 'start': 253.333333, 'end': 266.666667},
        {'name': 'Uttara Ashadha', 'lord': 'sun', 'start': 266.666667, 'end': 280},
        {'name': 'Shravana', 'lord': 'moon', 'start': 280, 'end': 293.333333},
        {'name': 'Dhanishta', 'lord': 'mars', 'start': 293.333333, 'end': 306.666667},
        {'name': 'Shatabhisha', 'lord': 'rahu', 'start': 306.666667, 'end': 320},
        {'name': 'Purva Bhadrapada', 'lord': 'jupiter', 'start': 320, 'end': 333.333333},
        {'name': 'Uttara Bhadrapada', 'lord': 'saturn', 'start': 333.333333, 'end': 346.666667},
        {'name': 'Revati', 'lord': 'mercury', 'start': 346.666667, 'end': 360},
    ]

    # Planetary dignities in Vedic astrology
    DIGNITIES = {
        'sun': {'exaltation': 'aries', 'debilitation': 'libra', 'own': ['leo']},
        'moon': {'exaltation': 'taurus', 'debilitation': 'scorpio', 'own': ['cancer']},
        'mars': {'exaltation': 'capricorn', 'debilitation': 'cancer', 'own': ['aries', 'scorpio']},
        'mercury': {'exaltation': 'virgo', 'debilitation': 'pisces', 'own': ['gemini', 'virgo']},
        'jupiter': {'exaltation': 'cancer', 'debilitation': 'capricorn', 'own': ['sagittarius', 'pisces']},
        'venus': {'exaltation': 'pisces', 'debilitation': 'virgo', 'own': ['taurus', 'libra']},
        'saturn': {'exaltation': 'libra', 'debilitation': 'aries', 'own': ['capricorn', 'aquarius']},
    }

    SIGN_NAMES = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
                  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']

    @staticmethod
    def calculate_vedic_chart(
        birth_datetime: datetime,
        latitude: float,
        longitude: float,
        timezone_offset_minutes: int = 0,
        ayanamsa: str = 'lahiri',
        house_system: str = 'whole_sign',
        include_divisional: Optional[List[int]] = None,
        include_western_aspects: bool = False,
        include_minor_aspects: bool = False,
        custom_orbs: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Calculate complete Vedic natal chart

        Args:
            birth_datetime: Birth date and time
            latitude: Birth location latitude
            longitude: Birth location longitude
            timezone_offset_minutes: Timezone offset from UTC in minutes
            ayanamsa: Ayanamsa system (lahiri, raman, krishnamurti, etc.)
            house_system: House system (whole_sign, placidus, equal, etc.)
            include_divisional: List of divisional charts to calculate (e.g., [1, 9, 10])
            include_western_aspects: Include Western-style aspects (hybrid chart feature)
            include_minor_aspects: Include minor aspects (if include_western_aspects is True)
            custom_orbs: Custom orb values for aspects

        Returns:
            Complete Vedic chart data including D-1, nakshatras, and requested divisionals
        """
        # Convert to Julian Day
        jd = EphemerisCalculator.datetime_to_julian_day(
            birth_datetime,
            timezone_offset_minutes
        )

        # Calculate sidereal positions using selected ayanamsa
        planets = EphemerisCalculator.calculate_all_planets(
            jd, zodiac='sidereal', ayanamsa=ayanamsa
        )

        # Calculate ayanamsa value
        ayanamsa_value = EphemerisCalculator.calculate_ayanamsa(jd, ayanamsa)

        # Calculate houses using selected house system
        houses = EphemerisCalculator.calculate_houses(
            jd, latitude, longitude, house_system
        )

        # Convert angles to sidereal
        houses['ascendant'] = EphemerisCalculator.tropical_to_sidereal(
            houses['ascendant'], jd, ayanamsa
        )
        houses['mc'] = EphemerisCalculator.tropical_to_sidereal(
            houses['mc'], jd, ayanamsa
        )

        # Calculate nakshatras for all planets
        nakshatras = VedicChartCalculator._calculate_nakshatras(planets)

        # Calculate planetary dignities
        dignities = VedicChartCalculator._calculate_dignities(planets)

        # Build D-1 (Rasi) chart
        d1_chart = {
            'division': 1,
            'name': 'Rasi (D-1)',
            'planets': planets,
            'houses': houses,
            'nakshatras': nakshatras,
            'dignities': dignities,
        }

        # Calculate divisional charts if requested
        divisional_charts = {}
        if include_divisional:
            for division in include_divisional:
                if division != 1:  # D-1 already calculated
                    divisional_charts[f'd{division}'] = \
                        VedicChartCalculator._calculate_divisional_chart(
                            planets, division
                        )

        # Build complete chart
        chart_data = {
            'd1': d1_chart,
            'divisional_charts': divisional_charts,
            'calculation_info': {
                'julian_day': jd,
                'ayanamsa': ayanamsa,
                'ayanamsa_value': ayanamsa_value,
                'house_system': house_system,
                'birth_datetime': birth_datetime.isoformat(),
                'latitude': latitude,
                'longitude': longitude,
                'timezone_offset_minutes': timezone_offset_minutes,
            }
        }

        # Add Western-style aspects if requested (hybrid chart feature)
        if include_western_aspects:
            # Lazy import to avoid circular dependency
            from app.services.chart_calculator import NatalChartCalculator

            aspect_set = {**NatalChartCalculator.MAJOR_ASPECTS}
            if include_minor_aspects:
                aspect_set.update(NatalChartCalculator.MINOR_ASPECTS)

            # Override with custom orbs if provided
            if custom_orbs:
                for aspect_name, orb_value in custom_orbs.items():
                    if aspect_name in aspect_set:
                        aspect_set[aspect_name]['orb'] = orb_value

            # Calculate aspects using sidereal positions
            aspects = NatalChartCalculator._calculate_all_aspects(
                planets, houses, aspect_set
            )

            # Detect aspect patterns
            patterns = NatalChartCalculator._detect_aspect_patterns(aspects, planets)

            chart_data['aspects'] = aspects
            chart_data['patterns'] = patterns
            chart_data['calculation_info']['include_western_aspects'] = True
            chart_data['calculation_info']['include_minor_aspects'] = include_minor_aspects

        return chart_data

    @staticmethod
    def _calculate_nakshatras(planets: Dict[str, Dict]) -> Dict[str, Dict]:
        """
        Calculate nakshatra positions for all planets

        Args:
            planets: Dictionary of planet positions (sidereal)

        Returns:
            Dictionary mapping planet names to nakshatra info
        """
        nakshatras = {}

        for planet_name, planet_data in planets.items():
            if planet_data and 'longitude' in planet_data:
                nakshatra_info = VedicChartCalculator._get_nakshatra(
                    planet_data['longitude']
                )
                nakshatras[planet_name] = nakshatra_info

        return nakshatras

    @staticmethod
    def _get_nakshatra(longitude: float) -> Dict:
        """
        Get nakshatra for a given longitude

        Args:
            longitude: Sidereal longitude (0-360°)

        Returns:
            Dictionary with nakshatra info:
            - name: Nakshatra name
            - number: Nakshatra number (1-27)
            - lord: Ruling planet
            - pada: Quarter/pada (1-4)
            - degrees: Degrees within nakshatra
        """
        # Each nakshatra is 13°20' (13.333333°)
        nakshatra_span = 13.333333

        # Find which nakshatra
        nakshatra_index = int(longitude / nakshatra_span)
        nakshatra = VedicChartCalculator.NAKSHATRAS[nakshatra_index]

        # Calculate pada (1-4, each pada is 3°20')
        degrees_in_nakshatra = longitude % nakshatra_span
        pada = int(degrees_in_nakshatra / (nakshatra_span / 4)) + 1

        return {
            'name': nakshatra['name'],
            'number': nakshatra_index + 1,
            'lord': nakshatra['lord'],
            'pada': pada,
            'degrees_in_nakshatra': degrees_in_nakshatra,
        }

    @staticmethod
    def _calculate_dignities(planets: Dict[str, Dict]) -> Dict[str, str]:
        """
        Calculate planetary dignities (exaltation, debilitation, own sign)

        Args:
            planets: Dictionary of planet positions

        Returns:
            Dictionary mapping planet names to dignity status
        """
        dignities = {}

        for planet_name, planet_data in planets.items():
            if planet_data and 'sign' in planet_data:
                sign_number = planet_data['sign']
                sign_name = VedicChartCalculator.SIGN_NAMES[sign_number]

                dignity = 'peregrine'  # Default

                if planet_name in VedicChartCalculator.DIGNITIES:
                    planet_dignity = VedicChartCalculator.DIGNITIES[planet_name]

                    # Check exaltation
                    if planet_dignity['exaltation'] == sign_name:
                        dignity = 'exalted'

                    # Check debilitation
                    elif planet_dignity['debilitation'] == sign_name:
                        dignity = 'debilitated'

                    # Check own sign
                    elif sign_name in planet_dignity['own']:
                        dignity = 'own_sign'

                dignities[planet_name] = dignity

        return dignities

    @staticmethod
    def _calculate_divisional_chart(
        planets: Dict[str, Dict],
        division: int
    ) -> Dict:
        """
        Calculate divisional chart (Varga)

        Args:
            planets: Dictionary of planet positions from D-1
            division: Division number (e.g., 9 for Navamsa)

        Returns:
            Divisional chart data
        """
        divisional_planets = {}

        for planet_name, planet_data in planets.items():
            if planet_data and 'longitude' in planet_data:
                # Calculate divisional position
                divisional_long = VedicChartCalculator._calculate_divisional_position(
                    planet_data['longitude'],
                    division
                )

                # Create divisional planet data
                divisional_planets[planet_name] = {
                    'longitude': divisional_long,
                    'sign': int(divisional_long / 30),
                    'degree_in_sign': divisional_long % 30,
                    'sign_name': EphemerisCalculator.get_sign_name(int(divisional_long / 30)),
                }

        return {
            'division': division,
            'name': VedicChartCalculator._get_division_name(division),
            'planets': divisional_planets,
        }

    @staticmethod
    def _calculate_divisional_position(longitude: float, division: int) -> float:
        """
        Calculate planet's position in divisional chart

        Args:
            longitude: Planet's longitude in D-1
            division: Division number

        Returns:
            Divisional longitude
        """
        # Each sign (30°) is divided into 'division' parts
        # Each part spans 30°/division degrees

        sign_number = int(longitude / 30)
        degree_in_sign = longitude % 30

        # Which division are we in within this sign?
        division_index = int(degree_in_sign / (30.0 / division))

        # Calculate the sign in the divisional chart
        # This is a simplified formula; actual formulas vary by division
        if division == 9:  # Navamsa (D-9) - special calculation
            # Navamsa uses a specific formula
            divisional_sign = (sign_number * 9 + division_index) % 12
        else:
            # General formula for most divisions
            divisional_sign = (sign_number * division + division_index) % 12

        # Position within the divisional sign
        degree_within_division = degree_in_sign % (30.0 / division)
        divisional_degree = (degree_within_division * division) % 30

        # Final longitude
        divisional_longitude = divisional_sign * 30 + divisional_degree

        return divisional_longitude

    @staticmethod
    def _get_division_name(division: int) -> str:
        """Get name of divisional chart"""
        division_names = {
            1: 'Rasi (D-1)',
            2: 'Hora (D-2)',
            3: 'Drekkana (D-3)',
            4: 'Chaturthamsa (D-4)',
            7: 'Saptamsa (D-7)',
            9: 'Navamsa (D-9)',
            10: 'Dasamsa (D-10)',
            12: 'Dwadasamsa (D-12)',
            16: 'Shodasamsa (D-16)',
            20: 'Vimsamsa (D-20)',
            24: 'Chaturvimsamsa (D-24)',
            27: 'Bhamsa (D-27)',
            30: 'Trimsamsa (D-30)',
            40: 'Khavedamsa (D-40)',
            45: 'Akshavedamsa (D-45)',
            60: 'Shashtiamsa (D-60)',
        }
        return division_names.get(division, f'D-{division}')
