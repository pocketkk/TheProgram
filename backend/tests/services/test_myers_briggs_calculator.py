"""
Test suite for Myers-Briggs personality type calculator

Tests the calculation of MBTI types from astrological birth data:
1. Type calculation from birth data
2. Dichotomy score calculations
3. Cognitive function stack generation
4. Type profile data retrieval
5. Edge cases and boundary conditions
"""
import pytest
from datetime import datetime
from app.services.myers_briggs_calculator import MyersBriggsCalculator


# =============================================================================
# Type Calculation Tests
# =============================================================================

@pytest.mark.ephemeris
class TestMyersBriggsTypeCalculation:
    """Test Myers-Briggs type calculation from birth data"""

    def test_calculate_type_returns_valid_structure(
        self,
        sample_birth_data_1
    ):
        """
        Test that calculate_type returns a properly structured response
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
        )

        # Verify required fields exist
        assert 'type_code' in result
        assert 'type_name' in result
        assert 'temperament' in result
        assert 'dichotomies' in result
        assert 'preference_strengths' in result
        assert 'description' in result
        assert 'strengths' in result
        assert 'challenges' in result
        assert 'calculation_info' in result

    def test_calculate_type_returns_valid_type_code(
        self,
        sample_birth_data_1
    ):
        """
        Test that the type code is one of the 16 valid MBTI types
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
        )

        valid_types = [
            'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
            'ISTP', 'ISFP', 'INFP', 'INTP',
            'ESTP', 'ESFP', 'ENFP', 'ENTP',
            'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
        ]

        assert result['type_code'] in valid_types, \
            f"Invalid type code: {result['type_code']}"

    def test_calculate_type_returns_four_dichotomies(
        self,
        sample_birth_data_1
    ):
        """
        Test that exactly 4 dichotomies are returned
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
        )

        assert len(result['dichotomies']) == 4

        # Verify each dichotomy
        dichotomy_codes = [d['dichotomy'] for d in result['dichotomies']]
        assert 'E/I' in dichotomy_codes
        assert 'S/N' in dichotomy_codes
        assert 'T/F' in dichotomy_codes
        assert 'J/P' in dichotomy_codes

    def test_calculate_type_dichotomy_structure(
        self,
        sample_birth_data_1
    ):
        """
        Test that each dichotomy has the correct structure
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
        )

        for dichotomy in result['dichotomies']:
            assert 'dichotomy' in dichotomy
            assert 'preference' in dichotomy
            assert 'strength' in dichotomy
            assert 'first_option' in dichotomy
            assert 'second_option' in dichotomy
            assert 'first_score' in dichotomy
            assert 'second_score' in dichotomy

            # Verify preference is one of the two options
            assert dichotomy['preference'] in [
                dichotomy['first_option'],
                dichotomy['second_option']
            ]

            # Verify scores are in valid range
            assert 0 <= dichotomy['strength'] <= 100
            assert 0 <= dichotomy['first_score'] <= 100
            assert 0 <= dichotomy['second_score'] <= 100

    def test_calculate_type_preference_strengths_structure(
        self,
        sample_birth_data_1
    ):
        """
        Test that preference strengths contain all 8 letters
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
        )

        expected_letters = ['E', 'I', 'S', 'N', 'T', 'F', 'J', 'P']
        for letter in expected_letters:
            assert letter in result['preference_strengths']
            assert 0 <= result['preference_strengths'][letter] <= 100


# =============================================================================
# Cognitive Function Stack Tests
# =============================================================================

@pytest.mark.ephemeris
class TestCognitiveFunctionStack:
    """Test cognitive function stack generation"""

    def test_cognitive_stack_included_by_default(
        self,
        sample_birth_data_1
    ):
        """
        Test that cognitive stack is included when requested
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            include_cognitive_stack=True,
        )

        assert 'cognitive_stack' in result
        assert result['cognitive_stack'] is not None
        assert len(result['cognitive_stack']) == 4

    def test_cognitive_stack_structure(
        self,
        sample_birth_data_1
    ):
        """
        Test that each cognitive function has the correct structure
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            include_cognitive_stack=True,
        )

        for func in result['cognitive_stack']:
            assert 'function' in func
            assert 'name' in func
            assert 'position' in func
            assert 'description' in func

    def test_cognitive_stack_positions(
        self,
        sample_birth_data_1
    ):
        """
        Test that cognitive functions have correct position labels
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            include_cognitive_stack=True,
        )

        positions = [f['position'] for f in result['cognitive_stack']]
        assert positions == ['Dominant', 'Auxiliary', 'Tertiary', 'Inferior']

    def test_cognitive_functions_are_valid(
        self,
        sample_birth_data_1
    ):
        """
        Test that cognitive function codes are valid
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            include_cognitive_stack=True,
        )

        valid_functions = ['Se', 'Si', 'Ne', 'Ni', 'Te', 'Ti', 'Fe', 'Fi']
        for func in result['cognitive_stack']:
            assert func['function'] in valid_functions, \
                f"Invalid function: {func['function']}"


# =============================================================================
# Astrological Correlation Tests
# =============================================================================

@pytest.mark.ephemeris
class TestAstrologicalCorrelations:
    """Test astrological correlation calculations"""

    def test_correlations_included_when_requested(
        self,
        sample_birth_data_1
    ):
        """
        Test that correlations are included when requested
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            include_correlations=True,
        )

        assert 'correlations' in result
        assert result['correlations'] is not None
        assert len(result['correlations']) > 0

    def test_correlations_excluded_by_default(
        self,
        sample_birth_data_1
    ):
        """
        Test that correlations are not included by default
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            include_correlations=False,
        )

        assert 'correlations' not in result or result['correlations'] is None

    def test_correlation_structure(
        self,
        sample_birth_data_1
    ):
        """
        Test that correlations have the correct structure
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            include_correlations=True,
        )

        for corr in result['correlations']:
            assert 'element' in corr
            assert 'influences' in corr
            assert 'explanation' in corr
            assert isinstance(corr['influences'], dict)


