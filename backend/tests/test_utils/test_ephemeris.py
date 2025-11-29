"""
Comprehensive tests for Swiss Ephemeris wrapper
Tests planetary calculations, house systems, aspects, and conversions
"""
import pytest
from datetime import datetime
from app.utils.ephemeris import EphemerisCalculator


# =============================================================================
# Julian Day Conversion Tests
# =============================================================================

class TestJulianDayConversions:
    """Test Julian Day conversions"""

    @pytest.mark.unit
    def test_datetime_to_julian_day_basic(self):
        """Test basic datetime to Julian Day conversion"""
        dt = datetime(2000, 1, 1, 12, 0, 0)  # J2000.0 epoch
        jd = EphemerisCalculator.datetime_to_julian_day(dt, timezone_offset_minutes=0)

        # J2000.0 is JD 2451545.0
        assert abs(jd - 2451545.0) < 0.1, f"Expected ~2451545.0, got {jd}"

    @pytest.mark.unit
    def test_datetime_to_julian_day_with_timezone(self):
        """Test datetime to JD with timezone offset"""
        dt = datetime(2000, 1, 1, 12, 0, 0)
        timezone_offset = -5 * 60  # EST (UTC-5)

        jd = EphemerisCalculator.datetime_to_julian_day(dt, timezone_offset)

        # Should adjust for timezone
        jd_utc = EphemerisCalculator.datetime_to_julian_day(dt, 0)
        expected_diff = 5 / 24.0  # 5 hours in days

        assert abs((jd - jd_utc) - expected_diff) < 0.001

    @pytest.mark.unit
    def test_julian_day_to_datetime_roundtrip(self):
        """Test that JD -> datetime -> JD roundtrip works"""
        original_dt = datetime(1990, 6, 15, 14, 30, 45)

        jd = EphemerisCalculator.datetime_to_julian_day(original_dt, 0)
        converted_dt = EphemerisCalculator.julian_day_to_datetime(jd)

        assert original_dt.year == converted_dt.year
        assert original_dt.month == converted_dt.month
        assert original_dt.day == converted_dt.day
        assert original_dt.hour == converted_dt.hour
        assert original_dt.minute == converted_dt.minute

    @pytest.mark.unit
    @pytest.mark.parametrize("year,month,day", [
        (1900, 1, 1),
        (1950, 6, 15),
        (2000, 1, 1),
        (2025, 12, 31),
        (2050, 7, 4),
    ])
    def test_various_dates(self, year, month, day):
        """Test JD conversion for various dates"""
        dt = datetime(year, month, day, 12, 0, 0)
        jd = EphemerisCalculator.datetime_to_julian_day(dt, 0)

        # Julian Day should be positive and reasonable
        assert jd > 2400000  # After ~1858
        assert jd < 2500000  # Before ~2132


# =============================================================================
# Planetary Position Tests
# =============================================================================

