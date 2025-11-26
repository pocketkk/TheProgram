"""
Tarot Service

Provides Tarot card data, spread layouts, meanings, and reading generation.
Part of Phase 3: Multi-Paradigm Integration
"""
import random
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum


class TarotSuit(str, Enum):
    MAJOR = "major"
    WANDS = "wands"
    CUPS = "cups"
    SWORDS = "swords"
    PENTACLES = "pentacles"


# Major Arcana cards (0-21)
MAJOR_ARCANA = [
    {"number": 0, "name": "The Fool", "keywords": ["beginnings", "innocence", "spontaneity", "free spirit"],
     "upright": "New beginnings, innocence, spontaneity, a free spirit",
     "reversed": "Holding back, recklessness, risk-taking"},
    {"number": 1, "name": "The Magician", "keywords": ["manifestation", "resourcefulness", "power", "inspired action"],
     "upright": "Manifestation, resourcefulness, power, inspired action",
     "reversed": "Manipulation, poor planning, untapped talents"},
    {"number": 2, "name": "The High Priestess", "keywords": ["intuition", "mystery", "subconscious", "inner voice"],
     "upright": "Intuition, sacred knowledge, divine feminine, the subconscious mind",
     "reversed": "Secrets, disconnected from intuition, withdrawal and silence"},
    {"number": 3, "name": "The Empress", "keywords": ["femininity", "beauty", "nature", "abundance"],
     "upright": "Femininity, beauty, nature, nurturing, abundance",
     "reversed": "Creative block, dependence on others"},
    {"number": 4, "name": "The Emperor", "keywords": ["authority", "structure", "control", "fatherhood"],
     "upright": "Authority, establishment, structure, a father figure",
     "reversed": "Domination, excessive control, lack of discipline, inflexibility"},
    {"number": 5, "name": "The Hierophant", "keywords": ["tradition", "conformity", "morality", "ethics"],
     "upright": "Spiritual wisdom, religious beliefs, conformity, tradition",
     "reversed": "Personal beliefs, freedom, challenging the status quo"},
    {"number": 6, "name": "The Lovers", "keywords": ["love", "harmony", "relationships", "choices"],
     "upright": "Love, harmony, relationships, values alignment, choices",
     "reversed": "Self-love, disharmony, imbalance, misalignment of values"},
    {"number": 7, "name": "The Chariot", "keywords": ["control", "willpower", "success", "determination"],
     "upright": "Control, willpower, success, action, determination",
     "reversed": "Self-discipline, opposition, lack of direction"},
    {"number": 8, "name": "Strength", "keywords": ["courage", "patience", "compassion", "inner strength"],
     "upright": "Courage, bravery, confidence, compassion",
     "reversed": "Self-doubt, weakness, insecurity"},
    {"number": 9, "name": "The Hermit", "keywords": ["introspection", "solitude", "guidance", "inner wisdom"],
     "upright": "Soul-searching, introspection, being alone, inner guidance",
     "reversed": "Isolation, loneliness, withdrawal"},
    {"number": 10, "name": "Wheel of Fortune", "keywords": ["change", "cycles", "fate", "turning points"],
     "upright": "Good luck, karma, life cycles, destiny, a turning point",
     "reversed": "Bad luck, resistance to change, breaking cycles"},
    {"number": 11, "name": "Justice", "keywords": ["fairness", "truth", "cause and effect", "law"],
     "upright": "Justice, fairness, truth, cause and effect, law",
     "reversed": "Unfairness, lack of accountability, dishonesty"},
    {"number": 12, "name": "The Hanged Man", "keywords": ["surrender", "letting go", "new perspectives", "sacrifice"],
     "upright": "Pause, surrender, letting go, new perspectives",
     "reversed": "Delays, resistance, stalling, indecision"},
    {"number": 13, "name": "Death", "keywords": ["endings", "change", "transformation", "transition"],
     "upright": "Endings, change, transformation, transition",
     "reversed": "Resistance to change, personal transformation, inner purging"},
    {"number": 14, "name": "Temperance", "keywords": ["balance", "moderation", "patience", "purpose"],
     "upright": "Balance, moderation, patience, purpose",
     "reversed": "Imbalance, excess, self-healing, re-alignment"},
    {"number": 15, "name": "The Devil", "keywords": ["shadow self", "attachment", "addiction", "materialism"],
     "upright": "Shadow self, attachment, addiction, restriction, sexuality",
     "reversed": "Releasing limiting beliefs, exploring dark thoughts, detachment"},
    {"number": 16, "name": "The Tower", "keywords": ["sudden change", "upheaval", "chaos", "revelation"],
     "upright": "Sudden change, upheaval, chaos, revelation, awakening",
     "reversed": "Personal transformation, fear of change, averting disaster"},
    {"number": 17, "name": "The Star", "keywords": ["hope", "faith", "purpose", "renewal"],
     "upright": "Hope, faith, purpose, renewal, spirituality",
     "reversed": "Lack of faith, despair, self-trust, disconnection"},
    {"number": 18, "name": "The Moon", "keywords": ["illusion", "fear", "anxiety", "subconscious"],
     "upright": "Illusion, fear, anxiety, subconscious, intuition",
     "reversed": "Release of fear, repressed emotion, inner confusion"},
    {"number": 19, "name": "The Sun", "keywords": ["positivity", "success", "joy", "vitality"],
     "upright": "Positivity, fun, warmth, success, vitality",
     "reversed": "Inner child, feeling down, overly optimistic"},
    {"number": 20, "name": "Judgement", "keywords": ["reflection", "reckoning", "awakening", "rebirth"],
     "upright": "Reflection, reckoning, awakening, rebirth, inner calling",
     "reversed": "Self-doubt, inner critic, ignoring the call"},
    {"number": 21, "name": "The World", "keywords": ["completion", "accomplishment", "travel", "integration"],
     "upright": "Completion, integration, accomplishment, travel",
     "reversed": "Seeking personal closure, short-cuts, delays"}
]

