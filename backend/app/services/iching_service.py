"""
I-Ching Service

Provides I-Ching hexagram data, casting methods, and interpretations.
Part of Phase 3: Multi-Paradigm Integration
"""
import random
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum


class LineType(int, Enum):
    """Line types in I-Ching"""
    OLD_YIN = 6      # Changing Yin (broken line that changes)
    YOUNG_YANG = 7   # Static Yang (solid line)
    YOUNG_YIN = 8    # Static Yin (broken line)
    OLD_YANG = 9     # Changing Yang (solid line that changes)


# The 64 Hexagrams with their traditional meanings
HEXAGRAMS = {
    1: {
        "name": "Qian",
        "english": "The Creative",
        "symbol": "☰☰",
        "upper": "heaven",
        "lower": "heaven",
        "judgment": "The Creative works sublime success, furthering through perseverance.",
        "image": "The movement of heaven is full of power. Thus the superior person makes themselves strong and untiring.",
        "keywords": ["creativity", "strength", "initiative", "heaven", "father"],
        "meaning": "Pure yang energy. Time for bold action and leadership. Great creative power is available to you."
    },
    2: {
        "name": "Kun",
        "english": "The Receptive",
        "symbol": "☷☷",
        "upper": "earth",
        "lower": "earth",
        "judgment": "The Receptive brings about sublime success, furthering through the perseverance of a mare.",
        "image": "The earth's condition is receptive devotion. Thus the superior person carries the outer world.",
        "keywords": ["receptivity", "yielding", "earth", "mother", "support"],
        "meaning": "Pure yin energy. Time for receptivity and support. Success through following and nurturing."
    },
    3: {
        "name": "Zhun",
        "english": "Difficulty at the Beginning",
        "symbol": "☵☳",
        "upper": "water",
        "lower": "thunder",
        "judgment": "Difficulty at the Beginning works supreme success. It furthers one to appoint helpers.",
        "image": "Clouds and thunder: the image of Difficulty at the Beginning.",
        "keywords": ["beginnings", "chaos", "growth", "potential", "birth"],
        "meaning": "Like a seedling pushing through earth. Initial difficulties lead to growth. Seek help."
    },
    4: {
        "name": "Meng",
        "english": "Youthful Folly",
        "symbol": "☶☵",
        "upper": "mountain",
        "lower": "water",
        "judgment": "Youthful Folly has success. It is not I who seek the young fool; the young fool seeks me.",
        "image": "A spring wells up at the foot of the mountain: the image of youth.",
        "keywords": ["inexperience", "learning", "innocence", "education", "beginning"],
        "meaning": "Time for learning with humility. The student must seek the teacher."
    },
    5: {
        "name": "Xu",
        "english": "Waiting",
        "symbol": "☵☰",
        "upper": "water",
        "lower": "heaven",
        "judgment": "Waiting. If you are sincere, you have light and success.",
        "image": "Clouds rise up to heaven: the image of Waiting.",
        "keywords": ["patience", "nourishment", "timing", "trust", "preparation"],
        "meaning": "Waiting with confidence. Nourish yourself while conditions develop."
    },
    6: {
        "name": "Song",
        "english": "Conflict",
        "symbol": "☰☵",
        "upper": "heaven",
        "lower": "water",
        "judgment": "Conflict. You are sincere and being obstructed. Halfway brings good fortune.",
        "image": "Heaven and water go their opposite ways: the image of Conflict.",
        "keywords": ["conflict", "lawsuit", "opposition", "tension", "compromise"],
        "meaning": "Inner truth confronts external obstacles. Seek mediation, not total victory."
    },
    7: {
        "name": "Shi",
        "english": "The Army",
        "symbol": "☷☵",
        "upper": "earth",
        "lower": "water",
        "judgment": "The Army needs perseverance and a strong man. Good fortune without blame.",
        "image": "In the middle of the earth is water: the image of the Army.",
        "keywords": ["discipline", "organization", "leadership", "masses", "strategy"],
        "meaning": "Time for organized action. Strong leadership and discipline bring success."
    },
    8: {
        "name": "Bi",
        "english": "Holding Together",
        "symbol": "☵☷",
        "upper": "water",
        "lower": "earth",
        "judgment": "Holding Together brings good fortune. Inquire of the oracle once again.",
        "image": "On the earth is water: the image of Holding Together.",
        "keywords": ["union", "alliance", "cooperation", "support", "gathering"],
        "meaning": "Time for forming alliances. Seek unity with others who share your values."
    },
    9: {
        "name": "Xiao Chu",
        "english": "Small Taming",
        "symbol": "☴☰",
        "upper": "wind",
        "lower": "heaven",
        "judgment": "The Taming Power of the Small has success. Dense clouds, no rain from our western region.",
        "image": "The wind drives across heaven: the image of the Taming Power of the Small.",
        "keywords": ["restraint", "detail", "preparation", "patience", "gentle"],
        "meaning": "Small measures have effect. Gentle influence over time brings results."
    },
    10: {
        "name": "Lu",
        "english": "Treading",
        "symbol": "☰☱",
        "upper": "heaven",
        "lower": "lake",
        "judgment": "Treading upon the tail of the tiger. It does not bite the man. Success.",
        "image": "Heaven above, the lake below: the image of Treading.",
        "keywords": ["conduct", "caution", "propriety", "courage", "protocol"],
        "meaning": "Careful conduct in difficult situations. Proper behavior brings safety."
    },
    11: {
        "name": "Tai",
        "english": "Peace",
        "symbol": "☷☰",
        "upper": "earth",
        "lower": "heaven",
        "judgment": "Peace. The small departs, the great approaches. Good fortune, success.",
        "image": "Heaven and earth unite: the image of Peace.",
        "keywords": ["harmony", "prosperity", "balance", "flourishing", "unity"],
        "meaning": "Perfect balance between heaven and earth. A time of great prosperity."
    },
    12: {
        "name": "Pi",
        "english": "Standstill",
        "symbol": "☰☷",
        "upper": "heaven",
        "lower": "earth",
        "judgment": "Standstill. Evil people do not further the perseverance of the superior person.",
        "image": "Heaven and earth do not unite: the image of Standstill.",
        "keywords": ["stagnation", "obstruction", "decline", "withdrawal", "waiting"],
        "meaning": "Communication blocked. A time to withdraw and preserve integrity."
    },
    # Continue with remaining hexagrams (abbreviated for space)
    13: {"name": "Tong Ren", "english": "Fellowship", "symbol": "☰☲", "upper": "heaven", "lower": "fire",
         "keywords": ["community", "fellowship", "openness"], "meaning": "Seeking fellowship with others."},
    14: {"name": "Da You", "english": "Great Possession", "symbol": "☲☰", "upper": "fire", "lower": "heaven",
         "keywords": ["abundance", "wealth", "success"], "meaning": "Time of great abundance and influence."},
    15: {"name": "Qian", "english": "Modesty", "symbol": "☷☶", "upper": "earth", "lower": "mountain",
         "keywords": ["humility", "modesty", "balance"], "meaning": "Success through genuine modesty."},
    16: {"name": "Yu", "english": "Enthusiasm", "symbol": "☳☷", "upper": "thunder", "lower": "earth",
         "keywords": ["joy", "movement", "inspiration"], "meaning": "Time for action with enthusiasm."},
    17: {"name": "Sui", "english": "Following", "symbol": "☱☳", "upper": "lake", "lower": "thunder",
         "keywords": ["following", "adaptation", "service"], "meaning": "Success through adaptability."},
    18: {"name": "Gu", "english": "Work on the Decayed", "symbol": "☶☴", "upper": "mountain", "lower": "wind",
         "keywords": ["repair", "corruption", "decay"], "meaning": "Time to repair what has decayed."},
    19: {"name": "Lin", "english": "Approach", "symbol": "☷☱", "upper": "earth", "lower": "lake",
         "keywords": ["approach", "advance", "condescension"], "meaning": "Favorable time for advance."},
    20: {"name": "Guan", "english": "Contemplation", "symbol": "☴☷", "upper": "wind", "lower": "earth",
         "keywords": ["observation", "contemplation", "example"], "meaning": "Time for observation and setting example."},
    21: {"name": "Shi He", "english": "Biting Through", "symbol": "☲☳", "upper": "fire", "lower": "thunder",
         "keywords": ["decision", "justice", "determination"], "meaning": "Decisive action removes obstacles."},
    22: {"name": "Bi", "english": "Grace", "symbol": "☶☲", "upper": "mountain", "lower": "fire",
         "keywords": ["beauty", "grace", "form"], "meaning": "Elegance and beauty. Form supports content."},
    23: {"name": "Bo", "english": "Splitting Apart", "symbol": "☶☷", "upper": "mountain", "lower": "earth",
         "keywords": ["decay", "splitting", "patience"], "meaning": "Time of decline. Wait quietly."},
    24: {"name": "Fu", "english": "Return", "symbol": "☷☳", "upper": "earth", "lower": "thunder",
         "keywords": ["return", "renewal", "turning point"], "meaning": "Light returns. A turning point."},
    25: {"name": "Wu Wang", "english": "Innocence", "symbol": "☰☳", "upper": "heaven", "lower": "thunder",
         "keywords": ["innocence", "unexpected", "natural"], "meaning": "Act with innocence and naturalness."},
    26: {"name": "Da Chu", "english": "Great Taming", "symbol": "☶☰", "upper": "mountain", "lower": "heaven",
         "keywords": ["restraint", "power", "nourishment"], "meaning": "Great power held in check."},
    27: {"name": "Yi", "english": "Nourishment", "symbol": "☶☳", "upper": "mountain", "lower": "thunder",
         "keywords": ["nourishment", "providing", "speech"], "meaning": "Care in what you take in and give out."},
    28: {"name": "Da Guo", "english": "Great Exceeding", "symbol": "☱☴", "upper": "lake", "lower": "wind",
         "keywords": ["excess", "pressure", "extraordinary"], "meaning": "Extraordinary times require extraordinary measures."},
    29: {"name": "Kan", "english": "The Abysmal", "symbol": "☵☵", "upper": "water", "lower": "water",
         "keywords": ["danger", "water", "depth"], "meaning": "Danger surrounds. Maintain sincerity."},
    30: {"name": "Li", "english": "The Clinging", "symbol": "☲☲", "upper": "fire", "lower": "fire",
         "keywords": ["light", "fire", "clarity"], "meaning": "Brightness and clarity. Depend on what is right."},
    31: {"name": "Xian", "english": "Influence", "symbol": "☱☶", "upper": "lake", "lower": "mountain",
         "keywords": ["attraction", "influence", "courtship"], "meaning": "Mutual attraction and influence."},
    32: {"name": "Heng", "english": "Duration", "symbol": "☳☴", "upper": "thunder", "lower": "wind",
         "keywords": ["perseverance", "duration", "endurance"], "meaning": "Enduring through perseverance."},
    33: {"name": "Dun", "english": "Retreat", "symbol": "☰☶", "upper": "heaven", "lower": "mountain",
         "keywords": ["retreat", "withdrawal", "yielding"], "meaning": "Strategic retreat brings success."},
    34: {"name": "Da Zhuang", "english": "Great Power", "symbol": "☳☰", "upper": "thunder", "lower": "heaven",
         "keywords": ["power", "strength", "force"], "meaning": "Great power. Use with righteousness."},
    35: {"name": "Jin", "english": "Progress", "symbol": "☲☷", "upper": "fire", "lower": "earth",
         "keywords": ["advance", "progress", "promotion"], "meaning": "Rapid progress and recognition."},
    36: {"name": "Ming Yi", "english": "Darkening of the Light", "symbol": "☷☲", "upper": "earth", "lower": "fire",
         "keywords": ["adversity", "concealment", "perseverance"], "meaning": "Hide your light in difficult times."},
    37: {"name": "Jia Ren", "english": "The Family", "symbol": "☴☲", "upper": "wind", "lower": "fire",
         "keywords": ["family", "home", "relationships"], "meaning": "Proper order within the family."},
    38: {"name": "Kui", "english": "Opposition", "symbol": "☲☱", "upper": "fire", "lower": "lake",
         "keywords": ["opposition", "contrast", "estrangement"], "meaning": "Opposition that can lead to insight."},
    39: {"name": "Jian", "english": "Obstruction", "symbol": "☵☶", "upper": "water", "lower": "mountain",
         "keywords": ["obstruction", "difficulty", "southwest"], "meaning": "Obstacles ahead. Seek help."},
    40: {"name": "Jie", "english": "Deliverance", "symbol": "☳☵", "upper": "thunder", "lower": "water",
         "keywords": ["release", "liberation", "relief"], "meaning": "Release from tension. Act quickly."},
    41: {"name": "Sun", "english": "Decrease", "symbol": "☶☱", "upper": "mountain", "lower": "lake",
         "keywords": ["decrease", "simplicity", "sincerity"], "meaning": "Decrease leads to increase in time."},
    42: {"name": "Yi", "english": "Increase", "symbol": "☴☳", "upper": "wind", "lower": "thunder",
         "keywords": ["increase", "benefit", "improvement"], "meaning": "Time of increase and benefit."},
    43: {"name": "Guai", "english": "Breakthrough", "symbol": "☱☰", "upper": "lake", "lower": "heaven",
         "keywords": ["resolution", "breakthrough", "determination"], "meaning": "Decisive action needed."},
    44: {"name": "Gou", "english": "Coming to Meet", "symbol": "☰☴", "upper": "heaven", "lower": "wind",
         "keywords": ["encounter", "temptation", "influence"], "meaning": "Unexpected encounter. Be cautious."},
    45: {"name": "Cui", "english": "Gathering Together", "symbol": "☱☷", "upper": "lake", "lower": "earth",
         "keywords": ["gathering", "assembly", "collection"], "meaning": "Time for gathering with others."},
    46: {"name": "Sheng", "english": "Pushing Upward", "symbol": "☷☴", "upper": "earth", "lower": "wind",
         "keywords": ["growth", "advance", "effort"], "meaning": "Steady advancement through effort."},
    47: {"name": "Kun", "english": "Oppression", "symbol": "☱☵", "upper": "lake", "lower": "water",
         "keywords": ["exhaustion", "adversity", "confinement"], "meaning": "Time of exhaustion. Maintain cheerfulness."},
    48: {"name": "Jing", "english": "The Well", "symbol": "☵☴", "upper": "water", "lower": "wind",
         "keywords": ["source", "nourishment", "depth"], "meaning": "The inexhaustible source. Draw from depths."},
    49: {"name": "Ge", "english": "Revolution", "symbol": "☱☲", "upper": "lake", "lower": "fire",
         "keywords": ["change", "revolution", "transformation"], "meaning": "Time for radical change."},
    50: {"name": "Ding", "english": "The Cauldron", "symbol": "☲☴", "upper": "fire", "lower": "wind",
         "keywords": ["nourishment", "transformation", "culture"], "meaning": "Transformation through cultivation."},
    51: {"name": "Zhen", "english": "The Arousing", "symbol": "☳☳", "upper": "thunder", "lower": "thunder",
         "keywords": ["shock", "thunder", "movement"], "meaning": "Shock leads to caution and growth."},
    52: {"name": "Gen", "english": "Keeping Still", "symbol": "☶☶", "upper": "mountain", "lower": "mountain",
         "keywords": ["stillness", "meditation", "rest"], "meaning": "Time for stillness and meditation."},
    53: {"name": "Jian", "english": "Development", "symbol": "☴☶", "upper": "wind", "lower": "mountain",
         "keywords": ["gradual", "progress", "development"], "meaning": "Gradual development brings success."},
    54: {"name": "Gui Mei", "english": "The Marrying Maiden", "symbol": "☳☱", "upper": "thunder", "lower": "lake",
         "keywords": ["subordination", "transition", "adaptation"], "meaning": "Adaptation to circumstances."},
    55: {"name": "Feng", "english": "Abundance", "symbol": "☳☲", "upper": "thunder", "lower": "fire",
         "keywords": ["fullness", "abundance", "zenith"], "meaning": "Peak of abundance. Enjoy but prepare for change."},
    56: {"name": "Lu", "english": "The Wanderer", "symbol": "☲☶", "upper": "fire", "lower": "mountain",
         "keywords": ["travel", "stranger", "transition"], "meaning": "Time of wandering. Be cautious and reserved."},
    57: {"name": "Xun", "english": "The Gentle", "symbol": "☴☴", "upper": "wind", "lower": "wind",
         "keywords": ["penetration", "gentleness", "wind"], "meaning": "Gentle penetration brings success."},
    58: {"name": "Dui", "english": "The Joyous", "symbol": "☱☱", "upper": "lake", "lower": "lake",
         "keywords": ["joy", "pleasure", "expression"], "meaning": "Joy through openness and sincerity."},
    59: {"name": "Huan", "english": "Dispersion", "symbol": "☴☵", "upper": "wind", "lower": "water",
         "keywords": ["dissolving", "scattering", "dispersing"], "meaning": "Dissolving rigid attitudes brings unity."},
    60: {"name": "Jie", "english": "Limitation", "symbol": "☵☱", "upper": "water", "lower": "lake",
         "keywords": ["limitation", "moderation", "restraint"], "meaning": "Proper limitations bring success."},
    61: {"name": "Zhong Fu", "english": "Inner Truth", "symbol": "☴☱", "upper": "wind", "lower": "lake",
         "keywords": ["sincerity", "truth", "trust"], "meaning": "Inner truth influences others."},
    62: {"name": "Xiao Guo", "english": "Small Exceeding", "symbol": "☳☶", "upper": "thunder", "lower": "mountain",
         "keywords": ["small", "careful", "modest"], "meaning": "Small actions, not large ones, bring success."},
    63: {"name": "Ji Ji", "english": "After Completion", "symbol": "☵☲", "upper": "water", "lower": "fire",
         "keywords": ["completion", "transition", "vigilance"], "meaning": "Completion reached. Maintain vigilance."},
    64: {"name": "Wei Ji", "english": "Before Completion", "symbol": "☲☵", "upper": "fire", "lower": "water",
         "keywords": ["transition", "caution", "potential"], "meaning": "Not yet complete. Careful progress needed."}
}