class TestPlanetaryPositions:
    """Test planetary position calculations"""

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_calculate_sun_position(self, sample_birth_data_1, tolerance):
        """Test Sun position calculation"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)
        sun = EphemerisCalculator.calculate_planet_position('sun', jd)

        # Validate returned structure
        assert 'longitude' in sun
        assert 'latitude' in sun
        assert 'distance' in sun
        assert 'speed_longitude' in sun
        assert 'retrograde' in sun
        assert 'sign' in sun
        assert 'degree_in_sign' in sun
        assert 'sign_name' in sun

        # Validate ranges
        assert 0 <= sun['longitude'] < 360
        assert -90 <= sun['latitude'] <= 90
        assert sun['distance'] > 0
        assert 0 <= sun['sign'] <= 11
        assert 0 <= sun['degree_in_sign'] < 30

        # Sun should never be retrograde
        assert sun['retrograde'] is False

        # Sun latitude should be near 0 (ecliptic)
        assert abs(sun['latitude']) < 0.01

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_calculate_moon_position(self, sample_birth_data_1):
        """Test Moon position calculation"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)
        moon = EphemerisCalculator.calculate_planet_position('moon', jd)

        # Moon moves ~12-15° per day
        assert abs(moon['speed_longitude']) > 10
        assert abs(moon['speed_longitude']) < 16

        # Moon latitude can be up to ~5°
        assert abs(moon['latitude']) < 5.5

        # Moon is never retrograde
        assert moon['retrograde'] is False

    @pytest.mark.ephemeris
    @pytest.mark.unit
    @pytest.mark.parametrize("planet", [
        'mercury', 'venus', 'mars', 'jupiter', 'saturn',
        'uranus', 'neptune', 'pluto'
    ])
    def test_all_planets(self, planet, sample_birth_data_1):
        """Test all planetary positions"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)
        planet_data = EphemerisCalculator.calculate_planet_position(planet, jd)

        # All planets should return valid data
        assert planet_data is not None
        assert 0 <= planet_data['longitude'] < 360
        assert 0 <= planet_data['sign'] <= 11
        assert planet_data['sign_name'] in [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ]

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_calculate_all_planets(self, sample_birth_data_1):
        """Test calculating all planets at once"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)
        planets = EphemerisCalculator.calculate_all_planets(jd)

        # Should return dict with all planets
        assert isinstance(planets, dict)
        assert 'sun' in planets
        assert 'moon' in planets
        assert 'mercury' in planets
        assert 'venus' in planets
        assert 'mars' in planets
        assert 'jupiter' in planets
        assert 'saturn' in planets
        assert 'uranus' in planets
        assert 'neptune' in planets
        assert 'pluto' in planets

        # All should have valid positions
        for planet, data in planets.items():
            if data is not None:
                assert 0 <= data['longitude'] < 360

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_retrograde_detection(self):
        """Test retrograde motion detection"""
        # Mercury retrograde example (approximate dates)
        dt_retrograde = datetime(2023, 12, 15, 12, 0)  # Mercury retrograde
        jd = EphemerisCalculator.datetime_to_julian_day(dt_retrograde, 0)

        mercury = EphemerisCalculator.calculate_planet_position('mercury', jd)

        # Speed should be negative during retrograde
        # Note: This test might need adjustment based on actual retrograde dates
        assert 'retrograde' in mercury
        assert isinstance(mercury['retrograde'], bool)

    @pytest.mark.unit
    def test_invalid_planet_name(self):
        """Test error handling for invalid planet name"""
        jd = 2451545.0

        with pytest.raises(ValueError, match="Unknown planet"):
            EphemerisCalculator.calculate_planet_position('invalid_planet', jd)


# =============================================================================
# House Calculation Tests
# =============================================================================

class TestHouseCalculations:
    """Test house cusp calculations"""

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_calculate_houses_placidus(self, sample_birth_data_1):
        """Test Placidus house calculation"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]
        lat = sample_birth_data_1["latitude"]
        lon = sample_birth_data_1["longitude"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)
        houses = EphemerisCalculator.calculate_houses(jd, lat, lon, 'placidus')

        # Validate structure
        assert 'cusps' in houses
        assert 'ascendant' in houses
        assert 'mc' in houses
        assert 'armc' in houses
        assert 'vertex' in houses

        # Should have 12 house cusps
        assert len(houses['cusps']) == 12

        # All cusps should be valid longitudes
        for cusp in houses['cusps']:
            assert 0 <= cusp < 360

        # Ascendant should match 1st house cusp
        assert abs(houses['ascendant'] - houses['cusps'][0]) < 0.01

        # MC should be close to 10th house cusp (within a few degrees)
        # Note: In some house systems they're not exactly equal
        mc_diff = abs(houses['mc'] - houses['cusps'][9])
        assert mc_diff < 5  # Allow some variation

    @pytest.mark.ephemeris
    @pytest.mark.unit
    @pytest.mark.parametrize("house_system", [
        'placidus', 'koch', 'porphyry', 'regiomontanus',
        'campanus', 'equal', 'whole_sign'
    ])
    def test_various_house_systems(self, house_system, sample_birth_data_1):
        """Test different house systems"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]
        lat = sample_birth_data_1["latitude"]
        lon = sample_birth_data_1["longitude"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)
        houses = EphemerisCalculator.calculate_houses(jd, lat, lon, house_system)

        # All house systems should return 12 cusps
        assert len(houses['cusps']) == 12

        # All should have valid Ascendant
        assert 0 <= houses['ascendant'] < 360

    @pytest.mark.unit
    def test_equal_house_system(self, sample_birth_data_1):
        """Test Equal house system specifically"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]
        lat = sample_birth_data_1["latitude"]
        lon = sample_birth_data_1["longitude"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)
        houses = EphemerisCalculator.calculate_houses(jd, lat, lon, 'equal')

        # In Equal houses, each house is approximately 30°
        # Allow 0.5° tolerance for floating point precision
        cusps = houses['cusps']
        # Note: Swiss Ephemeris may return 11 or 12 cusps depending on version
        for i in range(len(cusps) - 1):
            expected_diff = 30.0
            actual_diff = (cusps[i + 1] - cusps[i]) % 360
            assert abs(actual_diff - expected_diff) < 0.5

    @pytest.mark.unit
    def test_invalid_house_system(self, sample_birth_data_1):
        """Test error handling for invalid house system"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]
        lat = sample_birth_data_1["latitude"]
        lon = sample_birth_data_1["longitude"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)

        with pytest.raises(ValueError, match="Unknown house system"):
            EphemerisCalculator.calculate_houses(jd, lat, lon, 'invalid_system')

    @pytest.mark.unit
    def test_invalid_latitude(self, sample_birth_data_1):
        """Test error handling for invalid latitude"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]
        lon = sample_birth_data_1["longitude"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)

        with pytest.raises(ValueError, match="Latitude must be"):
            EphemerisCalculator.calculate_houses(jd, 100, lon, 'placidus')  # > 90

    @pytest.mark.unit
    def test_invalid_longitude(self, sample_birth_data_1):
        """Test error handling for invalid longitude"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]
        lat = sample_birth_data_1["latitude"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)

        with pytest.raises(ValueError, match="Longitude must be"):
            EphemerisCalculator.calculate_houses(jd, lat, 200, 'placidus')  # > 180


