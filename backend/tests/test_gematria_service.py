"""
Tests for Gematria Service

Tests gematria calculations across multiple cipher systems.
"""
import pytest
from app.services.gematria_service import GematriaService, get_gematria_service


class TestGematriaService:
    """Test suite for GematriaService."""

    @pytest.fixture
    def service(self):
        """Create a fresh service instance for each test."""
        return GematriaService()

    # =========================================================================
    # Hebrew Gematria Tests
    # =========================================================================

    def test_hebrew_simple_letters(self, service):
        """Test basic Hebrew letter values."""
        # Aleph = 1
        result = service.calculate_hebrew("א")
        assert result["value"] == 1
        assert result["letter_count"] == 1

        # Bet = 2
        result = service.calculate_hebrew("ב")
        assert result["value"] == 2

        # Tav = 400
        result = service.calculate_hebrew("ת")
        assert result["value"] == 400

    def test_hebrew_ahavah_love(self, service):
        """Test אהבה (Ahavah/Love) = 13."""
        # א(1) + ה(5) + ב(2) + ה(5) = 13
        result = service.calculate_hebrew("אהבה")
        assert result["value"] == 13
        assert result["letter_count"] == 4

    def test_hebrew_echad_one(self, service):
        """Test אחד (Echad/One) = 13."""
        # א(1) + ח(8) + ד(4) = 13
        result = service.calculate_hebrew("אחד")
        assert result["value"] == 13

    def test_hebrew_chai_life(self, service):
        """Test חי (Chai/Life) = 18."""
        # ח(8) + י(10) = 18
        result = service.calculate_hebrew("חי")
        assert result["value"] == 18

    def test_hebrew_yhvh(self, service):
        """Test יהוה (YHVH) = 26."""
        # י(10) + ה(5) + ו(6) + ה(5) = 26
        result = service.calculate_hebrew("יהוה")
        assert result["value"] == 26

    def test_hebrew_elohim(self, service):
        """Test אלהים (Elohim) = 86."""
        # א(1) + ל(30) + ה(5) + י(10) + ם(40) = 86
        result = service.calculate_hebrew("אלהים")
        assert result["value"] == 86

    def test_hebrew_final_forms(self, service):
        """Test final letter forms have same value as regular forms."""
        # Final Mem (ם) = 40, same as regular Mem (מ)
        result = service.calculate_hebrew("שלום")  # Shalom with final mem
        # ש(300) + ל(30) + ו(6) + ם(40) = 376
        assert result["value"] == 376

    def test_hebrew_ignores_non_hebrew(self, service):
        """Test that non-Hebrew characters are ignored."""
        result = service.calculate_hebrew("חי123abc")
        assert result["value"] == 18  # Only חי counted
        assert result["letter_count"] == 2

    def test_hebrew_breakdown(self, service):
        """Test that breakdown is returned correctly."""
        result = service.calculate_hebrew("חי")
        assert len(result["breakdown"]) == 2
        assert result["breakdown"][0] == {"letter": "ח", "value": 8}
        assert result["breakdown"][1] == {"letter": "י", "value": 10}

    # =========================================================================
    # English Ordinal Tests
    # =========================================================================

    def test_english_ordinal_simple(self, service):
        """Test basic English ordinal values."""
        result = service.calculate_english_ordinal("A")
        assert result["value"] == 1

        result = service.calculate_english_ordinal("Z")
        assert result["value"] == 26

    def test_english_ordinal_love(self, service):
        """Test 'Love' in English ordinal."""
        # L(12) + O(15) + V(22) + E(5) = 54
        result = service.calculate_english_ordinal("Love")
        assert result["value"] == 54

    def test_english_ordinal_god(self, service):
        """Test 'God' in English ordinal."""
        # G(7) + O(15) + D(4) = 26 (same as YHVH!)
        result = service.calculate_english_ordinal("God")
        assert result["value"] == 26

    def test_english_ordinal_case_insensitive(self, service):
        """Test that calculation is case-insensitive."""
        result1 = service.calculate_english_ordinal("LOVE")
        result2 = service.calculate_english_ordinal("love")
        result3 = service.calculate_english_ordinal("LoVe")
        assert result1["value"] == result2["value"] == result3["value"]

    def test_english_ordinal_ignores_non_letters(self, service):
        """Test that non-letters are ignored."""
        result = service.calculate_english_ordinal("Love 123!")
        assert result["value"] == 54  # Only "Love" counted
        assert result["letter_count"] == 4

    # =========================================================================
    # English Reduction Tests
    # =========================================================================

    def test_english_reduction_simple(self, service):
        """Test English reduction values."""
        result = service.calculate_english_reduction("A")
        assert result["value"] == 1
        assert result["final_reduction"] == 1

        # K = 11 -> 1+1 = 2
        result = service.calculate_english_reduction("K")
        assert result["value"] == 2  # Already reduced per letter

    def test_english_reduction_total(self, service):
        """Test that total is sum of reduced values."""
        # LOVE: L(3) + O(6) + V(4) + E(5) = 18
        result = service.calculate_english_reduction("Love")
        assert result["final_reduction"] == 9  # 1+8=9

    # =========================================================================
    # Transliteration Tests
    # =========================================================================

    def test_transliteration_basic(self, service):
        """Test basic English to Hebrew transliteration."""
        result = service.transliterate("David")
        # "David" -> "da" + "v" + "i" + "d" -> ד + א + ו + י + ד
        assert result["hebrew_text"] == "דאויד"
        # ד(4) + א(1) + ו(6) + י(10) + ד(4) = 25
        assert result["value"] == 25

    def test_transliteration_digraphs(self, service):
        """Test multi-character combinations."""
        # 'ch' -> ח
        result = service.transliterate("chai")
        assert "ח" in result["hebrew_text"]

        # 'sh' -> ש
        result = service.transliterate("shalom")
        assert "ש" in result["hebrew_text"]

    def test_transliteration_complex(self, service):
        """Test more complex transliteration."""
        result = service.transliterate("Abraham")
        # Should have Hebrew letters
        assert len(result["hebrew_text"]) > 0
        assert result["value"] > 0

    # =========================================================================
    # Calculate All Tests
    # =========================================================================

    def test_calculate_all_english(self, service):
        """Test calculate_all with English text."""
        result = service.calculate_all("Love")
        assert "systems" in result
        assert "english_ordinal" in result["systems"]
        assert "english_reduction" in result["systems"]
        assert "transliteration" in result["systems"]

    def test_calculate_all_hebrew(self, service):
        """Test calculate_all with Hebrew text."""
        result = service.calculate_all("אהבה")
        assert "systems" in result
        assert "hebrew" in result["systems"]

    def test_calculate_all_mixed(self, service):
        """Test calculate_all with mixed text."""
        result = service.calculate_all("אהבה Love")
        assert "systems" in result
        # Should detect both Hebrew and English
        assert "hebrew" in result["systems"]
        assert "english_ordinal" in result["systems"]

    # =========================================================================
    # Number Meanings Tests
    # =========================================================================

    def test_get_meaning_exists(self, service):
        """Test getting meaning for known numbers."""
        meaning = service.get_number_meaning(13)
        assert meaning is not None
        assert meaning["name"] == "Love/Unity"
        assert "keywords" in meaning

    def test_get_meaning_not_exists(self, service):
        """Test getting meaning for unknown number."""
        meaning = service.get_number_meaning(999)
        assert meaning is None

    def test_get_all_meanings(self, service):
        """Test getting all meanings."""
        meanings = service.get_all_meanings()
        assert len(meanings) > 0
        assert 13 in meanings
        assert 18 in meanings
        assert 26 in meanings

    # =========================================================================
    # Equivalences Tests
    # =========================================================================

    def test_find_equivalences_hebrew(self, service):
        """Test finding Hebrew equivalences."""
        equivalences = service.find_equivalences(13, "hebrew")
        # Should include אהבה (Love) and אחד (One)
        words = [e["word"] for e in equivalences]
        assert "אהבה" in words or "אחד" in words

    def test_find_equivalences_english(self, service):
        """Test finding English equivalences."""
        equivalences = service.find_equivalences(54, "english")
        # May or may not have words depending on database
        assert isinstance(equivalences, list)

    def test_find_equivalences_limit(self, service):
        """Test that limit is respected."""
        equivalences = service.find_equivalences(13, "hebrew", limit=1)
        assert len(equivalences) <= 1

    def test_find_equivalences_not_found(self, service):
        """Test behavior when no equivalences exist."""
        equivalences = service.find_equivalences(99999, "hebrew")
        assert equivalences == []

    # =========================================================================
    # Analyze Name Tests
    # =========================================================================

    def test_analyze_name(self, service):
        """Test comprehensive name analysis."""
        result = service.analyze_name("Love")
        assert "original_text" in result
        assert "systems" in result
        assert len(result["systems"]) > 0

        # Check that equivalences are added
        for system_result in result["systems"].values():
            assert "equivalences" in system_result

    # =========================================================================
    # Singleton Tests
    # =========================================================================

    def test_singleton(self):
        """Test that get_gematria_service returns singleton."""
        service1 = get_gematria_service()
        service2 = get_gematria_service()
        assert service1 is service2


class TestGematriaKnownValues:
    """Test known gematria values from tradition."""

    @pytest.fixture
    def service(self):
        return GematriaService()

    @pytest.mark.parametrize("hebrew,expected", [
        ("אהבה", 13),   # Ahavah (Love)
        ("אחד", 13),    # Echad (One)
        ("חי", 18),     # Chai (Life)
        ("יהוה", 26),   # YHVH (God)
        ("אלהים", 86),  # Elohim (God)
        ("אמן", 91),    # Amen
        ("טוב", 17),    # Tov (Good)
    ])
    def test_known_hebrew_values(self, service, hebrew, expected):
        """Test traditional Hebrew gematria values."""
        result = service.calculate_hebrew(hebrew)
        assert result["value"] == expected, f"{hebrew} should equal {expected}"

    @pytest.mark.parametrize("english,expected", [
        ("God", 26),
        ("A", 1),
        ("Z", 26),
    ])
    def test_known_english_values(self, service, english, expected):
        """Test English ordinal values."""
        result = service.calculate_english_ordinal(english)
        assert result["value"] == expected
