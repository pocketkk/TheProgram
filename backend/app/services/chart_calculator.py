"""
Chart calculation service
Assembles complete natal charts from birth data
"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from app.utils.ephemeris import EphemerisCalculator


class NatalChartCalculator:
    """
    Service for calculating complete natal charts
    Combines planetary positions, houses, and aspects into a single chart
    """

    # Major aspects with default orbs
    MAJOR_ASPECTS = {
        'conjunction': {'angle': 0, 'orb': 10},
        'opposition': {'angle': 180, 'orb': 10},
        'trine': {'angle': 120, 'orb': 8},
        'square': {'angle': 90, 'orb': 8},
        'sextile': {'angle': 60, 'orb': 6},
    }

    # Minor aspects with tighter orbs
    MINOR_ASPECTS = {
        'semi_sextile': {'angle': 30, 'orb': 2},
        'semi_square': {'angle': 45, 'orb': 2},
        'sesqui_square': {'angle': 135, 'orb': 2},
        'quincunx': {'angle': 150, 'orb': 3},
        'quintile': {'angle': 72, 'orb': 2},
        'bi_quintile': {'angle': 144, 'orb': 2},
    }

    @staticmethod
    def calculate_natal_chart(
        birth_datetime: datetime,
        latitude: float,
        longitude: float,
        timezone_offset_minutes: int = 0,
        house_system: str = 'placidus',
        zodiac: str = 'tropical',
        ayanamsa: str = 'lahiri',
        include_minor_aspects: bool = False,
        custom_orbs: Optional[Dict[str, float]] = None,
        include_nakshatras: bool = False
    ) -> Dict:
        """
        Calculate complete natal chart

        Args:
            birth_datetime: Birth date and time
            latitude: Birth location latitude
            longitude: Birth location longitude
            timezone_offset_minutes: Timezone offset from UTC in minutes
            house_system: House system to use (placidus, koch, whole_sign, etc.)
            zodiac: 'tropical' or 'sidereal'
            ayanamsa: Ayanamsa system for sidereal (lahiri, raman, etc.)
            include_minor_aspects: Include minor aspects
            custom_orbs: Custom orb values for aspects
            include_nakshatras: Include Vedic nakshatras for each planet (hybrid chart)

        Returns:
            Complete natal chart data as dictionary
        """
        # Convert to Julian Day
        jd = EphemerisCalculator.datetime_to_julian_day(
            birth_datetime,
            timezone_offset_minutes
        )

        # Calculate all planetary positions
        planets = EphemerisCalculator.calculate_all_planets(jd, zodiac=zodiac)

        # Calculate houses
        houses = EphemerisCalculator.calculate_houses(
            jd, latitude, longitude, house_system
        )

        # Calculate aspects
        aspect_set = {**NatalChartCalculator.MAJOR_ASPECTS}
        if include_minor_aspects:
            aspect_set.update(NatalChartCalculator.MINOR_ASPECTS)

        # Override with custom orbs if provided
        if custom_orbs:
            for aspect_name, orb_value in custom_orbs.items():
                if aspect_name in aspect_set:
                    aspect_set[aspect_name]['orb'] = orb_value

        aspects = NatalChartCalculator._calculate_all_aspects(
            planets, houses, aspect_set
        )

        # Detect aspect patterns
        patterns = NatalChartCalculator._detect_aspect_patterns(aspects, planets)

        # Build complete chart data
        chart_data = {
            'planets': planets,
            'houses': houses,
            'aspects': aspects,
            'patterns': patterns,
            'calculation_info': {
                'julian_day': jd,
                'house_system': house_system,
                'zodiac': zodiac,
                'ayanamsa': ayanamsa if zodiac == 'sidereal' else None,
                'birth_datetime': birth_datetime.isoformat(),
                'latitude': latitude,
                'longitude': longitude,
                'timezone_offset_minutes': timezone_offset_minutes,
            }
        }

        # Add ayanamsa value if sidereal
        if zodiac == 'sidereal':
            chart_data['calculation_info']['ayanamsa_value'] = \
                EphemerisCalculator.calculate_ayanamsa(jd, ayanamsa)

        # Add nakshatras if requested (hybrid chart feature)
        if include_nakshatras:
            # Lazy import to avoid circular dependency
            from app.services.vedic_calculator import VedicChartCalculator

            # For tropical charts, we need to convert to sidereal first
            if zodiac == 'tropical':
                # Calculate sidereal positions for nakshatra calculation
                sidereal_planets = EphemerisCalculator.calculate_all_planets(
                    jd, zodiac='sidereal', ayanamsa=ayanamsa
                )
                chart_data['nakshatras'] = VedicChartCalculator._calculate_nakshatras(sidereal_planets)
            else:
                # Already sidereal, use the existing positions
                chart_data['nakshatras'] = VedicChartCalculator._calculate_nakshatras(planets)

            chart_data['calculation_info']['include_nakshatras'] = True
            chart_data['calculation_info']['nakshatra_ayanamsa'] = ayanamsa

        return chart_data

    @staticmethod
    def _calculate_all_aspects(
        planets: Dict[str, Dict],
        houses: Dict,
        aspect_set: Dict[str, Dict]
    ) -> List[Dict]:
        """
        Calculate all aspects between planets and angles

        Args:
            planets: Dictionary of planet positions
            houses: Dictionary of house data (contains angles)
            aspect_set: Dictionary of aspects to check

        Returns:
            List of aspect dictionaries
        """
        aspects = []

        # Get all points to check (planets + angles)
        points = {}

        # Add planets
        for planet_name, planet_data in planets.items():
            if planet_data:  # Check if planet data is not None
                points[planet_name] = planet_data['longitude']

        # Add angles (Ascendant, MC)
        points['ascendant'] = houses['ascendant']
        points['mc'] = houses['mc']

        # Calculate aspects between all pairs
        point_names = list(points.keys())
        for i, point1_name in enumerate(point_names):
            for point2_name in point_names[i+1:]:
                long1 = points[point1_name]
                long2 = points[point2_name]

                # Check each aspect type
                for aspect_name, aspect_info in aspect_set.items():
                    aspect_result = EphemerisCalculator.calculate_aspect(
                        long1, long2,
                        aspect_info['angle'],
                        aspect_info['orb']
                    )

                    if aspect_result:
                        aspects.append({
                            'planet1': point1_name,
                            'planet2': point2_name,
                            'aspect_type': aspect_name,
                            'angle': aspect_info['angle'],
                            'orb': aspect_result['orb'],
                            'orb_abs': aspect_result['orb_abs'],
                            'applying': aspect_result['applying'],
                        })

        return aspects

    @staticmethod
    def _detect_aspect_patterns(
        aspects: List[Dict],
        planets: Dict[str, Dict]
    ) -> List[Dict]:
        """
        Detect major aspect patterns (Grand Trine, T-Square, Yod, etc.)

        Args:
            aspects: List of aspects
            planets: Dictionary of planet positions

        Returns:
            List of detected patterns
        """
        patterns = []

        # Grand Trine: 3 planets all in trine (120°) to each other
        patterns.extend(NatalChartCalculator._detect_grand_trines(aspects))

        # T-Square: 3 planets forming 2 squares and 1 opposition
        patterns.extend(NatalChartCalculator._detect_t_squares(aspects))

        # Grand Cross: 4 planets forming 4 squares and 2 oppositions
        patterns.extend(NatalChartCalculator._detect_grand_crosses(aspects))

        # Yod (Finger of God): 2 planets in sextile with both quincunx to a 3rd
        patterns.extend(NatalChartCalculator._detect_yods(aspects))

        # Stellium: 3+ planets in the same sign
        patterns.extend(NatalChartCalculator._detect_stelliums(planets))

        return patterns

    @staticmethod
    def _detect_grand_trines(aspects: List[Dict]) -> List[Dict]:
        """Detect Grand Trine patterns"""
        grand_trines = []

        # Get all trine aspects
        trines = [a for a in aspects if a['aspect_type'] == 'trine']

        # Find groups of 3 planets where all are in trine
        planets_in_trines = set()
        for aspect in trines:
            planets_in_trines.add(aspect['planet1'])
            planets_in_trines.add(aspect['planet2'])

        # Check each combination of 3 planets
        planet_list = list(planets_in_trines)
        for i, p1 in enumerate(planet_list):
            for j, p2 in enumerate(planet_list[i+1:], i+1):
                for p3 in planet_list[j+1:]:
                    # Check if all three are in trine with each other
                    has_trine_12 = any(
                        (a['planet1'] == p1 and a['planet2'] == p2) or
                        (a['planet1'] == p2 and a['planet2'] == p1)
                        for a in trines
                    )
                    has_trine_23 = any(
                        (a['planet1'] == p2 and a['planet2'] == p3) or
                        (a['planet1'] == p3 and a['planet2'] == p2)
                        for a in trines
                    )
                    has_trine_13 = any(
                        (a['planet1'] == p1 and a['planet2'] == p3) or
                        (a['planet1'] == p3 and a['planet2'] == p1)
                        for a in trines
                    )

                    if has_trine_12 and has_trine_23 and has_trine_13:
                        grand_trines.append({
                            'pattern_type': 'grand_trine',
                            'planets': [p1, p2, p3],
                            'description': f'Grand Trine: {p1}, {p2}, {p3}'
                        })

        return grand_trines

    @staticmethod
    def _detect_t_squares(aspects: List[Dict]) -> List[Dict]:
        """Detect T-Square patterns"""
        t_squares = []

        # Get squares and oppositions
        squares = [a for a in aspects if a['aspect_type'] == 'square']
        oppositions = [a for a in aspects if a['aspect_type'] == 'opposition']

        # For each opposition, look for a planet square to both ends
        for opp in oppositions:
            p1, p2 = opp['planet1'], opp['planet2']

            # Find planets that square both ends of the opposition
            for sq in squares:
                apex = None
                if sq['planet1'] == p1 or sq['planet1'] == p2:
                    apex = sq['planet2']
                elif sq['planet2'] == p1 or sq['planet2'] == p2:
                    apex = sq['planet1']

                if apex:
                    # Check if apex squares the other end of opposition
                    other_end = p2 if (sq['planet1'] == p1 or sq['planet2'] == p1) else p1
                    has_second_square = any(
                        (a['planet1'] == apex and a['planet2'] == other_end) or
                        (a['planet1'] == other_end and a['planet2'] == apex)
                        for a in squares
                    )

                    if has_second_square:
                        # Avoid duplicates
                        planets_set = frozenset([p1, p2, apex])
                        if not any(frozenset(ts['planets']) == planets_set for ts in t_squares):
                            t_squares.append({
                                'pattern_type': 't_square',
                                'planets': [p1, p2, apex],
                                'apex': apex,
                                'description': f'T-Square with apex at {apex}'
                            })

        return t_squares

    @staticmethod
    def _detect_grand_crosses(aspects: List[Dict]) -> List[Dict]:
        """Detect Grand Cross patterns"""
        # TODO: Implement grand cross detection
        return []

    @staticmethod
    def _detect_yods(aspects: List[Dict]) -> List[Dict]:
        """Detect Yod (Finger of God) patterns"""
        # TODO: Implement yod detection
        return []

    @staticmethod
    def _detect_stelliums(planets: Dict[str, Dict]) -> List[Dict]:
        """
        Detect stelliums (3+ planets in the same sign)

        Args:
            planets: Dictionary of planet positions

        Returns:
            List of stellium patterns
        """
        stelliums = []

        # Group planets by sign
        planets_by_sign = {}
        for planet_name, planet_data in planets.items():
            if planet_data and 'sign' in planet_data:
                sign = planet_data['sign']
                if sign not in planets_by_sign:
                    planets_by_sign[sign] = []
                planets_by_sign[sign].append(planet_name)

        # Find signs with 3+ planets
        for sign, planet_list in planets_by_sign.items():
            if len(planet_list) >= 3:
                sign_name = EphemerisCalculator.get_sign_name(sign)
                stelliums.append({
                    'pattern_type': 'stellium',
                    'planets': planet_list,
                    'sign': sign,
                    'sign_name': sign_name,
                    'description': f'Stellium in {sign_name}: {", ".join(planet_list)}'
                })

        return stelliums
