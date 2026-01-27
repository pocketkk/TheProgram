"""
Gematria Service

Provides gematria calculations across multiple systems:
- Hebrew (Traditional Kabbalistic)
- English Ordinal (A=1, B=2...Z=26)
- English Reduction (reduced to single digit)
- Transliteration (English to Hebrew phonetics)

Unlike numerology which reduces to single digits, gematria preserves
full numeric values to discover equivalences between words.
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from functools import lru_cache


class GematriaService:
    """
    Gematria calculation service.

    Calculates numeric values for text using various cipher systems,
    finds words with equivalent values, and provides spiritual meanings.
    """

    # Hebrew letter values (standard gematria)
    HEBREW_VALUES: Dict[str, int] = {
        # Regular letters
        'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
        'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
        'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
        # Final forms (sofit) - same value as regular forms
        'ך': 20, 'ם': 40, 'ן': 50, 'ף': 80, 'ץ': 90,
    }

    # English ordinal values (A=1, B=2...Z=26)
    ENGLISH_VALUES: Dict[str, int] = {
        chr(i): i - ord('a') + 1 for i in range(ord('a'), ord('z') + 1)
    }

    # English to Hebrew transliteration (phonetic approximation)
    ENGLISH_TO_HEBREW: Dict[str, str] = {
        # Multi-letter combinations first (order matters for replacement)
        'ch': 'ח', 'sh': 'ש', 'th': 'ת', 'tz': 'צ', 'ts': 'צ',
        'ph': 'פ', 'kh': 'כ', 'gh': 'ג',
        # Single letters
        'a': 'א', 'b': 'ב', 'c': 'כ', 'd': 'ד', 'e': 'א', 'f': 'פ',
        'g': 'ג', 'h': 'ה', 'i': 'י', 'j': 'י', 'k': 'כ', 'l': 'ל',
        'm': 'מ', 'n': 'נ', 'o': 'ו', 'p': 'פ', 'q': 'ק', 'r': 'ר',
        's': 'ס', 't': 'ת', 'u': 'ו', 'v': 'ו', 'w': 'ו', 'x': 'כס',
        'y': 'י', 'z': 'ז',
    }

    # Gematria-specific number meanings (different from numerology)
    NUMBER_MEANINGS: Dict[int, Dict[str, Any]] = {
        1: {
            "name": "Unity",
            "meaning": "The number of God's absolute unity and the beginning of all things.",
            "keywords": ["unity", "beginning", "divine source"],
            "hebrew_connection": "Aleph (א) - the first letter, breath of God"
        },
        7: {
            "name": "Completion",
            "meaning": "Divine completion, the days of creation, spiritual perfection.",
            "keywords": ["completion", "perfection", "rest"],
            "hebrew_connection": "Seven days of creation, Shabbat"
        },
        10: {
            "name": "Divine Order",
            "meaning": "The ten sefirot, completeness of divine emanation.",
            "keywords": ["sefirot", "completeness", "divine structure"],
            "hebrew_connection": "Yod (י) - smallest letter, spark of creation"
        },
        12: {
            "name": "Governance",
            "meaning": "The twelve tribes, zodiac signs, months - divine governance of time and people.",
            "keywords": ["tribes", "months", "governance"],
            "hebrew_connection": "Twelve tribes of Israel"
        },
        13: {
            "name": "Love/Unity",
            "meaning": "The gematria of both 'love' (אהבה - Ahavah) and 'one' (אחד - Echad), showing that love leads to unity.",
            "keywords": ["love", "unity", "oneness"],
            "hebrew_connection": "אהבה (Ahavah/Love) = אחד (Echad/One) = 13"
        },
        18: {
            "name": "Life",
            "meaning": "The gematria of 'life' (חי - Chai). Gifts are traditionally given in multiples of 18.",
            "keywords": ["life", "vitality", "blessing"],
            "hebrew_connection": "חי (Chai/Life) = 18"
        },
        22: {
            "name": "Letters of Creation",
            "meaning": "The 22 letters of the Hebrew alphabet through which the world was created.",
            "keywords": ["creation", "language", "divine speech"],
            "hebrew_connection": "22 Hebrew letters"
        },
        26: {
            "name": "Divine Name",
            "meaning": "The gematria of the Tetragrammaton (YHVH - יהוה), the ineffable name of God.",
            "keywords": ["YHVH", "divine name", "sacred"],
            "hebrew_connection": "יהוה = 10 + 5 + 6 + 5 = 26"
        },
        32: {
            "name": "Paths of Wisdom",
            "meaning": "The 32 paths of wisdom (22 letters + 10 sefirot) in Kabbalistic tradition.",
            "keywords": ["wisdom", "paths", "kabbalah"],
            "hebrew_connection": "לב (Lev/Heart) = 32"
        },
        36: {
            "name": "Double Life",
            "meaning": "Twice chai (18×2), a traditional amount for charitable giving. Also the 36 hidden righteous ones.",
            "keywords": ["charity", "righteousness", "hidden saints"],
            "hebrew_connection": "Lamed-Vav Tzadikim (36 hidden righteous)"
        },
        40: {
            "name": "Transformation",
            "meaning": "The number of transformation - 40 days of flood, 40 years in wilderness, 40 days on Sinai.",
            "keywords": ["transformation", "testing", "purification"],
            "hebrew_connection": "Mem (מ) = 40, waters of transformation"
        },
        50: {
            "name": "Freedom/Gates",
            "meaning": "The 50 gates of understanding, Jubilee year of freedom.",
            "keywords": ["freedom", "understanding", "jubilee"],
            "hebrew_connection": "50th year Jubilee, 50 gates of Binah"
        },
        72: {
            "name": "Names of God",
            "meaning": "The 72 names of God derived from Exodus 14:19-21, powerful for meditation and prayer.",
            "keywords": ["divine names", "protection", "power"],
            "hebrew_connection": "72 three-letter names from Torah"
        },
        86: {
            "name": "Elohim",
            "meaning": "The gematria of Elohim (אלהים), God's name associated with creation and judgment.",
            "keywords": ["creation", "nature", "judgment"],
            "hebrew_connection": "אלהים (Elohim) = 86"
        },
        91: {
            "name": "Amen/Union",
            "meaning": "The gematria of Amen (אמן) and the union of YHVH (26) and Adonai (65).",
            "keywords": ["amen", "truth", "union"],
            "hebrew_connection": "אמן (Amen) = 91 = YHVH + Adonai"
        },
        137: {
            "name": "Kabbalah",
            "meaning": "The gematria of 'Kabbalah' (קבלה), meaning 'receiving'. Also significant in physics (fine structure constant).",
            "keywords": ["receiving", "tradition", "mysticism"],
            "hebrew_connection": "קבלה (Kabbalah/Receiving) = 137"
        },
        216: {
            "name": "Gevurah/Strength",
            "meaning": "6×6×6 = 216 letters in the 72 names of God. Associated with divine strength and judgment.",
            "keywords": ["strength", "judgment", "power"],
            "hebrew_connection": "216 letters in 72 names, גבורה (Gevurah)"
        },
        248: {
            "name": "Abraham/Positive Commands",
            "meaning": "The gematria of Abraham (אברהם) and the number of positive commandments in Torah.",
            "keywords": ["patriarch", "commandments", "doing"],
            "hebrew_connection": "אברהם (Abraham) = 248 positive mitzvot"
        },
        358: {
            "name": "Mashiach/Serpent",
            "meaning": "Both 'Messiah' (משיח) and 'serpent' (נחש) equal 358, showing transformation of evil to good.",
            "keywords": ["messiah", "transformation", "redemption"],
            "hebrew_connection": "משיח (Mashiach) = נחש (Nachash) = 358"
        },
        541: {
            "name": "Israel",
            "meaning": "The gematria of Israel (ישראל), meaning 'one who wrestles with God'.",
            "keywords": ["Israel", "struggle", "triumph"],
            "hebrew_connection": "ישראל (Israel) = 541"
        },
        613: {
            "name": "Commandments",
            "meaning": "The total number of commandments in the Torah (248 positive + 365 negative).",
            "keywords": ["Torah", "commandments", "divine law"],
            "hebrew_connection": "613 mitzvot in Torah"
        },
    }

    def __init__(self):
        self._words_db: Optional[Dict] = None

    @property
    def words_db(self) -> Dict:
        """Lazy load the words database."""
        if self._words_db is None:
            self._words_db = self._load_words_database()
        return self._words_db

    def _load_words_database(self) -> Dict:
        """Load the gematria words database from JSON file."""
        data_path = Path(__file__).parent.parent.parent / "data" / "gematria_words.json"
        try:
            with open(data_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            # Return empty structure if file doesn't exist yet
            return {"hebrew": {}, "english": {}}

    def calculate_hebrew(self, text: str) -> Dict[str, Any]:
        """
        Calculate Hebrew gematria value for text.

        Args:
            text: Hebrew text to calculate

        Returns:
            Dict with value, breakdown, and character count
        """
        breakdown = []
        total = 0

        for char in text:
            if char in self.HEBREW_VALUES:
                value = self.HEBREW_VALUES[char]
                breakdown.append({"letter": char, "value": value})
                total += value

        return {
            "value": total,
            "breakdown": breakdown,
            "letter_count": len(breakdown),
            "original_text": text,
            "system": "hebrew"
        }

    def calculate_english_ordinal(self, text: str) -> Dict[str, Any]:
        """
        Calculate English ordinal gematria (A=1, B=2...Z=26).

        Args:
            text: English text to calculate

        Returns:
            Dict with value, breakdown, and character count
        """
        breakdown = []
        total = 0
        text_lower = text.lower()

        for char in text_lower:
            if char in self.ENGLISH_VALUES:
                value = self.ENGLISH_VALUES[char]
                breakdown.append({"letter": char.upper(), "value": value})
                total += value

        return {
            "value": total,
            "breakdown": breakdown,
            "letter_count": len(breakdown),
            "original_text": text,
            "system": "english_ordinal"
        }

    def calculate_english_reduction(self, text: str) -> Dict[str, Any]:
        """
        Calculate English reduction gematria (each letter reduced to 1-9).

        Args:
            text: English text to calculate

        Returns:
            Dict with value, breakdown, and character count
        """
        breakdown = []
        total = 0
        text_lower = text.lower()

        for char in text_lower:
            if char in self.ENGLISH_VALUES:
                ordinal = self.ENGLISH_VALUES[char]
                # Reduce to single digit
                reduced = self._reduce_to_single_digit(ordinal)
                breakdown.append({
                    "letter": char.upper(),
                    "ordinal_value": ordinal,
                    "reduced_value": reduced
                })
                total += reduced

        # Optionally reduce the total as well
        final_reduction = self._reduce_to_single_digit(total)

        return {
            "value": total,
            "final_reduction": final_reduction,
            "breakdown": breakdown,
            "letter_count": len(breakdown),
            "original_text": text,
            "system": "english_reduction"
        }

    def _reduce_to_single_digit(self, number: int) -> int:
        """Reduce a number to a single digit (1-9)."""
        while number > 9:
            number = sum(int(d) for d in str(number))
        return number

    def transliterate(self, text: str) -> Dict[str, Any]:
        """
        Transliterate English text to approximate Hebrew letters.

        Args:
            text: English text to transliterate

        Returns:
            Dict with Hebrew transliteration and gematria value
        """
        text_lower = text.lower()
        hebrew_text = text_lower

        # Replace multi-character patterns first
        for eng, heb in sorted(self.ENGLISH_TO_HEBREW.items(), key=lambda x: -len(x[0])):
            hebrew_text = hebrew_text.replace(eng, heb)

        # Remove any remaining non-Hebrew characters
        hebrew_only = ''.join(c for c in hebrew_text if c in self.HEBREW_VALUES)

        # Calculate the Hebrew gematria
        hebrew_result = self.calculate_hebrew(hebrew_only)

        return {
            "original_text": text,
            "hebrew_text": hebrew_only,
            "value": hebrew_result["value"],
            "breakdown": hebrew_result["breakdown"],
            "letter_count": hebrew_result["letter_count"],
            "system": "transliteration"
        }

    def calculate_all(self, text: str) -> Dict[str, Any]:
        """
        Calculate gematria values across all applicable systems.

        Args:
            text: Text to analyze

        Returns:
            Dict with results from all systems
        """
        results = {
            "original_text": text,
            "systems": {}
        }

        # Check if text is primarily Hebrew or English
        hebrew_chars = sum(1 for c in text if c in self.HEBREW_VALUES)
        english_chars = sum(1 for c in text.lower() if c in self.ENGLISH_VALUES)

        if hebrew_chars > 0:
            results["systems"]["hebrew"] = self.calculate_hebrew(text)

        if english_chars > 0:
            results["systems"]["english_ordinal"] = self.calculate_english_ordinal(text)
            results["systems"]["english_reduction"] = self.calculate_english_reduction(text)
            results["systems"]["transliteration"] = self.transliterate(text)

        return results

    def find_equivalences(self, value: int, system: str = "hebrew", limit: int = 20) -> List[Dict[str, Any]]:
        """
        Find words with the same gematria value.

        Args:
            value: The gematria value to search for
            system: Which system to search ("hebrew" or "english")
            limit: Maximum number of results

        Returns:
            List of words with matching values
        """
        str_value = str(value)
        db_section = self.words_db.get(system, {})

        if str_value in db_section:
            words = db_section[str_value][:limit]
            return words

        return []

    def get_number_meaning(self, value: int) -> Optional[Dict[str, Any]]:
        """
        Get the spiritual/kabbalistic meaning for a number.

        Args:
            value: The number to look up

        Returns:
            Dict with meaning information or None
        """
        return self.NUMBER_MEANINGS.get(value)

    def get_all_meanings(self) -> Dict[int, Dict[str, Any]]:
        """Get all number meanings."""
        return self.NUMBER_MEANINGS.copy()

    def analyze_name(self, name: str) -> Dict[str, Any]:
        """
        Perform comprehensive gematria analysis on a name.

        Args:
            name: Name to analyze

        Returns:
            Dict with analysis across all systems plus equivalences
        """
        all_results = self.calculate_all(name)

        # Add equivalences for each system's value
        for system_name, system_result in all_results["systems"].items():
            value = system_result["value"]
            meaning = self.get_number_meaning(value)

            system_result["meaning"] = meaning
            system_result["equivalences"] = self.find_equivalences(
                value,
                "hebrew" if system_name in ["hebrew", "transliteration"] else "english",
                limit=10
            )

        return all_results


# Singleton instance
_gematria_service: Optional[GematriaService] = None


def get_gematria_service() -> GematriaService:
    """Get the singleton GematriaService instance."""
    global _gematria_service
    if _gematria_service is None:
        _gematria_service = GematriaService()
    return _gematria_service