# Minor Arcana court cards and number cards
COURT_CARDS = ["Page", "Knight", "Queen", "King"]
NUMBER_CARDS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"]

# Suit meanings and associations
SUIT_MEANINGS = {
    "wands": {
        "element": "Fire",
        "keywords": ["creativity", "passion", "energy", "ambition", "growth"],
        "domain": "Career, creativity, spiritual growth"
    },
    "cups": {
        "element": "Water",
        "keywords": ["emotions", "relationships", "intuition", "love", "feelings"],
        "domain": "Emotions, relationships, creativity"
    },
    "swords": {
        "element": "Air",
        "keywords": ["intellect", "conflict", "communication", "truth", "clarity"],
        "domain": "Thoughts, communication, conflicts"
    },
    "pentacles": {
        "element": "Earth",
        "keywords": ["material", "finances", "health", "work", "practical"],
        "domain": "Career, finances, physical health"
    }
}

# Common Tarot spreads
TAROT_SPREADS = {
    "single": {
        "name": "Single Card",
        "description": "A single card draw for daily guidance or quick insight",
        "positions": [
            {"position": 1, "name": "The Card", "meaning": "The message or energy for you right now"}
        ]
    },
    "three_card": {
        "name": "Three Card Spread",
        "description": "Past, Present, Future - A classic spread for understanding a situation",
        "positions": [
            {"position": 1, "name": "Past", "meaning": "What led to the current situation"},
            {"position": 2, "name": "Present", "meaning": "The current situation or challenge"},
            {"position": 3, "name": "Future", "meaning": "The likely outcome or advice"}
        ]
    },
    "celtic_cross": {
        "name": "Celtic Cross",
        "description": "A comprehensive spread for deep exploration of a situation",
        "positions": [
            {"position": 1, "name": "Present", "meaning": "Your current situation"},
            {"position": 2, "name": "Challenge", "meaning": "The immediate challenge or obstacle"},
            {"position": 3, "name": "Past", "meaning": "The foundation, what led to this"},
            {"position": 4, "name": "Future", "meaning": "The near future"},
            {"position": 5, "name": "Above", "meaning": "Your goal or best outcome"},
            {"position": 6, "name": "Below", "meaning": "Subconscious influences"},
            {"position": 7, "name": "Advice", "meaning": "Suggested approach"},
            {"position": 8, "name": "External", "meaning": "External influences"},
            {"position": 9, "name": "Hopes/Fears", "meaning": "Your hopes or fears"},
            {"position": 10, "name": "Outcome", "meaning": "The likely final outcome"}
        ]
    },
    "relationship": {
        "name": "Relationship Spread",
        "description": "Understanding the dynamics between two people",
        "positions": [
            {"position": 1, "name": "You", "meaning": "How you show up in the relationship"},
            {"position": 2, "name": "Partner", "meaning": "How the other person shows up"},
            {"position": 3, "name": "Connection", "meaning": "The nature of your bond"},
            {"position": 4, "name": "Strength", "meaning": "What strengthens the relationship"},
            {"position": 5, "name": "Challenge", "meaning": "What challenges the relationship"},
            {"position": 6, "name": "Advice", "meaning": "Guidance for the relationship"}
        ]
    },
    "decision": {
        "name": "Decision Spread",
        "description": "Help with making a choice between two options",
        "positions": [
            {"position": 1, "name": "The Situation", "meaning": "The core of the decision"},
            {"position": 2, "name": "Option A", "meaning": "First option"},
            {"position": 3, "name": "Option B", "meaning": "Second option"},
            {"position": 4, "name": "Outcome A", "meaning": "Likely outcome of Option A"},
            {"position": 5, "name": "Outcome B", "meaning": "Likely outcome of Option B"},
            {"position": 6, "name": "Advice", "meaning": "Guidance for the decision"}
        ]
    }
}