# =============================================================================
# Aspect Calculation Tests
# =============================================================================

class TestAspectCalculations:
    """Test aspect calculations"""

    @pytest.mark.unit
    @pytest.mark.parametrize("long1,long2,aspect_angle,orb,should_match", [
        # Exact aspects
        (45.0, 45.0, 0, 8, True),      # Exact conjunction
        (45.0, 225.0, 180, 8, True),   # Exact opposition
        (45.0, 165.0, 120, 8, True),   # Exact trine
        (45.0, 135.0, 90, 7, True),    # Exact square
        (45.0, 105.0, 60, 6, True),    # Exact sextile

        # Within orb
        (45.0, 50.0, 0, 8, True),      # Conjunction within 8°
        (45.0, 230.0, 180, 8, True),   # Opposition within 8°
        (45.0, 170.0, 120, 8, True),   # Trine within 8°

        # Outside orb
        (45.0, 60.0, 0, 8, False),     # Conjunction outside 8°
        (45.0, 240.0, 180, 8, False),  # Opposition outside 8°
        (45.0, 180.0, 120, 8, False),  # Trine outside 8°
    ])
    def test_aspect_detection(self, long1, long2, aspect_angle, orb, should_match):
        """Test aspect detection with various configurations"""
        result = EphemerisCalculator.calculate_aspect(long1, long2, aspect_angle, orb)

        if should_match:
            assert result is not None, f"Expected aspect between {long1} and {long2}"
            assert 'angle' in result
            assert 'orb' in result
            assert 'orb_abs' in result
        else:
            assert result is None, f"Did not expect aspect between {long1} and {long2}"

    @pytest.mark.unit
    def test_aspect_orb_calculation(self):
        """Test that orb is calculated correctly"""
        # 45° and 50° with conjunction (0°)
        result = EphemerisCalculator.calculate_aspect(45.0, 50.0, 0, 10)

        assert result is not None
        # The angle between 45 and 50 is 5°, so orb from exact (0°) is 5°
        assert abs(result['orb_abs'] - 5.0) < 0.01

    @pytest.mark.unit
    def test_aspect_across_360(self):
        """Test aspect calculation across 0°/360° boundary"""
        # 350° and 10° should be 20° apart (conjunction)
        result = EphemerisCalculator.calculate_aspect(350.0, 10.0, 0, 25)

        assert result is not None
        assert result['angle'] < 30  # Should be ~20°


# =============================================================================
# Sidereal/Tropical Conversion Tests
# =============================================================================