# Trigram data
TRIGRAMS = {
    "heaven": {"symbol": "☰", "attribute": "creative", "element": "metal", "family": "father"},
    "earth": {"symbol": "☷", "attribute": "receptive", "element": "earth", "family": "mother"},
    "thunder": {"symbol": "☳", "attribute": "arousing", "element": "wood", "family": "eldest son"},
    "water": {"symbol": "☵", "attribute": "abysmal", "element": "water", "family": "middle son"},
    "mountain": {"symbol": "☶", "attribute": "keeping still", "element": "earth", "family": "youngest son"},
    "wind": {"symbol": "☴", "attribute": "gentle", "element": "wood", "family": "eldest daughter"},
    "fire": {"symbol": "☲", "attribute": "clinging", "element": "fire", "family": "middle daughter"},
    "lake": {"symbol": "☱", "attribute": "joyous", "element": "metal", "family": "youngest daughter"}
}


class IChingService:
    """Service for I-Ching readings and interpretations"""

    def get_hexagram(self, number: int) -> Optional[Dict[str, Any]]:
        """Get a hexagram by number (1-64)"""
        return HEXAGRAMS.get(number)

    def get_all_hexagrams(self) -> Dict[int, Dict[str, Any]]:
        """Get all 64 hexagrams"""
        return HEXAGRAMS

    def get_trigrams(self) -> Dict[str, Dict[str, Any]]:
        """Get all 8 trigrams"""
        return TRIGRAMS

    def cast_coins(self) -> List[int]:
        """
        Cast three coins six times to generate a hexagram.
        Returns list of 6 line values (from bottom to top).
        """
        lines = []
        for _ in range(6):
            # Three coins: heads=3, tails=2
            # Sum: 6 (old yin), 7 (young yang), 8 (young yin), 9 (old yang)
            throws = sum(random.choice([2, 3]) for _ in range(3))
            lines.append(throws)
        return lines

    def cast_yarrow_stalks(self) -> List[int]:
        """
        Simulate yarrow stalk method (simplified).
        Returns list of 6 line values (from bottom to top).
        """
        lines = []
        for _ in range(6):
            # Simplified yarrow stalk probabilities
            # 6: 1/16, 7: 5/16, 8: 7/16, 9: 3/16
            r = random.random()
            if r < 1/16:
                lines.append(6)
            elif r < 6/16:
                lines.append(7)
            elif r < 13/16:
                lines.append(8)
            else:
                lines.append(9)
        return lines

    def lines_to_hexagram_number(self, lines: List[int]) -> int:
        """Convert 6 lines to hexagram number using King Wen sequence"""
        # Convert lines to binary (yang=1, yin=0)
        lower = sum((1 if line in [7, 9] else 0) << i for i, line in enumerate(lines[:3]))
        upper = sum((1 if line in [7, 9] else 0) << i for i, line in enumerate(lines[3:]))

        # King Wen sequence lookup (simplified mapping)
        trigram_to_num = {
            (0, 0): 2, (0, 1): 8, (0, 2): 3, (0, 3): 6, (0, 4): 7, (0, 5): 4, (0, 6): 5, (0, 7): 1,
            (1, 0): 15, (1, 1): 45, (1, 2): 24, (1, 3): 46, (1, 4): 7, (1, 5): 19, (1, 6): 36, (1, 7): 11,
            (2, 0): 16, (2, 1): 51, (2, 2): 51, (2, 3): 40, (2, 4): 32, (2, 5): 42, (2, 6): 55, (2, 7): 34,
            (3, 0): 8, (3, 1): 47, (3, 2): 3, (3, 3): 29, (3, 4): 59, (3, 5): 48, (3, 6): 63, (3, 7): 5,
            (4, 0): 23, (4, 1): 31, (4, 2): 27, (4, 3): 39, (4, 4): 52, (4, 5): 53, (4, 6): 56, (4, 7): 33,
            (5, 0): 20, (5, 1): 57, (5, 2): 42, (5, 3): 59, (5, 4): 53, (5, 5): 57, (5, 6): 50, (5, 7): 44,
            (6, 0): 35, (6, 1): 49, (6, 2): 21, (6, 3): 64, (6, 4): 56, (6, 5): 50, (6, 6): 30, (6, 7): 14,
            (7, 0): 12, (7, 1): 10, (7, 2): 25, (7, 3): 6, (7, 4): 33, (7, 5): 9, (7, 6): 13, (7, 7): 1
        }

        return trigram_to_num.get((lower, upper), 1)

    def get_changing_hexagram(self, lines: List[int]) -> Optional[int]:
        """
        Get the second hexagram if there are changing lines.
        Returns None if no changing lines.
        """
        has_changes = any(line in [6, 9] for line in lines)
        if not has_changes:
            return None

        # Convert changing lines
        changed_lines = []
        for line in lines:
            if line == 6:  # Old yin becomes young yang
                changed_lines.append(7)
            elif line == 9:  # Old yang becomes young yin
                changed_lines.append(8)
            else:
                changed_lines.append(line)

        return self.lines_to_hexagram_number(changed_lines)

    def perform_reading(
        self,
        question: Optional[str] = None,
        method: str = "coins"
    ) -> Dict[str, Any]:
        """
        Perform a complete I-Ching reading.

        Args:
            question: The question being asked
            method: "coins" or "yarrow"

        Returns:
            Complete reading with hexagram(s) and interpretation
        """
        # Cast the lines
        if method == "yarrow":
            lines = self.cast_yarrow_stalks()
        else:
            lines = self.cast_coins()

        # Get primary hexagram
        primary_number = self.lines_to_hexagram_number(lines)
        primary = self.get_hexagram(primary_number)

        # Check for changing lines
        changing_lines = [i + 1 for i, line in enumerate(lines) if line in [6, 9]]
        relating_number = self.get_changing_hexagram(lines)
        relating = self.get_hexagram(relating_number) if relating_number else None

        # Build line descriptions
        line_info = []
        for i, line in enumerate(lines):
            line_type = "changing yang" if line == 9 else "changing yin" if line == 6 else "yang" if line == 7 else "yin"
            line_info.append({
                "position": i + 1,
                "value": line,
                "type": line_type,
                "changing": line in [6, 9]
            })

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "question": question,
            "method": method,
            "lines": line_info,
            "primary_hexagram": {
                "number": primary_number,
                **primary
            } if primary else None,
            "changing_lines": changing_lines,
            "relating_hexagram": {
                "number": relating_number,
                **relating
            } if relating else None,
            "interpretation": self._generate_interpretation(primary, relating, changing_lines)
        }

    def _generate_interpretation(
        self,
        primary: Optional[Dict],
        relating: Optional[Dict],
        changing_lines: List[int]
    ) -> str:
        """Generate an interpretation of the reading"""
        if not primary:
            return "Unable to interpret the reading."

        parts = []

        # Primary hexagram interpretation
        parts.append(f"The primary hexagram is {primary['english']} ({primary['name']}).")
        parts.append(primary.get('meaning', ''))

        if changing_lines:
            parts.append(f"Changing lines in positions {', '.join(map(str, changing_lines))} indicate transformation.")

            if relating:
                parts.append(f"The situation is evolving toward {relating['english']} ({relating['name']}).")
                parts.append(relating.get('meaning', ''))

        return " ".join(parts)


# Singleton instance
_iching_service: Optional[IChingService] = None


def get_iching_service() -> IChingService:
    """Get or create the I-Ching service instance"""
    global _iching_service
    if _iching_service is None:
        _iching_service = IChingService()
    return _iching_service
