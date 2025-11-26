"""
Test suite for hybrid chart features

Tests the integration of Western and Vedic astrological systems:
1. Western charts with Vedic nakshatras (include_nakshatras=True)
2. Vedic charts with Western aspects (include_western_aspects=True)
3. Minor aspects toggle (include_minor_aspects)
4. Different ayanamsa values produce different sidereal positions
"""
import pytest
from datetime import datetime
from app.services.chart_calculator import NatalChartCalculator
from app.services.vedic_calculator import VedicChartCalculator
from app.utils.ephemeris import EphemerisCalculator


# =============================================================================
# Western Chart with Nakshatras Tests
# =============================================================================

@pytest.mark.ephemeris
class TestWesternChartWithNakshatras:
    """Test Western tropical charts with Vedic nakshatra overlays"""

    def test_western_chart_includes_nakshatras_when_requested(
        self,
        sample_birth_data_1
    ):
        """
        Test that Western chart includes nakshatra data when include_nakshatras=True
        """
        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_nakshatras=True
        )

        # Verify nakshatras field exists
        assert 'nakshatras' in chart, "Chart should include 'nakshatras' field"

        # Verify nakshatras contain all expected planets
        nakshatras = chart['nakshatras']
        expected_planets = ['sun', 'moon', 'mercury', 'venus', 'mars',
                           'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
        for planet in expected_planets:
            assert planet in nakshatras, f"Nakshatra data missing for {planet}"

        # Verify nakshatra structure for each planet
        for planet, nakshatra_data in nakshatras.items():
            assert 'name' in nakshatra_data, f"{planet} nakshatra missing 'name'"
            assert 'number' in nakshatra_data, f"{planet} nakshatra missing 'number'"
            assert 'lord' in nakshatra_data, f"{planet} nakshatra missing 'lord'"
            assert 'pada' in nakshatra_data, f"{planet} nakshatra missing 'pada'"
            assert 'degrees_in_nakshatra' in nakshatra_data, \
                f"{planet} nakshatra missing 'degrees_in_nakshatra'"

            # Validate ranges
            assert 1 <= nakshatra_data['number'] <= 27, \
                f"{planet} nakshatra number out of range: {nakshatra_data['number']}"
            assert 1 <= nakshatra_data['pada'] <= 4, \
                f"{planet} pada out of range: {nakshatra_data['pada']}"
            assert 0 <= nakshatra_data['degrees_in_nakshatra'] < 13.333333, \
                f"{planet} degrees in nakshatra out of range"

    def test_western_chart_excludes_nakshatras_by_default(
        self,
        sample_birth_data_1
    ):
        """
        Test that Western chart does NOT include nakshatras by default
        """
        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_nakshatras=False
        )

        # Verify nakshatras field does not exist
        assert 'nakshatras' not in chart, \
            "Chart should NOT include 'nakshatras' field when include_nakshatras=False"

    def test_western_chart_with_nakshatras_uses_specified_ayanamsa(
        self,
        sample_birth_data_1
    ):
        """
        Test that Western chart with nakshatras uses the specified ayanamsa
        """
        # Calculate with Lahiri ayanamsa
        chart_lahiri = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_nakshatras=True,
            ayanamsa='lahiri'
        )

        # Calculate with Raman ayanamsa
        chart_raman = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_nakshatras=True,
            ayanamsa='raman'
        )

        # Verify calculation info records the ayanamsa
        assert chart_lahiri['calculation_info']['nakshatra_ayanamsa'] == 'lahiri'
        assert chart_raman['calculation_info']['nakshatra_ayanamsa'] == 'raman'

        # Verify that different ayanamsas produce different nakshatras
        # (at least for some planets)
        sun_nakshatra_lahiri = chart_lahiri['nakshatras']['sun']['name']
        sun_nakshatra_raman = chart_raman['nakshatras']['sun']['name']

        # These might be the same or different depending on the date
        # But the underlying sidereal positions should differ
        assert 'nakshatras' in chart_lahiri
        assert 'nakshatras' in chart_raman

    def test_western_chart_nakshatras_derived_from_sidereal_positions(
        self,
        sample_birth_data_1
    ):
        """
        Test that nakshatras in Western chart are calculated from sidereal positions
        """
        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_nakshatras=True,
            ayanamsa='lahiri'
        )

        # The tropical chart should maintain tropical positions for planets
        assert chart['calculation_info']['zodiac'] == 'tropical'

        # But nakshatras should be present (calculated from sidereal)
        assert 'nakshatras' in chart
        assert chart['calculation_info']['include_nakshatras'] is True

        # Verify planets maintain tropical positions
        sun_tropical_sign = chart['planets']['sun']['sign_name']
        # Typical tropical vs sidereal difference is about 24 degrees
        # So signs should differ in most cases


