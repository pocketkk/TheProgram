"""
Numerology Service

Provides numerological calculations based on names and birth dates.
Part of Phase 3: Multi-Paradigm Integration
"""
from typing import Dict, List, Optional
from datetime import date, datetime
from functools import lru_cache


class NumerologyService:
    """
    Numerology calculation service.

    Calculates various numerological numbers from names and birth dates,
    including Life Path, Expression, Soul Urge, and Personal Year numbers.
    """

    # Pythagorean letter-to-number mapping
    LETTER_VALUES = {
        'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6, 'g': 7, 'h': 8, 'i': 9,
        'j': 1, 'k': 2, 'l': 3, 'm': 4, 'n': 5, 'o': 6, 'p': 7, 'q': 8, 'r': 9,
        's': 1, 't': 2, 'u': 3, 'v': 4, 'w': 5, 'x': 6, 'y': 7, 'z': 8
    }

    # Vowels for Soul Urge calculation
    VOWELS = set('aeiou')

    # Master numbers that don't get reduced
    MASTER_NUMBERS = {11, 22, 33}

    # Number meanings and interpretations
    NUMBER_MEANINGS = {
        1: {
            "name": "The Leader",
            "keywords": ["independence", "individuality", "pioneering", "leadership", "innovation"],
            "meaning": "Number 1 represents new beginnings, independence, and self-determination. It carries the energy of leadership, originality, and the courage to forge new paths.",
            "positive": ["ambitious", "determined", "creative", "self-reliant", "courageous"],
            "challenges": ["stubbornness", "self-centeredness", "impatience", "aggression"]
        },
        2: {
            "name": "The Diplomat",
            "keywords": ["cooperation", "balance", "partnership", "sensitivity", "harmony"],
            "meaning": "Number 2 embodies partnership, diplomacy, and the art of cooperation. It represents sensitivity, intuition, and the ability to bring peace to challenging situations.",
            "positive": ["diplomatic", "patient", "supportive", "intuitive", "peacemaking"],
            "challenges": ["oversensitivity", "indecision", "dependency", "shyness"]
        },
        3: {
            "name": "The Communicator",
            "keywords": ["creativity", "expression", "joy", "inspiration", "communication"],
            "meaning": "Number 3 represents creative self-expression, joy, and inspiration. It carries the energy of optimism, artistic talent, and the gift of communication.",
            "positive": ["creative", "expressive", "optimistic", "inspiring", "sociable"],
            "challenges": ["scattered energy", "superficiality", "moodiness", "exaggeration"]
        },
        4: {
            "name": "The Builder",
            "keywords": ["stability", "structure", "discipline", "practicality", "foundation"],
            "meaning": "Number 4 symbolizes stability, hard work, and building solid foundations. It represents discipline, organization, and the determination to achieve lasting results.",
            "positive": ["reliable", "hardworking", "practical", "organized", "loyal"],
            "challenges": ["rigidity", "stubbornness", "limitation", "pessimism"]
        },
        5: {
            "name": "The Freedom Seeker",
            "keywords": ["change", "freedom", "adventure", "versatility", "curiosity"],
            "meaning": "Number 5 represents freedom, change, and adventure. It carries the energy of curiosity, adaptability, and the desire to experience all that life has to offer.",
            "positive": ["adaptable", "progressive", "versatile", "resourceful", "adventurous"],
            "challenges": ["restlessness", "irresponsibility", "inconsistency", "excess"]
        },
        6: {
            "name": "The Nurturer",
            "keywords": ["responsibility", "love", "nurturing", "family", "service"],
            "meaning": "Number 6 embodies responsibility, love, and domestic harmony. It represents nurturing, healing, and the dedication to serve family and community.",
            "positive": ["responsible", "caring", "protective", "artistic", "compassionate"],
            "challenges": ["self-righteousness", "interference", "anxiety", "martyrdom"]
        },
        7: {
            "name": "The Seeker",
            "keywords": ["wisdom", "spirituality", "analysis", "introspection", "knowledge"],
            "meaning": "Number 7 represents the search for truth, spiritual understanding, and inner wisdom. It carries the energy of analysis, intuition, and deep contemplation.",
            "positive": ["analytical", "spiritual", "wise", "intuitive", "contemplative"],
            "challenges": ["isolation", "skepticism", "secrecy", "aloofness"]
        },
        8: {
            "name": "The Achiever",
            "keywords": ["power", "abundance", "success", "authority", "manifestation"],
            "meaning": "Number 8 symbolizes material success, authority, and the manifestation of abundance. It represents personal power, achievement, and karmic balance.",
            "positive": ["ambitious", "business-minded", "authoritative", "efficient", "powerful"],
            "challenges": ["materialism", "workaholic tendencies", "controlling", "impatience"]
        },
        9: {
            "name": "The Humanitarian",
            "keywords": ["completion", "wisdom", "humanitarianism", "compassion", "universal love"],
            "meaning": "Number 9 represents completion, universal love, and humanitarian service. It carries the energy of wisdom, compassion, and the culmination of spiritual lessons.",
            "positive": ["compassionate", "generous", "creative", "wise", "idealistic"],
            "challenges": ["moody", "detached", "scattered", "self-pitying"]
        },
        11: {
            "name": "The Intuitive (Master Number)",
            "keywords": ["intuition", "inspiration", "spiritual insight", "illumination", "vision"],
            "meaning": "Master Number 11 represents spiritual illumination, intuition, and visionary insight. It carries heightened spiritual awareness and the ability to channel divine inspiration.",
            "positive": ["intuitive", "inspiring", "visionary", "charismatic", "enlightened"],
            "challenges": ["nervous tension", "impracticality", "self-doubt", "hypersensitivity"]
        },
        22: {
            "name": "The Master Builder",
            "keywords": ["mastery", "precision", "large-scale achievement", "discipline", "manifestation"],
            "meaning": "Master Number 22 is the Master Builder, combining vision with practical ability. It represents the power to turn grand dreams into reality through disciplined effort.",
            "positive": ["practical", "visionary", "powerful", "diplomatic", "inspiring"],
            "challenges": ["overwhelm", "self-imposed pressure", "manipulation", "rigidity"]
        },
        33: {
            "name": "The Master Teacher",
            "keywords": ["healing", "blessing", "courage", "discipline", "compassion"],
            "meaning": "Master Number 33 is the Master Teacher, embodying selfless love and spiritual devotion. It represents the highest form of nurturing and compassionate service to humanity.",
            "positive": ["nurturing", "selfless", "inspirational", "healing", "wise"],
            "challenges": ["martyrdom", "excessive self-sacrifice", "emotional burden", "perfectionism"]
        }
    }

    def __init__(self):
        pass

    def reduce_to_single_digit(self, number: int, preserve_master: bool = True) -> int:
        """
        Reduce a number to a single digit, optionally preserving master numbers.
        """
        while number > 9:
            if preserve_master and number in self.MASTER_NUMBERS:
                return number
            number = sum(int(d) for d in str(number))
        return number

    def calculate_life_path(self, birth_date: date) -> Dict:
        """
        Calculate Life Path Number from birth date.

        The Life Path Number is the most important numerological number,
        derived from the complete birth date.
        """
        # Sum each component separately first
        day = self.reduce_to_single_digit(birth_date.day)
        month = self.reduce_to_single_digit(birth_date.month)
        year = self.reduce_to_single_digit(sum(int(d) for d in str(birth_date.year)))

        # Sum and reduce
        total = day + month + year
        life_path = self.reduce_to_single_digit(total)

        return {
            "number": life_path,
            "calculation": {
                "day": birth_date.day,
                "day_reduced": day,
                "month": birth_date.month,
                "month_reduced": month,
                "year": birth_date.year,
                "year_reduced": year,
                "total": total
            },
            **self.NUMBER_MEANINGS.get(life_path, {})
        }

    def calculate_expression(self, full_name: str) -> Dict:
        """
        Calculate Expression (Destiny) Number from full birth name.

        The Expression Number reveals your natural talents and abilities.
        """
        name_clean = full_name.lower().replace(" ", "")
        total = sum(self.LETTER_VALUES.get(c, 0) for c in name_clean if c.isalpha())
        expression = self.reduce_to_single_digit(total)

        return {
            "number": expression,
            "calculation": {
                "name": full_name,
                "letter_sum": total
            },
            **self.NUMBER_MEANINGS.get(expression, {})
        }

    def calculate_soul_urge(self, full_name: str) -> Dict:
        """
        Calculate Soul Urge (Heart's Desire) Number from vowels in name.

        The Soul Urge Number reveals your inner motivations and desires.
        """
        name_clean = full_name.lower().replace(" ", "")
        vowel_sum = sum(
            self.LETTER_VALUES.get(c, 0)
            for c in name_clean
            if c in self.VOWELS
        )
        soul_urge = self.reduce_to_single_digit(vowel_sum)

        return {
            "number": soul_urge,
            "calculation": {
                "name": full_name,
                "vowels": [c for c in name_clean if c in self.VOWELS],
                "vowel_sum": vowel_sum
            },
            **self.NUMBER_MEANINGS.get(soul_urge, {})
        }

    def calculate_personality(self, full_name: str) -> Dict:
        """
        Calculate Personality Number from consonants in name.

        The Personality Number shows how others perceive you.
        """
        name_clean = full_name.lower().replace(" ", "")
        consonant_sum = sum(
            self.LETTER_VALUES.get(c, 0)
            for c in name_clean
            if c.isalpha() and c not in self.VOWELS
        )
        personality = self.reduce_to_single_digit(consonant_sum)

        return {
            "number": personality,
            "calculation": {
                "name": full_name,
                "consonants": [c for c in name_clean if c.isalpha() and c not in self.VOWELS],
                "consonant_sum": consonant_sum
            },
            **self.NUMBER_MEANINGS.get(personality, {})
        }

    def calculate_birthday_number(self, birth_date: date) -> Dict:
        """
        Calculate Birthday Number (just the day).

        The Birthday Number indicates special talents you possess.
        """
        birthday = self.reduce_to_single_digit(birth_date.day, preserve_master=False)

        return {
            "number": birthday,
            "day": birth_date.day,
            **self.NUMBER_MEANINGS.get(birthday, {})
        }

    def calculate_personal_year(self, birth_date: date, current_date: Optional[date] = None) -> Dict:
        """
        Calculate Personal Year Number.

        The Personal Year Number shows the theme and energy of a specific year.
        """
        if current_date is None:
            current_date = date.today()

        day = self.reduce_to_single_digit(birth_date.day)
        month = self.reduce_to_single_digit(birth_date.month)
        year = self.reduce_to_single_digit(sum(int(d) for d in str(current_date.year)))

        total = day + month + year
        personal_year = self.reduce_to_single_digit(total)

        return {
            "number": personal_year,
            "year": current_date.year,
            "calculation": {
                "day_reduced": day,
                "month_reduced": month,
                "year_reduced": year,
                "total": total
            },
            **self.NUMBER_MEANINGS.get(personal_year, {})
        }

    def calculate_personal_month(self, birth_date: date, current_date: Optional[date] = None) -> Dict:
        """
        Calculate Personal Month Number.
        """
        if current_date is None:
            current_date = date.today()

        personal_year = self.calculate_personal_year(birth_date, current_date)
        month_num = self.reduce_to_single_digit(current_date.month)
        total = personal_year["number"] + month_num
        personal_month = self.reduce_to_single_digit(total)

        return {
            "number": personal_month,
            "month": current_date.month,
            "year": current_date.year,
            "personal_year": personal_year["number"],
            **self.NUMBER_MEANINGS.get(personal_month, {})
        }

    def calculate_personal_day(self, birth_date: date, current_date: Optional[date] = None) -> Dict:
        """
        Calculate Personal Day Number.
        """
        if current_date is None:
            current_date = date.today()

        personal_month = self.calculate_personal_month(birth_date, current_date)
        day_num = self.reduce_to_single_digit(current_date.day)
        total = personal_month["number"] + day_num
        personal_day = self.reduce_to_single_digit(total)

        return {
            "number": personal_day,
            "date": current_date.isoformat(),
            "personal_month": personal_month["number"],
            **self.NUMBER_MEANINGS.get(personal_day, {})
        }

    def calculate_full_profile(self, full_name: str, birth_date: date) -> Dict:
        """
        Calculate a complete numerology profile.
        """
        return {
            "name": full_name,
            "birth_date": birth_date.isoformat(),
            "core_numbers": {
                "life_path": self.calculate_life_path(birth_date),
                "expression": self.calculate_expression(full_name),
                "soul_urge": self.calculate_soul_urge(full_name),
                "personality": self.calculate_personality(full_name),
                "birthday": self.calculate_birthday_number(birth_date)
            },
            "current_cycles": {
                "personal_year": self.calculate_personal_year(birth_date),
                "personal_month": self.calculate_personal_month(birth_date),
                "personal_day": self.calculate_personal_day(birth_date)
            }
        }

    def calculate_name_number(self, name: str) -> Dict:
        """
        Calculate the numerological value of any name or word.
        """
        name_clean = name.lower().replace(" ", "")
        total = sum(self.LETTER_VALUES.get(c, 0) for c in name_clean if c.isalpha())
        number = self.reduce_to_single_digit(total)

        # Letter breakdown
        breakdown = []
        for c in name_clean:
            if c.isalpha():
                breakdown.append({
                    "letter": c.upper(),
                    "value": self.LETTER_VALUES.get(c, 0)
                })

        return {
            "name": name,
            "number": number,
            "total": total,
            "breakdown": breakdown,
            **self.NUMBER_MEANINGS.get(number, {})
        }

    def get_number_meaning(self, number: int) -> Optional[Dict]:
        """
        Get the meaning for a specific number.
        """
        return self.NUMBER_MEANINGS.get(number)

    def get_all_meanings(self) -> Dict[int, Dict]:
        """
        Get all number meanings.
        """
        return self.NUMBER_MEANINGS.copy()

    def get_compatibility(self, number1: int, number2: int) -> Dict:
        """
        Get compatibility analysis between two Life Path numbers.
        """
        # Simplified compatibility matrix
        compatibility_matrix = {
            (1, 1): 70, (1, 2): 60, (1, 3): 80, (1, 4): 50, (1, 5): 90,
            (1, 6): 60, (1, 7): 70, (1, 8): 80, (1, 9): 80,
            (2, 2): 70, (2, 3): 70, (2, 4): 80, (2, 5): 50, (2, 6): 90,
            (2, 7): 60, (2, 8): 80, (2, 9): 70,
            (3, 3): 80, (3, 4): 40, (3, 5): 90, (3, 6): 80, (3, 7): 50,
            (3, 8): 50, (3, 9): 80,
            (4, 4): 80, (4, 5): 40, (4, 6): 80, (4, 7): 70, (4, 8): 90,
            (4, 9): 50,
            (5, 5): 80, (5, 6): 50, (5, 7): 80, (5, 8): 60, (5, 9): 90,
            (6, 6): 90, (6, 7): 50, (6, 8): 60, (6, 9): 90,
            (7, 7): 80, (7, 8): 50, (7, 9): 70,
            (8, 8): 80, (8, 9): 60,
            (9, 9): 80
        }

        # Normalize to single digits for lookup
        n1 = self.reduce_to_single_digit(number1, preserve_master=False)
        n2 = self.reduce_to_single_digit(number2, preserve_master=False)

        # Get compatibility score (order doesn't matter)
        key = (min(n1, n2), max(n1, n2))
        score = compatibility_matrix.get(key, 50)

        # Determine compatibility level
        if score >= 85:
            level = "Excellent"
            description = "A highly harmonious combination with natural understanding."
        elif score >= 70:
            level = "Good"
            description = "Strong compatibility with complementary energies."
        elif score >= 55:
            level = "Moderate"
            description = "Workable relationship with some areas requiring attention."
        else:
            level = "Challenging"
            description = "Different approaches may create friction, but also opportunities for growth."

        return {
            "number1": number1,
            "number2": number2,
            "score": score,
            "level": level,
            "description": description
        }


# Singleton instance
_numerology_service = None


def get_numerology_service() -> NumerologyService:
    """Get the singleton NumerologyService instance."""
    global _numerology_service
    if _numerology_service is None:
        _numerology_service = NumerologyService()
    return _numerology_service