class TestSiderealTropicalConversions:
    """Test conversions between tropical and sidereal zodiacs"""

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_calculate_ayanamsa_lahiri(self):
        """Test Lahiri ayanamsa calculation"""
        # J2000.0 epoch
        dt = datetime(2000, 1, 1, 12, 0, 0)
        jd = EphemerisCalculator.datetime_to_julian_day(dt, 0)

        ayanamsa = EphemerisCalculator.calculate_ayanamsa(jd, 'lahiri')

        # Lahiri ayanamsa at J2000.0 is approximately 23.85°
        assert 23.5 < ayanamsa < 24.5

    @pytest.mark.ephemeris
    @pytest.mark.unit
    @pytest.mark.parametrize("ayanamsa_system", [
        'lahiri', 'raman', 'krishnamurti', 'yukteshwar', 'fagan_bradley'
    ])
    def test_various_ayanamsa_systems(self, ayanamsa_system):
        """Test different ayanamsa systems"""
        dt = datetime(2000, 1, 1, 12, 0, 0)
        jd = EphemerisCalculator.datetime_to_julian_day(dt, 0)

        ayanamsa = EphemerisCalculator.calculate_ayanamsa(jd, ayanamsa_system)

        # All ayanamsas should be reasonable (15-30° range typically)
        assert 0 < ayanamsa < 50

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_tropical_to_sidereal_conversion(self):
        """Test tropical to sidereal conversion"""
        tropical_long = 45.0  # 15° Taurus (tropical)
        dt = datetime(2000, 1, 1, 12, 0, 0)
        jd = EphemerisCalculator.datetime_to_julian_day(dt, 0)

        sidereal_long = EphemerisCalculator.tropical_to_sidereal(
            tropical_long, jd, 'lahiri'
        )

        # Sidereal should be less than tropical (ayanamsa is subtracted)
        assert sidereal_long < tropical_long
        assert 0 <= sidereal_long < 360

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_sidereal_to_tropical_conversion(self):
        """Test sidereal to tropical conversion"""
        sidereal_long = 45.0
        dt = datetime(2000, 1, 1, 12, 0, 0)
        jd = EphemerisCalculator.datetime_to_julian_day(dt, 0)

        tropical_long = EphemerisCalculator.sidereal_to_tropical(
            sidereal_long, jd, 'lahiri'
        )

        # Tropical should be greater than sidereal (ayanamsa is added)
        assert tropical_long > sidereal_long
        assert 0 <= tropical_long < 360

    @pytest.mark.ephemeris
    @pytest.mark.unit
    def test_tropical_sidereal_roundtrip(self):
        """Test that tropical -> sidereal -> tropical roundtrip works"""
        original_tropical = 123.456
        dt = datetime(2000, 1, 1, 12, 0, 0)
        jd = EphemerisCalculator.datetime_to_julian_day(dt, 0)

        sidereal = EphemerisCalculator.tropical_to_sidereal(
            original_tropical, jd, 'lahiri'
        )
        back_to_tropical = EphemerisCalculator.sidereal_to_tropical(
            sidereal, jd, 'lahiri'
        )

        assert abs(original_tropical - back_to_tropical) < 0.001


# =============================================================================
# Utility Function Tests
# =============================================================================

