"""
Vimsottari Dasha Calculator

The Vimsottari (120-year) Dasha system is the most widely used planetary period
system in Vedic astrology. It divides life into major periods (Mahadashas) ruled
by different planets, based on the Moon's nakshatra position at birth.

The sequence of planetary periods:
Ketu (7) → Venus (20) → Sun (6) → Moon (10) → Mars (7) →
Rahu (18) → Jupiter (16) → Saturn (19) → Mercury (17) = 120 years
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class DashaPeriod:
    """Represents a single Dasha period (Mahadasha or sub-period)"""
    planet: str
    start_date: datetime
    end_date: datetime
    duration_years: float
    level: str  # 'mahadasha', 'antardasha', 'pratyantardasha'
    parent_planet: Optional[str] = None


class VimshottariDashaCalculator:
    """
    Calculator for the Vimsottari (120-year) Dasha system.

    The system works by:
    1. Finding the Moon's nakshatra at birth
    2. Determining which planet rules that nakshatra (becomes first Dasha lord)
    3. Calculating elapsed portion of first Dasha based on Moon's position within nakshatra
    4. Projecting forward through the full 120-year cycle
    """

    # Total cycle duration in years
    CYCLE_DURATION = 120

    # Mahadasha periods in years for each planet (in sequence order)
    MAHADASHA_YEARS = {
        'ketu': 7,
        'venus': 20,
        'sun': 6,
        'moon': 10,
        'mars': 7,
        'rahu': 18,
        'jupiter': 16,
        'saturn': 19,
        'mercury': 17,
    }

    # The fixed sequence of Dasha periods
    DASHA_SEQUENCE = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury']

    # Nakshatra lords in sequence (27 nakshatras, each ruled by one of 9 planets)
    # This cycles through the 9 planets 3 times
    NAKSHATRA_LORDS = [
        'ketu',     # 1. Ashwini
        'venus',    # 2. Bharani
        'sun',      # 3. Krittika
        'moon',     # 4. Rohini
        'mars',     # 5. Mrigashira
        'rahu',     # 6. Ardra
        'jupiter',  # 7. Punarvasu
        'saturn',   # 8. Pushya
        'mercury',  # 9. Ashlesha
        'ketu',     # 10. Magha
        'venus',    # 11. Purva Phalguni
        'sun',      # 12. Uttara Phalguni
        'moon',     # 13. Hasta
        'mars',     # 14. Chitra
        'rahu',     # 15. Swati
        'jupiter',  # 16. Vishakha
        'saturn',   # 17. Anuradha
        'mercury',  # 18. Jyeshtha
        'ketu',     # 19. Mula
        'venus',    # 20. Purva Ashadha
        'sun',      # 21. Uttara Ashadha
        'moon',     # 22. Shravana
        'mars',     # 23. Dhanishta
        'rahu',     # 24. Shatabhisha
        'jupiter',  # 25. Purva Bhadrapada
        'saturn',   # 26. Uttara Bhadrapada
        'mercury',  # 27. Revati
    ]

    # Planet display names and colors for UI
    PLANET_INFO = {
        'sun': {'name': 'Sun', 'symbol': '☉', 'color': '#FFD700'},
        'moon': {'name': 'Moon', 'symbol': '☽', 'color': '#C0C0C0'},
        'mars': {'name': 'Mars', 'symbol': '♂', 'color': '#DC143C'},
        'mercury': {'name': 'Mercury', 'symbol': '☿', 'color': '#228B22'},
        'jupiter': {'name': 'Jupiter', 'symbol': '♃', 'color': '#FFD700'},
        'venus': {'name': 'Venus', 'symbol': '♀', 'color': '#FF69B4'},
        'saturn': {'name': 'Saturn', 'symbol': '♄', 'color': '#4169E1'},
        'rahu': {'name': 'Rahu', 'symbol': '☊', 'color': '#4B0082'},
        'ketu': {'name': 'Ketu', 'symbol': '☋', 'color': '#8B4513'},
    }

    @classmethod
    def calculate(
        cls,
        moon_longitude: float,
        birth_datetime: datetime,
        calculate_to_date: Optional[datetime] = None,
        include_antardashas: bool = True,
        include_pratyantardashas: bool = False
    ) -> Dict:
        """
        Calculate Vimsottari Dasha periods from birth.

        Args:
            moon_longitude: Moon's sidereal longitude at birth (0-360°)
            birth_datetime: Birth date and time
            calculate_to_date: Calculate up to this date (default: 120 years from birth)
            include_antardashas: Include sub-periods (antardashas) in results
            include_pratyantardashas: Include sub-sub-periods (pratyantardashas)

        Returns:
            Dictionary containing:
            - mahadashas: List of major period data
            - current_mahadasha: Currently active Mahadasha
            - current_antardasha: Currently active Antardasha (if applicable)
            - calculation_info: Metadata about the calculation
        """
        # Calculate nakshatra and dasha starting point
        nakshatra_info = cls._get_nakshatra_info(moon_longitude)
        starting_planet = cls.NAKSHATRA_LORDS[nakshatra_info['number'] - 1]

        # Calculate elapsed portion of first Dasha
        elapsed_fraction = nakshatra_info['degrees_in_nakshatra'] / 13.333333
        first_dasha_years = cls.MAHADASHA_YEARS[starting_planet]
        remaining_years = first_dasha_years * (1 - elapsed_fraction)

        # End date for calculations
        if calculate_to_date is None:
            calculate_to_date = birth_datetime + timedelta(days=365.25 * cls.CYCLE_DURATION)

        # Generate all mahadashas
        mahadashas = cls._generate_mahadashas(
            birth_datetime,
            starting_planet,
            remaining_years,
            calculate_to_date
        )

        # Add antardashas if requested
        if include_antardashas:
            for maha in mahadashas:
                maha['antardashas'] = cls._calculate_antardashas(
                    maha['planet'],
                    maha['start_date'],
                    maha['end_date']
                )

                # Add pratyantardashas if requested
                if include_pratyantardashas:
                    for antar in maha['antardashas']:
                        antar['pratyantardashas'] = cls._calculate_pratyantardashas(
                            maha['planet'],
                            antar['planet'],
                            antar['start_date'],
                            antar['end_date']
                        )

        # Find current periods
        now = datetime.now()
        current_maha = cls._find_current_period(mahadashas, now)
        current_antar = None
        current_pratyantar = None

        if current_maha and include_antardashas and 'antardashas' in current_maha:
            current_antar = cls._find_current_period(current_maha['antardashas'], now)

            if current_antar and include_pratyantardashas and 'pratyantardashas' in current_antar:
                current_pratyantar = cls._find_current_period(current_antar['pratyantardashas'], now)

        return {
            'mahadashas': mahadashas,
            'current_mahadasha': current_maha,
            'current_antardasha': current_antar,
            'current_pratyantardasha': current_pratyantar,
            'calculation_info': {
                'moon_longitude': moon_longitude,
                'nakshatra': nakshatra_info,
                'starting_planet': starting_planet,
                'elapsed_first_dasha_years': first_dasha_years - remaining_years,
                'remaining_first_dasha_years': remaining_years,
                'birth_datetime': birth_datetime.isoformat(),
            }
        }

    @classmethod
    def _get_nakshatra_info(cls, longitude: float) -> Dict:
        """Get nakshatra details for a given longitude"""
        nakshatra_span = 13.333333
        nakshatra_index = int(longitude / nakshatra_span)
        degrees_in_nakshatra = longitude % nakshatra_span
        pada = int(degrees_in_nakshatra / (nakshatra_span / 4)) + 1

        nakshatra_names = [
            'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira',
            'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
            'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
            'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
            'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
            'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
        ]

        return {
            'number': nakshatra_index + 1,
            'name': nakshatra_names[nakshatra_index],
            'lord': cls.NAKSHATRA_LORDS[nakshatra_index],
            'pada': pada,
            'degrees_in_nakshatra': degrees_in_nakshatra,
        }

    @classmethod
    def _generate_mahadashas(
        cls,
        birth_datetime: datetime,
        starting_planet: str,
        remaining_years: float,
        calculate_to_date: datetime
    ) -> List[Dict]:
        """Generate all Mahadasha periods"""
        mahadashas = []
        current_date = birth_datetime

        # Find starting position in sequence
        start_idx = cls.DASHA_SEQUENCE.index(starting_planet)

        # Generate periods until we reach the end date
        period_num = 0
        while current_date < calculate_to_date:
            idx = (start_idx + period_num) % len(cls.DASHA_SEQUENCE)
            planet = cls.DASHA_SEQUENCE[idx]

            # First period uses remaining years, subsequent use full duration
            if period_num == 0:
                duration_years = remaining_years
            else:
                duration_years = cls.MAHADASHA_YEARS[planet]

            end_date = current_date + timedelta(days=duration_years * 365.25)

            planet_info = cls.PLANET_INFO[planet]

            mahadashas.append({
                'planet': planet,
                'planet_name': planet_info['name'],
                'symbol': planet_info['symbol'],
                'color': planet_info['color'],
                'start_date': current_date,
                'end_date': end_date,
                'duration_years': duration_years,
                'level': 'mahadasha',
                'period_number': period_num + 1,
            })

            current_date = end_date
            period_num += 1

            # Safety limit - don't generate more than 10 cycles (1200 years)
            if period_num > 90:
                break

        return mahadashas

    @classmethod
    def _calculate_antardashas(
        cls,
        mahadasha_planet: str,
        maha_start: datetime,
        maha_end: datetime
    ) -> List[Dict]:
        """
        Calculate Antardasha (sub-periods) within a Mahadasha.

        The antardasha sequence always starts with the mahadasha lord,
        then follows the normal dasha sequence.
        """
        antardashas = []
        maha_duration = (maha_end - maha_start).total_seconds()

        # Find starting position (same as mahadasha planet)
        start_idx = cls.DASHA_SEQUENCE.index(mahadasha_planet)
        current_date = maha_start

        for i in range(9):  # 9 sub-periods
            idx = (start_idx + i) % len(cls.DASHA_SEQUENCE)
            planet = cls.DASHA_SEQUENCE[idx]

            # Antardasha duration is proportional to mahadasha years of each planet
            proportion = cls.MAHADASHA_YEARS[planet] / cls.CYCLE_DURATION
            duration_seconds = maha_duration * proportion
            duration_years = duration_seconds / (365.25 * 24 * 3600)

            end_date = current_date + timedelta(seconds=duration_seconds)
            planet_info = cls.PLANET_INFO[planet]

            antardashas.append({
                'planet': planet,
                'planet_name': planet_info['name'],
                'symbol': planet_info['symbol'],
                'color': planet_info['color'],
                'start_date': current_date,
                'end_date': end_date,
                'duration_years': duration_years,
                'level': 'antardasha',
                'parent_planet': mahadasha_planet,
            })

            current_date = end_date

        return antardashas

    @classmethod
    def _calculate_pratyantardashas(
        cls,
        mahadasha_planet: str,
        antardasha_planet: str,
        antar_start: datetime,
        antar_end: datetime
    ) -> List[Dict]:
        """
        Calculate Pratyantardasha (sub-sub-periods) within an Antardasha.

        Starts with the antardasha lord, then follows normal sequence.
        """
        pratyantardashas = []
        antar_duration = (antar_end - antar_start).total_seconds()

        start_idx = cls.DASHA_SEQUENCE.index(antardasha_planet)
        current_date = antar_start

        for i in range(9):
            idx = (start_idx + i) % len(cls.DASHA_SEQUENCE)
            planet = cls.DASHA_SEQUENCE[idx]

            proportion = cls.MAHADASHA_YEARS[planet] / cls.CYCLE_DURATION
            duration_seconds = antar_duration * proportion
            duration_years = duration_seconds / (365.25 * 24 * 3600)

            end_date = current_date + timedelta(seconds=duration_seconds)
            planet_info = cls.PLANET_INFO[planet]

            pratyantardashas.append({
                'planet': planet,
                'planet_name': planet_info['name'],
                'symbol': planet_info['symbol'],
                'color': planet_info['color'],
                'start_date': current_date,
                'end_date': end_date,
                'duration_years': duration_years,
                'level': 'pratyantardasha',
                'parent_planet': antardasha_planet,
            })

            current_date = end_date

        return pratyantardashas

    @classmethod
    def _find_current_period(cls, periods: List[Dict], target_date: datetime) -> Optional[Dict]:
        """Find the period containing the target date"""
        for period in periods:
            start = period['start_date']
            end = period['end_date']

            # Handle both datetime objects and strings
            if isinstance(start, str):
                start = datetime.fromisoformat(start)
            if isinstance(end, str):
                end = datetime.fromisoformat(end)

            if start <= target_date < end:
                return period

        return None

    @classmethod
    def format_dasha_string(
        cls,
        mahadasha: str,
        antardasha: Optional[str] = None,
        pratyantardasha: Optional[str] = None
    ) -> str:
        """Format Dasha period as readable string (e.g., 'Venus-Mars-Jupiter')"""
        parts = [cls.PLANET_INFO[mahadasha]['name']]

        if antardasha:
            parts.append(cls.PLANET_INFO[antardasha]['name'])

        if pratyantardasha:
            parts.append(cls.PLANET_INFO[pratyantardasha]['name'])

        return '-'.join(parts)

    @classmethod
    def get_dasha_summary(cls, dasha_data: Dict) -> Dict:
        """Get a summary of current Dasha periods"""
        current_maha = dasha_data.get('current_mahadasha')
        current_antar = dasha_data.get('current_antardasha')
        current_pratyantar = dasha_data.get('current_pratyantardasha')

        summary = {
            'current_period_string': '',
            'current_mahadasha': None,
            'current_antardasha': None,
            'time_remaining_in_mahadasha': None,
        }

        if current_maha:
            maha_planet = current_maha['planet']
            antar_planet = current_antar['planet'] if current_antar else None
            pratyantar_planet = current_pratyantar['planet'] if current_pratyantar else None

            summary['current_period_string'] = cls.format_dasha_string(
                maha_planet, antar_planet, pratyantar_planet
            )
            summary['current_mahadasha'] = current_maha['planet_name']

            if current_antar:
                summary['current_antardasha'] = current_antar['planet_name']

            # Calculate remaining time
            now = datetime.now()
            maha_end = current_maha['end_date']
            if isinstance(maha_end, str):
                maha_end = datetime.fromisoformat(maha_end)

            remaining = maha_end - now
            summary['time_remaining_in_mahadasha'] = {
                'years': remaining.days / 365.25,
                'days': remaining.days,
            }

        return summary


# Example usage and testing
if __name__ == "__main__":
    # Test calculation for a birth chart
    # Moon at 45° (Rohini nakshatra, Moon ruled)
    birth = datetime(1990, 1, 15, 12, 0)
    moon_longitude = 45.0  # Rohini nakshatra

    print("Testing Vimsottari Dasha Calculator")
    print("=" * 50)
    print(f"Birth: {birth}")
    print(f"Moon longitude: {moon_longitude}°")

    dasha_data = VimshottariDashaCalculator.calculate(
        moon_longitude=moon_longitude,
        birth_datetime=birth,
        include_antardashas=True,
        include_pratyantardashas=False
    )

    print(f"\nStarting nakshatra: {dasha_data['calculation_info']['nakshatra']['name']}")
    print(f"Starting Dasha lord: {dasha_data['calculation_info']['starting_planet']}")
    print(f"Remaining first Dasha: {dasha_data['calculation_info']['remaining_first_dasha_years']:.2f} years")

    print("\nMahadashas:")
    for maha in dasha_data['mahadashas'][:5]:  # Show first 5
        print(f"  {maha['symbol']} {maha['planet_name']:10s}: "
              f"{maha['start_date'].strftime('%Y-%m-%d')} to "
              f"{maha['end_date'].strftime('%Y-%m-%d')} "
              f"({maha['duration_years']:.1f} years)")

    summary = VimshottariDashaCalculator.get_dasha_summary(dasha_data)
    print(f"\nCurrent period: {summary['current_period_string']}")
    if summary['time_remaining_in_mahadasha']:
        print(f"Remaining in Mahadasha: {summary['time_remaining_in_mahadasha']['years']:.1f} years")