# =============================================================================
# Reference Data Tests
# =============================================================================

class TestReferenceData:
    """Test reference data retrieval methods"""

    def test_get_all_types_returns_16_types(self):
        """
        Test that get_all_types returns exactly 16 types
        """
        types = MyersBriggsCalculator.get_all_types()
        assert len(types) == 16

    def test_get_all_types_structure(self):
        """
        Test that each type has the correct structure
        """
        types = MyersBriggsCalculator.get_all_types()

        for t in types:
            assert 'type_code' in t
            assert 'name' in t
            assert 'temperament' in t
            assert 'description' in t
            assert 'cognitive_functions' in t
            assert 'percentage' in t

    def test_get_all_types_valid_codes(self):
        """
        Test that all type codes are valid
        """
        types = MyersBriggsCalculator.get_all_types()
        valid_codes = [
            'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
            'ISTP', 'ISFP', 'INFP', 'INTP',
            'ESTP', 'ESFP', 'ENFP', 'ENTP',
            'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
        ]

        type_codes = [t['type_code'] for t in types]
        for code in valid_codes:
            assert code in type_codes

    def test_get_all_dichotomies_returns_4(self):
        """
        Test that get_all_dichotomies returns exactly 4 dichotomies
        """
        dichotomies = MyersBriggsCalculator.get_all_dichotomies()
        assert len(dichotomies) == 4

    def test_get_all_dichotomies_structure(self):
        """
        Test that each dichotomy has the correct structure
        """
        dichotomies = MyersBriggsCalculator.get_all_dichotomies()

        for d in dichotomies:
            assert 'code' in d
            assert 'name' in d
            assert 'first_pole' in d
            assert 'second_pole' in d
            assert 'first_description' in d
            assert 'second_description' in d

    def test_get_type_info_valid_type(self):
        """
        Test that get_type_info returns correct data for valid types
        """
        type_info = MyersBriggsCalculator.get_type_info('INTJ')

        assert type_info is not None
        assert type_info['type_code'] == 'INTJ'
        assert type_info['name'] == 'The Architect'
        assert type_info['temperament'] == 'Rational'
        assert 'cognitive_stack' in type_info

    def test_get_type_info_invalid_type(self):
        """
        Test that get_type_info returns None for invalid types
        """
        type_info = MyersBriggsCalculator.get_type_info('XXXX')
        assert type_info is None

    def test_get_type_info_case_insensitive(self):
        """
        Test that get_type_info is case insensitive
        """
        type_info_upper = MyersBriggsCalculator.get_type_info('INTJ')
        type_info_lower = MyersBriggsCalculator.get_type_info('intj')

        assert type_info_upper is not None
        assert type_info_lower is not None
        assert type_info_upper['type_code'] == type_info_lower['type_code']


# =============================================================================
# Edge Cases and Boundary Tests
# =============================================================================