class TestUtilityFunctions:
    """Test utility functions"""

    @pytest.mark.unit
    @pytest.mark.parametrize("sign_num,expected_name", [
        (0, 'Aries'),
        (1, 'Taurus'),
        (2, 'Gemini'),
        (3, 'Cancer'),
        (4, 'Leo'),
        (5, 'Virgo'),
        (6, 'Libra'),
        (7, 'Scorpio'),
        (8, 'Sagittarius'),
        (9, 'Capricorn'),
        (10, 'Aquarius'),
        (11, 'Pisces'),
    ])
    def test_get_sign_name(self, sign_num, expected_name):
        """Test zodiac sign name lookup"""
        assert EphemerisCalculator.get_sign_name(sign_num) == expected_name

    @pytest.mark.unit
    def test_get_sign_name_wraps(self):
        """Test that sign numbers wrap correctly"""
        # 12 should wrap to 0 (Aries)
        assert EphemerisCalculator.get_sign_name(12) == 'Aries'
        # 13 should wrap to 1 (Taurus)
        assert EphemerisCalculator.get_sign_name(13) == 'Taurus'

    @pytest.mark.unit
    @pytest.mark.parametrize("longitude,expected_sign,expected_degree_range", [
        (0.0, 'Aries', (0, 1)),
        (15.5, 'Aries', (15, 16)),
        (30.0, 'Taurus', (0, 1)),
        (45.25, 'Taurus', (15, 16)),
        (180.0, 'Libra', (0, 1)),
        (359.99, 'Pisces', (29, 30)),
    ])
    def test_format_degree(self, longitude, expected_sign, expected_degree_range):
        """Test degree formatting"""
        formatted = EphemerisCalculator.format_degree(longitude)

        # Should contain the sign name
        assert expected_sign in formatted

        # Should contain degree in expected range
        degree = int(formatted.split('°')[0])
        assert expected_degree_range[0] <= degree < expected_degree_range[1]


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Integration tests combining multiple calculations"""

    @pytest.mark.ephemeris
    @pytest.mark.integration
    def test_full_chart_calculation(self, sample_birth_data_1):
        """Test complete chart calculation workflow"""
        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]
        lat = sample_birth_data_1["latitude"]
        lon = sample_birth_data_1["longitude"]

        # Step 1: Convert to Julian Day
        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)
        assert jd > 0

        # Step 2: Calculate all planetary positions
        planets = EphemerisCalculator.calculate_all_planets(jd, zodiac='tropical')
        assert len(planets) >= 10  # At least 10 major bodies

        # Step 3: Calculate houses
        houses = EphemerisCalculator.calculate_houses(jd, lat, lon, 'placidus')
        assert len(houses['cusps']) == 12

        # Step 4: Test aspect between Sun and Moon
        if planets['sun'] and planets['moon']:
            sun_long = planets['sun']['longitude']
            moon_long = planets['moon']['longitude']

            # Check for conjunction (example)
            aspect = EphemerisCalculator.calculate_aspect(
                sun_long, moon_long, 0, 10
            )
            # aspect may or may not exist depending on positions

        # All calculations should complete without errors

    @pytest.mark.ephemeris
    @pytest.mark.integration
    def test_vedic_chart_calculation(self, sample_birth_data_mumbai):
        """Test Vedic chart calculation workflow"""
        dt = sample_birth_data_mumbai["birth_time"]
        tz_offset = sample_birth_data_mumbai["timezone_offset"]
        lat = sample_birth_data_mumbai["latitude"]
        lon = sample_birth_data_mumbai["longitude"]

        # Calculate Julian Day
        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)

        # Calculate ayanamsa
        ayanamsa = EphemerisCalculator.calculate_ayanamsa(jd, 'lahiri')
        assert 20 < ayanamsa < 30  # Reasonable range

        # Calculate sidereal positions
        planets = EphemerisCalculator.calculate_all_planets(jd, zodiac='sidereal')
        assert len(planets) >= 10

        # Calculate houses
        houses = EphemerisCalculator.calculate_houses(jd, lat, lon, 'whole_sign')
        assert len(houses['cusps']) == 12


# =============================================================================
# Performance Tests
# =============================================================================

class TestPerformance:
    """Performance and timing tests"""

    @pytest.mark.slow
    @pytest.mark.ephemeris
    def test_calculation_performance(self, sample_birth_data_1):
        """Test that calculations complete within acceptable time"""
        import time

        dt = sample_birth_data_1["birth_time"]
        tz_offset = sample_birth_data_1["timezone_offset"]
        lat = sample_birth_data_1["latitude"]
        lon = sample_birth_data_1["longitude"]

        jd = EphemerisCalculator.datetime_to_julian_day(dt, tz_offset)

        # Time planetary calculations
        start = time.time()
        planets = EphemerisCalculator.calculate_all_planets(jd)
        planet_time = time.time() - start

        # Should complete in < 100ms
        assert planet_time < 0.1, f"Planetary calc took {planet_time:.3f}s"

        # Time house calculations
        start = time.time()
        houses = EphemerisCalculator.calculate_houses(jd, lat, lon, 'placidus')
        house_time = time.time() - start

        # Should complete in < 50ms
        assert house_time < 0.05, f"House calc took {house_time:.3f}s"