class TarotService:
    """Service for Tarot card readings and interpretations"""

    def __init__(self):
        self.deck = self._build_deck()

    def _build_deck(self) -> List[Dict[str, Any]]:
        """Build the complete 78-card Tarot deck"""
        deck = []

        # Add Major Arcana
        for card in MAJOR_ARCANA:
            deck.append({
                "id": f"major_{card['number']}",
                "name": card["name"],
                "number": card["number"],
                "suit": "major",
                "keywords": card["keywords"],
                "upright_meaning": card["upright"],
                "reversed_meaning": card["reversed"]
            })

        # Add Minor Arcana
        for suit in ["wands", "cups", "swords", "pentacles"]:
            # Number cards (Ace through Ten)
            for i, name in enumerate(NUMBER_CARDS):
                card_num = i + 1
                deck.append({
                    "id": f"{suit}_{card_num}",
                    "name": f"{name} of {suit.title()}",
                    "number": card_num,
                    "suit": suit,
                    "keywords": self._get_number_keywords(card_num, suit),
                    "upright_meaning": self._get_minor_meaning(name, suit, False),
                    "reversed_meaning": self._get_minor_meaning(name, suit, True)
                })

            # Court cards
            for i, court in enumerate(COURT_CARDS):
                card_num = 11 + i
                deck.append({
                    "id": f"{suit}_{court.lower()}",
                    "name": f"{court} of {suit.title()}",
                    "number": card_num,
                    "suit": suit,
                    "keywords": self._get_court_keywords(court, suit),
                    "upright_meaning": self._get_court_meaning(court, suit, False),
                    "reversed_meaning": self._get_court_meaning(court, suit, True)
                })

        return deck

    def _get_number_keywords(self, number: int, suit: str) -> List[str]:
        """Get keywords for number cards based on numerology and suit"""
        number_keywords = {
            1: ["beginnings", "potential", "opportunity"],
            2: ["balance", "partnership", "duality"],
            3: ["creativity", "growth", "expression"],
            4: ["stability", "foundation", "structure"],
            5: ["change", "conflict", "challenge"],
            6: ["harmony", "cooperation", "responsibility"],
            7: ["reflection", "assessment", "wisdom"],
            8: ["mastery", "achievement", "power"],
            9: ["completion", "fulfillment", "wisdom"],
            10: ["culmination", "endings", "legacy"]
        }
        base = number_keywords.get(number, [])
        return base + SUIT_MEANINGS[suit]["keywords"][:2]

    def _get_court_keywords(self, court: str, suit: str) -> List[str]:
        """Get keywords for court cards"""
        court_keywords = {
            "Page": ["messages", "new beginnings", "curiosity", "learning"],
            "Knight": ["action", "adventure", "pursuit", "movement"],
            "Queen": ["nurturing", "creativity", "intuition", "mastery"],
            "King": ["authority", "mastery", "leadership", "experience"]
        }
        return court_keywords.get(court, []) + [SUIT_MEANINGS[suit]["element"].lower()]

    def _get_minor_meaning(self, card_name: str, suit: str, reversed: bool) -> str:
        """Generate meaning for minor arcana number cards"""
        element = SUIT_MEANINGS[suit]["element"]
        domain = SUIT_MEANINGS[suit]["domain"]

        if reversed:
            return f"Blocked {element.lower()} energy in {domain.lower()}. Internal challenges to overcome."
        return f"{element} energy manifesting in {domain.lower()}. Positive movement and progress."

    def _get_court_meaning(self, court: str, suit: str, reversed: bool) -> str:
        """Generate meaning for court cards"""
        element = SUIT_MEANINGS[suit]["element"]

        court_traits = {
            "Page": "youthful energy and messages",
            "Knight": "action and pursuit",
            "Queen": "nurturing mastery",
            "King": "authoritative wisdom"
        }

        trait = court_traits.get(court, "energy")

        if reversed:
            return f"Blocked or immature expression of {element.lower()} {trait}."
        return f"Positive expression of {element.lower()} {trait}."

    def get_deck(self) -> List[Dict[str, Any]]:
        """Get the full deck"""
        return self.deck

    def get_card_by_id(self, card_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific card by ID"""
        for card in self.deck:
            if card["id"] == card_id:
                return card
        return None

    def get_spreads(self) -> Dict[str, Any]:
        """Get available spreads"""
        return TAROT_SPREADS

    def get_spread(self, spread_type: str) -> Optional[Dict[str, Any]]:
        """Get a specific spread configuration"""
        return TAROT_SPREADS.get(spread_type)

    def draw_cards(self, count: int = 1, allow_reversed: bool = True) -> List[Dict[str, Any]]:
        """Draw random cards from the deck"""
        drawn = random.sample(self.deck, min(count, len(self.deck)))

        result = []
        for card in drawn:
            card_copy = card.copy()
            card_copy["reversed"] = allow_reversed and random.choice([True, False])
            result.append(card_copy)

        return result

    def perform_reading(
        self,
        spread_type: str = "three_card",
        question: Optional[str] = None,
        allow_reversed: bool = True
    ) -> Dict[str, Any]:
        """Perform a complete Tarot reading"""
        spread = self.get_spread(spread_type)
        if not spread:
            raise ValueError(f"Unknown spread type: {spread_type}")

        num_cards = len(spread["positions"])
        cards = self.draw_cards(num_cards, allow_reversed)

        positions = []
        for i, pos in enumerate(spread["positions"]):
            card = cards[i]
            positions.append({
                "position": pos["position"],
                "position_name": pos["name"],
                "position_meaning": pos["meaning"],
                "card": card,
                "interpretation": self._interpret_card_in_position(card, pos)
            })

        return {
            "spread_type": spread_type,
            "spread_name": spread["name"],
            "question": question,
            "timestamp": datetime.utcnow().isoformat(),
            "positions": positions,
            "summary": self._generate_reading_summary(positions, question)
        }

    def _interpret_card_in_position(self, card: Dict[str, Any], position: Dict[str, Any]) -> str:
        """Generate interpretation for a card in a specific position"""
        meaning = card["reversed_meaning"] if card.get("reversed") else card["upright_meaning"]
        orientation = "reversed" if card.get("reversed") else "upright"

        return (
            f"{card['name']} ({orientation}) in the {position['name']} position suggests: "
            f"{meaning}. Consider how this relates to {position['meaning'].lower()}."
        )

    def _generate_reading_summary(self, positions: List[Dict], question: Optional[str]) -> str:
        """Generate an overall summary of the reading"""
        major_count = sum(1 for p in positions if p["card"]["suit"] == "major")
        reversed_count = sum(1 for p in positions if p["card"].get("reversed"))

        # Analyze suit distribution
        suits = {}
        for p in positions:
            suit = p["card"]["suit"]
            suits[suit] = suits.get(suit, 0) + 1

        dominant_suit = max(suits.items(), key=lambda x: x[1])[0] if suits else None

        summary_parts = []

        if major_count >= len(positions) / 2:
            summary_parts.append("This reading contains significant Major Arcana energy, indicating important life themes and destiny at play.")

        if reversed_count >= len(positions) / 2:
            summary_parts.append("Multiple reversed cards suggest internal work, blocked energy, or the need for introspection.")

        if dominant_suit and dominant_suit != "major":
            element = SUIT_MEANINGS[dominant_suit]["element"]
            domain = SUIT_MEANINGS[dominant_suit]["domain"]
            summary_parts.append(f"The {element} element (through {dominant_suit.title()}) is prominent, focusing on {domain.lower()}.")

        if not summary_parts:
            summary_parts.append("A balanced reading with diverse energies at play. Consider each card's message in context.")

        return " ".join(summary_parts)


# Singleton instance
_tarot_service: Optional[TarotService] = None


def get_tarot_service() -> TarotService:
    """Get or create the Tarot service instance"""
    global _tarot_service
    if _tarot_service is None:
        _tarot_service = TarotService()
    return _tarot_service
