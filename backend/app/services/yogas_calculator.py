"""
Yogas Calculator Service

Detects planetary combinations (Yogas) in Vedic astrology.
Yogas are specific planetary configurations that indicate
particular life patterns, strengths, or challenges.
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict


@dataclass
class YogaResult:
    """Represents a detected yoga"""
    name: str
    sanskrit_name: str
    category: str  # 'raja', 'dhana', 'pancha_mahapurusha', 'chandra', 'surya', 'other', 'negative'
    planets_involved: List[str]
    houses_involved: List[int]
    strength: str  # 'strong', 'moderate', 'weak'
    description: str
    effects: str

    def to_dict(self) -> dict:
        return asdict(self)


class YogasCalculator:
    """
    Calculates and detects Vedic astrological Yogas.

    Major yoga categories:
    - Raja Yogas: Combinations for power, authority, success
    - Dhana Yogas: Combinations for wealth
    - Pancha Mahapurusha: Five great person yogas (Mars, Mercury, Jupiter, Venus, Saturn)
    - Chandra Yogas: Moon-based combinations
    - Surya Yogas: Sun-based combinations
    - Negative Yogas: Challenging combinations
    """

    # Sign rulers (0=Aries, 11=Pisces)
    SIGN_LORDS = {
        0: 'mars',      # Aries
        1: 'venus',     # Taurus
        2: 'mercury',   # Gemini
        3: 'moon',      # Cancer
        4: 'sun',       # Leo
        5: 'mercury',   # Virgo
        6: 'venus',     # Libra
        7: 'mars',      # Scorpio (traditional)
        8: 'jupiter',   # Sagittarius
        9: 'saturn',    # Capricorn
        10: 'saturn',   # Aquarius
        11: 'jupiter',  # Pisces
    }

    # Exaltation signs
    EXALTATION = {
        'sun': 0,       # Aries
        'moon': 1,      # Taurus
        'mars': 9,      # Capricorn
        'mercury': 5,   # Virgo
        'jupiter': 3,   # Cancer
        'venus': 11,    # Pisces
        'saturn': 6,    # Libra
    }

    # Debilitation signs
    DEBILITATION = {
        'sun': 6,       # Libra
        'moon': 7,      # Scorpio
        'mars': 3,      # Cancer
        'mercury': 11,  # Pisces
        'jupiter': 9,   # Capricorn
        'venus': 5,     # Virgo
        'saturn': 0,    # Aries
    }

    # Own signs
    OWN_SIGNS = {
        'sun': [4],
        'moon': [3],
        'mars': [0, 7],
        'mercury': [2, 5],
        'jupiter': [8, 11],
        'venus': [1, 6],
        'saturn': [9, 10],
    }

    # Moolatrikona signs
    MOOLATRIKONA = {
        'sun': 4,       # Leo
        'moon': 1,      # Taurus
        'mars': 0,      # Aries
        'mercury': 5,   # Virgo
        'jupiter': 8,   # Sagittarius
        'venus': 6,     # Libra
        'saturn': 10,   # Aquarius
    }

    SIGN_NAMES = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ]

    @classmethod
    def detect_all_yogas(
        cls,
        planets: Dict[str, Dict],
        ascendant: float,
        dignities: Optional[Dict[str, str]] = None,
        include_weak: bool = False
    ) -> Dict:
        """
        Detect all yogas in a chart.

        Args:
            planets: Dict of planet data with longitude, sign, house
            ascendant: Ascendant longitude in degrees
            dignities: Optional pre-calculated dignities
            include_weak: Whether to include weak/partial yogas

        Returns:
            Dict with categorized yogas and summary
        """
        asc_sign = int(ascendant / 30)

        # Get planet positions by sign
        planet_signs = cls._get_planet_signs(planets)
        planet_houses = cls._get_planet_houses(planets, asc_sign)

        # Get house lords
        house_lords = cls._get_house_lords(asc_sign)

        # Detect various yoga categories
        all_yogas: Dict[str, List[YogaResult]] = {
            'raja': [],
            'dhana': [],
            'pancha_mahapurusha': [],
            'chandra': [],
            'surya': [],
            'other': [],
            'negative': [],
        }

        # Raja Yogas
        raja_yogas = cls._detect_raja_yogas(planet_signs, planet_houses, asc_sign, house_lords)
        all_yogas['raja'].extend(raja_yogas)

        # Pancha Mahapurusha Yogas
        mahapurusha = cls._detect_pancha_mahapurusha(planet_signs, planet_houses, asc_sign)
        all_yogas['pancha_mahapurusha'].extend(mahapurusha)

        # Dhana Yogas
        dhana_yogas = cls._detect_dhana_yogas(planet_signs, planet_houses, asc_sign, house_lords)
        all_yogas['dhana'].extend(dhana_yogas)

        # Chandra (Moon) Yogas
        chandra_yogas = cls._detect_chandra_yogas(planet_signs, planet_houses, asc_sign)
        all_yogas['chandra'].extend(chandra_yogas)

        # Surya (Sun) Yogas
        surya_yogas = cls._detect_surya_yogas(planet_signs, planet_houses, asc_sign)
        all_yogas['surya'].extend(surya_yogas)

        # Other beneficial yogas
        other_yogas = cls._detect_other_yogas(planet_signs, planet_houses, asc_sign, house_lords)
        all_yogas['other'].extend(other_yogas)

        # Negative yogas
        negative_yogas = cls._detect_negative_yogas(planet_signs, planet_houses, asc_sign)
        all_yogas['negative'].extend(negative_yogas)

        # Filter weak yogas if not included
        if not include_weak:
            for category in all_yogas:
                all_yogas[category] = [y for y in all_yogas[category] if y.strength != 'weak']

        # Calculate summary
        total_count = sum(len(yogas) for yogas in all_yogas.values())
        summary = cls._calculate_summary(all_yogas, asc_sign)

        return {
            'yogas': {cat: [y.to_dict() for y in yogas] for cat, yogas in all_yogas.items()},
            'total_count': total_count,
            'summary': summary,
            'calculation_info': {
                'ascendant_sign': cls.SIGN_NAMES[asc_sign],
                'house_lords': {h: lord for h, lord in house_lords.items()},
            }
        }

    @classmethod
    def _get_planet_signs(cls, planets: Dict) -> Dict[str, int]:
        """Extract planet sign positions"""
        result = {}
        for name, data in planets.items():
            if isinstance(data, dict):
                if 'sign' in data:
                    result[name.lower()] = data['sign']
                elif 'longitude' in data:
                    result[name.lower()] = int(data['longitude'] / 30)
        return result

    @classmethod
    def _get_planet_houses(cls, planets: Dict, asc_sign: int) -> Dict[str, int]:
        """Extract planet house positions"""
        result = {}
        for name, data in planets.items():
            if isinstance(data, dict):
                if 'house' in data:
                    result[name.lower()] = data['house']
                elif 'sign' in data:
                    # Calculate house from sign
                    sign = data['sign']
                    house = ((sign - asc_sign) % 12) + 1
                    result[name.lower()] = house
        return result

    @classmethod
    def _get_house_lords(cls, asc_sign: int) -> Dict[int, str]:
        """Get the planetary lord for each house"""
        lords = {}
        for house in range(1, 13):
            sign = (asc_sign + house - 1) % 12
            lords[house] = cls.SIGN_LORDS[sign]
        return lords

    @classmethod
    def _is_kendra(cls, house: int) -> bool:
        """Check if house is a kendra (1, 4, 7, 10)"""
        return house in [1, 4, 7, 10]

    @classmethod
    def _is_trikona(cls, house: int) -> bool:
        """Check if house is a trikona (1, 5, 9)"""
        return house in [1, 5, 9]

    @classmethod
    def _is_dusthana(cls, house: int) -> bool:
        """Check if house is a dusthana (6, 8, 12)"""
        return house in [6, 8, 12]

    @classmethod
    def _are_conjunct(cls, planet1: str, planet2: str, planet_signs: Dict) -> bool:
        """Check if two planets are conjunct (same sign)"""
        if planet1 not in planet_signs or planet2 not in planet_signs:
            return False
        return planet_signs[planet1] == planet_signs[planet2]

    @classmethod
    def _get_aspect_houses(cls, planet: str, house: int) -> List[int]:
        """Get houses aspected by a planet from its position"""
        # All planets aspect 7th house from themselves
        aspects = [(house + 6) % 12 + 1]  # 7th aspect

        # Special aspects
        if planet == 'mars':
            aspects.append((house + 3) % 12 + 1)  # 4th aspect
            aspects.append((house + 7) % 12 + 1)  # 8th aspect
        elif planet == 'jupiter':
            aspects.append((house + 4) % 12 + 1)  # 5th aspect
            aspects.append((house + 8) % 12 + 1)  # 9th aspect
        elif planet == 'saturn':
            aspects.append((house + 2) % 12 + 1)  # 3rd aspect
            aspects.append((house + 9) % 12 + 1)  # 10th aspect

        return aspects

    @classmethod
    def _detect_raja_yogas(
        cls,
        planet_signs: Dict,
        planet_houses: Dict,
        asc_sign: int,
        house_lords: Dict
    ) -> List[YogaResult]:
        """Detect Raja Yogas - combinations for power and authority"""
        yogas = []

        # Get kendra and trikona lords
        kendra_lords = [house_lords[h] for h in [1, 4, 7, 10]]
        trikona_lords = [house_lords[h] for h in [1, 5, 9]]

        # Raja Yoga: Kendra lord conjunct/associated with Trikona lord
        for kendra_house in [1, 4, 7, 10]:
            kendra_lord = house_lords[kendra_house]
            for trikona_house in [5, 9]:  # Exclude 1st as it's both
                trikona_lord = house_lords[trikona_house]

                if kendra_lord == trikona_lord:
                    continue  # Same planet

                if cls._are_conjunct(kendra_lord, trikona_lord, planet_signs):
                    strength = 'strong' if kendra_house == 1 or trikona_house == 9 else 'moderate'
                    yogas.append(YogaResult(
                        name=f"Raja Yoga ({kendra_lord.title()}-{trikona_lord.title()})",
                        sanskrit_name="Raja Yoga",
                        category='raja',
                        planets_involved=[kendra_lord, trikona_lord],
                        houses_involved=[kendra_house, trikona_house],
                        strength=strength,
                        description=f"Lord of house {kendra_house} ({kendra_lord.title()}) conjunct with lord of house {trikona_house} ({trikona_lord.title()})",
                        effects="Brings authority, leadership, success, and recognition in life"
                    ))

        # Gaja Kesari Yoga: Jupiter in kendra from Moon
        if 'moon' in planet_houses and 'jupiter' in planet_houses:
            moon_house = planet_houses['moon']
            jupiter_house = planet_houses['jupiter']
            houses_from_moon = ((jupiter_house - moon_house) % 12) + 1

            if houses_from_moon in [1, 4, 7, 10]:
                yogas.append(YogaResult(
                    name="Gaja Kesari Yoga",
                    sanskrit_name="Gajakesari Yoga",
                    category='raja',
                    planets_involved=['moon', 'jupiter'],
                    houses_involved=[moon_house, jupiter_house],
                    strength='strong',
                    description="Jupiter in a kendra (1st, 4th, 7th, or 10th) from Moon",
                    effects="Confers wisdom, wealth, fame, and lasting reputation. The person becomes like a lion among people."
                ))

        # Viparita Raja Yoga: Lords of 6, 8, 12 in each other's houses
        dusthana_lords = {6: house_lords[6], 8: house_lords[8], 12: house_lords[12]}
        for h1 in [6, 8, 12]:
            lord1 = dusthana_lords[h1]
            if lord1 not in planet_houses:
                continue
            lord1_house = planet_houses[lord1]

            for h2 in [6, 8, 12]:
                if h1 == h2:
                    continue
                if lord1_house == h2:
                    yogas.append(YogaResult(
                        name=f"Viparita Raja Yoga",
                        sanskrit_name="Viparita Raja Yoga",
                        category='raja',
                        planets_involved=[lord1],
                        houses_involved=[h1, h2],
                        strength='moderate',
                        description=f"Lord of {h1}th house placed in {h2}th house",
                        effects="Success through unconventional means, gains through others' losses, resilience through difficulties"
                    ))

        return yogas

    @classmethod
    def _detect_pancha_mahapurusha(
        cls,
        planet_signs: Dict,
        planet_houses: Dict,
        asc_sign: int
    ) -> List[YogaResult]:
        """Detect Pancha Mahapurusha Yogas"""
        yogas = []

        mahapurusha_planets = {
            'mars': ('Ruchaka', "Brave, commanding, military success, leadership"),
            'mercury': ('Bhadra', "Intelligent, eloquent, skilled in arts and sciences"),
            'jupiter': ('Hamsa', "Virtuous, learned, spiritual, honored by rulers"),
            'venus': ('Malavya', "Beautiful, artistic, wealthy, enjoys luxuries"),
            'saturn': ('Sasa', "Powerful, commands servants, head of organization"),
        }

        for planet, (yoga_name, effects) in mahapurusha_planets.items():
            if planet not in planet_signs or planet not in planet_houses:
                continue

            sign = planet_signs[planet]
            house = planet_houses[planet]

            # Must be in kendra from Ascendant
            if not cls._is_kendra(house):
                continue

            # Must be in own sign, exaltation, or moolatrikona
            is_own = sign in cls.OWN_SIGNS.get(planet, [])
            is_exalted = sign == cls.EXALTATION.get(planet)
            is_moolatrikona = sign == cls.MOOLATRIKONA.get(planet)

            if is_own or is_exalted or is_moolatrikona:
                strength = 'strong' if is_exalted else 'moderate'
                dignity = 'exalted' if is_exalted else ('moolatrikona' if is_moolatrikona else 'own sign')

                yogas.append(YogaResult(
                    name=f"{yoga_name} Yoga",
                    sanskrit_name=f"{yoga_name} Yoga",
                    category='pancha_mahapurusha',
                    planets_involved=[planet],
                    houses_involved=[house],
                    strength=strength,
                    description=f"{planet.title()} in {dignity} in house {house} (kendra)",
                    effects=effects
                ))

        return yogas

    @classmethod
    def _detect_dhana_yogas(
        cls,
        planet_signs: Dict,
        planet_houses: Dict,
        asc_sign: int,
        house_lords: Dict
    ) -> List[YogaResult]:
        """Detect Dhana (Wealth) Yogas"""
        yogas = []

        # Lords of 2nd and 11th in conjunction or exchange
        lord_2 = house_lords[2]
        lord_11 = house_lords[11]

        if cls._are_conjunct(lord_2, lord_11, planet_signs):
            yogas.append(YogaResult(
                name="Dhana Yoga (2-11)",
                sanskrit_name="Dhana Yoga",
                category='dhana',
                planets_involved=[lord_2, lord_11],
                houses_involved=[2, 11],
                strength='strong',
                description=f"Lords of 2nd ({lord_2.title()}) and 11th ({lord_11.title()}) houses conjunct",
                effects="Strong wealth accumulation, multiple sources of income"
            ))

        # 2nd or 11th lord in kendra/trikona
        for wealth_house in [2, 11]:
            wealth_lord = house_lords[wealth_house]
            if wealth_lord not in planet_houses:
                continue
            lord_position = planet_houses[wealth_lord]

            if cls._is_kendra(lord_position) or cls._is_trikona(lord_position):
                yogas.append(YogaResult(
                    name=f"Dhana Yoga ({wealth_house}th lord)",
                    sanskrit_name="Dhana Yoga",
                    category='dhana',
                    planets_involved=[wealth_lord],
                    houses_involved=[wealth_house, lord_position],
                    strength='moderate',
                    description=f"Lord of {wealth_house}th house in house {lord_position} (favorable position)",
                    effects="Financial gains and prosperity"
                ))

        # Lakshmi Yoga: Lord of 9th in own/exaltation in kendra/trikona
        lord_9 = house_lords[9]
        if lord_9 in planet_signs and lord_9 in planet_houses:
            sign = planet_signs[lord_9]
            house = planet_houses[lord_9]

            is_strong = sign in cls.OWN_SIGNS.get(lord_9, []) or sign == cls.EXALTATION.get(lord_9)
            is_good_house = cls._is_kendra(house) or cls._is_trikona(house)

            if is_strong and is_good_house:
                yogas.append(YogaResult(
                    name="Lakshmi Yoga",
                    sanskrit_name="Lakshmi Yoga",
                    category='dhana',
                    planets_involved=[lord_9],
                    houses_involved=[9, house],
                    strength='strong',
                    description=f"Lord of 9th house ({lord_9.title()}) in strength in house {house}",
                    effects="Great wealth, fortune, and prosperity blessed by Goddess Lakshmi"
                ))

        return yogas

    @classmethod
    def _detect_chandra_yogas(
        cls,
        planet_signs: Dict,
        planet_houses: Dict,
        asc_sign: int
    ) -> List[YogaResult]:
        """Detect Moon-based Yogas"""
        yogas = []

        if 'moon' not in planet_signs:
            return yogas

        moon_sign = planet_signs['moon']
        moon_house = planet_houses.get('moon', 0)

        # Chandra-Mangala Yoga: Moon conjunct Mars
        if cls._are_conjunct('moon', 'mars', planet_signs):
            yogas.append(YogaResult(
                name="Chandra-Mangala Yoga",
                sanskrit_name="Chandra-Mangala Yoga",
                category='chandra',
                planets_involved=['moon', 'mars'],
                houses_involved=[moon_house],
                strength='moderate',
                description="Moon conjunct Mars",
                effects="Wealth through courage and bold actions, prosperity from mother, business acumen"
            ))

        # Sunapha Yoga: Planets (except Sun) in 2nd from Moon
        second_from_moon = (moon_sign + 1) % 12
        planets_in_2nd = [p for p, s in planet_signs.items()
                         if s == second_from_moon and p not in ['moon', 'sun', 'rahu', 'ketu']]
        if planets_in_2nd:
            yogas.append(YogaResult(
                name="Sunapha Yoga",
                sanskrit_name="Sunapha Yoga",
                category='chandra',
                planets_involved=['moon'] + planets_in_2nd,
                houses_involved=[moon_house],
                strength='moderate',
                description=f"Planet(s) in 2nd house from Moon: {', '.join(p.title() for p in planets_in_2nd)}",
                effects="Self-made wealth, good reputation, intelligent"
            ))

        # Anapha Yoga: Planets (except Sun) in 12th from Moon
        twelfth_from_moon = (moon_sign - 1) % 12
        planets_in_12th = [p for p, s in planet_signs.items()
                          if s == twelfth_from_moon and p not in ['moon', 'sun', 'rahu', 'ketu']]
        if planets_in_12th:
            yogas.append(YogaResult(
                name="Anapha Yoga",
                sanskrit_name="Anapha Yoga",
                category='chandra',
                planets_involved=['moon'] + planets_in_12th,
                houses_involved=[moon_house],
                strength='moderate',
                description=f"Planet(s) in 12th house from Moon: {', '.join(p.title() for p in planets_in_12th)}",
                effects="Healthy, virtuous, well-dressed, good reputation"
            ))

        # Durudhara Yoga: Planets in both 2nd and 12th from Moon
        if planets_in_2nd and planets_in_12th:
            yogas.append(YogaResult(
                name="Durudhara Yoga",
                sanskrit_name="Durudhara Yoga",
                category='chandra',
                planets_involved=['moon'] + planets_in_2nd + planets_in_12th,
                houses_involved=[moon_house],
                strength='strong',
                description="Planets in both 2nd and 12th from Moon",
                effects="Wealthy, generous, blessed with comforts and vehicles"
            ))

        # Adhi Yoga: Benefics in 6, 7, 8 from Moon
        benefics = ['jupiter', 'venus', 'mercury']
        houses_from_moon = {}
        for planet in benefics:
            if planet in planet_signs:
                h = ((planet_signs[planet] - moon_sign) % 12) + 1
                if h in [6, 7, 8]:
                    houses_from_moon[planet] = h

        if len(houses_from_moon) >= 2:
            yogas.append(YogaResult(
                name="Adhi Yoga",
                sanskrit_name="Adhi Yoga",
                category='chandra',
                planets_involved=['moon'] + list(houses_from_moon.keys()),
                houses_involved=[moon_house],
                strength='strong' if len(houses_from_moon) == 3 else 'moderate',
                description=f"Benefics in 6th, 7th, 8th from Moon",
                effects="Commander, minister, or king. Polite, trustworthy, healthy, wealthy, long-lived"
            ))

        return yogas

    @classmethod
    def _detect_surya_yogas(
        cls,
        planet_signs: Dict,
        planet_houses: Dict,
        asc_sign: int
    ) -> List[YogaResult]:
        """Detect Sun-based Yogas"""
        yogas = []

        if 'sun' not in planet_signs:
            return yogas

        sun_sign = planet_signs['sun']
        sun_house = planet_houses.get('sun', 0)

        # Budha-Aditya Yoga: Sun conjunct Mercury
        if cls._are_conjunct('sun', 'mercury', planet_signs):
            # Check Mercury is not combust (too close to Sun)
            yogas.append(YogaResult(
                name="Budha-Aditya Yoga",
                sanskrit_name="Budhaditya Yoga",
                category='surya',
                planets_involved=['sun', 'mercury'],
                houses_involved=[sun_house],
                strength='moderate',
                description="Sun conjunct Mercury",
                effects="Intelligent, skilled in arts, good reputation, sweet speech"
            ))

        # Vesi Yoga: Planets (except Moon) in 2nd from Sun
        second_from_sun = (sun_sign + 1) % 12
        planets_in_2nd = [p for p, s in planet_signs.items()
                         if s == second_from_sun and p not in ['sun', 'moon', 'rahu', 'ketu']]
        if planets_in_2nd:
            yogas.append(YogaResult(
                name="Vesi Yoga",
                sanskrit_name="Vesi Yoga",
                category='surya',
                planets_involved=['sun'] + planets_in_2nd,
                houses_involved=[sun_house],
                strength='moderate',
                description=f"Planet(s) in 2nd from Sun: {', '.join(p.title() for p in planets_in_2nd)}",
                effects="Balanced, truthful, lazy but clever"
            ))

        # Vosi Yoga: Planets (except Moon) in 12th from Sun
        twelfth_from_sun = (sun_sign - 1) % 12
        planets_in_12th = [p for p, s in planet_signs.items()
                          if s == twelfth_from_sun and p not in ['sun', 'moon', 'rahu', 'ketu']]
        if planets_in_12th:
            yogas.append(YogaResult(
                name="Vosi Yoga",
                sanskrit_name="Vosi Yoga",
                category='surya',
                planets_involved=['sun'] + planets_in_12th,
                houses_involved=[sun_house],
                strength='moderate',
                description=f"Planet(s) in 12th from Sun: {', '.join(p.title() for p in planets_in_12th)}",
                effects="Skilled, charitable, good memory, learned"
            ))

        # Ubhayachari Yoga: Planets in both 2nd and 12th from Sun
        if planets_in_2nd and planets_in_12th:
            yogas.append(YogaResult(
                name="Ubhayachari Yoga",
                sanskrit_name="Ubhayachari Yoga",
                category='surya',
                planets_involved=['sun'] + planets_in_2nd + planets_in_12th,
                houses_involved=[sun_house],
                strength='strong',
                description="Planets in both 2nd and 12th from Sun",
                effects="Equal to a king, eloquent, handsome, liked by all"
            ))

        return yogas

    @classmethod
    def _detect_other_yogas(
        cls,
        planet_signs: Dict,
        planet_houses: Dict,
        asc_sign: int,
        house_lords: Dict
    ) -> List[YogaResult]:
        """Detect other beneficial yogas"""
        yogas = []

        # Saraswati Yoga: Jupiter, Venus, Mercury in kendras/trikonas
        wisdom_planets = ['jupiter', 'venus', 'mercury']
        positions = []
        for planet in wisdom_planets:
            if planet in planet_houses:
                house = planet_houses[planet]
                if cls._is_kendra(house) or cls._is_trikona(house):
                    positions.append((planet, house))

        if len(positions) >= 3:
            yogas.append(YogaResult(
                name="Saraswati Yoga",
                sanskrit_name="Saraswati Yoga",
                category='other',
                planets_involved=[p[0] for p in positions],
                houses_involved=[p[1] for p in positions],
                strength='strong',
                description="Jupiter, Venus, and Mercury all in kendras or trikonas",
                effects="Highly learned, poetic, skilled in arts and sciences, famous author or scholar"
            ))

        # Kahala Yoga: 4th lord and Jupiter in mutual kendras
        lord_4 = house_lords[4]
        if 'jupiter' in planet_houses and lord_4 in planet_houses:
            lord_4_house = planet_houses[lord_4]
            jupiter_house = planet_houses['jupiter']

            if cls._is_kendra(lord_4_house) and cls._is_kendra(jupiter_house):
                yogas.append(YogaResult(
                    name="Kahala Yoga",
                    sanskrit_name="Kahala Yoga",
                    category='other',
                    planets_involved=[lord_4, 'jupiter'],
                    houses_involved=[4, lord_4_house, jupiter_house],
                    strength='moderate',
                    description=f"4th lord ({lord_4.title()}) and Jupiter both in kendras",
                    effects="Bold, leads an army, head of a village or town"
                ))

        return yogas

    @classmethod
    def _detect_negative_yogas(
        cls,
        planet_signs: Dict,
        planet_houses: Dict,
        asc_sign: int
    ) -> List[YogaResult]:
        """Detect challenging yogas"""
        yogas = []

        if 'moon' not in planet_signs:
            return yogas

        moon_sign = planet_signs['moon']
        moon_house = planet_houses.get('moon', 0)

        # Kemadruma Yoga: No planets in 2nd or 12th from Moon
        second_from_moon = (moon_sign + 1) % 12
        twelfth_from_moon = (moon_sign - 1) % 12

        planets_2nd = [p for p, s in planet_signs.items()
                      if s == second_from_moon and p not in ['moon', 'rahu', 'ketu']]
        planets_12th = [p for p, s in planet_signs.items()
                       if s == twelfth_from_moon and p not in ['moon', 'rahu', 'ketu']]

        if not planets_2nd and not planets_12th:
            # Check for cancellation
            moon_in_kendra = cls._is_kendra(moon_house)
            jupiter_aspects_moon = False  # Would need aspect calculation

            if not moon_in_kendra:
                yogas.append(YogaResult(
                    name="Kemadruma Yoga",
                    sanskrit_name="Kemadruma Yoga",
                    category='negative',
                    planets_involved=['moon'],
                    houses_involved=[moon_house],
                    strength='moderate',
                    description="No planets in 2nd or 12th from Moon",
                    effects="May face poverty, loneliness, or struggles. Often cancelled by other factors."
                ))

        # Grahan Yoga: Sun or Moon with Rahu/Ketu
        if 'rahu' in planet_signs:
            if cls._are_conjunct('sun', 'rahu', planet_signs):
                sun_house = planet_houses.get('sun', 0)
                yogas.append(YogaResult(
                    name="Grahan Yoga (Sun-Rahu)",
                    sanskrit_name="Grahan Yoga",
                    category='negative',
                    planets_involved=['sun', 'rahu'],
                    houses_involved=[sun_house],
                    strength='moderate',
                    description="Sun conjunct Rahu (solar eclipse pattern)",
                    effects="Challenges with father, authority figures, or ego. Karmic lessons around identity."
                ))

            if cls._are_conjunct('moon', 'rahu', planet_signs):
                yogas.append(YogaResult(
                    name="Grahan Yoga (Moon-Rahu)",
                    sanskrit_name="Grahan Yoga",
                    category='negative',
                    planets_involved=['moon', 'rahu'],
                    houses_involved=[moon_house],
                    strength='moderate',
                    description="Moon conjunct Rahu (lunar eclipse pattern)",
                    effects="Emotional turbulence, challenges with mother. Strong intuition but mental restlessness."
                ))

        if 'ketu' in planet_signs:
            if cls._are_conjunct('sun', 'ketu', planet_signs):
                sun_house = planet_houses.get('sun', 0)
                yogas.append(YogaResult(
                    name="Grahan Yoga (Sun-Ketu)",
                    sanskrit_name="Grahan Yoga",
                    category='negative',
                    planets_involved=['sun', 'ketu'],
                    houses_involved=[sun_house],
                    strength='weak',
                    description="Sun conjunct Ketu",
                    effects="Spiritual inclination, but may lack confidence or worldly ambition"
                ))

            if cls._are_conjunct('moon', 'ketu', planet_signs):
                yogas.append(YogaResult(
                    name="Grahan Yoga (Moon-Ketu)",
                    sanskrit_name="Grahan Yoga",
                    category='negative',
                    planets_involved=['moon', 'ketu'],
                    houses_involved=[moon_house],
                    strength='weak',
                    description="Moon conjunct Ketu",
                    effects="Detachment from emotions, spiritual nature, but may feel emotionally disconnected"
                ))

        return yogas

    @classmethod
    def _calculate_summary(cls, all_yogas: Dict[str, List[YogaResult]], asc_sign: int) -> Dict:
        """Calculate yoga summary"""
        raja_count = len(all_yogas.get('raja', []))
        dhana_count = len(all_yogas.get('dhana', []))
        mahapurusha_count = len(all_yogas.get('pancha_mahapurusha', []))
        negative_count = len(all_yogas.get('negative', []))

        # Find strongest yogas
        all_yoga_list = []
        for category, yogas in all_yogas.items():
            all_yoga_list.extend(yogas)

        strong_yogas = [y.name for y in all_yoga_list if y.strength == 'strong']

        # Overall assessment
        total_positive = raja_count + dhana_count + mahapurusha_count
        if total_positive >= 5 and negative_count <= 1:
            assessment = "Exceptionally favorable chart with multiple powerful yogas"
        elif total_positive >= 3:
            assessment = "Strong chart with beneficial planetary combinations"
        elif total_positive >= 1:
            assessment = "Chart has some beneficial yogas supporting success"
        elif negative_count >= 2:
            assessment = "Chart has challenging yogas requiring careful navigation"
        else:
            assessment = "Chart has standard planetary combinations"

        return {
            'raja_yoga_count': raja_count,
            'dhana_yoga_count': dhana_count,
            'pancha_mahapurusha_count': mahapurusha_count,
            'negative_yoga_count': negative_count,
            'strongest_yogas': strong_yogas[:5],  # Top 5
            'overall_assessment': assessment,
        }