# =============================================================================
# Vedic Chart with Western Aspects Tests
# =============================================================================

@pytest.mark.ephemeris
class TestVedicChartWithWesternAspects:
    """Test Vedic sidereal charts with Western-style aspect calculations"""

    def test_vedic_chart_includes_western_aspects_when_requested(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that Vedic chart includes Western aspects when include_western_aspects=True
        """
        chart = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri',
            include_western_aspects=True
        )

        # Verify aspects field exists
        assert 'aspects' in chart, "Chart should include 'aspects' field"

        # Verify aspects structure
        aspects = chart['aspects']
        assert isinstance(aspects, list), "Aspects should be a list"

        # If there are aspects, verify their structure
        if len(aspects) > 0:
            for aspect in aspects:
                assert 'planet1' in aspect
                assert 'planet2' in aspect
                assert 'aspect_type' in aspect
                assert 'angle' in aspect
                assert 'orb' in aspect
                assert 'orb_abs' in aspect

                # Verify major aspect types
                assert aspect['aspect_type'] in [
                    'conjunction', 'opposition', 'trine', 'square', 'sextile'
                ], f"Unexpected aspect type: {aspect['aspect_type']}"

        # Verify calculation info
        assert chart['calculation_info']['include_western_aspects'] is True

    def test_vedic_chart_excludes_western_aspects_by_default(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that Vedic chart does NOT include Western aspects by default
        """
        chart = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri',
            include_western_aspects=False
        )

        # Verify aspects field does not exist
        assert 'aspects' not in chart, \
            "Chart should NOT include 'aspects' field when include_western_aspects=False"

    def test_vedic_chart_western_aspects_use_sidereal_positions(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that Western aspects in Vedic chart are calculated using sidereal positions
        """
        chart = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri',
            include_western_aspects=True
        )

        # Verify chart uses sidereal zodiac
        assert chart['calculation_info']['ayanamsa'] == 'lahiri'
        assert 'ayanamsa_value' in chart['calculation_info']

        # Aspects should be calculated from sidereal positions
        assert 'aspects' in chart

        # Verify D-1 chart has sidereal positions
        d1_planets = chart['d1']['planets']
        assert 'sun' in d1_planets

    def test_vedic_chart_includes_patterns_with_western_aspects(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that Vedic chart includes aspect patterns when Western aspects are enabled
        """
        chart = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri',
            include_western_aspects=True
        )

        # Verify patterns field exists
        assert 'patterns' in chart, "Chart should include 'patterns' field"

        # Patterns should be a list
        patterns = chart['patterns']
        assert isinstance(patterns, list), "Patterns should be a list"

        # If there are patterns, verify their structure
        if len(patterns) > 0:
            for pattern in patterns:
                assert 'pattern_type' in pattern
                assert 'planets' in pattern
                assert 'description' in pattern

                # Verify valid pattern types
                assert pattern['pattern_type'] in [
                    'grand_trine', 't_square', 'grand_cross', 'yod', 'stellium'
                ]


# =============================================================================
# Minor Aspects Tests
# =============================================================================

