"""
Myers-Briggs Calculator Service

Derives Myers-Briggs personality type from astrological birth chart data.
Uses established astrological-psychological correspondences to map
planetary positions, elements, and modalities to MB preferences.

Correlation Method:
- E/I: Fire/Air emphasis (E) vs Earth/Water emphasis (I), house placement
- S/N: Earth/Fixed emphasis (S) vs Water/Mutable/Neptune emphasis (N)
- T/F: Saturn/Mars/Air emphasis (T) vs Venus/Moon/Water emphasis (F)
- J/P: Cardinal/Fixed emphasis (J) vs Mutable emphasis (P)
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
from app.utils.ephemeris import EphemerisCalculator


class MyersBriggsCalculator:
    """
    Service for calculating Myers-Briggs type from astrological birth data.

    Uses weighted analysis of planetary positions, elements, modalities,
    and house placements to derive personality type preferences.
    """

    # Planet weights for type determination (inner planets weighted more heavily)
    PLANET_WEIGHTS = {
        'sun': 3.0,
        'moon': 2.5,
        'mercury': 2.0,
        'venus': 2.0,
        'mars': 2.0,
        'jupiter': 1.5,
        'saturn': 1.5,
        'ascendant': 2.5,
        'midheaven': 1.5,
        'uranus': 1.0,
        'neptune': 1.0,
        'pluto': 1.0,
        'north_node': 0.5,
        'south_node': 0.5,
    }

    # Element to sign mapping
    SIGN_ELEMENTS = {
        'Aries': 'fire', 'Leo': 'fire', 'Sagittarius': 'fire',
        'Taurus': 'earth', 'Virgo': 'earth', 'Capricorn': 'earth',
        'Gemini': 'air', 'Libra': 'air', 'Aquarius': 'air',
        'Cancer': 'water', 'Scorpio': 'water', 'Pisces': 'water',
    }

    # Modality to sign mapping
    SIGN_MODALITIES = {
        'Aries': 'cardinal', 'Cancer': 'cardinal', 'Libra': 'cardinal', 'Capricorn': 'cardinal',
        'Taurus': 'fixed', 'Leo': 'fixed', 'Scorpio': 'fixed', 'Aquarius': 'fixed',
        'Gemini': 'mutable', 'Virgo': 'mutable', 'Sagittarius': 'mutable', 'Pisces': 'mutable',
    }

    # E/I element correlations (positive = E, negative = I)
    EI_ELEMENT_WEIGHTS = {
        'fire': 1.0,   # Fire signs are extraverted
        'air': 0.8,    # Air signs tend extraverted
        'earth': -0.8, # Earth signs tend introverted
        'water': -1.0, # Water signs are introverted
    }

    # S/N correlations
    SN_ELEMENT_WEIGHTS = {
        'earth': 1.0,   # Earth = Sensing (practical, concrete)
        'fire': -0.3,   # Fire = slight Intuition (vision, possibility)
        'air': -0.5,    # Air = Intuition (abstract, conceptual)
        'water': -0.8,  # Water = Intuition (intuitive, symbolic)
    }

    SN_MODALITY_WEIGHTS = {
        'fixed': 0.5,     # Fixed = Sensing (stable, concrete)
        'cardinal': 0.0,  # Cardinal = neutral
        'mutable': -0.6,  # Mutable = Intuition (adaptable, open)
    }

    # T/F planet correlations
    TF_PLANET_WEIGHTS = {
        'saturn': 1.2,    # Saturn = Thinking (logic, structure)
        'mars': 0.8,      # Mars = Thinking (assertion, directness)
        'mercury': 0.3,   # Mercury = slight Thinking (logic)
        'uranus': 0.4,    # Uranus = Thinking (detached, analytical)
        'venus': -1.0,    # Venus = Feeling (harmony, values)
        'moon': -1.2,     # Moon = Feeling (emotions, nurture)
        'neptune': -0.8,  # Neptune = Feeling (empathy, compassion)
        'jupiter': -0.3,  # Jupiter = slight Feeling (generosity)
    }

    TF_ELEMENT_WEIGHTS = {
        'air': 0.6,     # Air = Thinking (logical, detached)
        'fire': 0.2,    # Fire = slight Thinking (direct)
        'water': -0.8,  # Water = Feeling (emotional)
        'earth': -0.2,  # Earth = slight Feeling (practical values)
    }

    # J/P modality correlations
    JP_MODALITY_WEIGHTS = {
        'cardinal': 0.8,  # Cardinal = Judging (initiating, decisive)
        'fixed': 1.0,     # Fixed = Judging (determined, persistent)
        'mutable': -1.0,  # Mutable = Perceiving (flexible, adaptable)
    }

    # Type profiles database
    TYPE_PROFILES = {
        'ISTJ': {
            'name': 'The Inspector',
            'temperament': 'Guardian',
            'description': 'Responsible, thorough, and dependable. Values tradition, loyalty, and practical results. Takes commitments seriously and follows through with precision.',
            'strengths': ['Reliable', 'Organized', 'Practical', 'Dutiful', 'Detail-oriented'],
            'challenges': ['May be inflexible', 'Can be judgmental', 'Difficulty expressing emotions'],
            'cognitive_stack': ['Si', 'Te', 'Fi', 'Ne'],
        },
        'ISFJ': {
            'name': 'The Protector',
            'temperament': 'Guardian',
            'description': 'Warm, caring, and devoted. Quietly supportive and deeply invested in the well-being of others. Values harmony and service.',
            'strengths': ['Supportive', 'Patient', 'Observant', 'Loyal', 'Hardworking'],
            'challenges': ['May neglect own needs', 'Difficulty with change', 'Can be overly selfless'],
            'cognitive_stack': ['Si', 'Fe', 'Ti', 'Ne'],
        },
        'INFJ': {
            'name': 'The Advocate',
            'temperament': 'Idealist',
            'description': 'Insightful, principled, and compassionate. Seeks meaning and connection, driven by deeply held values and vision for humanity.',
            'strengths': ['Insightful', 'Principled', 'Compassionate', 'Creative', 'Determined'],
            'challenges': ['Can be perfectionistic', 'May burn out', 'Difficulty with criticism'],
            'cognitive_stack': ['Ni', 'Fe', 'Ti', 'Se'],
        },
        'INTJ': {
            'name': 'The Architect',
            'temperament': 'Rational',
            'description': 'Strategic, independent, and determined. Driven to understand systems and implement long-term visions with logical precision.',
            'strengths': ['Strategic', 'Independent', 'Determined', 'Innovative', 'Knowledgeable'],
            'challenges': ['Can be arrogant', 'May dismiss emotions', 'Difficulty with small talk'],
            'cognitive_stack': ['Ni', 'Te', 'Fi', 'Se'],
        },
        'ISTP': {
            'name': 'The Virtuoso',
            'temperament': 'Artisan',
            'description': 'Practical, observant, and analytical. Enjoys understanding how things work and solving immediate problems with hands-on skill.',
            'strengths': ['Practical', 'Observant', 'Analytical', 'Adaptable', 'Self-reliant'],
            'challenges': ['May seem detached', 'Difficulty with commitment', 'Can be risk-seeking'],
            'cognitive_stack': ['Ti', 'Se', 'Ni', 'Fe'],
        },
        'ISFP': {
            'name': 'The Adventurer',
            'temperament': 'Artisan',
            'description': 'Gentle, sensitive, and artistic. Lives in the present moment, guided by personal values and aesthetic sensibilities.',
            'strengths': ['Artistic', 'Sensitive', 'Gentle', 'Helpful', 'Flexible'],
            'challenges': ['May avoid conflict', 'Difficulty with planning', 'Can be unpredictable'],
            'cognitive_stack': ['Fi', 'Se', 'Ni', 'Te'],
        },
        'INFP': {
            'name': 'The Mediator',
            'temperament': 'Idealist',
            'description': 'Idealistic, creative, and deeply feeling. Guided by core values and a desire to make the world a better place.',
            'strengths': ['Idealistic', 'Empathetic', 'Creative', 'Open-minded', 'Passionate'],
            'challenges': ['May be impractical', 'Difficulty with criticism', 'Can isolate'],
            'cognitive_stack': ['Fi', 'Ne', 'Si', 'Te'],
        },
        'INTP': {
            'name': 'The Logician',
            'temperament': 'Rational',
            'description': 'Analytical, objective, and innovative. Loves exploring ideas and theoretical possibilities with logical precision.',
            'strengths': ['Analytical', 'Objective', 'Original', 'Open-minded', 'Curious'],
            'challenges': ['May be absent-minded', 'Difficulty with emotions', 'Can be insensitive'],
            'cognitive_stack': ['Ti', 'Ne', 'Si', 'Fe'],
        },
        'ESTP': {
            'name': 'The Entrepreneur',
            'temperament': 'Artisan',
            'description': 'Energetic, pragmatic, and observant. Thrives on action and lives in the moment with bold confidence.',
            'strengths': ['Bold', 'Practical', 'Observant', 'Direct', 'Sociable'],
            'challenges': ['May be impatient', 'Difficulty with routine', 'Can be insensitive'],
            'cognitive_stack': ['Se', 'Ti', 'Fe', 'Ni'],
        },
        'ESFP': {
            'name': 'The Entertainer',
            'temperament': 'Artisan',
            'description': 'Spontaneous, energetic, and enthusiastic. Loves life and brings joy to others through playful engagement.',
            'strengths': ['Bold', 'Original', 'Practical', 'Observant', 'Excellent people skills'],
            'challenges': ['May be easily bored', 'Difficulty with planning', 'Can be sensitive to criticism'],
            'cognitive_stack': ['Se', 'Fi', 'Te', 'Ni'],
        },
        'ENFP': {
            'name': 'The Campaigner',
            'temperament': 'Idealist',
            'description': 'Enthusiastic, creative, and sociable. Sees possibilities everywhere and inspires others with infectious optimism.',
            'strengths': ['Curious', 'Observant', 'Energetic', 'Enthusiastic', 'Friendly'],
            'challenges': ['May be unfocused', 'Difficulty with follow-through', 'Can overthink'],
            'cognitive_stack': ['Ne', 'Fi', 'Te', 'Si'],
        },
        'ENTP': {
            'name': 'The Debater',
            'temperament': 'Rational',
            'description': 'Quick, ingenious, and outspoken. Enjoys intellectual challenge and exploring ideas from every angle.',
            'strengths': ['Knowledgeable', 'Quick-thinking', 'Original', 'Charismatic', 'Energetic'],
            'challenges': ['May be argumentative', 'Difficulty with follow-through', 'Can be insensitive'],
            'cognitive_stack': ['Ne', 'Ti', 'Fe', 'Si'],
        },
        'ESTJ': {
            'name': 'The Executive',
            'temperament': 'Guardian',
            'description': 'Organized, logical, and assertive. Takes charge to create order and ensure things get done properly.',
            'strengths': ['Organized', 'Dedicated', 'Strong-willed', 'Direct', 'Loyal'],
            'challenges': ['May be inflexible', 'Difficulty with emotions', 'Can be domineering'],
            'cognitive_stack': ['Te', 'Si', 'Ne', 'Fi'],
        },
        'ESFJ': {
            'name': 'The Consul',
            'temperament': 'Guardian',
            'description': 'Caring, social, and traditional. Creates harmony and provides practical support to their community.',
            'strengths': ['Caring', 'Practical', 'Loyal', 'Sensitive', 'Warm'],
            'challenges': ['May need validation', 'Difficulty with criticism', 'Can be controlling'],
            'cognitive_stack': ['Fe', 'Si', 'Ne', 'Ti'],
        },
        'ENFJ': {
            'name': 'The Protagonist',
            'temperament': 'Idealist',
            'description': 'Charismatic, empathetic, and inspiring. Natural leaders who bring out the best in others.',
            'strengths': ['Tolerant', 'Reliable', 'Charismatic', 'Altruistic', 'Natural leaders'],
            'challenges': ['May be overly idealistic', 'Difficulty saying no', 'Can be too selfless'],
            'cognitive_stack': ['Fe', 'Ni', 'Se', 'Ti'],
        },
        'ENTJ': {
            'name': 'The Commander',
            'temperament': 'Rational',
            'description': 'Bold, imaginative, and strong-willed. Strategic leaders who drive achievement and efficiency.',
            'strengths': ['Efficient', 'Energetic', 'Self-confident', 'Strong-willed', 'Strategic'],
            'challenges': ['May be stubborn', 'Difficulty with emotions', 'Can be domineering'],
            'cognitive_stack': ['Te', 'Ni', 'Se', 'Fi'],
        },
    }

    # Cognitive function full names
    COGNITIVE_FUNCTIONS = {
        'Se': ('Extraverted Sensing', 'Engaging with the physical world through direct sensory experience'),
        'Si': ('Introverted Sensing', 'Recalling and comparing past experiences and details'),
        'Ne': ('Extraverted Intuition', 'Perceiving patterns and possibilities in the external world'),
        'Ni': ('Introverted Intuition', 'Synthesizing insights and envisioning future outcomes'),
        'Te': ('Extraverted Thinking', 'Organizing and structuring the external world logically'),
        'Ti': ('Introverted Thinking', 'Analyzing and building internal logical frameworks'),
        'Fe': ('Extraverted Feeling', 'Connecting with and responding to others\' emotions'),
        'Fi': ('Introverted Feeling', 'Evaluating based on deeply held personal values'),
    }

    FUNCTION_POSITIONS = ['Dominant', 'Auxiliary', 'Tertiary', 'Inferior']

    @staticmethod
    def calculate_type(
        birth_datetime: datetime,
        latitude: float,
        longitude: float,
        timezone_offset_minutes: int = 0,
        include_cognitive_stack: bool = True,
        include_correlations: bool = False
    ) -> Dict:
        """
        Calculate Myers-Briggs type from birth data.

        Args:
            birth_datetime: Birth date and time
            latitude: Birth location latitude
            longitude: Birth location longitude
            timezone_offset_minutes: Timezone offset from UTC in minutes
            include_cognitive_stack: Whether to include cognitive function stack
            include_correlations: Whether to include detailed astrological correlations

        Returns:
            Complete MB type data dictionary
        """
        # Convert to Julian Day
        jd = EphemerisCalculator.datetime_to_julian_day(
            birth_datetime,
            timezone_offset_minutes
        )

        # Calculate planetary positions
        planets = EphemerisCalculator.calculate_all_planets(jd, zodiac='tropical')

        # Calculate houses for ascendant/MC
        houses = EphemerisCalculator.calculate_houses(
            jd, latitude, longitude, 'placidus'
        )

        # Add angles to planets dict
        if houses.get('ascendant'):
            asc_sign = MyersBriggsCalculator._get_sign_from_longitude(houses['ascendant']['longitude'])
            planets['ascendant'] = {
                'longitude': houses['ascendant']['longitude'],
                'sign': asc_sign,
            }
        if houses.get('midheaven'):
            mc_sign = MyersBriggsCalculator._get_sign_from_longitude(houses['midheaven']['longitude'])
            planets['midheaven'] = {
                'longitude': houses['midheaven']['longitude'],
                'sign': mc_sign,
            }

        # Calculate element and modality totals
        element_totals = MyersBriggsCalculator._calculate_element_totals(planets)
        modality_totals = MyersBriggsCalculator._calculate_modality_totals(planets)

        # Calculate dichotomy scores
        ei_score = MyersBriggsCalculator._calculate_ei_score(planets, element_totals)
        sn_score = MyersBriggsCalculator._calculate_sn_score(planets, element_totals, modality_totals)
        tf_score = MyersBriggsCalculator._calculate_tf_score(planets, element_totals)
        jp_score = MyersBriggsCalculator._calculate_jp_score(planets, modality_totals)

        # Determine type code
        type_code = MyersBriggsCalculator._determine_type_code(
            ei_score, sn_score, tf_score, jp_score
        )

        # Get type profile
        profile = MyersBriggsCalculator.TYPE_PROFILES.get(type_code, {})

        # Build dichotomy details
        dichotomies = [
            MyersBriggsCalculator._build_dichotomy_score('E/I', 'E', 'I', ei_score, planets),
            MyersBriggsCalculator._build_dichotomy_score('S/N', 'S', 'N', sn_score, planets),
            MyersBriggsCalculator._build_dichotomy_score('T/F', 'T', 'F', tf_score, planets),
            MyersBriggsCalculator._build_dichotomy_score('J/P', 'J', 'P', jp_score, planets),
        ]

        # Calculate preference strengths
        preference_strengths = {
            'E': max(0, ei_score) / max(abs(ei_score), 0.01) * 50 + 50 if ei_score >= 0 else 50 - abs(ei_score) / max(abs(ei_score), 0.01) * 50,
            'I': max(0, -ei_score) / max(abs(ei_score), 0.01) * 50 + 50 if ei_score <= 0 else 50 - abs(ei_score) / max(abs(ei_score), 0.01) * 50,
            'S': max(0, sn_score) / max(abs(sn_score), 0.01) * 50 + 50 if sn_score >= 0 else 50 - abs(sn_score) / max(abs(sn_score), 0.01) * 50,
            'N': max(0, -sn_score) / max(abs(sn_score), 0.01) * 50 + 50 if sn_score <= 0 else 50 - abs(sn_score) / max(abs(sn_score), 0.01) * 50,
            'T': max(0, tf_score) / max(abs(tf_score), 0.01) * 50 + 50 if tf_score >= 0 else 50 - abs(tf_score) / max(abs(tf_score), 0.01) * 50,
            'F': max(0, -tf_score) / max(abs(tf_score), 0.01) * 50 + 50 if tf_score <= 0 else 50 - abs(tf_score) / max(abs(tf_score), 0.01) * 50,
            'J': max(0, jp_score) / max(abs(jp_score), 0.01) * 50 + 50 if jp_score >= 0 else 50 - abs(jp_score) / max(abs(jp_score), 0.01) * 50,
            'P': max(0, -jp_score) / max(abs(jp_score), 0.01) * 50 + 50 if jp_score <= 0 else 50 - abs(jp_score) / max(abs(jp_score), 0.01) * 50,
        }

        # Normalize preference strengths
        for letter in preference_strengths:
            preference_strengths[letter] = round(min(100, max(0, preference_strengths[letter])), 1)

        result = {
            'type_code': type_code,
            'type_name': profile.get('name', 'Unknown'),
            'temperament': profile.get('temperament', 'Unknown'),
            'dichotomies': dichotomies,
            'preference_strengths': preference_strengths,
            'description': profile.get('description', ''),
            'strengths': profile.get('strengths', []),
            'challenges': profile.get('challenges', []),
            'calculation_info': {
                'birth_datetime': birth_datetime.isoformat(),
                'latitude': latitude,
                'longitude': longitude,
                'timezone_offset_minutes': timezone_offset_minutes,
                'element_totals': element_totals,
                'modality_totals': modality_totals,
            }
        }

        # Add cognitive stack if requested
        if include_cognitive_stack:
            result['cognitive_stack'] = MyersBriggsCalculator._build_cognitive_stack(
                profile.get('cognitive_stack', [])
            )

        # Add correlations if requested
        if include_correlations:
            result['correlations'] = MyersBriggsCalculator._build_correlations(planets)

        return result

    @staticmethod
    def _get_sign_from_longitude(longitude: float) -> str:
        """Get zodiac sign from ecliptic longitude."""
        signs = [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ]
        sign_index = int(longitude / 30) % 12
        return signs[sign_index]

    @staticmethod
    def _calculate_element_totals(planets: Dict) -> Dict[str, float]:
        """Calculate weighted element totals from planetary positions."""
        totals = {'fire': 0.0, 'earth': 0.0, 'air': 0.0, 'water': 0.0}

        for planet, data in planets.items():
            if planet not in MyersBriggsCalculator.PLANET_WEIGHTS:
                continue
            sign = data.get('sign', '')
            element = MyersBriggsCalculator.SIGN_ELEMENTS.get(sign)
            if element:
                weight = MyersBriggsCalculator.PLANET_WEIGHTS[planet]
                totals[element] += weight

        return totals

    @staticmethod
    def _calculate_modality_totals(planets: Dict) -> Dict[str, float]:
        """Calculate weighted modality totals from planetary positions."""
        totals = {'cardinal': 0.0, 'fixed': 0.0, 'mutable': 0.0}

        for planet, data in planets.items():
            if planet not in MyersBriggsCalculator.PLANET_WEIGHTS:
                continue
            sign = data.get('sign', '')
            modality = MyersBriggsCalculator.SIGN_MODALITIES.get(sign)
            if modality:
                weight = MyersBriggsCalculator.PLANET_WEIGHTS[planet]
                totals[modality] += weight

        return totals

    @staticmethod
    def _calculate_ei_score(planets: Dict, element_totals: Dict) -> float:
        """
        Calculate Extraversion/Introversion score.
        Positive = Extraversion, Negative = Introversion.
        """
        score = 0.0

        # Element contribution
        for element, weight in MyersBriggsCalculator.EI_ELEMENT_WEIGHTS.items():
            score += element_totals.get(element, 0) * weight

        # Normalize
        total_weight = sum(element_totals.values()) or 1
        return score / total_weight * 10  # Scale to roughly -10 to +10

    @staticmethod
    def _calculate_sn_score(
        planets: Dict,
        element_totals: Dict,
        modality_totals: Dict
    ) -> float:
        """
        Calculate Sensing/Intuition score.
        Positive = Sensing, Negative = Intuition.
        """
        score = 0.0

        # Element contribution
        for element, weight in MyersBriggsCalculator.SN_ELEMENT_WEIGHTS.items():
            score += element_totals.get(element, 0) * weight

        # Modality contribution
        for modality, weight in MyersBriggsCalculator.SN_MODALITY_WEIGHTS.items():
            score += modality_totals.get(modality, 0) * weight

        # Neptune influence (strong Neptune = Intuition)
        if 'neptune' in planets:
            neptune_sign = planets['neptune'].get('sign', '')
            if MyersBriggsCalculator.SIGN_ELEMENTS.get(neptune_sign) == 'water':
                score -= 1.5  # Extra intuition boost

        # Normalize
        total_weight = sum(element_totals.values()) + sum(modality_totals.values()) or 1
        return score / total_weight * 10

    @staticmethod
    def _calculate_tf_score(planets: Dict, element_totals: Dict) -> float:
        """
        Calculate Thinking/Feeling score.
        Positive = Thinking, Negative = Feeling.
        """
        score = 0.0

        # Planet contribution
        for planet, data in planets.items():
            tf_weight = MyersBriggsCalculator.TF_PLANET_WEIGHTS.get(planet, 0)
            if tf_weight != 0:
                planet_weight = MyersBriggsCalculator.PLANET_WEIGHTS.get(planet, 1)
                score += tf_weight * planet_weight

        # Element contribution
        for element, weight in MyersBriggsCalculator.TF_ELEMENT_WEIGHTS.items():
            score += element_totals.get(element, 0) * weight * 0.5  # Reduced weight

        # Normalize
        return score / 10  # Scale appropriately

    @staticmethod
    def _calculate_jp_score(planets: Dict, modality_totals: Dict) -> float:
        """
        Calculate Judging/Perceiving score.
        Positive = Judging, Negative = Perceiving.
        """
        score = 0.0

        # Modality contribution
        for modality, weight in MyersBriggsCalculator.JP_MODALITY_WEIGHTS.items():
            score += modality_totals.get(modality, 0) * weight

        # Normalize
        total_weight = sum(modality_totals.values()) or 1
        return score / total_weight * 10

    @staticmethod
    def _determine_type_code(
        ei_score: float,
        sn_score: float,
        tf_score: float,
        jp_score: float
    ) -> str:
        """Determine the 4-letter type code from dichotomy scores."""
        e_or_i = 'E' if ei_score >= 0 else 'I'
        s_or_n = 'S' if sn_score >= 0 else 'N'
        t_or_f = 'T' if tf_score >= 0 else 'F'
        j_or_p = 'J' if jp_score >= 0 else 'P'

        return f"{e_or_i}{s_or_n}{t_or_f}{j_or_p}"

    @staticmethod
    def _build_dichotomy_score(
        dichotomy: str,
        first_option: str,
        second_option: str,
        raw_score: float,
        planets: Dict
    ) -> Dict:
        """Build a dichotomy score object."""
        # Convert raw score to percentage (0-100 scale)
        # Raw scores typically range from -10 to +10
        normalized = min(10, max(-10, raw_score))  # Clamp to -10 to +10

        if normalized >= 0:
            first_score = 50 + (normalized / 10) * 50
            second_score = 50 - (normalized / 10) * 50
            preference = first_option
            strength = first_score
        else:
            first_score = 50 + (normalized / 10) * 50
            second_score = 50 - (normalized / 10) * 50
            preference = second_option
            strength = second_score

        # Get contributing factors
        factors = MyersBriggsCalculator._get_contributing_factors(dichotomy, planets)

        return {
            'dichotomy': dichotomy,
            'preference': preference,
            'strength': round(strength, 1),
            'first_option': first_option,
            'second_option': second_option,
            'first_score': round(max(0, min(100, first_score)), 1),
            'second_score': round(max(0, min(100, second_score)), 1),
            'contributing_factors': factors[:5],  # Top 5 factors
        }

    @staticmethod
    def _get_contributing_factors(dichotomy: str, planets: Dict) -> List[str]:
        """Get top contributing astrological factors for a dichotomy."""
        factors = []

        for planet, data in planets.items():
            if planet not in MyersBriggsCalculator.PLANET_WEIGHTS:
                continue
            sign = data.get('sign', '')
            if not sign:
                continue

            # Format planet name nicely
            planet_name = planet.replace('_', ' ').title()
            factor = f"{planet_name} in {sign}"

            weight = MyersBriggsCalculator.PLANET_WEIGHTS.get(planet, 0)
            if weight >= 2.0:
                factors.append(factor)

        return factors

    @staticmethod
    def _build_cognitive_stack(function_codes: List[str]) -> List[Dict]:
        """Build cognitive function stack with details."""
        stack = []
        for i, code in enumerate(function_codes):
            if i >= 4:
                break
            name, description = MyersBriggsCalculator.COGNITIVE_FUNCTIONS.get(
                code, (code, 'Unknown function')
            )
            stack.append({
                'function': code,
                'name': name,
                'position': MyersBriggsCalculator.FUNCTION_POSITIONS[i],
                'description': description,
            })
        return stack

    @staticmethod
    def _build_correlations(planets: Dict) -> List[Dict]:
        """Build detailed astrological correlations for each preference."""
        correlations = []

        for planet, data in planets.items():
            if planet not in MyersBriggsCalculator.PLANET_WEIGHTS:
                continue

            sign = data.get('sign', '')
            element = MyersBriggsCalculator.SIGN_ELEMENTS.get(sign, '')
            modality = MyersBriggsCalculator.SIGN_MODALITIES.get(sign, '')
            weight = MyersBriggsCalculator.PLANET_WEIGHTS.get(planet, 1)

            if not sign:
                continue

            influences = {}

            # E/I influence
            ei_elem_weight = MyersBriggsCalculator.EI_ELEMENT_WEIGHTS.get(element, 0)
            if ei_elem_weight > 0:
                influences['E'] = round(ei_elem_weight * weight, 2)
            elif ei_elem_weight < 0:
                influences['I'] = round(abs(ei_elem_weight) * weight, 2)

            # S/N influence
            sn_elem_weight = MyersBriggsCalculator.SN_ELEMENT_WEIGHTS.get(element, 0)
            sn_mod_weight = MyersBriggsCalculator.SN_MODALITY_WEIGHTS.get(modality, 0)
            combined_sn = sn_elem_weight + sn_mod_weight
            if combined_sn > 0:
                influences['S'] = round(combined_sn * weight, 2)
            elif combined_sn < 0:
                influences['N'] = round(abs(combined_sn) * weight, 2)

            # T/F influence
            tf_planet_weight = MyersBriggsCalculator.TF_PLANET_WEIGHTS.get(planet, 0)
            tf_elem_weight = MyersBriggsCalculator.TF_ELEMENT_WEIGHTS.get(element, 0)
            combined_tf = tf_planet_weight + tf_elem_weight * 0.5
            if combined_tf > 0:
                influences['T'] = round(combined_tf * weight, 2)
            elif combined_tf < 0:
                influences['F'] = round(abs(combined_tf) * weight, 2)

            # J/P influence
            jp_mod_weight = MyersBriggsCalculator.JP_MODALITY_WEIGHTS.get(modality, 0)
            if jp_mod_weight > 0:
                influences['J'] = round(jp_mod_weight * weight, 2)
            elif jp_mod_weight < 0:
                influences['P'] = round(abs(jp_mod_weight) * weight, 2)

            planet_name = planet.replace('_', ' ').title()
            correlations.append({
                'element': f"{planet_name} in {sign}",
                'influences': influences,
                'explanation': f"{planet_name} in {sign} ({element}/{modality}) influences type preferences based on elemental and modal qualities."
            })

        return correlations

    @staticmethod
    def get_all_types() -> List[Dict]:
        """Get information about all 16 MB types."""
        types = []
        for type_code, profile in MyersBriggsCalculator.TYPE_PROFILES.items():
            types.append({
                'type_code': type_code,
                'name': profile['name'],
                'temperament': profile['temperament'],
                'description': profile['description'],
                'cognitive_functions': profile['cognitive_stack'],
                'famous_examples': [],  # Could be populated
                'percentage': MyersBriggsCalculator._get_type_percentage(type_code),
            })
        return types

    @staticmethod
    def _get_type_percentage(type_code: str) -> str:
        """Get estimated population percentage for a type."""
        # Estimated percentages based on MBTI research
        percentages = {
            'ISTJ': '11-14%', 'ISFJ': '9-14%', 'INFJ': '1-3%', 'INTJ': '2-4%',
            'ISTP': '4-6%', 'ISFP': '5-9%', 'INFP': '4-5%', 'INTP': '3-5%',
            'ESTP': '4-5%', 'ESFP': '4-9%', 'ENFP': '6-8%', 'ENTP': '2-5%',
            'ESTJ': '8-12%', 'ESFJ': '9-13%', 'ENFJ': '2-5%', 'ENTJ': '2-5%',
        }
        return percentages.get(type_code, 'Unknown')

    @staticmethod
    def get_all_dichotomies() -> List[Dict]:
        """Get information about all 4 dichotomies."""
        return [
            {
                'code': 'E/I',
                'name': 'Extraversion vs Introversion',
                'first_pole': 'Extraversion (E)',
                'second_pole': 'Introversion (I)',
                'first_description': 'Focuses on the outer world of people and activity. Energized by interaction.',
                'second_description': 'Focuses on the inner world of ideas and reflection. Energized by solitude.',
            },
            {
                'code': 'S/N',
                'name': 'Sensing vs Intuition',
                'first_pole': 'Sensing (S)',
                'second_pole': 'Intuition (N)',
                'first_description': 'Focuses on concrete facts and present realities. Values practical experience.',
                'second_description': 'Focuses on patterns, possibilities, and future potential. Values insights.',
            },
            {
                'code': 'T/F',
                'name': 'Thinking vs Feeling',
                'first_pole': 'Thinking (T)',
                'second_pole': 'Feeling (F)',
                'first_description': 'Makes decisions based on logic and objective analysis. Values fairness.',
                'second_description': 'Makes decisions based on values and impact on people. Values harmony.',
            },
            {
                'code': 'J/P',
                'name': 'Judging vs Perceiving',
                'first_pole': 'Judging (J)',
                'second_pole': 'Perceiving (P)',
                'first_description': 'Prefers structure, plans, and closure. Organized and decisive.',
                'second_description': 'Prefers flexibility, spontaneity, and options. Adaptable and open.',
            },
        ]

    @staticmethod
    def get_type_info(type_code: str) -> Optional[Dict]:
        """Get detailed information about a specific type."""
        profile = MyersBriggsCalculator.TYPE_PROFILES.get(type_code.upper())
        if not profile:
            return None

        return {
            'type_code': type_code.upper(),
            'name': profile['name'],
            'temperament': profile['temperament'],
            'description': profile['description'],
            'strengths': profile['strengths'],
            'challenges': profile['challenges'],
            'cognitive_functions': profile['cognitive_stack'],
            'cognitive_stack': MyersBriggsCalculator._build_cognitive_stack(profile['cognitive_stack']),
            'percentage': MyersBriggsCalculator._get_type_percentage(type_code.upper()),
        }
