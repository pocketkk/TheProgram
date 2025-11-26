"""
Transit Calculator Service
Calculates current planetary transits relative to natal chart positions
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from app.utils.ephemeris import EphemerisCalculator


class TransitCalculator:
    """
    Service for calculating planetary transits relative to natal chart.

    Transits are the current positions of planets in relation to
    the positions in a natal chart. They're used for timing and prediction.
    """

    # Transit aspects to track (typically use tighter orbs than natal)
    TRANSIT_ASPECTS = {
        'conjunction': {'angle': 0, 'orb': 8},
        'opposition': {'angle': 180, 'orb': 8},
        'trine': {'angle': 120, 'orb': 6},
        'square': {'angle': 90, 'orb': 6},
        'sextile': {'angle': 60, 'orb': 4},
        'quincunx': {'angle': 150, 'orb': 3},
    }

    # Planet speed classifications (for duration estimates)
    PLANET_SPEEDS = {
        'Moon': 'fast',        # ~2.5 days per sign
        'Sun': 'medium',       # ~30 days per sign
        'Mercury': 'medium',   # ~14-30 days per sign (varies with retrograde)
        'Venus': 'medium',     # ~23-60 days per sign
        'Mars': 'slow',        # ~45 days per sign
        'Jupiter': 'slow',     # ~1 year per sign
        'Saturn': 'very_slow', # ~2.5 years per sign
        'Uranus': 'very_slow', # ~7 years per sign
        'Neptune': 'very_slow', # ~14 years per sign
        'Pluto': 'very_slow',  # ~12-31 years per sign
        'Chiron': 'slow',      # ~4 years per sign (varies)
        'North Node': 'slow',  # ~18 months per sign
        'South Node': 'slow',
    }

    # Transit significance levels
    SIGNIFICANCE = {
        # Outer planet to personal planet = most significant
        ('very_slow', 'Sun'): 'major',
        ('very_slow', 'Moon'): 'major',
        ('very_slow', 'Mercury'): 'significant',
        ('very_slow', 'Venus'): 'significant',
        ('very_slow', 'Mars'): 'significant',
        ('slow', 'Sun'): 'significant',
        ('slow', 'Moon'): 'moderate',
        ('medium', 'Sun'): 'moderate',
        ('medium', 'Moon'): 'minor',
        ('fast', 'Sun'): 'minor',
        ('fast', 'Moon'): 'minor',
    }

    @classmethod
    def calculate_current_transits(
        cls,
        natal_planets: Dict[str, Dict],
        transit_datetime: Optional[datetime] = None,
        zodiac: str = 'tropical',
        orb_multiplier: float = 1.0
    ) -> Dict[str, Any]:
        """
        Calculate current planetary transits to natal chart.

        Args:
            natal_planets: Natal planet positions from chart calculation
            transit_datetime: Date/time for transits (defaults to now)
            zodiac: Zodiac system (tropical/sidereal)
            orb_multiplier: Adjust orbs (0.5 = tighter, 1.5 = wider)

        Returns:
            Dictionary with transit data
        """
        if transit_datetime is None:
            transit_datetime = datetime.utcnow()

        # Get Julian Day for transit time
        jd = EphemerisCalculator.datetime_to_julian_day(transit_datetime, 0)

        # Calculate current planetary positions
        current_planets = EphemerisCalculator.calculate_all_planets(jd, zodiac=zodiac)

        # Find all transit aspects
        transits = []

        for transit_planet, transit_data in current_planets.items():
            if transit_planet in ['Ascendant', 'Midheaven', 'Lilith']:
                continue  # Skip points that don't transit

            transit_lon = transit_data.get('longitude', 0)

            for natal_planet, natal_data in natal_planets.items():
                natal_lon = natal_data.get('longitude', 0)

                # Check each aspect type
                for aspect_name, aspect_info in cls.TRANSIT_ASPECTS.items():
                    target_angle = aspect_info['angle']
                    orb = aspect_info['orb'] * orb_multiplier

                    # Calculate the angular difference
                    diff = abs(transit_lon - natal_lon)
                    if diff > 180:
                        diff = 360 - diff

                    # Check if within orb of aspect
                    aspect_diff = abs(diff - target_angle)
                    if aspect_diff <= orb:
                        # Determine if applying or separating
                        is_applying = cls._is_applying(
                            transit_planet, transit_lon, natal_lon, target_angle
                        )

                        # Calculate significance
                        significance = cls._get_significance(
                            transit_planet, natal_planet, aspect_name
                        )

                        # Estimate duration
                        duration = cls._estimate_duration(transit_planet, orb)

                        transits.append({
                            'transit_planet': transit_planet,
                            'natal_planet': natal_planet,
                            'aspect': aspect_name,
                            'orb': round(aspect_diff, 2),
                            'is_applying': is_applying,
                            'significance': significance,
                            'estimated_duration': duration,
                            'transit_sign': transit_data.get('sign_name', ''),
                            'transit_degree': round(transit_data.get('degree_in_sign', 0), 2),
                            'natal_sign': natal_data.get('sign_name', ''),
                            'natal_degree': round(natal_data.get('degree_in_sign', 0), 2),
                            'transit_retrograde': transit_data.get('is_retrograde', False),
                        })

        # Sort by significance and orb
        significance_order = {'major': 0, 'significant': 1, 'moderate': 2, 'minor': 3}
        transits.sort(key=lambda x: (significance_order.get(x['significance'], 4), x['orb']))

        return {
            'transit_datetime': transit_datetime.isoformat(),
            'current_positions': current_planets,
            'transits': transits,
            'summary': cls._generate_summary(transits)
        }

    @classmethod
    def calculate_transit_timeline(
        cls,
        natal_planets: Dict[str, Dict],
        start_date: datetime,
        end_date: datetime,
        zodiac: str = 'tropical',
        interval_days: int = 1
    ) -> List[Dict[str, Any]]:
        """
        Calculate transits over a date range for timeline visualization.

        Args:
            natal_planets: Natal planet positions
            start_date: Start of range
            end_date: End of range
            zodiac: Zodiac system
            interval_days: Days between calculations

        Returns:
            List of transit snapshots
        """
        timeline = []
        current_date = start_date

        while current_date <= end_date:
            transits = cls.calculate_current_transits(
                natal_planets, current_date, zodiac, orb_multiplier=0.8
            )

            # Only include significant transits in timeline
            significant = [
                t for t in transits['transits']
                if t['significance'] in ['major', 'significant']
            ]

            if significant:
                timeline.append({
                    'date': current_date.isoformat(),
                    'transits': significant
                })

            current_date += timedelta(days=interval_days)

        return timeline

    @classmethod
    def find_exact_transit_dates(
        cls,
        natal_planets: Dict[str, Dict],
        transit_planet: str,
        natal_planet: str,
        aspect: str,
        start_date: datetime,
        end_date: datetime,
        zodiac: str = 'tropical'
    ) -> List[Dict[str, Any]]:
        """
        Find exact dates when a specific transit aspect is exact.

        Useful for planning around significant transits.
        """
        exact_dates = []
        current_date = start_date
        last_diff = None

        if aspect not in cls.TRANSIT_ASPECTS:
            return []

        target_angle = cls.TRANSIT_ASPECTS[aspect]['angle']
        natal_lon = natal_planets.get(natal_planet, {}).get('longitude', 0)

        while current_date <= end_date:
            jd = EphemerisCalculator.datetime_to_julian_day(current_date, 0)
            current_planets = EphemerisCalculator.calculate_all_planets(jd, zodiac=zodiac)

            if transit_planet not in current_planets:
                current_date += timedelta(hours=12)
                continue

            transit_lon = current_planets[transit_planet].get('longitude', 0)

            # Calculate aspect difference
            diff = abs(transit_lon - natal_lon)
            if diff > 180:
                diff = 360 - diff
            aspect_diff = diff - target_angle

            # Check for zero crossing (exact aspect)
            if last_diff is not None:
                if (last_diff < 0 and aspect_diff >= 0) or (last_diff > 0 and aspect_diff <= 0):
                    exact_dates.append({
                        'date': current_date.isoformat(),
                        'transit_planet': transit_planet,
                        'natal_planet': natal_planet,
                        'aspect': aspect,
                        'retrograde': current_planets[transit_planet].get('is_retrograde', False)
                    })

            last_diff = aspect_diff
            current_date += timedelta(hours=12)

        return exact_dates

    @classmethod
    def get_upcoming_significant_transits(
        cls,
        natal_planets: Dict[str, Dict],
        days_ahead: int = 30,
        zodiac: str = 'tropical'
    ) -> List[Dict[str, Any]]:
        """
        Get upcoming significant transits for the next N days.

        Returns a summary of major and significant transits approaching.
        """
        start = datetime.utcnow()
        end = start + timedelta(days=days_ahead)

        timeline = cls.calculate_transit_timeline(
            natal_planets, start, end, zodiac, interval_days=1
        )

        # Deduplicate and find first occurrence of each transit
        seen = set()
        upcoming = []

        for day in timeline:
            for transit in day['transits']:
                key = (transit['transit_planet'], transit['natal_planet'], transit['aspect'])
                if key not in seen:
                    seen.add(key)
                    upcoming.append({
                        **transit,
                        'first_date': day['date']
                    })

        return upcoming[:20]  # Return top 20

    @classmethod
    def _is_applying(
        cls,
        transit_planet: str,
        transit_lon: float,
        natal_lon: float,
        target_angle: float
    ) -> bool:
        """Determine if transit is applying (getting closer) or separating."""
        # Simplified: if transit planet is before the exact aspect point, it's applying
        # This is a simplification - proper calculation would check planet motion
        diff = (transit_lon - natal_lon) % 360
        if diff > 180:
            diff -= 360
        return diff < target_angle

    @classmethod
    def _get_significance(
        cls,
        transit_planet: str,
        natal_planet: str,
        aspect: str
    ) -> str:
        """Determine the significance level of a transit."""
        transit_speed = cls.PLANET_SPEEDS.get(transit_planet, 'medium')

        # Check predefined significance
        key = (transit_speed, natal_planet)
        if key in cls.SIGNIFICANCE:
            return cls.SIGNIFICANCE[key]

        # Default logic
        if transit_speed == 'very_slow':
            return 'significant'
        elif transit_speed == 'slow':
            return 'moderate'
        elif aspect in ['conjunction', 'opposition', 'square']:
            return 'moderate'
        else:
            return 'minor'

    @classmethod
    def _estimate_duration(cls, transit_planet: str, orb: float) -> str:
        """Estimate how long a transit will be in effect."""
        speed = cls.PLANET_SPEEDS.get(transit_planet, 'medium')

        durations = {
            'fast': f"{int(orb * 2)} hours",
            'medium': f"{int(orb * 2)} days",
            'slow': f"{int(orb * 2)} weeks",
            'very_slow': f"{int(orb * 2)} months"
        }

        return durations.get(speed, 'unknown')

    @classmethod
    def _generate_summary(cls, transits: List[Dict]) -> Dict[str, Any]:
        """Generate a summary of current transits."""
        major = [t for t in transits if t['significance'] == 'major']
        significant = [t for t in transits if t['significance'] == 'significant']

        # Count aspects by type
        aspect_counts = {}
        for t in transits:
            aspect = t['aspect']
            aspect_counts[aspect] = aspect_counts.get(aspect, 0) + 1

        # Identify themes
        themes = []
        if len([t for t in transits if t['transit_planet'] in ['Saturn', 'Pluto']]) > 2:
            themes.append('transformation')
        if len([t for t in transits if t['transit_planet'] in ['Jupiter', 'Venus']]) > 2:
            themes.append('expansion')
        if len([t for t in transits if t['transit_planet'] in ['Uranus', 'Neptune']]) > 2:
            themes.append('awakening')
        if len([t for t in transits if t['aspect'] in ['square', 'opposition']]) > 3:
            themes.append('challenge')
        if len([t for t in transits if t['aspect'] in ['trine', 'sextile']]) > 3:
            themes.append('opportunity')

        return {
            'total_transits': len(transits),
            'major_count': len(major),
            'significant_count': len(significant),
            'aspect_counts': aspect_counts,
            'themes': themes,
            'most_significant': major[0] if major else (significant[0] if significant else None)
        }


class TransitInterpreter:
    """
    Provides interpretive text for transit aspects.
    Used by AI agent for transit analysis.
    """

    TRANSIT_MEANINGS = {
        # Outer planets transiting Sun
        ('Pluto', 'Sun', 'conjunction'): {
            'theme': 'Identity Transformation',
            'description': 'A profound period of identity transformation. Old ways of being die to make way for a more authentic self.',
            'duration': '1-2 years',
            'advice': 'Surrender to necessary changes. Avoid power struggles.'
        },
        ('Pluto', 'Sun', 'square'): {
            'theme': 'Power Crisis',
            'description': 'Intense pressure to transform. External circumstances force inner change.',
            'duration': '1-2 years',
            'advice': 'Face shadow material. Transform rather than resist.'
        },
        ('Neptune', 'Sun', 'conjunction'): {
            'theme': 'Spiritual Awakening',
            'description': 'Dissolution of ego boundaries. Increased sensitivity and spiritual opening.',
            'duration': '2-3 years',
            'advice': 'Trust intuition but stay grounded. Avoid escapism.'
        },
        ('Uranus', 'Sun', 'conjunction'): {
            'theme': 'Liberation',
            'description': 'Sudden awakening to authentic self. Breaking free from limitations.',
            'duration': '1 year',
            'advice': 'Embrace change. Express your uniqueness.'
        },
        ('Saturn', 'Sun', 'conjunction'): {
            'theme': 'Reality Check',
            'description': 'Time to get serious about life purpose. Building lasting structures.',
            'duration': '6-9 months',
            'advice': 'Take responsibility. Work hard on goals.'
        },
        ('Jupiter', 'Sun', 'conjunction'): {
            'theme': 'Expansion',
            'description': 'Growth and opportunity. Confidence increases. Good fortune.',
            'duration': '2-3 months',
            'advice': 'Take calculated risks. Expand horizons.'
        },
        # Saturn transits
        ('Saturn', 'Moon', 'conjunction'): {
            'theme': 'Emotional Maturity',
            'description': 'Processing old emotional patterns. Potential melancholy but deep growth.',
            'duration': '6-9 months',
            'advice': 'Allow feelings. Build emotional resilience.'
        },
        ('Saturn', 'Moon', 'square'): {
            'theme': 'Emotional Challenge',
            'description': 'Tension between needs and responsibilities. Feeling restricted.',
            'duration': '3-6 months',
            'advice': 'Balance duty with self-care.'
        },
        # Add more as needed...
    }

    @classmethod
    def get_interpretation(
        cls,
        transit_planet: str,
        natal_planet: str,
        aspect: str
    ) -> Dict[str, str]:
        """Get interpretation for a specific transit aspect."""
        key = (transit_planet, natal_planet, aspect)

        if key in cls.TRANSIT_MEANINGS:
            return cls.TRANSIT_MEANINGS[key]

        # Generate generic interpretation
        return {
            'theme': f'{transit_planet} {aspect} {natal_planet}',
            'description': f'Transit {transit_planet} forming {aspect} to natal {natal_planet}.',
            'duration': 'Varies',
            'advice': 'Observe how this energy manifests in your life.'
        }

    @classmethod
    def get_transit_report(cls, transits: List[Dict]) -> str:
        """Generate a text report of current transits."""
        if not transits:
            return "No significant transits at this time."

        report_parts = []

        # Group by significance
        major = [t for t in transits if t['significance'] == 'major']
        significant = [t for t in transits if t['significance'] == 'significant']

        if major:
            report_parts.append("MAJOR TRANSITS:")
            for t in major:
                interp = cls.get_interpretation(
                    t['transit_planet'], t['natal_planet'], t['aspect']
                )
                status = "applying" if t['is_applying'] else "separating"
                report_parts.append(
                    f"- {t['transit_planet']} {t['aspect']} {t['natal_planet']} "
                    f"({status}, {t['orb']}° orb): {interp['theme']}"
                )

        if significant:
            report_parts.append("\nSIGNIFICANT TRANSITS:")
            for t in significant:
                status = "applying" if t['is_applying'] else "separating"
                report_parts.append(
                    f"- {t['transit_planet']} {t['aspect']} {t['natal_planet']} "
                    f"({status}, {t['orb']}° orb)"
                )

        return "\n".join(report_parts)