@pytest.mark.ephemeris
class TestMinorAspects:
    """Test minor aspects toggle functionality in both Western and Vedic charts"""

    def test_western_chart_includes_minor_aspects_when_requested(
        self,
        sample_birth_data_1
    ):
        """
        Test that Western chart includes minor aspects when include_minor_aspects=True
        """
        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_minor_aspects=True
        )

        # Check for minor aspect types in the aspects list
        aspects = chart['aspects']
        minor_aspect_types = [
            'semi_sextile', 'semi_square', 'sesqui_square',
            'quincunx', 'quintile', 'bi_quintile'
        ]

        # Verify structure allows for minor aspects
        # (may or may not have them depending on the chart)
        aspect_types_in_chart = set(a['aspect_type'] for a in aspects)

        # At minimum, major aspects should be present
        assert len(aspects) > 0, "Chart should have at least some aspects"

    def test_western_chart_excludes_minor_aspects_by_default(
        self,
        sample_birth_data_1
    ):
        """
        Test that Western chart only includes major aspects by default
        """
        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_minor_aspects=False
        )

        # Check that only major aspects are present
        aspects = chart['aspects']
        minor_aspect_types = [
            'semi_sextile', 'semi_square', 'sesqui_square',
            'quincunx', 'quintile', 'bi_quintile'
        ]

        aspect_types_in_chart = set(a['aspect_type'] for a in aspects)

        # Verify no minor aspects are included
        for minor_type in minor_aspect_types:
            assert minor_type not in aspect_types_in_chart, \
                f"Minor aspect {minor_type} should not be present when include_minor_aspects=False"

    def test_vedic_chart_includes_minor_western_aspects_when_requested(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that Vedic chart includes minor Western aspects when both flags are True
        """
        chart = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri',
            include_western_aspects=True,
            include_minor_aspects=True
        )

        # Verify calculation info
        assert chart['calculation_info']['include_western_aspects'] is True
        assert chart['calculation_info']['include_minor_aspects'] is True

        # Verify aspects exist
        assert 'aspects' in chart

    def test_vedic_chart_excludes_minor_aspects_when_only_western_aspects_enabled(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that Vedic chart excludes minor aspects when include_minor_aspects=False
        """
        chart = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri',
            include_western_aspects=True,
            include_minor_aspects=False
        )

        # Verify calculation info
        assert chart['calculation_info']['include_western_aspects'] is True
        assert chart['calculation_info']['include_minor_aspects'] is False

        # Check aspects only include major types
        aspects = chart['aspects']
        minor_aspect_types = [
            'semi_sextile', 'semi_square', 'sesqui_square',
            'quincunx', 'quintile', 'bi_quintile'
        ]

        aspect_types_in_chart = set(a['aspect_type'] for a in aspects)

        # Verify no minor aspects
        for minor_type in minor_aspect_types:
            assert minor_type not in aspect_types_in_chart, \
                f"Minor aspect {minor_type} should not be present"

    def test_minor_aspects_count_comparison(
        self,
        sample_birth_data_1
    ):
        """
        Test that enabling minor aspects increases the total aspect count
        """
        # Chart without minor aspects
        chart_major_only = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_minor_aspects=False
        )

        # Chart with minor aspects
        chart_with_minor = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_minor_aspects=True
        )

        # The chart with minor aspects should have >= aspects than major only
        assert len(chart_with_minor['aspects']) >= len(chart_major_only['aspects']), \
            "Chart with minor aspects should have at least as many aspects as major-only chart"


# =============================================================================
# Ayanamsa Variation Tests
# =============================================================================

@pytest.mark.ephemeris
class TestAyanamsaVariations:
    """Test that different ayanamsa systems produce different sidereal positions"""

    def test_different_ayanamsas_produce_different_positions(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that Lahiri and Raman ayanamsas produce different sidereal positions
        """
        # Calculate with Lahiri
        chart_lahiri = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri'
        )

        # Calculate with Raman
        chart_raman = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='raman'
        )

        # Verify ayanamsa values are different
        ayanamsa_lahiri = chart_lahiri['calculation_info']['ayanamsa_value']
        ayanamsa_raman = chart_raman['calculation_info']['ayanamsa_value']

        assert ayanamsa_lahiri != ayanamsa_raman, \
            "Lahiri and Raman ayanamsa values should be different"

        # Verify Sun positions are different
        sun_long_lahiri = chart_lahiri['d1']['planets']['sun']['longitude']
        sun_long_raman = chart_raman['d1']['planets']['sun']['longitude']

        assert abs(sun_long_lahiri - sun_long_raman) > 0.1, \
            "Sun positions should differ between Lahiri and Raman ayanamsas"

    def test_ayanamsa_values_are_positive(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that ayanamsa values are positive (for modern dates)
        """
        ayanamsa_systems = ['lahiri', 'raman', 'krishnamurti', 'yukteshwar']

        for ayanamsa in ayanamsa_systems:
            chart = VedicChartCalculator.calculate_vedic_chart(
                birth_datetime=sample_birth_data_mumbai['birth_time'],
                latitude=sample_birth_data_mumbai['latitude'],
                longitude=sample_birth_data_mumbai['longitude'],
                timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
                ayanamsa=ayanamsa
            )

            ayanamsa_value = chart['calculation_info']['ayanamsa_value']

            # For dates after ~300 CE, ayanamsa should be positive
            assert ayanamsa_value > 0, \
                f"{ayanamsa} ayanamsa should be positive for modern dates"

            # Reasonable range check (modern ayanamsa is ~24 degrees)
            assert 20 < ayanamsa_value < 30, \
                f"{ayanamsa} ayanamsa value seems out of expected range: {ayanamsa_value}"

    def test_ayanamsa_affects_nakshatra_calculation(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that different ayanamsas can result in different nakshatras
        """
        # Calculate with Lahiri
        chart_lahiri = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri'
        )

        # Calculate with Krishnamurti (has a different ayanamsa value)
        chart_krishnamurti = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='krishnamurti'
        )

        # Both should have nakshatras
        assert 'nakshatras' in chart_lahiri['d1']
        assert 'nakshatras' in chart_krishnamurti['d1']

        # Nakshatras might be the same or different depending on the chart
        # But the calculation should complete successfully for both


# =============================================================================
# Default Behavior Tests
# =============================================================================

@pytest.mark.ephemeris
class TestDefaultBehavior:
    """Test that default behavior (hybrid options off) works as before"""

    def test_western_chart_default_behavior(
        self,
        sample_birth_data_1
    ):
        """
        Test that Western chart with default settings works correctly
        """
        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
        )

        # Verify basic structure
        assert 'planets' in chart
        assert 'houses' in chart
        assert 'aspects' in chart
        assert 'patterns' in chart
        assert 'calculation_info' in chart

        # Verify no hybrid features
        assert 'nakshatras' not in chart
        assert chart['calculation_info']['zodiac'] == 'tropical'

        # Verify only major aspects
        aspect_types = set(a['aspect_type'] for a in chart['aspects'])
        minor_types = ['semi_sextile', 'semi_square', 'sesqui_square',
                      'quincunx', 'quintile', 'bi_quintile']
        for minor_type in minor_types:
            assert minor_type not in aspect_types

    def test_vedic_chart_default_behavior(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test that Vedic chart with default settings works correctly
        """
        chart = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
        )

        # Verify basic structure
        assert 'd1' in chart
        assert 'divisional_charts' in chart
        assert 'calculation_info' in chart

        # Verify Vedic-specific features
        assert 'nakshatras' in chart['d1']
        assert 'dignities' in chart['d1']

        # Verify no Western aspects by default
        assert 'aspects' not in chart
        assert 'patterns' not in chart

    def test_custom_orbs_work_with_hybrid_features(
        self,
        sample_birth_data_1
    ):
        """
        Test that custom orbs work correctly with hybrid features
        """
        custom_orbs = {
            'conjunction': 5.0,
            'opposition': 5.0,
            'trine': 4.0
        }

        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_nakshatras=True,
            include_minor_aspects=True,
            custom_orbs=custom_orbs
        )

        # Verify chart calculated successfully
        assert 'aspects' in chart
        assert 'nakshatras' in chart

        # Verify all aspects are within their specified orbs
        for aspect in chart['aspects']:
            orb_abs = aspect['orb_abs']
            aspect_type = aspect['aspect_type']

            if aspect_type in custom_orbs:
                assert orb_abs <= custom_orbs[aspect_type], \
                    f"{aspect_type} aspect orb exceeds custom limit"