@pytest.mark.ephemeris
class TestEdgeCases:
    """Test edge cases and boundary conditions"""

    def test_different_birth_dates_produce_different_types(
        self,
        sample_birth_data_1,
        sample_birth_data_2
    ):
        """
        Test that different birth dates can produce different types
        """
        result1 = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
        )

        result2 = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_2['birth_time'],
            latitude=sample_birth_data_2['latitude'],
            longitude=sample_birth_data_2['longitude'],
            timezone_offset_minutes=sample_birth_data_2['timezone_offset'],
        )

        # Preference strengths should differ even if types are the same
        assert result1['preference_strengths'] != result2['preference_strengths']

    def test_calculation_with_zero_timezone(
        self,
        sample_birth_data_london
    ):
        """
        Test calculation with zero timezone offset (GMT)
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_london['birth_time'],
            latitude=sample_birth_data_london['latitude'],
            longitude=sample_birth_data_london['longitude'],
            timezone_offset_minutes=0,
        )

        assert result['type_code'] is not None
        assert len(result['type_code']) == 4

    def test_calculation_with_positive_timezone(
        self,
        sample_birth_data_mumbai
    ):
        """
        Test calculation with positive timezone offset (IST)
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_mumbai['birth_time'],
            latitude=sample_birth_data_mumbai['latitude'],
            longitude=sample_birth_data_mumbai['longitude'],
            timezone_offset_minutes=sample_birth_data_mumbai['timezone_offset'],
        )

        assert result['type_code'] is not None
        assert len(result['type_code']) == 4

    def test_type_code_matches_dichotomy_preferences(
        self,
        sample_birth_data_1
    ):
        """
        Test that the type code matches the dichotomy preferences
        """
        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
        )

        type_code = result['type_code']
        dichotomies = result['dichotomies']

        # Find each dichotomy and verify the type code letter matches
        for d in dichotomies:
            if d['dichotomy'] == 'E/I':
                assert d['preference'] == type_code[0]
            elif d['dichotomy'] == 'S/N':
                assert d['preference'] == type_code[1]
            elif d['dichotomy'] == 'T/F':
                assert d['preference'] == type_code[2]
            elif d['dichotomy'] == 'J/P':
                assert d['preference'] == type_code[3]


# =============================================================================
# Temperament Tests
# =============================================================================

class TestTemperaments:
    """Test temperament assignments"""

    def test_sj_types_are_guardians(self):
        """
        Test that SJ types are assigned Guardian temperament
        """
        sj_types = ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ']

        for type_code in sj_types:
            type_info = MyersBriggsCalculator.get_type_info(type_code)
            assert type_info['temperament'] == 'Guardian', \
                f"{type_code} should be Guardian"

    def test_sp_types_are_artisans(self):
        """
        Test that SP types are assigned Artisan temperament
        """
        sp_types = ['ISTP', 'ISFP', 'ESTP', 'ESFP']

        for type_code in sp_types:
            type_info = MyersBriggsCalculator.get_type_info(type_code)
            assert type_info['temperament'] == 'Artisan', \
                f"{type_code} should be Artisan"

    def test_nf_types_are_idealists(self):
        """
        Test that NF types are assigned Idealist temperament
        """
        nf_types = ['INFJ', 'INFP', 'ENFJ', 'ENFP']

        for type_code in nf_types:
            type_info = MyersBriggsCalculator.get_type_info(type_code)
            assert type_info['temperament'] == 'Idealist', \
                f"{type_code} should be Idealist"

    def test_nt_types_are_rationals(self):
        """
        Test that NT types are assigned Rational temperament
        """
        nt_types = ['INTJ', 'INTP', 'ENTJ', 'ENTP']

        for type_code in nt_types:
            type_info = MyersBriggsCalculator.get_type_info(type_code)
            assert type_info['temperament'] == 'Rational', \
                f"{type_code} should be Rational"


# =============================================================================
# Performance Tests
# =============================================================================

@pytest.mark.ephemeris
class TestPerformance:
    """Test calculation performance"""

    def test_calculation_completes_in_reasonable_time(
        self,
        sample_birth_data_1
    ):
        """
        Test that type calculation completes quickly
        """
        import time

        start_time = time.time()

        result = MyersBriggsCalculator.calculate_type(
            birth_datetime=sample_birth_data_1['birth_time'],
            latitude=sample_birth_data_1['latitude'],
            longitude=sample_birth_data_1['longitude'],
            timezone_offset_minutes=sample_birth_data_1['timezone_offset'],
            include_cognitive_stack=True,
            include_correlations=True,
        )

        duration = time.time() - start_time

        # Should complete in under 2 seconds (including ephemeris calc)
        assert duration < 2.0, \
            f"Calculation took too long: {duration:.2f}s"

        assert result['type_code'] is not None
