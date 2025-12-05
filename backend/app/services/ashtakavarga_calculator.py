"""
Ashtakavarga Calculator Service

Calculates Ashtakavarga (8-fold divisional strength) in Vedic astrology.
This system evaluates planetary strength by counting benefic points (bindus)
each planet receives in each sign based on positions of other planets.

The Sarvashtakavarga (combined total) is particularly useful for:
- Transit analysis (planets transiting signs with high points give better results)
- Determining favorable signs for activities
- Overall strength assessment of houses
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict


class AshtakavargaCalculator:
    """
    Calculates Ashtakavarga for Vedic charts.

    Each of the 7 planets (Sun through Saturn) and the Ascendant
    contributes benefic points to signs based on their positions
    relative to each other.

    - Bhinnashtakavarga: Individual planet's point chart (max 8 per sign)
    - Sarvashtakavarga: Combined totals (max 48 per sign)
    """

    # The 7 planets used in Ashtakavarga
    PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']

    SIGN_NAMES = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ]

    PLANET_NAMES = {
        'sun': 'Sun',
        'moon': 'Moon',
        'mars': 'Mars',
        'mercury': 'Mercury',
        'jupiter': 'Jupiter',
        'venus': 'Venus',
        'saturn': 'Saturn',
    }

    # Benefic positions for each planet
    # Key format: "from_X" where X is the reference planet
    # Values are house numbers (1-12) from the reference planet that give a bindu
    # Based on classical Ashtakavarga rules

    BENEFIC_POSITIONS = {
        'sun': {
            'from_sun': [1, 2, 4, 7, 8, 9, 10, 11],
            'from_moon': [3, 6, 10, 11],
            'from_mars': [1, 2, 4, 7, 8, 9, 10, 11],
            'from_mercury': [3, 5, 6, 9, 10, 11, 12],
            'from_jupiter': [5, 6, 9, 11],
            'from_venus': [6, 7, 12],
            'from_saturn': [1, 2, 4, 7, 8, 9, 10, 11],
            'from_ascendant': [3, 4, 6, 10, 11, 12],
        },
        'moon': {
            'from_sun': [3, 6, 7, 8, 10, 11],
            'from_moon': [1, 3, 6, 7, 10, 11],
            'from_mars': [2, 3, 5, 6, 9, 10, 11],
            'from_mercury': [1, 3, 4, 5, 7, 8, 10, 11],
            'from_jupiter': [1, 4, 7, 8, 10, 11, 12],
            'from_venus': [3, 4, 5, 7, 9, 10, 11],
            'from_saturn': [3, 5, 6, 11],
            'from_ascendant': [3, 6, 10, 11],
        },
        'mars': {
            'from_sun': [3, 5, 6, 10, 11],
            'from_moon': [3, 6, 11],
            'from_mars': [1, 2, 4, 7, 8, 10, 11],
            'from_mercury': [3, 5, 6, 11],
            'from_jupiter': [6, 10, 11, 12],
            'from_venus': [6, 8, 11, 12],
            'from_saturn': [1, 4, 7, 8, 9, 10, 11],
            'from_ascendant': [1, 3, 6, 10, 11],
        },
        'mercury': {
            'from_sun': [5, 6, 9, 11, 12],
            'from_moon': [2, 4, 6, 8, 10, 11],
            'from_mars': [1, 2, 4, 7, 8, 9, 10, 11],
            'from_mercury': [1, 3, 5, 6, 9, 10, 11, 12],
            'from_jupiter': [6, 8, 11, 12],
            'from_venus': [1, 2, 3, 4, 5, 8, 9, 11],
            'from_saturn': [1, 2, 4, 7, 8, 9, 10, 11],
            'from_ascendant': [1, 2, 4, 6, 8, 10, 11],
        },
        'jupiter': {
            'from_sun': [1, 2, 3, 4, 7, 8, 9, 10, 11],
            'from_moon': [2, 5, 7, 9, 11],
            'from_mars': [1, 2, 4, 7, 8, 10, 11],
            'from_mercury': [1, 2, 4, 5, 6, 9, 10, 11],
            'from_jupiter': [1, 2, 3, 4, 7, 8, 10, 11],
            'from_venus': [2, 5, 6, 9, 10, 11],
            'from_saturn': [3, 5, 6, 12],
            'from_ascendant': [1, 2, 4, 5, 6, 7, 9, 10, 11],
        },
        'venus': {
            'from_sun': [8, 11, 12],
            'from_moon': [1, 2, 3, 4, 5, 8, 9, 11, 12],
            'from_mars': [3, 5, 6, 9, 11, 12],
            'from_mercury': [3, 5, 6, 9, 11],
            'from_jupiter': [5, 8, 9, 10, 11],
            'from_venus': [1, 2, 3, 4, 5, 8, 9, 10, 11],
            'from_saturn': [3, 4, 5, 8, 9, 10, 11],
            'from_ascendant': [1, 2, 3, 4, 5, 8, 9, 11],
        },
        'saturn': {
            'from_sun': [1, 2, 4, 7, 8, 10, 11],
            'from_moon': [3, 6, 11],
            'from_mars': [3, 5, 6, 10, 11, 12],
            'from_mercury': [6, 8, 9, 10, 11, 12],
            'from_jupiter': [5, 6, 11, 12],
            'from_venus': [6, 11, 12],
            'from_saturn': [3, 5, 6, 11],
            'from_ascendant': [1, 3, 4, 6, 10, 11],
        },
    }

    @classmethod
    def calculate(
        cls,
        planets: Dict[str, Dict],
        ascendant: float
    ) -> Dict:
        """
        Calculate complete Ashtakavarga.

        Args:
            planets: Dict of planet data with longitude or sign
            ascendant: Ascendant longitude in degrees

        Returns:
            Dict containing:
            - bhinnashtakavarga: Individual planet Ashtakavargas
            - sarvashtakavarga: Combined totals per sign
            - summary: Analysis and recommendations
        """
        asc_sign = int(ascendant / 30)

        # Get planet positions by sign
        planet_signs = cls._get_planet_signs(planets)
        planet_signs['ascendant'] = asc_sign

        # Calculate Bhinnashtakavarga for each planet
        bhinna = {}
        for planet in cls.PLANETS:
            bindus = cls._calculate_bhinna_for_planet(planet, planet_signs)
            total = sum(bindus)
            strongest = cls._get_strongest_signs(bindus)
            weakest = cls._get_weakest_signs(bindus)

            bhinna[planet] = {
                'planet': planet,
                'planet_name': cls.PLANET_NAMES[planet],
                'bindus_by_sign': bindus,
                'total_bindus': total,
                'strongest_signs': strongest,
                'weakest_signs': weakest,
            }

        # Calculate Sarvashtakavarga (sum of all Bhinnas)
        sarva = cls._calculate_sarvashtakavarga(bhinna)

        # Calculate summary
        summary = cls._calculate_summary(bhinna, sarva, asc_sign)

        return {
            'bhinnashtakavarga': bhinna,
            'sarvashtakavarga': sarva,
            'calculation_info': {
                'ascendant_sign': cls.SIGN_NAMES[asc_sign],
                'planet_positions': {p: cls.SIGN_NAMES[s] for p, s in planet_signs.items() if p != 'ascendant'},
            },
            'summary': summary,
        }

    @classmethod
    def _get_planet_signs(cls, planets: Dict) -> Dict[str, int]:
        """Extract planet sign positions"""
        result = {}
        for name, data in planets.items():
            name_lower = name.lower()
            if name_lower not in cls.PLANETS:
                continue
            if isinstance(data, dict):
                if 'sign' in data:
                    result[name_lower] = data['sign']
                elif 'longitude' in data:
                    result[name_lower] = int(data['longitude'] / 30)
        return result

    @classmethod
    def _calculate_bhinna_for_planet(
        cls,
        planet: str,
        planet_signs: Dict[str, int]
    ) -> List[int]:
        """
        Calculate Bhinnashtakavarga for a single planet.

        Returns list of 12 integers (0-8) representing bindus in each sign.
        """
        bindus = [0] * 12

        benefic_rules = cls.BENEFIC_POSITIONS.get(planet, {})

        for ref_key, positions in benefic_rules.items():
            # ref_key is like "from_sun", "from_moon", etc.
            ref_planet = ref_key.replace('from_', '')

            if ref_planet not in planet_signs:
                continue

            ref_sign = planet_signs[ref_planet]

            # For each benefic position, add a bindu to that sign
            for pos in positions:
                target_sign = (ref_sign + pos - 1) % 12
                bindus[target_sign] += 1

        return bindus

    @classmethod
    def _calculate_sarvashtakavarga(cls, bhinna: Dict) -> Dict:
        """Calculate Sarvashtakavarga (sum of all Bhinnas)"""
        sarva = [0] * 12

        for planet_data in bhinna.values():
            for i, bindu in enumerate(planet_data['bindus_by_sign']):
                sarva[i] += bindu

        total = sum(sarva)
        average = total / 12

        strongest = cls._get_strongest_signs(sarva, threshold=average)
        weakest = cls._get_weakest_signs(sarva, threshold=average)

        return {
            'bindus_by_sign': sarva,
            'total_bindus': total,
            'average_bindus': round(average, 1),
            'strongest_signs': strongest,
            'weakest_signs': weakest,
        }

    @classmethod
    def _get_strongest_signs(cls, bindus: List[int], threshold: float = None) -> List[str]:
        """Get signs with highest bindus"""
        if threshold is None:
            threshold = sum(bindus) / 12

        strong = []
        for i, b in enumerate(bindus):
            if b > threshold:
                strong.append(cls.SIGN_NAMES[i])
        return strong

    @classmethod
    def _get_weakest_signs(cls, bindus: List[int], threshold: float = None) -> List[str]:
        """Get signs with lowest bindus"""
        if threshold is None:
            threshold = sum(bindus) / 12

        weak = []
        for i, b in enumerate(bindus):
            if b < threshold:
                weak.append(cls.SIGN_NAMES[i])
        return weak

    @classmethod
    def _calculate_summary(cls, bhinna: Dict, sarva: Dict, asc_sign: int) -> Dict:
        """Calculate analysis summary"""
        # Find strongest and weakest planets
        planet_totals = [(p, d['total_bindus']) for p, d in bhinna.items()]
        planet_totals.sort(key=lambda x: x[1], reverse=True)

        strongest_planet = planet_totals[0][0] if planet_totals else 'jupiter'
        weakest_planet = planet_totals[-1][0] if planet_totals else 'saturn'

        # Find strongest and weakest signs in SAV
        sav_bindus = sarva['bindus_by_sign']
        max_bindus = max(sav_bindus)
        min_bindus = min(sav_bindus)

        strongest_sign_idx = sav_bindus.index(max_bindus)
        weakest_sign_idx = sav_bindus.index(min_bindus)

        # Transit favorable signs (above 28 is generally good)
        favorable = [cls.SIGN_NAMES[i] for i, b in enumerate(sav_bindus) if b >= 28]

        # Kakshya analysis - positions relative to houses
        # Signs with 30+ bindus are excellent, 25-29 good, below 25 challenging

        # House strength based on SAV
        house_strength = {}
        for h in range(1, 13):
            sign_idx = (asc_sign + h - 1) % 12
            bindus = sav_bindus[sign_idx]
            if bindus >= 30:
                strength = 'excellent'
            elif bindus >= 28:
                strength = 'good'
            elif bindus >= 25:
                strength = 'average'
            else:
                strength = 'challenging'
            house_strength[h] = {
                'sign': cls.SIGN_NAMES[sign_idx],
                'bindus': bindus,
                'strength': strength,
            }

        return {
            'strongest_planet': cls.PLANET_NAMES[strongest_planet],
            'strongest_planet_bindus': planet_totals[0][1] if planet_totals else 0,
            'weakest_planet': cls.PLANET_NAMES[weakest_planet],
            'weakest_planet_bindus': planet_totals[-1][1] if planet_totals else 0,
            'strongest_sign': cls.SIGN_NAMES[strongest_sign_idx],
            'strongest_sign_bindus': max_bindus,
            'weakest_sign': cls.SIGN_NAMES[weakest_sign_idx],
            'weakest_sign_bindus': min_bindus,
            'transit_favorable_signs': favorable,
            'house_strength': house_strength,
        }

    @classmethod
    def get_transit_score(cls, sarva_bindus: List[int], transit_sign: int) -> Dict:
        """
        Get transit score for a planet transiting a sign.

        Useful for timing analysis.
        """
        bindus = sarva_bindus[transit_sign]

        if bindus >= 30:
            quality = 'excellent'
            description = 'Highly favorable transit, expect positive results'
        elif bindus >= 28:
            quality = 'good'
            description = 'Favorable transit with good results'
        elif bindus >= 25:
            quality = 'average'
            description = 'Mixed results, moderate influence'
        elif bindus >= 22:
            quality = 'below_average'
            description = 'Challenging transit, exercise caution'
        else:
            quality = 'difficult'
            description = 'Difficult transit, delays and obstacles possible'

        return {
            'sign': cls.SIGN_NAMES[transit_sign],
            'bindus': bindus,
            'quality': quality,
            'description': description,
        }