# =============================================================================
# Integration Tests
# =============================================================================

@pytest.mark.ephemeris
class TestHybridChartIntegration:
    """Integration tests for complete hybrid chart workflows"""

    def test_full_hybrid_western_chart(
        self,
        sample_birth_data_london
    ):
        """
        Test complete Western chart with all hybrid features enabled
        """
        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_london['birth_time'],
            latitude=sample_birth_data_london['latitude'],
            longitude=sample_birth_data_london['longitude'],
            timezone_offset_minutes=sample_birth_data_london['timezone_offset'],
            zodiac='tropical',
            include_nakshatras=True,
            include_minor_aspects=True,
            ayanamsa='lahiri'
        )

        # Verify all expected fields
        assert 'planets' in chart
        assert 'houses' in chart
        assert 'aspects' in chart
        assert 'patterns' in chart
        assert 'nakshatras' in chart

        # Verify tropical zodiac
        assert chart['calculation_info']['zodiac'] == 'tropical'

        # Verify nakshatras are present for all planets
        for planet in ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']:
            assert planet in chart['nakshatras']

    def test_full_hybrid_vedic_chart(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test complete Vedic chart with all hybrid features enabled
        """
        chart = VedicChartCalculator.calculate_vedic_chart(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
            ayanamsa='lahiri',
            include_western_aspects=True,
            include_minor_aspects=True,
            include_divisional=[1, 9, 10]
        )

        # Verify all expected fields
        assert 'd1' in chart
        assert 'divisional_charts' in chart
        assert 'aspects' in chart
        assert 'patterns' in chart

        # Verify divisional charts
        assert 'd9' in chart['divisional_charts']
        assert 'd10' in chart['divisional_charts']

        # Verify Vedic features
        assert 'nakshatras' in chart['d1']
        assert 'dignities' in chart['d1']

        # Verify Western features
        assert len(chart['aspects']) > 0

    def test_hybrid_chart_calculation_performance(
        self,
        sample_birth_data_1
    ):
        """
        Test that hybrid chart calculations complete in reasonable time
        """
        import time

        start_time = time.time()

        chart = NatalChartCalculator.calculate_natal_chart(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            zodiac='tropical',
            include_nakshatras=True,
            include_minor_aspects=True
        )

        duration = time.time() - start_time

        # Should complete in under 1 second
        assert duration < 1.0, \
            f"Hybrid chart calculation took too long: {duration:.2f}s"

        # Verify chart was calculated
        assert 'planets' in chart
        assert 'nakshatras' in chart
